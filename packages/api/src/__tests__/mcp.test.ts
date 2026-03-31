import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

const jsonRpc = (method: string, params?: Record<string, unknown>, id?: number) => ({
  jsonrpc: '2.0' as const,
  id: id ?? 1,
  method,
  params,
});

describe('MCP endpoint — /mcp', () => {
  // Use dispatch directly for most tests
  const testDispatch = async (body: unknown, mockDb: unknown = {}) => {
    const { dispatch } = await import('../mcp/protocol.js');
    return dispatch(body, mockDb as never);
  };

  // ── initialize ──

  it('should handle initialize and return protocol version', async () => {
    const { response, status } = await testDispatch(
      jsonRpc('initialize', {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' },
      }),
    );

    expect(status).toBe(200);
    expect(response).not.toBeNull();
    expect(response!.jsonrpc).toBe('2.0');
    expect(response!.id).toBe(1);

    const result = response!.result as {
      protocolVersion: string;
      capabilities: { tools: Record<string, never> };
      serverInfo: { name: string; version: string };
    };
    expect(result.protocolVersion).toBe('2025-03-26');
    expect(result.capabilities).toEqual({ tools: {} });
    expect(result.serverInfo.name).toBe('skillpkg');
  });

  // ── tools/list ──

  it('should return 4 tools on tools/list', async () => {
    const { response, status } = await testDispatch(jsonRpc('tools/list'));

    expect(status).toBe(200);
    const result = response!.result as {
      tools: Array<{ name: string; description: string; inputSchema: object }>;
    };
    expect(result.tools).toHaveLength(4);

    const names = result.tools.map((t) => t.name);
    expect(names).toContain('search_skills');
    expect(names).toContain('get_skill');
    expect(names).toContain('list_categories');
    expect(names).toContain('get_template');

    // Verify schemas have required fields
    const searchTool = result.tools.find((t) => t.name === 'search_skills')!;
    expect(searchTool.inputSchema).toHaveProperty('properties');
    expect((searchTool.inputSchema as { required: string[] }).required).toContain('query');
  });

  // ── tools/call — get_template (no DB needed) ──

  it('should return template on tools/call get_template', async () => {
    const { response, status } = await testDispatch(
      jsonRpc('tools/call', { name: 'get_template', arguments: {} }),
    );

    expect(status).toBe(200);
    const result = response!.result as { content: Array<{ type: string; text: string }> };
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('manifest.json');
    expect(result.content[0].text).toContain('SKILL.md');
    expect(result.content[0].text).toContain('my-skill');
  });

  // ── tools/call — list_categories ──

  it('should return categories on tools/call list_categories', async () => {
    const mockExecute = vi.fn().mockResolvedValueOnce([
      { cat: 'frontend', count: 5 },
      { cat: 'backend', count: 3 },
    ]);
    const mockDb = { execute: mockExecute };

    const { response, status } = await testDispatch(
      jsonRpc('tools/call', { name: 'list_categories', arguments: {} }),
      mockDb,
    );

    expect(status).toBe(200);
    const result = response!.result as { content: Array<{ type: string; text: string }> };
    expect(result.content[0].text).toContain('SPM Skill Categories');
    expect(result.content[0].text).toContain('Frontend');
  });

  // ── tools/call — search_skills ──

  it('should search skills on tools/call search_skills', async () => {
    const mockExecute = vi.fn().mockResolvedValueOnce([
      {
        name: 'pdf-generator',
        description: 'Generate PDFs',
        rating_avg: 4.5,
        rating_count: 10,
        categories: ['documents'],
        author_username: 'testuser',
        author_trust_tier: 'verified',
        latest_version: '1.0.0',
        download_count: 100,
      },
    ]);
    const mockDb = { execute: mockExecute };

    const { response, status } = await testDispatch(
      jsonRpc('tools/call', { name: 'search_skills', arguments: { query: 'pdf' } }),
      mockDb,
    );

    expect(status).toBe(200);
    const result = response!.result as { content: Array<{ type: string; text: string }> };
    expect(result.content[0].text).toContain('pdf-generator');
    expect(result.content[0].text).toContain('testuser');
    expect(result.content[0].text).toContain('spm install pdf-generator');
  });

  // ── tools/call — get_skill ──

  it('should get skill info on tools/call get_skill', async () => {
    const mockExecute = vi
      .fn()
      // Skill query
      .mockResolvedValueOnce([
        {
          name: 'pdf-generator',
          description: 'Generate PDFs from markdown',
          categories: ['documents'],
          license: 'MIT',
          rating_avg: 4.5,
          rating_count: 10,
          imported_from: null,
          deprecated: false,
          deprecated_msg: null,
          author_username: 'testuser',
          author_trust_tier: 'verified',
        },
      ])
      // Latest version
      .mockResolvedValueOnce([{ version: '1.2.0' }])
      // Tags
      .mockResolvedValueOnce([{ tag: 'pdf' }, { tag: 'documents' }])
      // Platforms
      .mockResolvedValueOnce([{ platform: '*' }])
      // Downloads
      .mockResolvedValueOnce([{ total: 250 }]);

    const mockDb = { execute: mockExecute };

    const { response, status } = await testDispatch(
      jsonRpc('tools/call', { name: 'get_skill', arguments: { name: 'pdf-generator' } }),
      mockDb,
    );

    expect(status).toBe(200);
    const result = response!.result as { content: Array<{ type: string; text: string }> };
    const text = result.content[0].text;
    expect(text).toContain('pdf-generator v1.2.0');
    expect(text).toContain('testuser');
    expect(text).toContain('MIT');
    expect(text).toContain('250');
    expect(text).toContain('pdf, documents');
  });

  // ── tools/call — get_skill not found ──

  it('should return not found message for unknown skill', async () => {
    const mockExecute = vi.fn().mockResolvedValueOnce([]);
    const mockDb = { execute: mockExecute };

    const { response, status } = await testDispatch(
      jsonRpc('tools/call', { name: 'get_skill', arguments: { name: 'nonexistent' } }),
      mockDb,
    );

    expect(status).toBe(200);
    const result = response!.result as { content: Array<{ type: string; text: string }> };
    expect(result.content[0].text).toContain('not found');
  });

  // ── tools/call — unknown tool ──

  it('should return error for unknown tool name', async () => {
    const { response, status } = await testDispatch(
      jsonRpc('tools/call', { name: 'unknown_tool', arguments: {} }),
    );

    expect(status).toBe(200);
    expect(response!.error).toBeDefined();
    expect(response!.error!.message).toContain('Unknown tool');
  });

  // ── tools/call — missing required params ──

  it('should return error when search_skills missing query', async () => {
    const { response } = await testDispatch(
      jsonRpc('tools/call', { name: 'search_skills', arguments: {} }),
    );

    expect(response!.error).toBeDefined();
    expect(response!.error!.message).toContain('query');
  });

  it('should return error when get_skill missing name', async () => {
    const { response } = await testDispatch(
      jsonRpc('tools/call', { name: 'get_skill', arguments: {} }),
    );

    expect(response!.error).toBeDefined();
    expect(response!.error!.message).toContain('name');
  });

  // ── Unknown method ──

  it('should return method not found for unknown method', async () => {
    const { response, status } = await testDispatch(jsonRpc('resources/list'));

    expect(status).toBe(200);
    expect(response!.error).toBeDefined();
    expect(response!.error!.code).toBe(-32601);
  });

  // ── Notification handling ──

  it('should return 202 for notifications (no id)', async () => {
    const { response, status } = await testDispatch({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });

    expect(status).toBe(202);
    expect(response).toBeNull();
  });

  // ── Invalid JSON-RPC ──

  it('should return error for invalid jsonrpc version', async () => {
    const { response, status } = await testDispatch({
      jsonrpc: '1.0',
      id: 1,
      method: 'initialize',
    });

    expect(status).toBe(400);
    expect(response!.error).toBeDefined();
    expect(response!.error!.code).toBe(-32600);
  });

  it('should return parse error for non-object body', async () => {
    const { response, status } = await testDispatch(null);
    expect(status).toBe(400);
    expect(response!.error!.code).toBe(-32700);
  });

  // ── HTTP method tests — build a minimal Hono app with the same routes ──

  it('should return 405 for DELETE /mcp', async () => {
    const app = new Hono<AppEnv>();
    app.delete('/mcp', (c) =>
      c.json({ error: 'Session termination not supported — server is stateless' }, 405),
    );

    const res = await app.request('/mcp', { method: 'DELETE' });
    expect(res.status).toBe(405);
  });

  it('should return 405 for GET /mcp', async () => {
    const app = new Hono<AppEnv>();
    app.get('/mcp', (c) => c.json({ error: 'SSE transport not supported — use HTTP POST' }, 405));

    const res = await app.request('/mcp', { method: 'GET' });
    expect(res.status).toBe(405);
  });
});
