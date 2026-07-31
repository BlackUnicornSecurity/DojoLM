// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties } from 'react';

export type ActivityBandTone = '' | 'jade' | 'steel' | 'gold' | 'red';

export interface ActivityBucket {
  /** Bucket value (count, rate, intensity). Negative values clamp to 0. */
  readonly v: number;
  /** Optional label rendered as a `<title>` on the segment for tooltips. Capped at 80 chars. */
  readonly label?: string;
}

export interface ActivityBandProps {
  /** Time-ordered buckets (e.g. 24 hourly counts). */
  readonly buckets: readonly ActivityBucket[];
  /** Tone class for the fill. Defaults to torii (empty string). */
  readonly tone?: ActivityBandTone;
  /** Strip height in pixels (default 18). Clamped to [8, 64]. */
  readonly height?: number;
  /** Accessible label override. Default summarizes total + bucket count. */
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

const MAX_LABEL = 80;
/** Render-time cap to defend against unbounded API responses (DoS). */
export const ACTIVITY_BAND_MAX_BUCKETS = 256;

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function clampHeight(h: number): number {
  if (Number.isNaN(h)) return 18;
  return Math.max(8, Math.min(64, Math.round(h)));
}

/**
 * Compact activity sparkline strip — N adjacent segments with height
 * scaled to bucket value. Used cross-module for "last 24h" indicators
 * (Mitsuke feed, Kagami runs, Sengoku campaign activity, Atemi probes).
 * Differs from `<MiniBars>` by carrying an accessible summary, per-
 * bucket tooltip slots, and a tone class. Pure layout — no animation.
 */
export function ActivityBand({
  buckets,
  tone = '',
  height = 18,
  ariaLabel,
  className,
  testId,
}: ActivityBandProps) {
  const safeHeight = clampHeight(height);
  const safeBuckets = buckets.slice(0, ACTIVITY_BAND_MAX_BUCKETS);
  const total = safeBuckets.reduce((s, b) => s + Math.max(0, b.v), 0);
  const max = safeBuckets.reduce((m, b) => Math.max(m, Math.max(0, b.v)), 0) || 1;
  const summary = ariaLabel ?? `Activity: ${total} events over ${safeBuckets.length} buckets`;
  const rootClass = `activity-band ${tone}`.trim();
  const composedClass = `${rootClass}${className ? ` ${className}` : ''}`;
  const wrapperStyle: CSSProperties = { height: safeHeight };

  if (safeBuckets.length === 0) {
    return (
      <div
        className={composedClass}
        role="img"
        aria-label={summary}
        data-testid={testId ?? 'activity-band'}
        data-empty="true"
        style={wrapperStyle}
      />
    );
  }

  return (
    <div
      className={composedClass}
      role="img"
      aria-label={summary}
      data-testid={testId ?? 'activity-band'}
      style={wrapperStyle}
    >
      {safeBuckets.map((b, i) => {
        const safeV = Math.max(0, b.v);
        const heightPct = (safeV / max) * 100;
        const segStyle: CSSProperties = { height: `${heightPct}%` };
        const labelText = b.label ? cap(b.label, MAX_LABEL) : undefined;
        return (
          <span
            key={i}
            className="activity-band-seg"
            style={segStyle}
            title={labelText}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}
