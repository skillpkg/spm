import { Hono } from 'hono';
import { createApiError } from '@spm/shared';
import type { AppEnv } from '../../types.js';

export const errorsRoutes = new Hono<AppEnv>();

// ── GET /admin/errors — aggregated errors (stub — no errors table yet) ──

errorsRoutes.get('/admin/errors', async (c) => {
  return c.json({
    errors: [],
    total: 0,
  });
});

// ── PATCH /admin/errors/:id — update error status (stub) ──

errorsRoutes.patch('/admin/errors/:id', async (c) => {
  return c.json(createApiError('SKILL_NOT_FOUND', { message: 'Error entry not found' }), 404);
});
