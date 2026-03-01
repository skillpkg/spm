import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { healthRoutes } from './health.js';
import { authRoutes } from './auth.js';
import { skillsRoutes } from './skills.js';
import { downloadRoutes } from './download.js';
import { categoriesRoutes } from './categories.js';
import { trendingRoutes } from './trending.js';
import { resolveRoutes } from './resolve.js';
import { reviewsRoutes } from './reviews.js';
import { authorsRoutes } from './authors.js';
import { reportsRoutes } from './reports.js';

export const createRouter = () => {
  const router = new Hono<AppEnv>();

  // Phase 2 routes
  router.route('/', healthRoutes);
  router.route('/', authRoutes);
  router.route('/', skillsRoutes);
  router.route('/', downloadRoutes);

  // Phase 3 routes
  router.route('/', categoriesRoutes);
  router.route('/', trendingRoutes);
  router.route('/', resolveRoutes);
  router.route('/', reviewsRoutes);
  router.route('/', authorsRoutes);
  router.route('/', reportsRoutes);

  // TODO: Phase 3+ routes
  // router.route('/', adminRoutes);

  return router;
};
