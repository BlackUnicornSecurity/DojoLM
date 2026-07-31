// SPDX-License-Identifier: Apache-2.0
export type DriftSeverity = 'safe' | 'warn' | 'high' | 'crit';

export interface DriftEvent {
  /** Stable id (used as React key + DOM data attr). */
  readonly id: string;
  /** Position along the lane, 0..100. Out-of-range values clamp. */
  readonly t: number;
  /** Drift severity at this point. */
  readonly sev: DriftSeverity;
  /** Optional tooltip label (e.g. `"2026-04-22 — 12% drift"`). Capped at 80 chars. */
  readonly label?: string;
}

export interface DriftLaneProps {
  readonly events: readonly DriftEvent[];
  /** Lane label (e.g. `"GPT-4o · jailbreak corpus"`). Capped at 80 chars. */
  readonly label?: string;
  /** Sub-line (e.g. `"last 14 days"`). Capped at 80 chars. */
  readonly sub?: string;
  /** Lane height in pixels. Clamped to [12, 64]. Defaults to 22. */
  readonly height?: number;
  /** Accessible label override. */
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

const MAX_LABEL = 80;
/** Render-time cap to defend against unbounded API responses (DoS). */
export const DRIFT_LANE_MAX_EVENTS = 256;

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function clampPos(t: number): number {
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.min(100, t));
}

function clampHeight(h: number): number {
  if (Number.isNaN(h)) return 22;
  return Math.max(12, Math.min(64, Math.round(h)));
}

const SEV_RANK: Readonly<Record<DriftSeverity, number>> = {
  safe: 0,
  warn: 1,
  high: 2,
  crit: 3,
};

function maxSeverity(events: readonly DriftEvent[]): DriftSeverity {
  let worst: DriftSeverity = 'safe';
  for (const e of events) {
    if (SEV_RANK[e.sev] > SEV_RANK[worst]) worst = e.sev;
  }
  return worst;
}

/**
 * Kagami drift-over-time lane. Single horizontal track with severity-
 * tinted dots positioned by `t` (0–100). Worst-severity event drives
 * the lane's outline tone. Caller passes pre-bucketed events; this
 * primitive does no time-axis math beyond clamping `t`. Used by
 * `/admin/kagami` per-model drift panel and the consistency
 * regression dashboard.
 */
export function DriftLane({
  events,
  label,
  sub,
  height,
  ariaLabel,
  className,
  testId,
}: DriftLaneProps) {
  const safe = events.slice(0, DRIFT_LANE_MAX_EVENTS);
  const safeHeight = clampHeight(height ?? 22);
  const cappedLabel = label !== undefined ? cap(label, MAX_LABEL) : undefined;
  const cappedSub = sub !== undefined ? cap(sub, MAX_LABEL) : undefined;
  const worst = maxSeverity(safe);
  const summary =
    ariaLabel ??
    `Drift lane: ${safe.length} events, worst severity ${worst}${
      cappedLabel ? ` — ${cappedLabel}` : ''
    }`;
  const rootClass = `drift-lane sev-${worst}${className ? ` ${className}` : ''}`;
  return (
    <div
      className={rootClass}
      role="img"
      aria-label={summary}
      data-testid={testId ?? 'drift-lane'}
      data-worst={worst}
    >
      {(cappedLabel || cappedSub) && (
        <div className="drift-lane-head">
          {cappedLabel ? <span className="drift-lane-label">{cappedLabel}</span> : <span />}
          {cappedSub ? <span className="drift-lane-sub">{cappedSub}</span> : null}
        </div>
      )}
      <div className="drift-lane-track" style={{ height: safeHeight }}>
        {safe.map((e) => {
          const pos = clampPos(e.t);
          const cappedDotLabel = e.label !== undefined ? cap(e.label, MAX_LABEL) : undefined;
          return (
            <span
              key={e.id}
              className={`drift-lane-dot sev-${e.sev}`}
              style={{ left: `${pos}%` }}
              title={cappedDotLabel}
              aria-hidden="true"
              data-event-id={e.id}
            />
          );
        })}
      </div>
    </div>
  );
}
