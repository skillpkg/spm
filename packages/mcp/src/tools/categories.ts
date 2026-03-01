import { fetchCategories, isApiClientError } from '../api-client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const formatCategories = (
  categories: {
    icon: string;
    display: string;
    skill_count: number;
    description: string;
  }[],
): string => {
  const lines: string[] = ['SPM Skill Categories:\n'];

  for (const cat of categories) {
    lines.push(`${cat.icon} ${cat.display} (${cat.skill_count} skills) — ${cat.description}`);
  }

  return lines.join('\n');
};

export const registerCategoriesTool = (server: McpServer, baseUrl: string): void => {
  server.tool('spm_categories', 'List all SPM skill categories', async () => {
    try {
      const categories = await fetchCategories(baseUrl);
      const text = formatCategories(categories);
      return { content: [{ type: 'text', text }] };
    } catch (err: unknown) {
      const message = isApiClientError(err) ? err.message : 'Failed to fetch categories';
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  });
};
