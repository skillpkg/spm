import chalk from 'chalk';
import ora, { type Ora } from 'ora';

// -- Status icons --
export const icons = {
  success: chalk.green('\u2713'),
  error: chalk.red('\u2717'),
  warning: chalk.yellow('\u26a0'),
  info: chalk.blue('\u2139'),
  pending: chalk.gray('\u25cb'),
  arrow: chalk.gray('\u2192'),
  bullet: chalk.gray('\u2022'),
  shield: chalk.green('\ud83d\udee1'),
  package: '\ud83d\udce6',
  link: '\ud83d\udd17',
  lock: '\ud83d\udd12',
} as const;

// -- Semantic colors --
export const c = {
  name: chalk.cyan,
  version: chalk.cyan.dim,
  cmd: chalk.cyan.bold,
  path: chalk.underline,
  url: chalk.blue.underline,
  trust: chalk.green,
  dim: chalk.gray,
  bold: chalk.bold,
  err: chalk.red,
  warn: chalk.yellow,
  hint: chalk.blue,
} as const;

// -- Output modes --
export type OutputMode = 'default' | 'verbose' | 'silent' | 'json';

export interface OutputOpts {
  verbose?: boolean;
  silent?: boolean;
  json?: boolean;
}

let currentMode: OutputMode = 'default';

export const getOutputMode = (opts?: OutputOpts): OutputMode => {
  if (!opts) return currentMode;
  if (opts.json) return 'json';
  if (opts.silent) return 'silent';
  if (opts.verbose) return 'verbose';
  return 'default';
};

export const setOutputMode = (mode: OutputMode): void => {
  currentMode = mode;
};

export const getCurrentMode = (): OutputMode => currentMode;

// -- CI detection --
export const isCI = (): boolean => process.env.CI === 'true';

// -- Logging functions --
// All output is indented 2 spaces from the left margin per spec.

export const log = (msg: string): void => {
  if (currentMode === 'silent' || currentMode === 'json') return;
  console.log(`  ${msg}`);
};

export const logVerbose = (msg: string): void => {
  if (currentMode !== 'verbose') return;
  console.log(`  ${msg}`);
};

export const logJson = (data: unknown): void => {
  if (currentMode !== 'json') return;
  console.log(JSON.stringify(data, null, 2));
};

export const logError = (title: string, detail?: string, hint?: string): void => {
  if (currentMode === 'json') return;
  console.log('');
  console.log(`  ${icons.error} ${title}`);
  if (detail) {
    console.log('');
    console.log(`    ${detail}`);
  }
  if (hint) {
    console.log('');
    console.log(`    \ud83d\udca1 ${hint}`);
  }
};

// -- Spinner --

const noopSpinner = (text: string): Ora => {
  const spinner = ora({ text, isEnabled: false });
  return spinner;
};

export const withSpinner = async <T>(text: string, fn: () => Promise<T>): Promise<T> => {
  if (currentMode === 'silent' || currentMode === 'json' || isCI()) {
    return fn();
  }

  const spinner = isCI() ? noopSpinner(text) : ora({ text, color: 'cyan', indent: 2 }).start();

  try {
    const result = await fn();
    spinner.succeed();
    return result;
  } catch (err) {
    spinner.fail();
    throw err;
  }
};
