import { z } from 'zod';
import { fetchSkills, isApiClientError } from '../api-client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const searchInputSchema = {
  query: z.string().describe('Search query for skills'),
  category: z.string().optional().describe('Filter by category slug'),
  limit: z.number().optional().describe('Max results to return (default 10)'),
};

export const formatSearchResults = (
  query: string,
  skills: {
    name: string;
    version: string;
    rating: number;
    review_count: number;
    downloads: number;
    description: string;
  }[],
): string => {
  if (skills.length === 0) {
    return `No skills found matching "${query}".`;
  }

  const lines: string[] = [`Found ${skills.length} skills matching "${query}":\n`];

  skills.forEach((skill, i) => {
    const stars = `⭐ ${skill.rating.toFixed(1)}`;
    const reviews = `(${skill.review_count} reviews)`;
    const dl = `↓ ${skill.downloads.toLocaleString()}`;
    lines.push(`${i + 1}. ${skill.name} v${skill.version} ${stars} ${reviews} ${dl}`);
    lines.push(`   ${skill.description}`);
    lines.push(`   Install: spm install ${skill.name}`);
    lines.push('');
  });

  return lines.join('\n').trimEnd();
};

export const registerSearchTool = (server: McpServer, baseUrl: string): void => {
  server.tool(
    'spm_search',
    'Search the SPM registry for AI agent skills',
    searchInputSchema,
    async (args) => {
      try {
        const response = await fetchSkills(baseUrl, {
          q: args.query,
          category: args.category,
          per_page: args.limit ?? 10,
        });

        const text = formatSearchResults(args.query, response.skills);

        return { content: [{ type: 'text', text }] };
      } catch (err: unknown) {
        const message = isApiClientError(err) ? err.message : 'Failed to search skills';
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
      }
    },
  );
};
