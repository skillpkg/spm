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

  it('shows summary with detected agents and no skills', async () => {
    mockExistsSync.mockImplementation((p: unknown) => {
      const pathStr = String(p);
      if (pathStr.includes('.claude/skills')) return true;
      return false;
    });

    mockReaddirSync.mockImplementation(() => []);

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'agents']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');

    expect(output).toContain('Claude Code');
    expect(output).toContain('0 skills linked');
    expect(output).toContain('no skills linked yet');
  });

  it('shows all five known agents', async () => {
    mockExistsSync.mockReturnValue(false);

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'agents']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');

    expect(output).toContain('Claude Code');
    expect(output).toContain('Cursor');
    expect(output).toContain('Codex');
    expect(output).toContain('Copilot');
    expect(output).toContain('Gemini CLI');
    expect(output).toContain('No agents detected');
  });

  it('JSON output includes name, detected, and skillCount fields', async () => {
    mockExistsSync.mockImplementation((p: unknown) => {
      const pathStr = String(p);
      if (pathStr.includes('.claude/skills')) return true;
      return false;
    });

    mockReaddirSync.mockImplementation(() => [
      { name: 'my-skill', isDirectory: () => true, isFile: () => false },
    ]);

    mockOutputMode = 'json';

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'agents']);

    expect(mockLogJson).toHaveBeenCalled();
    const jsonArg = mockLogJson.mock.calls[0][0] as Array<{
      name: string;
      detected: boolean;
      skillCount: number;
    }>;
    const claude = jsonArg.find((a) => a.name === 'Claude Code');
    expect(claude).toBeDefined();
    expect(claude!.detected).toBe(true);
    expect(claude!.skillCount).toBe(1);
  });
});

// ============================================
// LIST (additional edge cases)
// ============================================

describe('list command (edge cases)', () => {
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

  it('shows only global skills with --global flag', async () => {
    mockReadFileSync.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      // Project files should NOT be read with --global
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
    await program.parseAsync(['node', 'spm', 'list', '--global']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');

    expect(output).toContain('Global skills');
    expect(output).toContain('git-helpers');
    expect(output).not.toContain('Project skills');
  });

  it('shows JSON output with project and global arrays', async () => {
    mockOutputMode = 'json';

    mockReadFileSync.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('skills.json') && !p.includes('test-spm')) {
        return JSON.stringify({ skills: { 'data-viz': '^1.0.0' } });
      }
      if (p.endsWith('skills-lock.json') && !p.includes('test-spm')) {
        return JSON.stringify({
          skills: { 'data-viz': { version: '1.2.3', trust_tier: 'verified' } },
        });
      }
      if (p.includes('test-spm') && p.endsWith('skills.json')) {
        return JSON.stringify({ skills: {} });
      }
      if (p.includes('test-spm') && p.endsWith('skills-lock.json')) {
        return JSON.stringify({ skills: {} });
      }
      throw new Error(`ENOENT: ${p}`);
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'list']);

    expect(mockLogJson).toHaveBeenCalledTimes(1);
    const jsonArg = mockLogJson.mock.calls[0][0] as {
      project: Array<{ name: string }>;
      global: Array<{ name: string }>;
      total: number;
    };
    expect(jsonArg.project).toBeInstanceOf(Array);
    expect(jsonArg.global).toBeInstanceOf(Array);
    expect(jsonArg.total).toBe(1);
    expect(jsonArg.project[0].name).toBe('data-viz');
  });

  it('shows "No skills installed" when skills.json exists but is empty', async () => {
    mockReadFileSync.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('skills.json')) {
        return JSON.stringify({ skills: {} });
      }
      if (p.endsWith('skills-lock.json')) {
        return JSON.stringify({ skills: {} });
      }
      throw new Error(`ENOENT: ${p}`);
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'list']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('No skills installed');
  });

  it('shows single skill count without plural', async () => {
    mockReadFileSync.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('skills.json') && !p.includes('test-spm')) {
        return JSON.stringify({ skills: { 'one-skill': '^1.0.0' } });
      }
      if (p.endsWith('skills-lock.json') && !p.includes('test-spm')) {
        return JSON.stringify({
          skills: { 'one-skill': { version: '1.0.0', trust_tier: 'registered' } },
        });
      }
      if (p.includes('test-spm') && p.endsWith('skills.json')) {
        return JSON.stringify({ skills: {} });
      }
      if (p.includes('test-spm') && p.endsWith('skills-lock.json')) {
        return JSON.stringify({ skills: {} });
      }
      throw new Error(`ENOENT: ${p}`);
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'list']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('1 skill (');
    expect(output).not.toContain('1 skills');
  });
});

// ============================================
// INFO (additional edge cases)
// ============================================

