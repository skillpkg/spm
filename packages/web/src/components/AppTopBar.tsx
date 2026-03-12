import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TopBar, Breadcrumb, Text, type BreadcrumbItem } from '@spm/ui';

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/search': 'Search',
  '/docs': 'Getting Started',
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

  const label = ROUTE_LABELS[pathname] ?? pathname.slice(1);
  crumbs.push({ label });
  return crumbs;
};

const TopBarSearch = () => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    if (value) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
      setQuery('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 440 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-bg-input)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 8,
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
          placeholder="Search skills..."
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
            {...{ onClick: () => setQuery('') }}
          >
            &#x2715;
          </Text>
        )}
      </div>
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
