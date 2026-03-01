import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// -- Mock output utilities --
const mockLog = vi.fn();
const mockLogJson = vi.fn();
const mockLogError = vi.fn();
const mockLogVerbose = vi.fn();
let mockOutputMode = 'default';

vi.mock('../lib/output.js', () => ({
  icons: {
    success: '[ok]',
    error: '[err]',
    warning: '[warn]',
    info: '[info]',
    pending: '[pending]',
    arrow: '->',
    bullet: '*',
    shield: '[shield]',
    package: '[pkg]',
    link: '[link]',
    lock: '[lock]',
  },
  c: {
    name: (s: string) => s,
    version: (s: string) => s,
    cmd: (s: string) => s,
    path: (s: string) => s,
    url: (s: string) => s,
    trust: (s: string) => s,
    dim: (s: string) => s,
    bold: (s: string) => s,
    err: (s: string) => s,
    warn: (s: string) => s,
    hint: (s: string) => s,
  },
  log: (...args: unknown[]) => mockLog(...args),
  logJson: (...args: unknown[]) => mockLogJson(...args),
  logVerbose: (...args: unknown[]) => mockLogVerbose(...args),
  logError: (...args: unknown[]) => mockLogError(...args),
  getOutputMode: () => mockOutputMode,
  getCurrentMode: () => mockOutputMode,
  setOutputMode: (m: string) => {
    mockOutputMode = m;
  },
  withSpinner: async <T>(_text: string, fn: () => Promise<T>): Promise<T> => fn(),
}));

// -- Mock API client --
const mockPublishSkill = vi.fn();
const mockYankVersion = vi.fn();
const mockUpdateSkill = vi.fn();
const mockClassifySkill = vi.fn();
const mockReportSkill = vi.fn();

vi.mock('../lib/api-client.js', () => ({
  createApiClient: () => ({
    publishSkill: mockPublishSkill,
    yankVersion: mockYankVersion,
    updateSkill: mockUpdateSkill,
    classifySkill: mockClassifySkill,
    reportSkill: mockReportSkill,
  }),
  ApiClientError: class ApiClientError extends Error {
    public readonly status: number;
    public readonly apiError: { error: string; message: string; suggestion?: string };

    constructor(status: number, apiError: { error: string; message: string; suggestion?: string }) {
      super(apiError.message);
      this.name = 'ApiClientError';
      this.status = status;
      this.apiError = apiError;
    }
  },
}));

// -- Mock config --
let mockToken: string | null = 'test-token-123';

vi.mock('../lib/config.js', () => ({
  loadConfig: () => ({
    registry: 'https://registry.spm.dev/api/v1',
    token: mockToken,
  }),
}));

