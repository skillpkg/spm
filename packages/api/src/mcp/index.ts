import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from '../types.js';
import { createDb } from '../db/index.js';
import { dispatch } from './protocol.js';

export const mcpApp = new Hono<AppEnv>();

// Permissive CORS for MCP — Claude infra and other MCP clients need access
mcpApp.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['POST', 'DELETE', 'GET', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
  }),
);

// Inject DB
mcpApp.use('*', async (c, next) => {
  const db = createDb(c.env.DATABASE_URL);
  c.set('db', db);
  await next();
});

// POST /mcp — main Streamable HTTP MCP endpoint
mcpApp.post('/', async (c) => {
  const db = c.get('db');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      400,
    );
  }

  const { response, status } = await dispatch(body, db);

  if (response === null) {
    // Notification — 202 Accepted with no body
    return c.body(null, 202);
  }

  return c.json(response, status as 200);
});

// DELETE /mcp — session termination (not supported for stateless server)
mcpApp.delete('/', (c) => {
  return c.json({ error: 'Session termination not supported — server is stateless' }, 405);
});

// GET /mcp — SSE (not supported)
mcpApp.get('/', (c) => {
  return c.json({ error: 'SSE transport not supported — use HTTP POST' }, 405);
});
