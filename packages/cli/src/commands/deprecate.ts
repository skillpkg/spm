import { Command } from 'commander';
import { icons, c, log, logJson, logError, withSpinner, getCurrentMode } from '../lib/output.js';
import { loadConfig } from '../lib/config.js';
import { createApiClient, ApiClientError } from '../lib/api-client.js';

export const registerDeprecateCommand = (program: Command): void => {
  program
    .command('deprecate <name>')
    .description('Deprecate a skill (or undo deprecation with --undo)')
    .option('--message <msg>', 'Deprecation message shown to users')
    .option('--undo', 'Remove deprecation')
    .action(async (name: string, opts: { message?: string; undo?: boolean }) => {
      const mode = getCurrentMode();

      // 1. Check auth
      const config = loadConfig();
      if (!config.token) {
        logError(
          'Not authenticated',
          'You must be logged in to deprecate skills.',
          `Run ${c.cmd('spm login')} to authenticate.`,
        );
        process.exitCode = 1;
        return;
      }

      const api = createApiClient(config);

      // 2. Build request body
      const isUndo = opts.undo ?? false;
      const body: Record<string, unknown> = isUndo
        ? { deprecated: false }
        : { deprecated: true, deprecated_msg: opts.message ?? 'This skill has been deprecated.' };

      // 3. Call API
      try {
        await withSpinner(
          isUndo ? `Removing deprecation for ${name}...` : `Deprecating ${name}...`,
          () => api.updateSkill(name, body),
        );

        if (isUndo) {
          log(`${icons.success} Un-deprecated ${c.name(name)}`);
        } else {
          log(`${icons.success} Deprecated ${c.name(name)}`);
          if (opts.message) {
            log(`  Message: ${c.dim(opts.message)}`);
          }
        }

        if (mode === 'json') {
          logJson({
            command: 'deprecate',
            status: 'success',
            name,
            deprecated: !isUndo,
            message: isUndo ? undefined : (opts.message ?? 'This skill has been deprecated.'),
          });
        }
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.status === 404) {
            logError(
              'Skill not found',
              `${name} does not exist in the registry.`,
              `Run ${c.cmd('spm search')} to find the correct name.`,
            );
          } else if (err.status === 401) {
            logError(
              'Authentication failed',
              'Your token may have expired.',
              `Run ${c.cmd('spm login')} to re-authenticate.`,
            );
          } else if (err.status === 403) {
            logError('Permission denied', 'You can only deprecate skills you own.');
          } else {
            logError(
              isUndo ? 'Un-deprecate failed' : 'Deprecate failed',
              err.apiError.message,
              err.apiError.suggestion,
            );
          }
        } else {
          logError(
            isUndo ? 'Un-deprecate failed' : 'Deprecate failed',
            err instanceof Error ? err.message : String(err),
          );
        }
        process.exitCode = 1;
      }
    });
};
