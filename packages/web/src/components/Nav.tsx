import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const Nav = ({
  query,
  onQueryChange,
}: {
  query?: string;
  onQueryChange?: (q: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
            background:
              'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dim) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--color-bg)',
          }}
        >
          S
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--color-accent)',
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
        <Link
          to="#"
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
      </div>
    </nav>
  );
};
