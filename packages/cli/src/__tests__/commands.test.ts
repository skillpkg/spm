import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// -- Mock output utilities --
const mockLog = vi.fn();
const mockLogJson = vi.fn();
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
  getOutputMode: () => mockOutputMode,
  withSpinner: async <T>(_text: string, fn: () => Promise<T>): Promise<T> => fn(),
}));

// -- Mock API client --
const mockSearchSkills = vi.fn();
const mockGetSkill = vi.fn();
const mockGetVersion = vi.fn();

vi.mock('../lib/api-client.js', () => ({
  createApiClient: () => ({
    searchSkills: mockSearchSkills,
    getSkill: mockGetSkill,
    getVersion: mockGetVersion,
  }),
}));

// -- Mock config --
vi.mock('../lib/config.js', () => ({
  loadConfig: () => ({
    registry: 'https://registry.spm.dev/api/v1',
    token: null,
  }),
  getConfigDir: () => '/tmp/test-spm',
}));

// -- Mock node:fs for list/agents tests --
const mockReadFileSync = vi.fn();
const mockExistsSync = vi.fn();
const mockReaddirSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockWriteFileSync = vi.fn();

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
      existsSync: (...args: unknown[]) => mockExistsSync(...args),
      readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
      mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
      writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
    },
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  };
});

// ============================================
// SEARCH
// ============================================

describe('search command', () => {
  beforeEach(() => {
    mockOutputMode = 'default';
    vi.clearAllMocks();
  });

  const buildProgram = async () => {
    const { registerSearchCommand } = await import('../commands/search.js');
    const program = new Command();
    program.exitOverride();
    registerSearchCommand(program);
    return program;
  };

  it('formats search results with trust badges', async () => {
    mockSearchSkills.mockResolvedValue({
      results: [
        {
          name: 'data-viz',
          version: '1.2.3',
          description: 'Create charts and dashboards',
          author: 'almog',
          trust_tier: 'verified',
          signed: true,
          downloads: 12400,
          rating: 4.8,
          review_count: 142,
          platforms: ['*'],
          category: 'data-viz',
          updated_at: '2026-02-15',
        },
      ],
      total: 1,
      page: 1,
      per_page: 20,
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'search', 'data']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');

    expect(output).toContain('data-viz@1.2.3');
    expect(output).toContain('Create charts and dashboards');
    expect(output).toContain('by @almog');
    expect(output).toContain('\u2713\u2713 Verified');
    expect(output).toContain('\u2713 Signed');
    expect(output).toContain('1 result');
    expect(output).toContain('spm install <name>');
  });

  it('shows different trust badges per tier', async () => {
    mockSearchSkills.mockResolvedValue({
      results: [
        {
          name: 'skill-a',
          version: '1.0.0',
          description: 'A registered skill',
          author: 'user1',
          trust_tier: 'registered',
          signed: false,
          downloads: 10,
          rating: 0,
          review_count: 0,
          platforms: ['*'],
          category: 'other',
          updated_at: '2026-01-01',
        },
        {
          name: 'skill-b',
          version: '2.0.0',
          description: 'A scanned skill',
          author: 'user2',
          trust_tier: 'scanned',
          signed: false,
          downloads: 500,
          rating: 3.5,
          review_count: 10,
          platforms: ['claude-code'],
          category: 'other',
          updated_at: '2026-01-15',
        },
        {
          name: 'skill-c',
          version: '3.0.0',
          description: 'An official skill',
          author: 'anthropic',
          trust_tier: 'official',
          signed: true,
          downloads: 50000,
          rating: 4.9,
          review_count: 500,
          platforms: ['*'],
          category: 'other',
          updated_at: '2026-02-01',
        },
      ],
      total: 3,
      page: 1,
      per_page: 20,
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'search', 'skill']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');

    expect(output).toContain('\u25CB Registered');
    expect(output).toContain('\u2713 Scanned');
    expect(output).toContain('\u2713\u2713\u2713 Official');
    expect(output).toContain('3 results');
  });

  it('handles empty results gracefully', async () => {
    mockSearchSkills.mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      per_page: 20,
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'search', 'nonexistent']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');

    expect(output).toContain('No skills found');
    expect(output).toContain('nonexistent');
  });

  it('outputs JSON in --json mode', async () => {
    const data = {
      results: [
        {
          name: 'test-skill',
          version: '1.0.0',
          description: 'Test',
          author: 'me',
          trust_tier: 'registered',
          signed: false,
          downloads: 0,
          rating: 0,
          review_count: 0,
          platforms: ['*'],
          category: 'other',
          updated_at: '2026-01-01',
        },
      ],
      total: 1,
      page: 1,
      per_page: 20,
    };
    mockSearchSkills.mockResolvedValue(data);
    mockOutputMode = 'json';

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'search', 'test']);

    expect(mockLogJson).toHaveBeenCalledWith(data);
    expect(mockLog).not.toHaveBeenCalled();
  });
});

