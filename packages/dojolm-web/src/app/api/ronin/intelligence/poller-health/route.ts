// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/ronin/intelligence/poller-health — returns the
 *          most recent poller run summary (timestamps, per-source
 *          counts, errors).
 * Story: WAVE3-INTEL-INGEST / ADR-0026.
 *
 * Auth-required (session or API key). The endpoint reveals whether
 * the ingestion pipeline is healthy but carries no intel content
 * itself — operator-visible diagnostic surface only.
 *
 * Feature-flagged: 503 when `ronin.intel-ingest` is disabled so
 * clients get a clear signal when the pipeline is off rather than
 * "no health record yet".
 */

import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { isEnabled } from '@/lib/feature-flags'
import { readPollerHealth } from '@/lib/ronin/intel-poller'

export const GET = createApiHandler(
  async () => {
    if (!isEnabled('ronin.intel-ingest')) {
      return NextResponse.json(
        { error: 'ronin.intel-ingest feature is not enabled' },
        { status: 503 },
      )
    }

    try {
      const health = await readPollerHealth()
      if (health === null) {
        return NextResponse.json(
          { status: 'no-runs-yet', lastRun: null },
          { status: 200 },
        )
      }
      return NextResponse.json({
        status: health.totals.errors === 0 ? 'healthy' : 'degraded',
        lastRun: health,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[ronin/intelligence/poller-health] error:', detail)
      return NextResponse.json(
        { error: 'Failed to read health' },
        { status: 500 },
      )
    }
  },
  { rateLimit: 'read' },
)
