import type { Database } from '../db/index.js';
import {
  TOOL_DEFINITIONS,
  searchSkills,
  getSkillInfo,
  listCategories,
  getTemplate,
} from './tools.js';

const PROTOCOL_VERSION = '2025-03-26';

const SERVER_INFO = {
  name: 'skillpkg',
  version: '0.1.0',
};

// JSON-RPC 2.0 types
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// MCP error codes
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

const makeError = (id: string | number | null, code: number, message: string): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  error: { code, message },
});

const makeResult = (id: string | number | null, result: unknown): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  result,
});

const handleInitialize = (id: string | number | null): JsonRpcResponse =>
  makeResult(id, {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: { tools: {} },
    serverInfo: SERVER_INFO,
  });

const handleToolsList = (id: string | number | null): JsonRpcResponse =>
  makeResult(id, { tools: TOOL_DEFINITIONS });

const handleToolsCall = async (
  id: string | number | null,
  params: Record<string, unknown> | undefined,
  db: Database,
): Promise<JsonRpcResponse> => {
  const toolName = params?.name as string | undefined;
  const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>;

  if (!toolName) {
    return makeError(id, INVALID_PARAMS, 'Missing "name" in tools/call params');
  }

  try {
    let text: string;

    switch (toolName) {
      case 'search_skills':
        if (typeof toolArgs.query !== 'string' || toolArgs.query.length === 0) {
          return makeError(id, INVALID_PARAMS, 'search_skills requires a non-empty "query" string');
        }
        text = await searchSkills(db, {
          query: toolArgs.query,
          category: typeof toolArgs.category === 'string' ? toolArgs.category : undefined,
          limit: typeof toolArgs.limit === 'number' ? toolArgs.limit : undefined,
        });
        break;

      case 'get_skill':
        if (typeof toolArgs.name !== 'string' || toolArgs.name.length === 0) {
          return makeError(id, INVALID_PARAMS, 'get_skill requires a non-empty "name" string');
        }
        text = await getSkillInfo(db, { name: toolArgs.name });
        break;

      case 'list_categories':
        text = await listCategories(db);
        break;

      case 'get_template':
        text = getTemplate();
        break;

      default:
        return makeError(id, METHOD_NOT_FOUND, `Unknown tool: ${toolName}`);
    }

    return makeResult(id, {
      content: [{ type: 'text', text }],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Tool execution failed';
    return makeResult(id, {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    });
  }
};

/**
 * Dispatch a JSON-RPC 2.0 request to the appropriate MCP handler.
 * Returns null for notifications (no id) that don't need a response body.
 */
export const dispatch = async (
  body: unknown,
  db: Database,
): Promise<{ response: JsonRpcResponse | null; status: number }> => {
  if (!body || typeof body !== 'object') {
    return { response: makeError(null, PARSE_ERROR, 'Parse error'), status: 400 };
  }

  const req = body as JsonRpcRequest;

  if (req.jsonrpc !== '2.0') {
    return {
      response: makeError(req.id ?? null, INVALID_REQUEST, 'Invalid JSON-RPC version'),
      status: 400,
    };
  }

  // Notifications (no id) — acknowledge without response body
  if (req.id === undefined || req.id === null) {
    // Notifications like "notifications/initialized" — just accept
    return { response: null, status: 202 };
  }

  switch (req.method) {
    case 'initialize':
      return { response: handleInitialize(req.id), status: 200 };

    case 'tools/list':
      return { response: handleToolsList(req.id), status: 200 };

    case 'tools/call':
      return { response: await handleToolsCall(req.id, req.params, db), status: 200 };

    default:
      return {
        response: makeError(req.id, METHOD_NOT_FOUND, `Unknown method: ${req.method}`),
        status: 200,
      };
  }
};