// -- Mock node:fs/promises --
const mockReadFile = vi.fn();
vi.mock('node:fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

// -- Mock node:fs --
vi.mock('node:fs', () => ({
  default: {
    promises: {
      mkdtemp: vi.fn().mockResolvedValue('/tmp/spm-publish-test'),
      stat: vi.fn().mockResolvedValue({ size: 12288 }),
    },
  },
  promises: {
    mkdtemp: vi.fn().mockResolvedValue('/tmp/spm-publish-test'),
    stat: vi.fn().mockResolvedValue({ size: 12288 }),
  },
}));

// -- Mock node:child_process --
vi.mock('node:child_process', () => ({
  execFile: vi.fn(
    (
      _cmd: string,
      _args: string[],
      _opts: unknown,
      cb?: (err: Error | null, result: { stdout: string; stderr: string }) => void,
    ) => {
      if (typeof _opts === 'function') {
        // No options, _opts is actually cb
        (_opts as (err: Error | null, result: { stdout: string; stderr: string }) => void)(null, {
          stdout: 'file1\nfile2\nfile3\n',
          stderr: '',
        });
      } else if (cb) {
        cb(null, { stdout: 'file1\nfile2\nfile3\n', stderr: '' });
      }
    },
  ),
}));

// -- Mock node:readline/promises --
const mockQuestion = vi.fn();
vi.mock('node:readline/promises', () => ({
  createInterface: () => ({
    question: mockQuestion,
    close: vi.fn(),
  }),
}));

// ============================================
// PUBLISH
// ============================================

describe('publish command', () => {
  beforeEach(() => {
    mockOutputMode = 'default';
    mockToken = 'test-token-123';
    vi.clearAllMocks();
  });

  const buildProgram = async () => {
    const { registerPublishCommand } = await import('../commands/publish.js');
    const program = new Command();
    program.exitOverride();
    registerPublishCommand(program);
    return program;
  };

  const validManifest = JSON.stringify({
    name: 'my-skill',
    version: '1.0.0',
    description: 'A test skill for unit testing purposes here',
    category: 'data-viz',
  });

  it('requires authentication', async () => {
    mockToken = null;

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'publish']);

    expect(mockLogError).toHaveBeenCalledWith(
      'Not authenticated',
      expect.any(String),
      expect.stringContaining('spm login'),
    );
  });

  it('fails when no manifest.json exists', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'publish']);

    expect(mockLogError).toHaveBeenCalledWith(
      'No manifest.json found',
      expect.any(String),
      expect.stringContaining('spm init'),
    );
  });

  it('fails on invalid manifest.json', async () => {
    mockReadFile.mockResolvedValue('{ invalid json }');

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'publish']);

    expect(mockLogError).toHaveBeenCalledWith(
      'Invalid manifest.json',
      expect.any(String),
      expect.any(String),
    );
  });

  it('calls classifySkill and publishSkill on success', async () => {
    mockReadFile.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('manifest.json')) {
        return Promise.resolve(validManifest);
      }
      // Return buffer for .skl file read
      return Promise.resolve(Buffer.from('fake-skl-content'));
    });

    mockClassifySkill.mockResolvedValue({
      detected_category: 'data-viz',
      confidence: 0.95,
    });

    mockPublishSkill.mockResolvedValue({
      name: 'my-skill',
      version: '1.0.0',
      url: 'https://spm.dev/skills/my-skill',
      trust_tier: 'registered',
      signed: false,
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'publish']);

    expect(mockClassifySkill).toHaveBeenCalled();
    expect(mockPublishSkill).toHaveBeenCalled();

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('Published my-skill@1.0.0');
    expect(output).toContain('https://spm.dev/skills/my-skill');
  });

  it('handles 409 version conflict', async () => {
    mockReadFile.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('manifest.json')) {
        return Promise.resolve(validManifest);
      }
      return Promise.resolve(Buffer.from('fake-skl-content'));
    });

    mockClassifySkill.mockResolvedValue({
      detected_category: 'data-viz',
      confidence: 0.95,
    });

    const { ApiClientError } = await import('../lib/api-client.js');
    mockPublishSkill.mockRejectedValue(
      new ApiClientError(409, { error: 'version_exists', message: 'Version already published' }),
    );

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'publish']);

    expect(mockLogError).toHaveBeenCalledWith(
      expect.stringContaining('already exists'),
      expect.any(String),
      expect.any(String),
    );
  });

  it('handles 401 auth error during publish', async () => {
    mockReadFile.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('manifest.json')) {
        return Promise.resolve(validManifest);
      }
      return Promise.resolve(Buffer.from('fake-skl-content'));
    });

    mockClassifySkill.mockResolvedValue({
      detected_category: 'data-viz',
      confidence: 0.95,
    });

    const { ApiClientError } = await import('../lib/api-client.js');
    mockPublishSkill.mockRejectedValue(
      new ApiClientError(401, { error: 'unauthorized', message: 'Invalid token' }),
    );

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'publish']);

    expect(mockLogError).toHaveBeenCalledWith(
      'Authentication failed',
      expect.any(String),
      expect.stringContaining('spm login'),
    );
  });
});

// ============================================
// YANK
// ============================================

describe('yank command', () => {
  beforeEach(() => {
    mockOutputMode = 'default';
    mockToken = 'test-token-123';
    vi.clearAllMocks();
  });

  const buildProgram = async () => {
    const { registerYankCommand } = await import('../commands/yank.js');
    const program = new Command();
    program.exitOverride();
    registerYankCommand(program);
    return program;
  };

  it('parses name@version and calls API with --force', async () => {
    mockYankVersion.mockResolvedValue({ ok: true, name: 'my-skill', version: '1.2.3' });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'yank', 'my-skill@1.2.3', '--force']);

    expect(mockYankVersion).toHaveBeenCalledWith('my-skill', '1.2.3', undefined);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('Yanked my-skill@1.2.3');
  });

  it('rejects invalid specifier format', async () => {
    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'yank', 'invalid-specifier', '--force']);

    expect(mockLogError).toHaveBeenCalledWith(
      'Invalid specifier',
      expect.stringContaining('name@version'),
      expect.any(String),
    );
    expect(mockYankVersion).not.toHaveBeenCalled();
  });

  it('passes reason to API', async () => {
    mockYankVersion.mockResolvedValue({ ok: true, name: 'my-skill', version: '1.0.0' });

    const program = await buildProgram();
    await program.parseAsync([
      'node',
      'spm',
      'yank',
      'my-skill@1.0.0',
      '--force',
      '--reason',
      'Security issue',
    ]);

    expect(mockYankVersion).toHaveBeenCalledWith('my-skill', '1.0.0', 'Security issue');
  });

  it('requires authentication', async () => {
    mockToken = null;

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'yank', 'my-skill@1.0.0', '--force']);

    expect(mockLogError).toHaveBeenCalledWith(
      'Not authenticated',
      expect.any(String),
      expect.stringContaining('spm login'),
    );
  });

  it('prompts for confirmation without --force', async () => {
    mockQuestion.mockResolvedValue('n');

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'yank', 'my-skill@1.0.0']);

    expect(mockQuestion).toHaveBeenCalled();
    expect(mockYankVersion).not.toHaveBeenCalled();

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('Cancelled');
  });
});

// ============================================
// DEPRECATE
// ============================================

