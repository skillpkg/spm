import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Nav = ({
  query,
  onQueryChange,
}: {
  query?: string;
  onQueryChange?: (q: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated, user, token, signOut, isLoading } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value.trim();
    if (value) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
    }
  };

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 32px',
        borderBottom: '1px solid var(--color-border-default)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(8,10,15,0.92)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 5,
            background: '#0deaff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Alfa Slab One', serif",
            fontSize: 14,
            fontWeight: 400,
            color: 'var(--color-bg)',
          }}
        >
          S
        </div>
        <span
          style={{
            fontFamily: "'Alfa Slab One', serif",
            fontSize: 18,
            fontWeight: 400,
            color: '#0deaff',
          }}
        >
          spm
        </span>
      </Link>

      <form onSubmit={handleSubmit} style={{ flex: 1, maxWidth: 440 }}>
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
          <span style={{ color: 'var(--color-text-muted)', fontSize: 14, marginRight: 8 }}>
            &#x2315;
          </span>
          <input
            ref={inputRef}
            value={query ?? ''}
            onChange={(e) => onQueryChange?.(e.target.value)}
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
            <span
              onClick={() => onQueryChange?.('')}
              style={{
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: 12,
                padding: 4,
              }}
            >
              &#x2715;
            </span>
          )}
        </div>
      </form>

      <div style={{ display: 'flex', gap: 16, marginLeft: 'auto', alignItems: 'center' }}>
        {(
          [
            { label: 'Docs', to: '/docs' },
            { label: 'CLI', to: '/cli' },
            { label: 'Publish', to: '/publish' },
          ] as const
        ).map((item) => (
          <Link
            key={item.label}
            to={item.to}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--color-text-dim)',
              textDecoration: 'none',
            }}
          >
            {item.label}
          </Link>
        ))}
        <code
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-faint)' }}
        >
          npm i -g spm
        </code>
        {!isLoading && isAuthenticated && user ? (
          <>
            <Link
              to="/dashboard"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                color: 'var(--color-text-dim)',
                textDecoration: 'none',
              }}
            >
              Dashboard
            </Link>
            {user.is_admin && (
              <a
                href={`https://admin.skillpkg.dev${token ? `#token=${token}` : ''}`}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  color: 'var(--color-yellow)',
                  textDecoration: 'none',
                }}
              >
                Admin
              </a>
            )}
            <Link
              to="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
              }}
            >
              <img
                src={`https://github.com/${user.username}.png?size=28`}
                alt={user.username}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px solid var(--color-border-default)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {user.username}
              </span>
            </Link>
            <button
              onClick={signOut}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            to="/signin"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--color-bg)',
              padding: '4px 14px',
              borderRadius: 6,
              background: 'var(--color-accent)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
};
