import type { Command } from 'commander';
import { icons, c, log, logError, logJson, getCurrentMode } from '../lib/output.js';
import { loadConfig, removeToken } from '../lib/config.js';
import { createApiClient, ApiClientError } from '../lib/api-client.js';

export const registerLogoutCommand = (program: Command): void => {
  program
    .command('logout')
    .description('Remove saved authentication token')
    .action(async () => {
      const config = loadConfig();

      if (!config.token) {
        if (getCurrentMode() === 'json') {
          logJson({ status: 'not_logged_in' });
          return;
        }
        logError(
          'Not logged in.',
          undefined,
          `Run ${c.cmd('spm login')} to authenticate with GitHub.`,
        );
        process.exitCode = 1;
        return;
      }

      // Attempt to invalidate token on server (non-fatal if it fails)
      try {
        const client = createApiClient(config);
        await client.logout();
      } catch (err) {
        if (!(err instanceof ApiClientError)) {
          // Network error is non-fatal for logout
        }
      }

      // Remove token locally
      removeToken();

      if (getCurrentMode() === 'json') {
        logJson({ status: 'logged_out' });
        return;
      }

      console.log('');
      log(`${icons.success} Logged out. Token removed from ${c.path('~/.spm/config.toml')}.`);
      console.log('');
      log(`You can still search and install skills.`);
      log(`Publishing requires ${c.cmd('spm login')}.`);
    });
};
