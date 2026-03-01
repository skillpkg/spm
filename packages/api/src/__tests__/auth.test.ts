import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { signJwt, verifyJwt } from '../lib/jwt.js';
import { authed, optionalAuth, adminGuard } from '../middleware/auth.js';
import type { AppEnv } from '../types.js';

const TEST_SECRET = 'test-jwt-secret-for-unit-tests';

type Json = Record<string, unknown>;

// ── JWT sign / verify ──────────────────────────────────────────

describe('JWT helpers', () => {
  it('sign and verify round-trip', async () => {
    const payload = { sub: 'user-123', username: 'alice', role: 'user' };
    const token = await signJwt(payload, TEST_SECRET);

    expect(token.startsWith('spm_')).toBe(true);

    const decoded = await verifyJwt(token, TEST_SECRET);
    expect(decoded.sub).toBe('user-123');
    expect(decoded.username).toBe('alice');
    expect(decoded.role).toBe('user');
    expect(typeof decoded.iat).toBe('number');
    expect(typeof decoded.exp).toBe('number');
  });

  it('token has spm_ prefix', async () => {
    const token = await signJwt({ sub: 'u1', username: 'bob', role: 'user' }, TEST_SECRET);
    expect(token.startsWith('spm_')).toBe(true);
    // Strip prefix and ensure the raw JWT has 3 dot-separated parts
    const raw = token.slice(4);
    expect(raw.split('.').length).toBe(3);
  });

  it('verifyJwt strips spm_ prefix automatically', async () => {
    const token = await signJwt({ sub: 'u2', username: 'carol', role: 'admin' }, TEST_SECRET);
    const decoded = await verifyJwt(token, TEST_SECRET);
    expect(decoded.username).toBe('carol');
  });

  it('verifyJwt works with raw JWT (no prefix)', async () => {
    const token = await signJwt({ sub: 'u3', username: 'dave', role: 'user' }, TEST_SECRET);
    const raw = token.slice(4);
    const decoded = await verifyJwt(raw, TEST_SECRET);
    expect(decoded.username).toBe('dave');
  });

  it('verifyJwt rejects tampered token', async () => {
    const token = await signJwt({ sub: 'u4', username: 'eve', role: 'user' }, TEST_SECRET);
    const tampered = token.slice(0, -5) + 'XXXXX';
    await expect(verifyJwt(tampered, TEST_SECRET)).rejects.toThrow();
  });

  it('verifyJwt rejects token signed with wrong secret', async () => {
    const token = await signJwt({ sub: 'u5', username: 'frank', role: 'user' }, TEST_SECRET);
    await expect(verifyJwt(token, 'wrong-secret')).rejects.toThrow();
  });
});

// ── Middleware test helpers ─────────────────────────────────────

const TEST_BINDINGS = {
  JWT_SECRET: TEST_SECRET,
  DATABASE_URL: 'postgresql://test',
  GITHUB_CLIENT_ID: 'test-client-id',
  GITHUB_CLIENT_SECRET: 'test-client-secret',
  ENVIRONMENT: 'test',
} as AppEnv['Bindings'];

const createTestApp = () => new Hono<AppEnv>();

/** Helper to make a request with test env bindings injected */
const testRequest = (app: Hono<AppEnv>, path: string, init?: RequestInit) =>
  app.request(path, init, TEST_BINDINGS);

// ── authed middleware ──────────────────────────────────────────

describe('authed middleware', () => {
  it('rejects request with no Authorization header', async () => {
    const app = createTestApp();
    app.use('/protected', authed);
    app.get('/protected', (c) => c.json({ ok: true }));

    const res = await testRequest(app, '/protected');
    expect(res.status).toBe(401);
    const body = (await res.json()) as Json;
    expect(body.error).toBe('unauthorized');
  });

  it('rejects request with non-Bearer token', async () => {
    const app = createTestApp();
    app.use('/protected', authed);
    app.get('/protected', (c) => c.json({ ok: true }));

    const res = await testRequest(app, '/protected', {
      headers: { Authorization: 'Basic abc123' },
    });
    expect(res.status).toBe(401);
  });

  it('rejects request with invalid JWT', async () => {
    const app = createTestApp();
    app.use('/protected', authed);
    app.get('/protected', (c) => c.json({ ok: true }));

    const res = await testRequest(app, '/protected', {
      headers: { Authorization: 'Bearer spm_invalid.jwt.token' },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as Json;
    expect(body.message).toBe('Invalid or expired token');
  });

  it('accepts valid token and sets jwtPayload', async () => {
    const app = createTestApp();
    app.use('/protected', authed);
    app.get('/protected', (c) => {
      const payload = c.get('jwtPayload');
      return c.json({
        sub: payload.sub,
        username: payload.username,
        role: payload.role,
      });
    });

    const token = await signJwt(
      { sub: 'user-abc', username: 'testuser', role: 'user' },
      TEST_SECRET,
    );

    const res = await testRequest(app, '/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.sub).toBe('user-abc');
    expect(body.username).toBe('testuser');
    expect(body.role).toBe('user');
  });
});

// ── optionalAuth middleware ────────────────────────────────────

describe('optionalAuth middleware', () => {
  it('continues without auth when no header present', async () => {
    const app = createTestApp();
    app.use('/public', optionalAuth);
    app.get('/public', (c) => {
      const payload = c.get('jwtPayload');
      return c.json({ hasAuth: !!payload });
    });

    const res = await testRequest(app, '/public');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.hasAuth).toBe(false);
  });

  it('sets jwtPayload when valid token present', async () => {
    const app = createTestApp();
    app.use('/public', optionalAuth);
    app.get('/public', (c) => {
      const payload = c.get('jwtPayload');
      return c.json({ hasAuth: !!payload, username: payload?.username });
    });

    const token = await signJwt(
      { sub: 'u-opt', username: 'optional-user', role: 'user' },
      TEST_SECRET,
    );

    const res = await testRequest(app, '/public', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.hasAuth).toBe(true);
    expect(body.username).toBe('optional-user');
  });

  it('continues without auth when token is invalid', async () => {
    const app = createTestApp();
    app.use('/public', optionalAuth);
    app.get('/public', (c) => {
      const payload = c.get('jwtPayload');
      return c.json({ hasAuth: !!payload });
    });

    const res = await testRequest(app, '/public', {
      headers: { Authorization: 'Bearer spm_garbage.token.here' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.hasAuth).toBe(false);
  });
});

// ── adminGuard middleware ──────────────────────────────────────

describe('adminGuard middleware', () => {
  it('rejects non-admin JWT', async () => {
    const app = createTestApp();
    app.use('/admin', authed, adminGuard);
    app.get('/admin', (c) => c.json({ ok: true }));

    const token = await signJwt(
      { sub: 'user-nonadmin', username: 'regular', role: 'user' },
      TEST_SECRET,
    );

    const res = await testRequest(app, '/admin', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as Json;
    expect(body.error).toBe('forbidden');
  });
});
