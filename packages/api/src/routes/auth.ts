import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { ERROR_CODES, createApiError } from '@spm/shared';
import { signJwt } from '../lib/jwt.js';
import { users } from '../db/schema.js';
import { skills } from '../db/schema.js';
import { versions } from '../db/schema.js';
import { authed } from '../middleware/auth.js';
import type { AppEnv } from '../types.js';

interface GitHubDeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface GitHubAccessTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
}

const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

export const authRoutes = new Hono<AppEnv>();

// POST /auth/device-code — initiate GitHub device flow
authRoutes.post('/auth/device-code', async (c) => {
  const res = await fetch(GITHUB_DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ client_id: c.env.GITHUB_CLIENT_ID }),
  });

  if (!res.ok) {
    return c.json(
      createApiError('INTERNAL_ERROR', {
        message: 'Failed to initiate device flow',
      }),
      ERROR_CODES.INTERNAL_ERROR.status,
    );
  }

  const data = (await res.json()) as GitHubDeviceCodeResponse;
  return c.json({
    device_code: data.device_code,
    user_code: data.user_code,
    verification_uri: data.verification_uri,
    expires_in: data.expires_in,
    interval: data.interval,
  });
});

// POST /auth/token — exchange device code for SPM token
authRoutes.post('/auth/token', async (c) => {
  const body = await c.req.json<{ device_code: string; grant_type: string }>();

  const res = await fetch(GITHUB_ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      device_code: body.device_code,
      grant_type: body.grant_type,
    }),
  });

  const tokenData = (await res.json()) as GitHubAccessTokenResponse;

  // Handle pending / expired states
  if (tokenData.error === 'authorization_pending') {
    return c.json({ error: 'authorization_pending' }, 428);
  }
  if (tokenData.error === 'expired_token') {
    return c.json({ error: 'expired_token' }, 410);
  }
  if (tokenData.error || !tokenData.access_token) {
    return c.json(
      createApiError('INTERNAL_ERROR', {
        message: tokenData.error_description ?? 'GitHub OAuth failed',
      }),
      ERROR_CODES.INTERNAL_ERROR.status,
    );
  }

  // Fetch GitHub user profile
  const ghUserRes = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/json',
      'User-Agent': 'spm-registry',
    },
  });

  if (!ghUserRes.ok) {
    return c.json(
      createApiError('INTERNAL_ERROR', {
        message: 'Failed to fetch GitHub user',
      }),
      ERROR_CODES.INTERNAL_ERROR.status,
    );
  }

  const ghUser = (await ghUserRes.json()) as GitHubUser;
  const db = c.get('db' as never) as AppEnv['Variables']['db'];

  // Upsert user — insert if new, update github info if existing
  const [user] = await db
    .insert(users)
    .values({
      username: ghUser.login,
      githubId: String(ghUser.id),
      githubLogin: ghUser.login,
      email: ghUser.email,
    })
    .onConflictDoUpdate({
      target: users.githubId,
      set: {
        githubLogin: ghUser.login,
        email: ghUser.email,
        updatedAt: new Date(),
      },
    })
    .returning();

  const token = await signJwt(
    { sub: user.id, username: user.username, role: user.role },
    c.env.JWT_SECRET,
  );

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      github_login: user.githubLogin,
      trust_tier: user.trustTier,
      created_at: user.createdAt.toISOString(),
    },
  });
});

// GET /auth/whoami — return current user profile
authRoutes.get('/auth/whoami', authed, async (c) => {
  const jwt = c.get('jwtPayload');
  const db = c.get('db' as never) as AppEnv['Variables']['db'];

  const [user] = await db.select().from(users).where(eq(users.id, jwt.sub)).limit(1);

  if (!user) {
    return c.json(
      createApiError('UNAUTHORIZED', { message: 'User not found' }),
      ERROR_CODES.UNAUTHORIZED.status,
    );
  }

  // Count published skills
  const [skillsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(skills)
    .where(eq(skills.ownerId, user.id));

  // Count total downloads across all user's skills
  const [downloadCount] = await db
    .select({ count: sql<number>`coalesce(sum(dl.ct), 0)::int` })
    .from(skills)
    .leftJoin(versions, eq(versions.skillId, skills.id))
    .leftJoin(
      sql`(select version_id, count(*)::int as ct from downloads group by version_id) dl`,
      sql`dl.version_id = ${versions.id}`,
    )
    .where(eq(skills.ownerId, user.id));

  return c.json({
    id: user.id,
    username: user.username,
    github_login: user.githubLogin,
    email: user.email,
    trust_tier: user.trustTier,
    role: user.role,
    skills_published: skillsCount?.count ?? 0,
    total_downloads: downloadCount?.count ?? 0,
    created_at: user.createdAt.toISOString(),
  });
});

// POST /auth/logout — stateless JWT, just return 204
authRoutes.post('/auth/logout', authed, async (c) => {
  return c.body(null, 204);
});
