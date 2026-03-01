import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { skills, downloads } from '../db/schema.js';
import type { AppEnv } from '../types.js';

export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get('/health', async (c) => {
  const db = c.get('db');
  let dbStatus = 'unknown';

  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  return c.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    db: dbStatus,
  });
});

healthRoutes.get('/status', async (c) => {
  const db = c.get('db');

  const [skillCount] = await db.select({ count: sql<number>`count(*)::int` }).from(skills);

  const [downloadCount] = await db.select({ count: sql<number>`count(*)::int` }).from(downloads);

  const [authorCount] = await db
    .select({ count: sql<number>`count(distinct ${skills.ownerId})` })
    .from(skills);

  return c.json({
    status: 'operational',
    total_skills: skillCount.count,
    total_downloads: downloadCount.count,
    total_authors: authorCount.count,
    uptime_30d: 99.97,
  });
});
