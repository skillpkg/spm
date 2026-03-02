import { type TrustTier, TRUST_CONFIG } from '../data/mock';

export const TrustBadge = ({
  tier,
  showLabel = true,
  size = 'sm',
}: {
  tier: TrustTier;
  showLabel?: boolean;
  size?: 'sm' | 'lg';
}) => {
  const t = TRUST_CONFIG[tier];
  const isLg = size === 'lg';

  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
        borderRadius: 5,
        border: `1px solid ${t.color}18`,
        fontSize: isLg ? 13 : 11,
        padding: isLg ? '5px 12px' : '3px 8px',
        background: t.bg,
        color: t.color,
      }}
    >
      {t.checks}
      {showLabel ? ` ${t.label}` : ''}
    </span>
  );
};
