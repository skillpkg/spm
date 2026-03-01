import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { CATEGORIES, CATEGORY_INFO } from '@spm/shared';
import type { SkillCategory } from '@spm/shared';
import type { AppEnv } from '../types.js';
import { authed } from '../middleware/auth.js';
import { skills } from '../db/schema.js';

export const categoriesRoutes = new Hono<AppEnv>();

// ── GET /categories — list all categories with skill counts ──

categoriesRoutes.get('/categories', async (c) => {
  const db = c.get('db');

  // Count skills per category
  const rows = await db
    .select({
      category: skills.category,
      count: sql<number>`count(*)::int`,
    })
    .from(skills)
    .groupBy(skills.category);

  const countMap = new Map<string, number>();
  for (const row of rows) {
    countMap.set(row.category, row.count);
  }

  const categories = CATEGORIES.map((slug) => {
    const info = CATEGORY_INFO[slug];
    return {
      slug,
      display: info.display,
      count: countMap.get(slug) ?? 0,
      icon: info.icon,
    };
  });

  return c.json({ categories });
});

// ── POST /categories/classify — heuristic category classification ──

const ClassifyBodySchema = z.object({
  skill_md_content: z.string().min(1).max(50000),
  manifest_category: z.string().min(1),
});

// Keyword map for heuristic classification
const CATEGORY_KEYWORDS: Record<SkillCategory, readonly string[]> = {
  documents: [
    'pdf',
    'docx',
    'pptx',
    'xlsx',
    'document',
    'text',
    'markdown',
    'word',
    'excel',
    'powerpoint',
    'csv',
    'parsing',
  ],
  'data-viz': [
    'chart',
    'graph',
    'dashboard',
    'visualization',
    'analytics',
    'data',
    'plot',
    'metric',
    'report',
    'csv',
    'json',
    'table',
  ],
  frontend: [
    'react',
    'vue',
    'angular',
    'html',
    'css',
    'ui',
    'component',
    'design',
    'tailwind',
    'frontend',
    'browser',
    'dom',
    'style',
  ],
  backend: [
    'api',
    'graphql',
    'rest',
    'database',
    'migration',
    'server',
    'endpoint',
    'query',
    'sql',
    'orm',
    'backend',
    'route',
  ],
  infra: [
    'docker',
    'kubernetes',
    'ci',
    'cd',
    'deploy',
    'cloud',
    'aws',
    'terraform',
    'infrastructure',
    'pipeline',
    'container',
    'nginx',
  ],
  testing: [
    'test',
    'spec',
    'coverage',
    'benchmark',
    'jest',
    'vitest',
    'mocha',
    'assertion',
    'mock',
    'fixture',
    'e2e',
    'unit',
  ],
  'code-quality': [
    'lint',
    'eslint',
    'prettier',
    'format',
    'refactor',
    'review',
    'standard',
    'clean',
    'code-quality',
    'style-guide',
  ],
  security: [
    'auth',
    'encrypt',
    'vulnerability',
    'scan',
    'token',
    'jwt',
    'oauth',
    'permission',
    'firewall',
    'ssl',
    'tls',
    'secret',
  ],
  productivity: [
    'git',
    'terminal',
    'workflow',
    'automation',
    'cli',
    'script',
    'shortcut',
    'task',
    'productivity',
    'tool',
  ],
  other: [],
};

categoriesRoutes.post(
  '/categories/classify',
  authed,
  zValidator('json', ClassifyBodySchema),
  async (c) => {
    const body = c.req.valid('json');
    const content = body.skill_md_content.toLowerCase();
    const manifestCategory = body.manifest_category;

    // Score each category by keyword matches
    const scores: Array<{ slug: SkillCategory; score: number }> = [];

    for (const slug of CATEGORIES) {
      const keywords = CATEGORY_KEYWORDS[slug];
      let score = 0;
      for (const kw of keywords) {
        // Count occurrences, cap contribution per keyword at 3
        const regex = new RegExp(kw, 'gi');
        const matches = content.match(regex);
        if (matches) {
          score += Math.min(matches.length, 3);
        }
      }
      scores.push({ slug, score });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const topScore = scores[0].score;
    const suggestedCategory = topScore > 0 ? scores[0].slug : manifestCategory;

    // Confidence: ratio of top score to total non-zero scores
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const confidence = totalScore > 0 ? Math.round((topScore / totalScore) * 100) / 100 : 0;

    // Does our suggestion match what the manifest declared?
    const matchesManifest = suggestedCategory === manifestCategory;

    // Alternatives: other categories with >0 score, excluding top
    const alternatives = scores
      .filter((s) => s.score > 0 && s.slug !== suggestedCategory)
      .slice(0, 3)
      .map((s) => s.slug);

    return c.json({
      suggested_category: suggestedCategory,
      confidence,
      matches_manifest: matchesManifest,
      alternatives,
    });
  },
);
