import { Hono } from 'hono';
import { eq, count } from 'drizzle-orm';
import type { AppEnv } from '../../types.js';
import { skills, users, scans, reports, publishAttempts, downloads } from '../../db/schema.js';

export const statsRoutes = new Hono<AppEnv>();

// ── GET /admin/stats — dashboard statistics ──

statsRoutes.get('/admin/stats', async (c) => {
  const db = c.get('db');

  const publishStats = await db
    .select({ status: publishAttempts.status, total: count() })
    .from(publishAttempts)
    .groupBy(publishAttempts.status);

  const statusCounts: Record<string, number> = {};
  for (const row of publishStats) {
    statusCounts[row.status] = row.total;
  }

  const scanStats = await db
    .select({ status: scans.status, total: count() })
    .from(scans)
    .groupBy(scans.status);

  const scanCounts: Record<string, number> = {};
  for (const row of scanStats) {
    scanCounts[row.status] = row.total;
  }

  const [queueRow] = await db
    .select({ total: count() })
    .from(scans)
    .where(eq(scans.status, 'flagged'));

  const [openReportsRow] = await db
    .select({ total: count() })
    .from(reports)
    .where(eq(reports.status, 'open'));

  const trustStats = await db
    .select({ tier: users.trustTier, total: count() })
    .from(users)
    .groupBy(users.trustTier);

  const usersByTrust: Record<string, number> = {};
  for (const row of trustStats) {
    usersByTrust[row.tier] = row.total;
  }

  const [totalSkillsRow] = await db.select({ total: count() }).from(skills);
  const [totalUsersRow] = await db.select({ total: count() }).from(users);
  const [totalDownloadsRow] = await db.select({ total: count() }).from(downloads);

  return c.json({
    publishes: {
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      published: statusCounts['published'] ?? 0,
      blocked: statusCounts['blocked'] ?? 0,
      rejected: statusCounts['rejected'] ?? 0,
    },
    scans: {
      passed: scanCounts['passed'] ?? 0,
      flagged: scanCounts['flagged'] ?? 0,
      blocked: scanCounts['blocked'] ?? 0,
      manual_approved: scanCounts['manual_approved'] ?? 0,
    },
    queue_depth: queueRow.total,
    open_reports: openReportsRow.total,
    open_errors: 0,
    users_by_trust: usersByTrust,
    total_skills: totalSkillsRow.total,
    total_users: totalUsersRow.total,
    total_downloads: totalDownloadsRow.total,
  });
});
