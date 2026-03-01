import { Command } from 'commander';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  icons,
  c,
  log,
  logVerbose,
  logJson,
  logError,
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
  addSkillToJson,
  updateLockFile,
  getGlobalSkillsDir,
} from '../services/skills-json.js';
import { runPreflightChecks, ensureSpmDirs } from '../services/preflight.js';
import { verifyPackage } from '../services/verifier.js';

interface InstallOpts {
  global?: boolean;
  saveDev?: boolean;
  verbose?: boolean;
  json?: boolean;
  silent?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

/**
 * Format a trust tier display string.
 */
const formatTrust = (trustTier: string, signed: boolean): string => {
  const parts: string[] = [];

  if (trustTier === 'official') {
    parts.push(c.trust('+++  Official'));
  } else if (trustTier === 'verified') {
    parts.push(c.trust('++ Verified'));
  } else if (trustTier === 'scanned') {
    parts.push(c.trust('+ Scanned'));
  } else {
    parts.push(c.dim('Registered'));
  }

  if (signed) {
    parts.push(c.trust('+ Signed'));
  }

  return `Trust: ${parts.join(' · ')}`;
};

/**
 * Get the target directory for skill installation.
 */
const getTargetDir = (isGlobal: boolean): string => {
  if (isGlobal) {
    return getGlobalSkillsDir();
  }
  return process.cwd();
};

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

  // Write cache metadata
  await writeFile(
    path.join(cacheDir, 'meta.json'),
    JSON.stringify({
      name: skill.name,
      version: skill.version,
      checksum: skill.checksum,
      cached_at: new Date().toISOString(),
    }),
  );

  return sklPath;
};

/**
 * Extract a .skl file (tar.gz) to the skill store.
 */
const extractSkill = async (sklPath: string, name: string, version: string): Promise<string> => {
  const skillDir = getSkillDir(name, version);
  await mkdir(skillDir, { recursive: true });

  // .skl is a tar.gz; extract using tar
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execFileAsync = promisify(execFile);

  await execFileAsync('tar', ['-xzf', sklPath, '-C', skillDir]);
  return skillDir;
};

/**
 * Install skills by name(s) — resolve, download, extract, link, update skills.json.
 */
