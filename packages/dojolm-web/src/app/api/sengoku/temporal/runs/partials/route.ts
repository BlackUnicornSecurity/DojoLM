// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/sengoku/temporal/runs/partials?planId=X —
 *          list partial (resumable) Temporal runs, newest-first.
 * Story: WAVE6-RESUME-API / ADR-0047.
 *
 * GET (public read): returns the checkpoint metadata for each
 *   `<TPI_DATA_DIR>/sengoku/runs/*.partial.json`, optionally filtered
 *   by planId. Turn content is not returned — the UI only needs the
 *   `runId`, timing, and usage rollup to decide whether to offer a
 *   Resume affordance. Matches the `IntelligenceTab` pattern of
 *   surfacing the availability of a follow-up action without
 *   exposing the underlying content.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { listPartialRuns } from '@/lib/sengoku/partial-runs'

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export const GET = createApiHandler(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const planIdRaw = searchParams.get('planId')
      const planId = planIdRaw === null ? undefined : planIdRaw
      if (planId !== undefined && !ID_PATTERN.test(planId)) {
        return NextResponse.json(
          { error: 'planId must be alphanumeric (1-64 chars)' },
          { status: 400 },
        )
      }
      const records = await listPartialRuns(planId)
      const partials = records.map((record) => ({
        runId: record.runId,
        planId: record.planId,
        planName: record.planName,
        attackType: record.attackType,
        startedAt: record.startedAt,
        checkpointedAt: record.checkpointedAt,
        completedUserTurnCount: record.completedUserTurnCount,
        usage: record.usage,
      }))
      return NextResponse.json({ partials }, {
        headers: { 'Cache-Control': 'no-store' },
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[sengoku/partials] load error:', detail)
      return NextResponse.json(
        { error: 'Failed to load partial runs' },
        { status: 500 },
      )
    }
  },
  { public: true, rateLimit: 'read' },
)
