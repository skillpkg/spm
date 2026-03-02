import { TRUST_CONFIG, type TrustTier } from './mock-data';

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
    <div className="px-[22px] py-5 bg-bg-card border border-border-default rounded-[10px]">
      <div className="font-sans text-sm font-semibold text-text-primary mb-4">
        Trust progression
      </div>
      <div className="flex flex-col">
        {TIERS.map((tier, i) => {
          const done = isDone(i);
          const isCurrent = tier.id === currentTier;
          const cfg = TRUST_CONFIG[tier.id];
          const nextDone = i < TIERS.length - 1 && isDone(i + 1);

          return (
            <div key={tier.id} className="flex gap-3.5 items-start">
              <div className="flex flex-col items-center w-5">
                <div
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                  style={{
                    background: done ? cfg.color : 'var(--color-bg-card)',
                    border: `2px solid ${done ? cfg.color : 'var(--color-border-default)'}`,
                    color: 'var(--color-bg)',
                  }}
                >
                  {done && '\u2713'}
                </div>
                {i < TIERS.length - 1 && (
                  <div
                    className="w-0.5 h-8"
                    style={{
                      background: nextDone
                        ? TRUST_CONFIG[TIERS[i + 1].id].color
                        : 'var(--color-border-default)',
                    }}
                  />
                )}
              </div>
              <div className={i < TIERS.length - 1 ? 'pb-[18px]' : ''}>
                <div
                  className="font-mono text-[13px]"
                  style={{
                    color: isCurrent
                      ? cfg.color
                      : done
                        ? 'var(--color-text-secondary)'
                        : 'var(--color-text-muted)',
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >
                  {cfg.checks} {cfg.label}
                  {isCurrent && <span className="text-[11px] ml-2 opacity-70">&larr; you</span>}
                </div>
                <div className="font-sans text-xs text-text-muted mt-0.5">{tier.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
