// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';
import { cap, capOpt } from './_caps';

export type SwapDeltaTone = '' | 'jade' | 'gold' | 'red' | 'steel';

export interface SwapMetric {
  /** Mono eyebrow label (e.g. "Cost", "Latency", "Score"). */
  label: string;
  /** Stringified value with unit (e.g. "$0.12 / 1k", "320ms", "0.84"). */
  current: string;
  /** Stringified value with unit (e.g. "$0.04 / 1k", "180ms", "0.86"). */
  proposed: string;
  /** Optional pre-formatted delta string (e.g. "−66%", "−140ms", "+0.02"). */
  delta?: string;
  /** Tone for the delta swatch — caller decides the win/loss semantic. */
  deltaTone?: SwapDeltaTone;
}

export interface SwapCandidateProps {
  /** Current production model identifier (capped at 80 chars). */
  currentName: string;
  /** Proposed swap candidate (capped at 80 chars). */
  proposedName: string;
  /** Up to `SWAP_CANDIDATE_MAX_METRICS` rows of cost/latency/score deltas. */
  metrics: SwapMetric[];
  /** Optional eyebrow / classification chip (e.g. "Verified · 3 evals"). */
  badge?: ReactNode;
  /** Right-edge action slot (e.g. "Promote" / "Dismiss" buttons). */
  actions?: ReactNode;
}

/** Defensive cap on metric rows; UI envelope is 3–4 metrics. */
export const SWAP_CANDIDATE_MAX_METRICS = 16;
const NAME_MAX = 80;
const METRIC_LABEL_MAX = 40;
const METRIC_VALUE_MAX = 64;

/**
 * Jutsu model-swap recommendation card. Two columns (current vs
 * proposed) + per-metric delta swatch. The card itself is a `figure`
 * landmark with a sentence-summary `aria-label`; metric rows are
 * decorative inside the figure (no nested landmark).
 */
export function SwapCandidate({
  currentName,
  proposedName,
  metrics,
  badge,
  actions,
}: SwapCandidateProps) {
  const safeCurrent = cap(currentName, NAME_MAX);
  const safeProposed = cap(proposedName, NAME_MAX);
  const safeMetrics = metrics.slice(0, SWAP_CANDIDATE_MAX_METRICS).map((m) => ({
    label: cap(m.label, METRIC_LABEL_MAX),
    current: cap(m.current, METRIC_VALUE_MAX),
    proposed: cap(m.proposed, METRIC_VALUE_MAX),
    delta: capOpt(m.delta, METRIC_VALUE_MAX),
    deltaTone: m.deltaTone ?? '',
  }));
  const summary = `Swap candidate — current ${safeCurrent}, proposed ${safeProposed}`;
  return (
    <div className="swap-candidate" role="figure" aria-label={summary}>
      <header className="swap-candidate-head">
        <div className="swap-candidate-cols">
          <div className="swap-candidate-col">
            <span className="swap-candidate-eyebrow">Current</span>
            <b className="swap-candidate-name">{safeCurrent}</b>
          </div>
          <span className="swap-candidate-arrow" aria-hidden="true">
            →
          </span>
          <div className="swap-candidate-col">
            <span className="swap-candidate-eyebrow">Proposed</span>
            <b className="swap-candidate-name">{safeProposed}</b>
          </div>
        </div>
        {badge !== undefined && (
          <span className="swap-candidate-badge">{badge}</span>
        )}
      </header>
      {safeMetrics.length > 0 && (
        <dl className="swap-candidate-metrics">
          {safeMetrics.map((m, i) => (
            <div className="swap-candidate-metric" key={`${m.label}-${i}`}>
              <dt className="swap-candidate-metric-label">{m.label}</dt>
              <dd className="swap-candidate-metric-values">
                <span className="swap-candidate-metric-current">{m.current}</span>
                <span className="swap-candidate-metric-arrow" aria-hidden="true">
                  →
                </span>
                <span className="swap-candidate-metric-proposed">{m.proposed}</span>
                {m.delta !== undefined && (
                  <span
                    className={`swap-candidate-delta ${m.deltaTone}`.trim()}
                  >
                    {m.delta}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {actions !== undefined && (
        <div className="swap-candidate-actions">{actions}</div>
      )}
    </div>
  );
}