describe('info command (edge cases)', () => {
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

  it('shows "No ratings" for skill with zero reviews', async () => {
    mockGetSkill.mockResolvedValue({
      name: 'new-skill',
      version: '0.1.0',
      description: 'A brand new skill',
      author: 'user1',
      trust_tier: 'registered',
      signed: false,
      scanned: false,
      verified: false,
      downloads: 5,
      downloads_week: 5,
      rating: 0,
      review_count: 0,
      platforms: ['*'],
      category: 'other',
      published_at: '2026-02-28T00:00:00Z',
      versions: [{ version: '0.1.0', created_at: '2026-02-28T00:00:00Z', latest: true }],
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'info', 'new-skill']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('new-skill@0.1.0');
    // No rating line should appear for 0 reviews
    expect(output).not.toContain('\u2605 0');
  });

  it('displays skill without repository field', async () => {
    mockGetSkill.mockResolvedValue({
      name: 'no-repo',
      version: '1.0.0',
      description: 'Skill without repo',
      author: 'author1',
      trust_tier: 'scanned',
      signed: false,
      scanned: true,
      verified: false,
      downloads: 100,
      downloads_week: 10,
      rating: 3.5,
      review_count: 5,
      platforms: ['claude-code'],
      category: 'productivity',
      published_at: '2026-01-15T00:00:00Z',
      versions: [{ version: '1.0.0', created_at: '2026-01-15T00:00:00Z', latest: true }],
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'info', 'no-repo']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('no-repo@1.0.0');
    expect(output).toContain('\u2605 3.5 (5 reviews)');
    expect(output).not.toContain('Repository:');
  });

  it('handles 404 without suggestion', async () => {
    mockGetSkill.mockRejectedValue({ status: 404 });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'info', 'unknown-skill']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('Skill not found: unknown-skill');
    expect(output).toContain('spm search');
    expect(output).not.toContain('Did you mean');
  });

  it('re-throws non-404 errors', async () => {
    mockGetSkill.mockRejectedValue({ status: 500, message: 'Internal error' });

    const program = await buildProgram();

    await expect(program.parseAsync(['node', 'spm', 'info', 'error-skill'])).rejects.toMatchObject({
      status: 500,
    });
  });

  it('displays signed-only badge (no signer name)', async () => {
    mockGetSkill.mockResolvedValue({
      name: 'signed-skill',
      version: '1.0.0',
      description: 'A signed skill without signer name',
      author: 'someone',
      trust_tier: 'scanned',
      signed: true,
      scanned: true,
      verified: false,
      downloads: 50,
      downloads_week: 5,
      rating: 0,
      review_count: 0,
      platforms: ['*'],
      category: 'other',
      published_at: '2026-02-01T00:00:00Z',
      versions: [{ version: '1.0.0', created_at: '2026-02-01T00:00:00Z', latest: true }],
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'info', 'signed-skill']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('Signed (Sigstore)');
    expect(output).not.toContain('Signed by');
  });
});

// ============================================
// SEARCH (additional edge cases)
// ============================================

describe('search command (edge cases)', () => {
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

  it('passes category and trust filters to API', async () => {
    mockSearchSkills.mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      per_page: 20,
    });

    const program = await buildProgram();
    await program.parseAsync([
      'node',
      'spm',
      'search',
      'test',
      '--category',
      'data-viz',
      '--trust',
      'verified',
    ]);

    expect(mockSearchSkills).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'test',
        category: 'data-viz',
        trust: 'verified',
      }),
    );
  });

  it('shows filter hint when no results with filters', async () => {
    mockSearchSkills.mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      per_page: 20,
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'search', 'test', '--category', 'data-viz']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('No skills found');
    expect(output).toContain('removing some filters');
  });

  it('shows "No ratings" for skill with zero reviews', async () => {
    mockSearchSkills.mockResolvedValue({
      results: [
        {
          name: 'brand-new',
          version: '0.1.0',
          description: 'New skill',
          author: 'newbie',
          trust_tier: 'registered',
          signed: false,
          downloads: 0,
          rating: 0,
          review_count: 0,
          platforms: ['*'],
          category: 'other',
          updated_at: '2026-03-01',
        },
      ],
      total: 1,
      page: 1,
      per_page: 20,
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'search', 'brand']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('No ratings');
  });

  it('shows footer with sort label and filter info', async () => {
    mockSearchSkills.mockResolvedValue({
      results: [
        {
          name: 'sorted-skill',
          version: '1.0.0',
          description: 'A skill for testing sort labels',
          author: 'tester',
          trust_tier: 'registered',
          signed: false,
          downloads: 100,
          rating: 4.0,
          review_count: 10,
          platforms: ['*'],
          category: 'testing',
          updated_at: '2026-02-01',
        },
      ],
      total: 1,
      page: 1,
      per_page: 20,
    });

    const program = await buildProgram();
    await program.parseAsync([
      'node',
      'spm',
      'search',
      'sorted',
      '--sort',
      'downloads',
      '--platform',
      'claude-code',
    ]);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('Sorted by downloads');
    expect(output).toContain('platform=claude-code');
  });

  it('shows platform-specific skills correctly', async () => {
    mockSearchSkills.mockResolvedValue({
      results: [
        {
          name: 'claude-only',
          version: '1.0.0',
          description: 'Only for Claude Code platform',
          author: 'dev',
          trust_tier: 'verified',
          signed: true,
          downloads: 500,
          rating: 4.5,
          review_count: 20,
          platforms: ['claude-code', 'cursor'],
          category: 'productivity',
          updated_at: '2026-02-15',
        },
      ],
      total: 1,
      page: 1,
      per_page: 20,
    });

    const program = await buildProgram();
    await program.parseAsync(['node', 'spm', 'search', 'claude']);

    const output = mockLog.mock.calls.map((call: unknown[]) => call[0]).join('\n');
    expect(output).toContain('claude-code, cursor');
  });
});
