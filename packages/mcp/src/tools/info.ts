import { z } from 'zod';
import { fetchSkillInfo, isApiClientError } from '../api-client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CATEGORY_INFO, type SkillCategory } from '@spm/shared';

export const infoInputSchema = {
  name: z.string().describe('The name of the skill to get info about'),
};

export const formatSkillInfo = (skill: {
  name: string;
  version: string;
  description: string;
  author: string;
  verified?: boolean;
  category: string;
  license?: string;
  downloads: number;
  downloads_this_week?: number;
  rating: number;
  review_count: number;
  keywords?: string[];
  platforms?: string[];
}): string => {
  const header = `${skill.name} v${skill.version}`;
  const separator = '═'.repeat(Math.max(header.length, 23));
  const categoryInfo = CATEGORY_INFO[skill.category as SkillCategory];
  const categoryDisplay = categoryInfo ? categoryInfo.display : skill.category;
  const verifiedMark = skill.verified ? ' (verified ✓)' : '';

  const lines: string[] = [
    header,
    separator,
    skill.description,
    '',
    `Author: ${skill.author}${verifiedMark}`,
    `Category: ${categoryDisplay}`,
  ];

  if (skill.license) {
    lines.push(`License: ${skill.license}`);
  }

  const weeklyDl =
    skill.downloads_this_week != null
      ? ` (${skill.downloads_this_week.toLocaleString()} this week)`
      : '';
  lines.push(`Downloads: ${skill.downloads.toLocaleString()}${weeklyDl}`);
  lines.push(`Rating: ⭐ ${skill.rating.toFixed(1)} (${skill.review_count} reviews)`);

  if (skill.keywords && skill.keywords.length > 0) {
    lines.push('');
    lines.push(`Tags: ${skill.keywords.join(', ')}`);
  }

  if (skill.platforms && skill.platforms.length > 0) {
    lines.push(`Platforms: ${skill.platforms.join(', ')}`);
  }

  lines.push('');
  lines.push(`Install: spm install ${skill.name}`);

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
