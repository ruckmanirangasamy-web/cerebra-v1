interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  data,
  color,
  width = 64,
  height = 28
}: SparklineProps) {
  const min = Math.min(...data);
  const max = Math.max(...data);

  const normalize = (value: number) => ((value - min) / (max - min + 0.01));

  const points = data
    .map((value, index) =>
      `${(index / (data.length - 1)) * width},${height - normalize(value) * height}`
    )
    .join(" ");

  const gradientId = `sparkline-gradient-${color.replace(/[^a-z0-9]/gi, "")}${width}`;

  const pathData = `M0,${height} L${data
    .map((value, index) =>
      `${(index / (data.length - 1)) * width},${height - normalize(value) * height}`
    )
    .join(" L")} L${width},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible" }}
      className="shrink-0"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={pathData}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={height - normalize(data[data.length - 1]) * height}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}
