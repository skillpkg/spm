import { createMiddleware } from 'hono/factory';
import { eq } from 'drizzle-orm';
import { ERROR_CODES, createApiError } from '@spm/shared';
import { verifyJwt } from '../lib/jwt.js';
import { users } from '../db/schema.js';
import type { AppEnv } from '../types.js';

/**
 * Requires a valid Bearer token. Sets `jwtPayload` on context.
 */
export const authed = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json(createApiError('UNAUTHORIZED'), ERROR_CODES.UNAUTHORIZED.status);
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = await verifyJwt(token, c.env.JWT_SECRET);
    c.set('jwtPayload', payload);
  } catch {
    return c.json(
      createApiError('UNAUTHORIZED', { message: 'Invalid or expired token' }),
      ERROR_CODES.UNAUTHORIZED.status,
    );
  }

  await next();
});

/**
 * Like `authed` but doesn't reject — sets jwtPayload if a valid token is present.
 */
export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length);
    try {
      const payload = await verifyJwt(token, c.env.JWT_SECRET);
      c.set('jwtPayload', payload);
    } catch {
      // Invalid token — continue without auth
    }
  }

  await next();
});

/**
 * Must run AFTER `authed`. Defense-in-depth admin check:
 * validates both the JWT claim AND the current DB role.
 */
export const adminGuard = createMiddleware<AppEnv>(async (c, next) => {
  const jwt = c.get('jwtPayload');

  if (jwt.role !== 'admin') {
    return c.json(createApiError('FORBIDDEN'), ERROR_CODES.FORBIDDEN.status);
  }

  // Double-check against DB (catches revoked admins / stale JWTs)
  const db = c.get('db' as never) as AppEnv['Variables']['db'];
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, jwt.sub))
    .limit(1);

  if (!user || user.role !== 'admin') {
    console.warn(
      `[admin-guard] JWT claims admin but DB says "${user?.role ?? 'not found'}" for user ${jwt.sub}`,
    );
    return c.json(
      createApiError('FORBIDDEN', {
        message: 'Admin privileges have been revoked',
      }),
      ERROR_CODES.FORBIDDEN.status,
    );
  }

  await next();
});
