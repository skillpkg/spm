import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, asc, count } from 'drizzle-orm';
import { createApiError } from '@spm/shared';
import type { AppEnv } from '../../types.js';
import { skills, users } from '../../db/schema.js';
import { audit } from './audit.js';

export const usersRoutes = new Hono<AppEnv>();

// ── GET /admin/users — list all users ──

const AdminUsersQuerySchema = z.object({
  sort: z.enum(['newest', 'oldest', 'username']).optional().default('newest'),
  trust: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

usersRoutes.get('/admin/users', zValidator('query', AdminUsersQuerySchema), async (c) => {
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

usersRoutes.patch(
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

usersRoutes.patch(
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
