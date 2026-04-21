import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { signJwt } from '../lib/jwt.js';

/**
 * Publish flow tests — POST /skills
 *
 * Tests auth, manifest validation, private skill rules, and name validation.
 */

const TEST_SECRET = 'test-secret-for-publish-tests';

const TEST_ENV = {
  JWT_SECRET: TEST_SECRET,
  DATABASE_URL: '',
  GITHUB_CLIENT_ID: '',
  GITHUB_CLIENT_SECRET: '',
  ENVIRONMENT: 'test',
  R2_BUCKET: {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
  },
  RATE_LIMIT_KV: {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
  },
};

const getTestToken = async () =>
  signJwt({ sub: 'user-123', username: 'testuser', role: 'user' }, TEST_SECRET);

// Helper: build multipart FormData for publish
const buildPublishFormData = (manifest: Record<string, unknown>) => {
  const formData = new FormData();
  formData.append(
    'package',
    new File([new ArrayBuffer(100)], 'test.skl', { type: 'application/gzip' }),
  );
  formData.append('manifest', JSON.stringify(manifest));
  return formData;
};

// Mock DB that returns empty arrays for all chained queries.
// The chain object is also a thenable so `await db.select().from()` resolves to [].
const createMockDb = () => {
  const mockChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {};
    // Make chainable — each method returns a new chain (also thenable)
    const self = () => {
      const c = mockChain();
      return c;
    };
    chain.from = vi.fn().mockImplementation(self);
    chain.where = vi.fn().mockImplementation(self);
    chain.limit = vi.fn().mockResolvedValue([]);
    chain.set = vi.fn().mockImplementation(self);
    chain.values = vi.fn().mockImplementation(self);
    chain.returning = vi.fn().mockResolvedValue([]);
    chain.onConflictDoUpdate = vi.fn().mockImplementation(self);
    chain.onConflictDoNothing = vi.fn().mockImplementation(self);
    chain.orderBy = vi.fn().mockImplementation(self);
    chain.groupBy = vi.fn().mockImplementation(self);
    chain.leftJoin = vi.fn().mockImplementation(self);
    chain.innerJoin = vi.fn().mockImplementation(self);
    // Make the chain thenable so `await chain` resolves to []
    chain.then = (resolve: (v: unknown[]) => void) => Promise.resolve([]).then(resolve);
    return chain;
  };

  return {
    select: vi.fn().mockImplementation(() => mockChain()),
    insert: vi.fn().mockImplementation(() => mockChain()),
    update: vi.fn().mockImplementation(() => mockChain()),
    delete: vi.fn().mockImplementation(() => mockChain()),
  };
};

const createTestApp = async () => {
  const { skillsRoutes } = await import('../routes/skills.js');

  const db = createMockDb();
  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    c.set('db', db as never);
    await next();
  });
  app.route('/', skillsRoutes);

  return { app, db };
};

// Helper to make requests with env
const req = (app: Hono<AppEnv>, path: string, init: RequestInit) =>
  app.request(path, init, TEST_ENV as never);

describe('POST /skills (publish) — auth', () => {
  it('should return 401 without auth token', async () => {
    const { app } = await createTestApp();

    const formData = buildPublishFormData({
      name: 'test-skill',
      version: '1.0.0',
      description: 'A test skill for automated testing of the publish flow',
      categories: ['code-quality'],
    });

    const res = await req(app, '/skills', { method: 'POST', body: formData });
    expect(res.status).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    const { app } = await createTestApp();

    const formData = buildPublishFormData({
      name: 'test-skill',
      version: '1.0.0',
      description: 'A test skill for automated testing of the publish flow',
      categories: ['code-quality'],
    });

    const res = await req(app, '/skills', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid-token' },
      body: formData,
    });

    expect(res.status).toBe(401);
  });
});

describe('POST /skills (publish) — manifest validation', () => {
  it('should reject missing manifest field', async () => {
    const { app } = await createTestApp();
    const token = await getTestToken();

    const formData = new FormData();
    formData.append('package', new File([new ArrayBuffer(10)], 'test.skl'));

    const res = await req(app, '/skills', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const body = (await res.json()) as { message?: string };
    expect(body.message).toMatch(/manifest/i);
  });

  it('should reject missing package field', async () => {
    const { app } = await createTestApp();
    const token = await getTestToken();

    const formData = new FormData();
    formData.append('manifest', JSON.stringify({ name: 'test-skill', version: '1.0.0' }));

    const res = await req(app, '/skills', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('should reject invalid JSON in manifest', async () => {
    const { app } = await createTestApp();
    const token = await getTestToken();

    const formData = new FormData();
    formData.append('package', new File([new ArrayBuffer(10)], 'test.skl'));
    formData.append('manifest', '{invalid json!!!');

    const res = await req(app, '/skills', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    const body = (await res.json()) as { message?: string };
    expect(body.message).toMatch(/json/i);
  });

  it('should reject manifest missing required fields', async () => {
    const { app } = await createTestApp();
    const token = await getTestToken();

    const formData = buildPublishFormData({
      name: 'test-skill',
      // Missing version, description, categories
    });

    const res = await req(app, '/skills', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe('POST /skills (publish) — name validation', () => {
  it('should reject invalid skill names', async () => {
    const { app } = await createTestApp();
    const token = await getTestToken();

    const formData = buildPublishFormData({
      name: 'INVALID_NAME!',
      version: '1.0.0',
      description: 'A skill with an invalid name for testing name validation rules',
      categories: ['code-quality'],
    });

    const res = await req(app, '/skills', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    // Zod will reject the name since it doesn't match the schema pattern
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('should reject reserved skill names', async () => {
    const { app } = await createTestApp();
    const token = await getTestToken();

    const formData = buildPublishFormData({
      name: 'admin',
      version: '1.0.0',
      description: 'Trying to publish a skill with a reserved name for testing validation',
      categories: ['code-quality'],
    });

    const res = await req(app, '/skills', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe('POST /skills (publish) — private skill validation', () => {
  it('should reject private skills without org scope', async () => {
    const { app } = await createTestApp();
    const token = await getTestToken();

    const formData = buildPublishFormData({
      name: 'my-private-skill',
      version: '1.0.0',
      description: 'A private skill without org scope should be rejected by the publish API',
      categories: ['code-quality'],
      private: true,
    });

    const res = await req(app, '/skills', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const body = (await res.json()) as { message?: string };
    expect(body.message).toMatch(/org|scope|private/i);
  });

  it('should reject private skills with user scope (not org)', async () => {
    const { app } = await createTestApp();
    const token = await getTestToken();

    const formData = buildPublishFormData({
      name: '@testuser/my-skill', // matches jwt.username
      version: '1.0.0',
      description: 'A private skill under user scope should be rejected by the publish API',
      categories: ['code-quality'],
      private: true,
    });

    const res = await req(app, '/skills', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const body = (await res.json()) as { message?: string };
    expect(body.message).toMatch(/org|scope|private/i);
  });
});
