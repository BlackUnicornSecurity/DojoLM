// SPDX-License-Identifier: Apache-2.0
/**
 * File: transfer-signal.ts
 * Purpose: Pure aggregator that derives a per-model temporal drift
 *          vector from stored Sengoku runs. Feeds the transfer-matrix
 *          extension (WAVE4-TM-P3 / ADR-0029) with a second
 *          similarity signal complementing the arena-category Jaccard.
 *
 * The drift vector has one component per `AttackType`: the fraction
 * of turns across all runs for that model+attackType that ended in
 * `complied` or `drift_detected`. Pairs of models with similar
 * vectors failed under temporal pressure in similar ways.
 *
 * Corresponds to the "Kagami drift" signal in the plan — Kagami is
 * the handover's shorthand for Sengoku Temporal drift, not a
 * separate feature module.
 */

import type { AttackType, RunRecord } from './fixtures'

export interface TemporalDriftVector {
  /** One component per attack type, value in [0, 1]. */
  readonly components: ReadonlyMap<AttackType, number>
  /** Number of runs that contributed to the vector. */
  readonly runCount: number
}

export type TemporalDriftSignalMap = ReadonlyMap<string, TemporalDriftVector>

export interface TemporalDriftSignalOptions {
  /**
   * Minimum number of attributed runs a model must have before it
   * is included in the signal. Defaults to 5 per plan §5 (D5).
   */
  readonly minObservations?: number
}

const DEFAULT_MIN_OBSERVATIONS = 5

interface Accumulator {
  readonly perAttackType: Map<AttackType, { drifted: number; total: number }>
  runCount: number
}

function bumpAccumulator(acc: Accumulator, run: RunRecord): void {
  const bucket = acc.perAttackType.get(run.attackType)
    ?? { drifted: 0, total: 0 }
  const drifted = run.summary.compliances + run.summary.driftDetections
  const total = run.summary.turnCount
  acc.perAttackType.set(run.attackType, {
    drifted: bucket.drifted + drifted,
    total: bucket.total + total,
  })
  acc.runCount += 1
}

/**
 * Compute per-model drift vectors from attributed Sengoku runs. Runs
 * without `modelId` are skipped — they cannot be attributed to a
 * specific model and would smear the signal across providers.
 *
 * Uses `modelId` (not `modelProvider`) as the grouping key so two
 * runs of the same model under different providers still land in the
 * same bucket. Providers are already surfaced elsewhere in the run
 * record for operators that care.
 */
export function computeTemporalDriftSignal(
  runs: readonly RunRecord[],
  options: TemporalDriftSignalOptions = {},
): TemporalDriftSignalMap {
  const minObservations = options.minObservations ?? DEFAULT_MIN_OBSERVATIONS
  const byModel = new Map<string, Accumulator>()

  for (const run of runs) {
    if (run.status !== 'completed') continue
    const modelId = run.modelId
    if (typeof modelId !== 'string' || modelId.length === 0) continue
    const acc = byModel.get(modelId)
      ?? { perAttackType: new Map<AttackType, { drifted: number; total: number }>(), runCount: 0 }
    bumpAccumulator(acc, run)
    byModel.set(modelId, acc)
  }

  const out = new Map<string, TemporalDriftVector>()
  for (const [modelId, acc] of byModel) {
    if (acc.runCount < minObservations) continue
    const components = new Map<AttackType, number>()
    for (const [attackType, bucket] of acc.perAttackType) {
      if (bucket.total === 0) continue
      const ratio = bucket.drifted / bucket.total
      components.set(attackType, Math.min(1, Math.max(0, ratio)))
    }
    out.set(modelId, { components, runCount: acc.runCount })
  }
  return out
}

/**
 * Cosine similarity between two drift vectors. Missing components
 * are treated as zero. Returns a value in `[0, 1]` (vectors are
 * non-negative, so the dot product cannot be negative) or `null`
 * when either vector has zero magnitude.
 */
export function temporalDriftSimilarity(
  a: TemporalDriftVector,
  b: TemporalDriftVector,
): number | null {
  const keys = new Set<AttackType>()
  for (const k of a.components.keys()) keys.add(k)
  for (const k of b.components.keys()) keys.add(k)
  let dot = 0
  let magA = 0
  let magB = 0
  for (const k of keys) {
    const va = a.components.get(k) ?? 0
    const vb = b.components.get(k) ?? 0
    dot += va * vb
    magA += va * va
    magB += vb * vb
  }
  if (magA === 0 || magB === 0) return null
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}
