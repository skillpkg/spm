import { useRef, useEffect, useState } from 'react';

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
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        <span
          style={{
            fontFamily: "'Alfa Slab One', serif",
            fontSize: 42,
            fontWeight: 400,
            backgroundImage: 'linear-gradient(135deg, #3dfce4 0%, #2564ff 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'inline-block',
          }}
        >
          spm
        </span>
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 24,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 4,
          position: 'relative',
          marginTop: 0,
        }}
      >
        Find skills for your agents
      </h1>
      {(totalSkills > 0 || totalCategories > 0) && (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            color: 'var(--color-text-muted)',
            marginBottom: 20,
            marginTop: 0,
          }}
        >
          {totalSkills} skill{totalSkills !== 1 ? 's' : ''} &middot; {totalCategories} categor
          {totalCategories !== 1 ? 'ies' : 'y'}
        </p>
      )}

      <div style={{ width: '100%', maxWidth: 600, position: 'relative' }}>
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--color-bg-card)',
              borderRadius: 10,
              padding: '0 16px',
              border: `1.5px solid ${focused ? '#10b981' : '#1e293b'}`,
              boxShadow: focused ? '0 0 0 3px rgba(16,185,129,0.07)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ color: 'var(--color-text-muted)', fontSize: 15, marginRight: 10 }}>
              &#x2315;
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder="Search skills..."
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
            {!query && (
              <kbd
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  padding: '2px 6px',
                  background: '#111318',
                  border: '1px solid #1e293b',
                  borderRadius: 4,
                  color: 'var(--color-text-muted)',
                }}
              >
                /
              </kbd>
            )}
            {query && (
              <span
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                style={{
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: 4,
                }}
              >
                &#x2715;
              </span>
            )}
          </div>
        </form>
      </div>
    </section>
  );
};
