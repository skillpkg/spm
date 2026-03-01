import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { healthRoutes } from './health.js';
import { authRoutes } from './auth.js';
import { skillsRoutes } from './skills.js';
import { downloadRoutes } from './download.js';

export const createRouter = () => {
  const router = new Hono<AppEnv>();

  // Phase 2 routes
  router.route('/', healthRoutes);
  router.route('/', authRoutes);
  router.route('/', skillsRoutes);
  router.route('/', downloadRoutes);

  // TODO: Phase 3+ routes
  // router.route('/', categoriesRoutes);
  // router.route('/', reviewsRoutes);
  // router.route('/', authorsRoutes);
  // router.route('/', trendingRoutes);
  // router.route('/', resolveRoutes);
  // router.route('/', reportsRoutes);
  // router.route('/', adminRoutes);

  return router;
};
