import { Hono } from 'hono';
import type { AppEnv } from '../../types.js';
import { authed, adminGuard } from '../../middleware/auth.js';
import { queueRoutes } from './queue.js';
import { skillsRoutes } from './skills.js';
import { usersRoutes } from './users.js';
import { reportsRoutes } from './reports.js';
import { statsRoutes } from './stats.js';
import { errorsRoutes } from './errors.js';

export const adminRoutes = new Hono<AppEnv>();

// Apply auth + admin guard to ALL admin routes
adminRoutes.use('*', authed);
adminRoutes.use('*', adminGuard);

// Mount sub-routers
adminRoutes.route('/', queueRoutes);
adminRoutes.route('/', skillsRoutes);
adminRoutes.route('/', usersRoutes);
adminRoutes.route('/', reportsRoutes);
adminRoutes.route('/', statsRoutes);
adminRoutes.route('/', errorsRoutes);
