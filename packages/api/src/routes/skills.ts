import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, ne, and, or, ilike, desc, sql, count, inArray } from 'drizzle-orm';
import { compareTwoStrings } from 'string-similarity';
import { ManifestSchema, ERROR_CODES, createApiError, TRUST_TIERS } from '@spm/shared';
import type { Manifest } from '@spm/shared';
import type { AppEnv } from '../types.js';
import type { Database } from '../db/index.js';
import { authed } from '../middleware/auth.js';
import {
  skills,
  versions,
  skillTags,
  skillPlatforms,
  users,
  publishAttempts,
  downloads,
  skillCollaborators,
  scans,
} from '../db/schema.js';
import { validateSkillName, checkNameSimilarity } from '../services/names.js';
import { uploadPackage, uploadBundle, getObject } from '../services/r2.js';
import { buildSearchCondition, buildRankExpression } from '../services/search.js';
import { cachedResponse, buildCacheKey, CACHE_TTLS } from '../services/cache.js';
import { runSecurityPipeline } from '../services/scanner.js';
import { extractTextFiles } from '../security/extract.js';
import { extractSkillName } from './helpers.js';

export const skillsRoutes = new Hono<AppEnv>();

/**
 * Register a route handler for both scoped (@scope/name) and unscoped (name) skill paths.
 * Scoped route is registered first so @scope doesn't get captured as a bare name.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const dualSkillRoute = (
  method: 'get' | 'post' | 'patch' | 'delete',
  suffix: string,
  ...handlers: any[]
) => {
  (skillsRoutes[method] as any)(`/skills/@:scope/:name${suffix}`, ...handlers);
  (skillsRoutes[method] as any)(`/skills/:name${suffix}`, ...handlers);
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── helpers ──

const parseSemver = (v: string): { major: number; minor: number; patch: number } => {
  const [major, minor, patchRaw] = v.split('.');
  const patch = patchRaw.split('-')[0]; // strip prerelease for numeric part
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
  };
};

const computeSha256 = async (data: ArrayBuffer): Promise<string> => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Check if the authed user is a placeholder (import-only) account.
 * Placeholder users cannot publish, yank, or update skills.
 */
const isPlaceholderUser = async (db: Database, userId: string): Promise<boolean> => {
  const [user] = await db
    .select({ isPlaceholder: users.isPlaceholder })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.isPlaceholder ?? false;
};

// ── POST /skills — publish a skill version ──

