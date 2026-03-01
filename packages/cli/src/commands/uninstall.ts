import { Command } from 'commander';
import { rm } from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { icons, c, log, logVerbose, logJson, setOutputMode, getOutputMode } from '../lib/output.js';
import { unlinkSkill } from '../services/linker.js';
import {
  removeSkillFromJson,
  removeFromLockFile,
  getGlobalSkillsDir,
} from '../services/skills-json.js';

interface UninstallOpts {
  global?: boolean;
  verbose?: boolean;
  json?: boolean;
  silent?: boolean;
  keepCache?: boolean;
}

export const registerUninstallCommand = (program: Command): void => {
  program
    .command('uninstall <skill>')
    .aliases(['remove', 'rm', 'un'])
    .description('Uninstall a skill')
    .option('-g, --global', 'Uninstall from global')
    .option('--keep-cache', 'Keep cached .skl file')
    .option('--verbose', 'Verbose output')
    .option('--json', 'JSON output')
    .option('--silent', 'No output')
    .action(async (skillName: string, opts: UninstallOpts) => {
      setOutputMode(getOutputMode(opts));

      const isGlobal = opts.global ?? false;
      const targetDir = isGlobal ? getGlobalSkillsDir() : process.cwd();

      // Remove from skills.json
      const removedFromJson = await removeSkillFromJson(targetDir, skillName);
      if (removedFromJson) {
        logVerbose(`Removed ${skillName} from skills.json`);
      }

      // Unlink from agents
      const unlinkedAgents = await unlinkSkill(skillName);
      if (unlinkedAgents.length > 0) {
        logVerbose(`Unlinked from: ${unlinkedAgents.join(', ')}`);
      }

      // Remove from lock file
      const removedFromLock = await removeFromLockFile(targetDir, skillName);
      if (removedFromLock) {
        logVerbose(`Removed ${skillName} from skills-lock.json`);
      }

      // Remove skill files from store
      const skillStoreDir = path.join(os.homedir(), '.spm', 'skills', skillName);
      try {
        await rm(skillStoreDir, { recursive: true, force: true });
        logVerbose(`Removed skill files: ${skillStoreDir}`);
      } catch {
        logVerbose(`Skill files not found at ${skillStoreDir}`);
      }

      // Optionally remove cache
      if (!opts.keepCache) {
        const cacheDir = path.join(os.homedir(), '.spm', 'cache', skillName);
        try {
          await rm(cacheDir, { recursive: true, force: true });
          logVerbose(`Removed cache: ${cacheDir}`);
        } catch {
          // Cache may not exist
        }
      }

      if (opts.json) {
        logJson({
          command: 'uninstall',
          status: 'success',
          skill: skillName,
          removed_from_json: removedFromJson,
          unlinked_agents: unlinkedAgents,
        });
        return;
      }

      log('');
      log(`${icons.success} ${c.name(skillName)} uninstalled`);
      if (unlinkedAgents.length > 0) {
        log(`  Unlinked from: ${unlinkedAgents.join(', ')}`);
      }
      if (removedFromJson) {
        log(`  Removed from skills.json`);
      }
      if (removedFromLock) {
        log(`  Removed from skills-lock.json`);
      }
      if (!opts.keepCache) {
        log(`  ${c.dim(`Cache retained. Reinstall: ${c.cmd(`spm install ${skillName}`)}`)}`);
      }
    });
};
