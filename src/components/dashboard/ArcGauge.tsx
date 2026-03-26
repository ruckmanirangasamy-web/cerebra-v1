interface ArcGaugeProps {
  percentage: number;
  color: string;
  size?: number;
}

export function ArcGauge({ percentage, color, size = 40 }: ArcGaugeProps) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0">
      {/* Background circle */}
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke={`${color}18`}
        strokeWidth="4"
      />
      {/* Progress circle */}
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{
          strokeDashoffset: circumference * (1 - percentage / 100),
          transform: "rotate(-90deg)",
          transformOrigin: "center",
          transition: "stroke-dashoffset 1s ease"
        }}
      />
      {/* Percentage text */}
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fill={color}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px"
        }}
      >
        {percentage}%
      </text>
    </svg>
  );
}
