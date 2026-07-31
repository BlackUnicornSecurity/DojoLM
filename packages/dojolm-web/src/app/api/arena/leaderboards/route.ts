// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/arena/leaderboards — Wave 8.8 / ADR-0080 route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import {
  DEFAULT_ARENA_LEADERBOARDS,
  type ArenaLeaderboardSnapshot,
} from '@/lib/arena/fixtures'

const SAFE_SCOPE = /^[A-Za-z0-9:-]+$/
const MAX_SCOPE_LEN = 40
const MAX_LIMIT = 50

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const scopeRaw = searchParams.get('scope') ?? null
    const scope = scopeRaw
        && scopeRaw.length <= MAX_SCOPE_LEN
        && SAFE_SCOPE.test(scopeRaw)
      ? scopeRaw
      : null
    const limit = Math.min(Number(searchParams.get('limit')) || 20, MAX_LIMIT)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    let boards: readonly ArenaLeaderboardSnapshot[] = DEFAULT_ARENA_LEADERBOARDS
    if (scope) boards = boards.filter((b) => b.scope === scope)

    const total = boards.length
    const paginated = boards.slice(offset, offset + limit)

    return NextResponse.json({
      leaderboards: paginated,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  },
  { public: true, rateLimit: 'read' },
)
