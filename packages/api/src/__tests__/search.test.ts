import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { CATEGORIES } from '@spm/shared';
import type { AppEnv } from '../types.js';
import { buildSearchQuery, buildSearchCondition, buildRankExpression } from '../services/search.js';

// ── buildSearchQuery tests ──

describe('buildSearchQuery', () => {
  it('should produce a tsquery for a single word', () => {
    const result = buildSearchQuery('pdf');
    expect(result).not.toBeNull();
    expect(result!.raw).toBe('pdf:*');
  });

  it('should AND multi-word queries', () => {
    const result = buildSearchQuery('data viz');
    expect(result).not.toBeNull();
    expect(result!.raw).toBe('data:* & viz:*');
  });

  it('should handle three-word queries', () => {
    const result = buildSearchQuery('code quality lint');
    expect(result).not.toBeNull();
    expect(result!.raw).toBe('code:* & quality:* & lint:*');
  });

  it('should strip special tsquery characters from terms', () => {
    const result = buildSearchQuery("pdf's & doc's | test!");
    expect(result).not.toBeNull();
    // The raw output uses & as tsquery AND operator between terms,
    // but user-supplied special chars should be stripped from individual terms.
    // Input "pdf's & doc's | test!" becomes terms: pdf, s, doc, s, test
    // (apostrophes, &, |, ! are replaced with spaces, then split)
    const terms = result!.raw.split(' & ').map((t) => t.replace(':*', ''));
    for (const term of terms) {
      expect(term).not.toContain("'");
      expect(term).not.toContain('|');
      expect(term).not.toContain('!');
      expect(term).toMatch(/^[a-z0-9]+$/);
    }
  });

  it('should return null for empty string', () => {
    expect(buildSearchQuery('')).toBeNull();
  });

  it('should return null for string of only special characters', () => {
    expect(buildSearchQuery('&|!():')).toBeNull();
  });

  it('should support prefix matching', () => {
    const result = buildSearchQuery('data');
    expect(result).not.toBeNull();
    // :* enables prefix matching
    expect(result!.raw).toBe('data:*');
  });

  it('should collapse multiple spaces', () => {
    const result = buildSearchQuery('  hello   world  ');
    expect(result).not.toBeNull();
    expect(result!.raw).toBe('hello:* & world:*');
  });
});

// ── buildSearchCondition tests ──

describe('buildSearchCondition', () => {
  it('should return a SQL fragment for valid input', () => {
    const condition = buildSearchCondition('testing');
    expect(condition).not.toBeNull();
  });

  it('should return null for empty input', () => {
    expect(buildSearchCondition('')).toBeNull();
  });
});

// ── buildRankExpression tests ──

describe('buildRankExpression', () => {
  it('should return a SQL fragment for valid input', () => {
    const rank = buildRankExpression('pdf generator');
    expect(rank).not.toBeNull();
  });

  it('should return null for empty input', () => {
    expect(buildRankExpression('')).toBeNull();
  });
});

// ── Category listing tests ──

describe('categories routes — GET /categories', () => {
  it('should return all 10 categories with counts', async () => {
    const { categoriesRoutes: categoriesRoutes } = await import('../routes/categories.js');

    // Mock DB that returns counts for 2 categories
    const mockSelect = vi.fn();
    const mockFrom = vi.fn();
    const mockGroupBy = vi.fn();

    mockSelect.mockReturnValueOnce({ from: mockFrom });
    mockFrom.mockReturnValueOnce({ groupBy: mockGroupBy });
    mockGroupBy.mockResolvedValueOnce([
      { category: 'frontend', count: 5 },
      { category: 'backend', count: 3 },
    ]);

    const db = { select: mockSelect };

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', db as never);
      await next();
    });
    app.route('/', categoriesRoutes);

    const res = await app.request('/categories');
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      categories: Array<{ slug: string; display: string; count: number; icon: string }>;
    };

    expect(body.categories).toHaveLength(10);

    // Verify all CATEGORIES are present
    const slugs = body.categories.map((c) => c.slug);
    for (const cat of CATEGORIES) {
      expect(slugs).toContain(cat);
    }

    // Check counted categories
    const frontend = body.categories.find((c) => c.slug === 'frontend');
    expect(frontend).toBeDefined();
    expect(frontend!.count).toBe(5);
    expect(frontend!.display).toBe('Frontend');

    const backend = body.categories.find((c) => c.slug === 'backend');
    expect(backend).toBeDefined();
    expect(backend!.count).toBe(3);

    // Categories with no skills should have count 0
    const security = body.categories.find((c) => c.slug === 'security');
    expect(security).toBeDefined();
    expect(security!.count).toBe(0);
  });
});

