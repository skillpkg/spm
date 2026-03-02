interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export const StatCard = ({ label, value, sub, color }: StatCardProps) => {
  return (
    <div className="flex-1 min-w-[150px] px-5 py-[18px] bg-bg-card border border-border-default rounded-[10px]">
      <div className="font-sans text-xs text-text-muted mb-1.5">{label}</div>
      <div
        className="font-mono text-[26px] font-bold"
        style={{ color: color ?? 'var(--color-text-primary)' }}
      >
        {value}
      </div>
      {sub && <div className="font-mono text-xs text-accent mt-1">{sub}</div>}
    </div>
  );
};
