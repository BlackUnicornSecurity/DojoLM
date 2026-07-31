// SPDX-License-Identifier: Apache-2.0
/**
 * ProbeProgress — YR.19 / G-033.
 *
 * Probe-progress indicator used in Kagami "Run" section. Pure SVG bar
 * (no charting library — same discipline as YR.18 RefusalDepthChart /
 * EncodingChainVisualizer).
 *
 * Streaming UX would be: server pushes per-probe progress; we tick the
 * bar. Per YR.19 stop condition (`/api/kagami/behavior-tests` is GET-
 * only and not streaming), we ship the synchronous variant: caller
 * issues a single fetch, we render `complete=true` once the response
 * settles. The `current` / `total` props still reflect the underlying
 * probe count for the chosen preset so operators see "ran N probes"
 * rather than a generic spinner.
 *
 * a11y:
 *   - role="progressbar" with aria-valuenow / aria-valuemin / aria-valuemax
 *   - When complete, aria-valuenow == aria-valuemax (so screen readers
 *     announce 100%)
 *   - aria-label is fixed-vocabulary — never echoes server free text
 */

'use client';

import { type ReactElement, useMemo } from 'react';

export interface ProbeProgressProps {
  readonly current: number;
  readonly total: number;
  readonly complete: boolean;
  readonly running: boolean;
  readonly testId?: string;
  readonly label?: string;
}

const TRACK_W = 320;
const TRACK_H = 12;
const PAD = 8;

function safeInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export function ProbeProgress({
  current,
  total,
  complete,
  running,
  testId = 'probe-progress',
  label = 'Probe progress',
}: ProbeProgressProps): ReactElement {
  const safeTotal = useMemo(() => Math.max(1, safeInt(total, 0, 1000)), [total]);
  const safeCurrent = useMemo(
    () => safeInt(complete ? safeTotal : current, 0, safeTotal),
    [complete, current, safeTotal],
  );
  const pct = Math.round((safeCurrent / safeTotal) * 100);
  const filledW = (safeCurrent / safeTotal) * TRACK_W;
  const totalW = TRACK_W + PAD * 2;
  const totalH = TRACK_H + 24;

  const status: 'idle' | 'running' | 'complete' = complete
    ? 'complete'
    : running
      ? 'running'
      : 'idle';

  const STATUS_COPY: Record<typeof status, string> = {
    idle: 'Ready to run.',
    running: `Running · ${safeCurrent} of ${safeTotal} probes.`,
    complete: `Complete · ${safeTotal} of ${safeTotal} probes.`,
  };

  return (
    <div
      data-testid={testId}
      data-status={status}
      style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-busy={running}
      >
        <svg
          width={totalW}
          height={totalH}
          style={{ display: 'block', width: '100%', maxWidth: totalW, height: 'auto' }}
          viewBox={`0 0 ${totalW} ${totalH}`}
          xmlns="http://www.w3.org/2000/svg"
          role="presentation"
        >
          <rect
            x={PAD}
            y={6}
            width={TRACK_W}
            height={TRACK_H}
            fill="var(--bg-2, #222)"
            rx={3}
            ry={3}
          />
          <rect
            x={PAD}
            y={6}
            width={Math.max(2, filledW)}
            height={TRACK_H}
            fill={complete ? 'var(--accent-jade, #4ade80)' : 'var(--accent-gold, #fbbf24)'}
            rx={3}
            ry={3}
            data-testid={`${testId}-fill`}
          />
          <text
            x={PAD}
            y={TRACK_H + 22}
            fontSize={11}
            fill="var(--fg-mute, #888)"
          >
            {pct}% · {safeCurrent} / {safeTotal}
          </text>
        </svg>
      </div>
      <div
        className="wb-hint"
        data-testid={`${testId}-status`}
        style={{ fontSize: 12, color: 'var(--fg-mute, #888)' }}
      >
        {STATUS_COPY[status]}
      </div>
    </div>
  );
}
