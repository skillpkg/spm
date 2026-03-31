import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { AppEnv } from './types.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/error-handler.js';
import { createDb } from './db/index.js';
import { createRouter } from './routes/index.js';
import { mcpApp } from './mcp/index.js';

// Top-level app for root-level routes (robots.txt, sitemap.xml)
const root = new Hono<AppEnv>();

// robots.txt — block AI crawlers, point to MCP
root.get('/robots.txt', (c) => {
  return c.text(
    [
      '# SPM Registry API',
      '# https://registry.skillpkg.dev',
      '',
      'User-agent: *',
      'Allow: /api/v1/skills',
      'Allow: /api/v1/categories',
      'Allow: /api/v1/trending',
      'Allow: /api/v1/authors',
      'Disallow: /api/v1/auth',
      'Disallow: /api/v1/admin',
      '',
      '# AI crawlers — use our MCP endpoint: POST https://registry.skillpkg.dev/mcp',
      '# Or install the local MCP server: npm install -g @skillpkg/mcp',
      '# See https://skillpkg.dev/llms.txt for details',
      'User-agent: GPTBot',
      'Disallow: /',
      'User-agent: ChatGPT-User',
      'Disallow: /',
      'User-agent: CCBot',
      'Disallow: /',
      'User-agent: Google-Extended',
      'Disallow: /',
      'User-agent: anthropic-ai',
      'Disallow: /',
      'User-agent: ClaudeBot',
      'Disallow: /',
      'User-agent: Bytespider',
      'Disallow: /',
      'User-agent: cohere-ai',
      'Disallow: /',
      '',
      'Sitemap: https://registry.skillpkg.dev/sitemap.xml',
    ].join('\n'),
    200,
    { 'Content-Type': 'text/plain; charset=utf-8' },
  );
});

// sitemap.xml — dynamic sitemap from DB
root.get('/sitemap.xml', async (c) => {
  const db = createDb(c.env.DATABASE_URL);

  const skillRows = (await db.execute(
    sql`SELECT name, updated_at FROM skills ORDER BY updated_at DESC`,
  )) as unknown as Array<{ name: string; updated_at: string }>;
  const rows = Array.isArray(skillRows)
    ? skillRows
    : ((skillRows as unknown as { rows: unknown[] }).rows as Array<{
        name: string;
        updated_at: string;
      }>);

  const urls: Array<{
    loc: string;
    priority: string;
    changefreq: string;
    lastmod?: string;
  }> = [
    { loc: 'https://skillpkg.dev/', priority: '1.0', changefreq: 'daily' },
    { loc: 'https://skillpkg.dev/search', priority: '0.8', changefreq: 'daily' },
    { loc: 'https://skillpkg.dev/categories', priority: '0.7', changefreq: 'weekly' },
    ...rows.map((s) => ({
      loc: `https://skillpkg.dev/skills/${s.name}`,
      priority: '0.6',
      changefreq: 'weekly' as const,
      lastmod: s.updated_at ? new Date(s.updated_at).toISOString().split('T')[0] : undefined,
    })),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/ns/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`,
    ),
    '</urlset>',
  ].join('\n');

  return c.text(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

// API app with /api/v1 base path
const app = new Hono<AppEnv>().basePath('/api/v1');

// Global middleware: CORS
app.use('*', async (c, next) => {
  const middleware = corsMiddleware(c.env.ENVIRONMENT);
  return middleware(c, next);
});

// Global middleware: inject DB into context
app.use('*', async (c, next) => {
  const db = createDb(c.env.DATABASE_URL);
  c.set('db', db);
  await next();
});

// Global error handler
app.onError(errorHandler);

// Mount all routes
app.route('/', createRouter());

// Mount MCP endpoint (before API so /mcp is not under /api/v1)
root.route('/mcp', mcpApp);

// Mount API under root
root.route('/', app);

export default root;
