import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import semver from 'semver';
import { SemverSchema } from '@spm/shared';
import { icons, c, log, logJson, getOutputMode, logError } from '../lib/output.js';

type ReleaseType = 'patch' | 'minor' | 'major';

const isReleaseType = (value: string): value is ReleaseType => {
  return value === 'patch' || value === 'minor' || value === 'major';
};

export const registerVersionCommand = (program: Command): void => {
  program
    .command('version <release>')
    .description('Bump version in manifest.json (patch, minor, or major)')
    .action(async (release: string) => {
      const mode = getOutputMode();
      if (mode === 'silent') return;

      try {
        if (!isReleaseType(release)) {
          logError(
            'Invalid release type',
            `"${release}" is not a valid release type.`,
            'Use one of: patch, minor, major',
          );
          process.exitCode = 1;
          return;
        }

        const manifestPath = path.join(process.cwd(), 'manifest.json');

        let raw: string;
        try {
          raw = await fs.readFile(manifestPath, 'utf-8');
        } catch {
          logError(
            'No manifest.json found',
            'This command must be run in a skill directory.',
            `Run ${c.cmd('spm init')} to create a new skill.`,
          );
          process.exitCode = 1;
          return;
        }

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          logError('Invalid manifest.json', 'File is not valid JSON.');
          process.exitCode = 1;
          return;
        }

        const currentVersion = parsed.version;
        if (typeof currentVersion !== 'string') {
          logError('Invalid manifest.json', 'Missing or invalid "version" field.');
          process.exitCode = 1;
          return;
        }

        const versionCheck = SemverSchema.safeParse(currentVersion);
        if (!versionCheck.success) {
          logError('Invalid version', `Current version "${currentVersion}" is not valid semver.`);
          process.exitCode = 1;
          return;
        }

        const newVersion = semver.inc(currentVersion, release);
        if (!newVersion) {
          logError('Version bump failed', `Could not bump "${currentVersion}" by ${release}.`);
          process.exitCode = 1;
          return;
        }

        // Update the version in the parsed object and write back
        parsed.version = newVersion;
        await fs.writeFile(manifestPath, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');

        if (mode === 'json') {
          logJson({ old_version: currentVersion, new_version: newVersion, release });
          return;
        }

        log('');
        log(`${icons.success} ${c.dim(currentVersion)} ${icons.arrow} ${c.name(newVersion)}`);
        log('');
      } catch (err) {
        logError('Version bump failed', err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
};
