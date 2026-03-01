import { Command } from 'commander';
import * as path from 'node:path';
import * as os from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  icons,
  c,
  log,
  logVerbose,
  logJson,
  withSpinner,
  setOutputMode,
  getOutputMode,
} from '../lib/output.js';
import { loadConfig } from '../lib/config.js';
import { createApiClient } from '../lib/api-client.js';
import { resolveSkills, parseSpecifier } from '../services/resolver.js';
import type { ResolvedSkill } from '../services/resolver.js';
import { linkSkill } from '../services/linker.js';
import {
  loadSkillsJson,
  loadLockFile,
  updateLockFile,
  getGlobalSkillsDir,
} from '../services/skills-json.js';
import { ensureSpmDirs } from '../services/preflight.js';

interface UpdateOpts {
  global?: boolean;
  verbose?: boolean;
  json?: boolean;
  silent?: boolean;
  dryRun?: boolean;
}

interface UpdateCandidate {
  name: string;
  currentVersion: string;
  newVersion: string;
  resolved: ResolvedSkill;
}

/**
 * Get the cache directory for a specific skill version.
 */
const getCacheDir = (name: string, version: string): string => {
  return path.join(os.homedir(), '.spm', 'cache', name, version);
};

/**
 * Get the extraction directory for a specific skill version.
 */
const getSkillDir = (name: string, version: string): string => {
  return path.join(os.homedir(), '.spm', 'skills', name, version);
};

/**
 * Download and cache a skill package.
 */
const downloadAndCache = async (
  apiClient: ReturnType<typeof createApiClient>,
  skill: ResolvedSkill,
): Promise<string> => {
  const cacheDir = getCacheDir(skill.name, skill.version);
  await mkdir(cacheDir, { recursive: true });

  const data = await apiClient.downloadSkill(skill.name, skill.version);
  const sklPath = path.join(cacheDir, `${skill.name}-${skill.version}.skl`);
  await writeFile(sklPath, Buffer.from(data));

  return sklPath;
};

/**
 * Extract a .skl file (tar.gz) to the skill store.
 */
const extractSkill = async (sklPath: string, name: string, version: string): Promise<string> => {
  const skillDir = getSkillDir(name, version);
  await mkdir(skillDir, { recursive: true });

  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execFileAsync = promisify(execFile);

  await execFileAsync('tar', ['-xzf', sklPath, '-C', skillDir]);
  return skillDir;
};

export const registerUpdateCommand = (program: Command): void => {
  program
    .command('update [skills...]')
    .aliases(['up', 'upgrade'])
    .description('Update skills to latest matching versions')
    .option('-g, --global', 'Update global skills')
    .option('--dry-run', 'Show what would be updated')
    .option('--verbose', 'Verbose output')
    .option('--json', 'JSON output')
    .option('--silent', 'No output')
    .action(async (skillNames: string[], opts: UpdateOpts) => {
      setOutputMode(getOutputMode(opts));
      await ensureSpmDirs();

      const isGlobal = opts.global ?? false;
      const targetDir = isGlobal ? getGlobalSkillsDir() : process.cwd();

      const skillsJson = await loadSkillsJson(targetDir);
      if (!skillsJson) {
        log(`${icons.info} No skills.json found. Nothing to update.`);
        return;
      }

      const lockFile = await loadLockFile(targetDir);

      // Determine which skills to check for updates
      let skillsToCheck: Array<{ name: string; range: string }>;
      if (skillNames.length > 0) {
        skillsToCheck = skillNames.map((input) => {
          const spec = parseSpecifier(input);
          const range = spec.range ?? skillsJson.skills[spec.name] ?? 'latest';
          return { name: spec.name, range };
        });
      } else {
        skillsToCheck = Object.entries(skillsJson.skills).map(([name, range]) => ({
          name,
          range,
        }));
      }

      if (skillsToCheck.length === 0) {
        log(`${icons.info} No skills to update.`);
        return;
      }

      const config = loadConfig();
      const apiClient = createApiClient({ registry: config.registry, token: config.token });

      // Resolve latest versions
      const { resolved } = await withSpinner('Checking for updates...', () =>
        resolveSkills(apiClient, skillsToCheck),
      );

      // Compare against lock file to find actual updates
      const candidates: UpdateCandidate[] = [];

      for (const skill of resolved) {
        const currentVersion = lockFile?.skills[skill.name]?.version;
        if (!currentVersion || currentVersion !== skill.version) {
          candidates.push({
            name: skill.name,
            currentVersion: currentVersion ?? 'not installed',
            newVersion: skill.version,
            resolved: skill,
          });
        }
      }

      if (candidates.length === 0) {
        log(`${icons.success} All skills are up to date.`);
        if (opts.json) {
          logJson({ command: 'update', status: 'success', updates: [] });
        }
        return;
      }

      // Show update plan
      log('');
      log(c.bold('Updates available:'));
      for (const candidate of candidates) {
        log(
          `  ${c.name(candidate.name)}: ${c.version(candidate.currentVersion)} ${icons.arrow} ${c.version(candidate.newVersion)}`,
        );
      }

      if (opts.dryRun) {
        log('');
        log(c.dim('Dry run — no changes made.'));
        if (opts.json) {
          logJson({
            command: 'update',
            status: 'dry-run',
            updates: candidates.map((cand) => ({
              name: cand.name,
              from: cand.currentVersion,
              to: cand.newVersion,
            })),
          });
        }
        return;
      }

      // Perform updates
      log('');
      for (const candidate of candidates) {
        const skill = candidate.resolved;

        const sklPath = await withSpinner(`Updating ${skill.name}@${skill.version}...`, () =>
          downloadAndCache(apiClient, skill),
        );

        const skillDir = await extractSkill(sklPath, skill.name, skill.version);
        const linkResult = await linkSkill(skillDir, skill.name);

        log(
          `  ${icons.success} ${c.name(skill.name)}: ${c.version(candidate.currentVersion)} ${icons.arrow} ${c.version(skill.version)}`,
        );
        logVerbose(`    Linked to: ${linkResult.agents.join(', ')}`);
      }

      // Update lock file
      await updateLockFile(
        targetDir,
        candidates.map((cand) => cand.resolved),
      );

      if (opts.json) {
        logJson({
          command: 'update',
          status: 'success',
          updates: candidates.map((cand) => ({
            name: cand.name,
            from: cand.currentVersion,
            to: cand.newVersion,
          })),
        });
        return;
      }

      log('');
      log(
        `${icons.success} ${candidates.length} skill${candidates.length === 1 ? '' : 's'} updated`,
      );
    });
};
