import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, or, ilike, desc, sql, count } from 'drizzle-orm';
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
import { uploadPackage, uploadBundle } from '../services/r2.js';
import { buildSearchCondition, buildRankExpression } from '../services/search.js';
import { runSecurityPipeline } from '../services/scanner.js';
import { extractTextFiles } from '../security/extract.js';

export const skillsRoutes = new Hono<AppEnv>();

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

  // Similarity check against existing names
  const allSkills = await db.select({ name: skills.name }).from(skills);
  const existingNames = allSkills.map((s) => s.name);

  const similarCheck = checkNameSimilarity(
    name,
    existingNames.filter((n) => n !== name),
  );
  if (similarCheck.similar) {
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
    // Verify ownership (admins with X-Publish-As can transfer ownership)
    if (existingSkill.ownerId !== userId && !publishAs) {
      return c.json(
        createApiError('FORBIDDEN', { message: 'You do not own this skill' }),
        ERROR_CODES.FORBIDDEN.status,
      );
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
  for (const layerResult of scanResult.layers) {
    await db.insert(scans).values({
      versionId: insertedVersion.id,
      layer: layerResult.layer,
      status:
        layerResult.status === 'passed'
          ? 'passed'
          : layerResult.status === 'blocked'
            ? 'blocked'
            : 'flagged',
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
      url: `/api/v1/skills/${name}/${version}`,
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
  category: z.string().optional(),
  trust: z.string().optional(),
  platform: z.string().optional(),
  security: z.enum(['full', 'partial', 'any']).optional().default('any'),
  sort: z
    .enum(['relevance', 'downloads', 'rating', 'updated', 'new'])
    .optional()
    .default('relevance'),
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

skillsRoutes.get('/skills', zValidator('query', SearchQuerySchema), async (c) => {
  const db = c.get('db');
  const params = c.req.valid('query');
  const { q, category, trust, platform, security, sort, page, per_page } = params;
  const offset = (page - 1) * per_page;

  // Build WHERE conditions
  const conditions = [];

  if (q) {
    // Use GIN full-text search with tag matching fallback
    const searchCondition = buildSearchCondition(q);
    if (searchCondition) {
      conditions.push(searchCondition);
    } else {
      // Fallback to ILIKE if the query can't be parsed into tsquery
      conditions.push(or(ilike(skills.name, `%${q}%`), ilike(skills.description, `%${q}%`)));
    }
  }

  if (category) {
    conditions.push(sql`${category} = ANY(${skills.categories})`);
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
      ownerId: skills.ownerId,
      createdAt: skills.createdAt,
      updatedAt: skills.updatedAt,
    })
    .from(skills)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(per_page)
    .offset(offset);

  // Enrich each result
  const results = await Promise.all(
    rows.map(async (row) => {
      const [latestVersion] = await db
        .select()
        .from(versions)
        .where(and(eq(versions.skillId, row.id), eq(versions.yanked, false)))
        .orderBy(
          desc(versions.versionMajor),
          desc(versions.versionMinor),
          desc(versions.versionPatch),
        )
        .limit(1);

      const tagRows = await db
        .select({ tag: skillTags.tag })
        .from(skillTags)
        .where(eq(skillTags.skillId, row.id));

      const platformRows = await db
        .select({ platform: skillPlatforms.platform })
        .from(skillPlatforms)
        .where(eq(skillPlatforms.skillId, row.id));

      const [author] = await db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, row.ownerId))
        .limit(1);

      const [dlCount] = await db
        .select({ total: count() })
        .from(downloads)
        .innerJoin(versions, eq(versions.id, downloads.versionId))
        .where(eq(versions.skillId, row.id));

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [weeklyDlCount] = await db
        .select({ total: count() })
        .from(downloads)
        .innerJoin(versions, eq(versions.id, downloads.versionId))
        .where(
          and(
            eq(versions.skillId, row.id),
            sql`${downloads.downloadedAt} >= ${oneWeekAgo.toISOString()}`,
          ),
        );

      return {
        name: row.name,
        version: latestVersion?.version ?? null,
        description: row.description,
        author: author?.username ?? 'unknown',
        categories: row.categories,
        tags: tagRows.map((t) => t.tag),
        platforms: platformRows.map((p) => p.platform),
        downloads: dlCount.total,
        weekly_downloads: weeklyDlCount.total,
        rating_avg: row.ratingAvg,
        rating_count: row.ratingCount,
        signed: latestVersion?.sigstoreBundleKey != null,
        license: row.license,
        deprecated: row.deprecated,
        published_at: latestVersion?.publishedAt?.toISOString() ?? null,
        updated_at: row.updatedAt.toISOString(),
      };
    }),
  );

  return c.json({
    results,
    total,
    page,
    per_page,
    pages: Math.ceil(total / per_page),
  });
});

// ── GET /skills/:name — get skill detail ──

skillsRoutes.get('/skills/:name', async (c) => {
  const db = c.get('db');
  const name = c.req.param('name');

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

skillsRoutes.get('/skills/:name/downloads', async (c) => {
  const db = c.get('db');
  const name = c.req.param('name');

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

skillsRoutes.get('/skills/:name/:version', async (c) => {
  const db = c.get('db');
  const name = c.req.param('name');
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

skillsRoutes.delete(
  '/skills/:name/:version',
  authed,
  zValidator('json', YankBodySchema),
  async (c) => {
    const db = c.get('db');
    const jwt = c.get('jwtPayload');
    const userId = jwt.sub;
    const name = c.req.param('name');
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

    const body = c.req.valid('json');

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

skillsRoutes.patch('/skills/:name', authed, zValidator('json', UpdateSkillSchema), async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const userId = jwt.sub;
  const name = c.req.param('name');

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

  const body = c.req.valid('json');
  const now = new Date();

  const updateFields: Record<string, unknown> = { updatedAt: now };
  if (body.deprecated !== undefined) updateFields.deprecated = body.deprecated;
  if (body.deprecated_msg !== undefined) updateFields.deprecatedMsg = body.deprecated_msg;
  if (body.description !== undefined) updateFields.description = body.description;
  if (body.categories !== undefined) updateFields.categories = body.categories;

  await db.update(skills).set(updateFields).where(eq(skills.id, skill.id));

  return c.json({
    name,
    ...body,
    updated_at: now.toISOString(),
  });
});
