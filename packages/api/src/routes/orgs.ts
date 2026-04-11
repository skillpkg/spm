import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and, count, ilike } from 'drizzle-orm';
import {
  ERROR_CODES,
  createApiError,
  CreateOrgSchema,
  UpdateOrgSchema,
  AddMemberSchema,
  UpdateMemberRoleSchema,
} from '@spm/shared';
import type { AppEnv } from '../types.js';
import { authed } from '../middleware/auth.js';
import { organizations, orgMembers, users, skills } from '../db/schema.js';
import { isReservedName } from '../services/names.js';

export const orgsRoutes = new Hono<AppEnv>();

// Reserved names that cannot be used as org names (superset of skill reserved names)
const RESERVED_ORG_NAMES = [
  'www',
  'staging',
  'registry',
  'spm',
  'admin',
  'api',
  'app',
  'dashboard',
  'console',
];

// ── POST /orgs — create organization ──

orgsRoutes.post('/orgs', authed, zValidator('json', CreateOrgSchema), async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const body = c.req.valid('json');

  const orgName = body.name;

  // Check reserved names
  if (RESERVED_ORG_NAMES.includes(orgName) || isReservedName(orgName)) {
    return c.json(
      createApiError('NAME_RESERVED', { message: `"${orgName}" is a reserved name` }),
      ERROR_CODES.NAME_RESERVED.status,
    );
  }

  // Check name not taken by existing org
  const [existingOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, orgName))
    .limit(1);

  if (existingOrg) {
    return c.json(
      createApiError('ORG_NAME_TAKEN', { message: `Organization name "${orgName}" is already taken` }),
      ERROR_CODES.ORG_NAME_TAKEN.status,
    );
  }

  // Check name not taken by existing user (scopes must be globally unique)
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, orgName))
    .limit(1);

  if (existingUser) {
    return c.json(
      createApiError('ORG_NAME_TAKEN', {
        message: `"${orgName}" is already taken by a user`,
      }),
      ERROR_CODES.ORG_NAME_TAKEN.status,
    );
  }

  // Insert org
  const [newOrg] = await db
    .insert(organizations)
    .values({
      name: orgName,
      displayName: body.display_name ?? null,
      description: body.description ?? null,
      createdBy: jwt.sub,
    })
    .returning();

  // Insert creator as owner
  await db.insert(orgMembers).values({
    orgId: newOrg.id,
    userId: jwt.sub,
    role: 'owner',
  });

  return c.json(
    {
      id: newOrg.id,
      name: newOrg.name,
      display_name: newOrg.displayName,
      description: newOrg.description,
      members: [
        {
          username: jwt.username,
          role: 'owner',
          joined_at: newOrg.createdAt?.toISOString() ?? new Date().toISOString(),
        },
      ],
      created_at: newOrg.createdAt?.toISOString() ?? new Date().toISOString(),
    },
    201,
  );
});

// ── GET /orgs/:name — get org info ──

orgsRoutes.get('/orgs/:name', async (c) => {
  const db = c.get('db');
  const name = c.req.param('name');

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);

  if (!org) {
    return c.json(createApiError('ORG_NOT_FOUND'), ERROR_CODES.ORG_NOT_FOUND.status);
  }

  // Count members
  const [memberCount] = await db
    .select({ total: count() })
    .from(orgMembers)
    .where(eq(orgMembers.orgId, org.id));

  // Count skills (skills where name LIKE '@orgname/%')
  const [skillCount] = await db
    .select({ total: count() })
    .from(skills)
    .where(ilike(skills.name, `@${name}/%`));

  return c.json({
    id: org.id,
    name: org.name,
    display_name: org.displayName,
    description: org.description,
    avatar_url: org.avatarUrl,
    website: org.website,
    member_count: memberCount.total,
    skill_count: skillCount.total,
    created_at: org.createdAt.toISOString(),
    updated_at: org.updatedAt.toISOString(),
  });
});

// ── PATCH /orgs/:name — update org ──

orgsRoutes.patch('/orgs/:name', authed, zValidator('json', UpdateOrgSchema), async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const name = c.req.param('name');
  const body = c.req.valid('json');

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);

  if (!org) {
    return c.json(createApiError('ORG_NOT_FOUND'), ERROR_CODES.ORG_NOT_FOUND.status);
  }

  // Check caller is owner or admin
  const [membership] = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.userId, jwt.sub)))
    .limit(1);

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return c.json(
      createApiError('FORBIDDEN', { message: 'Only owners and admins can update organization settings' }),
      ERROR_CODES.FORBIDDEN.status,
    );
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.display_name !== undefined) updateData.displayName = body.display_name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.avatar_url !== undefined) updateData.avatarUrl = body.avatar_url;
  if (body.website !== undefined) updateData.website = body.website;

  await db.update(organizations).set(updateData).where(eq(organizations.id, org.id));

  return c.json({ message: 'Organization updated' });
});

