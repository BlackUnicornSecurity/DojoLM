// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: POST /api/sengoku/temporal/runs/resume — resume the latest
 *          partial Temporal run for a plan, or a specific `runId`.
 * Story: WAVE6-RESUME-API / ADR-0047.
 *
 * POST (auth-required, write tier): body `{ planId, runId? }`.
 *   - `planId` required, matches `ID_PATTERN`.
 *   - `runId` optional. When provided, resume that specific partial;
 *     the server enforces `partial.planId === planId` to prevent
 *     cross-plan resume. When omitted, the server picks the most
 *     recent partial for the plan (by `checkpointedAt`).
 *   - On success: runs `executeResumePlanWithLlm(plan, runId)`,
 *     persists the final RunRecord under
 *     `<TPI_DATA_DIR>/sengoku/runs/<runId>.json`, writes a
 *     `TEMPORAL_RUN` audit entry, and returns `{ run }` with 201.
 *   - On missing partial or plan mismatch: 404.
 *   - On LLM not configured / resume error: the underlying library
 *     returns null; this route returns 502 with `{ error: 'resume
 *     failed' }`. Clients may fall back to a fresh POST on
 *     `/api/sengoku/temporal/runs`.
 *
 * The route does NOT re-run the deterministic simulator on resume
 * failure — a resume implies the operator wanted the LLM path
 * continued from checkpoint, and silently downgrading would lose
 * the checkpoint distinction. The client makes the fresh-run
 * decision.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/route-guard'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  DEFAULT_TEMPORAL_PLANS,
  type PlanRecord,
  type RunRecord,
} from '@/lib/sengoku/fixtures'
import {
  executeResumePlanWithLlm,
} from '@/lib/sengoku/llm-executor'
import { listPartialRuns } from '@/lib/sengoku/partial-runs'
import { auditLog } from '@/lib/audit-logger'

const PLANS_DIR = getDataPath('sengoku', 'plans')
const RUNS_DIR = getDataPath('sengoku', 'runs')
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

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

async function saveRun(run: RunRecord): Promise<void> {
  if (!existsSync(RUNS_DIR)) await mkdir(RUNS_DIR, { recursive: true })
  await writeFile(path.join(RUNS_DIR, `${run.id}.json`), JSON.stringify(run, null, 2), 'utf-8')
}

interface ResumeBody {
  planId?: unknown
  runId?: unknown
}

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    try {
      const body = (await request.json()) as ResumeBody
      const planId = typeof body.planId === 'string' ? body.planId : ''
      if (!ID_PATTERN.test(planId)) {
        return NextResponse.json(
          { error: 'planId is required and must be alphanumeric (1-64 chars)' },
          { status: 400 },
        )
      }
      const runIdArg = typeof body.runId === 'string' ? body.runId : null
      if (runIdArg !== null && !ID_PATTERN.test(runIdArg)) {
        return NextResponse.json(
          { error: 'runId must be alphanumeric (1-64 chars)' },
          { status: 400 },
        )
      }

      const plan = await loadPlan(planId)
      if (plan === null) {
        return NextResponse.json({ error: 'planId not found' }, { status: 404 })
      }

      let runId: string
      if (runIdArg === null) {
        const partials = await listPartialRuns(planId)
        if (partials.length === 0) {
          return NextResponse.json(
            { error: 'no partial run to resume for this plan' },
            { status: 404 },
          )
        }
        runId = partials[0].runId
      } else {
        const partials = await listPartialRuns(planId)
        const match = partials.find((p) => p.runId === runIdArg)
        if (match === undefined) {
          return NextResponse.json(
            { error: 'partial run not found for the given planId' },
            { status: 404 },
          )
        }
        runId = match.runId
      }

      const run = await executeResumePlanWithLlm(plan, runId)
      if (run === null) {
        return NextResponse.json(
          { error: 'resume failed — check LLM configuration and partial state' },
          { status: 502 },
        )
      }

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
        console.error('[sengoku/resume] audit write failed (non-fatal):',
          auditErr instanceof Error ? auditErr.message : 'unknown')
      }

      return NextResponse.json({ run }, { status: 201 })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[sengoku/resume] execute error:', detail)
      return NextResponse.json(
        { error: 'Failed to resume run' },
        { status: 500 },
      )
    }
  },
  { role: 'admin' },
)
