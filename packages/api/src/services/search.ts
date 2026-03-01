import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

/**
 * Sanitize a search term for use in Postgres tsquery.
 * Strips characters that are special to tsquery syntax.
 */
const sanitizeTerm = (term: string): string =>
  term
    .replace(/[&|!():*<>'\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Build a Postgres tsquery SQL fragment from a user search string.
 *
 * - Multi-word queries are ANDed together
 * - Each term uses prefix matching (:*) so "data" matches "data-viz"
 * - Special characters are escaped
 *
 * Returns null if the query produces no valid terms.
 */
export const buildSearchQuery = (q: string): { tsquery: SQL; raw: string } | null => {
  const sanitized = sanitizeTerm(q);
  if (sanitized.length === 0) return null;

  const terms = sanitized.split(' ').filter((t) => t.length > 0);
  if (terms.length === 0) return null;

  // Join terms with & (AND) and add :* for prefix matching
  const tsqueryStr = terms.map((t) => `${t}:*`).join(' & ');

  return {
    tsquery: sql`to_tsquery('english', ${tsqueryStr})`,
    raw: tsqueryStr,
  };
};

/**
 * Build a SQL fragment that ranks a skill row against a search query
 * using the pre-computed search_vector tsvector column.
 */
export const buildRankExpression = (q: string): SQL | null => {
  const parsed = buildSearchQuery(q);
  if (!parsed) return null;

  return sql`ts_rank(search_vector, ${parsed.tsquery})`;
};

/**
 * Build a SQL WHERE condition that matches skills via full-text search
 * on the search_vector column OR via tag matching in skill_tags.
 */
export const buildSearchCondition = (q: string): SQL | null => {
  const parsed = buildSearchQuery(q);
  if (!parsed) return null;

  const sanitized = sanitizeTerm(q);
  const terms = sanitized.split(' ').filter((t) => t.length > 0);

  // Build ILIKE patterns for tag matching
  const tagConditions = terms.map(
    (term) => sql`EXISTS (
      SELECT 1 FROM skill_tags st
      WHERE st.skill_id = skills.id
      AND st.tag ILIKE ${'%' + term + '%'}
    )`,
  );

  // Combine: full-text match on search_vector OR any tag matches
  const ftsCondition = sql`search_vector @@ ${parsed.tsquery}`;

  if (tagConditions.length === 1) {
    return sql`(${ftsCondition} OR ${tagConditions[0]})`;
  }

  // Any tag term matching is enough to include the result
  const anyTagMatch = tagConditions.reduce((acc, cond) => sql`${acc} OR ${cond}`);

  return sql`(${ftsCondition} OR ${anyTagMatch})`;
};
