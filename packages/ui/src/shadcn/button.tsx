import * as React from 'react';
import { useState } from 'react';
import { Slot } from '@radix-ui/react-slot';

type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'cyan'
  | 'green';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, { color: string; border: string; hoverBg: string }> = {
  default: { color: '#10b981', border: 'rgba(16,185,129,0.25)', hoverBg: 'rgba(16,185,129,0.15)' },
  destructive: {
    color: '#ef4444',
    border: 'rgba(239,68,68,0.25)',
    hoverBg: 'rgba(239,68,68,0.15)',
  },
  outline: { color: '#3b82f6', border: 'rgba(59,130,246,0.25)', hoverBg: 'rgba(59,130,246,0.15)' },
  secondary: {
    color: 'var(--color-text-dim)',
    border: 'rgba(100,116,139,0.25)',
    hoverBg: 'rgba(100,116,139,0.15)',
  },
  ghost: {
    color: 'var(--color-text-dim)',
    border: 'transparent',
    hoverBg: 'var(--color-bg-hover)',
  },
  link: { color: '#10b981', border: 'transparent', hoverBg: 'transparent' },
  cyan: { color: '#67e8f9', border: 'rgba(103,232,249,0.25)', hoverBg: 'rgba(103,232,249,0.15)' },
  green: { color: '#10b981', border: 'rgba(16,185,129,0.25)', hoverBg: 'rgba(16,185,129,0.15)' },
};

const SIZE_STYLES: Record<ButtonSize, { height: number; padding: string; fontSize: number }> = {
  default: { height: 32, padding: '4px 14px', fontSize: 12 },
  sm: { height: 24, padding: '2px 10px', fontSize: 11 },
  lg: { height: 40, padding: '8px 20px', fontSize: 14 },
  icon: { height: 32, padding: '0', fontSize: 12 },
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      style,
      variant = 'default',
      size = 'default',
      asChild = false,
      onMouseEnter,
      onMouseLeave,
      ...props
    },
    ref,
  ) => {
    const [hovered, setHovered] = useState(false);
    const v = VARIANT_STYLES[variant];
    const s = SIZE_STYLES[size];
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
          setHovered(true);
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
          setHovered(false);
          onMouseLeave?.(e);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          whiteSpace: 'nowrap',
          borderRadius: 5,
          fontFamily: 'var(--font-mono)',
          fontSize: s.fontSize,
          height: s.height,
          padding: s.padding,
          color: v.color,
          border: `1px solid ${v.border}`,
          backgroundColor: hovered ? v.hoverBg : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.1s',
          textDecoration: variant === 'link' && hovered ? 'underline' : 'none',
          width: size === 'icon' ? 32 : undefined,
          ...style,
        }}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button };
export type { ButtonVariant, ButtonSize };
