// SPDX-License-Identifier: Apache-2.0
/**
 * File: llm-budget.ts
 * Purpose: Per-feature, per-minute LLM call budget enforcement.
 *          Provides a secondary spend cap on top of each route's
 *          existing rate limiter so an attacker who slips past the
 *          route-level limiter (API-key fingerprint drift, distinct
 *          IPs hitting different routes that share an LLM provider,
 *          etc.) cannot spike provider costs without bound.
 *
 * Story: WAVE4-LLM-RATE-LIMIT / ADR-0036.
 *
 * Gating: enforcement is OFF by default. An operator opts in by
 * setting `LLM_CALL_LIMIT_PER_MIN` to a positive integer at deploy
 * time. The limit applies independently to each `LlmBudgetFeature`
 * — `kotoba.llm` calls do not consume `sengoku.llm` budget and
 * vice versa.
 *
 * Storage: in-memory module-level rolling window. Survives a hot
 * reload because Next.js module caching keeps the singleton, but
 * does NOT survive a process restart — that is intentional. The
 * budget is a spike protector, not an accountancy ledger; the
 * audit log (LLM_CALL_COMPLETED, ADR-0035) is the source of
 * truth for billing reconciliation.
 *
 * Failure mode: every internal failure (env-var parse error,
 * audit-write failure) defaults to *allow*. A broken budget
 * helper must never block a legitimate LLM call.
 */

import { auditLog } from '@/lib/audit-logger'
import { llmBudgetRejectionsTotal } from '@/lib/metrics/registry'

export type LlmBudgetFeature = 'kotoba.llm' | 'sengoku.llm'

const ENV_VAR = 'LLM_CALL_LIMIT_PER_MIN'
const WINDOW_MS = 60_000

const callTimestamps: Map<LlmBudgetFeature, number[]> = new Map()
// Tracks per-feature saturation state: true after a rejection, cleared
// on the next successful consume. Guarantees the audit log gets one
// LLM_BUDGET_EXCEEDED entry per saturation event rather than one per
// rejected call (avoids audit-log floods on sustained spikes).
const inSaturation: Map<LlmBudgetFeature, boolean> = new Map()

function readLimit(): number | null {
  const raw = process.env[ENV_VAR]
  if (raw === undefined || raw.length === 0) return null
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function pruneOldEntries(timestamps: number[], cutoff: number): number[] {
  // Walk forward — entries are appended in monotonic order, so the
  // first index whose value is >= cutoff is the new head.
  let firstFresh = 0
  while (firstFresh < timestamps.length && timestamps[firstFresh] < cutoff) {
    firstFresh += 1
  }
  return firstFresh === 0 ? timestamps : timestamps.slice(firstFresh)
}

/**
 * Consume one budget unit for the given feature. Returns:
 *   - `true`  → the call is allowed. The current call has been
 *               recorded against the rolling window.
 *   - `false` → the call is blocked. Budget exhausted for this
 *               feature in the current minute. An LLM_BUDGET_EXCEEDED
 *               audit entry is emitted (fire-and-forget) on the
 *               first rejection within a window so operators can see
 *               the spike without a per-rejection log flood.
 */
export function consumeLlmBudget(
  feature: LlmBudgetFeature,
  now: number = Date.now(),
): boolean {
  const limit = readLimit()
  // Unlimited by default — operators opt in via env. Skip the
  // timestamp append entirely so a long-running unlimited deployment
  // does not accumulate timestamps for entries nothing ever reads.
  if (limit === null) return true

  const cutoff = now - WINDOW_MS
  const fresh = pruneOldEntries(callTimestamps.get(feature) ?? [], cutoff)

  if (fresh.length >= limit) {
    callTimestamps.set(feature, fresh)
    // Wave 6 metrics instrumentation — every rejected call bumps
    // the counter, even if the saturation-dedup keeps the audit
    // log quiet. Operators want an accurate rejection rate, not a
    // sampled-one-per-spike count.
    llmBudgetRejectionsTotal.inc({ feature })
    if (inSaturation.get(feature) !== true) {
      inSaturation.set(feature, true)
      void emitBudgetExceeded(feature, limit, fresh.length)
    }
    return false
  }

  fresh.push(now)
  callTimestamps.set(feature, fresh)
  inSaturation.set(feature, false)
  return true
}

async function emitBudgetExceeded(
  feature: LlmBudgetFeature,
  limit: number,
  observed: number,
): Promise<void> {
  try {
    await auditLog.llmBudgetExceeded({
      feature,
      limitPerMin: limit,
      observedInWindow: observed,
      windowMs: WINDOW_MS,
    })
  } catch (err) {
    console.error('[llm-budget] audit write failed (non-fatal):',
      err instanceof Error ? err.message : 'unknown')
  }
}

/**
 * Test-only escape hatch — clears the rolling window so each test
 * starts from a fresh budget. Not exported from the package barrel;
 * import directly from `@/lib/llm-budget` if you need it.
 */
export function __resetLlmBudgetForTests(): void {
  callTimestamps.clear()
  inSaturation.clear()
}