skillsRoutes.post('/skills', authed, async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  let userId = jwt.sub;

  // Admin can publish on behalf of another user via X-Publish-As header (user ID)
  const publishAs = jwt.role === 'admin' ? c.req.header('X-Publish-As') : null;
  if (publishAs) {
    userId = publishAs;
  }

  // Placeholder users (created by import script) cannot publish directly
  if (!publishAs && (await isPlaceholderUser(db, userId))) {
    return c.json(
      createApiError('FORBIDDEN', { message: 'Placeholder accounts cannot publish skills' }),
      ERROR_CODES.FORBIDDEN.status,
    );
  }

  const formData = await c.req.formData();

  const packageFile = formData.get('package');
  if (!(packageFile instanceof File)) {
    return c.json(
      createApiError('VALIDATION_ERROR', { message: 'Missing "package" file field' }),
      ERROR_CODES.VALIDATION_ERROR.status,
    );
  }

  const manifestRaw = formData.get('manifest');
  if (typeof manifestRaw !== 'string') {
    return c.json(
      createApiError('VALIDATION_ERROR', { message: 'Missing "manifest" JSON string field' }),
      ERROR_CODES.VALIDATION_ERROR.status,
    );
  }

  let manifestParsed: unknown;
  try {
    manifestParsed = JSON.parse(manifestRaw);
  } catch {
    return c.json(
      createApiError('VALIDATION_ERROR', { message: 'Invalid JSON in manifest field' }),
      ERROR_CODES.VALIDATION_ERROR.status,
    );
  }

  const manifestResult = ManifestSchema.safeParse(manifestParsed);
  if (!manifestResult.success) {
    return c.json(
      createApiError('VALIDATION_ERROR', {
        details: {
          issues: manifestResult.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
      }),
      ERROR_CODES.VALIDATION_ERROR.status,
    );
  }

  const manifest: Manifest = manifestResult.data;
  const { name, version, description, categories } = manifest;

  // Validate name format
  const nameCheck = validateSkillName(name);
  if (!nameCheck.valid) {
    await db.insert(publishAttempts).values({
      userId,
      skillName: name,
      version,
      status: 'rejected',
      blockReasons: [nameCheck.error],
    });
    return c.json(
      createApiError('NAME_INVALID', { message: nameCheck.error }),
      ERROR_CODES.NAME_INVALID.status,
    );
  }

  // Similarity check against existing names (skip for admin imports)
  const allSkills = await db.select({ name: skills.name }).from(skills);
  const existingNames = allSkills.map((s) => s.name);

  const similarCheck = checkNameSimilarity(
    name,
    existingNames.filter((n) => n !== name),
  );
  if (similarCheck.similar && !publishAs) {
    await db.insert(publishAttempts).values({
      userId,
      skillName: name,
      version,
      status: 'rejected',
      blockReasons: [`Name too similar to: ${similarCheck.matches.join(', ')}`],
    });
    return c.json(
      createApiError('NAME_SIMILAR', {
        message: `Name too similar to existing skill(s): ${similarCheck.matches.join(', ')}`,
        details: { similar: similarCheck.matches },
      }),
      ERROR_CODES.NAME_SIMILAR.status,
    );
  }

  // ── Security scan ──
  const packageDataForScan = await packageFile.arrayBuffer();
  let textFiles: Array<{ name: string; content: string }>;
  try {
    textFiles = await extractTextFiles(packageDataForScan, description);
  } catch {
    textFiles = [{ name: 'manifest:description', content: description }];
  }

  const scanResult = await runSecurityPipeline(textFiles, {
    hfApiToken: c.env.HF_API_TOKEN,
    lakeraApiKey: c.env.LAKERA_API_KEY,
  });

  if (!scanResult.passed) {
    await db.insert(publishAttempts).values({
      userId,
      skillName: name,
      version,
      status: 'blocked',
      blockReasons: scanResult.findings
        .filter((f) => f.severity === 'block')
        .map((f) => `${f.patternName}: ${f.match} (${f.file}:${f.line})`),
    });
    return c.json(
      createApiError('PUBLISH_BLOCKED', {
        details: {
          findings: scanResult.findings.map((f) => ({
            category: f.category,
            severity: f.severity,
            pattern: f.patternName,
            match: f.match,
            file: f.file,
            line: f.line,
            context: f.context,
            suggestion: f.suggestion,
          })),
          blocked: scanResult.blocked,
          warnings: scanResult.warnings,
        },
      }),
      ERROR_CODES.PUBLISH_BLOCKED.status,
    );
  }

  // Check if skill exists or create new
  const [existingSkill] = await db.select().from(skills).where(eq(skills.name, name)).limit(1);

  let skillId: string;

  if (existingSkill) {
    // Verify ownership or collaborator status (admins with X-Publish-As can transfer ownership)
    if (existingSkill.ownerId !== userId && !publishAs) {
      const { allowed } = await isOwnerOrCollaborator(db, existingSkill.id, userId);
      if (!allowed) {
        return c.json(
          createApiError('FORBIDDEN', { message: 'You do not own this skill' }),
          ERROR_CODES.FORBIDDEN.status,
        );
      }
    }
    skillId = existingSkill.id;

    // Update mutable fields (transfer ownership if admin is re-publishing)
    await db
      .update(skills)
      .set({
        description,
        categories,
        ownerId: userId,
        repository: manifest.urls?.repository ?? existingSkill.repository,
        license: manifest.license ?? existingSkill.license,
        updatedAt: new Date(),
      })
      .where(eq(skills.id, skillId));
  } else {
    // Admin users can set imported_from via header
    const importedFrom = jwt.role === 'admin' ? (c.req.header('X-Imported-From') ?? null) : null;

    const [newSkill] = await db
      .insert(skills)
      .values({
        name,
        ownerId: userId,
        categories,
        description,
        repository: manifest.urls?.repository,
        license: manifest.license,
        importedFrom,
      })
      .returning({ id: skills.id });
    skillId = newSkill.id;
  }

  // Check version immutability
  const [existingVersion] = await db
    .select({ id: versions.id })
    .from(versions)
    .where(and(eq(versions.skillId, skillId), eq(versions.version, version)))
    .limit(1);

  if (existingVersion) {
    await db.insert(publishAttempts).values({
      userId,
      skillName: name,
      version,
      status: 'rejected',
      blockReasons: ['Version already exists'],
    });
    return c.json(createApiError('VERSION_EXISTS'), ERROR_CODES.VERSION_EXISTS.status);
  }

  // Upload package to R2 (reuse buffer from security scan)
  const packageData = packageDataForScan;
  const checksum = await computeSha256(packageData);
  const storageKey = await uploadPackage(c.env.R2_BUCKET, name, version, packageData);

  // Upload sigstore bundle if provided
  let sigstoreBundleKey: string | undefined;
  let signerIdentity: string | undefined;
  const bundleFile = formData.get('sigstore_bundle');
  if (bundleFile instanceof File) {
    const bundleData = await bundleFile.arrayBuffer();
    sigstoreBundleKey = await uploadBundle(c.env.R2_BUCKET, name, version, bundleData);
    const identity = formData.get('signer_identity');
    if (typeof identity === 'string') {
      signerIdentity = identity;
    }
  }

  const { major, minor, patch } = parseSemver(version);

  // Insert version
  const readmeField = formData.get('readme');
  const [insertedVersion] = await db
    .insert(versions)
    .values({
      skillId,
      version,
      versionMajor: major,
      versionMinor: minor,
      versionPatch: patch,
      manifest: manifest as unknown as Record<string, unknown>,
      readmeMd: typeof readmeField === 'string' ? readmeField : undefined,
      sizeBytes: packageData.byteLength,
      checksumSha256: checksum,
      sklStorageKey: storageKey,
      sigstoreBundleKey,
      signerIdentity,
    })
    .returning({ id: versions.id });

  // Write scan results to scans table
  const publishDbStatusMap: Record<string, 'pending' | 'passed' | 'flagged' | 'blocked'> = {
    passed: 'passed',
    flagged: 'flagged',
    blocked: 'blocked',
    error: 'pending',
    skipped: 'pending',
  };
  for (const layerResult of scanResult.layers) {
    await db.insert(scans).values({
      versionId: insertedVersion.id,
      layer: layerResult.layer,
      status: publishDbStatusMap[layerResult.status] ?? 'pending',
      confidence: layerResult.confidence,
      details: {
        name: layerResult.name,
        blocked: layerResult.blocked,
        warnings: layerResult.warnings,
        status: layerResult.status,
      },
    });
  }

  // Update scan_security_level on skills table
  await db
    .update(skills)
    .set({ scanSecurityLevel: scanResult.securityLevel })
    .where(eq(skills.id, skillId));

  // Upsert tags
  const tags = manifest.keywords ?? [];
  if (tags.length > 0) {
    await db.delete(skillTags).where(eq(skillTags.skillId, skillId));
    await db.insert(skillTags).values(tags.map((tag) => ({ skillId, tag })));
  }

  // Upsert platforms
  const platforms = manifest.agents?.platforms ?? [];
  if (platforms.length > 0) {
    await db.delete(skillPlatforms).where(eq(skillPlatforms.skillId, skillId));
    await db.insert(skillPlatforms).values(platforms.map((platform) => ({ skillId, platform })));
  }

  // Record publish attempt
  await db.insert(publishAttempts).values({
    userId,
    skillName: name,
    version,
    status: 'published',
  });

  return c.json(
    {
      status: scanResult.securityLevel === 'flagged' ? 'flagged' : 'published',
      name,
      version,
      url: `https://skillpkg.dev/skills/${name}`,
      checksum_sha256: checksum,
      security_level: scanResult.securityLevel,
      scans: scanResult.layers.map((l) => ({
        layer: l.layer,
        name: l.name,
        status: l.status,
        confidence: l.confidence,
      })),
      warnings: scanResult.findings
        .filter((f) => f.severity === 'warn')
        .map((f) => ({
          category: f.category,
          pattern: f.patternName,
          file: f.file,
          line: f.line,
          suggestion: f.suggestion,
        })),
    },
    201,
  );
});

