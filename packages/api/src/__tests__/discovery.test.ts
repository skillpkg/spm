import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

// ── Shared mock helpers ──

const createChainableMock = () => {
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

  // Make the chain thenable so await resolves to an empty array by default
  chain.then = vi.fn().mockImplementation((resolve: (v: unknown[]) => void) => {
    resolve([]);
    return Promise.resolve([]);
  });

  return chain;
};

// ── Trending routes ──

describe('trending routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /trending should return expected structure with tab and skills array', async () => {
    const { trendingRoutes } = await import('../routes/trending.js');
    const chain = createChainableMock();

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', chain as never);
      await next();
    });
    app.route('/', trendingRoutes);

    const res = await app.request('/trending?tab=new&limit=5');
    const body = (await res.json()) as { tab: string; skills: unknown[] };

    expect(res.status).toBe(200);
    expect(body.tab).toBe('new');
    expect(Array.isArray(body.skills)).toBe(true);
  });

  it('GET /trending should default to featured tab', async () => {
    const { trendingRoutes } = await import('../routes/trending.js');
    const chain = createChainableMock();

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', chain as never);
      await next();
    });
    app.route('/', trendingRoutes);

    const res = await app.request('/trending');
    const body = (await res.json()) as { tab: string; skills: unknown[] };

    expect(res.status).toBe(200);
    expect(body.tab).toBe('featured');
  });

  it('GET /trending should reject invalid tab', async () => {
    const { trendingRoutes } = await import('../routes/trending.js');
    const chain = createChainableMock();

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', chain as never);
      await next();
    });
    app.route('/', trendingRoutes);

    const res = await app.request('/trending?tab=invalid');
    expect(res.status).toBe(400);
  });
});

// ── Resolve routes ──

describe('resolve routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /resolve should return resolved and unresolved arrays', async () => {
    const { resolveRoutes } = await import('../routes/resolve.js');
    const chain = createChainableMock();

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', chain as never);
      await next();
    });
    app.route('/', resolveRoutes);

    const res = await app.request('/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skills: [{ name: 'nonexistent-skill', range: '^1.0.0' }],
      }),
    });
    const body = (await res.json()) as { resolved: unknown[]; unresolved: unknown[] };

    expect(res.status).toBe(200);
    expect(Array.isArray(body.resolved)).toBe(true);
    expect(Array.isArray(body.unresolved)).toBe(true);
    // Nonexistent skill should be in unresolved
    expect(body.unresolved.length).toBe(1);
  });

  it('POST /resolve should reject invalid body', async () => {
    const { resolveRoutes } = await import('../routes/resolve.js');
    const chain = createChainableMock();

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', chain as never);
      await next();
    });
    app.route('/', resolveRoutes);

    const res = await app.request('/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: true }),
    });

    expect(res.status).toBe(400);
  });
});

// ── Reviews routes ──

describe('reviews routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /skills/:name/reviews should return 404 for nonexistent skill', async () => {
    const { reviewsRoutes } = await import('../routes/reviews.js');
    const chain = createChainableMock();

    // Skill lookup returns empty
    chain.limit.mockResolvedValueOnce([]);

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', chain as never);
      await next();
    });
    app.route('/', reviewsRoutes);

    const res = await app.request('/skills/nonexistent/reviews');
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(404);
    expect(body.error).toBe('skill_not_found');
  });

  it('POST /skills/:name/reviews should return 401 without auth', async () => {
    const { reviewsRoutes } = await import('../routes/reviews.js');

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', {} as never);
      await next();
    });
    app.route('/', reviewsRoutes);

    const res = await app.request('/skills/my-skill/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5, comment: 'Great skill!' }),
    });

    expect(res.status).toBe(401);
  });

  it('POST /skills/:name/reviews should reject invalid rating via validation schema', async () => {
    const { ReviewRequestSchema } = await import('@spm/shared');

    const result = ReviewRequestSchema.safeParse({ rating: 10 });
    expect(result.success).toBe(false);

    const valid = ReviewRequestSchema.safeParse({ rating: 5 });
    expect(valid.success).toBe(true);

    const tooLow = ReviewRequestSchema.safeParse({ rating: 0 });
    expect(tooLow.success).toBe(false);
  });
});

// ── Authors routes ──

describe('authors routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /authors/:username should return 404 for nonexistent author', async () => {
    const { authorsRoutes } = await import('../routes/authors.js');
    const chain = createChainableMock();

    // User lookup returns empty
    chain.limit.mockResolvedValueOnce([]);

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', chain as never);
      await next();
    });
    app.route('/', authorsRoutes);

    const res = await app.request('/authors/nonexistent');
    const _body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(404);
  });

  it('GET /authors/:username/stats should return 401 without auth', async () => {
    const { authorsRoutes } = await import('../routes/authors.js');

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', {} as never);
      await next();
    });
    app.route('/', authorsRoutes);

    const res = await app.request('/authors/someone/stats');
    expect(res.status).toBe(401);
  });
});

// ── Reports routes ──

describe('reports routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /skills/:name/report should return 404 for nonexistent skill', async () => {
    const { reportsRoutes } = await import('../routes/reports.js');
    const chain = createChainableMock();

    // Skill lookup returns empty
    chain.limit.mockResolvedValueOnce([]);

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', chain as never);
      await next();
    });
    app.route('/', reportsRoutes);

    const res = await app.request('/skills/nonexistent/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'This skill contains malicious code that reads credentials',
        priority: 'high',
      }),
    });
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(404);
    expect(body.error).toBe('skill_not_found');
  });

  it('POST /skills/:name/report should reject short reason', async () => {
    const { reportsRoutes } = await import('../routes/reports.js');
    const chain = createChainableMock();

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', chain as never);
      await next();
    });
    app.route('/', reportsRoutes);

    const res = await app.request('/skills/some-skill/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'bad', priority: 'low' }),
    });

    // Should be 400 — reason too short (min 10)
    expect(res.status).toBe(400);
  });

  it('POST /skills/:name/report should work without auth (anonymous)', async () => {
    const { reportsRoutes } = await import('../routes/reports.js');
    const chain = createChainableMock();

    // Skill lookup returns a skill
    chain.limit.mockResolvedValueOnce([{ id: 'skill-1' }]);
    // Insert returns the new report
    chain.returning.mockResolvedValueOnce([
      { id: 'report-1', createdAt: new Date('2026-03-01T00:00:00Z') },
    ]);

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', chain as never);
      await next();
    });
    app.route('/', reportsRoutes);

    const res = await app.request('/skills/some-skill/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'This skill reads clipboard contents without user consent',
        priority: 'high',
      }),
    });
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(201);
    expect(body.id).toBe('report-1');
    expect(body.skill).toBe('some-skill');
    expect(body.status).toBe('open');
  });
});
