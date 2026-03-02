import { Badge } from '../Badge/Badge';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  published: { label: 'Published', color: 'accent' },
  held: { label: 'Held', color: 'yellow' },
  blocked: { label: 'Blocked', color: 'red' },
  yanked: { label: 'Yanked', color: 'red' },
  deprecated: { label: 'Deprecated', color: 'text-dim' },
  open: { label: 'Open', color: 'yellow' },
  investigating: { label: 'Investigating', color: 'blue' },
  resolved: { label: 'Resolved', color: 'accent' },
  wontfix: { label: "Won't fix", color: 'text-dim' },
  active: { label: 'Active', color: 'accent' },
  flagged: { label: 'Flagged', color: 'yellow' },
  suspended: { label: 'Suspended', color: 'red' },
};

export interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = STATUS_MAP[status] ?? { label: status, color: 'text-dim' };
  return <Badge label={config.label} color={config.color} />;
};
