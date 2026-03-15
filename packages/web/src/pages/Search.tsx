import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CATEGORY_NAMES, CATEGORY_SLUGS, TRUST_TIERS, SORT_OPTIONS } from '../data/constants';
import { TrustBadge, SecurityBadge, Text, type TrustTier, type SecurityLevel } from '@spm/ui';
import { type SearchResultItem } from '../lib/api';
import { searchSkillsQuery } from './search/queries';
import {
  parseSearchQuery,
  buildQueryString,
  getTokenAtCursor,
  replaceTokenAtCursor,
} from '../lib/parse-search-query';
import { useSearchAutocomplete } from '../hooks/useSearchAutocomplete';
import { AutocompleteDropdown } from '../components/autocomplete/AutocompleteDropdown';

// Reverse map: slug → display name
const SLUG_TO_CATEGORY: Record<string, string> = {};
for (const [name, slug] of Object.entries(CATEGORY_SLUGS)) {
  SLUG_TO_CATEGORY[slug] = name;
}

const PLATFORM_OPTIONS = [
  { label: 'All platforms', value: '' },
  { label: 'Claude Code', value: 'claude-code' },
  { label: 'Cursor', value: 'cursor' },
  { label: 'Codex', value: 'codex' },
];

interface DisplaySkill {
  name: string;
  version: string;
  desc: string;
  author: string;
  trust: TrustTier;
  securityLevel: SecurityLevel;
  downloads: string;
  rating: string;
  tags?: string[];
}

const apiResultToDisplay = (s: SearchResultItem): DisplaySkill => ({
  name: s.name,
  version: s.version,
  desc: s.description,
  author: s.author.username,
  trust: s.author.trust_tier as TrustTier,
  securityLevel: (s.scan_security_level as SecurityLevel) ?? 'unscanned',
  downloads: s.downloads >= 1000 ? `${(s.downloads / 1000).toFixed(1)}k` : String(s.downloads),
  rating: s.rating_avg != null ? String(s.rating_avg) : '--',
  tags: s.tags,
});

