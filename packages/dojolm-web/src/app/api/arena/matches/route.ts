// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/arena/matches — Wave 8.8 / ADR-0080 read-only route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import {
  DEFAULT_ARENA_MATCHES,
  type ArenaMatchFormat,
  type ArenaMatchRecord,
  type ArenaSeverity,
} from '@/lib/arena/fixtures'

const VALID_FORMATS = new Set<ArenaMatchFormat>([
  'duel', 'round-robin', 'king-of-the-hill', 'tag-team', 'free-for-all',
])
const VALID_SEVERITIES = new Set<ArenaSeverity>([
  'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO',
])
const MAX_LIMIT = 200

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const fmtRaw = searchParams.get('format')?.toLowerCase() ?? null
    const format = fmtRaw && VALID_FORMATS.has(fmtRaw as ArenaMatchFormat)
      ? (fmtRaw as ArenaMatchFormat)
      : null
    const sevRaw = searchParams.get('severity')?.toUpperCase() ?? null
    const severity = sevRaw && VALID_SEVERITIES.has(sevRaw as ArenaSeverity)
      ? (sevRaw as ArenaSeverity)
      : null
    const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_LIMIT)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    let matches: readonly ArenaMatchRecord[] = DEFAULT_ARENA_MATCHES
    if (format) matches = matches.filter((m) => m.format === format)
    if (severity) matches = matches.filter((m) => m.severity === severity)

    const total = matches.length
    const paginated = matches.slice(offset, offset + limit)

    return NextResponse.json({
      matches: paginated,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  },
  { public: true, rateLimit: 'read' },
)
