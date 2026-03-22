/**
 * File: route.ts
 * Purpose: API endpoint for scanner statistics
 * Index:
 * - GET handler (line 15)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPatternCount, getPatternGroups } from '@dojolm/scanner'
import { checkApiAuth } from '@/lib/api-auth'

/**
 * GET /api/stats
 * Returns scanner statistics including pattern count and groups
 */
export async function GET(request: NextRequest) {
  const authError = checkApiAuth(request)
  if (authError) return authError

  try {
    const patternCount = getPatternCount()
    const patternGroups = getPatternGroups()

    // PT-INFO-M06 fix: Return summary counts only, not detailed pattern group names
    // (pattern group names could help attackers craft evasion strategies)
    return NextResponse.json({
      patternCount,
      groupCount: patternGroups.length,
      sourceCount: new Set(patternGroups.map((g: { source?: string }) => g.source)).size,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve scanner statistics' },
      { status: 500 }
    )
  }
}
