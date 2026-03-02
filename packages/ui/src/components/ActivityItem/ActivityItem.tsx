export interface ActivityEvent {
  type: string;
  skill: string;
  version?: string;
  date: string;
  detail: string;
}

export interface ActivityItemProps {
  item: ActivityEvent;
  icons?: Record<string, string>;
}

const DEFAULT_ICONS: Record<string, string> = {
  publish: '\ud83d\udce6',
  review: '\u2b50',
  milestone: '\ud83c\udfaf',
};

export const ActivityItem = ({ item, icons }: ActivityItemProps) => {
  const iconMap = icons ?? DEFAULT_ICONS;
  const icon = iconMap[item.type] ?? '\u25cf';

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
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
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
