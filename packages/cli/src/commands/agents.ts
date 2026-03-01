import { Command } from 'commander';
import { icons, c, log, logJson, getOutputMode } from '../lib/output.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// -- Types --

interface AgentInfo {
  name: string;
  skillsDir: string;
  detected: boolean;
  skillCount: number;
}

// -- Agent definitions --

const KNOWN_AGENTS: Array<{ name: string; dir: string }> = [
  { name: 'Claude Code', dir: path.join(os.homedir(), '.claude', 'skills') },
  { name: 'Cursor', dir: path.join(os.homedir(), '.cursor', 'skills') },
  { name: 'Codex', dir: path.join(os.homedir(), '.agents', 'skills') },
  { name: 'Copilot', dir: path.join(os.homedir(), '.copilot', 'skills') },
  { name: 'Gemini CLI', dir: path.join(os.homedir(), '.gemini', 'skills') },
];

// -- Helpers --

const detectAgent = (agentDef: { name: string; dir: string }): AgentInfo => {
  const exists = fs.existsSync(agentDef.dir);
  let skillCount = 0;

  if (exists) {
    try {
      const entries = fs.readdirSync(agentDef.dir, { withFileTypes: true });
      skillCount = entries.filter((e) => e.isDirectory()).length;
    } catch {
      // Directory exists but can't be read
    }
  }

  return {
    name: agentDef.name,
    skillsDir: agentDef.dir,
    detected: exists,
    skillCount,
  };
};

const shortenPath = (fullPath: string): string => {
  const home = os.homedir();
  if (fullPath.startsWith(home)) {
    return '~' + fullPath.slice(home.length);
  }
  return fullPath;
};

// -- Command --

export const registerAgentsCommand = (program: Command): void => {
  program
    .command('agents')
    .description('Detect installed AI agents and linked skills')
    .action(async () => {
      const mode = getOutputMode();
      if (mode === 'silent') return;

      const agents = KNOWN_AGENTS.map(detectAgent);

      if (mode === 'json') {
        logJson(agents);
        return;
      }

      log('');
      log('  Detected agents:');

      for (const agent of agents) {
        if (agent.detected) {
          const nameCol = c.name(agent.name.padEnd(15));
          const pathCol = c.dim(shortenPath(agent.skillsDir).padEnd(28));
          const countStr = `${agent.skillCount} skill${agent.skillCount === 1 ? '' : 's'} linked`;
          log(`    ${icons.success} ${nameCol}${pathCol}${countStr}`);
        } else {
          const nameCol = c.dim(agent.name.padEnd(15));
          log(`    ${icons.pending} ${nameCol}${c.dim('(not detected)')}`);
        }
      }

      const totalSkills = agents.reduce((sum, a) => sum + a.skillCount, 0);
      const detectedCount = agents.filter((a) => a.detected).length;

      log('');
      if (detectedCount > 0 && totalSkills > 0) {
        log(
          `  ${totalSkills} skill${totalSkills === 1 ? '' : 's'} linked across ${detectedCount} agent${detectedCount === 1 ? '' : 's'}`,
        );
      } else if (detectedCount > 0) {
        log(
          `  ${detectedCount} agent${detectedCount === 1 ? '' : 's'} detected, no skills linked yet`,
        );
        log(`  ${c.hint('Install a skill: spm install <name>')}`);
      } else {
        log(`  ${icons.info} No agents detected`);
        log(`  ${c.hint('Install an AI agent to get started.')}`);
      }
      log('');
    });
};
