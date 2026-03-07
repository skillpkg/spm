import { Command } from 'commander';
import { TRUST_TIER_INFO } from '@spm/shared';
import type { TrustTier } from '@spm/shared';
import { icons, c, log, logJson, getOutputMode, withSpinner } from '../lib/output.js';
import { createApiClient } from '../lib/api-client.js';
import { loadConfig } from '../lib/config.js';

// -- Types for API responses --

interface ScanLayer {
  layer: number;
  name: string;
  status: string;
  confidence: number | null;
}

interface SkillSecurity {
  scan_status?: string;
  scan_security_level?: string;
  scan_layers?: ScanLayer[];
}

interface SkillVersion {
  version: string;
  created_at: string;
  latest: boolean;
}

interface SkillDetail {
  name: string;
  version: string;
  description: string;
  author: string;
  trust_tier: TrustTier;
  signed: boolean;
  signer?: string;
  scanned: boolean;
  verified: boolean;
  license?: string;
  downloads: number;
  downloads_week: number;
  rating: number;
  review_count: number;
  platforms: string[];
  categories: string[];
  repository?: string;
  published_at: string;
  versions: SkillVersion[];
  security?: SkillSecurity;
}

// -- Formatters --

const formatDownloads = (n: number): string => n.toLocaleString('en-US');

const formatTrustBadge = (tier: TrustTier): string => {
  const info = TRUST_TIER_INFO[tier];
  return `${info.badge} ${info.display}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
};

const formatRelativeDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
};

const formatPlatforms = (platforms: string[]): string => {
  if (platforms.length === 0 || (platforms.length === 1 && platforms[0] === '*')) {
    return 'all';
  }
  return platforms.join(', ');
};

const formatSecurityLevel = (security?: SkillSecurity): string => {
  if (!security?.scan_security_level) return c.dim('Unscanned');
  const level = security.scan_security_level;
  const layers = security.scan_layers ?? [];
  const passedCount = layers.filter((l) => l.status === 'passed').length;
  const totalCount = 3;

  if (level === 'full') return c.trust(`Full (${passedCount}/${totalCount} layers)`);
  if (level === 'partial') return c.warn(`Partial (${passedCount}/${totalCount} layers)`);
  if (level === 'flagged') return c.err(`Flagged`);
  if (level === 'blocked') return c.err(`Blocked`);
  return c.dim('Unscanned');
};

// -- Command --

export const registerInfoCommand = (program: Command): void => {
  program
    .command('info <name>')
    .description('Show detailed information about a skill')
    .action(async (name: string) => {
      const mode = getOutputMode();
      if (mode === 'silent') return;

      const config = loadConfig();
      const api = createApiClient(config);

      let skill: SkillDetail;
      try {
        skill = await withSpinner<SkillDetail>(
          `Fetching info for ${name}...`,
          () => api.getSkill(name) as Promise<SkillDetail>,
        );
      } catch (err: unknown) {
        const apiErr = err as { status?: number; suggestion?: string };
        if (apiErr.status === 404) {
          log('');
          log(`  ${icons.error} ${c.err(`Skill not found: ${name}`)}`);
          log('');
          log(`    No skill named "${name}" exists in the registry.`);
          log('');
          if (apiErr.suggestion) {
            log(`    ${c.hint(`Did you mean: ${apiErr.suggestion}?`)}`);
            log(`    ${c.cmd(`spm install ${apiErr.suggestion}`)}`);
          } else {
            log(`    ${c.hint('Search for skills: spm search <query>')}`);
          }
          log('');
          return;
        }
        throw err;
      }

      if (mode === 'json') {
        logJson(skill);
        return;
      }

      log('');
      log(`  ${icons.package} ${c.name(`${skill.name}@${skill.version}`)}`);
      log('');
      log(`  ${skill.description}`);
      log('');

      // Metadata table
      const authorTrust = formatTrustBadge(skill.trust_tier);
      log(`  ${'Author:'.padEnd(13)}@${skill.author} (${c.trust(authorTrust)})`);

      if (skill.license) {
        log(`  ${'License:'.padEnd(13)}${skill.license}`);
      }

      log(
        `  ${'Published:'.padEnd(13)}${formatDate(skill.published_at)} (${formatRelativeDate(skill.published_at)})`,
      );
      log(
        `  ${'Downloads:'.padEnd(13)}${formatDownloads(skill.downloads)} total \u00b7 ${formatDownloads(skill.downloads_week)} this week`,
      );

      if (skill.review_count > 0) {
        log(
          `  ${'Rating:'.padEnd(13)}\u2605 ${skill.rating.toFixed(1)} (${skill.review_count} review${skill.review_count === 1 ? '' : 's'})`,
        );
      }

      log(`  ${'Platforms:'.padEnd(13)}${formatPlatforms(skill.platforms)}`);

      if (skill.repository) {
        log(`  ${'Repository:'.padEnd(13)}${c.url(skill.repository)}`);
      }

      // Security level
      log(`  ${'Security:'.padEnd(13)}${formatSecurityLevel(skill.security)}`);

      // Trust details
      log('');
      log('  Trust:');
      if (skill.signed && skill.signer) {
        log(`    ${c.trust('\u2713')} Signed by ${skill.signer} (Sigstore)`);
      } else if (skill.signed) {
        log(`    ${c.trust('\u2713')} Signed (Sigstore)`);
      }
      if (skill.scanned) {
        log(`    ${c.trust('\u2713')} Scanned (Layer 1 + Layer 2 passed)`);
      }
      if (skill.verified) {
        log(`    ${c.trust('\u2713')} Verified author (GitHub linked)`);
      }

      // Versions
      if (skill.versions.length > 0) {
        log('');
        log('  Versions:');
        for (const v of skill.versions) {
          const latestTag = v.latest ? '  (latest)' : '';
          log(`    ${v.version}${latestTag}  ${formatDate(v.created_at)}`);
        }
      }

      log('');
      log(`  Install: ${c.cmd(`spm install ${skill.name}`)}`);
      log('');
    });
};
