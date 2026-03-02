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
    className="font-mono text-[11px] px-2 py-0.5 rounded whitespace-nowrap"
    style={{
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
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-bg-card border border-border-default rounded-[10px] overflow-hidden ${className}`}
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
  <div className="flex-1 min-w-[120px] px-4 py-3.5 bg-bg-card border border-border-default rounded-lg">
    <div className="font-sans text-[11px] text-text-muted mb-1">{label}</div>
    <div
      className="font-mono text-[22px] font-bold"
      style={{ color: color ? resolveColor(color) : 'var(--color-text-primary)' }}
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
      className={`font-mono rounded-[5px] border cursor-pointer transition-all duration-100 whitespace-nowrap ${
        small ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3.5 py-1'
      }`}
      style={{
        borderColor: withAlpha(color, 0.25),
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
  <div className="flex gap-0 border-b border-border-default mb-5 overflow-x-auto">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className="font-sans text-[13px] font-medium px-4 py-2.5 border-none cursor-pointer -mb-px whitespace-nowrap flex items-center gap-1.5 bg-transparent"
        style={{
          color: active === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-dim)',
          borderBottom:
            active === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
        }}
      >
        {tab.label}
        {tab.count != null && (
          <span
            className="font-mono text-[10px] px-1.5 py-px rounded-full"
            style={{
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
  maxWidth = 'max-w-xs',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxWidth?: string;
}) => (
  <div
    className={`flex items-center bg-bg-card border border-border-default rounded-lg px-3 flex-1 ${maxWidth}`}
  >
    <span className="text-text-muted text-[13px] mr-2">&#x2315;</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 font-sans text-[13px] py-2 bg-transparent border-none text-text-primary outline-none"
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
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="font-sans text-xs px-3 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 border"
        style={
          hasValue
            ? {
                borderColor: withAlpha(activeColor, 0.25),
                backgroundColor: withAlpha(activeColor, 0.05),
                color: resolveColor(activeColor),
              }
            : {
                borderColor: 'var(--color-border-default)',
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-dim)',
              }
        }
      >
        {label} <span className="text-[10px] opacity-60">&#x25BE;</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-50" />
          <div className="absolute top-full left-0 mt-1 z-[51] bg-bg-card border border-border-default rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)] min-w-[140px] overflow-hidden">
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
                  className="font-sans text-xs px-3.5 py-2 cursor-pointer flex justify-between items-center hover:bg-bg-hover"
                  style={
                    isActive
                      ? {
                          color: resolveColor(optColor),
                          backgroundColor: withAlpha(optColor, 0.05),
                        }
                      : { color: 'var(--color-text-secondary)' }
                  }
                >
                  {opt.label}
                  {isActive && <span className="text-[11px]">&#x2713;</span>}
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
    className="font-mono text-[11px] py-0.5 pl-2 pr-2.5 rounded-full inline-flex items-center gap-1.5"
    style={{
      backgroundColor: withAlpha(color, 0.1),
      color: resolveColor(color),
    }}
  >
    {label}
    <span
      onClick={onRemove}
      className="cursor-pointer text-sm leading-none opacity-60 font-semibold"
    >
      &#xD7;
    </span>
  </span>
);
