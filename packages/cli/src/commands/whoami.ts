import type { Command } from 'commander';
import { c, log, logError, logJson, getCurrentMode } from '../lib/output.js';
import { loadConfig } from '../lib/config.js';
import { createApiClient, ApiClientError } from '../lib/api-client.js';

export const registerWhoamiCommand = (program: Command): void => {
  program
    .command('whoami')
    .description('Display the currently logged-in user')
    .action(async () => {
      const config = loadConfig();

      if (!config.token) {
        if (getCurrentMode() === 'json') {
          logJson({ error: 'not_logged_in' });
          process.exitCode = 1;
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

      const client = createApiClient(config);

      let user: Awaited<ReturnType<typeof client.whoami>>['user'];
      try {
        const res = await client.whoami();
        user = res.user;
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.status === 401) {
            if (getCurrentMode() === 'json') {
              logJson({ error: 'token_expired' });
              process.exitCode = 1;
              return;
            }
            logError(
              'Session expired.',
              'Your authentication token is no longer valid.',
              `Run ${c.cmd('spm login')} to re-authenticate.`,
            );
            process.exitCode = 1;
            return;
          }
          logError('Could not reach registry', err.apiError.message);
          process.exitCode = 1;
          return;
        }
        throw err;
      }

      if (getCurrentMode() === 'json') {
        logJson({
          username: user.username,
          github: user.github_login,
          trust_tier: user.trust_tier,
          registered_at: user.created_at,
          skills_published: user.skills_published,
          registry: config.registry,
        });
        return;
      }

      console.log('');
      log(c.bold(user.username));
      log(`  GitHub:     github.com/${user.github_login}`);
      log(`  Trust tier: ${c.trust(user.trust_tier)}`);
      log(`  Registered: ${user.created_at}`);
      log(`  Published:  ${user.skills_published} skills`);
      log(`  Registry:   ${c.dim(config.registry)}`);
    });
};
