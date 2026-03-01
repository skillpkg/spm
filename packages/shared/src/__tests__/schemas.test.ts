import { describe, it, expect } from 'vitest';
import {
  SkillNameSchema,
  SemverSchema,
  ManifestSchema,
  SearchParamsSchema,
  ReviewRequestSchema,
  SkillsJsonSchema,
  PersonSchema,
} from '../schemas.js';

// ── SkillNameSchema ──────────────────────────────────────────────

describe('SkillNameSchema', () => {
  it('accepts valid kebab-case names', () => {
    expect(SkillNameSchema.parse('my-skill')).toBe('my-skill');
    expect(SkillNameSchema.parse('ab')).toBe('ab');
    expect(SkillNameSchema.parse('code-review')).toBe('code-review');
    expect(SkillNameSchema.parse('data-viz')).toBe('data-viz');
    expect(SkillNameSchema.parse('x1')).toBe('x1');
  });

  it('accepts scoped names', () => {
    expect(SkillNameSchema.parse('@acme/my-skill')).toBe('@acme/my-skill');
    expect(SkillNameSchema.parse('@org/tool')).toBe('@org/tool');
    expect(SkillNameSchema.parse('@my-team/code-review')).toBe('@my-team/code-review');
  });

  it('rejects names that start with a number', () => {
    expect(() => SkillNameSchema.parse('1skill')).toThrow();
  });

  it('rejects names with uppercase letters', () => {
    expect(() => SkillNameSchema.parse('MySkill')).toThrow();
    expect(() => SkillNameSchema.parse('UPPER')).toThrow();
  });

  it('rejects names with underscores', () => {
    expect(() => SkillNameSchema.parse('my_skill')).toThrow();
  });

  it('rejects names with spaces', () => {
    expect(() => SkillNameSchema.parse('my skill')).toThrow();
  });

  it('rejects names shorter than 2 chars', () => {
    expect(() => SkillNameSchema.parse('a')).toThrow();
  });

  it('rejects empty string', () => {
    expect(() => SkillNameSchema.parse('')).toThrow();
  });

  it('rejects names with special characters', () => {
    expect(() => SkillNameSchema.parse('my.skill')).toThrow();
    expect(() => SkillNameSchema.parse('my@skill')).toThrow();
    expect(() => SkillNameSchema.parse('my!skill')).toThrow();
  });
});

// ── SemverSchema ─────────────────────────────────────────────────

describe('SemverSchema', () => {
  it('accepts valid semver strings', () => {
    expect(SemverSchema.parse('1.0.0')).toBe('1.0.0');
    expect(SemverSchema.parse('0.0.0')).toBe('0.0.0');
    expect(SemverSchema.parse('12.34.56')).toBe('12.34.56');
  });

  it('accepts semver with prerelease tag', () => {
    expect(SemverSchema.parse('1.0.0-beta.1')).toBe('1.0.0-beta.1');
    expect(SemverSchema.parse('2.0.0-alpha')).toBe('2.0.0-alpha');
    expect(SemverSchema.parse('1.0.0-rc.2')).toBe('1.0.0-rc.2');
  });

  it('rejects invalid semver', () => {
    expect(() => SemverSchema.parse('1.0')).toThrow();
    expect(() => SemverSchema.parse('1')).toThrow();
    expect(() => SemverSchema.parse('v1.0.0')).toThrow();
    expect(() => SemverSchema.parse('not-a-version')).toThrow();
    expect(() => SemverSchema.parse('')).toThrow();
  });
});

// ── ManifestSchema ───────────────────────────────────────────────

