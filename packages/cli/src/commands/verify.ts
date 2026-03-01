import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { icons, c, log, logJson, logError, withSpinner, getCurrentMode } from '../lib/output.js';
import { verifyPackage } from '../services/verifier.js';

/**
 * Get the path to a skill's .sigstore bundle file.
 */
const getBundlePath = (name: string, version: string): string => {
  return path.join(os.homedir(), '.spm', 'cache', name, version, 'signature.sigstore');
};

/**
 * Get the path to a skill's .skl file.
 */
const getSklPath = (name: string, version: string): string => {
  return path.join(os.homedir(), '.spm', 'cache', name, version, `${name}-${version}.skl`);
};

/**
 * Read the lock file to get the installed version of a skill.
 */
const getInstalledVersion = async (name: string): Promise<string | null> => {
  // Check local skills-lock.json first, then global
  const dirs = [process.cwd(), path.join(os.homedir(), '.spm')];

  for (const dir of dirs) {
    try {
      const lockPath = path.join(dir, 'skills-lock.json');
      const raw = await readFile(lockPath, 'utf-8');
      const lock = JSON.parse(raw) as {
        skills: Record<string, { version: string }>;
      };
      if (lock.skills[name]) {
        return lock.skills[name].version;
      }
    } catch {
      // Not found in this dir, try next
    }
  }

  return null;
};

export const registerVerifyCommand = (program: Command): void => {
  program
    .command('verify <name>')
    .description('Verify the Sigstore signature of an installed skill')
    .option('--json', 'Output machine-readable JSON')
    .action(async (name: string, opts: { json?: boolean }) => {
      const mode = getCurrentMode();

      // Look up installed version
      const version = await getInstalledVersion(name);
      if (!version) {
        logError(
          'Skill not installed',
          `Could not find ${name} in skills-lock.json.`,
          `Run ${c.cmd(`spm install ${name}`)} first.`,
        );
        process.exitCode = 1;
        return;
      }

      // Check for .skl file
      const sklPath = getSklPath(name, version);
      try {
        await readFile(sklPath);
      } catch {
        logError(
          'Package not cached',
          `Could not find ${name}-${version}.skl in cache.`,
          `Run ${c.cmd(`spm install ${name}`)} to re-download.`,
        );
        process.exitCode = 1;
        return;
      }

      // Check for signature bundle
      const bundlePath = getBundlePath(name, version);
      let bundleJson: string;
      try {
        bundleJson = await readFile(bundlePath, 'utf-8');
      } catch {
        // No signature file — unsigned package
        if (opts.json) {
          logJson({
            command: 'verify',
            name,
            version,
            signed: false,
            verified: false,
            message: 'No signature found',
          });
          return;
        }

        log(`${icons.warning} ${c.name(name)}@${c.version(version)} — No signature found`);
        log(`  This package was published without a Sigstore signature.`);
        return;
      }

      // Verify the signature
      if (mode !== 'json') {
        log(`${icons.lock} Verifying ${c.name(name)}@${c.version(version)}...`);
      }

      const result = await withSpinner('Verifying signature...', () =>
        verifyPackage(sklPath, bundleJson),
      );

      if (result.verified) {
        if (opts.json) {
          logJson({
            command: 'verify',
            name,
            version,
            signed: true,
            verified: true,
            signer: result.signerIdentity,
          });
          return;
        }

        log(`${icons.success} Signed by ${c.trust(result.signerIdentity ?? 'unknown')} (Sigstore)`);
      } else {
        if (opts.json) {
          logJson({
            command: 'verify',
            name,
            version,
            signed: true,
            verified: false,
            error: result.error,
          });
          return;
        }

        log(`${icons.error} ${c.err('Signature verification failed')}`);
        if (result.error) {
          log(`  ${result.error}`);
        }
        process.exitCode = 1;
      }
    });
};
