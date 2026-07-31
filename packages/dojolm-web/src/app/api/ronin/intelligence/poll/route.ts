// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: POST /api/ronin/intelligence/poll — trigger a single pass of
 *          the CVE + AI Incident DB ingestion pipeline.
 * Story: WAVE3-INTEL-INGEST / ADR-0026; admin-only gate added by
 *        WAVE6-POLL-NOW-RBAC / ADR-0048; YR.21 — G-073 closeout
 *        migrated wrapper from `createApiHandler` (with in-handler RBAC)
 *        to `withAuth({role:'admin'})` (RBAC at the guard layer).
 *
 * Feature-flagged: returns 503 when `ronin.intel-ingest` is disabled
 * (via `RONIN_INTEL_INGEST_ENABLED` env var).
 *
 * Auth-required AND admin-only: pollers touch external network,
 * persist state, and consume upstream feed rate budget. The previous
 * in-handler RBAC branches (with `intelPollForbidden` audit emissions
 * for unauthenticated/non-admin callers) are now unreachable because
 * withAuth returns 401/403 BEFORE the handler runs; the success-path
 * `roninIntelPoll` audit remains as the authoritative emission.
 *
 * Scheduling: this route runs one poll cycle synchronously and
 * returns the result. Deployments should configure an external
 * scheduler (systemd timer, k8s CronJob, external curl cron) to hit
 * this endpoint on a cadence appropriate to the feeds (4h is
 * reasonable). No in-process scheduler ships — Next.js serverless
 * semantics make background loops unreliable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/route-guard'
import { isEnabled } from '@/lib/feature-flags'
import { runPollerOnce } from '@/lib/ronin/intel-poller'
import { auditLog } from '@/lib/audit-logger'

export const POST = withAuth(
  async (_request: NextRequest, { user }) => {
    if (!isEnabled('ronin.intel-ingest')) {
      return NextResponse.json(
        { error: 'ronin.intel-ingest feature is not enabled' },
        { status: 503 },
      )
    }

    try {
      const result = await runPollerOnce()

      try {
        await auditLog.roninIntelPoll({
          user: user.username,
          sources: result.sources.map((s) => s.sourceId),
          totals: result.totals,
        })
      } catch (auditErr) {
        console.error('[ronin/intelligence/poll] audit write failed (non-fatal):',
          auditErr instanceof Error ? auditErr.message : 'unknown')
      }

      return NextResponse.json(result, { status: 200 })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[ronin/intelligence/poll] error:', detail)
      return NextResponse.json(
        { error: 'Poll failed' },
        { status: 500 },
      )
    }
  },
  { role: 'admin' },
)
