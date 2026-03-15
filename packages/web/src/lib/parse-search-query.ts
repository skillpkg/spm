export interface ParsedSearchQuery {
  q: string;
  author?: string[];
  category?: string[];
  tag?: string[];
  signed?: string;
  platform?: string;
  trust?: string;
  security?: string;
  sort?: string;
}

/** Keys that support multiple values (arrays) */
const MULTI_KEYS = new Set(['author', 'category', 'tag']);

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
  const singleFilters: Record<string, string> = {};
  const multiFilters: Record<string, string[]> = {};
  const freeTerms: string[] = [];

  // Split on whitespace, preserving quoted values (key:"multi word")
  const tokens = raw.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];

  for (const token of tokens) {
    const colonIdx = token.indexOf(':');
    if (colonIdx > 0) {
      const key = token.slice(0, colonIdx).toLowerCase();
      const value = token.slice(colonIdx + 1).replace(/^"|"$/g, '');
      if (FILTER_KEYS.has(key) && value) {
        if (MULTI_KEYS.has(key)) {
          if (!multiFilters[key]) multiFilters[key] = [];
          if (!multiFilters[key].includes(value)) {
            multiFilters[key].push(value);
          }
        } else {
          singleFilters[key] = value;
        }
        continue;
      }
    }
    freeTerms.push(token);
  }

  return {
    q: freeTerms.join(' '),
    ...singleFilters,
    ...(multiFilters.author?.length ? { author: multiFilters.author } : {}),
    ...(multiFilters.category?.length ? { category: multiFilters.category } : {}),
    ...(multiFilters.tag?.length ? { tag: multiFilters.tag } : {}),
  };
};

export const buildQueryString = (parsed: ParsedSearchQuery): string => {
  const parts: string[] = [];
  if (parsed.q) parts.push(parsed.q);

  // Emit multi-value keys as repeated tokens
  for (const key of MULTI_KEYS) {
    const values = parsed[key as keyof ParsedSearchQuery] as string[] | undefined;
    if (values) {
      for (const v of values) {
        parts.push(v.includes(' ') ? `${key}:"${v}"` : `${key}:${v}`);
      }
    }
  }

  // Emit single-value keys
  for (const key of FILTER_KEYS) {
    if (MULTI_KEYS.has(key)) continue;
    const value = parsed[key as keyof ParsedSearchQuery] as string | undefined;
    if (value) {
      parts.push(value.includes(' ') ? `${key}:"${value}"` : `${key}:${value}`);
    }
  }

  return parts.join(' ');
};

/**
 * Given an input string and cursor position, extract the token at the cursor
 * and determine if it's a prefix filter being typed.
 */
export interface CursorToken {
  /** The detected prefix mode, or null if not a filter token */
  mode: 'author' | 'category' | 'tag' | null;
  /** The partial value after the colon */
  prefix: string;
  /** Start index of this token in the input string */
  tokenStart: number;
  /** End index of this token in the input string */
  tokenEnd: number;
}

export const getTokenAtCursor = (input: string, cursorPos: number): CursorToken => {
  // Find word boundaries around cursor
  let start = cursorPos;
  while (start > 0 && input[start - 1] !== ' ') start--;
  let end = cursorPos;
  while (end < input.length && input[end] !== ' ') end++;

  const token = input.slice(start, end);
  const colonIdx = token.indexOf(':');

  if (colonIdx > 0) {
    const key = token.slice(0, colonIdx).toLowerCase();
    const prefix = token.slice(colonIdx + 1).replace(/^"|"$/g, '');
    if (key === 'author' || key === 'category' || key === 'tag') {
      return { mode: key, prefix, tokenStart: start, tokenEnd: end };
    }
  }

  return { mode: null, prefix: '', tokenStart: start, tokenEnd: end };
};

/**
 * Replace the token at cursor with a completed value.
 * Returns the new input string and new cursor position.
 */
export const replaceTokenAtCursor = (
  input: string,
  cursor: CursorToken,
  mode: string,
  value: string,
): { newInput: string; newCursorPos: number } => {
  const replacement = value.includes(' ') ? `${mode}:"${value}"` : `${mode}:${value}`;
  const before = input.slice(0, cursor.tokenStart);
  const after = input.slice(cursor.tokenEnd);
  const needsSpace = after.length > 0 && after[0] !== ' ';
  const newInput = before + replacement + (needsSpace ? ' ' : '') + after;
  const newCursorPos = before.length + replacement.length + (needsSpace ? 1 : 0);
  return { newInput: newInput.replace(/\s+/g, ' ').trim() + ' ', newCursorPos };
};
