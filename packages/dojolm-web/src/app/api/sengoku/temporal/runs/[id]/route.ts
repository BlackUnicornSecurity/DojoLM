// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/sengoku/temporal/runs/[id] — replay a saved run
 * Story: WAVE2-TEMPORAL / ADR-0019
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, type RouteContext } from '@/lib/api-handler'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { RunRecord } from '@/lib/sengoku/fixtures'

const RUNS_DIR = getDataPath('sengoku', 'runs')
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export const GET = createApiHandler<RouteContext>(
  async (_request: NextRequest, context: RouteContext) => {
    try {
      const params = await context.params
      const id = params?.id
      if (typeof id !== 'string' || id.length === 0) {
        return NextResponse.json(
          { error: 'run id is required' },
          { status: 400 },
        )
      }
      if (!ID_PATTERN.test(id)) {
        return NextResponse.json(
          { error: 'id must be alphanumeric (1-64 chars)' },
          { status: 400 },
        )
      }
      const filePath = path.join(RUNS_DIR, `${id}.json`)
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: 'run not found' }, { status: 404 })
      }
      const raw = await readFile(filePath, 'utf-8')
      const run = JSON.parse(raw) as RunRecord
      return NextResponse.json({ run })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[sengoku/runs/:id] error:', detail)
      return NextResponse.json(
        { error: 'Failed to load run' },
        { status: 500 },
      )
    }
  },
  { public: true, rateLimit: 'read' },
)
