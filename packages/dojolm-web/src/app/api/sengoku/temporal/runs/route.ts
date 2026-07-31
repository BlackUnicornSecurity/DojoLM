// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET/POST /api/sengoku/temporal/runs — temporal run store
 * Story: WAVE2-TEMPORAL / ADR-0019
 *
 * GET (public read): lists runs newest-first, paginated.
 * POST (auth-required): executes the deterministic simulator on a
 *      specified plan id, persists the resulting `RunRecord`, writes an
 *      audit log entry, and returns the run.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { withAuth } from '@/lib/auth/route-guard'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile, readdir, mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  DEFAULT_TEMPORAL_PLANS,
  type PlanRecord,
  type RunRecord,
} from '@/lib/sengoku/fixtures'
import { simulatePlan } from '@/lib/sengoku/simulator'
import { executePlanWithLlm } from '@/lib/sengoku/llm-executor'
import { auditLog } from '@/lib/audit-logger'

const PLANS_DIR = getDataPath('sengoku', 'plans')
const RUNS_DIR = getDataPath('sengoku', 'runs')

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const MAX_LIMIT = 100

async function loadPlan(planId: string): Promise<PlanRecord | null> {
  const bundled = DEFAULT_TEMPORAL_PLANS.find((p) => p.id === planId)
  if (bundled) return bundled
  const filePath = path.join(PLANS_DIR, `${planId}.json`)
  if (!existsSync(filePath)) return null
  try {
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw) as PlanRecord
  } catch {
    return null
  }
}

async function loadRuns(): Promise<RunRecord[]> {
  if (!existsSync(RUNS_DIR)) return []
  const files = await readdir(RUNS_DIR)
  const records: RunRecord[] = []
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    try {
      const raw = await readFile(path.join(RUNS_DIR, file), 'utf-8')
      records.push(JSON.parse(raw) as RunRecord)
    } catch {
      // skip
    }
  }
  records.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  return records
}

async function saveRun(run: RunRecord): Promise<void> {
  if (!existsSync(RUNS_DIR)) await mkdir(RUNS_DIR, { recursive: true })
  await writeFile(path.join(RUNS_DIR, `${run.id}.json`), JSON.stringify(run, null, 2), 'utf-8')
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_LIMIT)
      const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)
      const runs = await loadRuns()
      return NextResponse.json({
        runs: runs.slice(offset, offset + limit),
        total: runs.length,
        limit,
        offset,
        hasMore: offset + limit < runs.length,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[sengoku/runs] load error:', detail)
      return NextResponse.json(
        { error: 'Failed to load runs' },
        { status: 500 },
      )
    }
  },
  { public: true, rateLimit: 'read' },
)

interface StartRunBody {
  planId?: unknown
}

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    try {
      const body = (await request.json()) as StartRunBody
      const planId = typeof body.planId === 'string' ? body.planId : ''
      if (!ID_PATTERN.test(planId)) {
        return NextResponse.json(
          { error: 'planId is required and must be alphanumeric (1-64 chars)' },
          { status: 400 },
        )
      }
      const plan = await loadPlan(planId)
      if (!plan) {
        return NextResponse.json({ error: 'planId not found' }, { status: 404 })
      }

      // Wave 3: prefer the real LLM executor when configured. Fall
      // back to the deterministic simulator otherwise (or on any LLM
      // failure). Response shape is identical in either branch.
      const llmRun = await executePlanWithLlm(plan)
      const run = llmRun ?? simulatePlan(plan)
      await saveRun(run)

      try {
        await auditLog.temporalRun({
          user: user.username ?? 'unknown',
          planId: plan.id,
          runId: run.id,
          attackType: plan.attackType,
          verdict: run.summary.verdict,
          flaggedRisks: run.summary.flaggedRisks,
        })
      } catch (auditErr) {
        console.error('[sengoku/runs] audit write failed (non-fatal):',
          auditErr instanceof Error ? auditErr.message : 'unknown')
      }

      return NextResponse.json({ run }, { status: 201 })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[sengoku/runs] execute error:', detail)
      return NextResponse.json(
        { error: 'Failed to execute simulation' },
        { status: 500 },
      )
    }
  },
  { role: 'admin' },
)
