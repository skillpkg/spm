import { Command } from 'commander';
import { TRUST_TIER_INFO } from '@spm/shared';
import type { TrustTier } from '@spm/shared';
import { icons, c, log, logJson, getOutputMode, withSpinner } from '../lib/output.js';
import { createApiClient } from '../lib/api-client.js';
import { loadConfig } from '../lib/config.js';

// -- Types for API responses --

interface SearchSkillResult {
  name: string;
  version: string;
  description: string;
  author: string;
  trust_tier: TrustTier;
  signed: boolean;
  downloads: number;
  rating: number;
  review_count: number;
  platforms: string[];
  categories: string[];
  updated_at: string;
}

interface SearchResponse {
  results: SearchSkillResult[];
  total: number;
  page: number;
  per_page: number;
}

// -- Formatters --

const formatDownloads = (n: number): string => n.toLocaleString('en-US');

const formatTrustBadge = (tier: TrustTier): string => {
  const info = TRUST_TIER_INFO[tier];
  return c.trust(`${info.badge} ${info.display}`);
};

const formatRating = (rating: number, reviewCount: number): string => {
  if (reviewCount === 0) return c.dim('No ratings');
  return `${c.dim('\u2605')} ${rating.toFixed(1)}`;
};

const formatSignedBadge = (signed: boolean): string => {
  return signed ? c.trust('\u2713 Signed') : '';
};

const formatPlatforms = (platforms: string[]): string => {
  if (platforms.length === 0 || (platforms.length === 1 && platforms[0] === '*')) {
    return 'all';
  }
  return platforms.join(', ');
};

// -- Command --

export const registerSearchCommand = (program: Command): void => {
  program
    .command('search <query>')
    .description('Search for skills in the registry')
    .option('--category <slug>', 'filter by category')
    .option('--trust <tier>', 'minimum trust tier')
    .option('--platform <name>', 'filter by platform')
    .option('--sort <field>', 'sort by: relevance, downloads, rating, updated, new', 'relevance')
    .option('--security <level>', 'filter by security level (full, partial, any)', 'any')
    .option('--page <n>', 'page number', '1')
    .option('--per-page <n>', 'results per page', '20')
    .action(
      async (
        query: string,
        opts: {
          category?: string;
          trust?: string;
          platform?: string;
          sort?: string;
          security?: string;
          page?: string;
          perPage?: string;
        },
      ) => {
        const mode = getOutputMode();
        if (mode === 'silent') return;

        const config = loadConfig();
        const api = createApiClient(config);

        const params: Record<string, string | number> = {
          q: query,
          sort: opts.sort ?? 'relevance',
          page: parseInt(opts.page ?? '1', 10),
          per_page: parseInt(opts.perPage ?? '20', 10),
        };

        if (opts.category) params.category = opts.category;
        if (opts.trust) params.trust = opts.trust;
        if (opts.platform) params.platform = opts.platform;
        if (opts.security && opts.security !== 'any') params.security = opts.security;

        const data = await withSpinner<SearchResponse>(
          'Searching registry...',
          () => api.searchSkills(params) as Promise<SearchResponse>,
        );

        if (mode === 'json') {
          logJson(data);
          return;
        }

        if (data.results.length === 0) {
          log('');
          log(`  ${icons.info} No skills found for "${query}"`);
          log('');
          if (opts.category || opts.trust || opts.platform) {
            log(`  ${c.hint('Try removing some filters to broaden your search.')}`);
          } else {
            log(
              `  ${c.hint('Try different keywords or browse categories with: spm search --category <slug>')}`,
            );
          }
          log('');
          return;
        }

        log('');

        for (const skill of data.results) {
          const nameVersion = c.name(`${skill.name}@${skill.version}`);
          const downloads = c.dim(`\u2B07 ${formatDownloads(skill.downloads)}`);
          const rating = formatRating(skill.rating, skill.review_count);

          log(`  ${icons.package} ${nameVersion}  ${downloads}  ${rating}`);
          log(`     ${skill.description}`);

          const authorPart = c.dim(`by @${skill.author}`);
          const trustPart = formatTrustBadge(skill.trust_tier);
          const signedPart = formatSignedBadge(skill.signed);
          const parts = [authorPart, trustPart, signedPart].filter(Boolean);
          log(`     ${parts.join(c.dim(' \u00b7 '))}`);

          log(`     ${c.dim('Platforms:')} ${formatPlatforms(skill.platforms)}`);
          log('');
        }

        // Footer
        const filterParts: string[] = [];
        if (opts.category) filterParts.push(`category=${opts.category}`);
        if (opts.trust) filterParts.push(`trust\u2265${opts.trust}`);
        if (opts.platform) filterParts.push(`platform=${opts.platform}`);
        if (opts.security && opts.security !== 'any') filterParts.push(`security=${opts.security}`);

        const sortLabel =
          opts.sort !== 'relevance'
            ? ` \u00b7 Sorted by ${opts.sort}`
            : ' \u00b7 Sorted by relevance';
        const filterLabel =
          filterParts.length > 0 ? ` \u00b7 Filtered: ${filterParts.join(', ')}` : '';

        log(`  ${data.total} result${data.total === 1 ? '' : 's'}${sortLabel}${filterLabel}`);
        log(`  Install: ${c.cmd('spm install <name>')}`);
        log('');
      },
    );
};
