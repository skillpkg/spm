import { Command } from 'commander';
import { createInterface } from 'node:readline/promises';
import { icons, c, log, logJson, logError, withSpinner, getCurrentMode } from '../lib/output.js';
import { loadConfig } from '../lib/config.js';
import { createApiClient, ApiClientError } from '../lib/api-client.js';

/**
 * Prompt the user for a reason string.
 */
const promptReason = async (): Promise<string | null> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question('  Reason for report: ');
    const trimmed = answer.trim();
    return trimmed.length > 0 ? trimmed : null;
  } finally {
    rl.close();
  }
};

export const registerReportCommand = (program: Command): void => {
  program
    .command('report <name>')
    .description('Report a skill for policy violations')
    .option('--reason <reason>', 'Reason for the report')
    .option('--detail <detail>', 'Additional detail')
    .action(async (name: string, opts: { reason?: string; detail?: string }) => {
      const mode = getCurrentMode();

      // 1. Check auth
      const config = loadConfig();
      if (!config.token) {
        logError(
          'Not authenticated',
          'You must be logged in to report skills.',
          `Run ${c.cmd('spm login')} to authenticate.`,
        );
        process.exitCode = 1;
        return;
      }

      // 2. Get reason (from flag or prompt)
      let reason = opts.reason;
      if (!reason) {
        reason = (await promptReason()) ?? undefined;
        if (!reason) {
          log(`${icons.info} Report cancelled.`);
          return;
        }
      }

      const api = createApiClient(config);

      // 3. Submit report
      try {
        await withSpinner(`Submitting report for ${name}...`, () =>
          api.reportSkill(name, { reason, detail: opts.detail }),
        );

        log(`${icons.success} Report submitted for ${c.name(name)}`);

        if (mode === 'json') {
          logJson({
            command: 'report',
            status: 'success',
            name,
            reason,
            detail: opts.detail,
          });
        }
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.status === 404) {
            logError('Skill not found', `${name} does not exist in the registry.`);
          } else if (err.status === 401) {
            logError(
              'Authentication failed',
              'Your token may have expired.',
              `Run ${c.cmd('spm login')} to re-authenticate.`,
            );
          } else if (err.status === 429) {
            logError('Rate limited', 'Too many reports submitted. Please try again later.');
          } else {
            logError('Report failed', err.apiError.message, err.apiError.suggestion);
          }
        } else {
          logError('Report failed', err instanceof Error ? err.message : String(err));
        }
        process.exitCode = 1;
      }
    });
};
