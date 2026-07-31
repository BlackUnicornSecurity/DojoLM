// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: API endpoint for dashboard / scanner statistics.
 *
 * E5.S1 (2026-05-08) — extended the response with the 3 audit-aggregated
 * metrics the `/` Sensei dashboard needs to retire its `—` placeholders
 * (F-1-011 / F-1-025 / F-1-036). The pre-existing
 * `{ patternCount, groupCount, sourceCount }` keys are preserved at the
 * top level for backward compatibility (existing callers + tests rely on
 * them), and the new aggregates ride alongside under explicit keys:
 *
 *   {
 *     patternCount, groupCount, sourceCount,           // existing
 *     coverage:  { patternCount, groupCount, sourceCount },
 *     runs:      { last48h, prior48h, lookbackHours: 48 },
 *     blocked:   { last48h, lookbackHours: 48 },
 *     budget:    { exceededLast48h, limitPerMin, configured }
 *   }
 *
 * Each aggregate is a thin slice over the audit log via
 * `queryAuditLog`. Sources:
 *   - `runs.last48h`     ← count of `SCAN_EXECUTED` audit events in last 48h
 *   - `runs.prior48h`    ← same, the PRIOR 48h window (96h→48h ago); backs the
 *                          dashboard "▲ N vs prior" delta (v2-skin parity)
 *   - `blocked.last48h`  ← count of `GUARD_MODE_BLOCK` audit events in last 48h
 *   - `budget.exceededLast48h`     ← count of `LLM_BUDGET_EXCEEDED` events in last 48h
 *   - `budget.limitPerMin`         ← `LLM_CALL_LIMIT_PER_MIN` env var (or null)
 *
 * Failure mode: if the audit-log walk throws (no audit dir, mid-rotation),
 * the aggregate keys collapse to `null` rather than crashing the whole
 * response. The dashboard's `useDashboardStats` hook treats `null` as
 * "data unavailable" and renders the stale `—` placeholder + a helpful
 * label. Pattern-library counts are still authoritative.
 *
 * Index:
 * - GET handler (line 50)
 * - aggregateRecentEvent helper (line 80)
 */

import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/demo'
import { demoStatsGet } from '@/lib/demo/mock-api-handlers'
import { getPatternCount, getPatternGroups } from '@dojolm/scanner'
import { withAuth } from '@/lib/auth/route-guard'
import { queryAuditLog } from '@/lib/audit-query/query'

const LOOKBACK_HOURS = 48
const LOOKBACK_MS = LOOKBACK_HOURS * 60 * 60 * 1000

type AggregateValue = number | null

interface DashboardAggregates {
  readonly runsLast48h: AggregateValue
  readonly runsPrior48h: AggregateValue
  readonly blockedLast48h: AggregateValue
  readonly budgetExceededLast48h: AggregateValue
}

/**
 * Count audit-log entries matching `event` over an explicit `[sinceMs,
 * untilMs]` window. `queryAuditLog` treats both bounds as INCLUSIVE
 * (query.ts: `ts < since || ts > until`), so the current/prior windows —
 * which touch at `now - LOOKBACK_MS` — could in principle both count an
 * event landing on that exact millisecond. That boundary coincidence is
 * negligible in practice and symmetric (it wouldn't skew the delta sign).
 * Returns `null` on any read failure so the caller can surface a "data
 * unavailable" tile rather than fabricating a zero. A zero return is
 * genuine: the audit log was readable AND no matching event occurred.
 */
async function countEventWindow(
  event: string,
  sinceMs: number,
  untilMs: number,
): Promise<AggregateValue> {
  try {
    const since = new Date(sinceMs).toISOString()
    const until = new Date(untilMs).toISOString()
    // queryAuditLog caps `limit` at 500; we only need the totalMatched
    // counter. Pass limit=1 to keep the response payload small while
    // still walking every matching line.
    const result = await queryAuditLog({ event, since, until, limit: 1 })
    return result.totalMatched
  } catch (err) {
    console.error(`[stats] countEventWindow(${event}) failed:`, err)
    return null
  }
}

async function collectAggregates(now: number): Promise<DashboardAggregates> {
  // v2-skin parity — the Scan-runs KPI sub renders an honest "▲ N vs
  // prior" delta (design wave-a Command Center), sourced from a second
  // audit walk over the PRIOR 48h window (96h→48h ago). Never invented:
  // a failed walk yields null and the card falls back to window copy.
  const [runsLast48h, runsPrior48h, blockedLast48h, budgetExceededLast48h] =
    await Promise.all([
      countEventWindow('SCAN_EXECUTED', now - LOOKBACK_MS, now),
      countEventWindow('SCAN_EXECUTED', now - 2 * LOOKBACK_MS, now - LOOKBACK_MS),
      countEventWindow('GUARD_MODE_BLOCK', now - LOOKBACK_MS, now),
      countEventWindow('LLM_BUDGET_EXCEEDED', now - LOOKBACK_MS, now),
    ])
  return { runsLast48h, runsPrior48h, blockedLast48h, budgetExceededLast48h }
}

/**
 * Read the operator-configured per-minute LLM call cap. Returns `null`
 * when unconfigured (the dashboard renders that as "no cap set" rather
 * than fabricating a zero).
 */
function readLlmCallLimitPerMin(): number | null {
  const raw = process.env.LLM_CALL_LIMIT_PER_MIN
  if (raw === undefined || raw.length === 0) return null
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

/**
 * GET /api/stats
 * Returns scanner statistics + 48h dashboard aggregates.
 */
export const GET = withAuth(
  async (_request: NextRequest) => {
    if (isDemoMode()) return demoStatsGet()

    try {
      const patternCount = getPatternCount()
      const patternGroups = getPatternGroups()
      const groupCount = patternGroups.length
      const sourceCount = new Set(
        patternGroups.map((g: { source?: string }) => g.source),
      ).size

      const aggregates = await collectAggregates(Date.now())
      const limitPerMin = readLlmCallLimitPerMin()

      // PT-INFO-M06 fix: Return summary counts only, not detailed pattern group names
      // (pattern group names could help attackers craft evasion strategies)
      return NextResponse.json(
        {
          // Backward-compatible top-level keys.
          patternCount,
          groupCount,
          sourceCount,
          // E5.S1 aggregates — explicit shape for the 4 dashboard cards.
          coverage: {
            patternCount,
            groupCount,
            sourceCount,
          },
          runs: {
            last48h: aggregates.runsLast48h,
            prior48h: aggregates.runsPrior48h,
            lookbackHours: LOOKBACK_HOURS,
          },
          blocked: {
            last48h: aggregates.blockedLast48h,
            lookbackHours: LOOKBACK_HOURS,
          },
          budget: {
            exceededLast48h: aggregates.budgetExceededLast48h,
            lookbackHours: LOOKBACK_HOURS,
            limitPerMin,
            configured: limitPerMin !== null,
          },
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    } catch (error) {
      console.error('Stats API error:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve scanner statistics' },
        { status: 500 },
      )
    }
  },
  { role: 'admin' },
);
