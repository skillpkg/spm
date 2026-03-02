export interface MiniChartPoint {
  value: number;
}

export interface MiniChartProps {
  data: MiniChartPoint[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
}

export const MiniChart = ({
  data,
  width = 220,
  height = 48,
  color = 'var(--color-accent)',
  fillOpacity = 0.08,
}: MiniChartProps) => {
  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const pointCoords = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((d.value - min) / range) * h;
    return { x, y };
  });

  const linePoints = pointCoords.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${linePoints} ${pad + w},${pad + h} ${pad},${pad + h}`;
  const last = pointCoords[pointCoords.length - 1];

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polygon points={areaPoints} fill={color} fillOpacity={fillOpacity} />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {last && <circle cx={last.x} cy={last.y} r="3" fill={color} />}
    </svg>
  );
};
