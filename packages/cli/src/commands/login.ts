import type { Command } from 'commander';
import open from 'open';
import { icons, c, log, logError, withSpinner, getCurrentMode, logJson } from '../lib/output.js';
import { loadConfig, saveToken } from '../lib/config.js';
import { createApiClient, ApiClientError } from '../lib/api-client.js';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const registerLoginCommand = (program: Command): void => {
  program
    .command('login')
    .description('Authenticate with GitHub')
    .action(async () => {
      const config = loadConfig();
      const client = createApiClient(config);

      // Check if already logged in
      if (config.token) {
        try {
          const user = await client.whoami();
          if (getCurrentMode() === 'json') {
            logJson({
              status: 'already_logged_in',
              username: user.username,
              trust_tier: user.trust_tier,
            });
            return;
          }
          console.log('');
          log(`${icons.info} Already logged in as ${c.bold(user.username)} (GitHub)`);
          log(`  Trust tier: ${c.trust(user.trust_tier)}`);
          console.log('');
          log(`To switch accounts, run ${c.cmd('spm logout')} first.`);
          return;
        } catch (err) {
          if (err instanceof ApiClientError && err.status === 401) {
            // Token expired, continue with login flow
            log(`${icons.warning} Your session has expired.`);
            console.log('');
          } else {
            throw err;
          }
        }
      }

      // Start device flow
      let deviceCodeResponse;
      try {
        deviceCodeResponse = await client.deviceCode();
      } catch (err) {
        if (err instanceof ApiClientError) {
          logError(
            'Could not reach registry',
            `${config.registry} is not responding`,
            'Check your internet connection, or try again later.',
          );
        } else {
          logError('Failed to start authentication', String(err));
        }
        process.exitCode = 1;
        return;
      }

      const { device_code, user_code, verification_uri, expires_in, interval } = deviceCodeResponse;

      console.log('');
      log(`${icons.link} Opening GitHub for authentication...`);
      console.log('');
      log(`If your browser didn't open, go to:`);
      log(`  ${c.url(verification_uri)}`);
      console.log('');
      log(`And enter code: ${c.bold(user_code)}`);
      console.log('');

      // Try to open browser
      try {
        await open(verification_uri);
      } catch {
        // Browser open failed — user can navigate manually
      }

      // Poll for token
      const deadline = Date.now() + expires_in * 1000;
      let pollInterval = interval * 1000;

      const token = await withSpinner('Waiting for authorization...', async () => {
        while (Date.now() < deadline) {
          await sleep(pollInterval);

          try {
            const result = await client.pollToken(device_code);

            if ('access_token' in result) {
              return result;
            }

            // Handle pending states
            if ('status' in result) {
              if (result.status === 'slow_down') {
                pollInterval += 5000;
              } else if (result.status === 'expired') {
                throw new Error('expired');
              }
              // authorization_pending: keep polling
            }
          } catch (err) {
            if (err instanceof Error && err.message === 'expired') {
              throw err;
            }
            if (err instanceof ApiClientError) {
              // Server error during poll — keep trying
              continue;
            }
            throw err;
          }
        }

        throw new Error('expired');
      });

      if (!token || !('access_token' in token)) {
        logError(
          'Authentication expired',
          'The device code has expired before authorization was completed.',
          `Run ${c.cmd('spm login')} to try again.`,
        );
        process.exitCode = 1;
        return;
      }

      // Save token
      saveToken(token.access_token);

      log(`${icons.success} Authenticated as ${c.bold(token.user.username)} (GitHub)`);
      log(`${icons.success} Token saved to ${c.path('~/.spm/config.toml')}`);
      console.log('');
      log(`You can now publish skills. Your trust tier: ${c.trust(token.user.trust_tier)}`);
      log(`To get Verified, link your GitHub and maintain 6 months activity.`);

      if (getCurrentMode() === 'json') {
        logJson({
          status: 'authenticated',
          username: token.user.username,
          trust_tier: token.user.trust_tier,
        });
      }
    });
};
