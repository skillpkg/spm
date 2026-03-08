import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, count } from 'drizzle-orm';
import { ERROR_CODES, createApiError } from '@spm/shared';
import type { AppEnv } from '../../types.js';
import { skills, versions, users, scans } from '../../db/schema.js';
import { getObject } from '../../services/r2.js';
import { extractTextFiles } from '../../security/extract.js';
import { runSecurityPipeline } from '../../services/scanner.js';
import { audit } from './audit.js';

export const skillsRoutes = new Hono<AppEnv>();

// ── GET /admin/skills — list all skills with admin metadata ──

const AdminSkillsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

skillsRoutes.get('/admin/skills', zValidator('query', AdminSkillsQuerySchema), async (c) => {
  const db = c.get('db');
  const { page, per_page } = c.req.valid('query');
  const offset = (page - 1) * per_page;

  const [totalRow] = await db.select({ total: count() }).from(skills);

  const rows = await db
    .select({
      id: skills.id,
      name: skills.name,
      description: skills.description,
      categories: skills.categories,
      deprecated: skills.deprecated,
      ownerId: skills.ownerId,
      createdAt: skills.createdAt,
      updatedAt: skills.updatedAt,
    })
    .from(skills)
    .orderBy(desc(skills.updatedAt))
    .limit(per_page)
    .offset(offset);

  const results = await Promise.all(
    rows.map(async (row) => {
      const [author] = await db
        .select({ username: users.username, trustTier: users.trustTier })
        .from(users)
        .where(eq(users.id, row.ownerId))
        .limit(1);

      const [latestVersion] = await db
        .select({ version: versions.version, id: versions.id })
        .from(versions)
        .where(eq(versions.skillId, row.id))
        .orderBy(desc(versions.publishedAt))
        .limit(1);

      let scanStatus: string | null = null;
      if (latestVersion) {
        const [scanRow] = await db
          .select({ status: scans.status })
          .from(scans)
          .where(eq(scans.versionId, latestVersion.id))
          .limit(1);
        scanStatus = scanRow?.status ?? null;
      }

      return {
        name: row.name,
        description: row.description,
        categories: row.categories,
        deprecated: row.deprecated,
        author: author?.username ?? 'unknown',
        trust_tier: author?.trustTier ?? 'registered',
        latest_version: latestVersion?.version ?? null,
        scan_status: scanStatus,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      };
    }),
  );

  return c.json({
    results,
    total: totalRow.total,
    page,
    per_page,
    pages: Math.ceil(totalRow.total / per_page),
  });
});

// ── GET /admin/skills/:name/versions/:version — version detail ──

skillsRoutes.get('/admin/skills/:name/versions/:version', async (c) => {
  const db = c.get('db');
  const name = c.req.param('name');
  const version = c.req.param('version');

  const [skill] = await db
    .select({ id: skills.id, name: skills.name })
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
    name: skill.name,
    version: ver.version,
    readme_md: ver.readmeMd,
    manifest: ver.manifest,
    published_at: ver.publishedAt.toISOString(),
    yanked: ver.yanked,
    signed: ver.sigstoreBundleKey != null,
    size_bytes: ver.sizeBytes,
  });
});

// ── POST /admin/skills/:name/yank — admin-initiated yank ──

const AdminYankSchema = z.object({
  version: z.string().min(1),
  reason: z.string().min(1),
  notify_author: z.boolean().optional().default(false),
});

skillsRoutes.post('/admin/skills/:name/yank', zValidator('json', AdminYankSchema), async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const name = c.req.param('name');
  const body = c.req.valid('json');

  const [skill] = await db
    .select({ id: skills.id })
    .from(skills)
    .where(eq(skills.name, name))
    .limit(1);

  if (!skill) {
    return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
  }

  const [ver] = await db
    .select({ id: versions.id })
    .from(versions)
    .where(and(eq(versions.skillId, skill.id), eq(versions.version, body.version)))
    .limit(1);

  if (!ver) {
    return c.json(createApiError('VERSION_NOT_FOUND'), ERROR_CODES.VERSION_NOT_FOUND.status);
  }

  await db
    .update(versions)
    .set({ yanked: true, yankReason: body.reason })
    .where(eq(versions.id, ver.id));

  await audit(
    db,
    jwt.sub,
    'admin.yank',
    { skill: name, version: body.version, reason: body.reason },
    { skillId: skill.id, versionId: ver.id },
  );

  return c.json({
    name,
    version: body.version,
    yanked: true,
    reason: body.reason,
    yanked_at: new Date().toISOString(),
  });
});

