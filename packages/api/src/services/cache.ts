import type { Context } from 'hono';
import type { AppEnv } from '../types.js';

// Cloudflare Workers CacheStorage has a `default` property not present in the DOM type.
interface CloudflareCacheStorage {
  default: Cache;
  open(cacheName: string): Promise<Cache>;
}

/**
 * Safely access the Cloudflare `caches` global.
 * Returns undefined in Node/test environments where `caches` is not defined.
 */
const getCaches = (): CloudflareCacheStorage | undefined => {
  if (typeof globalThis !== 'undefined' && 'caches' in globalThis) {
    return (globalThis as unknown as { caches: CloudflareCacheStorage }).caches;
  }
  return undefined;
};

/** TTL presets per route type (in seconds) */
export const CACHE_TTLS = {
  search: 30,
  skillDetail: 60,
  categories: 300,
  trending: 300,
  status: 60,
} as const;

/**
 * Build a deterministic cache key URL from path and query string.
 */
export const buildCacheKey = (path: string, querystring?: string): string => {
  const base = `https://spm.dev/cache/${path.replace(/^\//, '')}`;
  return querystring ? `${base}?${querystring}` : base;
};

/**
 * Check Cloudflare Cache API first; on miss, call fetcher and cache the result.
 * Returns the cached or fresh Response.
 *
 * Note: caches.default is only available in the Cloudflare Workers runtime.
 * In tests, mock or skip accordingly.
 */
export const cachedResponse = async (
  c: Context<AppEnv>,
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<Response>,
): Promise<Response> => {
  // caches is a global in Workers runtime; undefined in Node/test
  const cfCaches = getCaches();
  if (!cfCaches) {
    return fetcher();
  }

  const cache = cfCaches.default;
  const cacheKey = new Request(key);

  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetcher();

  // Only cache successful responses
  if (response.ok) {
    const cloned = response.clone();
    const headers = new Headers(cloned.headers);
    headers.set('Cache-Control', `s-maxage=${ttlSeconds}`);

    const cacheable = new Response(cloned.body, {
      status: cloned.status,
      statusText: cloned.statusText,
      headers,
    });

    c.executionCtx.waitUntil(cache.put(cacheKey, cacheable));
  }

  return response;
};

/**
 * Purge a cached entry by key.
 * Called on mutations (publish, yank, update) to invalidate stale data.
 */
export const invalidateCache = async (key: string): Promise<boolean> => {
  const cfCaches = getCaches();
  if (!cfCaches) {
    return false;
  }

  const cache = cfCaches.default;
  return cache.delete(new Request(key));
};