// ── DELETE /orgs/:name — delete org ──

orgsRoutes.delete('/orgs/:name', authed, async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const name = c.req.param('name');

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);

  if (!org) {
    return c.json(createApiError('ORG_NOT_FOUND'), ERROR_CODES.ORG_NOT_FOUND.status);
  }

  // Check caller is owner
  const [membership] = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.userId, jwt.sub)))
    .limit(1);

  if (!membership || membership.role !== 'owner') {
    return c.json(
      createApiError('FORBIDDEN', { message: 'Only owners can delete an organization' }),
      ERROR_CODES.FORBIDDEN.status,
    );
  }

  // Check no skills published under this scope
  const [skillCount] = await db
    .select({ total: count() })
    .from(skills)
    .where(ilike(skills.name, `@${name}/%`));

  if (skillCount.total > 0) {
    return c.json(
      createApiError('VALIDATION_ERROR', {
        message: `Cannot delete organization with ${skillCount.total} published skill(s). Yank or transfer them first.`,
      }),
      ERROR_CODES.VALIDATION_ERROR.status,
    );
  }

  // Delete org (cascades members via ON DELETE CASCADE)
  await db.delete(organizations).where(eq(organizations.id, org.id));

  return c.json({ message: 'Organization deleted' });
});

// ── GET /orgs/:name/members — list members ──

orgsRoutes.get('/orgs/:name/members', async (c) => {
  const db = c.get('db');
  const name = c.req.param('name');

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);

  if (!org) {
    return c.json(createApiError('ORG_NOT_FOUND'), ERROR_CODES.ORG_NOT_FOUND.status);
  }

  const members = await db
    .select({
      username: users.username,
      role: orgMembers.role,
      joinedAt: orgMembers.joinedAt,
    })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(eq(orgMembers.orgId, org.id));

  return c.json({
    members: members.map((m) => ({
      username: m.username,
      role: m.role,
      joined_at: m.joinedAt.toISOString(),
    })),
    total: members.length,
  });
});

// ── POST /orgs/:name/members — add member ──

orgsRoutes.post(
  '/orgs/:name/members',
  authed,
  zValidator('json', AddMemberSchema),
  async (c) => {
    const db = c.get('db');
    const jwt = c.get('jwtPayload');
    const name = c.req.param('name');
    const body = c.req.valid('json');

    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.name, name))
      .limit(1);

    if (!org) {
      return c.json(createApiError('ORG_NOT_FOUND'), ERROR_CODES.ORG_NOT_FOUND.status);
    }

    // Check caller is owner or admin
    const [callerMembership] = await db
      .select({ role: orgMembers.role })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.userId, jwt.sub)))
      .limit(1);

    if (!callerMembership || (callerMembership.role !== 'owner' && callerMembership.role !== 'admin')) {
      return c.json(
        createApiError('FORBIDDEN', { message: 'Only owners and admins can add members' }),
        ERROR_CODES.FORBIDDEN.status,
      );
    }

    // Look up user by username
    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, body.username))
      .limit(1);

    if (!targetUser) {
      return c.json(
        createApiError('SKILL_NOT_FOUND', { message: `User "${body.username}" not found` }),
        404,
      );
    }

    // Check not already member
    const [existingMembership] = await db
      .select({ id: orgMembers.id })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.userId, targetUser.id)))
      .limit(1);

    if (existingMembership) {
      return c.json(createApiError('ORG_MEMBER_EXISTS'), ERROR_CODES.ORG_MEMBER_EXISTS.status);
    }

    // Only owners can add members with 'owner' role
    if (body.role === 'owner' && callerMembership.role !== 'owner') {
      return c.json(
        createApiError('FORBIDDEN', { message: 'Only owners can grant the owner role' }),
        ERROR_CODES.FORBIDDEN.status,
      );
    }

    await db.insert(orgMembers).values({
      orgId: org.id,
      userId: targetUser.id,
      role: body.role,
    });

    return c.json(
      { message: `Added ${body.username} to ${name} as ${body.role}` },
      201,
    );
  },
);

// ── PATCH /orgs/:name/members/:username — change role ──

