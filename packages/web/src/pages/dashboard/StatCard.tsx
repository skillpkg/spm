interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export const StatCard = ({ label, value, sub, color }: StatCardProps) => {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 150,
        padding: '18px 20px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 26,
          fontWeight: 700,
          color: color ?? 'var(--color-text-primary)',
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
};