// ── GET /skills — search skills ──

const SearchQuerySchema = z.object({
  q: z.string().optional(),
  author: z.string().optional(),
  category: z.string().optional(),
  trust: z.string().optional(),
  platform: z.string().optional(),
  tag: z.string().optional(),
  signed: z.enum(['true', 'false']).optional(),
  security: z.enum(['full', 'partial', 'any']).optional().default('any'),
  sort: z
    .enum(['relevance', 'downloads', 'rating', 'updated', 'new'])
    .optional()
    .default('relevance'),
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

skillsRoutes.get('/skills', zValidator('query', SearchQuerySchema), async (c) => {
  // Build a cache key from the validated query params
  const queryString = new URL(c.req.url).search.replace(/^\?/, '');
  const cacheKey = buildCacheKey('skills', queryString);

  return cachedResponse(c, cacheKey, CACHE_TTLS.search, async () => {
  const db = c.get('db');
  const params = c.req.valid('query');
  const { q, author, category, tag, signed, trust, platform, security, sort, page, per_page } =
    params;
  const offset = (page - 1) * per_page;

  // Build WHERE conditions — always exclude blocked skills from public search
  const conditions = [ne(skills.status, 'blocked')];

  if (author) {
    const authors = author
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    if (authors.length === 1) {
      conditions.push(
        sql`${skills.ownerId} IN (
          SELECT ${users.id} FROM ${users}
          WHERE ${users.username} = ${authors[0]}
        )`,
      );
    } else if (authors.length > 1) {
      conditions.push(
        sql`${skills.ownerId} IN (
          SELECT ${users.id} FROM ${users}
          WHERE ${users.username} IN (${sql.join(
            authors.map((a) => sql`${a}`),
            sql`, `,
          )})
        )`,
      );
    }
  }

  if (q) {
    // Use GIN full-text search with tag matching fallback
    const searchCondition = buildSearchCondition(q);
    if (searchCondition) {
      conditions.push(searchCondition);
    } else {
      // Fallback to ILIKE if the query can't be parsed into tsquery
      const fallback = or(ilike(skills.name, `%${q}%`), ilike(skills.description, `%${q}%`));
      if (fallback) conditions.push(fallback);
    }
  }

  if (category) {
    const categories = category
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    if (categories.length === 1) {
      conditions.push(sql`${categories[0]} = ANY(${skills.categories})`);
    } else if (categories.length > 1) {
      conditions.push(
        sql`${skills.categories} && ARRAY[${sql.join(
          categories.map((c) => sql`${c}`),
          sql`, `,
        )}]::text[]`,
      );
    }
  }

  if (platform) {
    conditions.push(
      sql`${skills.id} IN (
        SELECT ${skillPlatforms.skillId} FROM ${skillPlatforms}
        WHERE ${skillPlatforms.platform} = ${platform} OR ${skillPlatforms.platform} = '*'
      )`,
    );
  }

  // Trust tier filtering: filter by owner's trust tier >= requested tier
  if (trust) {
    const tierIndex = TRUST_TIERS.indexOf(trust as (typeof TRUST_TIERS)[number]);
    if (tierIndex >= 0) {
      const allowedTiers = TRUST_TIERS.slice(tierIndex);
      conditions.push(
        sql`${skills.ownerId} IN (
          SELECT ${users.id} FROM ${users}
          WHERE ${users.trustTier} IN (${sql.join(
            allowedTiers.map((t) => sql`${t}`),
            sql`, `,
          )})
        )`,
      );
    }
  }

  if (tag) {
    const tags = tag
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length === 1) {
      conditions.push(
        sql`${skills.id} IN (
          SELECT ${skillTags.skillId} FROM ${skillTags}
          WHERE ${skillTags.tag} ILIKE ${'%' + tags[0] + '%'}
        )`,
      );
    } else if (tags.length > 1) {
      conditions.push(
        sql`${skills.id} IN (
          SELECT ${skillTags.skillId} FROM ${skillTags}
          WHERE ${skillTags.tag} ILIKE ANY(ARRAY[${sql.join(
            tags.map((t) => sql`${'%' + t + '%'}`),
            sql`, `,
          )}])
        )`,
      );
    }
  }

  if (signed === 'true') {
    conditions.push(
      sql`${skills.id} IN (
        SELECT ${versions.skillId} FROM ${versions}
        WHERE ${versions.sigstoreBundleKey} IS NOT NULL
        AND ${versions.yanked} = false
      )`,
    );
  } else if (signed === 'false') {
    conditions.push(
      sql`${skills.id} NOT IN (
        SELECT ${versions.skillId} FROM ${versions}
        WHERE ${versions.sigstoreBundleKey} IS NOT NULL
        AND ${versions.yanked} = false
      )`,
    );
  }

  if (security && security !== 'any') {
    conditions.push(eq(skills.scanSecurityLevel, security));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total
  const [totalRow] = await db.select({ total: count() }).from(skills).where(whereClause);
  const total = totalRow.total;

  // Sort
  let orderBy;
  switch (sort) {
    case 'downloads':
      orderBy = desc(
        sql`(SELECT count(*) FROM ${downloads}
             JOIN ${versions} ON ${versions.id} = ${downloads.versionId}
             WHERE ${versions.skillId} = ${skills.id})`,
      );
      break;
    case 'rating':
      orderBy = desc(skills.ratingAvg);
      break;
    case 'updated':
      orderBy = desc(skills.updatedAt);
      break;
    case 'new':
      orderBy = desc(skills.createdAt);
      break;
    case 'relevance':
    default:
      if (q) {
        const rankExpr = buildRankExpression(q);
        if (rankExpr) {
          // Use ts_rank for proper relevance scoring, with name exact-match boost
          orderBy = desc(
            sql`(${rankExpr} + CASE WHEN ${skills.name} ILIKE ${`%${q}%`} THEN 1.0 ELSE 0 END)`,
          );
        } else {
          orderBy = desc(sql`CASE WHEN ${skills.name} ILIKE ${`%${q}%`} THEN 1 ELSE 0 END`);
        }
      } else {
        orderBy = desc(skills.updatedAt);
      }
      break;
  }

  // Fetch results
  const rows = await db
    .select({
      id: skills.id,
      name: skills.name,
      description: skills.description,
      categories: skills.categories,
      repository: skills.repository,
      license: skills.license,
      deprecated: skills.deprecated,
      ratingAvg: skills.ratingAvg,
      ratingCount: skills.ratingCount,
      scanSecurityLevel: skills.scanSecurityLevel,
      ownerId: skills.ownerId,
      createdAt: skills.createdAt,
      updatedAt: skills.updatedAt,
    })
    .from(skills)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(per_page)
    .offset(offset);

  // Batch-enrich all results (avoids N+1 queries)
  const skillIds = rows.map((r) => r.id);
  const ownerIds = [...new Set(rows.map((r) => r.ownerId).filter(Boolean))] as string[];

  // Batch: latest version per skill (using DISTINCT ON)
  const latestVersionRows =
    skillIds.length > 0
      ? await db
          .select()
          .from(versions)
          .where(and(inArray(versions.skillId, skillIds), eq(versions.yanked, false)))
          .orderBy(
            versions.skillId,
            desc(versions.versionMajor),
            desc(versions.versionMinor),
            desc(versions.versionPatch),
          )
      : [];
  const latestVersionMap = new Map<string, (typeof latestVersionRows)[0]>();
  for (const v of latestVersionRows) {
    if (!latestVersionMap.has(v.skillId)) latestVersionMap.set(v.skillId, v);
  }

  // Batch: tags
  const allTags =
    skillIds.length > 0
      ? await db
          .select({ skillId: skillTags.skillId, tag: skillTags.tag })
          .from(skillTags)
          .where(inArray(skillTags.skillId, skillIds))
      : [];
  const tagMap = new Map<string, string[]>();
  for (const t of allTags) {
    if (!tagMap.has(t.skillId)) tagMap.set(t.skillId, []);
    tagMap.get(t.skillId)!.push(t.tag);
  }

  // Batch: platforms
  const allPlatforms =
    skillIds.length > 0
      ? await db
          .select({ skillId: skillPlatforms.skillId, platform: skillPlatforms.platform })
          .from(skillPlatforms)
          .where(inArray(skillPlatforms.skillId, skillIds))
      : [];
  const platformMap = new Map<string, string[]>();
  for (const p of allPlatforms) {
    if (!platformMap.has(p.skillId)) platformMap.set(p.skillId, []);
    platformMap.get(p.skillId)!.push(p.platform);
  }

  // Batch: authors
  const authorRows =
    ownerIds.length > 0
      ? await db
          .select({ id: users.id, username: users.username, trustTier: users.trustTier })
          .from(users)
          .where(inArray(users.id, ownerIds))
      : [];
  const authorMap = new Map<string, { username: string; trustTier: string }>();
  for (const a of authorRows) {
    authorMap.set(a.id, { username: a.username, trustTier: a.trustTier });
  }

  // Batch: download counts
  const dlCounts =
    skillIds.length > 0
      ? await db
          .select({
            skillId: versions.skillId,
            total: count(),
          })
          .from(downloads)
          .innerJoin(versions, eq(versions.id, downloads.versionId))
          .where(inArray(versions.skillId, skillIds))
          .groupBy(versions.skillId)
      : [];
  const dlMap = new Map<string, number>();
  for (const d of dlCounts) {
    dlMap.set(d.skillId, d.total);
  }

  // Batch: weekly download counts
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyDlCounts =
    skillIds.length > 0
      ? await db
          .select({
            skillId: versions.skillId,
            total: count(),
          })
          .from(downloads)
          .innerJoin(versions, eq(versions.id, downloads.versionId))
          .where(
            and(
              inArray(versions.skillId, skillIds),
              sql`${downloads.downloadedAt} >= ${oneWeekAgo.toISOString()}`,
            ),
          )
          .groupBy(versions.skillId)
      : [];
  const weeklyDlMap = new Map<string, number>();
  for (const d of weeklyDlCounts) {
    weeklyDlMap.set(d.skillId, d.total);
  }

  // Assemble results
  const results = rows.map((row) => {
    const latestVersion = latestVersionMap.get(row.id);
    const author = row.ownerId ? authorMap.get(row.ownerId) : undefined;

    return {
      name: row.name,
      version: latestVersion?.version ?? null,
      description: row.description,
      author: {
        username: author?.username ?? 'unknown',
        trust_tier: author?.trustTier ?? 'registered',
      },
      categories: row.categories,
      tags: tagMap.get(row.id) ?? [],
      platforms: platformMap.get(row.id) ?? [],
      downloads: dlMap.get(row.id) ?? 0,
      weekly_downloads: weeklyDlMap.get(row.id) ?? 0,
      rating_avg: row.ratingAvg,
      rating_count: row.ratingCount,
      signed: latestVersion?.sigstoreBundleKey != null,
      scan_security_level: row.scanSecurityLevel,
      license: row.license,
      deprecated: row.deprecated,
      published_at: latestVersion?.publishedAt?.toISOString() ?? null,
      updated_at: row.updatedAt.toISOString(),
    };
  });

  return c.json({
    results,
    total,
    page,
    per_page,
    pages: Math.ceil(total / per_page),
  });
  });
});

// ── GET /skills/:name — get skill detail ──

dualSkillRoute('get', '', async (c: Context<AppEnv>) => {
  const db = c.get('db');
  const name = extractSkillName(c);

  const [skill] = await db.select().from(skills).where(eq(skills.name, name)).limit(1);

  if (!skill) {
    // Did-you-mean suggestion
    const allSkills = await db.select({ name: skills.name }).from(skills);
    const allNames = allSkills.map((s) => s.name);
    const suggestions = allNames
      .map((n) => ({ name: n, score: compareTwoStrings(name, n) }))
      .filter((s) => s.score > 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.name);

    return c.json(
      createApiError('SKILL_NOT_FOUND', {
        suggestion: suggestions.length > 0 ? `Did you mean: ${suggestions.join(', ')}?` : undefined,
      }),
      ERROR_CODES.SKILL_NOT_FOUND.status,
    );
  }

  // Fetch related data
  const versionRows = await db
    .select()
    .from(versions)
    .where(eq(versions.skillId, skill.id))
    .orderBy(desc(versions.versionMajor), desc(versions.versionMinor), desc(versions.versionPatch));

  const tagRows = await db
    .select({ tag: skillTags.tag })
    .from(skillTags)
    .where(eq(skillTags.skillId, skill.id));

  const platformRows = await db
    .select({ platform: skillPlatforms.platform })
    .from(skillPlatforms)
    .where(eq(skillPlatforms.skillId, skill.id));

  const [author] = await db
    .select({
      username: users.username,
      id: users.id,
      githubLogin: users.githubLogin,
      trustTier: users.trustTier,
    })
    .from(users)
    .where(eq(users.id, skill.ownerId))
    .limit(1);

  // Fetch all collaborators for multi-author support
  const authorRows = await db
    .select({
      username: users.username,
      githubLogin: users.githubLogin,
      trustTier: users.trustTier,
      role: skillCollaborators.role,
    })
    .from(skillCollaborators)
    .innerJoin(users, eq(users.id, skillCollaborators.userId))
    .where(eq(skillCollaborators.skillId, skill.id))
    .orderBy(skillCollaborators.role); // 'collaborator' before 'owner' alphabetically, but we sort in response

  const latestVersion = versionRows[0];
  const latestManifest = latestVersion?.manifest as Record<string, unknown> | undefined;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [dlCount] = await db
    .select({ total: count() })
    .from(downloads)
    .innerJoin(versions, eq(versions.id, downloads.versionId))
    .where(eq(versions.skillId, skill.id));

  const [weeklyDlCount] = await db
    .select({ total: count() })
    .from(downloads)
    .innerJoin(versions, eq(versions.id, downloads.versionId))
    .where(
      and(
        eq(versions.skillId, skill.id),
        sql`${downloads.downloadedAt} >= ${oneWeekAgo.toISOString()}`,
      ),
    );

  // Build security info from scans table
  let securityInfo = null;
  if (latestVersion) {
    const scanRows = await db
      .select()
      .from(scans)
      .where(eq(scans.versionId, latestVersion.id))
      .orderBy(scans.layer);

    const scanLayers = scanRows.map((s) => {
      const details = s.details as Record<string, unknown> | null;
      return {
        layer: s.layer,
        name: (details?.name as string) ?? `Layer ${s.layer}`,
        status: details?.status ?? s.status,
        confidence: s.confidence,
        ...(details?.error ? { detail: details.error as string } : {}),
      };
    });

    securityInfo = {
      signed: latestVersion.sigstoreBundleKey != null,
      signer_identity: latestVersion.signerIdentity ?? undefined,
      scan_status: skill.scanSecurityLevel === 'unscanned' ? 'pending' : skill.scanSecurityLevel,
      scan_security_level: skill.scanSecurityLevel,
      scan_layers: scanLayers.length > 0 ? scanLayers : undefined,
    };
  }

  return c.json({
    name: skill.name,
    description: skill.description,
    categories: skill.categories,
    author: {
      username: author?.username ?? 'unknown',
      github_login: author?.githubLogin ?? '',
      trust_tier: author?.trustTier ?? 'registered',
    },
    authors:
      authorRows.length > 0
        ? authorRows
            .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0))
            .map((a) => ({
              username: a.username,
              github_login: a.githubLogin ?? '',
              trust_tier: a.trustTier,
              role: a.role,
            }))
        : [
            {
              username: author?.username ?? 'unknown',
              github_login: author?.githubLogin ?? '',
              trust_tier: author?.trustTier ?? 'registered',
              role: 'owner',
            },
          ],
    imported_from: skill.importedFrom ?? undefined,
    repository: skill.repository,
    license: skill.license,
    deprecated: skill.deprecated,
    deprecated_msg: skill.deprecatedMsg,
    rating_avg: skill.ratingAvg,
    rating_count: skill.ratingCount,
    downloads: dlCount.total,
    weekly_downloads: weeklyDlCount.total,
    tags: tagRows.map((t) => t.tag),
    platforms: platformRows.map((p) => p.platform),
    readme_md: latestVersion?.readmeMd ?? null,
    latest_version: latestVersion?.version ?? null,
    dependencies: latestManifest?.dependencies ?? null,
    security: securityInfo,
    versions: versionRows.map((v) => ({
      version: v.version,
      published_at: v.publishedAt.toISOString(),
      yanked: v.yanked,
      signed: v.sigstoreBundleKey != null,
      size_bytes: v.sizeBytes,
    })),
    created_at: skill.createdAt.toISOString(),
    updated_at: skill.updatedAt.toISOString(),
  });
});

