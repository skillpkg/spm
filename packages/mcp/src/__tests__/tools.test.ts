import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatSearchResults } from '../tools/search.js';
import { formatSkillInfo } from '../tools/info.js';
import { formatCategories } from '../tools/categories.js';
import {
  fetchSkills,
  fetchSkillInfo,
  fetchCategories,
  type ApiClientError,
} from '../api-client.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

// -- Format tests --

describe('formatSearchResults', () => {
  it('formats search results correctly', () => {
    const result = formatSearchResults('chart', [
      {
        name: 'data-viz',
        version: '1.2.3',
        rating: 4.8,
        review_count: 142,
        downloads: 12400,
        description: 'Charts, dashboards, and visualizations from CSV, JSON, or database output',
      },
      {
        name: 'chart-export',
        version: '0.8.0',
        rating: 4.5,
        review_count: 23,
        downloads: 3200,
        description: 'Export charts as PNG, SVG, PDF for reports and presentations',
      },
    ]);

    expect(result).toContain('Found 2 skills matching "chart"');
    expect(result).toContain('1. data-viz v1.2.3');
    expect(result).toContain('⭐ 4.8');
    expect(result).toContain('(142 reviews)');
    expect(result).toContain('↓ 12,400');
    expect(result).toContain('spm install data-viz');
    expect(result).toContain('2. chart-export v0.8.0');
    expect(result).toContain('⭐ 4.5');
    expect(result).toContain('spm install chart-export');
  });

  it('handles empty results', () => {
    const result = formatSearchResults('nonexistent', []);
    expect(result).toContain('No skills found matching "nonexistent"');
  });
});

describe('formatSkillInfo', () => {
  it('formats skill detail correctly', () => {
    const result = formatSkillInfo({
      name: 'data-viz',
      version: '1.2.3',
      description: 'Charts, dashboards, and visualizations from CSV, JSON, or database output',
      author: 'almog',
      verified: true,
      category: 'data-viz',
      license: 'MIT',
      downloads: 12400,
      downloads_this_week: 1200,
      rating: 4.8,
      review_count: 142,
      keywords: ['charts', 'plotly', 'd3', 'dashboards'],
      platforms: ['all'],
    });

    expect(result).toContain('data-viz v1.2.3');
    expect(result).toContain('═');
    expect(result).toContain('Charts, dashboards, and visualizations');
    expect(result).toContain('Author: almog (verified ✓)');
    expect(result).toContain('Category: Data & Visualization');
    expect(result).toContain('License: MIT');
    expect(result).toContain('Downloads: 12,400 (1,200 this week)');
    expect(result).toContain('Rating: ⭐ 4.8 (142 reviews)');
    expect(result).toContain('Tags: charts, plotly, d3, dashboards');
    expect(result).toContain('Platforms: all');
    expect(result).toContain('Install: spm install data-viz');
  });

  it('formats skill without optional fields', () => {
    const result = formatSkillInfo({
      name: 'minimal-skill',
      version: '0.1.0',
      description: 'A minimal skill for testing purposes',
      author: 'test-user',
      category: 'other',
      downloads: 5,
      rating: 0,
      review_count: 0,
    });

    expect(result).toContain('minimal-skill v0.1.0');
    expect(result).toContain('Author: test-user');
    expect(result).not.toContain('verified');
    expect(result).not.toContain('License:');
    expect(result).not.toContain('Tags:');
  });
});

describe('formatCategories', () => {
  it('lists all categories with counts', () => {
    const result = formatCategories([
      {
        icon: '📄',
        display: 'Documents',
        skill_count: 34,
        description: 'PDF, DOCX, text processing',
      },
      {
        icon: '📊',
        display: 'Data & Visualization',
        skill_count: 28,
        description: 'Charts, dashboards, analytics',
      },
      { icon: '🎨', display: 'Frontend', skill_count: 22, description: 'UI, React, HTML/CSS' },
    ]);

    expect(result).toContain('SPM Skill Categories:');
    expect(result).toContain('📄 Documents (34 skills) — PDF, DOCX, text processing');
    expect(result).toContain('📊 Data & Visualization (28 skills) — Charts, dashboards, analytics');
    expect(result).toContain('🎨 Frontend (22 skills) — UI, React, HTML/CSS');
  });
});

// -- API client tests --

describe('fetchSkills', () => {
  it('returns search results on success', async () => {
    const mockResponse = {
      skills: [{ name: 'test-skill', version: '1.0.0' }],
      total: 1,
      page: 1,
      per_page: 10,
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchSkills('https://registry.spm.dev/api/v1', { q: 'test' });
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/skills?q=test'));
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    try {
      await fetchSkills('https://registry.spm.dev/api/v1', { q: 'test' });
      expect.fail('Should have thrown');
    } catch (err) {
      const error = err as ApiClientError;
      expect(error.status).toBe(500);
      expect(error.message).toContain('Failed to search skills');
    }
  });
});

describe('fetchSkillInfo', () => {
  it('returns skill detail on success', async () => {
    const mockSkill = { name: 'data-viz', version: '1.2.3' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSkill),
    });

    const result = await fetchSkillInfo('https://registry.spm.dev/api/v1', 'data-viz');
    expect(result).toEqual(mockSkill);
  });

  it('handles 404 errors gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    try {
      await fetchSkillInfo('https://registry.spm.dev/api/v1', 'nonexistent');
      expect.fail('Should have thrown');
    } catch (err) {
      const error = err as ApiClientError;
      expect(error.status).toBe(404);
      expect(error.message).toContain('Skill "nonexistent" not found');
    }
  });
});

describe('fetchCategories', () => {
  it('returns categories on success', async () => {
    const mockCategories = [
      { slug: 'documents', display: 'Documents', icon: '📄', description: 'test', skill_count: 10 },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCategories),
    });

    const result = await fetchCategories('https://registry.spm.dev/api/v1');
    expect(result).toEqual(mockCategories);
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));

    try {
      await fetchCategories('https://registry.spm.dev/api/v1');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
    }
  });
});
