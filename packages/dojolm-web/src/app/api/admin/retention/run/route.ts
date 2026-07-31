// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: POST /api/admin/retention/run — invoke one retention pass
 *          across every configured namespace (audit, sengoku, partial,
 *          intel).
 * Story: WAVE6-RETENTION-POLICY / ADR-0050.
 *
 * Auth: admin-only via `withAuth({ role: 'admin' })`. Retention is an
 * operator action — it deletes files on the server's persistent
 * volume — so we gate at the standard admin posture used by
 * `/api/admin/feature-flags` and the Wave 6 RBAC addition on
 * `/api/ronin/intelligence/poll`.
 *
 * Response shape mirrors `runRetention()`:
 *   { startedAt, completedAt, namespaces: [{ namespace, scanned,
 *     pruned, errors, cutoff, days }, ...] }
 *
 * Emits one `RETENTION_RUN` audit row per invocation with metadata
 * only (no file paths, no user-scoped content).
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/route-guard'
import { runRetention } from '@/lib/retention/policy'
import { auditLog } from '@/lib/audit-logger'

const STANDARD_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const

export const POST = withAuth(
  async (_request: NextRequest, { user }) => {
    try {
      const result = await runRetention()

      try {
        await auditLog.retentionRun({
          user: user.username,
          namespaces: result.namespaces.map((n) => ({
            namespace: n.namespace,
            scanned: n.scanned,
            pruned: n.pruned,
            errors: n.errors,
            days: n.days,
          })),
        })
      } catch (auditErr) {
        console.error('[admin/retention/run] audit write failed (non-fatal):',
          auditErr instanceof Error ? auditErr.message : 'unknown')
      }

      return NextResponse.json(result, { status: 200, headers: STANDARD_HEADERS })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[admin/retention/run] error:', detail)
      return NextResponse.json(
        { error: 'Retention pass failed' },
        { status: 500, headers: STANDARD_HEADERS },
      )
    }
  },
  { role: 'admin' },
)
