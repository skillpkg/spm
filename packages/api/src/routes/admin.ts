import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import { ERROR_CODES, createApiError } from '@spm/shared';
import type { AppEnv } from '../types.js';
import { authed, adminGuard } from '../middleware/auth.js';
import {
  skills,
  versions,
  users,
  scans,
  reports,
  auditLog,
  publishAttempts,
  downloads,
} from '../db/schema.js';

export const adminRoutes = new Hono<AppEnv>();

// Apply auth + admin guard to ALL admin routes
adminRoutes.use('*', authed);
adminRoutes.use('*', adminGuard);

// ── Helper: write audit log entry ──

const audit = async (
  db: AppEnv['Variables']['db'],
  actorId: string,
  action: string,
  details: Record<string, unknown>,
  opts?: { skillId?: string; versionId?: string },
) => {
  await db.insert(auditLog).values({
    actorId,
    action,
    skillId: opts?.skillId,
    versionId: opts?.versionId,
    details,
  });
};

// ── GET /admin/queue — flagged skills awaiting review ──

const QueueQuerySchema = z.object({
  sort: z.enum(['oldest', 'newest', 'confidence']).optional().default('oldest'),
  status: z.enum(['pending', 'all']).optional().default('pending'),
});

adminRoutes.get('/admin/queue', zValidator('query', QueueQuerySchema), async (c) => {
  const db = c.get('db');
  const { sort, status } = c.req.valid('query');

  // Find scans that are flagged (held for review)
  const conditions = [];
  if (status === 'pending') {
    conditions.push(eq(scans.status, 'flagged'));
  } else {
    conditions.push(sql`${scans.status} IN ('flagged', 'manual_approved', 'blocked')`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderBy;
  switch (sort) {
    case 'newest':
      orderBy = desc(scans.scannedAt);
      break;
    case 'confidence':
      orderBy = desc(scans.confidence);
      break;
    case 'oldest':
    default:
      orderBy = asc(scans.scannedAt);
      break;
  }

  const scanRows = await db
    .select({
      scanId: scans.id,
      versionId: scans.versionId,
      layer: scans.layer,
      status: scans.status,
      confidence: scans.confidence,
      details: scans.details,
      scannedAt: scans.scannedAt,
    })
    .from(scans)
    .where(whereClause)
    .orderBy(orderBy);

  // Enrich with skill + version + author info
  const queue = await Promise.all(
    scanRows.map(async (scan) => {
      const [ver] = await db
        .select({
          version: versions.version,
          skillId: versions.skillId,
          sizeBytes: versions.sizeBytes,
          publishedAt: versions.publishedAt,
        })
        .from(versions)
        .where(eq(versions.id, scan.versionId))
        .limit(1);

      if (!ver) return null;

      const [skill] = await db
        .select({ name: skills.name, ownerId: skills.ownerId })
        .from(skills)
        .where(eq(skills.id, ver.skillId))
        .limit(1);

      if (!skill) return null;

      const [author] = await db
        .select({ username: users.username, trustTier: users.trustTier })
        .from(users)
        .where(eq(users.id, skill.ownerId))
        .limit(1);

      return {
        id: scan.scanId,
        skill: skill.name,
        version: ver.version,
        author: {
          username: author?.username ?? 'unknown',
          trust_tier: author?.trustTier ?? 'registered',
        },
        flags: [
          {
            layer: scan.layer,
            type: scan.status,
            confidence: scan.confidence,
          },
        ],
        submitted_at: scan.scannedAt.toISOString(),
        size_bytes: ver.sizeBytes,
      };
    }),
  );

  const filtered = queue.filter(Boolean);

  return c.json({
    queue: filtered,
    total: filtered.length,
  });
});

// ── POST /admin/queue/:id/approve — approve a flagged skill ──

const ApproveSchema = z.object({
  notes: z.string().optional(),
});

adminRoutes.post('/admin/queue/:id/approve', zValidator('json', ApproveSchema), async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const scanId = c.req.param('id');

  const [scan] = await db
    .select({ id: scans.id, versionId: scans.versionId, status: scans.status })
    .from(scans)
    .where(eq(scans.id, scanId))
    .limit(1);

  if (!scan) {
    return c.json(createApiError('SKILL_NOT_FOUND', { message: 'Queue item not found' }), 404);
  }

  // Update scan status to manual_approved
  await db.update(scans).set({ status: 'manual_approved' }).where(eq(scans.id, scanId));

  // Get skill name and version for response
  const [ver] = await db
    .select({ version: versions.version, skillId: versions.skillId })
    .from(versions)
    .where(eq(versions.id, scan.versionId))
    .limit(1);

  let skillName = 'unknown';
  if (ver) {
    const [skill] = await db
      .select({ name: skills.name })
      .from(skills)
      .where(eq(skills.id, ver.skillId))
      .limit(1);
    skillName = skill?.name ?? 'unknown';
  }

  const body = c.req.valid('json');
  await audit(
    db,
    jwt.sub,
    'admin.approve',
    {
      scan_id: scanId,
      notes: body.notes,
    },
    { versionId: scan.versionId },
  );

  return c.json({
    id: scanId,
    status: 'approved',
    skill: skillName,
    version: ver?.version ?? 'unknown',
    approved_at: new Date().toISOString(),
  });
});

// ── POST /admin/queue/:id/reject — reject a flagged skill ──

const RejectSchema = z.object({
  reason: z.string().min(1),
  notify_author: z.boolean().optional().default(false),
  feedback: z.string().optional(),
});

adminRoutes.post('/admin/queue/:id/reject', zValidator('json', RejectSchema), async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const scanId = c.req.param('id');

  const [scan] = await db
    .select({ id: scans.id, versionId: scans.versionId })
    .from(scans)
    .where(eq(scans.id, scanId))
    .limit(1);

  if (!scan) {
    return c.json(createApiError('SKILL_NOT_FOUND', { message: 'Queue item not found' }), 404);
  }

  // Update scan status to blocked
  await db.update(scans).set({ status: 'blocked' }).where(eq(scans.id, scanId));

  // Get skill name and version
  const [ver] = await db
    .select({ version: versions.version, skillId: versions.skillId })
    .from(versions)
    .where(eq(versions.id, scan.versionId))
    .limit(1);

  let skillName = 'unknown';
  if (ver) {
    const [skill] = await db
      .select({ name: skills.name })
      .from(skills)
      .where(eq(skills.id, ver.skillId))
      .limit(1);
    skillName = skill?.name ?? 'unknown';
  }

  const body = c.req.valid('json');
  await audit(
    db,
    jwt.sub,
    'admin.reject',
    {
      scan_id: scanId,
      reason: body.reason,
      feedback: body.feedback,
    },
    { versionId: scan.versionId },
  );

  return c.json({
    id: scanId,
    status: 'rejected',
    skill: skillName,
    version: ver?.version ?? 'unknown',
  });
});

