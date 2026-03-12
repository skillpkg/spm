import { Command } from 'commander';
import { icons, c, log, logJson, logError, withSpinner, getCurrentMode } from '../lib/output.js';
import { loadConfig } from '../lib/config.js';
import { createApiClient, ApiClientError } from '../lib/api-client.js';

const rescanOne = async (
  api: ReturnType<typeof createApiClient>,
  name: string,
  version?: string,
): Promise<boolean> => {
  const versionLabel = version ? `@${version}` : ' (latest)';

  try {
    const result = await api.rescanSkill(name, version);

    log(
      `${icons.success} Rescanned ${c.name(name)}@${c.version(result.version)}: ${c.trust(result.security_level)}`,
    );

    if (result.blocked.length > 0) {
      log(`   ${icons.error} Blocked: ${result.blocked.join(', ')}`);
    }
    if (result.warnings.length > 0) {
      log(`   ${icons.warning} Warnings: ${result.warnings.join(', ')}`);
    }

    return true;
  } catch (err) {
    if (err instanceof ApiClientError) {
      if (err.status === 403) {
        logError('Permission denied', `Cannot rescan ${name}.`);
      } else if (err.status === 404) {
        logError('Not found', `${name}${versionLabel} does not exist.`);
      } else {
        logError('Rescan failed', err.apiError.message);
      }
    } else {
      logError('Rescan failed', err instanceof Error ? err.message : String(err));
    }
    return false;
  }
};

export const registerRescanCommand = (program: Command): void => {
  program
    .command('rescan [name]')
    .description('Re-run security scan on published skills')
    .option('--version <version>', 'Specific version to rescan (defaults to latest)')
    .option('--all', 'Rescan all skills (admin: all in registry, user: own skills)')
    .option('--json', 'Output machine-readable JSON')
    .action(async (name: string | undefined, opts: { version?: string; all?: boolean }) => {
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

      if (opts.all) {
        // Batch rescan
        try {
          const { user: whoami } = await api.whoami();
          const isAdmin = whoami.is_admin;

          if (isAdmin) {
            log(`${icons.info} Admin mode — rescanning all skills in registry...`);
          } else {
            log(`${icons.info} Rescanning your published skills...`);
          }

          const searchParams = isAdmin
            ? { per_page: 100 }
            : { author: whoami.username, per_page: 100 };
          const searchResult = await api.searchSkills(searchParams);

          if (searchResult.results.length === 0) {
            log(`${icons.info} No skills found.`);
            return;
          }

          log(`${icons.info} Found ${searchResult.results.length} skill(s) to rescan`);
          log('');

          let succeeded = 0;
          let failed = 0;

          for (const skill of searchResult.results) {
            log(`${icons.shield} Rescanning ${c.name(skill.name)}...`);
            const ok = await rescanOne(api, skill.name);
            if (ok) succeeded++;
            else failed++;
          }

          log('');
          log(
            `${icons.success} ${succeeded} rescanned, ${failed} failed (${searchResult.results.length} total)`,
          );

          if (mode === 'json') {
            logJson({
              command: 'rescan',
              status: failed > 0 ? 'partial' : 'success',
              rescanned: succeeded,
              failed,
              total: searchResult.results.length,
            });
          }

          if (failed > 0) process.exitCode = 1;
        } catch (err) {
          logError('Failed to fetch skills', err instanceof Error ? err.message : String(err));
          process.exitCode = 1;
        }
        return;
      }

      // Single skill rescan
      if (!name) {
        logError(
          'No skill specified',
          'Provide a skill name or use --all.',
          `Example: ${c.cmd('spm rescan my-skill')} or ${c.cmd('spm rescan --all')}`,
        );
        process.exitCode = 1;
        return;
      }

      const versionLabel = opts.version ? `@${opts.version}` : ' (latest)';
      log(`${icons.shield} Rescanning ${c.name(name)}${versionLabel}...`);

      try {
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