describe('ManifestSchema', () => {
  const minimalManifest = {
    name: 'my-skill',
    version: '1.0.0',
    description: 'A useful skill that helps you do things efficiently and quickly.',
  };

  it('accepts a valid minimal manifest', () => {
    const result = ManifestSchema.parse(minimalManifest);
    expect(result.name).toBe('my-skill');
    expect(result.version).toBe('1.0.0');
    expect(result.description).toBe(minimalManifest.description);
    // Check defaults
    expect(result.category).toBe('other');
    expect(result.private).toBe(false);
  });

  it('accepts a valid full manifest', () => {
    const fullManifest = {
      ...minimalManifest,
      authors: [{ name: 'Alice', email: 'alice@example.com' }],
      maintainers: [{ name: 'Bob', email: 'bob@example.com' }],
      keywords: ['testing', 'automation'],
      category: 'testing' as const,
      license: 'MIT',
      private: false,
      urls: {
        homepage: 'https://example.com',
        repository: 'https://github.com/test/test',
        issues: 'https://github.com/test/test/issues',
        documentation: 'https://docs.example.com',
        changelog: 'https://github.com/test/test/blob/main/CHANGELOG.md',
        funding: 'https://github.com/sponsors/test',
      },
      forked_from: 'original-skill',
      agents: {
        platforms: ['claude-code', 'cursor'],
        requires_tools: ['bash', 'file_read'],
        min_context: 'standard' as const,
        requires_network: false,
        requires_mcp: [],
      },
      dependencies: {
        skills: { 'other-skill': '^1.0.0' },
        pip: ['pandas>=2.0'],
        npm: ['lodash@^4'],
        system: ['ffmpeg'],
      },
      security: {
        sandboxed: true,
        network_access: false,
        filesystem_scope: ['$WORKDIR'],
      },
      files: {
        include: ['SKILL.md', 'scripts/'],
        exclude: ['tests/'],
      },
      $schema: 'https://spm.dev/schemas/manifest-v1.json',
      spm: {
        manifest_version: 1,
      },
    };

    const result = ManifestSchema.parse(fullManifest);
    expect(result.name).toBe('my-skill');
    expect(result.authors).toHaveLength(1);
    expect(result.authors![0].name).toBe('Alice');
    expect(result.category).toBe('testing');
    expect(result.urls?.homepage).toBe('https://example.com');
    expect(result.agents?.platforms).toEqual(['claude-code', 'cursor']);
    expect(result.dependencies?.pip).toEqual(['pandas>=2.0']);
    expect(result.security?.sandboxed).toBe(true);
    expect(result.files?.include).toEqual(['SKILL.md', 'scripts/']);
    expect(result.spm?.manifest_version).toBe(1);
  });

  it('rejects manifest with missing name', () => {
    const { name, ...noName } = minimalManifest;
    expect(() => ManifestSchema.parse(noName)).toThrow();
  });

  it('rejects manifest with missing version', () => {
    const { version, ...noVersion } = minimalManifest;
    expect(() => ManifestSchema.parse(noVersion)).toThrow();
  });

  it('rejects manifest with invalid semver', () => {
    expect(() => ManifestSchema.parse({ ...minimalManifest, version: 'not-semver' })).toThrow();
  });

  it('rejects manifest with short description', () => {
    expect(() => ManifestSchema.parse({ ...minimalManifest, description: 'Too short' })).toThrow();
  });

  it('rejects manifest with missing description', () => {
    const { description, ...noDesc } = minimalManifest;
    expect(() => ManifestSchema.parse(noDesc)).toThrow();
  });

  it('rejects manifest with invalid category', () => {
    expect(() => ManifestSchema.parse({ ...minimalManifest, category: 'nonexistent' })).toThrow();
  });

  it('applies default category when not provided', () => {
    const result = ManifestSchema.parse(minimalManifest);
    expect(result.category).toBe('other');
  });

  it('accepts all valid categories', () => {
    const categories = [
      'documents',
      'data-viz',
      'frontend',
      'backend',
      'infra',
      'testing',
      'code-quality',
      'security',
      'productivity',
      'other',
    ] as const;

    for (const category of categories) {
      const result = ManifestSchema.parse({ ...minimalManifest, category });
      expect(result.category).toBe(category);
    }
  });

  it('rejects too many keywords', () => {
    const keywords = Array.from({ length: 21 }, (_, i) => `keyword-${i}`);
    expect(() => ManifestSchema.parse({ ...minimalManifest, keywords })).toThrow();
  });

  it('rejects a keyword that is too long', () => {
    const keywords = ['a'.repeat(51)];
    expect(() => ManifestSchema.parse({ ...minimalManifest, keywords })).toThrow();
  });
});

// ── PersonSchema ─────────────────────────────────────────────────

describe('PersonSchema', () => {
  it('accepts person with name only', () => {
    const result = PersonSchema.parse({ name: 'Alice' });
    expect(result.name).toBe('Alice');
  });

  it('accepts person with email only', () => {
    const result = PersonSchema.parse({ email: 'alice@example.com' });
    expect(result.email).toBe('alice@example.com');
  });

  it('accepts person with all fields', () => {
    const result = PersonSchema.parse({
      name: 'Alice',
      email: 'alice@example.com',
      url: 'https://alice.dev',
    });
    expect(result.name).toBe('Alice');
    expect(result.email).toBe('alice@example.com');
    expect(result.url).toBe('https://alice.dev');
  });

  it('rejects person with neither name nor email', () => {
    expect(() => PersonSchema.parse({})).toThrow();
    expect(() => PersonSchema.parse({ url: 'https://alice.dev' })).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => PersonSchema.parse({ email: 'not-an-email' })).toThrow();
  });

  it('rejects invalid url', () => {
    expect(() => PersonSchema.parse({ name: 'Alice', url: 'not-a-url' })).toThrow();
  });
});

// ── SearchParamsSchema ───────────────────────────────────────────

