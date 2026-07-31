// SPDX-License-Identifier: Apache-2.0
export interface SparkProps {
  points: number[];
  color?: string;
  fill?: boolean;
  /** v2: width override; defaults to 120. */
  width?: number;
  /** v2: height override; defaults to 28. */
  height?: number;
  /** v2: accessible label override; falls back to `aria-hidden` when omitted. */
  ariaLabel?: string;
  /** v2: opt-in stroke width override (defaults to 1.5). */
  strokeWidth?: number;
}

export function Spark({
  points,
  color = 'var(--torii-lg)',
  fill = false,
  width = 120,
  height = 28,
  ariaLabel,
  strokeWidth = 1.5,
}: SparkProps) {
  const w = width;
  const h = height;
  if (points.length === 0) {
    return <svg width={w} height={h} style={{ display: 'block' }} aria-hidden="true" />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 0.0001);
  const denom = Math.max(points.length - 1, 1);
  const pts = points
    .map((p, i) => {
      const x = (i / denom) * w;
      const y = h - ((p - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      width={w}
      height={h}
      style={{ display: 'block' }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {fill && <polygon points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.14" />}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
