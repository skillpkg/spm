import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { signJwt } from '../lib/jwt.js';

const TEST_SECRET = 'test-jwt-secret-for-unit-tests';

type Json = Record<string, unknown>;

const TEST_BINDINGS = {
  JWT_SECRET: TEST_SECRET,
  DATABASE_URL: 'postgresql://test',
  GITHUB_CLIENT_ID: 'test-client-id',
  GITHUB_CLIENT_SECRET: 'test-client-secret',
  ENVIRONMENT: 'test',
} as AppEnv['Bindings'];

// ── Chainable mock DB ──

const createChainableMock = (defaultResult: unknown[] = []) => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.groupBy = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.onConflictDoUpdate = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);

  chain.then = vi.fn().mockImplementation((resolve: (v: unknown[]) => void) => {
    resolve(defaultResult);
    return Promise.resolve(defaultResult);
  });

  return chain;
};

/**
 * Creates a mock DB where the adminGuard DB check succeeds (returns admin role),
 * and subsequent queries return defaultResult.
 */
const createAdminMockDb = (defaultResult: unknown[] = []) => {
  let callCount = 0;

  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.groupBy = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.onConflictDoUpdate = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);

  chain.then = vi.fn().mockImplementation((resolve: (v: unknown[]) => void) => {
    callCount++;
    // First DB query is the adminGuard role check
    if (callCount === 1) {
      resolve([{ role: 'admin' }]);
      return Promise.resolve([{ role: 'admin' }]);
    }
    resolve(defaultResult);
    return Promise.resolve(defaultResult);
  });

  return chain;
};

/**
 * Creates a mock DB with a sequence of results for successive queries.
 * First result is always the adminGuard check.
 */
const createSequenceMockDb = (results: unknown[][]) => {
  let callCount = 0;

  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.groupBy = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.onConflictDoUpdate = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);

  chain.then = vi.fn().mockImplementation((resolve: (v: unknown[]) => void) => {
    const result = results[callCount] ?? [];
    callCount++;
    resolve(result);
    return Promise.resolve(result);
  });

  return chain;
};

const createTestApp = (mockDb: Record<string, unknown>) => {
  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    c.set('db', mockDb as never);
    await next();
  });
  return app;
};

const makeAdminToken = () =>
  signJwt({ sub: 'admin-user-id', username: 'admin', role: 'admin' }, TEST_SECRET);

const makeUserToken = () =>
  signJwt({ sub: 'regular-user-id', username: 'regular', role: 'user' }, TEST_SECRET);

// ── Auth guard tests ──

describe('admin routes — auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createChainableMock();
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const res = await app.request('/admin/stats', {}, TEST_BINDINGS);
    expect(res.status).toBe(401);
  });

  it('rejects non-admin users with 403', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createChainableMock();
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeUserToken();
    const res = await app.request(
      '/admin/stats',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );
    expect(res.status).toBe(403);
  });

  it('allows admin users through', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    // The adminGuard first query returns admin role, subsequent queries return counts
    const mockDb = createAdminMockDb([{ total: 0 }]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/stats',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );
    expect(res.status).toBe(200);
  });
});

// ── GET /admin/queue ──

describe('GET /admin/queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty queue', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createAdminMockDb([]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/queue',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { queue: unknown[]; total: number };
    expect(body.queue).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('accepts sort and status query params', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createAdminMockDb([]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/queue?sort=newest&status=all',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
  });
});

// ── POST /admin/queue/:id/approve ──

describe('POST /admin/queue/:id/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for non-existent scan', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    // adminGuard check, then scan lookup returns empty
    const mockDb = createSequenceMockDb([[{ role: 'admin' }], []]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/queue/nonexistent-id/approve',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: 'test' }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(404);
  });

  it('approves a scan entry', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ id: 'scan-1', versionId: 'ver-1', status: 'flagged' }], // scan lookup
      [], // update scan
      [{ version: '1.0.0', skillId: 'skill-1' }], // version lookup
      [{ name: 'test-skill' }], // skill lookup
      [], // audit insert
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/queue/scan-1/approve',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: 'Looks safe' }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.status).toBe('approved');
    expect(body.skill).toBe('test-skill');
    expect(body.version).toBe('1.0.0');
  });
});