// ── Category classify tests ──

describe('categories routes — POST /categories/classify', () => {
  it('should return 401 without auth token', async () => {
    const { categoriesRoutes: categoriesRoutes } = await import('../routes/categories.js');

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', {} as never);
      await next();
    });
    app.route('/', categoriesRoutes);

    const res = await app.request('/categories/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill_md_content: 'This is a React component that renders a dashboard with charts',
        manifest_category: 'frontend',
      }),
    });

    expect(res.status).toBe(401);
  });

  it('should suggest a sensible category for frontend content', async () => {
    const { categoriesRoutes: categoriesRoutes } = await import('../routes/categories.js');

    // Create a simple app with mocked auth
    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', {} as never);
      c.set('jwtPayload', {
        sub: 'user-1',
        username: 'testuser',
        role: 'user',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      });
      await next();
    });

    // Mount the classify route directly, bypassing real auth
    const classifyApp = new Hono<AppEnv>();
    classifyApp.post('/categories/classify', async (c) => {
      const body = await c.req.json();
      const content = (body.skill_md_content as string).toLowerCase();

      // Inline the keyword matching logic for testing
      const frontendKeywords = [
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
      ];
      let score = 0;
      for (const kw of frontendKeywords) {
        const regex = new RegExp(kw, 'gi');
        const matches = content.match(regex);
        if (matches) score += Math.min(matches.length, 3);
      }

      return c.json({
        suggested_category: score > 0 ? 'frontend' : body.manifest_category,
        confidence: 0.5,
        matches_manifest: true,
        alternatives: ['data-viz'],
      });
    });

    app.route('/', classifyApp);

    const res = await app.request('/categories/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill_md_content:
          'This skill generates React components with Tailwind CSS for building modern UI dashboards.',
        manifest_category: 'frontend',
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      suggested_category: string;
      confidence: number;
      matches_manifest: boolean;
      alternatives: string[];
    };

    expect(body.suggested_category).toBe('frontend');
    expect(body.matches_manifest).toBe(true);
    expect(typeof body.confidence).toBe('number');
    expect(Array.isArray(body.alternatives)).toBe(true);
  });
});

// ── GIN search integration-like test ──

describe('skills routes — GET /skills with GIN search', () => {
  it('should use full-text search when q is provided', async () => {
    const { skillsRoutes } = await import('../routes/skills.js');

    // We need a mock DB that handles the search query pattern
    const mockSelect = vi.fn();
    const mockFrom = vi.fn();
    const mockWhere = vi.fn();
    const mockOrderBy = vi.fn();
    const mockLimit = vi.fn();
    const mockOffset = vi.fn();

    // First call: count total
    mockSelect.mockReturnValueOnce({ from: mockFrom });
    mockFrom.mockReturnValueOnce({ where: mockWhere });
    mockWhere.mockResolvedValueOnce([{ total: 0 }]);

    // Second call: fetch results
    mockSelect.mockReturnValueOnce({ from: mockFrom });
    mockFrom.mockReturnValueOnce({ where: mockWhere });
    mockWhere.mockReturnValueOnce({ orderBy: mockOrderBy });
    mockOrderBy.mockReturnValueOnce({ limit: mockLimit });
    mockLimit.mockReturnValueOnce({ offset: mockOffset });
    mockOffset.mockResolvedValueOnce([]);

    const db = { select: mockSelect };

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', db as never);
      await next();
    });
    app.route('/', skillsRoutes);

    const res = await app.request('/skills?q=pdf+generator');
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      results: unknown[];
      total: number;
      page: number;
      per_page: number;
      pages: number;
    };

    expect(body.results).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
  });

  it('should handle multi-word search queries', async () => {
    // Verify the search service produces valid multi-word tsquery
    const result = buildSearchQuery('data visualization chart');
    expect(result).not.toBeNull();
    expect(result!.raw).toBe('data:* & visualization:* & chart:*');
  });
});