// ── GET /admin/skills — list all skills with admin metadata ──

const AdminSkillsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

adminRoutes.get('/admin/skills', zValidator('query', AdminSkillsQuerySchema), async (c) => {
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

      // Get scan info for latest version
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

adminRoutes.get('/admin/skills/:name/versions/:version', async (c) => {
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

adminRoutes.post('/admin/skills/:name/yank', zValidator('json', AdminYankSchema), async (c) => {
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
    {
      skill: name,
      version: body.version,
      reason: body.reason,
    },
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

adminRoutes.post('/admin/skills/:name/block', zValidator('json', BlockSchema), async (c) => {
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

adminRoutes.post('/admin/skills/:name/unblock', async (c) => {
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

// ── GET /admin/users — list all users ──

const AdminUsersQuerySchema = z.object({
  sort: z.enum(['newest', 'oldest', 'username']).optional().default('newest'),
  trust: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

adminRoutes.get('/admin/users', zValidator('query', AdminUsersQuerySchema), async (c) => {
  const db = c.get('db');
  const { sort, trust, page, per_page } = c.req.valid('query');
  const offset = (page - 1) * per_page;

  const conditions = [];
  if (trust) {
    conditions.push(eq(users.trustTier, trust as (typeof users.trustTier.enumValues)[number]));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db.select({ total: count() }).from(users).where(whereClause);

  let orderBy;
  switch (sort) {
    case 'oldest':
      orderBy = asc(users.createdAt);
      break;
    case 'username':
      orderBy = asc(users.username);
      break;
    case 'newest':
    default:
      orderBy = desc(users.createdAt);
      break;
  }

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      githubLogin: users.githubLogin,
      email: users.email,
      trustTier: users.trustTier,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(per_page)
    .offset(offset);

  // Enrich with skill count
  const results = await Promise.all(
    rows.map(async (row) => {
      const [skillCount] = await db
        .select({ total: count() })
        .from(skills)
        .where(eq(skills.ownerId, row.id));

      return {
        id: row.id,
        username: row.username,
        github_login: row.githubLogin,
        email: row.email,
        trust_tier: row.trustTier,
        role: row.role,
        skills_count: skillCount.total,
        created_at: row.createdAt.toISOString(),
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

// ── PATCH /admin/users/:username/trust — change user trust tier ──

const UpdateTrustSchema = z.object({
  trust_tier: z.enum(['registered', 'scanned', 'verified', 'official']),
  reason: z.string().min(1),
});

adminRoutes.patch(
  '/admin/users/:username/trust',
  zValidator('json', UpdateTrustSchema),
  async (c) => {
    const db = c.get('db');
    const jwt = c.get('jwtPayload');
    const username = c.req.param('username');
    const body = c.req.valid('json');

    const [user] = await db
      .select({ id: users.id, trustTier: users.trustTier })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return c.json(createApiError('SKILL_NOT_FOUND', { message: 'User not found' }), 404);
    }

    const previousTier = user.trustTier;

    await db
      .update(users)
      .set({ trustTier: body.trust_tier, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    await audit(db, jwt.sub, 'admin.trust_change', {
      username,
      previous_tier: previousTier,
      new_tier: body.trust_tier,
      reason: body.reason,
    });

    return c.json({
      username,
      trust_tier: body.trust_tier,
      previous_tier: previousTier,
      updated_at: new Date().toISOString(),
    });
  },
);

// ── PATCH /admin/users/:username/role — promote/revoke admin ──

const UpdateRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
  reason: z.string().min(1),
});

adminRoutes.patch(
  '/admin/users/:username/role',
  zValidator('json', UpdateRoleSchema),
  async (c) => {
    const db = c.get('db');
    const jwt = c.get('jwtPayload');
    const username = c.req.param('username');
    const body = c.req.valid('json');

    const [user] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return c.json(createApiError('SKILL_NOT_FOUND', { message: 'User not found' }), 404);
    }

    const previousRole = user.role;

    await db
      .update(users)
      .set({ role: body.role, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    await audit(db, jwt.sub, 'admin.role_change', {
      username,
      previous_role: previousRole,
      new_role: body.role,
      reason: body.reason,
    });

    return c.json({
      username,
      role: body.role,
      previous_role: previousRole,
      updated_at: new Date().toISOString(),
    });
  },
);

// ── GET /admin/reports — list reports ──

const AdminReportsQuerySchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved', 'dismissed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

adminRoutes.get('/admin/reports', zValidator('query', AdminReportsQuerySchema), async (c) => {
  const db = c.get('db');
  const { status, priority, page, per_page } = c.req.valid('query');
  const offset = (page - 1) * per_page;

  const conditions = [];
  if (status) {
    conditions.push(eq(reports.status, status));
  }
  if (priority) {
    conditions.push(eq(reports.priority, priority));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db.select({ total: count() }).from(reports).where(whereClause);

  const rows = await db
    .select()
    .from(reports)
    .where(whereClause)
    .orderBy(desc(reports.createdAt))
    .limit(per_page)
    .offset(offset);

  const results = await Promise.all(
    rows.map(async (row) => {
      // Get skill name
      const [skill] = await db
        .select({ name: skills.name })
        .from(skills)
        .where(eq(skills.id, row.skillId))
        .limit(1);

      // Get reporter username
      let reporterName: string | null = null;
      if (row.reporterId) {
        const [reporter] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, row.reporterId))
          .limit(1);
        reporterName = reporter?.username ?? null;
      }

      return {
        id: row.id,
        skill: skill?.name ?? 'unknown',
        reporter: reporterName,
        reason: row.reason,
        priority: row.priority,
        status: row.status,
        resolution: row.resolution,
        action_taken: row.actionTaken,
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

// ── PATCH /admin/reports/:id — update report status ──

const UpdateReportSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved', 'dismissed']),
  resolution: z.string().optional(),
  action_taken: z.string().optional(),
});

adminRoutes.patch('/admin/reports/:id', zValidator('json', UpdateReportSchema), async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const reportId = c.req.param('id');
  const body = c.req.valid('json');

  const [report] = await db
    .select({ id: reports.id, skillId: reports.skillId })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);

  if (!report) {
    return c.json(createApiError('SKILL_NOT_FOUND', { message: 'Report not found' }), 404);
  }

  await db
    .update(reports)
    .set({
      status: body.status,
      resolution: body.resolution,
      actionTaken: body.action_taken,
      updatedAt: new Date(),
    })
    .where(eq(reports.id, reportId));

  await audit(
    db,
    jwt.sub,
    'admin.report_update',
    {
      report_id: reportId,
      status: body.status,
      resolution: body.resolution,
    },
    { skillId: report.skillId },
  );

  return c.json({
    id: reportId,
    status: body.status,
    resolution: body.resolution,
    action_taken: body.action_taken,
    updated_at: new Date().toISOString(),
  });
});

// ── GET /admin/errors — aggregated errors (stub — no errors table yet) ──

adminRoutes.get('/admin/errors', async (c) => {
  // No errors table in DB schema yet. Return empty list.
  // This will be populated when CLI telemetry is implemented.
  return c.json({
    errors: [],
    total: 0,
  });
});

// ── PATCH /admin/errors/:id — update error status (stub) ──

adminRoutes.patch('/admin/errors/:id', async (c) => {
  // No errors table yet — return not found
  return c.json(createApiError('SKILL_NOT_FOUND', { message: 'Error entry not found' }), 404);
});

// ── GET /admin/stats — dashboard statistics ──

adminRoutes.get('/admin/stats', async (c) => {
  const db = c.get('db');

  // Total publish attempts by status
  const publishStats = await db
    .select({
      status: publishAttempts.status,
      total: count(),
    })
    .from(publishAttempts)
    .groupBy(publishAttempts.status);

  const statusCounts: Record<string, number> = {};
  for (const row of publishStats) {
    statusCounts[row.status] = row.total;
  }

  // Scan stats
  const scanStats = await db
    .select({
      status: scans.status,
      total: count(),
    })
    .from(scans)
    .groupBy(scans.status);

  const scanCounts: Record<string, number> = {};
  for (const row of scanStats) {
    scanCounts[row.status] = row.total;
  }

  // Queue depth (flagged scans)
  const [queueRow] = await db
    .select({ total: count() })
    .from(scans)
    .where(eq(scans.status, 'flagged'));

  // Open reports
  const [openReportsRow] = await db
    .select({ total: count() })
    .from(reports)
    .where(eq(reports.status, 'open'));

  // Users by trust tier
  const trustStats = await db
    .select({
      tier: users.trustTier,
      total: count(),
    })
    .from(users)
    .groupBy(users.trustTier);

  const usersByTrust: Record<string, number> = {};
  for (const row of trustStats) {
    usersByTrust[row.tier] = row.total;
  }

  // Total skills and users
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
    open_errors: 0, // No errors table yet
    users_by_trust: usersByTrust,
    total_skills: totalSkillsRow.total,
    total_users: totalUsersRow.total,
    total_downloads: totalDownloadsRow.total,
  });
});
