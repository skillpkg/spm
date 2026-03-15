import {
  parseSearchQuery,
  buildQueryString,
  getTokenAtCursor,
  replaceTokenAtCursor,
} from '../lib/parse-search-query';

describe('parseSearchQuery', () => {
  it('parses free text only', () => {
    expect(parseSearchQuery('hello world')).toEqual({ q: 'hello world' });
  });

  it('parses single author filter', () => {
    const result = parseSearchQuery('author:almog');
    expect(result.author).toEqual(['almog']);
    expect(result.q).toBe('');
  });

  it('parses multiple authors', () => {
    const result = parseSearchQuery('author:almog author:claude');
    expect(result.author).toEqual(['almog', 'claude']);
    expect(result.q).toBe('');
  });

  it('parses multiple categories', () => {
    const result = parseSearchQuery('category:backend category:frontend');
    expect(result.category).toEqual(['backend', 'frontend']);
  });

  it('parses multiple tags', () => {
    const result = parseSearchQuery('tag:cli tag:agent tag:tools');
    expect(result.tag).toEqual(['cli', 'agent', 'tools']);
  });

  it('parses mixed filters with free text', () => {
    const result = parseSearchQuery('data author:almog category:backend tag:cli');
    expect(result.q).toBe('data');
    expect(result.author).toEqual(['almog']);
    expect(result.category).toEqual(['backend']);
    expect(result.tag).toEqual(['cli']);
  });

  it('handles duplicate values by deduplicating', () => {
    const result = parseSearchQuery('author:almog author:almog');
    expect(result.author).toEqual(['almog']);
  });

  it('parses single-value filters normally', () => {
    const result = parseSearchQuery('trust:verified sort:downloads signed:true');
    expect(result.trust).toBe('verified');
    expect(result.sort).toBe('downloads');
    expect(result.signed).toBe('true');
  });

  it('handles quoted values', () => {
    const result = parseSearchQuery('author:"john doe"');
    expect(result.author).toEqual(['john doe']);
  });
});

describe('buildQueryString', () => {
  it('builds single-value query', () => {
    expect(buildQueryString({ q: 'hello', trust: 'verified' })).toBe('hello trust:verified');
  });

  it('builds multi-value author query', () => {
    const result = buildQueryString({ q: '', author: ['almog', 'claude'] });
    expect(result).toBe('author:almog author:claude');
  });

  it('builds complex multi-filter query', () => {
    const result = buildQueryString({
      q: 'data',
      author: ['almog'],
      category: ['backend', 'frontend'],
      tag: ['cli'],
      trust: 'verified',
    });
    expect(result).toContain('data');
    expect(result).toContain('author:almog');
    expect(result).toContain('category:backend');
    expect(result).toContain('category:frontend');
    expect(result).toContain('tag:cli');
    expect(result).toContain('trust:verified');
  });

  it('quotes values with spaces', () => {
    const result = buildQueryString({ q: '', author: ['john doe'] });
    expect(result).toBe('author:"john doe"');
  });

  it('round-trips correctly', () => {
    const original = 'search author:almog author:claude category:backend trust:verified';
    const parsed = parseSearchQuery(original);
    const rebuilt = buildQueryString(parsed);
    const reparsed = parseSearchQuery(rebuilt);
    expect(reparsed).toEqual(parsed);
  });
});

describe('getTokenAtCursor', () => {
  it('detects author: token', () => {
    const result = getTokenAtCursor('author:alm', 10);
    expect(result.mode).toBe('author');
    expect(result.prefix).toBe('alm');
  });

  it('detects category: token mid-input', () => {
    const result = getTokenAtCursor('hello category:back world', 19);
    expect(result.mode).toBe('category');
    expect(result.prefix).toBe('back');
  });

  it('detects tag: token', () => {
    const result = getTokenAtCursor('tag:cl', 6);
    expect(result.mode).toBe('tag');
    expect(result.prefix).toBe('cl');
  });

  it('returns null for free text', () => {
    const result = getTokenAtCursor('hello world', 5);
    expect(result.mode).toBeNull();
  });

  it('returns null for unknown prefix', () => {
    const result = getTokenAtCursor('sort:downloads', 14);
    expect(result.mode).toBeNull();
  });
});

describe('replaceTokenAtCursor', () => {
  it('replaces author token with selected value', () => {
    const cursor = getTokenAtCursor('author:alm', 10);
    const { newInput } = replaceTokenAtCursor('author:alm', cursor, 'author', 'almog');
    expect(newInput).toContain('author:almog');
  });

  it('replaces mid-input token', () => {
    const cursor = getTokenAtCursor('hello category:back world', 19);
    const { newInput } = replaceTokenAtCursor(
      'hello category:back world',
      cursor,
      'category',
      'backend',
    );
    expect(newInput).toContain('hello');
    expect(newInput).toContain('category:backend');
    expect(newInput).toContain('world');
  });
});
