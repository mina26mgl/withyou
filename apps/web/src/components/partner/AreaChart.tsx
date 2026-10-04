import { useId } from "react";

/** Fluid SVG area chart; strokes stay 2px whatever the width (non-scaling-stroke). */
export function AreaChart({
  values,
  height = 210,
  label,
  labels,
}: {
  values: number[];
  height?: number;
  label: string;
  labels?: [string, string, string];
}) {
  const gradientId = useId();
  const w = 600;
  const max = Math.max(1, ...values) * 1.12;
  const n = values.length;
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * w : w / 2).toFixed(1);
  const y = (v: number) => (height - (v / max) * height).toFixed(1);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join(" ");

  return (
    <>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
        className="block w-full"
        style={{ height }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3A9A5E" stopOpacity=".28" />
            <stop offset="1" stopColor="#3A9A5E" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={w} y1={height * f} y2={height * f} stroke="#E6ECEA" vectorEffect="non-scaling-stroke" />
        ))}
        {n > 0 && <path d={`${line} L${w} ${height} L0 ${height}Z`} fill={`url(#${gradientId})`} />}
        {n > 0 && (
          <path d={line} fill="none" stroke="#3A9A5E" strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {labels && (
        <div className="mt-2 flex justify-between text-xs text-partner-muted">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </>
  );
}
