import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { CATEGORIES, CATEGORY_INFO, SKILL_TEMPLATE } from '@spm/shared';
import type { Database } from '../db/index.js';
import { buildSearchCondition, buildRankExpression } from '../services/search.js';
import { formatSearchResults } from './format.js';
import { formatSkillInfo } from './format.js';
import { formatCategories } from './format.js';
import { formatTemplate } from './format.js';

// ── Tool definitions (JSON Schema for MCP tools/list) ──

export const TOOL_DEFINITIONS = [
  {
    name: 'search_skills',
    description: 'Search the SPM registry for AI agent skills by keyword, category, or tag',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query for skills' },
        category: {
          type: 'string',
          description: 'Filter by category slug (e.g. "frontend", "testing")',
        },
        limit: { type: 'number', description: 'Max results to return (default 10, max 50)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_skill',
    description: 'Get detailed information about a specific SPM skill by name',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'The name of the skill (e.g. "pdf-generator")' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_categories',
    description: 'List all SPM skill categories with skill counts',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_template',
    description: 'Get the SPM skill template with manifest.json and SKILL.md to create a new skill',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

// ── Tool handlers ──

export const searchSkills = async (
  db: Database,
  params: { query: string; category?: string; limit?: number },
): Promise<string> => {
  const { query, category, limit = 10 } = params;
  const cappedLimit = Math.min(Math.max(1, limit), 50);

  const conditions: SQL[] = [sql`skills.status != 'blocked'`];

  const searchCondition = buildSearchCondition(query);
  if (searchCondition) {
    conditions.push(searchCondition);
  }

  if (category) {
    conditions.push(sql`${category} = ANY(skills.categories)`);
  }

  const whereClause =
    conditions.length > 0 ? sql`WHERE ${conditions.reduce((a, b) => sql`${a} AND ${b}`)}` : sql``;

  const rankExpr = buildRankExpression(query);
  const orderBy = rankExpr ? sql`ORDER BY ${rankExpr} DESC` : sql`ORDER BY skills.updated_at DESC`;

  const rows = await db.execute(sql`
    SELECT
      skills.name,
      skills.description,
      skills.rating_avg,
      skills.rating_count,
      skills.categories,
      u.username as author_username,
      u.trust_tier as author_trust_tier,
      v.version as latest_version,
      COALESCE(dc.total, 0)::int as download_count
    FROM skills
    JOIN users u ON u.id = skills.owner_id
    LEFT JOIN LATERAL (
      SELECT version FROM versions
      WHERE versions.skill_id = skills.id AND versions.yanked = false
      ORDER BY versions.version_major DESC, versions.version_minor DESC, versions.version_patch DESC
      LIMIT 1
    ) v ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int as total FROM downloads
      JOIN versions vd ON vd.id = downloads.version_id
      WHERE vd.skill_id = skills.id
    ) dc ON true
    ${whereClause}
    ${orderBy}
    LIMIT ${cappedLimit}
  `);

  const results = (
    Array.isArray(rows) ? rows : ((rows as { rows: unknown[] }).rows ?? [])
  ) as Array<{
    name: string;
    description: string;
    rating_avg: number;
    rating_count: number;
    author_username: string;
    author_trust_tier: string;
    latest_version: string | null;
    download_count: number;
  }>;

  return formatSearchResults(
    query,
    results.map((r) => ({
      name: r.name,
      version: r.latest_version ?? '0.0.0',
      rating_avg: r.rating_avg ?? 0,
      rating_count: r.rating_count ?? 0,
      downloads: r.download_count,
      description: r.description,
      author: { username: r.author_username, trust_tier: r.author_trust_tier },
    })),
  );
};

export const getSkillInfo = async (db: Database, params: { name: string }): Promise<string> => {
  const rows = await db.execute(sql`
    SELECT
      s.name,
      s.description,
      s.categories,
      s.license,
      s.rating_avg,
      s.rating_count,
      s.imported_from,
      s.deprecated,
      s.deprecated_msg,
      u.username as author_username,
      u.trust_tier as author_trust_tier
    FROM skills s
    JOIN users u ON u.id = s.owner_id
    WHERE s.name = ${params.name} AND s.status != 'blocked'
    LIMIT 1
  `);

  const rawRows = Array.isArray(rows) ? rows : ((rows as { rows: unknown[] }).rows ?? []);
  const skill = rawRows[0] as
    | {
        name: string;
        description: string;
        categories: string[];
        license: string | null;
        rating_avg: number;
        rating_count: number;
        imported_from: string | null;
        deprecated: boolean;
        deprecated_msg: string | null;
        author_username: string;
        author_trust_tier: string;
      }
    | undefined;

  if (!skill) {
    return `Skill "${params.name}" not found.`;
  }

  // Fetch latest version
  const versionRows = await db.execute(sql`
    SELECT version FROM versions
    WHERE skill_id = (SELECT id FROM skills WHERE name = ${params.name})
      AND yanked = false
    ORDER BY version_major DESC, version_minor DESC, version_patch DESC
    LIMIT 1
  `);
  const rawVersions = Array.isArray(versionRows)
    ? versionRows
    : ((versionRows as { rows: unknown[] }).rows ?? []);
  const latestVersion = (rawVersions[0] as { version: string } | undefined)?.version ?? null;

  // Fetch tags
  const tagRows = await db.execute(sql`
    SELECT tag FROM skill_tags
    WHERE skill_id = (SELECT id FROM skills WHERE name = ${params.name})
  `);
  const rawTags = Array.isArray(tagRows) ? tagRows : ((tagRows as { rows: unknown[] }).rows ?? []);
  const tags = (rawTags as Array<{ tag: string }>).map((t) => t.tag);

  // Fetch platforms
  const platformRows = await db.execute(sql`
    SELECT platform FROM skill_platforms
    WHERE skill_id = (SELECT id FROM skills WHERE name = ${params.name})
  `);
  const rawPlatforms = Array.isArray(platformRows)
    ? platformRows
    : ((platformRows as { rows: unknown[] }).rows ?? []);
  const platforms = (rawPlatforms as Array<{ platform: string }>).map((p) => p.platform);

  // Fetch download count
  const dlRows = await db.execute(sql`
    SELECT count(*)::int as total FROM downloads
    JOIN versions v ON v.id = downloads.version_id
    WHERE v.skill_id = (SELECT id FROM skills WHERE name = ${params.name})
  `);
  const rawDl = Array.isArray(dlRows) ? dlRows : ((dlRows as { rows: unknown[] }).rows ?? []);
  const downloads = (rawDl[0] as { total: number } | undefined)?.total ?? 0;

  return formatSkillInfo({
    name: skill.name,
    description: skill.description,
    author: { username: skill.author_username, trust_tier: skill.author_trust_tier },
    categories: skill.categories,
    license: skill.license ?? undefined,
    downloads,
    rating_avg: skill.rating_avg ?? 0,
    rating_count: skill.rating_count ?? 0,
    tags: tags.length > 0 ? tags : undefined,
    platforms: platforms.length > 0 ? platforms : undefined,
    imported_from: skill.imported_from,
    latest_version: latestVersion ? { version: latestVersion } : null,
  });
};

export const listCategories = async (db: Database): Promise<string> => {
  const result = await db.execute(
    sql`SELECT unnest(categories) as cat, count(*)::int as count FROM skills GROUP BY cat`,
  );

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

  return formatCategories(categories);
};

export const getTemplate = (): string => {
  return formatTemplate({
    manifest: SKILL_TEMPLATE.manifest,
    skill_md: SKILL_TEMPLATE.skill_md,
  });
};
