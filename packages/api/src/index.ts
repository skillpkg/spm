import { Hono } from 'hono';
import type { AppEnv } from './types.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/error-handler.js';
import { createDb } from './db/index.js';
import { createRouter } from './routes/index.js';

const app = new Hono<AppEnv>().basePath('/api/v1');

// Global middleware: CORS
app.use('*', async (c, next) => {
  const middleware = corsMiddleware(c.env.ENVIRONMENT);
  return middleware(c, next);
});

// Global middleware: inject DB into context
app.use('*', async (c, next) => {
  const db = createDb(c.env.DATABASE_URL);
  c.set('db', db);
  await next();
});

// Global error handler
app.onError(errorHandler);

// Mount all routes
app.route('/', createRouter());

export default app;
