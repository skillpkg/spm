export type SecurityLevel = 'full' | 'partial' | 'flagged' | 'blocked' | 'unscanned';

export interface SecurityBadgeProps {
  level: SecurityLevel;
  showLabel?: boolean;
  size?: 'sm' | 'lg';
}

const SECURITY_CONFIG: Record<SecurityLevel, { color: string; bg: string; label: string }> = {
  full: { color: '#10b981', bg: '#10b98112', label: 'Full scan' },
  partial: { color: '#eab308', bg: '#eab30812', label: 'Partial' },
  flagged: { color: '#f97316', bg: '#f9731612', label: 'Flagged' },
  blocked: { color: '#ef4444', bg: '#ef444412', label: 'Blocked' },
  unscanned: { color: '#64748b', bg: '#64748b12', label: 'Unscanned' },
};

const SHIELD = '\u26E8';

export const SecurityBadge = ({ level, showLabel = true, size = 'sm' }: SecurityBadgeProps) => {
  const config = SECURITY_CONFIG[level];
  const isLg = size === 'lg';

  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
        borderRadius: 5,
        border: `1px solid ${config.color}18`,
        fontSize: isLg ? 13 : 11,
        padding: isLg ? '5px 12px' : '3px 8px',
        background: config.bg,
        color: config.color,
      }}
    >
      {SHIELD}
      {showLabel ? ` ${config.label}` : ''}
    </span>
  );
};
