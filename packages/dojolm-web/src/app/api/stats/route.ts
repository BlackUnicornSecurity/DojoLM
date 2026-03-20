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

    return NextResponse.json({
      patternCount,
      patternGroups,
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve scanner statistics' },
      { status: 500 }
    )
  }
}
