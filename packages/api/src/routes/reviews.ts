import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, asc, count, avg } from 'drizzle-orm';
import { ReviewRequestSchema, ERROR_CODES, createApiError } from '@spm/shared';
import type { AppEnv } from '../types.js';
import { authed } from '../middleware/auth.js';
import { skills, reviews, users } from '../db/schema.js';

export const reviewsRoutes = new Hono<AppEnv>();

// ── GET /skills/:name/reviews ──

const ReviewsQuerySchema = z.object({
  sort: z.enum(['recent', 'rating_high', 'rating_low']).optional().default('recent'),
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

reviewsRoutes.get('/skills/:name/reviews', zValidator('query', ReviewsQuerySchema), async (c) => {
  const db = c.get('db');
  const name = c.req.param('name');
  const { sort, page, per_page } = c.req.valid('query');
  const offset = (page - 1) * per_page;

  // Find the skill
  const [skill] = await db
    .select({ id: skills.id, ratingAvg: skills.ratingAvg, ratingCount: skills.ratingCount })
    .from(skills)
    .where(eq(skills.name, name))
    .limit(1);

  if (!skill) {
    return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
  }

  // Total count
  const [totalRow] = await db
    .select({ total: count() })
    .from(reviews)
    .where(eq(reviews.skillId, skill.id));

  // Rating distribution
  const distributionRows = await db
    .select({
      rating: reviews.rating,
      count: count(),
    })
    .from(reviews)
    .where(eq(reviews.skillId, skill.id))
    .groupBy(reviews.rating);

  const ratingDistribution: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
  for (const row of distributionRows) {
    ratingDistribution[String(row.rating)] = row.count;
  }

  // Sort order
  let orderBy;
  switch (sort) {
    case 'rating_high':
      orderBy = desc(reviews.rating);
      break;
    case 'rating_low':
      orderBy = asc(reviews.rating);
      break;
    case 'recent':
    default:
      orderBy = desc(reviews.createdAt);
      break;
  }

  // Fetch reviews
  const reviewRows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      userId: reviews.userId,
    })
    .from(reviews)
    .where(eq(reviews.skillId, skill.id))
    .orderBy(orderBy)
    .limit(per_page)
    .offset(offset);

  // Enrich with user info
  const enrichedReviews = await Promise.all(
    reviewRows.map(async (row) => {
      const [user] = await db
        .select({ username: users.username, trustTier: users.trustTier })
        .from(users)
        .where(eq(users.id, row.userId))
        .limit(1);

      return {
        id: row.id,
        user: {
          username: user?.username ?? 'unknown',
          trust_tier: user?.trustTier ?? 'registered',
        },
        rating: row.rating,
        comment: row.comment,
        created_at: row.createdAt.toISOString(),
      };
    }),
  );

  return c.json({
    skill: name,
    rating_avg: skill.ratingAvg,
    rating_count: skill.ratingCount,
    rating_distribution: ratingDistribution,
    reviews: enrichedReviews,
    total: totalRow.total,
    page,
  });
});

// ── POST /skills/:name/reviews ──

reviewsRoutes.post(
  '/skills/:name/reviews',
  authed,
  zValidator('json', ReviewRequestSchema),
  async (c) => {
    const db = c.get('db');
    const jwt = c.get('jwtPayload');
    const userId = jwt.sub;
    const name = c.req.param('name');
    const body = c.req.valid('json');

    // Find the skill
    const [skill] = await db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.name, name))
      .limit(1);

    if (!skill) {
      return c.json(createApiError('SKILL_NOT_FOUND'), ERROR_CODES.SKILL_NOT_FOUND.status);
    }

    // Upsert review (one per user per skill)
    const [review] = await db
      .insert(reviews)
      .values({
        skillId: skill.id,
        userId,
        rating: body.rating,
        comment: body.comment,
      })
      .onConflictDoUpdate({
        target: [reviews.skillId, reviews.userId],
        set: {
          rating: body.rating,
          comment: body.comment,
          updatedAt: new Date(),
        },
      })
      .returning({ id: reviews.id, createdAt: reviews.createdAt });

    // Recalculate skill's rating stats
    const [stats] = await db
      .select({
        avgRating: avg(reviews.rating),
        countRating: count(),
      })
      .from(reviews)
      .where(eq(reviews.skillId, skill.id));

    await db
      .update(skills)
      .set({
        ratingAvg: stats.avgRating ? Number(stats.avgRating) : 0,
        ratingCount: stats.countRating,
        updatedAt: new Date(),
      })
      .where(eq(skills.id, skill.id));

    return c.json(
      {
        id: review.id,
        skill: name,
        rating: body.rating,
        created_at: review.createdAt.toISOString(),
      },
      201,
    );
  },
);
