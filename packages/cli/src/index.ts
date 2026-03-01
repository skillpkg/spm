#!/usr/bin/env node

import { Command } from 'commander';
import { getOutputMode, setOutputMode } from './lib/output.js';
import { registerLoginCommand } from './commands/login.js';
import { registerLogoutCommand } from './commands/logout.js';
import { registerWhoamiCommand } from './commands/whoami.js';
import { registerSearchCommand } from './commands/search.js';
import { registerInfoCommand } from './commands/info.js';
import { registerListCommand } from './commands/list.js';
import { registerInstallCommand } from './commands/install.js';
import { registerUninstallCommand } from './commands/uninstall.js';
import { registerUpdateCommand } from './commands/update.js';
import { registerAgentsCommand } from './commands/agents.js';
import { registerInitCommand } from './commands/init.js';
import { registerTestCommand } from './commands/test.js';
import { registerPackCommand } from './commands/pack.js';
import { registerVersionCommand } from './commands/version.js';
import { registerPublishCommand } from './commands/publish.js';
import { registerYankCommand } from './commands/yank.js';
import { registerDeprecateCommand } from './commands/deprecate.js';
import { registerReportCommand } from './commands/report.js';
import { registerVerifyCommand } from './commands/verify.js';

const program = new Command();

program
  .name('spm')
  .description('Skills Package Manager — install, manage, and publish AI agent skills')
  .version('0.0.1')
  .option('--verbose', 'Show detailed output')
  .option('--silent', 'Suppress all output (exit code only)')
  .option('--json', 'Output machine-readable JSON')
  .option('--no-color', 'Disable colored output')
  .option('--registry <url>', 'Use a custom registry URL')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts() as { verbose?: boolean; silent?: boolean; json?: boolean };
    setOutputMode(getOutputMode(opts));
  });

// -- Auth commands --
registerLoginCommand(program);
registerLogoutCommand(program);
registerWhoamiCommand(program);

// -- Discovery commands --
registerSearchCommand(program);
registerInfoCommand(program);
registerListCommand(program);

// -- Package management commands --
registerInstallCommand(program);
registerUninstallCommand(program);
registerUpdateCommand(program);

// -- Authoring commands --
registerInitCommand(program);
registerTestCommand(program);
registerPackCommand(program);
registerVersionCommand(program);

// -- Publishing commands --
registerPublishCommand(program);
registerYankCommand(program);
registerDeprecateCommand(program);
registerReportCommand(program);

// -- Security commands --
registerVerifyCommand(program);

// -- Agent commands --
registerAgentsCommand(program);

program.parse();
