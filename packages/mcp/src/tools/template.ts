import { fetchTemplate, isApiClientError } from '../api-client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const formatTemplate = (template: { manifest: object; skill_md: string }): string => {
  const lines: string[] = [
    'SPM Skill Template\n',
    'Use this template as a starting point for creating a new skill.\n',
    '── manifest.json ──────────────────────────────────────────\n',
    JSON.stringify(template.manifest, null, 2),
    '\n── SKILL.md ───────────────────────────────────────────────\n',
    template.skill_md,
  ];

  return lines.join('\n');
};

export const registerTemplateTool = (server: McpServer, baseUrl: string): void => {
  server.tool(
    'spm_template',
    'Get the SPM skill template with manifest.json and SKILL.md to use as a starting point for creating a new skill',
    async () => {
      try {
        const response = await fetchTemplate(baseUrl);
        const text = formatTemplate(response);
        return { content: [{ type: 'text', text }] };
      } catch (err: unknown) {
        const message = isApiClientError(err) ? err.message : 'Failed to fetch skill template';
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
      }
    },
  );
};
