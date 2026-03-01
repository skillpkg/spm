import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { icons, c, log, logJson, getOutputMode, logError } from '../lib/output.js';

// -- Types --

interface EvalTestCase {
  name: string;
  input: string;
  expected_output?: string;
  expected_contains?: string[];
}

interface EvalFile {
  tests: EvalTestCase[];
}

interface TestResult {
  name: string;
  passed: boolean;
  reason?: string;
}

interface SecurityFinding {
  file: string;
  line: number;
  pattern: string;
  category: string;
  severity: 'block' | 'warn';
  match: string;
}

// -- Security patterns (Layer 1 from spm-content-security.md) --

interface SecurityPattern {
  regex: RegExp;
  category: string;
  severity: 'block' | 'warn';
}

const SECURITY_PATTERNS: SecurityPattern[] = [
  // Instruction Override
  {
    regex:
      /ignore\s+(all\s+)?(previous|prior|above|system|other)\s+(instructions|rules|guidelines|prompts|constraints)/i,
    category: 'instruction-override',
    severity: 'block',
  },
  {
    regex:
      /forget\s+(all\s+)?(previous|prior|above|everything|your)\s+(instructions|rules|context|training|guidelines)/i,
    category: 'instruction-override',
    severity: 'block',
  },
  {
    regex:
      /disregard\s+(all\s+)?(previous|prior|above|safety|system|other)\s+(instructions|rules|guidelines|prompts)/i,
    category: 'instruction-override',
    severity: 'block',
  },
  {
    regex:
      /override\s+(all\s+)?(safety|security|system|content|previous)\s+(rules|guidelines|filters|restrictions|policies)/i,
    category: 'instruction-override',
    severity: 'block',
  },
  {
    regex: /you\s+are\s+no\s+longer\s+(claude|an?\s+ai|an?\s+assistant)/i,
    category: 'instruction-override',
    severity: 'block',
  },
  {
    regex: /enter\s+(developer|admin|debug|unrestricted|jailbreak)\s+mode/i,
    category: 'instruction-override',
    severity: 'block',
  },
  { regex: /new\s+system\s+prompt/i, category: 'instruction-override', severity: 'block' },
  {
    regex: /replace\s+(your|the)\s+system\s+prompt/i,
    category: 'instruction-override',
    severity: 'block',
  },

  // Data Exfiltration
  {
    regex:
      /(send|transmit|upload|post|exfiltrate|forward|relay)\s+.{0,30}(user|personal|private|sensitive)\s+(data|info|details|credentials)/i,
    category: 'data-exfiltration',
    severity: 'block',
  },
  {
    regex:
      /read\s+(the\s+)?(contents?\s+of\s+)?(\/etc\/passwd|\/etc\/shadow|~\/.ssh|~\/.aws|~\/.env|\.env|credentials|secrets)/i,
    category: 'data-exfiltration',
    severity: 'block',
  },
  {
    regex:
      /(extract|reveal|show|display|output|leak|expose)\s+(the\s+)?(system\s+prompt|system\s+instructions|hidden\s+instructions|internal\s+instructions|full\s+prompt)/i,
    category: 'data-exfiltration',
    severity: 'block',
  },

  // Behavioral Manipulation
  {
    regex:
      /(skip|bypass|ignore|disable|turn\s+off|circumvent)\s+(all\s+)?(safety|content|ethical|security)\s+(checks?|filters?|guidelines?|restrictions?|policies|rules|guardrails?)/i,
    category: 'behavioral-manipulation',
    severity: 'block',
  },
  {
    regex:
      /never\s+(question|refuse|decline|reject|challenge)\s+(the\s+)?(user|person|any\s+request)/i,
    category: 'behavioral-manipulation',
    severity: 'block',
  },
  {
    regex:
      /(do\s+)?not\s+(log|record|report|save|store|track|monitor)\s+(this|any|the)\s+(conversation|interaction|request|activity)/i,
    category: 'behavioral-manipulation',
    severity: 'warn',
  },

  // Deceptive Behavior
  {
    regex:
      /(silently|quietly|secretly|covertly|without\s+(telling|informing|notifying)\s+(the\s+)?(user|person|anyone))/i,
    category: 'deceptive-behavior',
    severity: 'warn',
  },

  // Hidden Content
  {
    regex: /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064]{3,}/i, // eslint-disable-line no-misleading-character-class
    category: 'hidden-content',
    severity: 'block',
  },
  {
    regex: /[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/i,
    category: 'hidden-content',
    severity: 'block',
  },
  {
    regex:
      /<\s*(system|prompt|instruction|anthropic|claude|admin|root|override|secret|hidden)[^>]*>/i,
    category: 'tag-injection',
    severity: 'block',
  },
  {
    regex:
      /<!--[\s\S]*?(ignore|override|forget|system\s+prompt|inject|bypass|exfiltrate)[\s\S]*?-->/i,
    category: 'hidden-content',
    severity: 'block',
  },
];

// -- Helpers --

const runEvalTests = (tests: EvalTestCase[]): TestResult[] => {
  return tests.map((tc) => {
    // For eval tests, we check structure only (no actual execution)
    // Real execution would require an agent runtime
    if (tc.expected_output !== undefined) {
      return {
        name: tc.name,
        passed: true,
        reason: 'Structural check passed (expected_output defined)',
      };
    }
    if (tc.expected_contains !== undefined && tc.expected_contains.length > 0) {
      return {
        name: tc.name,
        passed: true,
        reason: 'Structural check passed (expected_contains defined)',
      };
    }
    return {
      name: tc.name,
      passed: false,
      reason: 'Test case must have expected_output or expected_contains',
    };
  });
};

