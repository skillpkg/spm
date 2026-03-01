import { execFile } from 'node:child_process';
import { mkdir, symlink, readlink, unlink, readdir, stat, cp } from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { logVerbose } from '../lib/output.js';

/** Agent directory definitions */
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

interface LinkResult {
  agents: string[];
  method: 'vercel-skills-cli' | 'symlink' | 'copy';
  isCopy: boolean;
}

/**
 * Execute npx skills add with timeout.
 * Returns parsed agent names on success, null on failure.
 */
const tryVercelSkillsCli = (skillPath: string): Promise<string[] | null> => {
  return new Promise((resolve) => {
    execFile(
      'npx',
      ['skills', 'add', skillPath, '-a', '*', '-y'],
      { timeout: 30_000 },
      (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        // Parse output for agent names; each linked agent typically shows on its own line
        const agents: string[] = [];
        const lines = stdout.split('\n');
        for (const line of lines) {
          const lower = line.toLowerCase();
          if (lower.includes('claude')) agents.push('Claude Code');
          if (lower.includes('cursor')) agents.push('Cursor');
          if (lower.includes('codex')) agents.push('Codex');
          if (lower.includes('copilot')) agents.push('Copilot');
        }
        resolve(agents.length > 0 ? agents : ['linked']);
      },
    );
  });
};

/**
 * Try to create a symlink to the agent's skills directory.
 * Returns true on success, false on failure.
 */
const trySymlink = async (skillPath: string, targetDir: string): Promise<boolean> => {
  try {
    await mkdir(path.dirname(targetDir), { recursive: true });

    // Remove existing link/dir if present
    try {
      const existing = await readlink(targetDir);
      if (existing === skillPath) return true; // already linked correctly
      await unlink(targetDir);
    } catch {
      // No existing link, or it's a regular file/dir — try to remove
      try {
        await unlink(targetDir);
      } catch {
        // Nothing to remove
      }
    }

    await symlink(skillPath, targetDir, 'dir');
    return true;
  } catch {
    return false;
  }
};

/**
 * Copy skill files as last resort.
 */
const tryCopy = async (skillPath: string, targetDir: string): Promise<boolean> => {
  try {
    await mkdir(targetDir, { recursive: true });
    await cp(skillPath, targetDir, { recursive: true });
    return true;
  } catch {
    return false;
  }
};

/**
 * Link a skill to all detected agent directories.
 * Fallback chain: Vercel skills CLI -> symlink -> copy
 */
export const linkSkill = async (skillPath: string, skillName: string): Promise<LinkResult> => {
  // Method 1: Try Vercel skills CLI
  logVerbose(`Trying Vercel skills CLI for ${skillName}...`);
  const vercelAgents = await tryVercelSkillsCli(skillPath);
  if (vercelAgents) {
    logVerbose(`Linked via Vercel skills CLI to: ${vercelAgents.join(', ')}`);
    return { agents: vercelAgents, method: 'vercel-skills-cli', isCopy: false };
  }

  // Method 2: Try direct symlinks to agent dirs
  logVerbose('Vercel skills CLI not available, trying symlinks...');
  const agentDirs = getAgentDirs();
  const linkedAgents: string[] = [];

  for (const agent of agentDirs) {
    const targetDir = path.join(agent.skillsDir, skillName);
    const success = await trySymlink(skillPath, targetDir);
    if (success) {
      linkedAgents.push(agent.name);
      logVerbose(`Symlinked to ${agent.name}: ${targetDir}`);
    }
  }

  if (linkedAgents.length > 0) {
    return { agents: linkedAgents, method: 'symlink', isCopy: false };
  }

  // Method 3: Fall back to file copy
  logVerbose('Symlinks failed, falling back to copy...');
  const copiedAgents: string[] = [];

  for (const agent of agentDirs) {
    const targetDir = path.join(agent.skillsDir, skillName);
    const success = await tryCopy(skillPath, targetDir);
    if (success) {
      copiedAgents.push(agent.name);
      logVerbose(`Copied to ${agent.name}: ${targetDir}`);
    }
  }

  return { agents: copiedAgents, method: 'copy', isCopy: true };
};

/**
 * Unlink a skill from all agent directories.
 * Always does manual removal to ensure symlinks/copies are cleaned up,
 * and optionally tries Vercel skills CLI for additional cleanup.
 */
export const unlinkSkill = async (skillName: string): Promise<string[]> => {
  const agentDirs = getAgentDirs();
  const unlinkedAgents: string[] = [];

  // Manual removal from all agent dirs
  for (const agent of agentDirs) {
    const targetDir = path.join(agent.skillsDir, skillName);
    try {
      // Use lstat to check without following symlinks
      await stat(targetDir).catch(() => null);
      const linkTarget = await readlink(targetDir).catch(() => null);

      if (linkTarget !== null) {
        // It's a symlink — remove it
        await unlink(targetDir);
        unlinkedAgents.push(agent.name);
      } else {
        // Check if it's a directory (copy)
        const s = await stat(targetDir).catch(() => null);
        if (s?.isDirectory()) {
          const { rm } = await import('node:fs/promises');
          await rm(targetDir, { recursive: true, force: true });
          unlinkedAgents.push(agent.name);
        }
      }
    } catch {
      // Directory doesn't exist or can't be accessed, skip
    }
  }

  // Also try Vercel skills CLI for any agents we might have missed
  try {
    await new Promise<void>((resolve, reject) => {
      execFile('npx', ['skills', 'remove', skillName, '-y'], { timeout: 30_000 }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  } catch {
    // Vercel skills CLI not available or failed — that's fine
  }

  return unlinkedAgents;
};

/**
 * Get list of agents that have a given skill linked.
 */
export const getLinkedAgents = async (skillName: string): Promise<string[]> => {
  const agentDirs = getAgentDirs();
  const linked: string[] = [];

  for (const agent of agentDirs) {
    const targetDir = path.join(agent.skillsDir, skillName);
    try {
      await stat(targetDir);
      linked.push(agent.name);
    } catch {
      // Not present
    }
  }

  return linked;
};

/**
 * Check if a skill was installed via copy (not symlink).
 */
export const isSkillCopy = async (skillName: string): Promise<boolean> => {
  const agentDirs = getAgentDirs();
  for (const agent of agentDirs) {
    const targetDir = path.join(agent.skillsDir, skillName);
    try {
      await readlink(targetDir);
      return false; // It's a symlink
    } catch {
      try {
        await stat(targetDir);
        return true; // Exists but not a symlink — it's a copy
      } catch {
        // Doesn't exist in this agent dir
      }
    }
  }
  return false;
};

/**
 * List all skills found in a specific agent's skills directory.
 */
export const listAgentSkills = async (agentIndex: number): Promise<string[]> => {
  const agentDirs = getAgentDirs();
  if (agentIndex < 0 || agentIndex >= agentDirs.length) return [];

  const agent = agentDirs[agentIndex];
  try {
    const entries = await readdir(agent.skillsDir);
    return entries;
  } catch {
    return [];
  }
};
