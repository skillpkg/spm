import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { healthRoutes } from '../routes/health.js';

const mockExecute = vi.fn();
const mockSelectFrom = vi.fn();

const createMockDb = () => ({
  execute: mockExecute,
  select: vi.fn().mockReturnValue({
    from: mockSelectFrom,
  }),
});

const createApp = () => {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('db', createMockDb() as never);
    await next();
  });

  app.route('/', healthRoutes);
  return app;
};

describe('health routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return ok status when DB is connected', async () => {
      mockExecute.mockResolvedValueOnce([{ '?column?': 1 }]);

      const app = createApp();
      const res = await app.request('/health');
      const body = (await res.json()) as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.version).toBe('0.1.0');
      expect(body.db).toBe('connected');
      expect(body.timestamp).toBeDefined();
    });

    it('should return disconnected when DB check fails', async () => {
      mockExecute.mockRejectedValueOnce(new Error('connection failed'));

      const app = createApp();
      const res = await app.request('/health');
      const body = (await res.json()) as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.db).toBe('disconnected');
    });
  });

  describe('GET /status', () => {
    it('should return operational status with counts', async () => {
      mockSelectFrom
        .mockResolvedValueOnce([{ count: 42 }])
        .mockResolvedValueOnce([{ count: 1000 }])
        .mockResolvedValueOnce([{ count: 15 }]);

      const app = createApp();
      const res = await app.request('/status');
      const body = (await res.json()) as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(body.status).toBe('operational');
      expect(body.total_skills).toBe(42);
      expect(body.total_downloads).toBe(1000);
      expect(body.total_authors).toBe(15);
      expect(body.uptime_30d).toBe(99.97);
    });
  });
});
