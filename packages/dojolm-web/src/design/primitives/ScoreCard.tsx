// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';
import { cap, capOpt } from './_caps';

export type ScoreCardTrend = 'up' | 'down' | 'flat';
export type ScoreCardTone = '' | 'jade' | 'gold' | 'red' | 'steel' | 'violet';

export interface ScoreCardProps {
  /** Mono eyebrow label (e.g. "Faithfulness", "Refusal accuracy"). */
  label: string;
  /** Big-number value — accepts pre-formatted strings (e.g. "0.84", "92%"). */
  value: ReactNode;
  /** Optional unit suffix rendered small after the big number (e.g. "/100"). */
  unit?: ReactNode;
  /** Trend arrow + sign — caller decides which direction is "good". */
  trend?: ScoreCardTrend;
  /** Optional pre-formatted trend delta (e.g. "+0.04 vs baseline"). */
  trendNote?: string;
  /**
   * Optional percentile chip (0–100). Renders a mono "PXX" pill in the
   * header — e.g. percentile=92 → "P92".
   */
  percentile?: number;
  /** Color swatch driving the big-number color via `.score-card.<tone>`. */
  tone?: ScoreCardTone;
}

const LABEL_MAX = 80;
const NOTE_MAX = 120;

const TREND_GLYPH: Record<ScoreCardTrend, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

const TREND_WORD: Record<ScoreCardTrend, string> = {
  up: 'up',
  down: 'down',
  flat: 'flat',
};

/**
 * Kotoba numeric score card. Eyebrow label, big mono number, optional
 * unit, optional trend arrow + sentence note, optional percentile chip.
 * The card itself is a `figure` landmark with an `aria-label` summary;
 * the trend glyph is `aria-hidden` because its meaning is duplicated in
 * the summary string (per ARIA 1.2 — visible icon paired with verbal
 * cue should not appear twice in the AT layer).
 */
export function ScoreCard({
  label,
  value,
  unit,
  trend,
  trendNote,
  percentile,
  tone = '',
}: ScoreCardProps) {
  const safeLabel = cap(label, LABEL_MAX);
  const safeNote = capOpt(trendNote, NOTE_MAX);
  const clampedPct =
    percentile === undefined
      ? undefined
      : Math.max(0, Math.min(100, Math.round(percentile)));
  const valueText = typeof value === 'string' || typeof value === 'number'
    ? `${value}`
    : '';
  const summaryParts = [
    `${safeLabel}: ${valueText || 'score'}`,
    trend ? TREND_WORD[trend] : undefined,
    clampedPct !== undefined ? `percentile ${clampedPct}` : undefined,
  ].filter(Boolean) as string[];
  return (
    <div
      className={`score-card ${tone}`.trim()}
      role="figure"
      aria-label={summaryParts.join(' · ')}
    >
      <header className="score-card-head">
        <span className="score-card-label">{safeLabel}</span>
        {clampedPct !== undefined && (
          <span className="score-card-percentile" aria-hidden="true">
            P{clampedPct}
          </span>
        )}
      </header>
      <div className="score-card-value-row">
        <span className="score-card-value">{value}</span>
        {unit !== undefined && (
          <span className="score-card-unit">{unit}</span>
        )}
        {trend && (
          <span className={`score-card-trend ${trend}`} aria-hidden="true">
            {TREND_GLYPH[trend]}
          </span>
        )}
      </div>
      {safeNote && <span className="score-card-note">{safeNote}</span>}
    </div>
  );
}
