import { Hono } from 'hono';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { ERROR_CODES, createApiError } from '@spm/shared';
import type { AppEnv } from '../types.js';
import { authed } from '../middleware/auth.js';
import { users, skills, versions, downloads, auditLog } from '../db/schema.js';

export const authorsRoutes = new Hono<AppEnv>();

// ── GET /authors/:username — public author profile ──

authorsRoutes.get('/authors/:username', async (c) => {
  const db = c.get('db');
  const username = c.req.param('username');

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (!user) {
    return c.json(createApiError('SKILL_NOT_FOUND', { message: 'Author not found' }), 404);
  }

  // Fetch user's skills
  const skillRows = await db
    .select({
      id: skills.id,
      name: skills.name,
      category: skills.category,
      ratingAvg: skills.ratingAvg,
    })
    .from(skills)
    .where(eq(skills.ownerId, user.id));

  // Enrich each skill with latest version and download count
  const enrichedSkills = await Promise.all(
    skillRows.map(async (row) => {
      const [latestVersion] = await db
        .select({ version: versions.version })
        .from(versions)
        .where(and(eq(versions.skillId, row.id), eq(versions.yanked, false)))
        .orderBy(
          desc(versions.versionMajor),
          desc(versions.versionMinor),
          desc(versions.versionPatch),
        )
        .limit(1);

      const [dlCount] = await db
        .select({ total: count() })
        .from(downloads)
        .innerJoin(versions, eq(versions.id, downloads.versionId))
        .where(eq(versions.skillId, row.id));

      return {
        name: row.name,
        version: latestVersion?.version ?? null,
        downloads: dlCount.total,
        rating_avg: row.ratingAvg,
        category: row.category,
      };
    }),
  );

  // Total downloads across all skills
  const totalDownloads = enrichedSkills.reduce((sum, s) => sum + s.downloads, 0);

  return c.json({
    username: user.username,
    github_login: user.githubLogin,
    trust_tier: user.trustTier,
    skills: enrichedSkills,
    total_downloads: totalDownloads,
    created_at: user.createdAt.toISOString(),
  });
});

// ── GET /authors/:username/stats — authed, own profile only ──

authorsRoutes.get('/authors/:username/stats', authed, async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const username = c.req.param('username');

  // Must be own profile
  if (jwt.username !== username) {
    return c.json(
      createApiError('FORBIDDEN', { message: 'You can only view your own stats' }),
      ERROR_CODES.FORBIDDEN.status,
    );
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    return c.json(createApiError('SKILL_NOT_FOUND', { message: 'Author not found' }), 404);
  }

  // Total downloads
  const [totalDl] = await db
    .select({ total: count() })
    .from(downloads)
    .innerJoin(versions, eq(versions.id, downloads.versionId))
    .innerJoin(skills, eq(skills.id, versions.skillId))
    .where(eq(skills.ownerId, user.id));

  // Weekly downloads
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [weeklyDl] = await db
    .select({ total: count() })
    .from(downloads)
    .innerJoin(versions, eq(versions.id, downloads.versionId))
    .innerJoin(skills, eq(skills.id, versions.skillId))
    .where(
      and(
        eq(skills.ownerId, user.id),
        sql`${downloads.downloadedAt} >= ${oneWeekAgo.toISOString()}`,
      ),
    );

  // Average rating across all owned skills
  const [ratingStats] = await db
    .select({
      avgRating: sql<number>`coalesce(avg(${skills.ratingAvg}), 0)`,
      totalReviews: sql<number>`coalesce(sum(${skills.ratingCount}), 0)::int`,
    })
    .from(skills)
    .where(eq(skills.ownerId, user.id));

  // Weekly trend: last 8 weeks of download counts
  const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);
  const weeklyTrendRows = await db
    .select({
      week: sql<string>`date_trunc('week', ${downloads.downloadedAt})::date::text`,
      downloads: count(),
    })
    .from(downloads)
    .innerJoin(versions, eq(versions.id, downloads.versionId))
    .innerJoin(skills, eq(skills.id, versions.skillId))
    .where(
      and(
        eq(skills.ownerId, user.id),
        sql`${downloads.downloadedAt} >= ${eightWeeksAgo.toISOString()}`,
      ),
    )
    .groupBy(sql`date_trunc('week', ${downloads.downloadedAt})`)
    .orderBy(sql`date_trunc('week', ${downloads.downloadedAt})`);

  // Recent activity from audit_log
  const recentActivity = await db
    .select({
      action: auditLog.action,
      skillId: auditLog.skillId,
      details: auditLog.details,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(eq(auditLog.actorId, user.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(10);

  return c.json({
    total_downloads: totalDl.total,
    weekly_downloads: weeklyDl.total,
    rating_avg: Number(ratingStats.avgRating),
    total_reviews: Number(ratingStats.totalReviews),
    weekly_trend: weeklyTrendRows.map((r) => ({
      week: r.week,
      downloads: r.downloads,
    })),
    recent_activity: recentActivity.map((a) => ({
      type: a.action,
      skill_id: a.skillId,
      details: a.details,
      date: a.createdAt.toISOString(),
    })),
  });
});
