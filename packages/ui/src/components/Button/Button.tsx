import { useState } from 'react';
import { resolveColor, withAlpha } from '../../utils/colors';

export interface ButtonProps {
  label: string;
  color: string;
  onClick?: () => void;
  small?: boolean;
}

/** @deprecated Use `Button` from `@spm/ui/shadcn` instead */
export const Button = ({ label, color, onClick, small }: ButtonProps) => {
  const [hovered, setHovered] = useState(false);
  const resolved = resolveColor(color);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: small ? 11 : 12,
        padding: small ? '2px 10px' : '4px 14px',
        borderRadius: 5,
        border: `1px solid ${withAlpha(color, 0.25)}`,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.1s',
        color: resolved,
        backgroundColor: hovered ? withAlpha(color, 0.15) : 'transparent',
      }}
    >
      {label}
    </button>
  );
};
