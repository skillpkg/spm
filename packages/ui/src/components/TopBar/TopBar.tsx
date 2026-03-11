import { useState, type ReactNode } from 'react';

export interface TopBarProps {
  /** Left slot — breadcrumb, page title, etc. */
  left?: ReactNode;
  /** Center slot — typically a search input */
  center?: ReactNode;
  /** Right slot — user menu, actions, etc. */
  right?: ReactNode;
  /** Mobile menu button handler */
  onMenuClick?: () => void;
}

const MenuIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <path d="M3 5h12M3 9h12M3 13h12" />
  </svg>
);

export const TopBar = ({ left, center, right, onMenuClick }: TopBarProps) => {
  const [menuHover, setMenuHover] = useState(false);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 24px',
        borderBottom: '1px solid var(--color-border-default)',
        background: 'rgba(8,10,15,0.92)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        minHeight: 48,
      }}
    >
      {/* Mobile menu button */}
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          onMouseEnter={() => setMenuHover(true)}
          onMouseLeave={() => setMenuHover(false)}
          style={{
            display: 'none', // hidden on desktop — apps can show via media query class
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 6,
            border: 'none',
            background: menuHover ? 'var(--color-bg-hover)' : 'transparent',
            color: 'var(--color-text-dim)',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
          className="topbar-menu-btn"
        >
          <MenuIcon />
        </button>
      )}

      {/* Left */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flex: left && !center ? 1 : undefined,
        }}
      >
        {left}
      </div>

      {/* Center */}
      {center && <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{center}</div>}

      {/* Right */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: center ? 0 : 'auto' }}
      >
        {right}
      </div>
    </header>
  );
};
