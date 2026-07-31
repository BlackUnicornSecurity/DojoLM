// SPDX-License-Identifier: Apache-2.0
/**
 * RefusalDepthChart — YR.18 / G-022.
 *
 * Per-module bar chart of refusal depth. Each row is one module
 * (engine name); the bar width represents the depth count. Pure SVG,
 * no charting library dependency (per YR.18 stop condition).
 *
 * Data shape: `bars: readonly RefusalDepthBar[]`. The caller passes in
 * the bars extracted from `scanResponse.refusalDepth`. If empty or
 * undefined, the caller renders an EmptyState upstream.
 *
 * Caps:
 *   - max 10 bars rendered (top-N by depth, ties broken by name)
 *   - bar label capped at 32 chars
 */

'use client';

import { type ReactElement, useMemo } from 'react';

export interface RefusalDepthBar {
  readonly module: string;
  readonly depth: number;
}

export interface RefusalDepthChartProps {
  readonly bars: readonly RefusalDepthBar[];
  readonly testId?: string;
  readonly maxBars?: number;
}

const DEFAULT_MAX_BARS = 10;
const MODULE_LABEL_CAP = 32;
const BAR_H = 14;
const ROW_GAP = 6;
const LABEL_W = 140;
const VALUE_W = 36;
const PAD_X = 8;

function capModule(s: string): string {
  if (s.length <= MODULE_LABEL_CAP) return s;
  return `${s.slice(0, MODULE_LABEL_CAP - 1)}…`;
}

export function RefusalDepthChart({
  bars,
  testId = 'refusal-depth-chart',
  maxBars = DEFAULT_MAX_BARS,
}: RefusalDepthChartProps): ReactElement | null {
  const sorted = useMemo(() => {
    const copy = [...bars];
    copy.sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth;
      return a.module.localeCompare(b.module);
    });
    return copy.slice(0, maxBars);
  }, [bars, maxBars]);

  if (sorted.length === 0) return null;

  const maxDepth = Math.max(...sorted.map((b) => b.depth), 1);
  const barTrackW = 240;
  const totalH = sorted.length * (BAR_H + ROW_GAP) - ROW_GAP + 12;
  const totalW = LABEL_W + barTrackW + VALUE_W + PAD_X * 2;

  return (
    <div
      data-testid={testId}
      role="img"
      aria-label="Refusal depth per scanner module"
      style={{ width: '100%', overflowX: 'auto' }}
    >
      <svg
        width={totalW}
        height={totalH}
        viewBox={`0 0 ${totalW} ${totalH}`}
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
      >
        {sorted.map((bar, idx) => {
          const y = idx * (BAR_H + ROW_GAP) + 6;
          const w = (bar.depth / maxDepth) * barTrackW;
          return (
            <g key={`${bar.module}-${idx}`} data-testid={`${testId}-bar-${idx}`}>
              <text
                x={PAD_X}
                y={y + BAR_H / 2 + 4}
                fontSize={11}
                fill="var(--fg, currentColor)"
              >
                {capModule(bar.module)}
              </text>
              <rect
                x={LABEL_W + PAD_X}
                y={y}
                width={barTrackW}
                height={BAR_H}
                fill="var(--bg-2, #222)"
                rx={2}
                ry={2}
              />
              <rect
                x={LABEL_W + PAD_X}
                y={y}
                width={Math.max(2, w)}
                height={BAR_H}
                fill="var(--torii-hi)"
                rx={2}
                ry={2}
                data-testid={`${testId}-bar-${idx}-fill`}
              />
              <text
                x={LABEL_W + barTrackW + PAD_X + 4}
                y={y + BAR_H / 2 + 4}
                fontSize={11}
                fill="var(--fg-mute, #888)"
              >
                {bar.depth}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
