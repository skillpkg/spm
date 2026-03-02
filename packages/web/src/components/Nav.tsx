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
    <nav className="flex items-center gap-4 px-8 py-2.5 border-b border-border-default sticky top-0 z-50 bg-[rgba(8,10,15,0.92)] backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-2 no-underline shrink-0">
        <div className="w-[26px] h-[26px] rounded-[5px] bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center font-mono text-xs font-bold text-bg">
          S
        </div>
        <span className="font-mono text-base font-bold text-accent">spm</span>
      </Link>

      <form onSubmit={handleSubmit} className="flex-1 max-w-[440px]">
        <div className="flex items-center bg-bg-input border border-border-default rounded-lg px-3">
          <span className="text-text-muted text-sm mr-2">&#x2315;</span>
          <input
            ref={inputRef}
            value={query ?? ''}
            onChange={(e) => onQueryChange?.(e.target.value)}
            placeholder="Search skills..."
            className="flex-1 font-sans text-sm py-2 bg-transparent border-none text-text-primary outline-none"
          />
          {query && (
            <span
              onClick={() => onQueryChange?.('')}
              className="text-text-muted cursor-pointer text-xs p-1"
            >
              &#x2715;
            </span>
          )}
        </div>
      </form>

      <div className="flex gap-4 ml-auto items-center">
        {(['Docs', 'CLI', 'Publish'] as const).map((item) => (
          <Link
            key={item}
            to="#"
            className="font-sans text-sm text-text-dim no-underline hover:text-text-secondary transition-colors"
          >
            {item}
          </Link>
        ))}
        <code className="font-mono text-[11px] text-text-faint hidden md:block">npm i -g spm</code>
        <Link
          to="#"
          className="font-sans text-sm text-bg px-3.5 py-1 rounded-md bg-accent no-underline font-semibold hover:opacity-90 transition-opacity"
        >
          Sign in
        </Link>
      </div>
    </nav>
  );
};
