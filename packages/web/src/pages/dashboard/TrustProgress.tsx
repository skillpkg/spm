import { TRUST_CONFIG, Text, type TrustTier } from '@spm/ui';

interface TrustProgressProps {
  currentTier: TrustTier;
}

const TIERS: { id: TrustTier; desc: string }[] = [
  { id: 'registered', desc: 'Published at least 1 skill' },
  { id: 'scanned', desc: 'All skills passed security scan' },
  { id: 'verified', desc: 'GitHub linked + 6 months active' },
  { id: 'official', desc: 'SPM core team or Anthropic' },
];

export const TrustProgress = ({ currentTier }: TrustProgressProps) => {
  const currentIdx = TIERS.findIndex((t) => t.id === currentTier);

  const isDone = (idx: number) => idx <= currentIdx;

  return (
    <div
      style={{
        padding: '20px 22px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 10,
      }}
    >
      <Text
        variant="body"
        font="sans"
        color="primary"
        weight={600}
        as="div"
        style={{ marginBottom: 16 }}
      >
        Trust progression
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {TIERS.map((tier, i) => {
          const done = isDone(i);
          const isCurrent = tier.id === currentTier;
          const cfg = TRUST_CONFIG[tier.id];
          const nextDone = i < TIERS.length - 1 && isDone(i + 1);

          return (
            <div key={tier.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 20,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    fontWeight: 700,
                    flexShrink: 0,
                    background: done ? cfg.color : 'var(--color-bg-card)',
                    border: `2px solid ${done ? cfg.color : 'var(--color-border-default)'}`,
                    color: 'var(--color-bg)',
                  }}
                >
                  {done && '\u2713'}
                </div>
                {i < TIERS.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      height: 32,
                      background: nextDone
                        ? TRUST_CONFIG[TIERS[i + 1].id].color
                        : 'var(--color-border-default)',
                    }}
                  />
                )}
              </div>
              <div style={i < TIERS.length - 1 ? { paddingBottom: 18 } : undefined}>
                <Text
                  variant="body-sm"
                  font="mono"
                  as="div"
                  weight={isCurrent ? 600 : 400}
                  style={{
                    color: isCurrent
                      ? cfg.color
                      : done
                        ? 'var(--color-text-secondary)'
                        : 'var(--color-text-muted)',
                  }}
                >
                  {cfg.checks} {cfg.label}
                  {isCurrent && (
                    <Text variant="label" as="span" style={{ marginLeft: 8, opacity: 0.7 }}>
                      &larr; you
                    </Text>
                  )}
                </Text>
                <Text variant="caption" font="sans" color="muted" as="div" style={{ marginTop: 2 }}>
                  {tier.desc}
                </Text>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
