import { describe, it, expect, vi } from 'vitest';

// ── Download service tests ──

describe('downloads service', () => {
  const createMockDb = () => {
    const mockInsert = vi.fn();
    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockValues });

    const mockSelect = vi.fn();
    const mockFrom = vi.fn();
    const mockInnerJoin = vi.fn();
    const mockWhere = vi.fn();
    const mockLimit = vi.fn();
    const mockGroupBy = vi.fn();
    const mockOrderBy = vi.fn();

    return {
      db: {
        insert: mockInsert,
        select: mockSelect,
      },
      mocks: {
        mockInsert,
        mockValues,
        mockSelect,
        mockFrom,
        mockInnerJoin,
        mockWhere,
        mockLimit,
        mockGroupBy,
        mockOrderBy,
      },
    };
  };

  describe('recordDownload', () => {
    it('should not count duplicate download from same user within 1 hour', async () => {
      const { recordDownload } = await import('../services/downloads.js');
      const { db, mocks } = createMockDb();

      // Setup: select().from().where().limit() chain returns a recent download
      mocks.mockSelect.mockReturnValueOnce({ from: mocks.mockFrom });
      mocks.mockFrom.mockReturnValueOnce({ where: mocks.mockWhere });
      mocks.mockWhere.mockReturnValueOnce({ limit: mocks.mockLimit });
      mocks.mockLimit.mockResolvedValueOnce([{ id: 'existing-download-id' }]);

      const result = await recordDownload(db as never, {
        versionId: 'version-1',
        userId: 'user-1',
      });

      expect(result).toBe(false);
      // insert should NOT have been called
      expect(mocks.mockInsert).not.toHaveBeenCalled();
    });

    it('should record download when no recent download by same user', async () => {
      const { recordDownload } = await import('../services/downloads.js');
      const { db, mocks } = createMockDb();

      // Setup: select chain returns empty (no recent download)
      mocks.mockSelect.mockReturnValueOnce({ from: mocks.mockFrom });
      mocks.mockFrom.mockReturnValueOnce({ where: mocks.mockWhere });
      mocks.mockWhere.mockReturnValueOnce({ limit: mocks.mockLimit });
      mocks.mockLimit.mockResolvedValueOnce([]);

      const result = await recordDownload(db as never, {
        versionId: 'version-1',
        userId: 'user-1',
      });

      expect(result).toBe(true);
      expect(mocks.mockInsert).toHaveBeenCalled();
    });

    it('should count downloads from different users separately', async () => {
      const { recordDownload } = await import('../services/downloads.js');

      // First user downloads
      const { db: db1, mocks: mocks1 } = createMockDb();
      mocks1.mockSelect.mockReturnValueOnce({ from: mocks1.mockFrom });
      mocks1.mockFrom.mockReturnValueOnce({ where: mocks1.mockWhere });
      mocks1.mockWhere.mockReturnValueOnce({ limit: mocks1.mockLimit });
      mocks1.mockLimit.mockResolvedValueOnce([]); // no recent download

      const result1 = await recordDownload(db1 as never, {
        versionId: 'version-1',
        userId: 'user-1',
      });

      // Second user downloads same version
      const { db: db2, mocks: mocks2 } = createMockDb();
      mocks2.mockSelect.mockReturnValueOnce({ from: mocks2.mockFrom });
      mocks2.mockFrom.mockReturnValueOnce({ where: mocks2.mockWhere });
      mocks2.mockWhere.mockReturnValueOnce({ limit: mocks2.mockLimit });
      mocks2.mockLimit.mockResolvedValueOnce([]); // no recent download for this user

      const result2 = await recordDownload(db2 as never, {
        versionId: 'version-1',
        userId: 'user-2',
      });

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(mocks1.mockInsert).toHaveBeenCalled();
      expect(mocks2.mockInsert).toHaveBeenCalled();
    });

    it('should dedup by ipHash when userId is not provided', async () => {
      const { recordDownload } = await import('../services/downloads.js');
      const { db, mocks } = createMockDb();

      // Setup: recent download found by IP
      mocks.mockSelect.mockReturnValueOnce({ from: mocks.mockFrom });
      mocks.mockFrom.mockReturnValueOnce({ where: mocks.mockWhere });
      mocks.mockWhere.mockReturnValueOnce({ limit: mocks.mockLimit });
      mocks.mockLimit.mockResolvedValueOnce([{ id: 'existing-download' }]);

      const result = await recordDownload(db as never, {
        versionId: 'version-1',
        ipHash: 'abc123hash',
      });

      expect(result).toBe(false);
      expect(mocks.mockInsert).not.toHaveBeenCalled();
    });

    it('should always record when no userId or ipHash', async () => {
      const { recordDownload } = await import('../services/downloads.js');
      const { db, mocks } = createMockDb();

      const result = await recordDownload(db as never, {
        versionId: 'version-1',
      });

      expect(result).toBe(true);
      expect(mocks.mockInsert).toHaveBeenCalled();
      // select should not have been called (no dedup check needed)
      expect(mocks.mockSelect).not.toHaveBeenCalled();
    });
  });

  describe('getDownloadCounts', () => {
    it('should return correct total download count', async () => {
      const { getDownloadCounts } = await import('../services/downloads.js');
      const { db, mocks } = createMockDb();

      mocks.mockSelect.mockReturnValueOnce({ from: mocks.mockFrom });
      mocks.mockFrom.mockReturnValueOnce({ innerJoin: mocks.mockInnerJoin });
      mocks.mockInnerJoin.mockReturnValueOnce({ where: mocks.mockWhere });
      mocks.mockWhere.mockResolvedValueOnce([{ total: 42 }]);

      const total = await getDownloadCounts(db as never, 'skill-1');

      expect(total).toBe(42);
    });

    it('should return 0 when no downloads exist', async () => {
      const { getDownloadCounts } = await import('../services/downloads.js');
      const { db, mocks } = createMockDb();

      mocks.mockSelect.mockReturnValueOnce({ from: mocks.mockFrom });
      mocks.mockFrom.mockReturnValueOnce({ innerJoin: mocks.mockInnerJoin });
      mocks.mockInnerJoin.mockReturnValueOnce({ where: mocks.mockWhere });
      mocks.mockWhere.mockResolvedValueOnce([{ total: 0 }]);

      const total = await getDownloadCounts(db as never, 'skill-none');

      expect(total).toBe(0);
    });
  });

  describe('getWeeklyDownloads', () => {
    it('should return correct weekly download count', async () => {
      const { getWeeklyDownloads } = await import('../services/downloads.js');
      const { db, mocks } = createMockDb();

      mocks.mockSelect.mockReturnValueOnce({ from: mocks.mockFrom });
      mocks.mockFrom.mockReturnValueOnce({ innerJoin: mocks.mockInnerJoin });
      mocks.mockInnerJoin.mockReturnValueOnce({ where: mocks.mockWhere });
      mocks.mockWhere.mockResolvedValueOnce([{ total: 15 }]);

      const weekly = await getWeeklyDownloads(db as never, 'skill-1');

      expect(weekly).toBe(15);
    });
  });
});