orgsRoutes.patch('/orgs/:name/members/:username', authed, zValidator('json', UpdateMemberRoleSchema), async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const name = c.req.param('name');
  const username = c.req.param('username');
  const body = c.req.valid('json');

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);

  if (!org) {
    return c.json(createApiError('ORG_NOT_FOUND'), ERROR_CODES.ORG_NOT_FOUND.status);
  }

  // Check caller is owner or admin
  const [callerMembership] = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.userId, jwt.sub)))
    .limit(1);

  if (!callerMembership || (callerMembership.role !== 'owner' && callerMembership.role !== 'admin')) {
    return c.json(
      createApiError('FORBIDDEN', { message: 'Only owners and admins can change roles' }),
      ERROR_CODES.FORBIDDEN.status,
    );
  }

  // Only owners can set role to 'owner'
  if (body.role === 'owner' && callerMembership.role !== 'owner') {
    return c.json(
      createApiError('FORBIDDEN', { message: 'Only owners can grant the owner role' }),
      ERROR_CODES.FORBIDDEN.status,
    );
  }

  // Look up target user
  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!targetUser) {
    return c.json(
      createApiError('SKILL_NOT_FOUND', { message: `User "${username}" not found` }),
      404,
    );
  }

  // Check target is a member
  const [targetMembership] = await db
    .select({ id: orgMembers.id, role: orgMembers.role })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.userId, targetUser.id)))
    .limit(1);

  if (!targetMembership) {
    return c.json(
      createApiError('ORG_NOT_MEMBER', { message: `${username} is not a member of ${name}` }),
      ERROR_CODES.ORG_NOT_MEMBER.status,
    );
  }

  // Prevent demoting the last owner
  if (targetMembership.role === 'owner' && body.role !== 'owner') {
    const [ownerCount] = await db
      .select({ total: count() })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.role, 'owner')));

    if (ownerCount.total <= 1) {
      return c.json(createApiError('ORG_LAST_OWNER'), ERROR_CODES.ORG_LAST_OWNER.status);
    }
  }

  await db
    .update(orgMembers)
    .set({ role: body.role })
    .where(eq(orgMembers.id, targetMembership.id));

  return c.json({ message: `Changed ${username} role to ${body.role} in ${name}` });
});

// ── DELETE /orgs/:name/members/:username — remove member ──

orgsRoutes.delete('/orgs/:name/members/:username', authed, async (c) => {
  const db = c.get('db');
  const jwt = c.get('jwtPayload');
  const name = c.req.param('name');
  const username = c.req.param('username');

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);

  if (!org) {
    return c.json(createApiError('ORG_NOT_FOUND'), ERROR_CODES.ORG_NOT_FOUND.status);
  }

  // Look up target user
  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!targetUser) {
    return c.json(
      createApiError('SKILL_NOT_FOUND', { message: `User "${username}" not found` }),
      404,
    );
  }

  // Check target is a member
  const [targetMembership] = await db
    .select({ id: orgMembers.id, role: orgMembers.role })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.userId, targetUser.id)))
    .limit(1);

  if (!targetMembership) {
    return c.json(
      createApiError('ORG_NOT_MEMBER', { message: `${username} is not a member of ${name}` }),
      ERROR_CODES.ORG_NOT_MEMBER.status,
    );
  }

  const isSelfLeave = targetUser.id === jwt.sub;

  if (!isSelfLeave) {
    // Check caller is owner or admin
    const [callerMembership] = await db
      .select({ role: orgMembers.role })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.userId, jwt.sub)))
      .limit(1);

    if (!callerMembership || (callerMembership.role !== 'owner' && callerMembership.role !== 'admin')) {
      return c.json(
        createApiError('FORBIDDEN', { message: 'Only owners and admins can remove members' }),
        ERROR_CODES.FORBIDDEN.status,
      );
    }
  }

  // Prevent removing the last owner
  if (targetMembership.role === 'owner') {
    const [ownerCount] = await db
      .select({ total: count() })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.role, 'owner')));

    if (ownerCount.total <= 1) {
      return c.json(createApiError('ORG_LAST_OWNER'), ERROR_CODES.ORG_LAST_OWNER.status);
    }
  }

  await db.delete(orgMembers).where(eq(orgMembers.id, targetMembership.id));

  return c.json({
    message: isSelfLeave ? `Left ${name}` : `Removed ${username} from ${name}`,
  });
});

// ── GET /orgs/:name/skills — list org skills ──

orgsRoutes.get('/orgs/:name/skills', async (c) => {
  const db = c.get('db');
  const name = c.req.param('name');

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);

  if (!org) {
    return c.json(createApiError('ORG_NOT_FOUND'), ERROR_CODES.ORG_NOT_FOUND.status);
  }

  const orgSkills = await db
    .select({
      id: skills.id,
      name: skills.name,
      description: skills.description,
      categories: skills.categories,
      ratingAvg: skills.ratingAvg,
      ratingCount: skills.ratingCount,
      createdAt: skills.createdAt,
      updatedAt: skills.updatedAt,
    })
    .from(skills)
    .where(ilike(skills.name, `@${name}/%`));

  return c.json({
    skills: orgSkills.map((s) => ({
      name: s.name,
      description: s.description,
      categories: s.categories,
      rating_avg: s.ratingAvg,
      rating_count: s.ratingCount,
      created_at: s.createdAt.toISOString(),
      updated_at: s.updatedAt.toISOString(),
    })),
    total: orgSkills.length,
  });
});
