import { CATEGORY_INFO } from '@spm/shared';
import type { SkillCategory } from '@spm/shared';

export const formatSearchResults = (
  query: string,
  results: {
    name: string;
    version: string;
    rating_avg: number;
    rating_count: number;
    downloads: number;
    description: string;
    author: { username: string; trust_tier: string };
  }[],
): string => {
  if (results.length === 0) {
    return `No skills found matching "${query}".`;
  }

  const lines: string[] = [`Found ${results.length} skills matching "${query}":\n`];

  results.forEach((skill, i) => {
    const stars = `⭐ ${skill.rating_avg.toFixed(1)}`;
    const reviews = `(${skill.rating_count} reviews)`;
    const dl = `↓ ${skill.downloads.toLocaleString()}`;
    const trust = skill.author.trust_tier === 'verified' ? ' ✓' : '';
    lines.push(
      `${i + 1}. ${skill.name} v${skill.version} by ${skill.author.username}${trust} ${stars} ${reviews} ${dl}`,
    );
    lines.push(`   ${skill.description}`);
    lines.push(`   Install: spm install ${skill.name}`);
    lines.push('');
  });

  return lines.join('\n').trimEnd();
};

export const formatSkillInfo = (skill: {
  name: string;
  description: string;
  author: { username: string; trust_tier: string };
  categories: string[];
  license?: string;
  downloads: number;
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

  lines.push(`Downloads: ${skill.downloads.toLocaleString()}`);
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
  lines.push(`Install: spm install ${skill.name}`);

  return lines.join('\n');
};

export const formatCategories = (
  categories: {
    slug: string;
    icon: string;
    display: string;
    count: number;
  }[],
): string => {
  const lines: string[] = ['SPM Skill Categories:\n'];

  for (const cat of categories) {
    const info = CATEGORY_INFO[cat.slug as SkillCategory];
    const description = info?.description ?? '';
    lines.push(`${cat.icon} ${cat.display} (${cat.count} skills) — ${description}`);
  }

  return lines.join('\n');
};

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
