/**
 * File: /api/ronin/programs/route.ts
 * Purpose: API route for Ronin Hub programs — curated bug bounty program list
 * Story: NODA-3 Story 10.5
 */

import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/demo'
import { demoRoninProgramsGet } from '@/lib/demo/mock-api-handlers'
import { checkApiAuth } from '@/lib/api-auth'
import { apiError } from '@/lib/api-error'
import { SEED_PROGRAMS } from '@/lib/data/ronin-seed-programs'

/**
 * GET /api/ronin/programs — Return cached curated program list
 * Query params: ?platform=hackerone&status=active&search=openai
 */
export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoRoninProgramsGet()
  const authError = checkApiAuth(request)
  if (authError) return authError

  try {
    const url = new URL(request.url)
    const platform = url.searchParams.get('platform')?.toLowerCase()
    const status = url.searchParams.get('status')?.toLowerCase()
    const search = url.searchParams.get('search')?.toLowerCase().slice(0, 200)
    const idParam = url.searchParams.get('id')

    // Single program detail
    if (idParam) {
      const program = SEED_PROGRAMS.find(p => p.id === idParam)
      if (!program) {
        return NextResponse.json({ error: 'Program not found' }, { status: 404 })
      }
      return NextResponse.json({ program })
    }

    // Filter programs
    let programs = [...SEED_PROGRAMS]

    if (platform) {
      programs = programs.filter(p => p.platform === platform)
    }
    if (status) {
      programs = programs.filter(p => p.status === status)
    }
    if (search) {
      programs = programs.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.company.toLowerCase().includes(search) ||
        p.scopeSummary.toLowerCase().includes(search) ||
        p.tags.some(t => t.toLowerCase().includes(search))
      )
    }

    return NextResponse.json(
      { programs, total: programs.length },
      {
        headers: {
          'Cache-Control': 'private, max-age=3600, stale-while-revalidate=7200',
        },
      }
    )
  } catch (err) {
    return apiError('Failed to fetch programs', 500, err)
  }
}
