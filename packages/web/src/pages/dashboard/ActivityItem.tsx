import type { ActivityEvent } from './mock-data';

const ACTIVITY_ICONS: Record<ActivityEvent['type'], string> = {
  publish: '\ud83d\udce6',
  review: '\u2b50',
  milestone: '\ud83c\udfaf',
};

interface ActivityItemProps {
  item: ActivityEvent;
}

export const ActivityItem = ({ item }: ActivityItemProps) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '10px 0',
        borderBottom: '1px solid rgba(26,29,39,0.2)',
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{ACTIVITY_ICONS[item.type]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--color-text-secondary)',
          }}
        >
          {item.detail}
          {item.version && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--color-text-dim)',
                marginLeft: 6,
              }}
            >
              v{item.version}
            </span>
          )}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            marginTop: 2,
          }}
        >
          <span style={{ color: 'var(--color-cyan)' }}>{item.skill}</span> &middot; {item.date}
        </div>
      </div>
    </div>
  );
};
