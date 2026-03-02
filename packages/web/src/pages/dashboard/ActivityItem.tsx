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
    <div className="flex gap-3 items-start py-2.5 border-b border-border-default/20">
      <span className="text-sm shrink-0 mt-px">{ACTIVITY_ICONS[item.type]}</span>
      <div className="flex-1 min-w-0">
        <div className="font-sans text-[13px] text-text-secondary">
          {item.detail}
          {item.version && (
            <span className="font-mono text-xs text-text-dim ml-1.5">v{item.version}</span>
          )}
        </div>
        <div className="font-mono text-[11px] text-text-muted mt-0.5">
          <span className="text-cyan">{item.skill}</span> &middot; {item.date}
        </div>
      </div>
    </div>
  );
};
