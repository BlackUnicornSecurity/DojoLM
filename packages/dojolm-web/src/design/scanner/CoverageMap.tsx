// SPDX-License-Identifier: Apache-2.0
/**
 * CoverageMap — T6.3 / G-055.
 *
 * Per-category coverage progress-bar list. One row per category (OWASP
 * LLM Top-10, TPI Bushido stories, custom). Pure SVG, no charting
 * library dependency (per YR.18 zero-deps mandate carry-forward).
 *
 * Data shape: `rows: readonly CoverageMapRow[]`. Caller extracts rows
 * from the `/api/llm/coverage` response (one row per OWASP / TPI key).
 *
 * Discriminant-redaction (R-T1):
 *   - COVERAGE_BUCKET_LABEL maps closed bucket → user copy
 *   - COVERAGE_BUCKET_FILL maps closed bucket → CSS var
 *   - aria-label uses bucket label, NEVER the raw percentage float
 *
 * Caps:
 *   - default 30 rows rendered (caller passes maxRows to override)
 *   - label text capped at 48 chars for the visual SVG <text>
 *
 * Sort: percentage asc (worst-coverage first), ties broken by label asc.
 *       Caller of this primitive should not pre-sort.
 */

"use client";

import { type ReactElement, useMemo } from "react";

export type CoverageBucket = "untested" | "low" | "med" | "high";

export const COVERAGE_BUCKET_LABEL: Record<CoverageBucket, string> = {
  untested: "untested",
  low: "low coverage",
  med: "partial coverage",
  high: "high coverage",
};

export const COVERAGE_BUCKET_FILL: Record<CoverageBucket, string> = {
  untested: "var(--fg-dim)",
  low: "var(--torii, #cc3a2f)",
  med: "var(--gold, #d8a44a)",
  high: "var(--jade, #6fae70)",
};

export interface CoverageMapRow {
  readonly id: string;
  readonly label: string;
  readonly tested: number;
  readonly passed: number;
  readonly percentage: number;
}

export interface CoverageMapProps {
  readonly rows: readonly CoverageMapRow[];
  readonly testId?: string;
  readonly maxRows?: number;
}

const DEFAULT_MAX_ROWS = 30;
const LABEL_CAP = 48;
const ROW_H = 22;
const ROW_GAP = 4;
const LABEL_W = 200;
const TRACK_W = 240;
const VALUE_W = 60;
const PAD_X = 8;

function bucketOf(row: CoverageMapRow): CoverageBucket {
  if (row.tested === 0) return "untested";
  if (row.percentage >= 80) return "high";
  if (row.percentage >= 50) return "med";
  return "low";
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function capLabel(s: string): string {
  if (s.length <= LABEL_CAP) return s;
  return `${s.slice(0, LABEL_CAP - 1)}…`;
}

export function CoverageMap({
  rows,
  testId = "coverage-map",
  maxRows = DEFAULT_MAX_ROWS,
}: CoverageMapProps): ReactElement | null {
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      if (a.percentage !== b.percentage) return a.percentage - b.percentage;
      return a.label.localeCompare(b.label);
    });
    return copy.slice(0, maxRows);
  }, [rows, maxRows]);

  if (sorted.length === 0) return null;

  const totalH = sorted.length * (ROW_H + ROW_GAP) - ROW_GAP + 8;
  const totalW = LABEL_W + TRACK_W + VALUE_W + PAD_X * 2;

  return (
    <div
      data-testid={testId}
      role="img"
      aria-label="Coverage map per category"
      style={{ width: "100%", overflowX: "auto" }}
    >
      <svg
        width={totalW}
        height={totalH}
        viewBox={`0 0 ${totalW} ${totalH}`}
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
      >
        {sorted.map((r, idx) => {
          const bucket = bucketOf(r);
          const pct = clampPct(r.percentage);
          const fillW = (pct / 100) * TRACK_W;
          const y = idx * (ROW_H + ROW_GAP) + 4;
          const labelText = capLabel(r.label);
          const ariaLabel = `Coverage row ${labelText}: ${COVERAGE_BUCKET_LABEL[bucket]} (${r.tested} tested, ${r.passed} passed)`;
          const trackX = PAD_X + LABEL_W;
          const valueX = trackX + TRACK_W + 6;
          return (
            <g
              key={r.id}
              data-testid={`${testId}-row-${idx}`}
              data-bucket={bucket}
              role="group"
              aria-label={ariaLabel}
            >
              <text
                x={PAD_X}
                y={y + ROW_H / 2 + 4}
                fontSize={11}
                fill="var(--fg, currentColor)"
              >
                {labelText}
              </text>
              <rect
                x={trackX}
                y={y}
                width={TRACK_W}
                height={ROW_H}
                rx={3}
                fill="var(--b-0, rgba(0,0,0,0.08))"
              />
              <rect
                data-testid={`${testId}-row-${idx}-fill`}
                x={trackX}
                y={y}
                width={fillW}
                height={ROW_H}
                rx={3}
                fill={COVERAGE_BUCKET_FILL[bucket]}
              />
              <text
                x={valueX}
                y={y + ROW_H / 2 + 4}
                fontSize={11}
                fill="var(--fg, currentColor)"
                fontFamily="var(--mono)"
              >
                {r.passed}/{r.tested}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
