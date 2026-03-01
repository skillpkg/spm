import { Command } from 'commander';
import { createInterface } from 'node:readline/promises';
import { icons, c, log, logJson, logError, withSpinner, getCurrentMode } from '../lib/output.js';
import { loadConfig } from '../lib/config.js';
import { createApiClient, ApiClientError } from '../lib/api-client.js';

/**
 * Parse a "name@version" string into { name, version }.
 */
const parseNameVersion = (specifier: string): { name: string; version: string } | null => {
  const atIdx = specifier.lastIndexOf('@');
  if (atIdx <= 0) return null;

  const name = specifier.slice(0, atIdx);
  const version = specifier.slice(atIdx + 1);

  if (!name || !version) return null;
  return { name, version };
};

/**
 * Prompt the user for confirmation.
 */
const confirmAction = async (message: string): Promise<boolean> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`  ${message} (y/N) `);
    return answer.trim().toLowerCase() === 'y';
  } finally {
    rl.close();
  }
};

export const registerYankCommand = (program: Command): void => {
  program
    .command('yank <specifier>')
    .description('Yank a specific version from the registry')
    .option('--reason <reason>', 'Reason for yanking')
    .option('--force', 'Skip confirmation prompt')
    .action(async (specifier: string, opts: { reason?: string; force?: boolean }) => {
      const mode = getCurrentMode();

      // 1. Check auth
      const config = loadConfig();
      if (!config.token) {
        logError(
          'Not authenticated',
          'You must be logged in to yank versions.',
          `Run ${c.cmd('spm login')} to authenticate.`,
        );
        process.exitCode = 1;
        return;
      }

      // 2. Parse name@version
      const parsed = parseNameVersion(specifier);
      if (!parsed) {
        logError(
          'Invalid specifier',
          `Expected format: ${c.cmd('name@version')}`,
          `Example: ${c.cmd('spm yank my-skill@1.2.3')}`,
        );
        process.exitCode = 1;
        return;
      }

      const { name, version } = parsed;

      // 3. Confirm
      if (!opts.force) {
        const confirmed = await confirmAction(
          `Yank ${c.name(name)}@${c.version(version)}? This will prevent new installs of this version.`,
        );
        if (!confirmed) {
          log(`${icons.info} Cancelled.`);
          return;
        }
      }

      // 4. Call API
      const api = createApiClient(config);

      try {
        await withSpinner(`Yanking ${name}@${version}...`, () =>
          api.yankVersion(name, version, opts.reason),
        );

        log(`${icons.success} Yanked ${c.name(name)}@${c.version(version)}`);

        if (mode === 'json') {
          logJson({
            command: 'yank',
            status: 'success',
            name,
            version,
            reason: opts.reason,
          });
        }
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.status === 404) {
            logError(
              'Version not found',
              `${name}@${version} does not exist in the registry.`,
              `Run ${c.cmd(`spm info ${name}`)} to see available versions.`,
            );
          } else if (err.status === 401) {
            logError(
              'Authentication failed',
              'Your token may have expired.',
              `Run ${c.cmd('spm login')} to re-authenticate.`,
            );
          } else if (err.status === 403) {
            logError('Permission denied', 'You can only yank versions of skills you own.');
          } else {
            logError('Yank failed', err.apiError.message, err.apiError.suggestion);
          }
        } else {
          logError('Yank failed', err instanceof Error ? err.message : String(err));
        }
        process.exitCode = 1;
      }
    });
};
