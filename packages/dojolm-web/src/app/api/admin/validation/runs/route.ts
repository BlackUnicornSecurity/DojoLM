/**
 * File: route.ts
 * Purpose: Admin validation runs list API — GET past validation runs
 * Story: K6.4 (Admin Validation API Routes)
 * Index:
 * - Constants (line 13)
 * - Pagination helpers (line 22)
 * - GET handler (line 35)
 */

import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { withAuth } from '@/lib/auth/route-guard'

const RUNS_DIR = join(process.cwd(), 'data', 'validation', 'runs')

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface RunSummary {
  runId: string
  date: string
  status: string
  duration: number | null
  modules: string[] | null
  nonConformities: number
}

export const GET = withAuth(async (request: NextRequest) => {
  try {
    // Parse pagination params
    const url = new URL(request.url)
    const pageStr = url.searchParams.get('page') ?? '1'
    const limitStr = url.searchParams.get('limit') ?? '20'

    const page = parseInt(pageStr, 10)
    const limit = parseInt(limitStr, 10)

    if (!Number.isFinite(page) || page < 1) {
      return NextResponse.json(
        { error: 'page must be a positive integer' },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'limit must be between 1 and 100' },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    // Read run directories
    let runDirs: string[] = []
    try {
      runDirs = readdirSync(RUNS_DIR).filter(d => UUID_REGEX.test(d))
    } catch {
      // Directory doesn't exist yet — return empty list
      return NextResponse.json(
        { runs: [], total: 0, page, limit },
        { headers: SECURITY_HEADERS }
      )
    }

    // Read progress files and build summaries
    const summaries: RunSummary[] = []
    for (const dir of runDirs) {
      try {
        const progressPath = join(RUNS_DIR, dir, 'progress.json')
        const raw = readFileSync(progressPath, 'utf8')
        const progress = JSON.parse(raw)

        // Validate parsed shape before accessing properties
        if (
          !progress ||
          typeof progress !== 'object' ||
          (progress.status !== undefined && typeof progress.status !== 'string') ||
          (progress.startedAt !== undefined && typeof progress.startedAt !== 'string') ||
          (progress.elapsed !== undefined && typeof progress.elapsed !== 'number') ||
          (progress.nonConformities !== undefined && typeof progress.nonConformities !== 'number')
        ) {
          continue // Skip malformed run data
        }

        summaries.push({
          runId: dir,
          date: progress.startedAt ?? '',
          status: progress.status ?? 'unknown',
          duration: progress.elapsed ?? null,
          modules: progress.modules ?? null,
          nonConformities: progress.nonConformities ?? 0,
        })
      } catch {
        // Skip unreadable runs
      }
    }

    // Sort by date descending
    summaries.sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return b.date.localeCompare(a.date)
    })

    // Paginate
    const total = summaries.length
    const start = (page - 1) * limit
    const paged = summaries.slice(start, start + limit)

    return NextResponse.json(
      { runs: paged, total, page, limit },
      { headers: SECURITY_HEADERS }
    )
  } catch (error) {
    console.error('Validation runs GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: SECURITY_HEADERS }
    )
  }
}, { role: 'admin', skipCsrf: true })
