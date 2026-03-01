import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ManifestSchema } from '@spm/shared';
import type { Manifest } from '@spm/shared';
import * as tar from 'tar';
import { icons, c, log, logJson, getOutputMode, logError, withSpinner } from '../lib/output.js';

// -- Helpers --

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const collectScriptFiles = async (dir: string, cwd: string): Promise<string[]> => {
  const files: string[] = [];
  const entries = await fs.readdir(dir);
  for (const name of entries) {
    const fullPath = path.join(dir, name);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      const sub = await collectScriptFiles(fullPath, cwd);
      files.push(...sub);
    } else {
      files.push(path.relative(cwd, fullPath));
    }
  }
  return files;
};

const collectPackFiles = async (cwd: string, manifest: Manifest): Promise<string[]> => {
  const files: string[] = [];

  // Always include manifest.json
  files.push('manifest.json');

  // Always include SKILL.md if it exists
  try {
    await fs.access(path.join(cwd, 'SKILL.md'));
    files.push('SKILL.md');
  } catch {
    // SKILL.md is optional but recommended
  }

  // Include scripts/ directory
  const scriptsDir = path.join(cwd, 'scripts');
  try {
    const scriptFiles = await collectScriptFiles(scriptsDir, cwd);
    files.push(...scriptFiles);
  } catch {
    // scripts/ not required
  }

  // Include files from manifest.files.include
  if (manifest.files?.include) {
    for (const pattern of manifest.files.include) {
      // Simple glob: just add the file if it exists
      try {
        await fs.access(path.join(cwd, pattern));
        if (!files.includes(pattern)) {
          files.push(pattern);
        }
      } catch {
        // File doesn't exist, skip
      }
    }
  }

  return files;
};

// -- Command --

export const registerPackCommand = (program: Command): void => {
  program
    .command('pack')
    .description('Create a .skl archive from the current skill')
    .action(async () => {
      const mode = getOutputMode();
      if (mode === 'silent') return;

      try {
        const cwd = process.cwd();
        const manifestPath = path.join(cwd, 'manifest.json');

        // Read and validate manifest
        let rawManifest: string;
        try {
          rawManifest = await fs.readFile(manifestPath, 'utf-8');
        } catch {
          logError(
            'No manifest.json found',
            'This command must be run in a skill directory.',
            `Run ${c.cmd('spm init')} to create a new skill.`,
          );
          process.exitCode = 1;
          return;
        }

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(rawManifest);
        } catch {
          logError('Invalid manifest.json', 'File is not valid JSON.');
          process.exitCode = 1;
          return;
        }

        const result = ManifestSchema.safeParse(parsedJson);
        if (!result.success) {
          const issues = result.error.issues
            .map((i) => `  ${i.path.join('.')}: ${i.message}`)
            .join('\n');
          logError('Invalid manifest.json', `Validation errors:\n${issues}`);
          process.exitCode = 1;
          return;
        }

        const manifest = result.data;
        const archiveName = `${manifest.name.replace('/', '-')}-${manifest.version}.skl`;
        const archivePath = path.join(cwd, archiveName);

        // Collect files
        const files = await collectPackFiles(cwd, manifest);

        if (files.length === 0) {
          logError('No files to pack', 'The skill directory appears to be empty.');
          process.exitCode = 1;
          return;
        }

        // Create tar.gz archive
        await withSpinner(
          `Packing ${c.name(`${manifest.name}@${manifest.version}`)}...`,
          async () => {
            await tar.create(
              {
                gzip: true,
                file: archivePath,
                cwd,
              },
              files,
            );
          },
        );

        // Get archive size
        const stat = await fs.stat(archivePath);

        if (mode === 'json') {
          logJson({
            name: manifest.name,
            version: manifest.version,
            archive: archiveName,
            files: files.length,
            size: stat.size,
          });
          return;
        }

        log('');
        log(
          `${icons.success} Packed ${c.name(`${manifest.name}@${manifest.version}`)} (${files.length} file${files.length === 1 ? '' : 's'}, ${formatBytes(stat.size)})`,
        );
        log('');
        for (const file of files) {
          log(`  ${c.dim(file)}`);
        }
        log('');
        log(`  ${c.dim('Archive:')} ${c.path(archiveName)}`);
        log(`  ${c.dim('Publish:')} ${c.cmd('spm publish')}`);
        log('');
      } catch (err) {
        logError('Pack failed', err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
};
