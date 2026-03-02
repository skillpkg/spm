import type { PublishEvent } from './mock-data';

const STATUS_CONFIG = {
  success: {
    label: 'Published',
    color: 'var(--color-accent)',
    bg: 'rgba(16,185,129,0.1)',
  },
  blocked: {
    label: 'Blocked',
    color: 'var(--color-red)',
    bg: 'rgba(239,68,68,0.1)',
  },
  held: {
    label: 'Held \u2192 Approved',
    color: 'var(--color-yellow)',
    bg: 'rgba(251,191,36,0.1)',
  },
} as const;

interface PublishRowProps {
  item: PublishEvent;
}

export const PublishRow = ({ item }: PublishRowProps) => {
  const s = STATUS_CONFIG[item.status];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '140px 60px 1fr 100px 70px',
        alignItems: 'center',
        padding: '10px 16px',
        borderBottom: '1px solid rgba(26,29,39,0.25)',
        gap: 12,
      }}
    >
      <div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--color-cyan)',
          }}
        >
          {item.skill}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-text-faint)',
            marginLeft: 6,
          }}
        >
          {item.version}
        </span>
      </div>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 4,
          textAlign: 'center',
          color: s.color,
          background: s.bg,
        }}
      >
        {s.label}
      </span>
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.reason ?? 'All checks passed'}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--color-text-muted)',
          textAlign: 'right',
        }}
      >
        {item.date}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          textAlign: 'right',
        }}
      >
        {item.scanTime}
      </div>
    </div>
  );
};
