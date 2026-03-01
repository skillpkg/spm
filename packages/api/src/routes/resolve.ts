import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and, desc } from 'drizzle-orm';
import { compareTwoStrings } from 'string-similarity';
import { ResolveRequestSchema } from '@spm/shared';
import type { AppEnv } from '../types.js';
import { skills, versions, users, scans } from '../db/schema.js';

export const resolveRoutes = new Hono<AppEnv>();

resolveRoutes.post('/resolve', zValidator('json', ResolveRequestSchema), async (c) => {
  const db = c.get('db');
  const body = c.req.valid('json');

  // Fetch all skill names once for did-you-mean suggestions
  const allSkillRows = await db.select({ name: skills.name }).from(skills);
  const allNames = allSkillRows.map((s) => s.name);

  const resolved: Array<{
    name: string;
    version: string;
    checksum_sha256: string;
    download_url: string;
    sigstore_bundle_url: string | null;
    size_bytes: number | null;
    trust_tier: string;
    signed: boolean;
    scan_status: string;
    dependencies: unknown[];
  }> = [];

  const unresolved: Array<{
    name: string;
    range: string;
    error: string;
    suggestion?: string;
  }> = [];

  for (const specifier of body.skills) {
    const { name, range } = specifier;

    // Find the skill
    const [skill] = await db.select().from(skills).where(eq(skills.name, name)).limit(1);

    if (!skill) {
      // Did-you-mean suggestion
      const suggestions = allNames
        .map((n) => ({ name: n, score: compareTwoStrings(name, n) }))
        .filter((s) => s.score > 0.4)
        .sort((a, b) => b.score - a.score);

      unresolved.push({
        name,
        range,
        error: 'skill_not_found',
        suggestion: suggestions.length > 0 ? suggestions[0].name : undefined,
      });
      continue;
    }

    // Find best matching version (for now: latest non-yanked version)
    const [latestVersion] = await db
      .select()
      .from(versions)
      .where(and(eq(versions.skillId, skill.id), eq(versions.yanked, false)))
      .orderBy(
        desc(versions.versionMajor),
        desc(versions.versionMinor),
        desc(versions.versionPatch),
      )
      .limit(1);

    if (!latestVersion) {
      unresolved.push({
        name,
        range,
        error: 'version_not_found',
      });
      continue;
    }

    // Look up owner trust tier
    const [owner] = await db
      .select({ trustTier: users.trustTier })
      .from(users)
      .where(eq(users.id, skill.ownerId))
      .limit(1);

    // Look up scan status (latest scan for this version)
    const [latestScan] = await db
      .select({ status: scans.status })
      .from(scans)
      .where(eq(scans.versionId, latestVersion.id))
      .orderBy(desc(scans.scannedAt))
      .limit(1);

    const manifest = latestVersion.manifest as Record<string, unknown> | undefined;
    const deps = (manifest?.dependencies as Record<string, unknown>)?.skills;

    resolved.push({
      name,
      version: latestVersion.version,
      checksum_sha256: latestVersion.checksumSha256,
      download_url: `/api/v1/skills/${name}/${latestVersion.version}/download`,
      sigstore_bundle_url: latestVersion.sigstoreBundleKey
        ? `/api/v1/skills/${name}/${latestVersion.version}/bundle`
        : null,
      size_bytes: latestVersion.sizeBytes,
      trust_tier: owner?.trustTier ?? 'registered',
      signed: latestVersion.sigstoreBundleKey != null,
      scan_status: latestScan?.status ?? 'pending',
      dependencies: deps ? Object.entries(deps).map(([k, v]) => ({ name: k, range: v })) : [],
    });
  }

  return c.json({ resolved, unresolved });
});
