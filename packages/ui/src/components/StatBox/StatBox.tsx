import { resolveColor } from '../../utils/colors';

export interface StatBoxProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export const StatBox = ({ label, value, sub, color }: StatBoxProps) => (
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
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        color: 'var(--color-text-muted)',
        marginBottom: 4,
      }}
    >
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
    {sub && (
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--color-accent)',
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);
