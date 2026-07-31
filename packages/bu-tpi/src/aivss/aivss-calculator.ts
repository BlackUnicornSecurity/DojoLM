// SPDX-License-Identifier: Apache-2.0
/**
 * AIVSS Calculator — pure function `calculate(metrics) → AivssScore`.
 *
 * Phase G.1 / TICKET-G1 — V1→V2 Restoration program.
 *
 * Implements the canonical math from ADR-0097 §3:
 *   exploitability = AV_WEIGHT × AC_WEIGHT
 *   aiContext      = (PIS + MC + DS) / 3
 *   impact         = 1 − (1 − CI)(1 − II)(1 − AI)
 *   baseRaw        = exploitability × 0.4 + aiContext × 0.3 + impact × 0.3
 *   base           = round(baseRaw × 100) / 10        // 1-decimal precision
 *   temporal       = base × E_WEIGHT                  (when E provided, else null)
 *   environmental  = temporal × S_WEIGHT × RL_WEIGHT  (when both S+RL provided, else null)
 *   severity       = band against (environmental ?? base)
 *
 * @see ADR-0097 §3 — Scoring formula
 */

import {
  AC_WEIGHTS,
  AV_WEIGHTS,
  BAND_THRESHOLDS,
  DS_WEIGHTS,
  E_WEIGHTS,
  IMPACT_WEIGHTS,
  MC_WEIGHTS,
  PIS_WEIGHTS,
  RL_WEIGHTS,
  S_WEIGHTS,
  type AivssBand,
  type AivssMetrics,
  type AivssScore,
} from './aivss-spec';
import { serializeVector } from './aivss-vector';

/**
 * Project a raw 0..1-scale score to a 0..10 1-decimal-precision scale, clamped.
 *
 * Per ADR-0097 §3: `Math.round(rawZeroToOne × 100) / 10`. Input is the unscaled
 * 0..1 weighted sum from the formula; output is 0.0..10.0 with one-decimal
 * precision (the canonical reportable score).
 */
function projectAndRound(rawZeroToOne: number): number {
  const clamped = Math.max(0, Math.min(1, rawZeroToOne));
  return Math.round(clamped * 100) / 10;
}

/**
 * Round an already-on-0..10-scale score to 1-decimal precision, clamped.
 *
 * Used for temporal / environmental, which multiply a 0..10 base by 0..~1.08
 * weights and need to be re-rounded.
 */
function round1OnTen(valueOnTen: number): number {
  const clamped = Math.max(0, Math.min(10, valueOnTen));
  return Math.round(clamped * 10) / 10;
}

/**
 * Resolve the severity band for a final score against {@link BAND_THRESHOLDS}.
 *
 * Closed-enum exhaustive check via {@link AIVSS_BANDS} iteration order.
 */
function resolveBand(score: number): AivssBand {
  // Iterate explicit closed-enum order: none < low < medium < high < critical.
  // Inclusive thresholds — pick the FIRST band where score ≤ max.
  if (score <= BAND_THRESHOLDS.none.max) return 'none';
  if (score <= BAND_THRESHOLDS.low.max) return 'low';
  if (score <= BAND_THRESHOLDS.medium.max) return 'medium';
  if (score <= BAND_THRESHOLDS.high.max) return 'high';
  return 'critical';
}

/**
 * Calculate an {@link AivssScore} from {@link AivssMetrics}.
 *
 * Pure / deterministic — no side effects, no randomness, no I/O. Same input always
 * yields identical output (verified by AIVSS-005 test).
 *
 * Optional temporal/environmental metrics:
 * - If `exploitability` is omitted, `temporal` is `null` and the base flows directly
 *   into the band lookup.
 * - If `scope` AND `remediationLevel` are both omitted, `environmental` is `null`.
 *   (Both are required for the environmental compound — they multiply through together.)
 *
 * @param metrics — 8 required base + 3 optional (1 temporal + 2 environmental)
 * @returns base + temporal + environmental + severity + serialized vector
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §4 — `AivssScore` shape
 */
export function calculate(metrics: AivssMetrics): AivssScore {
  // §3 — Base computation
  const exploitability =
    AV_WEIGHTS[metrics.attackVector] * AC_WEIGHTS[metrics.attackComplexity];

  const aiContext =
    (PIS_WEIGHTS[metrics.promptInjectionSuccess] +
      MC_WEIGHTS[metrics.modelCriticality] +
      DS_WEIGHTS[metrics.dataSensitivity]) /
    3;

  const impact =
    1 -
    (1 - IMPACT_WEIGHTS[metrics.confidentialityImpact]) *
      (1 - IMPACT_WEIGHTS[metrics.integrityImpact]) *
      (1 - IMPACT_WEIGHTS[metrics.availabilityImpact]);

  const baseRaw = exploitability * 0.4 + aiContext * 0.3 + impact * 0.3;
  const base = projectAndRound(baseRaw);

  // §3 — Temporal computation (only when E provided)
  const temporal: number | null =
    metrics.exploitability !== undefined
      ? round1OnTen(base * E_WEIGHTS[metrics.exploitability])
      : null;

  // §3 — Environmental computation (only when BOTH S+RL provided; needs temporal)
  const environmental: number | null =
    metrics.scope !== undefined && metrics.remediationLevel !== undefined && temporal !== null
      ? round1OnTen(temporal * S_WEIGHTS[metrics.scope] * RL_WEIGHTS[metrics.remediationLevel])
      : null;

  // §2 — Severity band against the FINAL score (env ?? base; temporal is intermediate only)
  const finalScore = environmental ?? base;
  const severity = resolveBand(finalScore);

  // §5 — Vector string for stable transport / display
  const vector = serializeVector(metrics);

  return {
    base,
    temporal,
    environmental,
    severity,
    vector,
  };
}
