import { resolveColor } from '../../utils/colors';

export type Priority = 'high' | 'medium' | 'low';

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'red',
  medium: 'yellow',
  low: 'text-dim',
};

export interface PriorityDotProps {
  priority: Priority;
}

export const PriorityDot = ({ priority }: PriorityDotProps) => (
  <div
    style={{
      width: 8,
      height: 8,
      borderRadius: '50%',
      flexShrink: 0,
      backgroundColor: resolveColor(PRIORITY_COLORS[priority] ?? 'text-dim'),
    }}
  />
);