// ── GET /skills/:name/downloads — daily download counts (30 days) ──

dualSkillRoute('get', '/downloads', async (c: Context<AppEnv>) => {
  const db = c.get('db');
  const name = extractSkillName(c);

  const [skill] = await db
    .select({ id: skills.id })
    .from(skills)
    .where(eq(skills.name, name))
    .limit(1);

  if (!skill) {
    return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      date: sql<string>`DATE(${downloads.downloadedAt})`.as('date'),
      count: count(),
    })
    .from(downloads)
    .innerJoin(versions, eq(versions.id, downloads.versionId))
    .where(
      and(
        eq(versions.skillId, skill.id),
        sql`${downloads.downloadedAt} >= ${thirtyDaysAgo.toISOString()}`,
      ),
    )
    .groupBy(sql`DATE(${downloads.downloadedAt})`)
    .orderBy(sql`DATE(${downloads.downloadedAt})`);

  return c.json({ name, days: rows });
});

// ── GET /skills/:name/:version — get specific version ──

dualSkillRoute('get', '/:version', async (c: Context<AppEnv>) => {
  const db = c.get('db');
  const name = extractSkillName(c);
  const version = c.req.param('version');

  const [skill] = await db
    .select({ id: skills.id })
    .from(skills)
    .where(eq(skills.name, name))
    .limit(1);

  if (!skill) {
    return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
  }

  const [ver] = await db
    .select()
    .from(versions)
    .where(and(eq(versions.skillId, skill.id), eq(versions.version, version)))
    .limit(1);

  if (!ver) {
    return c.json(createApiError('VERSION_NOT_FOUND'), ERROR_CODES.VERSION_NOT_FOUND.status);
  }

  return c.json({
    name,
    version: ver.version,
    manifest: ver.manifest,
    readme_md: ver.readmeMd,
    size_bytes: ver.sizeBytes,
    checksum_sha256: ver.checksumSha256,
    skl_storage_key: ver.sklStorageKey,
    signer_identity: ver.signerIdentity,
    signed: ver.sigstoreBundleKey != null,
    yanked: ver.yanked,
    yank_reason: ver.yankReason,
    published_at: ver.publishedAt.toISOString(),
  });
});

