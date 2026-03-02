export interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxWidth?: number;
}

export const SearchInput = ({ value, onChange, placeholder, maxWidth = 320 }: SearchInputProps) => (
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
