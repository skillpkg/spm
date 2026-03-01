import { eq, sql, count, avg } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { downloads, versions, skills, reviews } from '../db/schema.js';
import { getDownloadCounts, getWeeklyDownloads } from './downloads.js';

interface SkillBreakdown {
  skillName: string;
  downloads: number;
  weeklyDownloads: number;
  rating: number;
}

interface AuthorStats {
  totalDownloads: number;
  weeklyDownloads: number;
  ratingAvg: number;
  totalReviews: number;
  weeklyTrend: Array<{ week: string; downloads: number }>;
  skills: SkillBreakdown[];
}

/**
 * Aggregate all stats for an author (for dashboard).
 * Collects download counts, ratings, and per-skill breakdowns.
 */
export const getAuthorStats = async (db: Database, userId: string): Promise<AuthorStats> => {
  // Get all skills owned by this user
  const authorSkills = await db
    .select({ id: skills.id, name: skills.name })
    .from(skills)
    .where(eq(skills.ownerId, userId));

  if (authorSkills.length === 0) {
    return {
      totalDownloads: 0,
      weeklyDownloads: 0,
      ratingAvg: 0,
      totalReviews: 0,
      weeklyTrend: [],
      skills: [],
    };
  }

  // Gather per-skill breakdowns in parallel
  const skillBreakdowns: SkillBreakdown[] = await Promise.all(
    authorSkills.map(async (skill) => {
      const [dlCount, weeklyDl, reviewStats] = await Promise.all([
        getDownloadCounts(db, skill.id),
        getWeeklyDownloads(db, skill.id),
        db
          .select({
            avgRating: avg(reviews.rating),
          })
          .from(reviews)
          .where(eq(reviews.skillId, skill.id)),
      ]);

      return {
        skillName: skill.name,
        downloads: dlCount,
        weeklyDownloads: weeklyDl,
        rating: reviewStats[0]?.avgRating ? parseFloat(String(reviewStats[0].avgRating)) : 0,
      };
    }),
  );

  // Aggregate totals
  const totalDownloads = skillBreakdowns.reduce((sum, s) => sum + s.downloads, 0);
  const weeklyDownloadsTotal = skillBreakdowns.reduce((sum, s) => sum + s.weeklyDownloads, 0);

  // Get total reviews for all author skills
  const skillIds = authorSkills.map((s) => s.id);
  const [reviewCountResult] = await db
    .select({ total: count() })
    .from(reviews)
    .where(
      sql`${reviews.skillId} IN (${sql.join(
        skillIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  const totalReviews = reviewCountResult?.total ?? 0;

  // Weighted average rating (weighted by review count per skill)
  const [weightedRatingResult] = await db
    .select({
      weightedAvg: avg(reviews.rating),
    })
    .from(reviews)
    .where(
      sql`${reviews.skillId} IN (${sql.join(
        skillIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  const ratingAvg = weightedRatingResult?.weightedAvg
    ? parseFloat(String(weightedRatingResult.weightedAvg))
    : 0;

  // Weekly trend across all skills (last 8 weeks)
  const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);
  const weeklyTrend = await db
    .select({
      week: sql<string>`to_char(${downloads.downloadedAt}, 'IYYY-"W"IW')`,
      downloads: count(),
    })
    .from(downloads)
    .innerJoin(versions, eq(versions.id, downloads.versionId))
    .where(
      sql`${versions.skillId} IN (${sql.join(
        skillIds.map((id) => sql`${id}`),
        sql`, `,
      )})
        AND ${downloads.downloadedAt} >= ${eightWeeksAgo.toISOString()}`,
    )
    .groupBy(sql`to_char(${downloads.downloadedAt}, 'IYYY-"W"IW')`)
    .orderBy(sql`to_char(${downloads.downloadedAt}, 'IYYY-"W"IW')`);

  return {
    totalDownloads,
    weeklyDownloads: weeklyDownloadsTotal,
    ratingAvg,
    totalReviews,
    weeklyTrend: weeklyTrend.map((r) => ({ week: r.week, downloads: r.downloads })),
    skills: skillBreakdowns,
  };
};