describe('deprecate command', () => {
  beforeEach(() => {
    mockOutputMode = 'default';
    mockToken = 'test-token-123';
    vi.clearAllMocks();
  });

  const buildProgram = async () => {
    const { registerDeprecateCommand } = await import('../commands/deprecate.js');
    const program = new Command();
    program.exitOverride();
    registerDeprecateCommand(program);
    return program;
  };

  it('deprecates a skill with message', async () => {
    mockUpdateSkill.mockResolvedValue({ ok: true, name: 'my-skill' });

    const program = await buildProgram();
    await program.parseAsync([
      'node',
      'spm',
      'deprecate',
      'my-skill',
      '--message',
      'Use new-skill instead',
    ]);

    expect(mockUpdateSkill).toHaveBeenCalledWith('my-skill', {
      deprecated: true,
      deprecated_msg: 'Use new-skill instead',
    });

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('Deprecated my-skill');
    expect(output).toContain('Use new-skill instead');
  });

  it('deprecates with default message when no --message', async () => {
    mockUpdateSkill.mockResolvedValue({ ok: true, name: 'my-skill' });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'deprecate', 'my-skill']);

    expect(mockUpdateSkill).toHaveBeenCalledWith('my-skill', {
      deprecated: true,
      deprecated_msg: 'This skill has been deprecated.',
    });
  });

  it('un-deprecates with --undo', async () => {
    mockUpdateSkill.mockResolvedValue({ ok: true, name: 'my-skill' });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'deprecate', 'my-skill', '--undo']);

    expect(mockUpdateSkill).toHaveBeenCalledWith('my-skill', { deprecated: false });

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('Un-deprecated my-skill');
  });

  it('requires authentication', async () => {
    mockToken = null;

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'deprecate', 'my-skill']);

    expect(mockLogError).toHaveBeenCalledWith(
      'Not authenticated',
      expect.any(String),
      expect.stringContaining('spm login'),
    );
  });

  it('handles 404 error', async () => {
    const { ApiClientError } = await import('../lib/api-client.js');
    mockUpdateSkill.mockRejectedValue(
      new ApiClientError(404, { error: 'skill_not_found', message: 'Skill not found' }),
    );

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'deprecate', 'nonexistent']);

    expect(mockLogError).toHaveBeenCalledWith(
      'Skill not found',
      expect.stringContaining('nonexistent'),
      expect.any(String),
    );
  });
});

// ============================================
// REPORT
// ============================================

describe('report command', () => {
  beforeEach(() => {
    mockOutputMode = 'default';
    mockToken = 'test-token-123';
    vi.clearAllMocks();
  });

  const buildProgram = async () => {
    const { registerReportCommand } = await import('../commands/report.js');
    const program = new Command();
    program.exitOverride();
    registerReportCommand(program);
    return program;
  };

  it('submits a report with --reason flag', async () => {
    mockReportSkill.mockResolvedValue({ ok: true, report_id: 'r-123' });

    const program = await buildProgram();
    await program.parseAsync([
      'node',
      'spm',
      'report',
      'bad-skill',
      '--reason',
      'Contains malicious code',
    ]);

    expect(mockReportSkill).toHaveBeenCalledWith('bad-skill', {
      reason: 'Contains malicious code',
      detail: undefined,
    });

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('Report submitted for bad-skill');
  });

  it('submits with reason and detail', async () => {
    mockReportSkill.mockResolvedValue({ ok: true, report_id: 'r-456' });

    const program = await buildProgram();
    await program.parseAsync([
      'node',
      'spm',
      'report',
      'bad-skill',
      '--reason',
      'Prompt injection',
      '--detail',
      'Found in SKILL.md line 47',
    ]);

    expect(mockReportSkill).toHaveBeenCalledWith('bad-skill', {
      reason: 'Prompt injection',
      detail: 'Found in SKILL.md line 47',
    });
  });

  it('prompts for reason when not provided via flag', async () => {
    mockQuestion.mockResolvedValue('Suspicious behavior');
    mockReportSkill.mockResolvedValue({ ok: true, report_id: 'r-789' });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'report', 'bad-skill']);

    expect(mockQuestion).toHaveBeenCalled();
    expect(mockReportSkill).toHaveBeenCalledWith('bad-skill', {
      reason: 'Suspicious behavior',
      detail: undefined,
    });
  });

  it('cancels when user provides empty reason', async () => {
    mockQuestion.mockResolvedValue('');

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'report', 'bad-skill']);

    expect(mockReportSkill).not.toHaveBeenCalled();
    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('cancelled');
  });

  it('requires authentication', async () => {
    mockToken = null;

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'report', 'bad-skill', '--reason', 'test']);

    expect(mockLogError).toHaveBeenCalledWith(
      'Not authenticated',
      expect.any(String),
      expect.stringContaining('spm login'),
    );
  });

  it('handles 404 error', async () => {
    const { ApiClientError } = await import('../lib/api-client.js');
    mockReportSkill.mockRejectedValue(
      new ApiClientError(404, { error: 'skill_not_found', message: 'Skill not found' }),
    );

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'report', 'nonexistent', '--reason', 'Test reason']);

    expect(mockLogError).toHaveBeenCalledWith(
      'Skill not found',
      expect.stringContaining('nonexistent'),
    );
  });
});