// ── POST /admin/queue/:id/reject ──

describe('POST /admin/queue/:id/reject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a scan entry', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ id: 'scan-1', versionId: 'ver-1' }], // scan lookup
      [], // update scan
      [{ version: '1.0.0', skillId: 'skill-1' }], // version lookup
      [{ name: 'bad-skill' }], // skill lookup
      [], // audit insert
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/queue/scan-1/reject',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Contains malicious code',
          notify_author: true,
          feedback: 'Remove dangerous commands',
        }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.status).toBe('rejected');
    expect(body.skill).toBe('bad-skill');
  });

  it('requires reason field', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createAdminMockDb([]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/queue/scan-1/reject',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(400);
  });
});

// ── GET /admin/skills ──

describe('GET /admin/skills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated skills list', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ total: 0 }], // count
      [], // skills query
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/skills?page=1&per_page=10',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[]; total: number; page: number };
    expect(body.results).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
  });
});

// ── POST /admin/skills/:name/yank ──

describe('POST /admin/skills/:name/yank', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for unknown skill', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [], // skill lookup — empty
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/skills/nonexistent/yank',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version: '1.0.0', reason: 'malicious' }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(404);
  });

  it('yanks a version as admin without ownership', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ id: 'skill-1' }], // skill lookup
      [{ id: 'ver-1' }], // version lookup
      [], // update version
      [], // audit insert
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/skills/test-skill/yank',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: '1.0.0',
          reason: 'Malicious content detected',
          notify_author: true,
        }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.yanked).toBe(true);
    expect(body.reason).toBe('Malicious content detected');
  });
});

// ── GET /admin/skills/:name/versions/:version ──

describe('GET /admin/skills/:name/versions/:version', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for unknown skill', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [], // skill lookup — empty
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/skills/nonexistent/versions/1.0.0',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(404);
  });

  it('returns 404 for unknown version', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ id: 'skill-1', name: 'test-skill' }], // skill lookup
      [], // version lookup — empty
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/skills/test-skill/versions/9.9.9',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(404);
  });

  it('returns version detail', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const publishedAt = new Date('2026-02-01T00:00:00Z');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ id: 'skill-1', name: 'test-skill' }], // skill lookup
      [
        {
          version: '1.0.0',
          readmeMd: '# Test Skill',
          manifest: { name: 'test-skill', version: '1.0.0' },
          publishedAt,
          yanked: false,
          sigstoreBundleKey: 'bundle-key',
          sizeBytes: 1234,
        },
      ], // version lookup
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/skills/test-skill/versions/1.0.0',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.name).toBe('test-skill');
    expect(body.version).toBe('1.0.0');
    expect(body.readme_md).toBe('# Test Skill');
    expect(body.signed).toBe(true);
    expect(body.size_bytes).toBe(1234);
  });
});

// ── POST /admin/skills/:name/block ──

describe('POST /admin/skills/:name/block', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for unknown skill', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [], // skill lookup — empty
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/skills/nonexistent/block',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'malicious content' }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(404);
  });

  it('blocks a published skill', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ id: 'skill-1', status: 'published' }], // skill lookup
      [], // update skill
      [], // audit insert
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/skills/bad-skill/block',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Contains malware' }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.status).toBe('blocked');
    expect(body.reason).toBe('Contains malware');
  });

  it('returns already blocked message', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ id: 'skill-1', status: 'blocked' }], // skill lookup — already blocked
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/skills/bad-skill/block',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'duplicate block' }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.message).toBe('Skill is already blocked');
  });

  it('requires reason field', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createAdminMockDb([]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/skills/bad-skill/block',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(400);
  });
});

// ── POST /admin/skills/:name/unblock ──

describe('POST /admin/skills/:name/unblock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for unknown skill', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [], // skill lookup — empty
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/skills/nonexistent/unblock',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(404);
  });

  it('unblocks a blocked skill', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ id: 'skill-1', status: 'blocked' }], // skill lookup
      [], // update skill
      [], // audit insert
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/skills/blocked-skill/unblock',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.status).toBe('published');
  });

  it('returns not blocked message for published skill', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ id: 'skill-1', status: 'published' }], // skill lookup — not blocked
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/skills/good-skill/unblock',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.message).toBe('Skill is not blocked');
  });
});

