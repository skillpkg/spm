import { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TopBar, Text, TrustBadge, type TrustTier } from '@spm/ui';
import {
  LegacyBreadcrumb as Breadcrumb,
  type LegacyBreadcrumbItem as BreadcrumbItem,
} from '@spm/ui/shadcn';
import { docSlugToLabel } from '../data/docSections';
import { searchAuthors } from '../lib/api';

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/search': 'Search',
  '/docs': 'Docs',
  '/cli': 'CLI Reference',
  '/publish': 'Publishing',
  '/dashboard': 'Dashboard',
  '/signin': 'Sign In',
};

const deriveBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  if (pathname === '/') return [{ label: 'Home' }];

  const crumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

  // Skill detail: /skills/:name
  if (pathname.startsWith('/skills/')) {
    const name = decodeURIComponent(pathname.split('/')[2] ?? '');
    crumbs.push({ label: 'Search', href: '/search' });
    crumbs.push({ label: name });
    return crumbs;
  }

  // Author profile: /authors/:username
  if (pathname.startsWith('/authors/')) {
    const username = decodeURIComponent(pathname.split('/')[2] ?? '');
    crumbs.push({ label: `@${username}` });
    return crumbs;
  }

  // Doc detail: /docs/:slug
  if (pathname.startsWith('/docs/')) {
    const slug = decodeURIComponent(pathname.split('/')[2] ?? '');
    crumbs.push({ label: 'Docs', href: '/docs' });
    crumbs.push({ label: docSlugToLabel[slug] ?? slug });
    return crumbs;
  }

  const label = ROUTE_LABELS[pathname] ?? pathname.slice(1);
  crumbs.push({ label });
  return crumbs;
};

const TopBarSearch = () => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [debouncedPrefix, setDebouncedPrefix] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Detect author: prefix
  const authorMatch = query.match(/^author:(\S*)$/i);
  const authorPrefix = authorMatch?.[1] ?? '';
  const isAuthorMode = !!authorMatch;

  // Debounce the author prefix
  useEffect(() => {
    if (!isAuthorMode || !authorPrefix) {
      setDebouncedPrefix('');
      return;
    }
    const timer = setTimeout(() => setDebouncedPrefix(authorPrefix), 200);
    return () => clearTimeout(timer);
  }, [authorPrefix, isAuthorMode]);

  const { data: authorData } = useQuery({
    queryKey: ['authors', debouncedPrefix],
    queryFn: () => searchAuthors(debouncedPrefix, 6),
    enabled: isAuthorMode && debouncedPrefix.length >= 1,
  });

  const authorResults = authorData?.authors ?? [];
  const showAuthorDropdown = focused && isAuthorMode && authorPrefix.length >= 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    if (value) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
      setQuery('');
    }
  };

  const selectAuthor = (username: string) => {
    navigate(`/search?q=${encodeURIComponent(`author:${username}`)}`);
    setQuery('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-bg-input)',
          border: '1px solid var(--color-border-default)',
          borderRadius: showAuthorDropdown && authorResults.length > 0 ? '8px 8px 0 0' : 8,
          padding: '0 12px',
        }}
      >
        <Text variant="body" color="muted" as="span" style={{ marginRight: 8 }}>
          &#x2315;
        </Text>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search skills... (author:name, tag:keyword)"
          style={{
            flex: 1,
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            padding: '8px 0',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
        />
        {query && (
          <Text
            variant="caption"
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

      {/* Author autocomplete dropdown */}
      {showAuthorDropdown && authorResults.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-default)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {authorResults.map((author) => (
            <div
              key={author.username}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #1a1d2744',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                selectAuthor(author.username);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(16,185,129,0.04)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text
                  variant="body-sm"
                  font="mono"
                  weight={600}
                  as="span"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  @{author.username}
                </Text>
                <TrustBadge tier={author.trust_tier as TrustTier} />
              </div>
              <Text variant="label" font="mono" color="muted" as="span">
                {author.skill_count} skill{author.skill_count !== 1 ? 's' : ''}
              </Text>
            </div>
          ))}
        </div>
      )}
    </form>
  );
};

export const AppTopBar = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const { pathname } = useLocation();

  return (
    <TopBar
      left={<Breadcrumb items={deriveBreadcrumbs(pathname)} />}
      center={<TopBarSearch />}
      onMenuClick={onMenuClick}
    />
  );
};
