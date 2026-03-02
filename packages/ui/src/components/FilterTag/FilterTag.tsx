import { resolveColor, withAlpha } from '../../utils/colors';

export interface FilterTagProps {
  label: string;
  color: string;
  onRemove: () => void;
}

export const FilterTag = ({ label, color, onRemove }: FilterTagProps) => (
  <span
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      padding: '2px 10px 2px 8px',
      borderRadius: 20,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      backgroundColor: withAlpha(color, 0.1),
      color: resolveColor(color),
    }}
  >
    {label}
    <span
      onClick={onRemove}
      style={{
        cursor: 'pointer',
        fontSize: 14,
        lineHeight: 1,
        opacity: 0.6,
        fontWeight: 600,
      }}
    >
      &#xD7;
    </span>
  </span>
);