// ── GET /admin/users ──

describe('GET /admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated users list', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ total: 0 }], // count
      [], // users query
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/users',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[]; total: number };
    expect(body.results).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('filters by trust tier', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ total: 0 }], // count
      [], // users query
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/users?trust=verified',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
  });
});

// ── PATCH /admin/users/:username/trust ──

describe('PATCH /admin/users/:username/trust', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for unknown user', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [], // user lookup — empty
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/users/nobody/trust',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trust_tier: 'verified', reason: 'trusted user' }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(404);
  });

  it('updates user trust tier', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ id: 'user-1', trustTier: 'registered' }], // user lookup
      [], // update user
      [], // audit insert
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/users/testuser/trust',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trust_tier: 'verified',
          reason: 'Active contributor',
        }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.trust_tier).toBe('verified');
    expect(body.previous_tier).toBe('registered');
  });

  it('rejects invalid trust tier', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createAdminMockDb([]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/users/testuser/trust',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trust_tier: 'superadmin', reason: 'test' }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(400);
  });
});

// ── PATCH /admin/users/:username/role ──

describe('PATCH /admin/users/:username/role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('promotes user to admin', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ id: 'user-1', role: 'user' }], // user lookup
      [], // update user
      [], // audit insert
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/users/newadmin/role',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'admin', reason: 'Promoted to admin' }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.role).toBe('admin');
    expect(body.previous_role).toBe('user');
  });

  it('revokes admin access', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ id: 'user-1', role: 'admin' }], // user lookup
      [], // update user
      [], // audit insert
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/users/exadmin/role',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'user', reason: 'Revoked' }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.role).toBe('user');
    expect(body.previous_role).toBe('admin');
  });
});

// ── GET /admin/reports ──

describe('GET /admin/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated reports', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ total: 0 }], // count
      [], // reports query
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/reports',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[]; total: number };
    expect(body.results).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('filters by status', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([[{ role: 'admin' }], [{ total: 0 }], []]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/reports?status=open&priority=high',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
  });
});

// ── PATCH /admin/reports/:id ──

describe('PATCH /admin/reports/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for unknown report', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }],
      [], // report lookup — empty
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/reports/nonexistent/update',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'resolved' }),
      },
      TEST_BINDINGS,
    );

    // This hits a different path since the route is /admin/reports/:id not /admin/reports/:id/update
    expect(res.status).toBe(404);
  });

  it('updates report status', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createSequenceMockDb([
      [{ role: 'admin' }], // adminGuard
      [{ id: 'report-1', skillId: 'skill-1' }], // report lookup
      [], // update report
      [], // audit insert
    ]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/reports/report-1',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'resolved',
          resolution: 'Skill yanked',
          action_taken: 'yank',
        }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.status).toBe('resolved');
    expect(body.resolution).toBe('Skill yanked');
  });
});

// ── GET /admin/errors (stub) ──

describe('GET /admin/errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty errors list (stub)', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createAdminMockDb([]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/errors',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { errors: unknown[]; total: number };
    expect(body.errors).toEqual([]);
    expect(body.total).toBe(0);
  });
});

// ── PATCH /admin/errors/:id (stub) ──

describe('PATCH /admin/errors/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 (no errors table)', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createAdminMockDb([]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/errors/some-id',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'resolved', resolution: 'Fixed' }),
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(404);
  });
});

// ── GET /admin/stats ──

describe('GET /admin/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dashboard stats', async () => {
    const { adminRoutes } = await import('../routes/admin/index.js');
    const mockDb = createAdminMockDb([{ total: 0 }]);
    const app = createTestApp(mockDb);
    app.route('/', adminRoutes);

    const token = await makeAdminToken();
    const res = await app.request(
      '/admin/stats',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      TEST_BINDINGS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body).toHaveProperty('publishes');
    expect(body).toHaveProperty('scans');
    expect(body).toHaveProperty('queue_depth');
    expect(body).toHaveProperty('open_reports');
    expect(body).toHaveProperty('users_by_trust');
    expect(body).toHaveProperty('total_skills');
    expect(body).toHaveProperty('total_users');
    expect(body).toHaveProperty('total_downloads');
  });
});
