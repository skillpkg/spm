import { cors } from 'hono/cors';

export const corsMiddleware = (env: string) =>
  cors({
    origin: (origin) => {
      const allowed = [
        'https://skillpkg.dev',
        'https://admin.skillpkg.dev',
        'https://staging.skillpkg.dev',
        'https://staging-admin.skillpkg.dev',
      ];

      if (env !== 'production') {
        if (origin.startsWith('http://localhost:') || origin === 'http://localhost') {
          return origin;
        }
      }

      if (allowed.includes(origin)) {
        return origin;
      }

      // Allow Cloudflare Pages preview deployments (prod + staging)
      if (
        origin.endsWith('.spm-web.pages.dev') ||
        origin.endsWith('.spm-admin.pages.dev') ||
        origin.endsWith('.spm-web-staging.pages.dev') ||
        origin.endsWith('.spm-admin-staging.pages.dev')
      ) {
        return origin;
      }

      return null;
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
  });