// ============================================
// INFO
// ============================================

describe('info command', () => {
  beforeEach(() => {
    mockOutputMode = 'default';
    vi.clearAllMocks();
  });

  const buildProgram = async () => {
    const { registerInfoCommand } = await import('../commands/info.js');
    const program = new Command();
    program.exitOverride();
    registerInfoCommand(program);
    return program;
  };

  it('formats skill detail correctly', async () => {
    mockGetSkill.mockResolvedValue({
      name: 'data-viz',
      version: '1.2.3',
      description: 'Create charts, dashboards, and data visualizations',
      author: 'almog',
      trust_tier: 'verified',
      signed: true,
      signer: 'almog@github',
      scanned: true,
      verified: true,
      license: 'MIT',
      downloads: 12400,
      downloads_week: 1200,
      rating: 4.8,
      review_count: 142,
      platforms: ['*'],
      category: 'data-viz',
      repository: 'https://github.com/almog/data-viz',
      published_at: '2026-02-15T00:00:00Z',
      versions: [
        { version: '1.2.3', created_at: '2026-02-15T00:00:00Z', latest: true },
        { version: '1.2.2', created_at: '2026-01-28T00:00:00Z', latest: false },
        { version: '1.0.0', created_at: '2025-11-01T00:00:00Z', latest: false },
      ],
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'info', 'data-viz']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');

    expect(output).toContain('data-viz@1.2.3');
    expect(output).toContain('Create charts, dashboards, and data visualizations');
    expect(output).toContain('@almog');
    expect(output).toContain('\u2713\u2713 Verified');
    expect(output).toContain('MIT');
    expect(output).toContain('12,400');
    expect(output).toContain('1,200');
    expect(output).toContain('\u2605 4.8 (142 reviews)');
    expect(output).toContain('https://github.com/almog/data-viz');
    expect(output).toContain('Signed by almog@github');
    expect(output).toContain('Scanned');
    expect(output).toContain('Verified author');
    expect(output).toContain('1.2.3');
    expect(output).toContain('(latest)');
    expect(output).toContain('1.2.2');
    expect(output).toContain('spm install data-viz');
  });

  it('handles 404 with helpful message', async () => {
    mockGetSkill.mockRejectedValue({ status: 404, suggestion: 'data-viz' });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'info', 'dat-viz']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');

    expect(output).toContain('Skill not found: dat-viz');
    expect(output).toContain('Did you mean: data-viz');
  });

  it('outputs JSON in --json mode', async () => {
    const data = {
      name: 'test',
      version: '1.0.0',
      description: 'Test skill',
      author: 'me',
      trust_tier: 'registered',
      signed: false,
      scanned: false,
      verified: false,
      downloads: 0,
      downloads_week: 0,
      rating: 0,
      review_count: 0,
      platforms: ['*'],
      category: 'other',
      published_at: '2026-01-01T00:00:00Z',
      versions: [],
    };
    mockGetSkill.mockResolvedValue(data);
    mockOutputMode = 'json';

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'info', 'test']);

    expect(mockLogJson).toHaveBeenCalledWith(data);
  });
});

// ============================================
// LIST
// ============================================

