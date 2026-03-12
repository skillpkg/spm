import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { icons, c, log, logJson, logError, getCurrentMode } from '../lib/output.js';
import { loadConfig } from '../lib/config.js';
import { createApiClient, ApiClientError } from '../lib/api-client.js';
import type { SignResult } from '../services/signer.js';

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
 * Sign a single skill version: download → sign → upload signature.
 * Returns true on success, false on failure.
 */
const signOne = async (
  api: ReturnType<typeof createApiClient>,
  name: string,
  version: string,
  signer: (filePath: string) => Promise<SignResult>,
): Promise<boolean> => {
  // Download
  let sklBuffer: ArrayBuffer;
  try {
    sklBuffer = await api.downloadSkill(name, version);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      logError('Version not found', `${name}@${version} does not exist.`);
    } else {
      logError('Download failed', err instanceof Error ? err.message : String(err));
    }
    return false;
  }

  // Write to temp file
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'spm-sign-'));
  const tmpPath = path.join(tmpDir, `${name}-${version}.skl`);
  await writeFile(tmpPath, Buffer.from(sklBuffer));

  try {
    // Sign
    const signResult = await signer(tmpPath);

    // Upload signature
    await api.signSkill(name, version, signResult.bundle, signResult.signerIdentity);

    log(
      `${icons.success} Signed ${c.name(name)}@${c.version(version)} by ${c.trust(signResult.signerIdentity)}`,
    );
    return true;
  } catch (err) {
    if (err instanceof ApiClientError) {
      if (err.status === 403) {
        logError('Permission denied', `You do not own ${name}.`);
      } else {
        logError('Sign failed', err.apiError.message);
      }
    } else {
      logError('Sign failed', err instanceof Error ? err.message : String(err));
    }
    return false;
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true });
    } catch {
      // best-effort cleanup
    }
  }
};

export const registerSignCommand = (program: Command): void => {
  program
    .command('sign [specifiers...]')
    .description('Sign published versions with Sigstore (single auth for batch)')
    .option('--all', 'Sign all your unsigned published versions')
    .option('--json', 'Output machine-readable JSON')
    .action(async (specifiers: string[], opts: { all?: boolean }) => {
      const mode = getCurrentMode();

      // 1. Check auth
      const config = loadConfig();
      if (!config.token) {
        logError(
          'Not authenticated',
          'You must be logged in to sign skills.',
          `Run ${c.cmd('spm login')} to authenticate.`,
        );
        process.exitCode = 1;
        return;
      }

      const api = createApiClient(config);

      // 2. Build list of targets to sign
      const targets: Array<{ name: string; version: string }> = [];

      if (opts.all) {
        // Fetch skills and find unsigned versions
        try {
          const whoami = await api.whoami();
          const isAdmin = whoami.is_admin;

          if (isAdmin) {
            log(`${icons.info} Admin mode — fetching all unsigned skills in registry...`);
          } else {
            log(`${icons.info} Fetching your published skills...`);
          }

          // Admin: fetch all skills; regular user: only their own
          const searchParams = isAdmin ? { per_page: 100 } : { author: whoami.username, per_page: 100 };
          const searchResult = await api.searchSkills(searchParams);

          for (const skill of searchResult.results) {
            if (!skill.signed) {
              targets.push({ name: skill.name, version: skill.version });
            }
          }

          if (targets.length === 0) {
            log(`${icons.success} All skills are already signed.`);
            return;
          }

          log(`${icons.info} Found ${targets.length} unsigned version(s):`);
          for (const t of targets) {
            log(`   ${c.name(t.name)}@${c.version(t.version)}`);
          }
          log('');
        } catch (err) {
          logError('Failed to fetch skills', err instanceof Error ? err.message : String(err));
          process.exitCode = 1;
          return;
        }
      } else {
        // Parse explicit specifiers
        if (specifiers.length === 0) {
          logError(
            'No specifiers provided',
            'Provide skill@version arguments or use --all.',
            `Example: ${c.cmd('spm sign my-skill@1.0.0')} or ${c.cmd('spm sign --all')}`,
          );
          process.exitCode = 1;
          return;
        }

        for (const spec of specifiers) {
          const parsed = parseNameVersion(spec);
          if (!parsed) {
            logError('Invalid specifier', `"${spec}" — expected format: ${c.cmd('name@version')}`);
            process.exitCode = 1;
            return;
          }
          targets.push(parsed);
        }
      }

      // 3. Create batch signer (single auth for all packages)
      log(`${icons.lock} Authenticating with Sigstore...`);
      let batchSigner: { sign: (filePath: string) => Promise<SignResult>; identity: string };
      try {
        const { createBatchSigner } = await import('../services/signer.js');
        batchSigner = await createBatchSigner();
        log(`${icons.success} Authenticated as ${c.trust(batchSigner.identity)}`);
      } catch (err) {
        logError(
          'Sigstore authentication failed',
          err instanceof Error ? err.message : String(err),
        );
        process.exitCode = 1;
        return;
      }

      log('');

      // 4. Sign each target
      let succeeded = 0;
      let failed = 0;

      for (const target of targets) {
        log(`${icons.lock} Signing ${c.name(target.name)}@${c.version(target.version)}...`);
        const ok = await signOne(api, target.name, target.version, batchSigner.sign);
        if (ok) {
          succeeded++;
        } else {
          failed++;
        }
      }

      // 5. Summary
      log('');
      if (targets.length > 1) {
        log(`${icons.success} ${succeeded} signed, ${failed} failed (${targets.length} total)`);
      }

      if (mode === 'json') {
        logJson({
          command: 'sign',
          status: failed > 0 ? 'partial' : 'success',
          signed: succeeded,
          failed,
          total: targets.length,
          signer: batchSigner.identity,
        });
      }

      if (failed > 0) {
        process.exitCode = 1;
      }
    });
};
