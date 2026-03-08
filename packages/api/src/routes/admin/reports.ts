import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, count } from 'drizzle-orm';
import { createApiError } from '@spm/shared';
import type { AppEnv } from '../../types.js';
import { skills, users, reports } from '../../db/schema.js';
import { audit } from './audit.js';

export const reportsRoutes = new Hono<AppEnv>();

// ── GET /admin/reports — list reports ──

const AdminReportsQuerySchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved', 'dismissed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

reportsRoutes.get('/admin/reports', zValidator('query', AdminReportsQuerySchema), async (c) => {
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
      const [skill] = await db
        .select({ name: skills.name })
        .from(skills)
        .where(eq(skills.id, row.skillId))
        .limit(1);

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

reportsRoutes.patch('/admin/reports/:id', zValidator('json', UpdateReportSchema), async (c) => {
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
    { report_id: reportId, status: body.status, resolution: body.resolution },
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
