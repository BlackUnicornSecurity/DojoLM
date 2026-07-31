// SPDX-License-Identifier: Apache-2.0
// @orphan-tracked -- G-052 v1-v2-restore-compliance-bushido-views.md (audit-trail UI)
/**
 * File: route.ts
 * Purpose: GET /api/admin/audit — admin-gated query surface over the
 *          file-backed audit log.
 * Story: WAVE6-AUDIT-QUERY-API / ADR-0052.
 *
 * Query params (all optional):
 *   - `event`  — exact-match event type (e.g. `LLM_BUDGET_EXCEEDED`).
 *   - `user`   — exact-match on `details.user`.
 *   - `level`  — `info` | `warn` | `error`.
 *   - `since`  — ISO 8601 timestamp (default: 7 days ago).
 *   - `until`  — ISO 8601 timestamp (default: now).
 *   - `limit`  — 1-500, default 50.
 *   - `offset` — default 0.
 *
 * Response shape:
 *   {
 *     entries: [ { timestamp, level, event, details } ],
 *     totalMatched: number,
 *     limit: number,
 *     offset: number,
 *     hasMore: boolean,
 *     since: ISO,
 *     until: ISO,
 *   }
 *
 * Auth: admin-only via `withAuth({ role: 'admin' })`. Audit log
 * contents are operator-sensitive (username activity, feature flag
 * state, IDOR probe counts); analysts should not see them.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/route-guard'
import { queryAuditLog, type AuditQueryFilter } from '@/lib/audit-query/query'

const LEVELS: ReadonlySet<string> = new Set(['info', 'warn', 'error'])
const STANDARD_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const

function parseIntParam(value: string | null): number | undefined {
  if (value === null) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const event = searchParams.get('event') ?? undefined
      const user = searchParams.get('user') ?? undefined
      const levelRaw = searchParams.get('level')
      const since = searchParams.get('since') ?? undefined
      const until = searchParams.get('until') ?? undefined
      const limit = parseIntParam(searchParams.get('limit'))
      const offset = parseIntParam(searchParams.get('offset'))

      if (levelRaw !== null && !LEVELS.has(levelRaw)) {
        return NextResponse.json(
          { error: 'level must be one of info / warn / error' },
          { status: 400, headers: STANDARD_HEADERS },
        )
      }

      const filter: AuditQueryFilter = {
        event, user, since, until, limit, offset,
        level: levelRaw === null ? undefined : (levelRaw as AuditQueryFilter['level']),
      }
      const result = await queryAuditLog(filter)
      return NextResponse.json(result, { status: 200, headers: STANDARD_HEADERS })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[admin/audit] query error:', detail)
      return NextResponse.json(
        { error: 'audit query failed' },
        { status: 500, headers: STANDARD_HEADERS },
      )
    }
  },
  { role: 'admin' },
)
