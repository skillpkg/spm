import { TRUST_CONFIG, type TrustTier } from '../../utils/trust-config';

export interface TrustBadgeProps {
  tier: TrustTier;
  showLabel?: boolean;
  size?: 'sm' | 'lg';
}

export const TrustBadge = ({ tier, showLabel = true, size = 'sm' }: TrustBadgeProps) => {
  const config = TRUST_CONFIG[tier];
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
      {config.checks}
      {showLabel ? ` ${config.label}` : ''}
    </span>
  );
};
