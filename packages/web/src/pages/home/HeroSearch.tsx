import { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { type SearchResultItem } from '../../lib/api';
import { searchSkillsQuery } from '../search/queries';
import { TrustBadge, Text, type TrustTier } from '@spm/ui';
import { useSearchAutocomplete } from '../../hooks/useSearchAutocomplete';
import { AutocompleteDropdown } from '../../components/autocomplete/AutocompleteDropdown';

interface HeroSearchProps {
  totalSkills: number;
  totalCategories: number;
  query: string;
  setQuery: (q: string) => void;
  onSubmit: () => void;
}

export const HeroSearch = ({
  totalSkills,
  totalCategories,
  query,
  setQuery,
  onSubmit,
}: HeroSearchProps) => {
  const navigate = useNavigate();
  const [focused, setFocused] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search query (300ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(trimmed), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Generic prefix autocomplete (author:, category:, tag:)
  const autocomplete = useSearchAutocomplete(debouncedQuery, focused);

  // API-backed skill search (only when not in prefix mode)
  const { data: searchData, isFetching: isFetchingSkills } = useQuery({
    ...searchSkillsQuery(debouncedQuery ? { q: debouncedQuery, per_page: 6 } : { per_page: 0 }),
    enabled: debouncedQuery.length >= 2 && !autocomplete.mode,
  });

  const results: SearchResultItem[] = searchData?.results ?? [];
  const totalResults = searchData?.total ?? 0;
  const isFetching = isFetchingSkills || autocomplete.isFetching;
  const showSkillDropdown = focused && debouncedQuery.length >= 2 && !autocomplete.mode;

  // Has any dropdown open (for border radius)
  const hasDropdown =
    (autocomplete.showDropdown && (autocomplete.items.length > 0 || autocomplete.emptyMessage)) ||
    (showSkillDropdown &&
      (results.length > 0 || (!isFetchingSkills && debouncedQuery.length >= 2)));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && (document.activeElement as HTMLElement)?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <section
      className="spm-hero"
      style={{
        paddingTop: 40,
        paddingBottom: 32,
        paddingLeft: 32,
        paddingRight: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          width: 500,
          height: 250,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.035) 0%, transparent 70%)',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
          position: 'relative',
        }}
      >
        <img
          src="/logo-256.png"
          alt="SPM"
          style={{
            width: 64,
            height: 64,
          }}
        />
        <Text
          variant="display"
          as="span"
          style={{
            fontFamily: "'Alfa Slab One', serif",
            fontWeight: 400,
            backgroundImage: 'linear-gradient(135deg, #3dfce4 0%, #2564ff 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'inline-block',
          }}
        >
          spm
        </Text>
      </div>
      <Text
        variant="h1"
        font="sans"
        color="primary"
        weight={600}
        as="h1"
        style={{ marginBottom: 4, position: 'relative', marginTop: 0 }}
      >
        Find skills for your agents
      </Text>
      {(totalSkills > 0 || totalCategories > 0) && (
        <Text
          variant="body"
          font="sans"
          color="muted"
          as="p"
          style={{ marginBottom: 20, marginTop: 0 }}
        >
          {totalSkills} skill{totalSkills !== 1 ? 's' : ''} &middot; {totalCategories} categor
          {totalCategories !== 1 ? 'ies' : 'y'}
        </Text>
      )}

      <div style={{ width: '100%', maxWidth: 600, position: 'relative' }}>
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--color-bg-card)',
              borderRadius: hasDropdown ? '10px 10px 0 0' : 10,
              padding: '0 16px',
              border: `1.5px solid ${focused ? '#10b981' : '#1e293b'}`,
              borderBottom: hasDropdown
                ? '1px solid #1e293b'
                : `1.5px solid ${focused ? '#10b981' : '#1e293b'}`,
              boxShadow: focused ? '0 0 0 3px rgba(16,185,129,0.07)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <Text variant="h4" color="muted" as="span" style={{ marginRight: 10 }}>
              &#x2315;
            </Text>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              placeholder="Search skills... (author:name, category:slug, tag:keyword)"
              style={{
                flex: 1,
                fontFamily: 'var(--font-sans)',
                fontSize: 15,
                padding: '13px 0',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
            {isFetching && debouncedQuery && (
              <Text variant="caption" color="muted" as="span" style={{ marginRight: 8 }}>
                ...
              </Text>
            )}
            {!query && (
              <Text
                variant="label"
                font="mono"
                color="muted"
                as="kbd"
                style={{
                  padding: '2px 6px',
                  background: '#111318',
                  border: '1px solid #1e293b',
                  borderRadius: 4,
                }}
              >
                /
              </Text>
            )}
            {query && (
              <Text
                variant="body"
                color="muted"
                as="span"
                style={{ cursor: 'pointer', padding: 4 }}
                {...{
                  onClick: () => {
                    setQuery('');
                    inputRef.current?.focus();
                  },
                }}
              >
                &#x2715;
              </Text>
            )}
          </div>
        </form>

        {/* Prefix autocomplete dropdown (author:, category:, tag:) */}
        {autocomplete.showDropdown && (
          <AutocompleteDropdown
            ref={dropdownRef}
            items={autocomplete.items}
            emptyMessage={autocomplete.emptyMessage}
            variant="hero"
            onSelect={() => setQuery('')}
          />
        )}

        {/* Live skill search dropdown */}
        {!autocomplete.mode &&
          showSkillDropdown &&
          (results.length > 0 || (!isFetchingSkills && debouncedQuery.length >= 2)) && (
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--color-bg-card)',
                border: '1.5px solid #10b981',
                borderTop: 'none',
                borderRadius: '0 0 10px 10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                zIndex: 50,
                overflow: 'hidden',
              }}
            >
              {results.length > 0 ? (
                <>
                  {results.map((skill) => (
                    <Link
                      key={skill.name}
                      to={`/skills/${skill.name}`}
                      style={{ textDecoration: 'none', display: 'block' }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div
                        style={{
                          padding: '10px 16px',
                          borderBottom: '1px solid #1a1d2744',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            'rgba(16,185,129,0.04)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <Text
                            variant="body"
                            font="mono"
                            weight={600}
                            as="span"
                            style={{ color: 'var(--color-cyan)', whiteSpace: 'nowrap' }}
                          >
                            {skill.name}
                          </Text>
                          <TrustBadge tier={skill.author.trust_tier as TrustTier} />
                          <Text
                            variant="caption"
                            font="sans"
                            color="dim"
                            as="span"
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {skill.description}
                          </Text>
                        </div>
                        <Text
                          variant="label"
                          font="mono"
                          color="muted"
                          as="span"
                          style={{ whiteSpace: 'nowrap', marginLeft: 12 }}
                        >
                          {skill.downloads >= 1000
                            ? `${(skill.downloads / 1000).toFixed(1)}k`
                            : skill.downloads}{' '}
                          &#x2B07;
                        </Text>
                      </div>
                    </Link>
                  ))}
                  {totalResults > results.length && (
                    <Link
                      to={`/search?q=${encodeURIComponent(debouncedQuery)}`}
                      style={{ textDecoration: 'none', display: 'block' }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div
                        style={{
                          padding: '10px 16px',
                          textAlign: 'center',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 13,
                          color: 'var(--color-accent)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            'rgba(16,185,129,0.04)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                        }}
                      >
                        View all {totalResults} results →
                      </div>
                    </Link>
                  )}
                </>
              ) : (
                <Text
                  variant="body-sm"
                  font="sans"
                  color="muted"
                  as="div"
                  style={{ padding: '16px', textAlign: 'center' }}
                >
                  No skills found for &quot;{debouncedQuery}&quot;
                </Text>
              )}
            </div>
          )}
      </div>
    </section>
  );
};
