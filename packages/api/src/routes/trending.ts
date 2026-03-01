import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { desc, eq, and, sql, count } from 'drizzle-orm';
import type { AppEnv } from '../types.js';
import { skills, versions, downloads, users } from '../db/schema.js';

export const trendingRoutes = new Hono<AppEnv>();

const TrendingQuerySchema = z.object({
  tab: z.enum(['featured', 'rising', 'most_installed', 'new']).optional().default('featured'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

trendingRoutes.get('/trending', zValidator('query', TrendingQuerySchema), async (c) => {
  const db = c.get('db');
  const { tab, limit } = c.req.valid('query');

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  let rows: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    ratingAvg: number | null;
    ratingCount: number | null;
    ownerId: string;
  }>;

  switch (tab) {
    case 'featured': {
      // Top-rated skills with > 5 reviews
      rows = await db
        .select({
          id: skills.id,
          name: skills.name,
          description: skills.description,
          category: skills.category,
          ratingAvg: skills.ratingAvg,
          ratingCount: skills.ratingCount,
          ownerId: skills.ownerId,
        })
        .from(skills)
        .where(sql`${skills.ratingCount} > 5`)
        .orderBy(desc(skills.ratingAvg))
        .limit(limit);
      break;
    }

    case 'rising': {
      // Highest weekly download growth percentage
      // Compare this week vs previous week
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      rows = await db
        .select({
          id: skills.id,
          name: skills.name,
          description: skills.description,
          category: skills.category,
          ratingAvg: skills.ratingAvg,
          ratingCount: skills.ratingCount,
          ownerId: skills.ownerId,
        })
        .from(skills)
        .orderBy(
          desc(
            sql`(
              SELECT count(*) FROM ${downloads}
              JOIN ${versions} ON ${versions.id} = ${downloads.versionId}
              WHERE ${versions.skillId} = ${skills.id}
              AND ${downloads.downloadedAt} >= ${oneWeekAgo.toISOString()}
            ) * 1.0 / NULLIF(
              (SELECT count(*) FROM ${downloads}
               JOIN ${versions} ON ${versions.id} = ${downloads.versionId}
               WHERE ${versions.skillId} = ${skills.id}
               AND ${downloads.downloadedAt} >= ${twoWeeksAgo.toISOString()}
               AND ${downloads.downloadedAt} < ${oneWeekAgo.toISOString()}
              ), 0)`,
          ),
        )
        .limit(limit);
      break;
    }

    case 'most_installed': {
      // Highest total downloads
      rows = await db
        .select({
          id: skills.id,
          name: skills.name,
          description: skills.description,
          category: skills.category,
          ratingAvg: skills.ratingAvg,
          ratingCount: skills.ratingCount,
          ownerId: skills.ownerId,
        })
        .from(skills)
        .orderBy(
          desc(
            sql`(SELECT count(*) FROM ${downloads}
                 JOIN ${versions} ON ${versions.id} = ${downloads.versionId}
                 WHERE ${versions.skillId} = ${skills.id})`,
          ),
        )
        .limit(limit);
      break;
    }

    case 'new': {
      // Most recently published (by latest version's published_at)
      rows = await db
        .select({
          id: skills.id,
          name: skills.name,
          description: skills.description,
          category: skills.category,
          ratingAvg: skills.ratingAvg,
          ratingCount: skills.ratingCount,
          ownerId: skills.ownerId,
        })
        .from(skills)
        .orderBy(desc(skills.createdAt))
        .limit(limit);
      break;
    }
  }

  // Enrich each skill
  const enrichedSkills = await Promise.all(
    rows.map(async (row) => {
      const [latestVersion] = await db
        .select()
        .from(versions)
        .where(and(eq(versions.skillId, row.id), eq(versions.yanked, false)))
        .orderBy(
          desc(versions.versionMajor),
          desc(versions.versionMinor),
          desc(versions.versionPatch),
        )
        .limit(1);

      const [author] = await db
        .select({ username: users.username, trustTier: users.trustTier })
        .from(users)
        .where(eq(users.id, row.ownerId))
        .limit(1);

      const [dlCount] = await db
        .select({ total: count() })
        .from(downloads)
        .innerJoin(versions, eq(versions.id, downloads.versionId))
        .where(eq(versions.skillId, row.id));

      const [weeklyDlCount] = await db
        .select({ total: count() })
        .from(downloads)
        .innerJoin(versions, eq(versions.id, downloads.versionId))
        .where(
          and(
            eq(versions.skillId, row.id),
            sql`${downloads.downloadedAt} >= ${oneWeekAgo.toISOString()}`,
          ),
        );

      return {
        name: row.name,
        version: latestVersion?.version ?? null,
        description: row.description,
        author: {
          username: author?.username ?? 'unknown',
          trust_tier: author?.trustTier ?? 'registered',
        },
        category: row.category,
        downloads: dlCount.total,
        weekly_downloads: weeklyDlCount.total,
        rating_avg: row.ratingAvg,
      };
    }),
  );

  return c.json({
    tab,
    skills: enrichedSkills,
  });
});