// ── DELETE /skills/:name/:version — yank a version ──

const YankBodySchema = z.object({
  reason: z.string().min(1).max(500),
});

dualSkillRoute(
  'delete',
  '/:version',
  authed,
  zValidator('json', YankBodySchema),
  async (c: Context<AppEnv>) => {
    const db = c.get('db');
    const jwt = c.get('jwtPayload');
    const userId = jwt.sub;
    const name = extractSkillName(c);
    const version = c.req.param('version');

    // Placeholder users cannot yank
    if (await isPlaceholderUser(db, userId)) {
      return c.json(
        createApiError('FORBIDDEN', { message: 'Placeholder accounts cannot modify skills' }),
        ERROR_CODES.FORBIDDEN.status,
      );
    }

    const [skill] = await db.select().from(skills).where(eq(skills.name, name)).limit(1);

    if (!skill) {
      return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
    }

    if (skill.ownerId !== userId) {
      return c.json(
        createApiError('FORBIDDEN', { message: 'You do not own this skill' }),
        ERROR_CODES.FORBIDDEN.status,
      );
    }

    const [ver] = await db
      .select({ id: versions.id })
      .from(versions)
      .where(and(eq(versions.skillId, skill.id), eq(versions.version, version)))
      .limit(1);

    if (!ver) {
      return c.json(createApiError('VERSION_NOT_FOUND'), ERROR_CODES.VERSION_NOT_FOUND.status);
    }

    const body = c.req.valid('json' as never) as z.infer<typeof YankBodySchema>;

    await db
      .update(versions)
      .set({ yanked: true, yankReason: body.reason })
      .where(eq(versions.id, ver.id));

    return c.json({
      name,
      version,
      yanked: true,
      reason: body.reason,
      yanked_at: new Date().toISOString(),
    });
  },
);

