import { useState } from 'react';

interface BarSegmentProps {
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
      className="relative cursor-default transition-opacity duration-150"
      style={{
        width: `${pct}%`,
        height: 28,
        background: color,
        opacity: hovered ? 0.85 : 1,
        borderRadius: pct === 100 ? 6 : 0,
      }}
    >
      {hovered && (
        <div className="absolute bottom-[34px] left-1/2 -translate-x-1/2 bg-bg-card border border-border-default rounded-md px-2.5 py-1 whitespace-nowrap z-10 font-mono text-[11px] text-text-primary shadow-lg">
          {label} {pct}%
        </div>
      )}
    </div>
  );
};
