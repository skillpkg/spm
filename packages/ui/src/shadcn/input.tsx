import * as React from 'react';

const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
  ({ style, ...props }, ref) => (
    <input
      ref={ref}
      style={{
        display: 'flex',
        height: 36,
        width: '100%',
        borderRadius: 8,
        border: '1px solid var(--color-border-default)',
        background: 'var(--color-bg-card)',
        padding: '8px 12px',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        color: 'var(--color-text-primary)',
        outline: 'none',
        transition: 'border-color 0.15s',
        ...style,
      }}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
