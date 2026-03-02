import type { WeeklyData } from './mock-data';

interface MiniChartProps {
  data: WeeklyData[];
  width?: number;
  height?: number;
}

export const MiniChart = ({ data, width = 220, height = 48 }: MiniChartProps) => {
  const downloads = data.map((d) => d.downloads);
  const max = Math.max(...downloads);
  const min = Math.min(...downloads);
  const range = max - min || 1;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const pointCoords = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((d.downloads - min) / range) * h;
    return { x, y };
  });

  const linePoints = pointCoords.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${linePoints} ${pad + w},${pad + h} ${pad},${pad + h}`;
  const last = pointCoords[pointCoords.length - 1];

  return (
    <svg width={width} height={height} className="block">
      <polygon points={areaPoints} fill="rgba(16,185,129,0.08)" />
      <polyline
        points={linePoints}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {last && <circle cx={last.x} cy={last.y} r="3" fill="var(--color-accent)" />}
    </svg>
  );
};
