export interface ParsedSearchQuery {
  q: string;
  author?: string;
  category?: string;
  tag?: string;
  signed?: string;
  platform?: string;
  trust?: string;
  security?: string;
  sort?: string;
}

const FILTER_KEYS = new Set([
  'author',
  'category',
  'tag',
  'signed',
  'platform',
  'trust',
  'security',
  'sort',
]);

export const parseSearchQuery = (raw: string): ParsedSearchQuery => {
  const filters: Record<string, string> = {};
  const freeTerms: string[] = [];

  // Split on whitespace, preserving quoted values (key:"multi word")
  const tokens = raw.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];

  for (const token of tokens) {
    const colonIdx = token.indexOf(':');
    if (colonIdx > 0) {
      const key = token.slice(0, colonIdx).toLowerCase();
      const value = token.slice(colonIdx + 1).replace(/^"|"$/g, '');
      if (FILTER_KEYS.has(key) && value) {
        filters[key] = value;
        continue;
      }
    }
    freeTerms.push(token);
  }

  return { q: freeTerms.join(' '), ...filters };
};

export const buildQueryString = (parsed: ParsedSearchQuery): string => {
  const parts: string[] = [];
  if (parsed.q) parts.push(parsed.q);
  for (const key of FILTER_KEYS) {
    const value = parsed[key as keyof ParsedSearchQuery];
    if (value) {
      parts.push(value.includes(' ') ? `${key}:"${value}"` : `${key}:${value}`);
    }
  }
  return parts.join(' ');
};
