// SPDX-License-Identifier: Apache-2.0
/**
 * File: api/arena/warriors/[id]/stats/route.ts
 * Purpose: GET /api/arena/warriors/:id/stats — per-warrior streak,
 *          recent scores, head-to-head breakdown, and achievements.
 * Story: Wave 1 / ADR-0012.
 *
 * Aggregates stored matches for a single warrior. Authenticated via
 * createApiHandler; read-tier rate limited.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, type RouteContext } from '@/lib/api-handler'
import * as arenaStorage from '@/lib/storage/arena-storage'
import { buildWarriorStats, MAX_MATCH_SCAN } from '@/lib/arena-aggregates'

const SAFE_MODEL_ID = /^[\w.-]{1,128}$/

export const GET = createApiHandler(
  async (_request: NextRequest, context: RouteContext) => {
    const { id } = await context.params

    if (!id || !SAFE_MODEL_ID.test(id)) {
      return NextResponse.json(
        { error: 'Invalid warrior id' },
        { status: 400 },
      )
    }

    const warrior = await arenaStorage.getWarrior(id)
    if (!warrior) {
      return NextResponse.json(
        { error: 'Warrior not found' },
        { status: 404 },
      )
    }

    const { matches } = await arenaStorage.listMatches({ limit: MAX_MATCH_SCAN })
    const stats = buildWarriorStats(warrior, matches)

    return NextResponse.json(stats)
  },
  { rateLimit: 'read' },
)