describe('SearchParamsSchema', () => {
  it('applies defaults for empty object', () => {
    const result = SearchParamsSchema.parse({});
    expect(result.sort).toBe('relevance');
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(20);
  });

  it('accepts valid search params', () => {
    const result = SearchParamsSchema.parse({
      q: 'data visualization',
      category: 'data-viz',
      trust: 'verified',
      sort: 'downloads',
      page: 2,
      per_page: 50,
    });
    expect(result.q).toBe('data visualization');
    expect(result.category).toBe('data-viz');
    expect(result.trust).toBe('verified');
    expect(result.sort).toBe('downloads');
    expect(result.page).toBe(2);
    expect(result.per_page).toBe(50);
  });

  it('validates category against allowed values', () => {
    expect(() => SearchParamsSchema.parse({ category: 'invalid-category' })).toThrow();
  });

  it('validates trust against allowed values', () => {
    expect(() => SearchParamsSchema.parse({ trust: 'invalid-trust' })).toThrow();
  });

  it('validates sort against allowed values', () => {
    expect(() => SearchParamsSchema.parse({ sort: 'invalid-sort' })).toThrow();
  });

  it('coerces string page/per_page to numbers', () => {
    const result = SearchParamsSchema.parse({ page: '3', per_page: '25' });
    expect(result.page).toBe(3);
    expect(result.per_page).toBe(25);
  });

  it('rejects per_page > 100', () => {
    expect(() => SearchParamsSchema.parse({ per_page: 101 })).toThrow();
  });

  it('rejects page < 1', () => {
    expect(() => SearchParamsSchema.parse({ page: 0 })).toThrow();
  });
});

// ── ReviewRequestSchema ──────────────────────────────────────────

describe('ReviewRequestSchema', () => {
  it('accepts valid review with rating only', () => {
    const result = ReviewRequestSchema.parse({ rating: 4 });
    expect(result.rating).toBe(4);
    expect(result.comment).toBeUndefined();
  });

  it('accepts valid review with comment', () => {
    const result = ReviewRequestSchema.parse({
      rating: 5,
      comment: 'Great skill, very useful!',
    });
    expect(result.rating).toBe(5);
    expect(result.comment).toBe('Great skill, very useful!');
  });

  it('rejects rating > 5', () => {
    expect(() => ReviewRequestSchema.parse({ rating: 6 })).toThrow();
  });

  it('rejects rating < 1', () => {
    expect(() => ReviewRequestSchema.parse({ rating: 0 })).toThrow();
  });

  it('rejects non-integer rating', () => {
    expect(() => ReviewRequestSchema.parse({ rating: 3.5 })).toThrow();
  });

  it('rejects comment longer than 2000 chars', () => {
    expect(() => ReviewRequestSchema.parse({ rating: 4, comment: 'x'.repeat(2001) })).toThrow();
  });
});

// ── SkillsJsonSchema ─────────────────────────────────────────────

describe('SkillsJsonSchema', () => {
  it('accepts a valid minimal skills.json', () => {
    const result = SkillsJsonSchema.parse({
      skills: {
        'code-review': '^1.0.0',
        'test-gen': '^2.0.0',
      },
    });
    expect(result.skills['code-review']).toBe('^1.0.0');
    expect(result.skills['test-gen']).toBe('^2.0.0');
  });

  it('accepts a full skills.json with all fields', () => {
    const result = SkillsJsonSchema.parse({
      $schema: 'https://spm.dev/schemas/skills-v1.json',
      name: 'my-project',
      description: 'Project skills configuration',
      skills: {
        'data-viz': '^1.0.0',
      },
      resolution: {
        strategy: 'project-first',
        overrides: {
          'data-viz': {
            priority: 'global',
            reason: 'Using globally customized version',
          },
        },
      },
      settings: {
        trust_level: 'verified',
        auto_update: true,
        allow_transient_skills: false,
        platform: ['claude-code'],
      },
    });

    expect(result.name).toBe('my-project');
    expect(result.resolution?.strategy).toBe('project-first');
    expect(result.resolution?.overrides?.['data-viz']?.priority).toBe('global');
    expect(result.settings?.trust_level).toBe('verified');
    expect(result.settings?.auto_update).toBe(true);
  });

  it('rejects skills.json without skills field', () => {
    expect(() => SkillsJsonSchema.parse({})).toThrow();
  });

  it('validates resolution strategy against allowed values', () => {
    expect(() =>
      SkillsJsonSchema.parse({
        skills: {},
        resolution: { strategy: 'invalid-strategy' },
      }),
    ).toThrow();
  });

  it('validates trust_level against allowed values', () => {
    expect(() =>
      SkillsJsonSchema.parse({
        skills: {},
        settings: { trust_level: 'nonexistent' },
      }),
    ).toThrow();
  });
});
