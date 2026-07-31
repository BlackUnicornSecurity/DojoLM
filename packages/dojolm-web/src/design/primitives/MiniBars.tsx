// SPDX-License-Identifier: Apache-2.0
export interface MiniBarsProps {
  values: number[];
  color?: string;
  height?: number;
  /** v2: accessible label override; falls back to `aria-hidden` when omitted. */
  ariaLabel?: string;
  /** v2: gap between bars in pixels (defaults to 2). */
  gap?: number;
}

export function MiniBars({
  values,
  color = 'var(--steel-lg)',
  height = 28,
  ariaLabel,
  gap = 2,
}: MiniBarsProps) {
  const safeValues = values.length > 0 ? values : [0];
  const max = Math.max(...safeValues, 0.0001);
  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-end', gap, height }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            minHeight: 2,
            background: color,
            opacity: 0.3 + (v / max) * 0.7,
            borderRadius: 1.5,
          }}
        />
      ))}
    </div>
  );
}