describe('list command', () => {
  beforeEach(() => {
    mockOutputMode = 'default';
    vi.clearAllMocks();
  });

  const buildProgram = async () => {
    const { registerListCommand } = await import('../commands/list.js');
    const program = new Command();
    program.exitOverride();
    registerListCommand(program);
    return program;
  };

  it('shows project and global skills', async () => {
    mockReadFileSync.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('skills.json') && !p.includes('.spm') && !p.includes('test-spm')) {
        return JSON.stringify({
          skills: { 'data-viz': '^1.2.0', pdf: '^2.0.0' },
        });
      }
      if (p.endsWith('skills-lock.json') && !p.includes('.spm') && !p.includes('test-spm')) {
        return JSON.stringify({
          skills: {
            'data-viz': { version: '1.2.3', trust_tier: 'verified', signer: 'almog@github' },
            pdf: { version: '2.0.3', trust_tier: 'verified', signer: 'anthropic@github' },
          },
        });
      }
      // Global
      if (p.includes('test-spm') && p.endsWith('skills.json')) {
        return JSON.stringify({
          skills: { 'git-helpers': '^2.0.0' },
        });
      }
      if (p.includes('test-spm') && p.endsWith('skills-lock.json')) {
        return JSON.stringify({
          skills: {
            'git-helpers': { version: '2.1.0', trust_tier: 'scanned' },
          },
        });
      }
      throw new Error(`ENOENT: ${p}`);
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'list']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');

    expect(output).toContain('Project skills');
    expect(output).toContain('data-viz');
    expect(output).toContain('1.2.3');
    expect(output).toContain('pdf');
    expect(output).toContain('2.0.3');
    expect(output).toContain('\u2713\u2713  Verified');
    expect(output).toContain('Global skills');
    expect(output).toContain('git-helpers');
    expect(output).toContain('2.1.0');
    expect(output).toContain('\u2713  Scanned');
    expect(output).toContain('3 skills (2 project, 1 global)');
  });

  it('shows helpful message when no skills.json exists', async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'list']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');

    expect(output).toContain('No skills.json');
    expect(output).toContain('spm init');
  });
});

// ============================================
// AGENTS
// ============================================

describe('agents command', () => {
  beforeEach(() => {
    mockOutputMode = 'default';
    vi.clearAllMocks();
  });

  const buildProgram = async () => {
    const { registerAgentsCommand } = await import('../commands/agents.js');
    const program = new Command();
    program.exitOverride();
    registerAgentsCommand(program);
    return program;
  };

  it('detects agent directories', async () => {
    mockExistsSync.mockImplementation((p: unknown) => {
      const pathStr = String(p);
      if (pathStr.includes('.claude/skills')) return true;
      if (pathStr.includes('.cursor/skills')) return true;
      return false;
    });

    mockReaddirSync.mockImplementation((p: unknown) => {
      const pathStr = String(p);
      if (pathStr.includes('.claude/skills')) {
        return [
          { name: 'data-viz', isDirectory: () => true, isFile: () => false },
          { name: 'pdf', isDirectory: () => true, isFile: () => false },
          { name: 'git-helpers', isDirectory: () => true, isFile: () => false },
        ];
      }
      if (pathStr.includes('.cursor/skills')) {
        return [{ name: 'data-viz', isDirectory: () => true, isFile: () => false }];
      }
      return [];
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'agents']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');

    expect(output).toContain('Claude Code');
    expect(output).toContain('3 skills linked');
    expect(output).toContain('Cursor');
    expect(output).toContain('1 skill linked');
    expect(output).toContain('Codex');
    expect(output).toContain('not detected');
    expect(output).toContain('Copilot');
    expect(output).toContain('not detected');
  });

  it('outputs JSON in --json mode', async () => {
    mockExistsSync.mockReturnValue(false);
    mockOutputMode = 'json';

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'agents']);

    expect(mockLogJson).toHaveBeenCalled();
    const jsonArg = mockLogJson.mock.calls[0][0] as Array<{ detected: boolean }>;
    expect(jsonArg).toBeInstanceOf(Array);
    expect(jsonArg.every((a: { detected: boolean }) => a.detected === false)).toBe(true);
  });
});
