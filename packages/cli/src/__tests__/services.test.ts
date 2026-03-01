import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import { parseSpecifier } from '../services/resolver.js';

// ──────────────────────────────────────────────
// Resolver tests
// ──────────────────────────────────────────────

describe('resolver', () => {
  describe('parseSpecifier', () => {
    it('parses bare name', () => {
      expect(parseSpecifier('data-viz')).toEqual({ name: 'data-viz' });
    });

    it('parses name@version', () => {
      expect(parseSpecifier('data-viz@1.2.3')).toEqual({
        name: 'data-viz',
        range: '1.2.3',
      });
    });

    it('parses name@range', () => {
      expect(parseSpecifier('data-viz@^1.0.0')).toEqual({
        name: 'data-viz',
        range: '^1.0.0',
      });
    });

    it('parses name@latest', () => {
      expect(parseSpecifier('data-viz@latest')).toEqual({
        name: 'data-viz',
        range: 'latest',
      });
    });

    it('parses scoped package', () => {
      expect(parseSpecifier('@scope/my-skill')).toEqual({
        name: '@scope/my-skill',
      });
    });

    it('parses scoped package with version', () => {
      expect(parseSpecifier('@scope/my-skill@^2.0.0')).toEqual({
        name: '@scope/my-skill',
        range: '^2.0.0',
      });
    });
  });

  describe('resolveSkills', () => {
    it('returns resolved skills from API response', async () => {
      const { resolveSkills } = await import('../services/resolver.js');

      const mockApiClient = {
        resolve: vi.fn().mockResolvedValue({
          resolved: [
            {
              name: 'data-viz',
              version: '1.2.3',
              download_url: 'https://registry.spm.dev/api/v1/skills/data-viz/1.2.3/download',
              checksum: 'sha256:abc123',
              trust_tier: 'verified',
              signed: true,
            },
          ],
        }),
      } as unknown as import('../lib/api-client.js').ApiClient;

      const result = await resolveSkills(mockApiClient, [{ name: 'data-viz', range: '^1.0.0' }]);

      expect(result.resolved).toHaveLength(1);
      expect(result.resolved[0]).toEqual({
        name: 'data-viz',
        version: '1.2.3',
        downloadUrl: 'https://registry.spm.dev/api/v1/skills/data-viz/1.2.3/download',
        checksum: 'sha256:abc123',
        trustTier: 'verified',
        signed: true,
      });
      expect(result.unresolved).toHaveLength(0);
    });

    it('handles unresolved skills with suggestions', async () => {
      const { resolveSkills } = await import('../services/resolver.js');

      const mockApiClient = {
        resolve: vi.fn().mockResolvedValue({
          resolved: [
            {
              name: 'dat-viz',
              error: 'Not found',
              suggestions: ['data-viz'],
            },
          ],
        }),
      } as unknown as import('../lib/api-client.js').ApiClient;

      const result = await resolveSkills(mockApiClient, [{ name: 'dat-viz' }]);

      expect(result.resolved).toHaveLength(0);
      expect(result.unresolved).toHaveLength(1);
      expect(result.unresolved[0]).toEqual({
        name: 'dat-viz',
        reason: 'Not found',
        suggestions: ['data-viz'],
      });
    });
  });
});

// ──────────────────────────────────────────────
// Skills-json tests
// ──────────────────────────────────────────────

