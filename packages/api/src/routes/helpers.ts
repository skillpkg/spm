import type { Context } from 'hono';
import type { AppEnv } from '../types.js';

/**
 * Extract the full skill name from route params.
 * Handles both scoped (@scope/name) and unscoped (name) routes.
 */
export const extractSkillName = (c: Context<AppEnv>): string => {
  const scope = c.req.param('scope');
  const name = c.req.param('name');
  if (scope) {
    return `@${scope}/${name}`;
  }
  return name;
};

/**
 * Build a download URL for a scoped or unscoped skill name.
 * For scoped names like "@alice/my-skill", produces "/api/v1/skills/@alice/my-skill/1.0.0/download".
 * For unscoped names, produces "/api/v1/skills/my-skill/1.0.0/download".
 */
export const buildDownloadUrl = (name: string, version: string): string => {
  return `/api/v1/skills/${name}/${version}/download`;
};

/**
 * Build a bundle URL for a scoped or unscoped skill name.
 */
export const buildBundleUrl = (name: string, version: string): string => {
  return `/api/v1/skills/${name}/${version}/bundle`;
};
