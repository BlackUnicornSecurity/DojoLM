// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/sengoku/temporal/runs/stream?planId=X —
 *          Server-Sent Events stream of a Temporal run as the LLM
 *          executor produces turns.
 * Story: WAVE3-TEMPORAL-STREAMING / ADR-0024.
 *
 * SSE framing:
 *   event: turn      \n data: { turn: RunTurn }   \n\n
 *   event: complete  \n data: { run:  RunRecord } \n\n
 *   event: error     \n data: { reason: string }  \n\n
 *
 * Auth-required. Streaming only engages when the Sengoku LLM
 * executor is configured (see `lib/sengoku/llm-executor.ts`). If the
 * operator has not configured `SENGOKU_LLM_*` env vars, the endpoint
 * emits an `error` event with `reason: "llm-not-configured"` and
 * closes the stream — the caller should use the synchronous
 * `POST /api/sengoku/temporal/runs` for the deterministic path.
 *
 * RATE-LIMIT: write-tier. The simulation cost matches the
 * non-streaming POST.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { resolveSessionUser } from '@/lib/api-session'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  DEFAULT_TEMPORAL_PLANS,
  type PlanRecord,
  type RunRecord,
} from '@/lib/sengoku/fixtures'
import { streamPlanWithLlm } from '@/lib/sengoku/llm-executor'
import { auditLog } from '@/lib/audit-logger'
import { sseResponse } from '@/lib/sse-response'

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

function sseEvent(name: string, payload: unknown): string {
  const data = JSON.stringify(payload)
  return `event: ${name}\ndata: ${data}\n\n`
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('planId') ?? ''
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

    const username = (await resolveSessionUser(request))?.username ?? 'unknown'
    const encoder = new TextEncoder()

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of streamPlanWithLlm(plan)) {
            controller.enqueue(encoder.encode(sseEvent(event.type, event)))
            if (event.type === 'complete') {
              try {
                await saveRun(event.run)
              } catch (saveErr) {
                console.error('[sengoku/runs/stream] save error (non-fatal):',
                  saveErr instanceof Error ? saveErr.message : 'unknown')
              }
              try {
                await auditLog.temporalRun({
                  user: username,
                  planId: plan.id,
                  runId: event.run.id,
                  attackType: plan.attackType,
                  verdict: event.run.summary.verdict,
                  flaggedRisks: event.run.summary.flaggedRisks,
                })
              } catch (auditErr) {
                console.error('[sengoku/runs/stream] audit write failed (non-fatal):',
                  auditErr instanceof Error ? auditErr.message : 'unknown')
              }
            }
          }
        } catch (err) {
          const reason = err instanceof Error ? err.message : 'unknown'
          console.error('[sengoku/runs/stream] generator error:', reason)
          controller.enqueue(encoder.encode(sseEvent('error', { reason: 'internal' })))
        } finally {
          controller.close()
        }
      },
    })

    return sseResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  },
  { rateLimit: 'write' },
)