// ── PATCH /skills/:name — update skill metadata ──

const UpdateSkillSchema = z
  .object({
    deprecated: z.boolean().optional(),
    deprecated_msg: z.string().max(500).optional(),
    description: z.string().min(30).max(1024).optional(),
    categories: z.array(z.string()).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

dualSkillRoute(
  'patch',
  '',
  authed,
  zValidator('json', UpdateSkillSchema),
  async (c: Context<AppEnv>) => {
    const db = c.get('db');
    const jwt = c.get('jwtPayload');
    const userId = jwt.sub;
    const name = extractSkillName(c);

    // Placeholder users cannot update metadata
    if (await isPlaceholderUser(db, userId)) {
      return c.json(
        createApiError('FORBIDDEN', { message: 'Placeholder accounts cannot modify skills' }),
        ERROR_CODES.FORBIDDEN.status,
      );
    }

    const [skill] = await db.select().from(skills).where(eq(skills.name, name)).limit(1);

    if (!skill) {
      return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
    }

    if (skill.ownerId !== userId) {
      return c.json(
        createApiError('FORBIDDEN', { message: 'You do not own this skill' }),
        ERROR_CODES.FORBIDDEN.status,
      );
    }

    const body = c.req.valid('json' as never) as z.infer<typeof UpdateSkillSchema>;
    const now = new Date();

    const updateFields: Record<string, unknown> = { updatedAt: now };
    if (body.deprecated !== undefined) updateFields.deprecated = body.deprecated;
    if (body.deprecated_msg !== undefined) updateFields.deprecatedMsg = body.deprecated_msg;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.categories !== undefined) updateFields.categories = body.categories;

    await db.update(skills).set(updateFields).where(eq(skills.id, skill.id));

    return c.json({
      name,
      ...(body as Record<string, unknown>),
      updated_at: now.toISOString(),
    });
  },
);

// ── POST /skills/:name/sign — attach sigstore signature to existing version ──

dualSkillRoute('post', '/sign', authed, async (c: Context<AppEnv>) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const userId = jwt.sub;
  const name = extractSkillName(c);

  if (await isPlaceholderUser(db, userId)) {
    return c.json(
      createApiError('FORBIDDEN', { message: 'Placeholder accounts cannot sign skills' }),
      ERROR_CODES.FORBIDDEN.status,
    );
  }

  const [skill] = await db.select().from(skills).where(eq(skills.name, name)).limit(1);

  if (!skill) {
    return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
  }

  // Owner or admin
  const isAdmin = jwt.role === 'admin';
  if (skill.ownerId !== userId && !isAdmin) {
    return c.json(
      createApiError('FORBIDDEN', { message: 'You do not own this skill' }),
      ERROR_CODES.FORBIDDEN.status,
    );
  }

  const formData = await c.req.formData();
  const versionStr = formData.get('version');
  if (typeof versionStr !== 'string') {
    return c.json(createApiError('VALIDATION_ERROR', { message: 'version is required' }), 400);
  }

  const bundleFile = formData.get('sigstore_bundle');
  if (!(bundleFile instanceof File)) {
    return c.json(
      createApiError('VALIDATION_ERROR', { message: 'sigstore_bundle file is required' }),
      400,
    );
  }

  const [ver] = await db
    .select({ id: versions.id, version: versions.version, sklStorageKey: versions.sklStorageKey })
    .from(versions)
    .where(and(eq(versions.skillId, skill.id), eq(versions.version, versionStr)))
    .limit(1);

  if (!ver) {
    return c.json(createApiError('VERSION_NOT_FOUND'), ERROR_CODES.VERSION_NOT_FOUND.status);
  }

  const bundleData = await bundleFile.arrayBuffer();
  const sigstoreBundleKey = await uploadBundle(c.env.R2_BUCKET, name, versionStr, bundleData);

  const identity = formData.get('signer_identity');
  const signerIdentity = typeof identity === 'string' ? identity : undefined;

  await db
    .update(versions)
    .set({ sigstoreBundleKey, signerIdentity })
    .where(eq(versions.id, ver.id));

  return c.json({
    name,
    version: versionStr,
    signed: true,
    signer_identity: signerIdentity,
    signed_at: new Date().toISOString(),
  });
});

