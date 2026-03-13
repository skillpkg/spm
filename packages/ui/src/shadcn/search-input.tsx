import * as React from 'react';

export interface SearchInputProps extends Omit<
  React.ComponentPropsWithoutRef<'input'>,
  'onChange'
> {
  value: string;
  onChange: (value: string) => void;
  maxWidth?: number;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, maxWidth = 320, style, ...props }, ref) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 8,
        padding: '0 12px',
        flex: 1,
        maxWidth,
        ...style,
      }}
    >
      <span style={{ color: 'var(--color-text-muted)', fontSize: 13, marginRight: 8 }}>
        &#x2315;
      </span>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
        {...props}
      />
    </div>
  ),
);
SearchInput.displayName = 'SearchInput';

export { SearchInput };
