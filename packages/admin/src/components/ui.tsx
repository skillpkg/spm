import { useState, type ReactNode } from 'react';
import { TRUST_CONFIG, type TrustTier, type Priority } from '../data/mock';

// ---- Color mapping ----
// Tailwind v4 cannot detect dynamic class names like `bg-${color}/10`.
// We map semantic color names to their CSS variable values for inline styles.

const COLOR_VALUES: Record<string, string> = {
  accent: 'var(--color-accent)',
  'accent-dim': 'var(--color-accent-dim)',
  cyan: 'var(--color-cyan)',
  yellow: 'var(--color-yellow)',
  blue: 'var(--color-blue)',
  red: 'var(--color-red)',
  purple: 'var(--color-purple)',
  orange: 'var(--color-orange)',
  'text-primary': 'var(--color-text-primary)',
  'text-secondary': 'var(--color-text-secondary)',
  'text-dim': 'var(--color-text-dim)',
  'text-muted': 'var(--color-text-muted)',
  'text-faint': 'var(--color-text-faint)',
};

const resolveColor = (color: string): string => COLOR_VALUES[color] ?? color;

const withAlpha = (color: string, alpha: number): string => {
  const resolved = resolveColor(color);
  if (resolved.startsWith('var(')) {
    // For CSS variables, use color-mix
    return `color-mix(in srgb, ${resolved} ${Math.round(alpha * 100)}%, transparent)`;
  }
  return resolved;
};

// ---- Badge ----

export const Badge = ({ label, color }: { label: string; color: string }) => (
  <span
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 4,
      whiteSpace: 'nowrap',
      backgroundColor: withAlpha(color, 0.1),
      color: resolveColor(color),
    }}
  >
    {label}
  </span>
);

// ---- StatusBadge ----

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  published: { label: 'Published', color: 'accent' },
  held: { label: 'Held', color: 'yellow' },
  blocked: { label: 'Blocked', color: 'red' },
  yanked: { label: 'Yanked', color: 'red' },
  deprecated: { label: 'Deprecated', color: 'text-dim' },
  open: { label: 'Open', color: 'yellow' },
  investigating: { label: 'Investigating', color: 'blue' },
  resolved: { label: 'Resolved', color: 'accent' },
  wontfix: { label: "Won't fix", color: 'text-dim' },
  active: { label: 'Active', color: 'accent' },
  flagged: { label: 'Flagged', color: 'yellow' },
  suspended: { label: 'Suspended', color: 'red' },
};

export const StatusBadge = ({ status }: { status: string }) => {
  const config = STATUS_MAP[status] ?? { label: status, color: 'text-dim' };
  return <Badge label={config.label} color={config.color} />;
};

// ---- TrustBadge ----

export const TrustBadge = ({ tier }: { tier: TrustTier }) => {
  const config = TRUST_CONFIG[tier];
  return <Badge label={`${config.checks} ${config.label}`} color={config.color} />;
};

// ---- PriorityDot ----

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'red',
  medium: 'yellow',
  low: 'text-dim',
};

export const PriorityDot = ({ priority }: { priority: Priority }) => (
  <div
    className="w-2 h-2 rounded-full shrink-0"
    style={{ backgroundColor: resolveColor(PRIORITY_COLORS[priority] ?? 'text-dim') }}
  />
);

// ---- SectionCard ----

export const SectionCard = ({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    className={className}
    style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 10,
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
);

// ---- StatBox ----

export const StatBox = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) => (
  <div
    style={{
      flex: 1,
      minWidth: 120,
      padding: '14px 16px',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 8,
    }}
  >
    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
      {label}
    </div>
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 22,
        fontWeight: 700,
        color: color ? resolveColor(color) : 'var(--color-text-primary)',
      }}
    >
      {value}
    </div>
  </div>
);

// ---- ActionButton ----

export const ActionButton = ({
  label,
  color,
  onClick,
  small,
}: {
  label: string;
  color: string;
  onClick?: () => void;
  small?: boolean;
}) => {
  const [hovered, setHovered] = useState(false);
  const resolved = resolveColor(color);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: small ? 11 : 12,
        padding: small ? '2px 10px' : '4px 14px',
        borderRadius: 5,
        border: `1px solid ${withAlpha(color, 0.25)}`,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.1s',
        color: resolved,
        backgroundColor: hovered ? withAlpha(color, 0.15) : 'transparent',
      }}
    >
      {label}
    </button>
  );
};

// ---- Tabs ----

export interface TabDef {
  id: string;
  label: string;
  count?: number;
  countColor?: string;
}

export const Tabs = ({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}) => (
  <div
    style={{
      display: 'flex',
      gap: 0,
      borderBottom: '1px solid var(--color-border-default)',
      marginBottom: 20,
      overflowX: 'auto',
    }}
  >
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 500,
          padding: '10px 18px',
          border: 'none',
          borderBottom:
            active === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
          background: 'transparent',
          color: active === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-dim)',
          cursor: 'pointer',
          marginBottom: -1,
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {tab.label}
        {tab.count != null && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 10,
              backgroundColor: withAlpha(tab.countColor ?? 'accent', 0.1),
              color: resolveColor(tab.countColor ?? 'accent'),
            }}
          >
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

// ---- SearchInput ----

export const SearchInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxWidth?: string;
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 8,
      padding: '0 12px',
      flex: 1,
      maxWidth: 320,
    }}
  >
    <span style={{ color: 'var(--color-text-muted)', fontSize: 13, marginRight: 8 }}>&#x2315;</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        flex: 1,
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        padding: '8px 0',
        background: 'transparent',
        border: 'none',
        color: 'var(--color-text-primary)',
        outline: 'none',
      }}
    />
  </div>
);

// ---- FilterDropdown ----

interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

export const FilterDropdown = ({
  label,
  value,
  options,
  onChange,
  color,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  color?: string;
}) => {
  const [open, setOpen] = useState(false);
  const hasValue = value !== 'all';
  const activeColor = color ?? 'accent';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          padding: '6px 12px',
          borderRadius: 6,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${hasValue ? withAlpha(activeColor, 0.25) : 'var(--color-border-default)'}`,
          backgroundColor: hasValue ? withAlpha(activeColor, 0.05) : 'var(--color-bg-card)',
          color: hasValue ? resolveColor(activeColor) : 'var(--color-text-dim)',
        }}
      >
        {label} <span style={{ fontSize: 10, opacity: 0.6 }}>&#x25BE;</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              zIndex: 51,
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              minWidth: 140,
              overflow: 'hidden',
            }}
          >
            {options.map((opt) => {
              const isActive = value === opt.value;
              const optColor = opt.color ?? 'accent';
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    padding: '8px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: isActive ? resolveColor(optColor) : 'var(--color-text-secondary)',
                    backgroundColor: isActive ? withAlpha(optColor, 0.05) : 'transparent',
                  }}
                >
                  {opt.label}
                  {isActive && <span style={{ fontSize: 11 }}>&#x2713;</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// ---- FilterTag ----

export const FilterTag = ({
  label,
  color,
  onRemove,
}: {
  label: string;
  color: string;
  onRemove: () => void;
}) => (
  <span
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      padding: '2px 10px 2px 8px',
      borderRadius: 20,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      backgroundColor: withAlpha(color, 0.1),
      color: resolveColor(color),
    }}
  >
    {label}
    <span
      onClick={onRemove}
      style={{ cursor: 'pointer', fontSize: 14, lineHeight: 1, opacity: 0.6, fontWeight: 600 }}
    >
      &#xD7;
    </span>
  </span>
);