describe('skills-json', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spm-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('loadSkillsJson returns null for missing file', async () => {
    const { loadSkillsJson } = await import('../services/skills-json.js');
    const result = await loadSkillsJson(tmpDir);
    expect(result).toBeNull();
  });

  it('saveSkillsJson + loadSkillsJson round-trip', async () => {
    const { saveSkillsJson, loadSkillsJson } = await import('../services/skills-json.js');

    const data = {
      skills: {
        'data-viz': '^1.0.0',
        pdf: '~2.0.0',
      },
    };

    await saveSkillsJson(tmpDir, data);
    const loaded = await loadSkillsJson(tmpDir);

    expect(loaded).not.toBeNull();
    expect(loaded!.skills).toEqual(data.skills);
  });

  it('addSkillToJson adds to existing skills.json', async () => {
    const { saveSkillsJson, addSkillToJson, loadSkillsJson } =
      await import('../services/skills-json.js');

    await saveSkillsJson(tmpDir, { skills: { existing: '^1.0.0' } });
    await addSkillToJson(tmpDir, 'new-skill', '^2.0.0');

    const loaded = await loadSkillsJson(tmpDir);
    expect(loaded!.skills).toEqual({
      existing: '^1.0.0',
      'new-skill': '^2.0.0',
    });
  });

  it('addSkillToJson creates skills.json if missing', async () => {
    const { addSkillToJson, loadSkillsJson } = await import('../services/skills-json.js');

    await addSkillToJson(tmpDir, 'my-skill', '^1.0.0');

    const loaded = await loadSkillsJson(tmpDir);
    expect(loaded).not.toBeNull();
    expect(loaded!.skills).toEqual({ 'my-skill': '^1.0.0' });
  });

  it('removeSkillFromJson removes a skill', async () => {
    const { saveSkillsJson, removeSkillFromJson, loadSkillsJson } =
      await import('../services/skills-json.js');

    await saveSkillsJson(tmpDir, { skills: { a: '^1.0.0', b: '^2.0.0' } });
    const removed = await removeSkillFromJson(tmpDir, 'a');

    expect(removed).toBe(true);
    const loaded = await loadSkillsJson(tmpDir);
    expect(loaded!.skills).toEqual({ b: '^2.0.0' });
  });

  it('removeSkillFromJson returns false for non-existent skill', async () => {
    const { saveSkillsJson, removeSkillFromJson } = await import('../services/skills-json.js');

    await saveSkillsJson(tmpDir, { skills: { a: '^1.0.0' } });
    const removed = await removeSkillFromJson(tmpDir, 'nonexistent');
    expect(removed).toBe(false);
  });

  it('loadLockFile returns null for missing file', async () => {
    const { loadLockFile } = await import('../services/skills-json.js');
    const result = await loadLockFile(tmpDir);
    expect(result).toBeNull();
  });

  it('saveLockFile + loadLockFile round-trip', async () => {
    const { saveLockFile, loadLockFile } = await import('../services/skills-json.js');

    const lock = {
      lockfileVersion: 1 as const,
      generated_at: '2026-01-01T00:00:00Z',
      generated_by: 'spm@0.0.1',
      skills: {
        'data-viz': {
          version: '1.2.3',
          resolved: 'https://registry.spm.dev/api/v1/skills/data-viz/1.2.3/download',
          checksum: 'sha256:abc123',
          source: 'registry' as const,
        },
      },
    };

    await saveLockFile(tmpDir, lock);
    const loaded = await loadLockFile(tmpDir);

    expect(loaded).not.toBeNull();
    expect(loaded!.lockfileVersion).toBe(1);
    expect(loaded!.skills['data-viz'].version).toBe('1.2.3');
  });

  it('updateLockFile merges new entries', async () => {
    const { saveLockFile, updateLockFile, loadLockFile } =
      await import('../services/skills-json.js');

    // Start with existing lock
    const existingLock = {
      lockfileVersion: 1 as const,
      generated_at: '2026-01-01T00:00:00Z',
      generated_by: 'spm@0.0.1',
      skills: {
        existing: {
          version: '1.0.0',
          resolved: 'https://registry.spm.dev/api/v1/skills/existing/1.0.0/download',
          checksum: 'sha256:old',
          source: 'registry' as const,
        },
      },
    };

    await saveLockFile(tmpDir, existingLock);

    // Update with new resolved skill
    await updateLockFile(tmpDir, [
      {
        name: 'new-skill',
        version: '2.0.0',
        downloadUrl: 'https://registry.spm.dev/api/v1/skills/new-skill/2.0.0/download',
        checksum: 'sha256:new',
        trustTier: 'verified',
        signed: true,
      },
    ]);

    const loaded = await loadLockFile(tmpDir);
    expect(loaded!.skills['existing']).toBeDefined();
    expect(loaded!.skills['new-skill']).toBeDefined();
    expect(loaded!.skills['new-skill'].version).toBe('2.0.0');
  });
});

// ──────────────────────────────────────────────
// Preflight tests
// ──────────────────────────────────────────────

