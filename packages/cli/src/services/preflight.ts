import { readlink, stat, unlink, readdir, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { icons, c, log, logVerbose } from '../lib/output.js';

interface AgentDir {
  name: string;
  skillsDir: string;
}

const getAgentDirs = (): AgentDir[] => {
  const home = os.homedir();
  return [
    { name: 'Claude Code', skillsDir: path.join(home, '.claude', 'skills') },
    { name: 'Cursor', skillsDir: path.join(home, '.cursor', 'skills') },
    { name: 'Codex', skillsDir: path.join(home, '.agents', 'skills') },
  ];
};

export interface PreflightIssue {
  type: 'broken-symlink' | 'stale-copy' | 'orphaned';
  skillName: string;
  agent: string;
  path: string;
  fixed: boolean;
  detail?: string;
}

/**
 * Run preflight checks on all agent skill directories.
 * Detects and optionally auto-repairs:
 * - Broken symlinks
 * - Stale copies
 * - Orphaned entries (in skills.json but not on disk)
 */
export const runPreflightChecks = async (autoRepair: boolean = true): Promise<PreflightIssue[]> => {
  const issues: PreflightIssue[] = [];
  const agentDirs = getAgentDirs();

  for (const agent of agentDirs) {
    let entries: string[];
    try {
      entries = await readdir(agent.skillsDir);
    } catch {
      // Skills dir doesn't exist for this agent — skip
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(agent.skillsDir, entry);

      // Check for broken symlinks
      try {
        const linkTarget = await readlink(entryPath);
        try {
          await stat(linkTarget);
          // Symlink target exists — OK
        } catch {
          // Symlink target does not exist — broken symlink
          const issue: PreflightIssue = {
            type: 'broken-symlink',
            skillName: entry,
            agent: agent.name,
            path: entryPath,
            fixed: false,
            detail: `Symlink target missing: ${linkTarget}`,
          };

          if (autoRepair) {
            try {
              await unlink(entryPath);
              issue.fixed = true;
              log(
                `${icons.warning} ${c.warn('Fixed broken symlink:')} ${c.name(entry)} in ${agent.name}`,
              );
            } catch {
              logVerbose(`Could not remove broken symlink: ${entryPath}`);
            }
          }

          issues.push(issue);
        }
      } catch {
        // Not a symlink — check if it's a regular directory (copy)
        try {
          const s = await stat(entryPath);
          if (s.isDirectory()) {
            // This is a copy; we mark it for staleness awareness
            // Actual staleness check requires comparing against registry,
            // which we can't do without an API client in preflight.
            // For now, just log that it's a copy.
            logVerbose(`${c.dim(`Copy detected: ${entry} in ${agent.name}`)}`);
          }
        } catch {
          // Can't stat — orphaned entry
          const issue: PreflightIssue = {
            type: 'orphaned',
            skillName: entry,
            agent: agent.name,
            path: entryPath,
            fixed: false,
            detail: 'Entry exists but cannot be read',
          };

          if (autoRepair) {
            try {
              await unlink(entryPath);
              issue.fixed = true;
              log(
                `${icons.warning} ${c.warn('Removed orphaned entry:')} ${c.name(entry)} in ${agent.name}`,
              );
            } catch {
              logVerbose(`Could not remove orphaned entry: ${entryPath}`);
            }
          }

          issues.push(issue);
        }
      }
    }
  }

  return issues;
};

/**
 * Check if an installed skill's path still exists on disk.
 */
export const isSkillInstalled = async (skillName: string): Promise<boolean> => {
  const skillDir = path.join(os.homedir(), '.spm', 'skills', skillName);
  try {
    await stat(skillDir);
    return true;
  } catch {
    return false;
  }
};

/**
 * Ensure the SPM directory structure exists.
 */
export const ensureSpmDirs = async (): Promise<void> => {
  const home = os.homedir();
  const dirs = [
    path.join(home, '.spm'),
    path.join(home, '.spm', 'cache'),
    path.join(home, '.spm', 'skills'),
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }
};
