import { Hono } from 'hono';
import { SKILL_TEMPLATE } from '@spm/shared';
import type { AppEnv } from '../types.js';

export const templateRoutes = new Hono<AppEnv>();

// ── GET /template — return skill template (manifest + SKILL.md) ──

templateRoutes.get('/template', (c) => {
  return c.json({
    manifest: SKILL_TEMPLATE.manifest,
    skill_md: SKILL_TEMPLATE.skill_md,
  });
});
