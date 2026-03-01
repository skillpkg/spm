import type { Context, Next } from 'hono';
import { ERROR_CODES, createApiError } from '@spm/shared';
import type { AppEnv } from '../types.js';

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  limit: number;
  /** Window size in seconds */
  window: number;
}

export const createRateLimiter = (config: RateLimitConfig) => {
  return async (c: Context<AppEnv>, next: Next) => {
    const kv = c.env.RATE_LIMIT_KV;
    const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'unknown';
    const path = c.req.routePath ?? c.req.path;
    const key = `rate:${ip}:${path}`;

    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % config.window);
    const windowKey = `${key}:${windowStart}`;

    const current = await kv.get(windowKey);
    const count = current ? parseInt(current, 10) : 0;

    const remaining = Math.max(0, config.limit - count - 1);
    const reset = windowStart + config.window;

    c.header('X-RateLimit-Limit', String(config.limit));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(reset));

    if (count >= config.limit) {
      c.header('Retry-After', String(reset - now));
      const apiError = createApiError('RATE_LIMITED', {
        suggestion: `Rate limit exceeded. Try again in ${reset - now} seconds.`,
      });
      return c.json(apiError, ERROR_CODES.RATE_LIMITED.status);
    }

    await kv.put(windowKey, String(count + 1), {
      expirationTtl: config.window,
    });

    await next();
  };
};

// Pre-configured rate limiters per the spec
export const searchRateLimit = createRateLimiter({ limit: 100, window: 60 });
export const downloadRateLimit = createRateLimiter({ limit: 60, window: 60 });
export const publishRateLimit = createRateLimiter({ limit: 10, window: 3600 });
export const authRateLimit = createRateLimiter({ limit: 20, window: 60 });
export const adminRateLimit = createRateLimiter({ limit: 120, window: 60 });
export const defaultGetRateLimit = createRateLimiter({ limit: 200, window: 60 });
