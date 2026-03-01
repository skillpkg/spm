import { eq, and, sql, count } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { downloads, versions } from '../db/schema.js';

interface RecordDownloadInput {
  versionId: string;
  userId?: string | null;
  ipHash?: string | null;
}

/**
 * Record a download event with dedup logic.
 * Dedup: don't count if same user/IP downloaded same version in the last hour.
 * If userId is provided, dedup by userId; otherwise by ipHash.
 * Returns true if a new download was recorded, false if deduped.
 */
export const recordDownload = async (
  db: Database,
  input: RecordDownloadInput,
): Promise<boolean> => {
  const { versionId, userId, ipHash } = input;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const dedupConditions = [
    eq(downloads.versionId, versionId),
    sql`${downloads.downloadedAt} >= ${oneHourAgo.toISOString()}`,
  ];

  if (userId) {
    dedupConditions.push(eq(downloads.userId, userId));
  } else if (ipHash) {
    dedupConditions.push(eq(downloads.ipHash, ipHash));
  } else {
    // No identity info — always record
    await db.insert(downloads).values({ versionId, userId: null, ipHash: null });
    return true;
  }

  const [recentDownload] = await db
    .select({ id: downloads.id })
    .from(downloads)
    .where(and(...dedupConditions))
    .limit(1);

  if (recentDownload) {
    return false;
  }

  await db.insert(downloads).values({
    versionId,
    userId: userId ?? null,
    ipHash: ipHash ?? null,
  });

  return true;
};

/**
 * Get total download count across all versions of a skill.
 */
export const getDownloadCounts = async (db: Database, skillId: string): Promise<number> => {
  const [result] = await db
    .select({ total: count() })
    .from(downloads)
    .innerJoin(versions, eq(versions.id, downloads.versionId))
    .where(eq(versions.skillId, skillId));

  return result?.total ?? 0;
};

/**
 * Get download count for the last 7 days for a skill.
 */
export const getWeeklyDownloads = async (db: Database, skillId: string): Promise<number> => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [result] = await db
    .select({ total: count() })
    .from(downloads)
    .innerJoin(versions, eq(versions.id, downloads.versionId))
    .where(
      and(
        eq(versions.skillId, skillId),
        sql`${downloads.downloadedAt} >= ${sevenDaysAgo.toISOString()}`,
      ),
    );

  return result?.total ?? 0;
};

interface WeeklyTrendPoint {
  week: string;
  downloads: number;
}

/**
 * Get weekly download trend for last N weeks.
 * Returns array of { week: "YYYY-WNN", downloads: number }.
 */
export const getWeeklyTrend = async (
  db: Database,
  skillId: string,
  weeks: number,
): Promise<WeeklyTrendPoint[]> => {
  const startDate = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      week: sql<string>`to_char(${downloads.downloadedAt}, 'IYYY-"W"IW')`,
      downloads: count(),
    })
    .from(downloads)
    .innerJoin(versions, eq(versions.id, downloads.versionId))
    .where(
      and(
        eq(versions.skillId, skillId),
        sql`${downloads.downloadedAt} >= ${startDate.toISOString()}`,
      ),
    )
    .groupBy(sql`to_char(${downloads.downloadedAt}, 'IYYY-"W"IW')`)
    .orderBy(sql`to_char(${downloads.downloadedAt}, 'IYYY-"W"IW')`);

  return rows.map((r) => ({
    week: r.week,
    downloads: r.downloads,
  }));
};

interface VersionDownloadCount {
  versionId: string;
  version: string;
  downloads: number;
}

/**
 * Get download counts broken down by version for a skill.
 */
export const getDownloadsByVersion = async (
  db: Database,
  skillId: string,
): Promise<VersionDownloadCount[]> => {
  const rows = await db
    .select({
      versionId: versions.id,
      version: versions.version,
      downloads: count(),
    })
    .from(downloads)
    .innerJoin(versions, eq(versions.id, downloads.versionId))
    .where(eq(versions.skillId, skillId))
    .groupBy(versions.id, versions.version)
    .orderBy(versions.version);

  return rows.map((r) => ({
    versionId: r.versionId,
    version: r.version,
    downloads: r.downloads,
  }));
};