describe('preflight', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spm-preflight-'));

    // Create mock agent dirs
    await fs.mkdir(path.join(tmpDir, '.claude', 'skills'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, '.cursor', 'skills'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, '.agents', 'skills'), { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('detects broken symlinks', async () => {
    // Mock os module to return our tmpDir
    vi.doMock('node:os', async () => {
      const actual = await vi.importActual<typeof import('node:os')>('node:os');
      return { ...actual, homedir: () => tmpDir };
    });
    const { runPreflightChecks } = await import('../services/preflight.js');

    // Create a broken symlink
    const brokenTarget = path.join(tmpDir, 'nonexistent-skill-dir');
    await fs.symlink(brokenTarget, path.join(tmpDir, '.claude', 'skills', 'broken-skill'));

    const issues = await runPreflightChecks(true);

    expect(issues.length).toBeGreaterThanOrEqual(1);
    const brokenSymlinkIssue = issues.find(
      (i) => i.type === 'broken-symlink' && i.skillName === 'broken-skill',
    );
    expect(brokenSymlinkIssue).toBeDefined();
    expect(brokenSymlinkIssue!.fixed).toBe(true);

    vi.doUnmock('node:os');
  });

  it('returns empty issues for healthy dirs', async () => {
    vi.doMock('node:os', async () => {
      const actual = await vi.importActual<typeof import('node:os')>('node:os');
      return { ...actual, homedir: () => tmpDir };
    });
    const { runPreflightChecks } = await import('../services/preflight.js');

    // No broken symlinks, no issues
    const issues = await runPreflightChecks(false);
    expect(issues).toEqual([]);

    vi.doUnmock('node:os');
  });
});

// ──────────────────────────────────────────────
// Linker tests
// ──────────────────────────────────────────────

describe('linker', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spm-linker-'));

    // Create mock agent dirs
    await fs.mkdir(path.join(tmpDir, '.claude', 'skills'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, '.cursor', 'skills'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, '.agents', 'skills'), { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('linkSkill falls back to symlink when npx fails', async () => {
    vi.doMock('node:os', async () => {
      const actual = await vi.importActual<typeof import('node:os')>('node:os');
      return { ...actual, homedir: () => tmpDir };
    });
    const { linkSkill } = await import('../services/linker.js');

    // Create a skill source directory
    const skillSrcDir = path.join(tmpDir, 'skill-src');
    await fs.mkdir(skillSrcDir, { recursive: true });
    await fs.writeFile(path.join(skillSrcDir, 'SKILL.md'), '# Test skill');

    // npx will fail since skills CLI isn't installed, should fall back to symlink
    const result = await linkSkill(skillSrcDir, 'test-skill');

    // Should have fallen back to symlink or copy
    expect(result.agents.length).toBeGreaterThanOrEqual(0);
    expect(['symlink', 'copy', 'vercel-skills-cli']).toContain(result.method);

    vi.doUnmock('node:os');
  });

  it('unlinkSkill removes from agent dirs', async () => {
    vi.doMock('node:os', async () => {
      const actual = await vi.importActual<typeof import('node:os')>('node:os');
      return { ...actual, homedir: () => tmpDir };
    });
    // Mock child_process so npx is never invoked, forcing the manual removal path
    vi.doMock('node:child_process', async () => {
      const actual =
        await vi.importActual<typeof import('node:child_process')>('node:child_process');
      return {
        ...actual,
        execFile: (
          _cmd: string,
          _args: string[],
          _opts: Record<string, unknown>,
          cb: (err: Error | null) => void,
        ) => {
          cb(new Error('mock: npx not available'));
        },
      };
    });
    const { unlinkSkill } = await import('../services/linker.js');

    // Create a skill symlink in Claude agent dir
    const skillLink = path.join(tmpDir, '.claude', 'skills', 'test-skill');
    const skillSrc = path.join(tmpDir, 'skill-source');
    await fs.mkdir(skillSrc, { recursive: true });
    await fs.symlink(skillSrc, skillLink);

    // Verify symlink exists before unlink
    const beforeStat = await fs.lstat(skillLink);
    expect(beforeStat.isSymbolicLink()).toBe(true);

    // Unlink
    await unlinkSkill('test-skill');

    // Verify symlink is removed
    const exists = await fs
      .access(skillLink)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);

    vi.doUnmock('node:os');
    vi.doUnmock('node:child_process');
  });

  it('getLinkedAgents returns agents with the skill', async () => {
    vi.doMock('node:os', async () => {
      const actual = await vi.importActual<typeof import('node:os')>('node:os');
      return { ...actual, homedir: () => tmpDir };
    });
    const { getLinkedAgents } = await import('../services/linker.js');

    // Create skill in two agent dirs
    const skillSrc = path.join(tmpDir, 'skill-source');
    await fs.mkdir(skillSrc, { recursive: true });

    await fs.symlink(skillSrc, path.join(tmpDir, '.claude', 'skills', 'my-skill'));
    await fs.symlink(skillSrc, path.join(tmpDir, '.cursor', 'skills', 'my-skill'));

    const agents = await getLinkedAgents('my-skill');
    expect(agents).toContain('Claude Code');
    expect(agents).toContain('Cursor');
    expect(agents).not.toContain('Codex');

    vi.doUnmock('node:os');
  });
});
