import { cors } from 'hono/cors';

export const corsMiddleware = (env: string) =>
  cors({
    origin: (origin) => {
      const allowed = ['https://spm.dev', 'https://admin.spm.dev'];

      if (env !== 'production') {
        if (origin.startsWith('http://localhost:') || origin === 'http://localhost') {
          return origin;
        }
      }

      if (allowed.includes(origin)) {
        return origin;
      }

      return null;
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
  });
