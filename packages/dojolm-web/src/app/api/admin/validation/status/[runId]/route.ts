/**
 * File: route.ts
 * Purpose: Admin validation status API — GET to poll run progress
 * Story: K6.4 (Admin Validation API Routes)
 * Index:
 * - Constants (line 13)
 * - UUID validation (line 20)
 * - GET handler (line 25)
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { withAuth } from '@/lib/auth/route-guard'
import { getDataPath } from '@/lib/runtime-paths'

const DATA_DIR = getDataPath('validation')

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const GET = withAuth(async (
  _request: NextRequest,
  context: { params?: Record<string, string> | Promise<Record<string, string>> }
) => {
  try {
    const resolvedParams = context.params ? await Promise.resolve(context.params) : undefined;
    const runId = resolvedParams?.runId

    // Validate runId is present and is a valid UUID (prevent path traversal)
    if (!runId || !UUID_REGEX.test(runId)) {
      return NextResponse.json(
        { error: 'Invalid run ID format' },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    // Read progress file
    const progressPath = join(DATA_DIR, 'runs', runId, 'progress.json')
    let raw: string
    try {
      raw = readFileSync(progressPath, 'utf8')
    } catch {
      return NextResponse.json(
        { error: 'Validation run not found' },
        { status: 404, headers: SECURITY_HEADERS }
      )
    }

    const progress = JSON.parse(raw)

    // Validate parsed shape before accessing properties
    if (!progress || typeof progress !== 'object' || typeof progress.status !== 'string') {
      return NextResponse.json(
        { error: 'Corrupted progress data' },
        { status: 500, headers: SECURITY_HEADERS }
      )
    }

    return NextResponse.json(
      {
        status: progress.status ?? 'unknown',
        progress: progress.progress ?? 0,
        currentModule: progress.currentModule ?? null,
        modulesCompleted: progress.modulesCompleted ?? 0,
        modulesTotal: progress.modulesTotal ?? 0,
        samplesProcessed: progress.samplesProcessed ?? 0,
        samplesTotal: progress.samplesTotal ?? 0,
        nonConformities: progress.nonConformities ?? 0,
        elapsed: progress.elapsed ?? 0,
        eta: progress.eta ?? null,
      },
      { headers: SECURITY_HEADERS }
    )
  } catch (error) {
    console.error('Validation status GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: SECURITY_HEADERS }
    )
  }
}, { role: 'admin', skipCsrf: true })
