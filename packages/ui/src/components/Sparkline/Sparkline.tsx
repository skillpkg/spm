export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
}

export const Sparkline = ({
  data,
  width = 120,
  height = 32,
  color = 'var(--color-accent)',
  fillOpacity = 0.1,
}: SparklineProps) => {
  if (data.length === 0) return null;

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  if (data.length === 1) {
    const cx = pad + w / 2;
    const cy = pad + h / 2;
    return (
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Sparkline"
        style={{ display: 'block' }}
      >
        <circle cx={cx} cy={cy} r="2" fill={color} />
      </svg>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const coords = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * w,
    y: pad + h - ((v - min) / range) * h,
  }));

  const linePoints = coords.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${linePoints} ${pad + w},${pad + h} ${pad},${pad + h}`;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="Sparkline"
      style={{ display: 'block' }}
    >
      <polygon points={areaPoints} fill={color} fillOpacity={fillOpacity} />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};
