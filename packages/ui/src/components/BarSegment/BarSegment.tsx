import { useState } from 'react';

export interface BarSegmentProps {
  pct: number;
  color: string;
  label: string;
}

export const BarSegment = ({ pct, color, label }: BarSegmentProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        cursor: 'default',
        transition: 'opacity 150ms',
        width: `${pct}%`,
        height: 28,
        background: color,
        opacity: hovered ? 0.85 : 1,
        borderRadius: pct === 100 ? 6 : 0,
      }}
    >
      {hovered && (
        <div
          style={{
            position: 'absolute',
            bottom: 34,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 6,
            padding: '4px 10px',
            whiteSpace: 'nowrap',
            zIndex: 10,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-text-primary)',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
          }}
        >
          {label} {pct}%
        </div>
      )}
    </div>
  );
};
