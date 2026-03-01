import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { ManifestSchema } from '@spm/shared';
import type { Manifest } from '@spm/shared';
import { icons, c, log, logJson, logError, withSpinner, getCurrentMode } from '../lib/output.js';
import { loadConfig } from '../lib/config.js';
import { createApiClient, ApiClientError } from '../lib/api-client.js';

const execFileAsync = promisify(execFile);

/**
 * Check if the current directory has uncommitted git changes.
 * Returns true if the working tree is dirty.
 */
const isGitDirty = async (): Promise<boolean> => {
  try {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain']);
    return stdout.trim().length > 0;
  } catch {
    // Not a git repo or git not available — skip check
    return false;
  }
};

/**
 * Read and validate manifest.json from the current directory.
 */
const readManifest = async (): Promise<Manifest> => {
  const manifestPath = path.join(process.cwd(), 'manifest.json');
  const raw = await readFile(manifestPath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  return ManifestSchema.parse(parsed);
};

/**
 * Pack the skill directory into a .skl (tar.gz) archive.
 * Returns the packed file path and metadata.
 */
const packSkill = async (
  manifest: Manifest,
): Promise<{ sklPath: string; fileCount: number; sizeBytes: number }> => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'spm-publish-'));
  const sklName = `${manifest.name}-${manifest.version}.skl`;
  const sklPath = path.join(tmpDir, sklName);

  // Determine which files to include
  const includePatterns = manifest.files?.include ?? ['.'];
  const excludePatterns = manifest.files?.exclude ?? [];

  const tarArgs = ['-czf', sklPath];

  for (const pattern of excludePatterns) {
    tarArgs.push('--exclude', pattern);
  }

  tarArgs.push(...includePatterns);

  await execFileAsync('tar', tarArgs, { cwd: process.cwd() });

  // Get file count by listing archive contents
  const { stdout: listing } = await execFileAsync('tar', ['-tzf', sklPath]);
  const fileCount = listing.trim().split('\n').filter(Boolean).length;

  const stat = await fs.promises.stat(sklPath);

  return { sklPath, fileCount, sizeBytes: stat.size };
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

export const registerPublishCommand = (program: Command): void => {
  program
    .command('publish')
    .description('Pack and publish a skill to the registry')
    .option('--dry-run', 'Pack and validate without publishing')
    .option('--force', 'Skip confirmation prompts')
    .option('--json', 'Output machine-readable JSON')
    .action(async (opts: { dryRun?: boolean; force?: boolean; json?: boolean }) => {
      const mode = getCurrentMode();

      // 1. Check auth
      const config = loadConfig();
      if (!config.token) {
        logError(
          'Not authenticated',
          'You must be logged in to publish skills.',
          `Run ${c.cmd('spm login')} to authenticate with GitHub.`,
        );
        process.exitCode = 1;
        return;
      }

      const api = createApiClient(config);

      // 2. Read and validate manifest
      let manifest: Manifest;
      try {
        manifest = await readManifest();
      } catch (err) {
        if (err instanceof Error && err.message.includes('ENOENT')) {
          logError(
            'No manifest.json found',
            'This directory does not contain a skill manifest.',
            `Run ${c.cmd('spm init')} to create one.`,
          );
        } else {
          logError(
            'Invalid manifest.json',
            err instanceof Error ? err.message : String(err),
            'Check your manifest.json against the schema.',
          );
        }
        process.exitCode = 1;
        return;
      }

      // 3. Check git status
      const dirty = await isGitDirty();
      if (dirty && mode !== 'silent' && mode !== 'json') {
        log(`${icons.warning} ${c.warn('Git working tree has uncommitted changes')}`);
        log('');
      }

      // 4. Pack the skill
      let packResult: { sklPath: string; fileCount: number; sizeBytes: number };
      try {
        log(`${icons.package} Packing ${c.name(manifest.name)}@${c.version(manifest.version)}...`);
        packResult = await withSpinner(`Packed (${manifest.name})`, () => packSkill(manifest));
        log(
          `${icons.success} Packed (${packResult.fileCount} files, ${formatBytes(packResult.sizeBytes)})`,
        );
      } catch (err) {
        logError('Failed to pack skill', err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
        return;
      }

      log('');

      // 5. Category check
      try {
        log('\ud83c\udff7  Category check...');
        const classification = await withSpinner('Classifying skill...', () =>
          api.classifySkill({ name: manifest.name, description: manifest.description }),
        );

        const matches = classification.detected_category === manifest.category;
        if (matches) {
          log(
            `${icons.success} Detected: ${c.name(classification.detected_category)} \u2014 matches manifest`,
          );
        } else {
          log(
            `${icons.warning} Detected: ${c.name(classification.detected_category)} \u2014 manifest says ${c.name(manifest.category)}`,
          );
        }
      } catch {
        // Classification is optional; if it fails, continue
        log(`${icons.warning} Category classification unavailable, skipping`);
      }

      log('');

      // 6. Dry run — stop here
      if (opts.dryRun) {
        log(`${icons.info} Dry run complete. No changes published.`);
        if (mode === 'json') {
          logJson({
            command: 'publish',
            status: 'dry_run',
            name: manifest.name,
            version: manifest.version,
            files: packResult.fileCount,
            size: packResult.sizeBytes,
          });
        }
        return;
      }

      // 7. Upload
      try {
        const sklBuffer = await readFile(packResult.sklPath);
        const result = await withSpinner('Publishing to registry...', () =>
          api.publishSkill(sklBuffer.buffer as ArrayBuffer, manifest),
        );

        log(`${icons.success} Published ${c.name(manifest.name)}@${c.version(manifest.version)}`);
        log('');
        log(`${c.url(result.url)}`);

        if (mode === 'json') {
          logJson({
            command: 'publish',
            status: 'success',
            name: manifest.name,
            version: manifest.version,
            url: result.url,
            trust_tier: result.trust_tier,
            signed: result.signed,
          });
        }
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.status === 409) {
            logError(
              `Version ${manifest.version} already exists`,
              'Version numbers are immutable once published.',
              `Bump the version in manifest.json and try again.`,
            );
          } else if (err.status === 401) {
            logError(
              'Authentication failed',
              'Your token may have expired.',
              `Run ${c.cmd('spm login')} to re-authenticate.`,
            );
          } else if (err.status === 422) {
            logError('Publish blocked', err.apiError.message, err.apiError.suggestion);
          } else {
            logError('Publish failed', err.apiError.message, err.apiError.suggestion);
          }
        } else {
          logError('Publish failed', err instanceof Error ? err.message : String(err));
        }
        process.exitCode = 1;
      }
    });
};
