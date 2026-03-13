import { resolveColor, withAlpha } from '../../utils/colors';

export interface BadgeProps {
  label: string;
  color: string;
}

/** @deprecated Use `Badge` from `@spm/ui/shadcn` instead */
export const Badge = ({ label, color }: BadgeProps) => (
  <span
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 4,
      whiteSpace: 'nowrap',
      backgroundColor: withAlpha(color, 0.1),
      color: resolveColor(color),
    }}
  >
    {label}
  </span>
);