const SearchResultRow = ({ skill }: { skill: DisplaySkill }) => {
  return (
    <Link to={`/skills/${skill.name}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1a1d2744',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text
              variant="h4"
              font="mono"
              weight={600}
              as="span"
              style={{ color: 'var(--color-cyan)' }}
            >
              {skill.name}
            </Text>
            <Text variant="caption" font="mono" color="faint" as="span">
              {skill.version}
            </Text>
            <TrustBadge tier={skill.trust} />
            <SecurityBadge level={skill.securityLevel} showLabel={false} />
          </div>
          <Text
            variant="caption"
            font="mono"
            color="muted"
            as="div"
            style={{ display: 'flex', gap: 16 }}
          >
            <span>&#x2B07; {skill.downloads}</span>
            <span style={{ color: 'var(--color-yellow)' }}>&#x2605; {skill.rating}</span>
          </Text>
        </div>
        <Text
          variant="body-sm"
          font="sans"
          color="dim"
          as="p"
          style={{ marginBottom: 8, lineHeight: 1.6, marginTop: 0 }}
        >
          {skill.desc}
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text variant="caption" font="sans" color="muted" as="span">
            by @{skill.author}
          </Text>
          <div style={{ display: 'flex', gap: 4 }}>
            {skill.tags?.slice(0, 4).map((t) => (
              <Text
                key={t}
                variant="label"
                font="mono"
                color="dim"
                as="span"
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: '#111318',
                  border: '1px solid var(--color-border-default)',
                }}
              >
                {t}
              </Text>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
};

const sidebarItemStyle = (isActive: boolean): React.CSSProperties => ({
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  padding: '6px 10px',
  borderRadius: 6,
  cursor: 'pointer',
  marginBottom: 1,
  color: isActive ? '#e2e8f0' : '#64748b',
  background: isActive ? 'rgba(16,185,129,0.07)' : 'transparent',
});

const chipStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  padding: '4px 10px',
  borderRadius: 20,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(16,185,129,0.08)',
  color: '#10b981',
};

export const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawQuery = searchParams.get('q') || '';

  // Parse query string into structured filters
  const parsed = useMemo(() => parseSearchQuery(rawQuery), [rawQuery]);

  // Local input state for the search bar
  const [inputValue, setInputValue] = useState(rawQuery);
  const [cursorPos, setCursorPos] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(rawQuery);
  }, [rawQuery]);

  // Cursor-aware autocomplete: detect which token the cursor is in
  const cursorToken = useMemo(
    () => getTokenAtCursor(inputValue, cursorPos),
    [inputValue, cursorPos],
  );
  const cursorQuery = cursorToken.mode ? `${cursorToken.mode}:${cursorToken.prefix}` : '';
  const autocomplete = useSearchAutocomplete(cursorQuery, focused);

  // Derive sidebar state from parsed query
  const activeCategories = parsed.category ?? [];
  const trustFilter = parsed.trust
    ? parsed.trust.charAt(0).toUpperCase() + parsed.trust.slice(1)
    : 'All';
  const securityFilter = parsed.security
    ? parsed.security.charAt(0).toUpperCase() + parsed.security.slice(1)
    : 'Any';
  const sort = parsed.sort || 'relevance';
  const platformFilter = parsed.platform || '';

  // Update URL with new filter, keeping all other filters intact
  const updateFilter = (key: string, value: string | undefined) => {
    const newParsed = { ...parsed, [key]: value };
    const newQuery = buildQueryString(newParsed);
    setSearchParams(newQuery ? { q: newQuery } : {});
  };

  // Toggle a value in a multi-value filter
  const toggleMultiFilter = (key: 'author' | 'category' | 'tag', value: string) => {
    const current = (parsed[key] as string[] | undefined) ?? [];
    const newValues = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    const newParsed = { ...parsed, [key]: newValues.length > 0 ? newValues : undefined };
    const newQuery = buildQueryString(newParsed);
    setSearchParams(newQuery ? { q: newQuery } : {});
  };

  // Remove a single value from a multi-value filter
  const removeMultiValue = (key: 'author' | 'category' | 'tag', value: string) => {
    const current = (parsed[key] as string[] | undefined) ?? [];
    const newValues = current.filter((v) => v !== value);
    const newParsed = { ...parsed, [key]: newValues.length > 0 ? newValues : undefined };
    const newQuery = buildQueryString(newParsed);
    setSearchParams(newQuery ? { q: newQuery } : {});
  };

  // Build API params from parsed query
  const params: Record<string, string | number> = { per_page: 50 };
  if (parsed.q.trim()) params.q = parsed.q.trim();
  if (parsed.author?.length) params.author = parsed.author.join(',');
  if (parsed.category?.length) params.category = parsed.category.join(',');
  if (parsed.tag?.length) params.tag = parsed.tag.join(',');
  if (parsed.signed) params.signed = parsed.signed;
  if (parsed.platform) params.platform = parsed.platform;
  if (parsed.trust) params.trust = parsed.trust;
  if (parsed.security && parsed.security !== 'any') params.security = parsed.security;
  if (sort !== 'relevance') params.sort = sort;

  const { data: searchData } = useQuery(searchSkillsQuery(params));

  const filtered: DisplaySkill[] = searchData?.results.map(apiResultToDisplay) ?? [];
  const displayTotal = searchData?.total ?? filtered.length;

  // Collect active filters for chip display
  const activeFilters: Array<{ key: string; label: string; value?: string; multi?: boolean }> = [];
  if (parsed.author) {
    for (const a of parsed.author) {
      activeFilters.push({ key: 'author', label: `author:${a}`, value: a, multi: true });
    }
  }
  if (parsed.category) {
    for (const c of parsed.category) {
      activeFilters.push({
        key: 'category',
        label: SLUG_TO_CATEGORY[c] || c,
        value: c,
        multi: true,
      });
    }
  }
  if (parsed.tag) {
    for (const t of parsed.tag) {
      activeFilters.push({ key: 'tag', label: `tag:${t}`, value: t, multi: true });
    }
  }
  if (parsed.signed) activeFilters.push({ key: 'signed', label: `signed:${parsed.signed}` });
  if (parsed.platform)
    activeFilters.push({ key: 'platform', label: `platform:${parsed.platform}` });
  if (parsed.trust) activeFilters.push({ key: 'trust', label: trustFilter });
  if (parsed.security) activeFilters.push({ key: 'security', label: securityFilter });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(inputValue.trim() ? { q: inputValue.trim() } : {});
  };

  const handleAutocompleteSelect = () => {
    // The autocomplete item's navigateTo contains the URL, but for the search page
    // we want to insert the selected value into the input at the cursor position
  };

  const handleItemSelect = (navigateTo: string) => {
    if (!cursorToken.mode) return;

    // Extract the value from the navigateTo URL
    // author: → /search?q=author:username → extract username
    // category: → /search?category=slug → extract slug
    // tag: → /search?q=tag:tagname → extract tagname
    const url = new URL(navigateTo, 'http://x');
    let value = '';
    if (cursorToken.mode === 'category') {
      value = url.searchParams.get('category') ?? '';
    } else {
      const q = url.searchParams.get('q') ?? '';
      const match = q.match(/^(?:author|tag):(.+)$/i);
      value = match?.[1] ?? '';
    }

    if (value) {
      const { newInput, newCursorPos } = replaceTokenAtCursor(
        inputValue,
        cursorToken,
        cursorToken.mode,
        value,
      );
      setInputValue(newInput);
      // Submit immediately
      setSearchParams(newInput.trim() ? { q: newInput.trim() } : {});
      // Restore cursor
      setTimeout(() => {
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current?.focus();
      }, 0);
    }
  };

  const hasDropdown =
    autocomplete.showDropdown && (autocomplete.items.length > 0 || autocomplete.emptyMessage);

  return (
    <div
      className="spm-search-layout"
      style={{ display: 'flex', maxWidth: 1060, margin: '0 auto', padding: '24px 32px', gap: 28 }}
    >
      {/* Sidebar filters */}
      <aside className="spm-search-filters" style={{ width: 200, flexShrink: 0 }}>
        <div style={{ position: 'sticky', top: 70 }}>
          {/* Category filter */}
          <div style={{ marginBottom: 28 }}>
            <Text
              variant="caption"
              font="sans"
              color="dim"
              weight={600}
              as="h3"
              style={{
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 0,
              }}
            >
              Category
            </Text>
            {CATEGORY_NAMES.map((cat) => {
              const slug = CATEGORY_SLUGS[cat] ?? '';
              const isActive =
                cat === 'All' ? activeCategories.length === 0 : activeCategories.includes(slug);
              return (
                <div
                  key={cat}
                  onClick={() => {
                    if (cat === 'All') {
                      const newParsed = { ...parsed, category: undefined };
                      const newQuery = buildQueryString(newParsed);
                      setSearchParams(newQuery ? { q: newQuery } : {});
                    } else {
                      toggleMultiFilter('category', slug);
                    }
                  }}
                  style={sidebarItemStyle(isActive)}
                >
                  {cat}
                </div>
              );
            })}
          </div>

          {/* Trust filter */}
          <div style={{ marginBottom: 28 }}>
            <Text
              variant="caption"
              font="sans"
              color="dim"
              weight={600}
              as="h3"
              style={{
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 0,
              }}
            >
              Trust tier
            </Text>
            {TRUST_TIERS.map((tier) => (
              <div
                key={tier}
                onClick={() =>
                  updateFilter('trust', tier === 'All' ? undefined : tier.toLowerCase())
                }
                style={sidebarItemStyle(trustFilter === tier)}
              >
                {tier}
              </div>
            ))}
          </div>

          {/* Security filter */}
          <div style={{ marginBottom: 28 }}>
            <Text
              variant="caption"
              font="sans"
              color="dim"
              weight={600}
              as="h3"
              style={{
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 0,
              }}
            >
              Security
            </Text>
            {['Any', 'Full', 'Partial'].map((opt) => (
              <div
                key={opt}
                onClick={() =>
                  updateFilter('security', opt === 'Any' ? undefined : opt.toLowerCase())
                }
                style={sidebarItemStyle(securityFilter === opt)}
              >
                {opt}
              </div>
            ))}
          </div>

          {/* Platform filter */}
          <div>
            <Text
              variant="caption"
              font="sans"
              color="dim"
              weight={600}
              as="h3"
              style={{
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 0,
              }}
            >
              Platform
            </Text>
            {PLATFORM_OPTIONS.map((p) => (
              <div
                key={p.label}
                onClick={() => updateFilter('platform', p.value || undefined)}
                style={sidebarItemStyle(platformFilter === p.value)}
              >
                {p.label}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Results */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {/* Search input with autocomplete */}
        <form onSubmit={handleSubmit} style={{ marginBottom: 16, position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setCursorPos(e.target.selectionStart ?? 0);
            }}
            onKeyUp={(e) => setCursorPos((e.target as HTMLInputElement).selectionStart ?? 0)}
            onClick={(e) => setCursorPos((e.target as HTMLInputElement).selectionStart ?? 0)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Search skills... try author:name category:frontend tag:imported"
            style={{
              width: '100%',
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              padding: '10px 14px',
              background: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              border: `1px solid ${hasDropdown ? 'var(--color-accent)' : 'var(--color-border-default)'}`,
              borderRadius: hasDropdown ? '8px 8px 0 0' : 8,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {autocomplete.showDropdown && (
            <AutocompleteDropdown
              items={autocomplete.items}
              emptyMessage={autocomplete.emptyMessage}
              variant="compact"
              onSelect={handleAutocompleteSelect}
              onItemSelect={handleItemSelect}
            />
          )}
        </form>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div>
            <Text variant="body" font="sans" color="secondary" as="span">
              {displayTotal} result{displayTotal !== 1 ? 's' : ''}
            </Text>
            {parsed.q && (
              <Text variant="body" font="sans" color="dim" as="span">
                {' '}
                for &quot;{parsed.q}&quot;
              </Text>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text variant="caption" font="sans" color="muted" as="span">
              Sort:
            </Text>
            <select
              value={sort}
              onChange={(e) =>
                updateFilter('sort', e.target.value === 'relevance' ? undefined : e.target.value)
              }
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 6,
                padding: '4px 8px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {activeFilters.map((f, i) => (
              <span
                key={`${f.key}-${f.value ?? i}`}
                onClick={() => {
                  if (f.multi && f.value) {
                    removeMultiValue(f.key as 'author' | 'category' | 'tag', f.value);
                  } else {
                    updateFilter(f.key, undefined);
                  }
                }}
                style={chipStyle}
              >
                {f.label}{' '}
                <Text variant="tiny" as="span">
                  &#x2715;
                </Text>
              </span>
            ))}
          </div>
        )}

        {/* Skill list */}
        <div
          style={{
            border: '1px solid var(--color-border-default)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {filtered.length > 0 ? (
            filtered.map((skill) => <SearchResultRow key={skill.name} skill={skill} />)
          ) : (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Text variant="h4" font="sans" color="dim" as="div" style={{ marginBottom: 8 }}>
                No skills match these filters
              </Text>
              <Text variant="body-sm" font="sans" color="muted" as="div">
                Try broadening your search or{' '}
                <Link to="#" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                  publish your own
                </Link>
              </Text>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
