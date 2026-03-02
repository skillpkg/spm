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
      className={`font-mono whitespace-nowrap rounded-[5px] border`}
      style={{
        fontSize: isLg ? 13 : 11,
        padding: isLg ? '5px 12px' : '3px 8px',
        background: t.bg,
        color: t.color,
        borderColor: `${t.color}18`,
      }}
    >
      {t.checks}
      {showLabel ? ` ${t.label}` : ''}
    </span>
  );
};
