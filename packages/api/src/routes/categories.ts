import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { CATEGORIES, CATEGORY_INFO } from '@spm/shared';
import type { SkillCategory } from '@spm/shared';
import type { AppEnv } from '../types.js';
import { authed } from '../middleware/auth.js';

export const categoriesRoutes = new Hono<AppEnv>();

// ── GET /categories — list all categories with skill counts ──

categoriesRoutes.get('/categories', async (c) => {
  const db = c.get('db');

  // Count skills per category (unnest the categories array)
  const result = await db.execute(
    sql`SELECT unnest(categories) as cat, count(*)::int as count FROM skills GROUP BY cat`,
  );

  // Total distinct skills (not summing per-category counts, which double-counts multi-category skills)
  const totalResult = await db.execute(sql`SELECT count(*)::int as total FROM skills`);
  const totalRows = Array.isArray(totalResult)
    ? totalResult
    : ((totalResult as { rows: unknown[] }).rows ?? []);
  const totalSkills = (totalRows[0] as { total: number })?.total ?? 0;

  // Handle both array and { rows: [...] } formats from different Drizzle drivers
  const rawRows = Array.isArray(result) ? result : ((result as { rows: unknown[] }).rows ?? []);
  const countMap = new Map<string, number>();
  for (const row of rawRows as Array<{ cat: string; count: number }>) {
    countMap.set(row.cat, row.count);
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

  return c.json({ categories, total_skills: totalSkills });
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
    'plot',
    'metric',
    'report',
    'sparkline',
    'heatmap',
    'd3',
    'recharts',
  ],
  'data-analysis': [
    'dataset',
    'query',
    'analytics',
    'data',
    'csv',
    'json',
    'table',
    'transform',
    'pipeline',
    'pandas',
    'parquet',
    'sql',
    'etl',
  ],
  'ai-ml': [
    'model',
    'training',
    'fine-tune',
    'inference',
    'llm',
    'embedding',
    'neural',
    'machine-learning',
    'ml',
    'ai',
    'hugging-face',
    'pytorch',
    'tensorflow',
    'evaluation',
    'gpu',
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

    // Suggested categories: top scoring categories (up to 3 with score > 0)
    const suggestedCategories =
      topScore > 0
        ? scores
            .filter((s) => s.score > 0)
            .slice(0, 3)
            .map((s) => s.slug)
        : [manifestCategory];

    // Confidence: ratio of top score to total non-zero scores
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const confidence = totalScore > 0 ? Math.round((topScore / totalScore) * 100) / 100 : 0;

    // Does our top suggestion match what the manifest declared?
    const matchesManifest = suggestedCategories[0] === manifestCategory;

    // Alternatives: other categories with >0 score, excluding suggested
    const suggestedSet = new Set(suggestedCategories);
    const alternatives = scores
      .filter((s) => s.score > 0 && !suggestedSet.has(s.slug))
      .slice(0, 3)
      .map((s) => s.slug);

    return c.json({
      suggested_categories: suggestedCategories,
      confidence,
      matches_manifest: matchesManifest,
      alternatives,
    });
  },
);
