// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';
import { cap, capOpt } from './_caps';
import { CountPill } from './CountPill';
import { MiniGauge, type MiniGaugeTone } from './MiniGauge';

export type GoldenSuiteStatus = 'green' | 'amber' | 'red';
export type GoldenSuiteTileTone = '' | 'jade' | 'gold' | 'red' | 'steel' | 'violet';

export interface GoldenSuiteTile {
  /** Optional stable id for keying (preferred over array index for reorder-safe lists). */
  readonly id?: string;
  /** Mono eyebrow label (e.g. "PASS", "FAIL", "SCORE"). */
  label: string;
  /** Big-number value — accepts pre-formatted strings (e.g. "287", "0.92"). */
  value: ReactNode;
  /** Optional unit suffix (e.g. "/300", "%"). */
  unit?: ReactNode;
  /** Color swatch driving the tile tint via `.golden-suite-tile.<tone>`. */
  tone?: GoldenSuiteTileTone;
}

export interface GoldenSuiteCardProps {
  /** Suite identifier (e.g. "jailbreak-canary-v3"). */
  suite: string;
  /** Revision count rendered in a CountPill next to the suite name. */
  revisionCount: number;
  /** Overall suite-health discriminant — drives the header status pill class. */
  status: GoldenSuiteStatus;
  /** Pre-formatted last-run timestamp (e.g. "2026-04-26 14:08 UTC"). */
  lastRun?: string;
  /** Metric tiles — pass / fail / score / latency / etc. Capped at GOLDEN_SUITE_CARD_MAX_TILES. */
  tiles: GoldenSuiteTile[];
  /** Optional trend percentage (0–100) — renders a MiniGauge as the trend tile. */
  trendPct?: number;
  /** Optional trend tone driving the MiniGauge fill. */
  trendTone?: MiniGaugeTone;
  /** Optional trend caption (e.g. "vs Q1 baseline"). */
  trendNote?: string;
  /** Optional accessible label override; falls back to a static-mapped summary. */
  ariaLabel?: string;
}

/** Defensive cap on metric tiles — UI envelope is 6 tiles max in v2.1 mockups. */
export const GOLDEN_SUITE_CARD_MAX_TILES = 12;

const SUITE_MAX = 120;
const TILE_LABEL_MAX = 32;
const TILE_VALUE_ARIA_MAX = 24;
const LAST_RUN_MAX = 48;
const TREND_NOTE_MAX = 80;
const ARIA_LABEL_MAX = 200;

const STATUS_LABEL: Record<GoldenSuiteStatus, string> = {
  green: 'all green',
  amber: 'amber drift',
  red: 'red regression',
};

/**
 * Kagami golden-suite summary card. Header carries the suite identifier,
 * a CountPill for revision count, and a status pill. The body is a grid
 * of metric tiles (pass/fail/score) plus an optional MiniGauge trend
 * tile. The card uses the native `<figure>` element so the implicit
 * `figure` ARIA role is the host (per the WAI-ARIA-in-HTML mapping —
 * `<section role="figure">` is NOT a permitted override). The aria-label
 * indexes `STATUS_LABEL[status]` and never splices the raw discriminant.
 *
 * Numeric props (`revisionCount`, `trendPct`) are guarded with
 * `Number.isFinite()` so an upstream JSON-coercion bug feeding NaN /
 * Infinity cannot leak `"NaN revisions"` or `aria-valuenow="NaN"` into
 * the AT layer.
 *
 * Composition: CountPill (revision count) + MiniGauge (trend tile).
 */
export function GoldenSuiteCard({
  suite,
  revisionCount,
  status,
  lastRun,
  tiles,
  trendPct,
  trendTone = '',
  trendNote,
  ariaLabel,
}: GoldenSuiteCardProps) {
  const safeSuite = cap(suite, SUITE_MAX);
  const safeLastRun = capOpt(lastRun, LAST_RUN_MAX);
  const safeTrendNote = capOpt(trendNote, TREND_NOTE_MAX);
  const safeAriaLabel = capOpt(ariaLabel, ARIA_LABEL_MAX);
  const safeTiles = tiles.slice(0, GOLDEN_SUITE_CARD_MAX_TILES).map((t) => ({
    id: t.id,
    label: cap(t.label, TILE_LABEL_MAX),
    value: t.value,
    unit: t.unit,
    tone: t.tone ?? '',
  }));
  const safeRevCount = Number.isFinite(revisionCount)
    ? Math.max(0, Math.floor(revisionCount))
    : 0;
  const safeTrendPct =
    trendPct !== undefined && Number.isFinite(trendPct)
      ? Math.max(0, Math.min(100, trendPct))
      : undefined;
  const summary =
    safeAriaLabel ??
    `${safeSuite} · ${STATUS_LABEL[status]} · ${safeRevCount} revisions`;

  return (
    <figure
      className={`golden-suite-card status-${status}`}
      aria-label={summary}
    >
      <header className="golden-suite-card-head">
        <div className="golden-suite-card-title">
          <span className="golden-suite-card-suite">{safeSuite}</span>
          <CountPill n={safeRevCount} label="revisions" tone="steel" />
        </div>
        <div className="golden-suite-card-meta">
          <span className={`golden-suite-card-status ${status}`} aria-hidden="true">
            {STATUS_LABEL[status].toUpperCase()}
          </span>
          {safeLastRun && (
            <span className="golden-suite-card-lastrun">{safeLastRun}</span>
          )}
        </div>
      </header>
      <div className="golden-suite-card-grid">
        {safeTiles.map((t, i) => {
          const valueAria =
            typeof t.value === 'string' || typeof t.value === 'number'
              ? cap(String(t.value), TILE_VALUE_ARIA_MAX)
              : '';
          return (
            <div
              className={`golden-suite-tile ${t.tone}`.trim()}
              key={t.id ?? `${t.label}-${i}`}
              role="group"
              aria-label={`${t.label}: ${valueAria}`}
            >
              <span className="golden-suite-tile-label">{t.label}</span>
              <span className="golden-suite-tile-value">
                {t.value}
                {t.unit !== undefined && (
                  <span className="golden-suite-tile-unit">{t.unit}</span>
                )}
              </span>
            </div>
          );
        })}
        {safeTrendPct !== undefined && (
          <div className="golden-suite-trend">
            <MiniGauge
              pct={safeTrendPct}
              tone={trendTone}
              ariaLabel={safeTrendNote ?? `Trend ${Math.round(safeTrendPct)}%`}
            />
            {safeTrendNote && (
              <span className="golden-suite-trend-note">{safeTrendNote}</span>
            )}
          </div>
        )}
      </div>
    </figure>
  );
}
