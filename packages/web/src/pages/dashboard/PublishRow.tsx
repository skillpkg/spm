import type { PublishEvent } from './mock-data';

const STATUS_CONFIG = {
  success: { label: 'Published', colorClass: 'text-accent', bgClass: 'bg-accent/10' },
  blocked: { label: 'Blocked', colorClass: 'text-red', bgClass: 'bg-red/10' },
  held: { label: 'Held \u2192 Approved', colorClass: 'text-yellow', bgClass: 'bg-yellow/10' },
} as const;

interface PublishRowProps {
  item: PublishEvent;
}

export const PublishRow = ({ item }: PublishRowProps) => {
  const s = STATUS_CONFIG[item.status];

  return (
    <div
      className="grid items-center px-4 py-2.5 border-b border-border-default/25 gap-3"
      style={{ gridTemplateColumns: '140px 60px 1fr 100px 70px' }}
    >
      <div>
        <span className="font-mono text-[13px] text-cyan">{item.skill}</span>
        <span className="font-mono text-[11px] text-text-faint ml-1.5">{item.version}</span>
      </div>
      <span
        className={`font-mono text-[11px] px-2 py-0.5 rounded text-center ${s.colorClass} ${s.bgClass}`}
      >
        {s.label}
      </span>
      <div className="font-sans text-xs text-text-muted truncate">
        {item.reason ?? 'All checks passed'}
      </div>
      <div className="font-mono text-[11px] text-text-muted text-right">{item.date}</div>
      <div className="font-mono text-[11px] text-text-dim text-right">{item.scanTime}</div>
    </div>
  );
};