// ── POST /skills/:name/rescan — re-run security pipeline (owner or admin) ──

const RescanSchema = z.object({
  version: z.string().optional(),
});

dualSkillRoute(
  'post',
  '/rescan',
  authed,
  zValidator('json', RescanSchema),
  async (c: Context<AppEnv>) => {
    const db = c.get('db');
    const jwt = c.get('jwtPayload');
    const userId = jwt.sub;
    const name = extractSkillName(c);
    const body = c.req.valid('json' as never) as z.infer<typeof RescanSchema>;

    if (await isPlaceholderUser(db, userId)) {
      return c.json(
        createApiError('FORBIDDEN', { message: 'Placeholder accounts cannot rescan skills' }),
        ERROR_CODES.FORBIDDEN.status,
      );
    }

    const [skill] = await db
      .select({ id: skills.id, ownerId: skills.ownerId })
      .from(skills)
      .where(eq(skills.name, name))
      .limit(1);

    if (!skill) {
      return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
    }

    // Owner or admin
    const isAdmin = jwt.role === 'admin';
    if (skill.ownerId !== userId && !isAdmin) {
      return c.json(
        createApiError('FORBIDDEN', { message: 'You do not own this skill' }),
        ERROR_CODES.FORBIDDEN.status,
      );
    }

    const [ver] = body.version
      ? await db
          .select({
            id: versions.id,
            version: versions.version,
            sklStorageKey: versions.sklStorageKey,
          })
          .from(versions)
          .where(and(eq(versions.skillId, skill.id), eq(versions.version, body.version)))
          .limit(1)
      : await db
          .select({
            id: versions.id,
            version: versions.version,
            sklStorageKey: versions.sklStorageKey,
          })
          .from(versions)
          .where(eq(versions.skillId, skill.id))
          .orderBy(
            desc(versions.versionMajor),
            desc(versions.versionMinor),
            desc(versions.versionPatch),
          )
          .limit(1);

    if (!ver) {
      return c.json(createApiError('VERSION_NOT_FOUND'), ERROR_CODES.VERSION_NOT_FOUND.status);
    }

    const obj = await getObject(c.env.R2_BUCKET, ver.sklStorageKey);
    if (!obj) {
      return c.json(
        createApiError('SKILL_NOT_FOUND', { message: 'Package not found in storage' }),
        404,
      );
    }

    const packageData = await obj.arrayBuffer();
    let textFiles: Array<{ name: string; content: string }>;
    try {
      textFiles = await extractTextFiles(packageData);
    } catch {
      textFiles = [];
    }

    const scanResult = await runSecurityPipeline(textFiles, {
      hfApiToken: c.env.HF_API_TOKEN,
      lakeraApiKey: c.env.LAKERA_API_KEY,
    });

    const dbStatusMap: Record<string, 'pending' | 'passed' | 'flagged' | 'blocked'> = {
      passed: 'passed',
      flagged: 'flagged',
      blocked: 'blocked',
      error: 'pending',
      skipped: 'pending',
    };

    for (const layer of scanResult.layers) {
      const dbStatus = dbStatusMap[layer.status] ?? 'pending';
      const layerDetails = {
        name: layer.name,
        status: layer.status,
        blocked: layer.blocked,
        warnings: layer.warnings,
        ...(layer.error ? { error: layer.error } : {}),
      };

      await db
        .insert(scans)
        .values({
          versionId: ver.id,
          layer: layer.layer,
          status: dbStatus,
          confidence: layer.confidence,
          details: layerDetails,
        })
        .onConflictDoUpdate({
          target: [scans.versionId, scans.layer],
          set: {
            status: dbStatus,
            confidence: layer.confidence,
            details: layerDetails,
            scannedAt: new Date(),
          },
        });
    }

    await db
      .update(skills)
      .set({ scanSecurityLevel: scanResult.securityLevel, updatedAt: new Date() })
      .where(eq(skills.id, skill.id));

    return c.json({
      name,
      version: ver.version,
      security_level: scanResult.securityLevel,
      passed: scanResult.passed,
      blocked: scanResult.blocked,
      warnings: scanResult.warnings,
      layers: scanResult.layers.map((l) => ({
        layer: l.layer,
        name: l.name,
        status: l.status,
        confidence: l.confidence,
        ...(l.error ? { error: l.error } : {}),
      })),
      rescanned_at: new Date().toISOString(),
    });
  },
);

// ── Collaborator Management ──

const CollaboratorSchema = z.object({
  username: z.string().min(1),
  role: z.enum(['collaborator']).optional().default('collaborator'),
});

