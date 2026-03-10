export type SecurityLevel = 'full' | 'partial' | 'flagged' | 'blocked' | 'unscanned';

export interface SecurityBadgeProps {
  level: SecurityLevel;
  showLabel?: boolean;
  size?: 'sm' | 'lg';
}

const SECURITY_CONFIG: Record<
  SecurityLevel,
  { color: string; bg: string; label: string; icon: 'check' | 'warn' | 'x' | 'dash' }
> = {
  full: { color: '#10b981', bg: '#10b98118', label: 'Verified', icon: 'check' },
  partial: { color: '#eab308', bg: '#eab30818', label: 'Partial', icon: 'warn' },
  flagged: { color: '#f97316', bg: '#f9731618', label: 'Flagged', icon: 'warn' },
  blocked: { color: '#ef4444', bg: '#ef444418', label: 'Blocked', icon: 'x' },
  unscanned: { color: '#64748b', bg: '#64748b18', label: 'Unscanned', icon: 'dash' },
};

const ShieldIcon = ({
  color,
  icon,
  size,
}: {
  color: string;
  icon: 'check' | 'warn' | 'x' | 'dash';
  size: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ display: 'block', flexShrink: 0 }}
  >
    {/* Shield shape */}
    <path
      d="M12 2L4 5.5V11.5C4 16.45 7.42 21.07 12 22C16.58 21.07 20 16.45 20 11.5V5.5L12 2Z"
      fill={color}
      fillOpacity={0.15}
      stroke={color}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    {/* Inner icon */}
    {icon === 'check' && (
      <path
        d="M8.5 12.5L11 15L15.5 9.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
    {icon === 'warn' && (
      <>
        <line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill={color} />
      </>
    )}
    {icon === 'x' && (
      <path
        d="M9.5 9.5L14.5 14.5M14.5 9.5L9.5 14.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    )}
    {icon === 'dash' && (
      <line
        x1="8.5"
        y1="12"
        x2="15.5"
        y2="12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    )}
  </svg>
);

export const SecurityBadge = ({ level, showLabel = true, size = 'sm' }: SecurityBadgeProps) => {
  const config = SECURITY_CONFIG[level];
  const isLg = size === 'lg';
  const iconSize = isLg ? 18 : 14;

  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
        borderRadius: 5,
        border: `1px solid ${config.color}30`,
        fontSize: isLg ? 13 : 11,
        padding: isLg ? '4px 10px' : '2px 6px',
        background: config.bg,
        color: config.color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: isLg ? 6 : 4,
      }}
    >
      <ShieldIcon color={config.color} icon={config.icon} size={iconSize} />
      {showLabel ? config.label : ''}
    </span>
  );
};
