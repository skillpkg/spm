import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql, desc } from 'drizzle-orm';
import type { AppEnv } from '../types.js';
import { skillTags } from '../db/schema.js';

export const tagsRoutes = new Hono<AppEnv>();

const TagsQuerySchema = z.object({
  q: z.string().optional().default(''),
  per_page: z.coerce.number().int().min(1).max(50).optional().default(20),
});

tagsRoutes.get('/tags', zValidator('query', TagsQuerySchema), async (c) => {
  const db = c.get('db');
  const { q, per_page } = c.req.valid('query');

  const conditions = q ? sql`${skillTags.tag} ILIKE ${q + '%'}` : undefined;

  const rows = await db
    .select({
      tag: skillTags.tag,
      count: sql<number>`count(*)::int`.as('count'),
    })
    .from(skillTags)
    .where(conditions)
    .groupBy(skillTags.tag)
    .orderBy(desc(sql`count(*)`))
    .limit(per_page);

  return c.json({
    tags: rows.map((r) => ({ tag: r.tag, count: r.count })),
    total: rows.length,
  });
});