// ── Cache service tests ──

describe('cache service', () => {
  describe('buildCacheKey', () => {
    it('should build cache key from path', async () => {
      const { buildCacheKey } = await import('../services/cache.js');
      const key = buildCacheKey('/skills');
      expect(key).toBe('https://spm.dev/cache/skills');
    });

    it('should include query string when provided', async () => {
      const { buildCacheKey } = await import('../services/cache.js');
      const key = buildCacheKey('/skills', 'q=test&page=1');
      expect(key).toBe('https://spm.dev/cache/skills?q=test&page=1');
    });

    it('should strip leading slash from path', async () => {
      const { buildCacheKey } = await import('../services/cache.js');
      const key = buildCacheKey('/categories');
      expect(key).toBe('https://spm.dev/cache/categories');
    });
  });

  describe('invalidateCache', () => {
    it('should return false when caches API is unavailable', async () => {
      const { invalidateCache } = await import('../services/cache.js');
      const result = await invalidateCache('https://spm.dev/cache/skills');
      // In Node test environment, caches is undefined
      expect(result).toBe(false);
    });
  });

  describe('cachedResponse', () => {
    it('should call fetcher directly when caches API is unavailable', async () => {
      const { cachedResponse } = await import('../services/cache.js');
      const fetcher = vi.fn().mockResolvedValue(new Response('fresh data', { status: 200 }));
      const mockContext = {} as never;

      const response = await cachedResponse(mockContext, 'https://spm.dev/cache/test', 60, fetcher);

      expect(fetcher).toHaveBeenCalledOnce();
      expect(await response.text()).toBe('fresh data');
    });
  });

  describe('CACHE_TTLS', () => {
    it('should have correct TTL values', async () => {
      const { CACHE_TTLS } = await import('../services/cache.js');
      expect(CACHE_TTLS.search).toBe(30);
      expect(CACHE_TTLS.skillDetail).toBe(60);
      expect(CACHE_TTLS.categories).toBe(300);
      expect(CACHE_TTLS.trending).toBe(300);
      expect(CACHE_TTLS.status).toBe(60);
    });
  });
});

// ── Analytics service tests ──

describe('analytics service', () => {
  describe('getAuthorStats', () => {
    it('should return empty stats when author has no skills', async () => {
      const { getAuthorStats } = await import('../services/analytics.js');

      const mockSelect = vi.fn();
      const mockFrom = vi.fn();
      const mockWhere = vi.fn();

      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockFrom.mockReturnValueOnce({ where: mockWhere });
      mockWhere.mockResolvedValueOnce([]); // no skills

      const db = { select: mockSelect };
      const stats = await getAuthorStats(db as never, 'user-no-skills');

      expect(stats.totalDownloads).toBe(0);
      expect(stats.weeklyDownloads).toBe(0);
      expect(stats.ratingAvg).toBe(0);
      expect(stats.totalReviews).toBe(0);
      expect(stats.weeklyTrend).toEqual([]);
      expect(stats.skills).toEqual([]);
    });
  });
});
