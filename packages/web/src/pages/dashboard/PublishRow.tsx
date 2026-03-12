import { Text } from '@spm/ui';
import type { PublishEvent } from './types';

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
        <Text variant="body-sm" font="mono" as="span" style={{ color: 'var(--color-cyan)' }}>
          {item.skill}
        </Text>
        <Text variant="label" font="mono" color="faint" as="span" style={{ marginLeft: 6 }}>
          {item.version}
        </Text>
      </div>
      <Text
        variant="label"
        font="mono"
        as="span"
        style={{
          padding: '2px 8px',
          borderRadius: 4,
          textAlign: 'center',
          color: s.color,
          background: s.bg,
        }}
      >
        {s.label}
      </Text>
      <Text
        variant="caption"
        font="sans"
        color="muted"
        as="div"
        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {item.reason ?? 'All checks passed'}
      </Text>
      <Text variant="label" font="mono" color="muted" as="div" style={{ textAlign: 'right' }}>
        {item.date}
      </Text>
      <Text variant="label" font="mono" color="dim" as="div" style={{ textAlign: 'right' }}>
        {item.scanTime}
      </Text>
    </div>
  );
};
