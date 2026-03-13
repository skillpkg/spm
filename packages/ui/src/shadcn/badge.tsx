import * as React from 'react';

type BadgeVariant =
  | 'default'
  | 'accent'
  | 'cyan'
  | 'blue'
  | 'red'
  | 'purple'
  | 'yellow'
  | 'secondary'
  | 'destructive'
  | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANT_STYLES: Record<BadgeVariant, { color: string; bg: string; border?: string }> = {
  default: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  accent: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  cyan: { color: '#67e8f9', bg: 'rgba(103,232,249,0.1)' },
  blue: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  red: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  purple: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  yellow: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  secondary: { color: 'var(--color-text-dim)', bg: 'var(--color-bg-hover)' },
  destructive: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  outline: {
    color: 'var(--color-text-primary)',
    bg: 'transparent',
    border: 'var(--color-border-default)',
  },
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ style, variant = 'default', ...props }, ref) => {
    const v = VARIANT_STYLES[variant];
    return (
      <span
        ref={ref}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 4,
          padding: '2px 8px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          whiteSpace: 'nowrap',
          color: v.color,
          backgroundColor: v.bg,
          border: v.border ? `1px solid ${v.border}` : undefined,
          transition: 'color 0.1s',
          ...style,
        }}
        {...props}
      />
    );
  },
);
Badge.displayName = 'Badge';

export { Badge };
export type { BadgeVariant };
