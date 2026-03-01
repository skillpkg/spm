import type { Database } from './db/index.js';

export type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  R2_BUCKET: R2Bucket;
  RATE_LIMIT_KV: KVNamespace;
  ENVIRONMENT: string;
};

export type JwtPayload = {
  sub: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
};

export type Variables = {
  db: Database;
  jwtPayload: JwtPayload;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
