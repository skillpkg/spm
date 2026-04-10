import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { ReportRequestSchema, ERROR_CODES, createApiError } from '@spm/shared';
import type { AppEnv } from '../types.js';
import { optionalAuth } from '../middleware/auth.js';
import { skills, reports } from '../db/schema.js';
import { extractSkillName } from './helpers.js';

export const reportsRoutes = new Hono<AppEnv>();

/**
 * Register a route handler for both scoped and unscoped skill paths.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dualSkillRoute = (method: 'get' | 'post', suffix: string, ...handlers: any[]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (reportsRoutes[method] as any)(`/skills/@:scope/:name${suffix}`, ...handlers);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (reportsRoutes[method] as any)(`/skills/:name${suffix}`, ...handlers);
};

// ── POST /skills/:name/report — report a skill (anonymous allowed) ──

dualSkillRoute(
  'post',
  '/report',
  optionalAuth,
  zValidator('json', ReportRequestSchema),
  async (c: Context<AppEnv>) => {
    const db = c.get('db');
    const name = extractSkillName(c);
    const body = c.req.valid('json' as never) as { reason: string; priority: string };

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
