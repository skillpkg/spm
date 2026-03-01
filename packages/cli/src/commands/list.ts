import { Command } from 'commander';
import { TRUST_TIER_INFO } from '@spm/shared';
import type { TrustTier } from '@spm/shared';
import { icons, c, log, logJson, getOutputMode } from '../lib/output.js';
import { getConfigDir } from '../lib/config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// -- Types --

interface SkillEntry {
  name: string;
  version: string;
  trust_tier: TrustTier;
  signed: boolean;
}

interface SkillsJsonFile {
  skills: Record<string, string>;
}

interface SkillLockEntry {
  version: string;
  trust_tier?: TrustTier;
  signer?: string;
}

interface SkillsLockFile {
  skills: Record<string, SkillLockEntry>;
}

// -- Helpers --

const formatTrustBadge = (tier: TrustTier): string => {
  const info = TRUST_TIER_INFO[tier];
  return c.trust(`${info.badge}  ${info.display}`);
};

const formatSignedBadge = (signed: boolean): string => {
  return signed ? c.trust('\u2713 Signed') : '';
};

const readJsonFile = <T>(filePath: string): T | null => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
};

const resolveSkillEntries = (
  skillsJson: SkillsJsonFile | null,
  lockFile: SkillsLockFile | null,
): SkillEntry[] => {
  if (!skillsJson) return [];

  return Object.entries(skillsJson.skills).map(([name, range]) => {
    const lockEntry = lockFile?.skills[name];
    return {
      name,
      version: lockEntry?.version ?? range,
      trust_tier: lockEntry?.trust_tier ?? ('registered' as TrustTier),
      signed: !!lockEntry?.signer,
    };
  });
};

// -- Command --

export const registerListCommand = (program: Command): void => {
  program
    .command('list')
    .description('List installed skills')
    .option('--global', 'show only global skills')
    .action(async (opts: { global?: boolean }) => {
      const mode = getOutputMode();
      if (mode === 'silent') return;

      // Paths
      const projectSkillsPath = path.resolve(process.cwd(), 'skills.json');
      const projectLockPath = path.resolve(process.cwd(), 'skills-lock.json');
      const globalDir = getConfigDir();
      const globalSkillsPath = path.join(globalDir, 'skills.json');
      const globalLockPath = path.join(globalDir, 'skills-lock.json');

      // Read files
      const projectSkills = opts.global ? null : readJsonFile<SkillsJsonFile>(projectSkillsPath);
      const projectLock = opts.global ? null : readJsonFile<SkillsLockFile>(projectLockPath);
      const globalSkills = readJsonFile<SkillsJsonFile>(globalSkillsPath);
      const globalLock = readJsonFile<SkillsLockFile>(globalLockPath);

      const projectEntries = resolveSkillEntries(projectSkills, projectLock);
      const globalEntries = resolveSkillEntries(globalSkills, globalLock);

      if (mode === 'json') {
        logJson({
          project: opts.global ? undefined : projectEntries,
          global: globalEntries,
          total: projectEntries.length + globalEntries.length,
        });
        return;
      }

      const totalCount = projectEntries.length + globalEntries.length;

      if (totalCount === 0) {
        log('');
        if (!opts.global && !projectSkills) {
          log(`  ${icons.info} No skills.json found in current directory.`);
          log('');
          log(`  ${c.hint('Initialize a project: spm init')}`);
          log(`  ${c.hint('Or install a skill: spm install <name>')}`);
        } else {
          log(`  ${icons.info} No skills installed.`);
          log('');
          log(`  ${c.hint('Install a skill: spm install <name>')}`);
          log(`  ${c.hint('Search for skills: spm search <query>')}`);
        }
        log('');
        return;
      }

      log('');

      // Project skills
      if (!opts.global && projectEntries.length > 0) {
        log('  Project skills (from skills.json):');
        for (const skill of projectEntries) {
          const trustBadge = formatTrustBadge(skill.trust_tier);
          const signedBadge = formatSignedBadge(skill.signed);
          const signed = signedBadge ? `  ${signedBadge}` : '';
          log(
            `    ${c.name(skill.name.padEnd(17))}${c.version(skill.version.padEnd(9))}${trustBadge}${signed}`,
          );
        }
        log('');
      }

      // Global skills
      if (globalEntries.length > 0) {
        log('  Global skills:');
        for (const skill of globalEntries) {
          const trustBadge = formatTrustBadge(skill.trust_tier);
          const signedBadge = formatSignedBadge(skill.signed);
          const signed = signedBadge ? `  ${signedBadge}` : '';
          log(
            `    ${c.name(skill.name.padEnd(17))}${c.version(skill.version.padEnd(9))}${trustBadge}${signed}`,
          );
        }
        log('');
      }

      // Summary
      const parts: string[] = [];
      if (!opts.global && projectEntries.length > 0) {
        parts.push(`${projectEntries.length} project`);
      }
      if (globalEntries.length > 0) {
        parts.push(`${globalEntries.length} global`);
      }
      log(`  ${totalCount} skill${totalCount === 1 ? '' : 's'} (${parts.join(', ')})`);
      log('');
    });
};
