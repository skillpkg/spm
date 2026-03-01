#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerSearchTool } from './tools/search.js';
import { registerInfoTool } from './tools/info.js';
import { registerCategoriesTool } from './tools/categories.js';

const DEFAULT_REGISTRY_URL = 'https://registry.spm.dev/api/v1';

const main = async (): Promise<void> => {
  const baseUrl = process.env['SPM_REGISTRY_URL'] ?? DEFAULT_REGISTRY_URL;

  const server = new McpServer({
    name: 'spm-registry',
    version: '0.0.1',
  });

  registerSearchTool(server, baseUrl);
  registerInfoTool(server, baseUrl);
  registerCategoriesTool(server, baseUrl);

  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((err: unknown) => {
  console.error('Failed to start SPM MCP server:', err);
  process.exit(1);
});