// Helper: check if user is owner or collaborator of a skill
const isOwnerOrCollaborator = async (
  db: Database,
  skillId: string,
  userId: string,
): Promise<{ allowed: boolean; role: string | null }> => {
  const [row] = await db
    .select({ role: skillCollaborators.role })
    .from(skillCollaborators)
    .where(and(eq(skillCollaborators.skillId, skillId), eq(skillCollaborators.userId, userId)))
    .limit(1);
  return { allowed: !!row, role: row?.role ?? null };
};

// GET /skills/:name/collaborators — list collaborators
dualSkillRoute('get', '/collaborators', async (c: Context<AppEnv>) => {
  const db = c.get('db');
  const name = extractSkillName(c);

  const [skill] = await db
    .select({ id: skills.id })
    .from(skills)
    .where(eq(skills.name, name))
    .limit(1);
  if (!skill) {
    return c.json(
      createApiError('SKILL_NOT_FOUND', { message: 'Skill not found' }),
      ERROR_CODES.SKILL_NOT_FOUND.status,
    );
  }

  const rows = await db
    .select({
      username: users.username,
      githubLogin: users.githubLogin,
      trustTier: users.trustTier,
      role: skillCollaborators.role,
      addedAt: skillCollaborators.addedAt,
    })
    .from(skillCollaborators)
    .innerJoin(users, eq(users.id, skillCollaborators.userId))
    .where(eq(skillCollaborators.skillId, skill.id))
    .orderBy(skillCollaborators.addedAt);

  return c.json({
    collaborators: rows.map((r) => ({
      username: r.username,
      github_login: r.githubLogin,
      trust_tier: r.trustTier,
      role: r.role,
      added_at: r.addedAt instanceof Date ? r.addedAt.toISOString() : String(r.addedAt),
    })),
  });
});

// POST /skills/:name/collaborators — add a collaborator (owner only)
dualSkillRoute(
  'post',
  '/collaborators',
  authed,
  zValidator('json', CollaboratorSchema),
  async (c: Context<AppEnv>) => {
    const db = c.get('db');
    const jwt = c.get('jwtPayload');
    const userId = jwt.sub;
    const name = extractSkillName(c);
    const { username, role } = c.req.valid('json' as never) as z.infer<typeof CollaboratorSchema>;

    const [skill] = await db
      .select({ id: skills.id, ownerId: skills.ownerId })
      .from(skills)
      .where(eq(skills.name, name))
      .limit(1);

    if (!skill) {
      return c.json(
        createApiError('SKILL_NOT_FOUND', { message: 'Skill not found' }),
        ERROR_CODES.SKILL_NOT_FOUND.status,
      );
    }

    // Only the owner can add collaborators
    if (skill.ownerId !== userId) {
      return c.json(
        createApiError('FORBIDDEN', { message: 'Only the skill owner can manage collaborators' }),
        ERROR_CODES.FORBIDDEN.status,
      );
    }

    // Find the target user
    const [targetUser] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!targetUser) {
      return c.json(
        createApiError('SKILL_NOT_FOUND', { message: `User "${username}" not found` }),
        ERROR_CODES.SKILL_NOT_FOUND.status,
      );
    }

    // Check if already a collaborator
    const [existing] = await db
      .select({ id: skillCollaborators.id })
      .from(skillCollaborators)
      .where(
        and(eq(skillCollaborators.skillId, skill.id), eq(skillCollaborators.userId, targetUser.id)),
      )
      .limit(1);

    if (existing) {
      return c.json(
        createApiError('VERSION_EXISTS', { message: `${username} is already a collaborator` }),
        409,
      );
    }

    await db.insert(skillCollaborators).values({
      skillId: skill.id,
      userId: targetUser.id,
      role,
    });

    return c.json({ message: `Added ${username} as ${role}`, username, role }, 201);
  },
);

// DELETE /skills/:name/collaborators/:username — remove a collaborator (owner only)
dualSkillRoute('delete', '/collaborators/:username', authed, async (c: Context<AppEnv>) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const userId = jwt.sub;
  const name = extractSkillName(c);
  const targetUsername = c.req.param('username');

  const [skill] = await db
    .select({ id: skills.id, ownerId: skills.ownerId })
    .from(skills)
    .where(eq(skills.name, name))
    .limit(1);

  if (!skill) {
    return c.json(
      createApiError('SKILL_NOT_FOUND', { message: 'Skill not found' }),
      ERROR_CODES.SKILL_NOT_FOUND.status,
    );
  }

  if (skill.ownerId !== userId) {
    return c.json(
      createApiError('FORBIDDEN', { message: 'Only the skill owner can manage collaborators' }),
      ERROR_CODES.FORBIDDEN.status,
    );
  }

  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, targetUsername))
    .limit(1);

  if (!targetUser) {
    return c.json(
      createApiError('SKILL_NOT_FOUND', { message: `User "${targetUsername}" not found` }),
      ERROR_CODES.SKILL_NOT_FOUND.status,
    );
  }

  // Cannot remove the owner
  const [collab] = await db
    .select({ role: skillCollaborators.role })
    .from(skillCollaborators)
    .where(
      and(eq(skillCollaborators.skillId, skill.id), eq(skillCollaborators.userId, targetUser.id)),
    )
    .limit(1);

  if (!collab) {
    return c.json(
      createApiError('SKILL_NOT_FOUND', { message: `${targetUsername} is not a collaborator` }),
      ERROR_CODES.SKILL_NOT_FOUND.status,
    );
  }

  if (collab.role === 'owner') {
    return c.json(
      createApiError('FORBIDDEN', {
        message: 'Cannot remove the owner. Transfer ownership first.',
      }),
      ERROR_CODES.FORBIDDEN.status,
    );
  }

  await db
    .delete(skillCollaborators)
    .where(
      and(eq(skillCollaborators.skillId, skill.id), eq(skillCollaborators.userId, targetUser.id)),
    );

  return c.json({ message: `Removed ${targetUsername} from collaborators` });
});
