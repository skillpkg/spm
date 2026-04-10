import { z } from 'zod';
import { fetchSkillInfo, isApiClientError } from '../api-client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CATEGORY_INFO, type SkillCategory } from '@spm/shared';

export const infoInputSchema = {
  name: z.string().describe('The skill name, e.g. "@scope/skill-name"'),
};

export const formatSkillInfo = (skill: {
  name: string;
  description: string;
  author: { username: string; trust_tier: string };
  categories: string[];
  license?: string;
  downloads: number;
  weekly_downloads?: number;
  rating_avg: number;
  rating_count: number;
  tags?: string[];
  platforms?: string[];
  imported_from?: string | null;
  latest_version?: { version: string } | null;
}): string => {
  const version = skill.latest_version?.version ?? 'unknown';
  const header = `${skill.name} v${version}`;
  const separator = '═'.repeat(Math.max(header.length, 23));
  const categoryDisplays = skill.categories.map((cat) => {
    const info = CATEGORY_INFO[cat as SkillCategory];
    return info ? info.display : cat;
  });
  const verifiedMark = skill.author.trust_tier === 'verified' ? ' (verified ✓)' : '';

  const lines: string[] = [
    header,
    separator,
    skill.description,
    '',
    `Author: ${skill.author.username}${verifiedMark}`,
    `Categories: ${categoryDisplays.join(', ')}`,
  ];

  if (skill.license) {
    lines.push(`License: ${skill.license}`);
  }

  const weeklyDl =
    skill.weekly_downloads != null ? ` (${skill.weekly_downloads.toLocaleString()} this week)` : '';
  lines.push(`Downloads: ${skill.downloads.toLocaleString()}${weeklyDl}`);
  lines.push(`Rating: ⭐ ${skill.rating_avg.toFixed(1)} (${skill.rating_count} reviews)`);

  if (skill.tags && skill.tags.length > 0) {
    lines.push('');
    lines.push(`Tags: ${skill.tags.join(', ')}`);
  }

  if (skill.platforms && skill.platforms.length > 0) {
    lines.push(`Platforms: ${skill.platforms.join(', ')}`);
  }

  if (skill.imported_from) {
    lines.push('');
    lines.push(`Imported from: ${skill.imported_from}`);
  }

  lines.push('');
  lines.push(`Install: spm install "${skill.name}"`);

  return lines.join('\n');
};

export const registerInfoTool = (server: McpServer, baseUrl: string): void => {
  server.tool(
    'spm_info',
    'Get detailed information about a specific SPM skill',
    infoInputSchema,
    async (args) => {
      try {
        const skill = await fetchSkillInfo(baseUrl, args.name);
        const text = formatSkillInfo(skill);
        return { content: [{ type: 'text', text }] };
      } catch (err: unknown) {
        const message = isApiClientError(err) ? err.message : 'Failed to fetch skill info';
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
      }
    },
  );
};
