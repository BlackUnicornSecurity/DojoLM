// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from "react";

export type BarRowTone = "" | "jade" | "steel" | "gold" | "red";

export interface BarRowProps {
  label: ReactNode;
  sub?: ReactNode;
  pct: number;
  value?: ReactNode;
  right?: ReactNode;
  tone?: BarRowTone;
}

/**
 * Leaderboard-style row: label/sub on the left, 140px progress bar in
 * the middle, right-aligned value on the right. `pct` is clamped to
 * [0, 100] so caller errors don't overflow the track.
 */
export function BarRow({
  label,
  sub,
  pct,
  value,
  right,
  tone = "",
}: BarRowProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const display = right ?? value ?? null;
  const progressLabel =
    typeof label === "string"
      ? `${label}: ${clamped}%`
      : `Progress: ${clamped}%`;
  return (
    <div className="bar-row">
      <div className="bar-row-label">
        <b>{label}</b>
        {sub && <span className="bar-row-sub">{sub}</span>}
      </div>
      <div
        className={`pbar ${tone}`.trim()}
        role="progressbar"
        aria-label={progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
      >
        <div className="fill" style={{ width: `${clamped}%` }} />
      </div>
      <span className="bar-row-value">{display}</span>
    </div>
  );
}