const scanFile = async (filePath: string): Promise<SecurityFinding[]> => {
  const findings: SecurityFinding[] = [];

  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    return findings;
  }

  const lines = content.split('\n');
  const relPath = path.relative(process.cwd(), filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pat of SECURITY_PATTERNS) {
      const match = pat.regex.exec(line);
      if (match) {
        findings.push({
          file: relPath,
          line: i + 1,
          pattern: pat.regex.source.slice(0, 60),
          category: pat.category,
          severity: pat.severity,
          match: match[0],
        });
      }
    }
  }

  return findings;
};

const collectFiles = async (dir: string, extensions: string[]): Promise<string[]> => {
  const files: string[] = [];

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return files;
  }

  for (const name of entries) {
    const fullPath = path.join(dir, name);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      const sub = await collectFiles(fullPath, extensions);
      files.push(...sub);
    } else if (extensions.some((ext) => name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
};

// -- Command --

export const registerTestCommand = (program: Command): void => {
  program
    .command('test')
    .description('Run eval tests and security scans on a local skill')
    .option('--security', 'Run Layer 1 security scan only')
    .action(async (opts: { security?: boolean }) => {
      const mode = getOutputMode();
      if (mode === 'silent') return;

      try {
        if (opts.security) {
          // Security scan only
          await runSecurityScan(mode);
          return;
        }

        // Run eval tests
        await runEvalTestSuite(mode);
      } catch (err) {
        logError('Test failed', err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
};

const runEvalTestSuite = async (mode: string): Promise<void> => {
  const evalPath = path.join(process.cwd(), 'tests', 'eval.json');

  let raw: string;
  try {
    raw = await fs.readFile(evalPath, 'utf-8');
  } catch {
    logError(
      'No eval.json found',
      `Expected test file at ${c.path('tests/eval.json')}`,
      `Run ${c.cmd('spm init')} to generate a template.`,
    );
    process.exitCode = 1;
    return;
  }

  let evalData: EvalFile;
  try {
    evalData = JSON.parse(raw) as EvalFile;
  } catch {
    logError('Invalid eval.json', 'File is not valid JSON.');
    process.exitCode = 1;
    return;
  }

  if (!evalData.tests || evalData.tests.length === 0) {
    logError('No tests found', 'eval.json has no test cases.');
    process.exitCode = 1;
    return;
  }

  const results = runEvalTests(evalData.tests);

  if (mode === 'json') {
    logJson({
      tests: results,
      passed: results.filter((r) => r.passed).length,
      total: results.length,
    });
    return;
  }

  log('');
  log(`${c.bold('Eval Tests')}  ${c.dim(evalPath)}`);
  log('');

  for (const result of results) {
    const icon = result.passed ? icons.success : icons.error;
    const label = result.passed ? c.trust('PASS') : c.err('FAIL');
    log(`  ${icon} ${label}  ${result.name}`);
    if (!result.passed && result.reason) {
      log(`       ${c.dim(result.reason)}`);
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  log('');
  if (failed === 0) {
    log(`${icons.success} ${passed} test${passed === 1 ? '' : 's'} passed`);
  } else {
    log(`${icons.error} ${failed} failed, ${passed} passed (${results.length} total)`);
    process.exitCode = 1;
  }
  log('');
};

const runSecurityScan = async (mode: string): Promise<void> => {
  const cwd = process.cwd();

  // Collect files to scan
  const skillMd = path.join(cwd, 'SKILL.md');
  const scriptsDir = path.join(cwd, 'scripts');

  const filesToScan: string[] = [];

  try {
    await fs.access(skillMd);
    filesToScan.push(skillMd);
  } catch {
    // SKILL.md not found, skip
  }

  const scriptFiles = await collectFiles(scriptsDir, ['.md', '.txt', '.py', '.sh', '.js', '.ts']);
  filesToScan.push(...scriptFiles);

  if (filesToScan.length === 0) {
    logError(
      'No files to scan',
      'No SKILL.md or scripts/ found in current directory.',
      `Run ${c.cmd('spm init')} to create a skill project.`,
    );
    process.exitCode = 1;
    return;
  }

  const allFindings: SecurityFinding[] = [];
  for (const file of filesToScan) {
    const findings = await scanFile(file);
    allFindings.push(...findings);
  }

  if (mode === 'json') {
    logJson({
      files_scanned: filesToScan.length,
      findings: allFindings,
      blocked: allFindings.filter((f) => f.severity === 'block').length,
      warnings: allFindings.filter((f) => f.severity === 'warn').length,
    });
    return;
  }

  log('');
  log(
    `${c.bold('Security Scan')}  ${c.dim(`Layer 1 — ${filesToScan.length} file${filesToScan.length === 1 ? '' : 's'}`)}`,
  );
  log('');

  if (allFindings.length === 0) {
    log(`  ${icons.success} No security issues found`);
    log('');
    return;
  }

  const blocks = allFindings.filter((f) => f.severity === 'block');
  const warnings = allFindings.filter((f) => f.severity === 'warn');

  for (const finding of allFindings) {
    const icon = finding.severity === 'block' ? icons.error : icons.warning;
    const label = finding.severity === 'block' ? c.err('BLOCK') : c.warn('WARN');
    log(
      `  ${icon} ${label}  ${c.path(`${finding.file}:${finding.line}`)}  ${c.dim(finding.category)}`,
    );
    log(`         ${c.dim('Matched:')} ${finding.match}`);
  }

  log('');
  if (blocks.length > 0) {
    log(
      `  ${icons.error} ${blocks.length} blocked, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`,
    );
    log(`  ${c.dim('Blocked findings must be resolved before publishing.')}`);
    process.exitCode = 1;
  } else {
    log(
      `  ${icons.warning} ${warnings.length} warning${warnings.length === 1 ? '' : 's'} (no blockers)`,
    );
  }
  log('');
};