const installNamed = async (names: string[], opts: InstallOpts): Promise<void> => {
  const config = loadConfig();
  const apiClient = createApiClient({ registry: config.registry, token: config.token });
  const isGlobal = opts.global ?? false;
  const targetDir = getTargetDir(isGlobal);

  // Parse specifiers
  const specifiers = names.map(parseSpecifier);

  // Resolve
  const { resolved, unresolved } = await withSpinner('Resolving...', () =>
    resolveSkills(apiClient, specifiers),
  );

  // Report unresolved
  for (const u of unresolved) {
    log(`${icons.error} ${c.err(`Skill not found: ${u.name}`)}`);
    if (u.suggestions && u.suggestions.length > 0) {
      log(`  Did you mean: ${u.suggestions.map((s) => c.cmd(`spm install ${s}`)).join(', ')}?`);
    }
  }

  if (resolved.length === 0) {
    if (unresolved.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (opts.dryRun) {
    log('');
    log(c.bold('Dry run — would install:'));
    for (const skill of resolved) {
      log(`  ${icons.package} ${c.name(skill.name)}@${c.version(skill.version)}`);
      log(`    ${formatTrust(skill.trustTier, skill.signed)}`);
    }
    return;
  }

  // Download, extract, link each skill
  const results: Array<{
    skill: ResolvedSkill;
    agents: string[];
  }> = [];

  for (const skill of resolved) {
    // Download
    const sklPath = await withSpinner(`Downloading ${skill.name}@${skill.version}...`, () =>
      downloadAndCache(apiClient, skill),
    );

    // Extract
    const skillDir = await withSpinner(`Extracting ${skill.name}@${skill.version}...`, () =>
      extractSkill(sklPath, skill.name, skill.version),
    );

    // Verify signature (if bundle exists alongside the .skl)
    const bundlePath = path.join(path.dirname(sklPath), 'signature.sigstore');
    try {
      const bundleJson = await readFile(bundlePath, 'utf-8');
      const verifyResult = await withSpinner(`Verifying ${skill.name}...`, () =>
        verifyPackage(sklPath, bundleJson),
      );

      if (verifyResult.verified) {
        log(
          `  ${icons.success} Signed by ${c.trust(verifyResult.signerIdentity ?? 'unknown')} (Sigstore)`,
        );
      } else {
        log(`  ${icons.error} ${c.err('Signature verification failed')}`);
        if (verifyResult.error) {
          logVerbose(`    ${verifyResult.error}`);
        }
        if (!opts.force) {
          logError(
            'Signature verification failed',
            `The signature for ${skill.name}@${skill.version} could not be verified.`,
            `Run with ${c.cmd('--force')} to install anyway.`,
          );
          process.exitCode = 1;
          return;
        }
      }
    } catch {
      // No signature bundle — unsigned package
      log(`  ${icons.warning} ${c.warn('Unsigned package')}`);
    }

    // Link to agents
    const linkResult = await withSpinner(`Linking ${skill.name}...`, () =>
      linkSkill(skillDir, skill.name),
    );

    // Update skills.json
    const range = specifiers.find((s) => s.name === skill.name)?.range ?? `^${skill.version}`;
    await addSkillToJson(targetDir, skill.name, range);
    logVerbose(`Added ${skill.name}@${range} to skills.json`);

    results.push({ skill, agents: linkResult.agents });
  }

  // Update lock file
  await updateLockFile(targetDir, resolved);
  logVerbose('Updated skills-lock.json');

  // Print results
  if (opts.json) {
    logJson({
      command: 'install',
      status: 'success',
      skills: results.map((r) => ({
        name: r.skill.name,
        version: r.skill.version,
        trust: { tier: r.skill.trustTier, signed: r.skill.signed },
        agents_linked: r.agents,
      })),
    });
    return;
  }

  log('');
  for (const r of results) {
    log(`${icons.success} ${c.name(r.skill.name)}@${c.version(r.skill.version)}`);
    log(`  ${formatTrust(r.skill.trustTier, r.skill.signed)}`);
    log(`  Linked to: ${r.agents.join(', ')}`);
    log(`  Added to skills.json`);
  }
};

/**
 * Install all skills from skills.json (like `npm install` with no args).
 */
const installFromSkillsJson = async (opts: InstallOpts): Promise<void> => {
  const isGlobal = opts.global ?? false;
  const targetDir = getTargetDir(isGlobal);

  const skillsJson = await loadSkillsJson(targetDir);
  if (!skillsJson) {
    log(`${icons.info} No skills.json found in ${c.path(targetDir)}`);
    log(`  Run ${c.cmd('spm install <skill-name>')} to install a skill.`);
    return;
  }

  const skillNames = Object.keys(skillsJson.skills);
  if (skillNames.length === 0) {
    log(`${icons.info} skills.json has no dependencies to install.`);
    return;
  }

  log(`Reading skills.json...`);
  log(`  ${skillNames.length} skill${skillNames.length === 1 ? '' : 's'} declared`);
  log('');

  // Convert skills map to specifiers
  const specifiers = skillNames.map((name) => ({
    name,
    range: skillsJson.skills[name],
  }));

  const config = loadConfig();
  const apiClient = createApiClient({ registry: config.registry, token: config.token });

  const { resolved, unresolved } = await withSpinner('Resolving versions...', () =>
    resolveSkills(apiClient, specifiers),
  );

  for (const u of unresolved) {
    log(`${icons.error} ${c.err(`Could not resolve: ${u.name} — ${u.reason}`)}`);
  }

  if (resolved.length === 0) {
    log(`${icons.error} No skills could be resolved.`);
    process.exitCode = 1;
    return;
  }

  if (opts.dryRun) {
    log(c.bold('Dry run — would install:'));
    for (const skill of resolved) {
      log(`  ${icons.success} ${c.name(skill.name)}@${c.version(skill.version)}`);
    }
    return;
  }

  // Download, extract, link
  log(`Installing ${resolved.length} skill${resolved.length === 1 ? '' : 's'}...`);

  for (const skill of resolved) {
    const sklPath = await downloadAndCache(apiClient, skill);
    const skillDir = await extractSkill(sklPath, skill.name, skill.version);
    const linkResult = await linkSkill(skillDir, skill.name);
    log(`  ${icons.success} ${c.name(skill.name)}@${c.version(skill.version)}`);
    logVerbose(`    Linked to: ${linkResult.agents.join(', ')} (${linkResult.method})`);
  }

  // Update lock file
  await updateLockFile(targetDir, resolved);

  if (opts.json) {
    logJson({
      command: 'install',
      status: 'success',
      skills: resolved.map((s) => ({ name: s.name, version: s.version })),
    });
    return;
  }

  log('');
  log(`${icons.success} ${resolved.length} skill${resolved.length === 1 ? '' : 's'} installed`);
};

export const registerInstallCommand = (program: Command): void => {
  program
    .command('install [skills...]')
    .aliases(['i', 'add'])
    .description('Install one or more skills')
    .option('-g, --global', 'Install globally')
    .option('--save-dev', 'Save as dev dependency')
    .option('--verbose', 'Verbose output')
    .option('--json', 'JSON output')
    .option('--silent', 'No output')
    .option('--force', 'Force reinstall')
    .option('--dry-run', 'Show what would be installed')
    .action(async (skills: string[], opts: InstallOpts) => {
      setOutputMode(getOutputMode(opts));

      // Run preflight checks
      await ensureSpmDirs();
      const issues = await runPreflightChecks();
      if (issues.length > 0) {
        logVerbose(`Preflight: ${issues.length} issue(s) found and auto-repaired`);
      }

      if (skills.length === 0) {
        await installFromSkillsJson(opts);
      } else {
        await installNamed(skills, opts);
      }
    });
};
