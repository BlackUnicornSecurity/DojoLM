// SPDX-License-Identifier: Apache-2.0
/**
 * G.29: Bulk-rescore plan generator — operator-rescoreable AIVSS.
 *
 * Pure planner. Given a batch of records carrying old AIVSS scores and
 * the metrics needed to recompute, returns a plan of
 * `{recordId, oldScore, newScore, changed}` entries that the operator
 * can review before applying. The actual application (DB writes, audit
 * log) is OUT-OF-SCOPE — this is foundation-only.
 *
 * Reference: master checklist §2 — "AIVSS scoring is operator-
 * rescore-able (TICKET-G29 bulk-rescore tool merged)".
 *
 * R-T1 closed-enum discipline — `outcome` is a closed-enum string
 * union ('changed' | 'unchanged' | 'failed') so consumers render via
 * a closed map without `default:` fall-through.
 */

import { calculate } from './aivss-calculator';
import type { AivssMetrics, AivssScore } from './aivss-spec';

/**
 * Closed-enum tuple of rescore outcomes. Consumers should `switch`
 * exhaustively or use a closed `Record<RescoreOutcome, …>` map.
 */
export const RESCORE_OUTCOMES = ['changed', 'unchanged', 'failed'] as const;
export type RescoreOutcome = (typeof RESCORE_OUTCOMES)[number];

/**
 * Input record. The plan generator does NOT mutate `metrics` — they
 * stay frozen by the caller. `oldScore` may be null when the record
 * predates AIVSS instrumentation.
 */
export interface RescoreInputRecord {
  readonly recordId: string;
  readonly metrics: AivssMetrics;
  readonly oldScore: AivssScore | null;
}

/**
 * Plan entry. Frozen; consumer applies via a separate update path.
 */
export interface RescorePlanEntry {
  readonly recordId: string;
  readonly outcome: RescoreOutcome;
  readonly oldScore: AivssScore | null;
  /** New score on outcome='changed'|'unchanged'; null on outcome='failed'. */
  readonly newScore: AivssScore | null;
  /** Failure detail on outcome='failed'; empty string otherwise. */
  readonly failureReason: string;
}

/**
 * Plan summary — counts by outcome plus the entries.
 */
export interface RescorePlan {
  readonly entries: ReadonlyArray<RescorePlanEntry>;
  readonly counts: Readonly<Record<RescoreOutcome, number>>;
  readonly totalProcessed: number;
}

/**
 * Compare two AivssScore values for full equality (all 5 fields).
 * `vector` is the canonical serialization, so equality there implies
 * metric-set equality; the other fields are derived from the same
 * metrics, but we compare them too so a calibration-table change
 * (different weights, same vector) registers as 'changed'.
 */
function scoresEqual(a: AivssScore, b: AivssScore): boolean {
  return (
    a.base === b.base &&
    a.severity === b.severity &&
    a.temporal === b.temporal &&
    a.environmental === b.environmental &&
    a.vector === b.vector
  );
}

/**
 * Build a single plan entry from one input record. Pure — no I/O,
 * fully frozen on return.
 */
function buildEntry(record: RescoreInputRecord): RescorePlanEntry {
  let newScore: AivssScore;
  try {
    newScore = calculate(record.metrics);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown';
    return Object.freeze({
      recordId: record.recordId,
      outcome: 'failed' as const,
      oldScore: record.oldScore,
      newScore: null,
      failureReason: reason,
    });
  }

  const outcome: RescoreOutcome =
    record.oldScore !== null && scoresEqual(record.oldScore, newScore) ? 'unchanged' : 'changed';

  return Object.freeze({
    recordId: record.recordId,
    outcome,
    oldScore: record.oldScore,
    newScore,
    failureReason: '',
  });
}

/**
 * Build a rescore plan over a batch of records. The plan is fully
 * frozen (entries array + each entry + counts map).
 *
 * `outcome` semantics:
 *   - 'changed':   `calculate(metrics)` produced a score that differs
 *                  from `oldScore` (or oldScore was null and now is
 *                  not).
 *   - 'unchanged': `calculate(metrics)` produced an identical score.
 *   - 'failed':    `calculate(metrics)` threw — `failureReason` carries
 *                  the message; the record stays in the plan so
 *                  operators can investigate, but `newScore` is null.
 *
 * Score equality compares all five {@link AivssScore} fields
 * (base, severity, temporal, environmental, vector) — vector is the
 * canonical serialization so equality there implies metric-set
 * equality.
 *
 * Counts are accumulated via spread-immutable folding (O(N²) on the
 * tiny 3-key counts object) per project immutability rule. N is bounded
 * by operator chunk size, so the cost is negligible at expected scale.
 */
export function buildRescorePlan(records: readonly RescoreInputRecord[]): RescorePlan {
  const entries = records.map(buildEntry);

  const counts = entries.reduce<Readonly<Record<RescoreOutcome, number>>>(
    (acc, entry) =>
      Object.freeze({
        ...acc,
        [entry.outcome]: acc[entry.outcome] + 1,
      }),
    Object.freeze({ changed: 0, unchanged: 0, failed: 0 }),
  );

  return Object.freeze({
    entries: Object.freeze([...entries]),
    counts,
    totalProcessed: entries.length,
  });
}