// ── POST /admin/skills/:name/block — block a skill ──

const BlockSchema = z.object({
  reason: z.string().min(1),
});

skillsRoutes.post('/admin/skills/:name/block', zValidator('json', BlockSchema), async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const name = c.req.param('name');
  const body = c.req.valid('json');

  const [skill] = await db
    .select({ id: skills.id, status: skills.status })
    .from(skills)
    .where(eq(skills.name, name))
    .limit(1);

  if (!skill) {
    return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
  }

  if (skill.status === 'blocked') {
    return c.json({ name, status: 'blocked', message: 'Skill is already blocked' });
  }

  await db
    .update(skills)
    .set({ status: 'blocked', updatedAt: new Date() })
    .where(eq(skills.id, skill.id));

  await audit(
    db,
    jwt.sub,
    'admin.block',
    { skill: name, reason: body.reason },
    { skillId: skill.id },
  );

  return c.json({
    name,
    status: 'blocked',
    reason: body.reason,
    blocked_at: new Date().toISOString(),
  });
});

// ── POST /admin/skills/:name/unblock — unblock a skill ──

skillsRoutes.post('/admin/skills/:name/unblock', async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const name = c.req.param('name');

  const [skill] = await db
    .select({ id: skills.id, status: skills.status })
    .from(skills)
    .where(eq(skills.name, name))
    .limit(1);

  if (!skill) {
    return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
  }

  if (skill.status !== 'blocked') {
    return c.json({ name, status: skill.status, message: 'Skill is not blocked' });
  }

  await db
    .update(skills)
    .set({ status: 'published', updatedAt: new Date() })
    .where(eq(skills.id, skill.id));

  await audit(db, jwt.sub, 'admin.unblock', { skill: name }, { skillId: skill.id });

  return c.json({
    name,
    status: 'published',
    unblocked_at: new Date().toISOString(),
  });
});

// ── POST /admin/skills/:name/rescan — re-run security pipeline ──

const RescanSchema = z.object({
  version: z.string().optional(),
});

skillsRoutes.post('/admin/skills/:name/rescan', zValidator('json', RescanSchema), async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const name = c.req.param('name');
  const body = c.req.valid('json');

  const [skill] = await db
    .select({ id: skills.id })
    .from(skills)
    .where(eq(skills.name, name))
    .limit(1);

  if (!skill) {
    return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
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

  // Upsert scan records per layer (skip layers that didn't run)
  const dbStatusMap: Record<string, 'passed' | 'flagged' | 'blocked'> = {
    passed: 'passed',
    flagged: 'flagged',
    blocked: 'blocked',
  };

  for (const layer of scanResult.layers) {
    const dbStatus = dbStatusMap[layer.status];
    if (!dbStatus) continue;

    await db
      .insert(scans)
      .values({
        versionId: ver.id,
        layer: layer.layer,
        status: dbStatus,
        confidence: layer.confidence,
        details: { name: layer.name, blocked: layer.blocked, warnings: layer.warnings },
      })
      .onConflictDoUpdate({
        target: [scans.versionId, scans.layer],
        set: {
          status: dbStatus,
          confidence: layer.confidence,
          details: { name: layer.name, blocked: layer.blocked, warnings: layer.warnings },
          scannedAt: new Date(),
        },
      });
  }

  await db
    .update(skills)
    .set({ scanSecurityLevel: scanResult.securityLevel, updatedAt: new Date() })
    .where(eq(skills.id, skill.id));

  await audit(
    db,
    jwt.sub,
    'admin.rescan',
    {
      skill: name,
      version: ver.version,
      result: scanResult.securityLevel,
      layers: scanResult.layers.map((l) => ({ layer: l.layer, status: l.status })),
      blocked: scanResult.blocked,
      warnings: scanResult.warnings,
    },
    { skillId: skill.id, versionId: ver.id },
  );

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
    })),
    rescanned_at: new Date().toISOString(),
  });
});
