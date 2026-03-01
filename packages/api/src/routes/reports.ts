import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { ReportRequestSchema, ERROR_CODES, createApiError } from '@spm/shared';
import type { AppEnv } from '../types.js';
import { optionalAuth } from '../middleware/auth.js';
import { skills, reports } from '../db/schema.js';

export const reportsRoutes = new Hono<AppEnv>();

// ── POST /skills/:name/report — report a skill (anonymous allowed) ──

reportsRoutes.post(
  '/skills/:name/report',
  optionalAuth,
  zValidator('json', ReportRequestSchema),
  async (c) => {
    const db = c.get('db');
    const name = c.req.param('name');
    const body = c.req.valid('json');

    // Find the skill
    const [skill] = await db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.name, name))
      .limit(1);

    if (!skill) {
      return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
    }

    // Get reporter ID if authenticated
    const jwtPayload = c.get('jwtPayload');
    const reporterId = jwtPayload?.sub ?? null;

    const [report] = await db
      .insert(reports)
      .values({
        skillId: skill.id,
        reporterId,
        reason: body.reason,
        priority: body.priority,
      })
      .returning({ id: reports.id, createdAt: reports.createdAt });

    return c.json(
      {
        id: report.id,
        skill: name,
        status: 'open',
        created_at: report.createdAt.toISOString(),
      },
      201,
    );
  },
);
