import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import {
  validateSkillName,
  checkNameSimilarity,
  isReservedName,
  RESERVED_NAMES,
} from '../services/names.js';

// ── Name validation tests (pure functions, no mocking) ──

describe('name validation', () => {
  describe('validateSkillName', () => {
    it('should accept valid kebab-case names', () => {
      expect(validateSkillName('my-skill').valid).toBe(true);
      expect(validateSkillName('pdf-generator').valid).toBe(true);
      expect(validateSkillName('ab').valid).toBe(true);
      expect(validateSkillName('a-very-long-but-valid-skill-name').valid).toBe(true);
    });

    it('should accept scoped names', () => {
      expect(validateSkillName('@org/my-skill').valid).toBe(true);
      expect(validateSkillName('@my-team/cool-tool').valid).toBe(true);
    });

    it('should reject names that are too short', () => {
      const result = validateSkillName('a');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 2');
    });

    it('should reject names that are too long', () => {
      const result = validateSkillName('a'.repeat(51));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 50');
    });

    it('should reject names not starting with a letter', () => {
      const result = validateSkillName('1-bad-name');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('kebab-case');
    });

    it('should reject uppercase names', () => {
      const result = validateSkillName('MySkill');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('kebab-case');
    });

    it('should reject names with special characters', () => {
      expect(validateSkillName('my_skill').valid).toBe(false);
      expect(validateSkillName('my.skill').valid).toBe(false);
      expect(validateSkillName('my skill').valid).toBe(false);
    });

    it('should reject reserved names', () => {
      const result = validateSkillName('spm');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reserved');
    });

    it('should reject reserved names even when scoped', () => {
      const result = validateSkillName('@scope/admin');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reserved');
    });
  });

  describe('isReservedName', () => {
    it('should detect reserved names', () => {
      expect(isReservedName('spm')).toBe(true);
      expect(isReservedName('admin')).toBe(true);
      expect(isReservedName('test')).toBe(true);
    });

    it('should not flag non-reserved names', () => {
      expect(isReservedName('my-cool-skill')).toBe(false);
      expect(isReservedName('pdf-generator')).toBe(false);
    });

    it('should check bare name in scoped names', () => {
      expect(isReservedName('@org/admin')).toBe(true);
      expect(isReservedName('@org/my-skill')).toBe(false);
    });
  });

  describe('RESERVED_NAMES', () => {
    it('should contain key names', () => {
      expect(RESERVED_NAMES).toContain('spm');
      expect(RESERVED_NAMES).toContain('admin');
      expect(RESERVED_NAMES).toContain('api');
      expect(RESERVED_NAMES).toContain('auth');
      expect(RESERVED_NAMES).toContain('login');
    });
  });

  describe('checkNameSimilarity', () => {
    it('should detect similar names', () => {
      const result = checkNameSimilarity('pdf-genrator', ['pdf-generator', 'csv-parser']);
      expect(result.similar).toBe(true);
      expect(result.matches).toContain('pdf-generator');
    });

    it('should not flag dissimilar names', () => {
      const result = checkNameSimilarity('totally-unique', ['pdf-generator', 'csv-parser']);
      expect(result.similar).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('should handle empty existing names', () => {
      const result = checkNameSimilarity('anything', []);
      expect(result.similar).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('should detect very close names', () => {
      const result = checkNameSimilarity('my-skill-v2', ['my-skill-v1']);
      // These are very similar strings
      expect(result.similar).toBe(true);
    });
  });
});

// ── R2 service tests ──

describe('r2 service', () => {
  it('should upload package and return storage key', async () => {
    const { uploadPackage } = await import('../services/r2.js');

    const mockPut = vi.fn().mockResolvedValue(undefined);
    const mockBucket = { put: mockPut } as unknown as R2Bucket;
    const data = new ArrayBuffer(10);

    const key = await uploadPackage(mockBucket, 'my-skill', '1.0.0', data);

    expect(key).toBe('packages/my-skill/1.0.0.skl');
    expect(mockPut).toHaveBeenCalledWith('packages/my-skill/1.0.0.skl', data);
  });

  it('should upload bundle and return storage key', async () => {
    const { uploadBundle } = await import('../services/r2.js');

    const mockPut = vi.fn().mockResolvedValue(undefined);
    const mockBucket = { put: mockPut } as unknown as R2Bucket;
    const data = new ArrayBuffer(5);

    const key = await uploadBundle(mockBucket, 'my-skill', '1.0.0', data);

    expect(key).toBe('bundles/my-skill/1.0.0.sigstore');
    expect(mockPut).toHaveBeenCalledWith('bundles/my-skill/1.0.0.sigstore', data);
  });

  it('should get object from bucket', async () => {
    const { getObject } = await import('../services/r2.js');

    const mockBody = { arrayBuffer: vi.fn() };
    const mockGet = vi.fn().mockResolvedValue(mockBody);
    const mockBucket = { get: mockGet } as unknown as R2Bucket;

    const result = await getObject(mockBucket, 'packages/my-skill/1.0.0.skl');

    expect(mockGet).toHaveBeenCalledWith('packages/my-skill/1.0.0.skl');
    expect(result).toBe(mockBody);
  });

  it('should delete object from bucket', async () => {
    const { deleteObject } = await import('../services/r2.js');

    const mockDelete = vi.fn().mockResolvedValue(undefined);
    const mockBucket = { delete: mockDelete } as unknown as R2Bucket;

    await deleteObject(mockBucket, 'packages/my-skill/1.0.0.skl');

    expect(mockDelete).toHaveBeenCalledWith('packages/my-skill/1.0.0.skl');
  });
});

// ── Route-level tests with mocked DB ──

describe('skills routes — GET /skills/:name (integration-like)', () => {
  it('should return 404 for non-existent skill', async () => {
    const { skillsRoutes } = await import('../routes/skills.js');

    const mockSelect = vi.fn();
    const mockFrom = vi.fn();
    const mockWhere = vi.fn();
    const mockLimit = vi.fn();

    // First query: skill lookup returns empty
    mockSelect.mockReturnValueOnce({ from: mockFrom });
    mockFrom.mockReturnValueOnce({ where: mockWhere });
    mockWhere.mockReturnValueOnce({ limit: mockLimit });
    mockLimit.mockResolvedValueOnce([]); // no skill found

    // Second query: all skills for did-you-mean
    mockSelect.mockReturnValueOnce({ from: mockFrom });
    mockFrom.mockResolvedValueOnce([]); // no skills at all

    const db = {
      select: mockSelect,
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', db as never);
      await next();
    });
    app.route('/', skillsRoutes);

    const res = await app.request('/skills/nonexistent');
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(404);
    expect(body.error).toBe('skill_not_found');
  });
});

describe('skills routes — GET /skills/:name/:version', () => {
  it('should return 404 when skill does not exist', async () => {
    const { skillsRoutes } = await import('../routes/skills.js');

    const mockSelect = vi.fn();
    const mockFrom = vi.fn();
    const mockWhere = vi.fn();
    const mockLimit = vi.fn();

    mockSelect.mockReturnValueOnce({ from: mockFrom });
    mockFrom.mockReturnValueOnce({ where: mockWhere });
    mockWhere.mockReturnValueOnce({ limit: mockLimit });
    mockLimit.mockResolvedValueOnce([]); // no skill

    const db = { select: mockSelect };

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', db as never);
      await next();
    });
    app.route('/', skillsRoutes);

    const res = await app.request('/skills/nonexistent/1.0.0');
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(404);
    expect(body.error).toBe('skill_not_found');
  });
});

describe('skills routes — DELETE /skills/:name/:version (yank)', () => {
  it('should return 401 without auth token', async () => {
    const { skillsRoutes } = await import('../routes/skills.js');

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', {} as never);
      await next();
    });
    app.route('/', skillsRoutes);

    const res = await app.request('/skills/my-skill/1.0.0', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'security issue' }),
    });

    // Should be 401 because no Bearer token
    expect(res.status).toBe(401);
  });
});

describe('skills routes — PATCH /skills/:name', () => {
  it('should return 401 without auth token', async () => {
    const { skillsRoutes } = await import('../routes/skills.js');

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', {} as never);
      await next();
    });
    app.route('/', skillsRoutes);

    const res = await app.request('/skills/my-skill', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deprecated: true }),
    });

    expect(res.status).toBe(401);
  });
});

describe('skills routes — POST /skills (publish)', () => {
  it('should return 401 without auth token', async () => {
    const { skillsRoutes } = await import('../routes/skills.js');

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', {} as never);
      await next();
    });
    app.route('/', skillsRoutes);

    const formData = new FormData();
    formData.append('manifest', JSON.stringify({ name: 'test-skill' }));
    formData.append('package', new File([new ArrayBuffer(10)], 'test.skl'));

    const res = await app.request('/skills', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(401);
  });
});
