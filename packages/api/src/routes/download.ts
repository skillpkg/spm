import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { ERROR_CODES, createApiError } from '@spm/shared';
import type { AppEnv } from '../types.js';
import { skills, versions, downloads } from '../db/schema.js';
import { getObject } from '../services/r2.js';

export const downloadRoutes = new Hono<AppEnv>();

// ── GET /skills/:name/:version/download — download .skl package ──

downloadRoutes.get('/skills/:name/:version/download', async (c) => {
  const db = c.get('db');
  const name = c.req.param('name');
  const version = c.req.param('version');

  // Resolve skill
  const [skill] = await db
    .select({ id: skills.id })
    .from(skills)
    .where(eq(skills.name, name))
    .limit(1);

  if (!skill) {
    return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
  }

  // Resolve version
  const [ver] = await db
    .select()
    .from(versions)
    .where(and(eq(versions.skillId, skill.id), eq(versions.version, version)))
    .limit(1);

  if (!ver) {
    return c.json(createApiError('VERSION_NOT_FOUND'), ERROR_CODES.VERSION_NOT_FOUND.status);
  }

  // Yanked check — return 410 Gone
  if (ver.yanked) {
    return c.json(
      createApiError('VERSION_NOT_FOUND', {
        message: `Version ${version} has been yanked${ver.yankReason ? `: ${ver.yankReason}` : ''}`,
      }),
      410,
    );
  }

  // Get object from R2
  const object = await getObject(c.env.R2_BUCKET, ver.sklStorageKey);
  if (!object) {
    return c.json(
      createApiError('INTERNAL_ERROR', { message: 'Package file not found in storage' }),
      ERROR_CODES.INTERNAL_ERROR.status,
    );
  }

  // Dedup downloads: skip if same user/IP downloaded this version in the last hour
  const jwtPayload = c.get('jwtPayload');
  const userId = jwtPayload?.sub ?? null;

  // Simple IP hash for dedup (using X-Forwarded-For or CF-Connecting-IP)
  const clientIp =
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  // Hash the IP for privacy
  const ipHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientIp));
  const ipHash = [...new Uint8Array(ipHashBuffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Build dedup condition: same version + (same user OR same IP hash) + within last hour
  const dedupConditions = [
    eq(downloads.versionId, ver.id),
    sql`${downloads.downloadedAt} >= ${oneHourAgo.toISOString()}`,
  ];

  if (userId) {
    dedupConditions.push(eq(downloads.userId, userId));
  } else {
    dedupConditions.push(eq(downloads.ipHash, ipHash));
  }

  const [recentDownload] = await db
    .select({ id: downloads.id })
    .from(downloads)
    .where(and(...dedupConditions))
    .limit(1);

  if (!recentDownload) {
    await db.insert(downloads).values({
      versionId: ver.id,
      userId,
      ipHash,
    });
  }

  // Return the file
  const body = await object.arrayBuffer();
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${name}-${version}.skl"`,
      'Content-Length': String(body.byteLength),
      'X-Checksum-Sha256': ver.checksumSha256,
    },
  });
});
