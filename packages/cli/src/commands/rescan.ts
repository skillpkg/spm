import { Command } from 'commander';
import { icons, c, log, logJson, logError, withSpinner, getCurrentMode } from '../lib/output.js';
import { loadConfig } from '../lib/config.js';
import { createApiClient, ApiClientError } from '../lib/api-client.js';

export const registerRescanCommand = (program: Command): void => {
  program
    .command('rescan <name>')
    .description('Re-run security scan on a published skill')
    .option('--version <version>', 'Specific version to rescan (defaults to latest)')
    .option('--json', 'Output machine-readable JSON')
    .action(async (name: string, opts: { version?: string }) => {
      const mode = getCurrentMode();

      // 1. Check auth
      const config = loadConfig();
      if (!config.token) {
        logError(
          'Not authenticated',
          'You must be logged in to rescan skills.',
          `Run ${c.cmd('spm login')} to authenticate.`,
        );
        process.exitCode = 1;
        return;
      }

      const api = createApiClient(config);
      const versionLabel = opts.version ? `@${opts.version}` : ' (latest)';

      try {
        log(`${icons.shield} Rescanning ${c.name(name)}${versionLabel}...`);
        const result = await withSpinner('Running security pipeline...', () =>
          api.rescanSkill(name, opts.version),
        );

        log('');
        log(`${icons.success} Rescanned ${c.name(name)}@${c.version(result.version)}`);
        log(`   Security level: ${c.trust(result.security_level)}`);

        if (result.blocked.length > 0) {
          log(`   ${icons.error} Blocked: ${result.blocked.join(', ')}`);
        }
        if (result.warnings.length > 0) {
          log(`   ${icons.warning} Warnings: ${result.warnings.join(', ')}`);
        }

        for (const layer of result.layers) {
          const statusIcon =
            layer.status === 'passed'
              ? icons.success
              : layer.status === 'blocked'
                ? icons.error
                : icons.warning;
          log(`   ${statusIcon} L${layer.layer} ${layer.name}: ${layer.status}`);
        }

        if (mode === 'json') {
          logJson({
            command: 'rescan',
            status: 'success',
            ...result,
          });
        }
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.status === 403) {
            logError('Permission denied', 'You can only rescan skills you own.');
          } else if (err.status === 404) {
            logError('Not found', `${name}${versionLabel} does not exist.`);
          } else {
            logError('Rescan failed', err.apiError.message);
          }
        } else {
          logError('Rescan failed', err instanceof Error ? err.message : String(err));
        }
        process.exitCode = 1;
      }
    });
};
