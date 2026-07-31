// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET/POST/DELETE /api/sengoku/temporal/plans — plan CRUD
 * Story: WAVE2-TEMPORAL / ADR-0019
 *
 * GET: returns the bundled reference corpus plus any operator-saved
 *      plans from `<TPI_DATA_DIR>/sengoku/plans/*.json`. Public read.
 * POST: auth-required; create an operator-authored plan.
 * DELETE: auth-required; removes an operator-authored plan (cannot
 *         delete the bundled reference corpus).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { withAuth } from '@/lib/auth/route-guard'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile, readdir, mkdir, writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  DEFAULT_TEMPORAL_PLANS,
  type PlanRecord,
  type AttackType,
  type Turn,
} from '@/lib/sengoku/fixtures'

const PLANS_DIR = getDataPath('sengoku', 'plans')

const VALID_ATTACK_TYPES = new Set<AttackType>([
  'accumulation', 'delayed-activation', 'session-persistence',
  'context-overflow', 'persona-drift',
])
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const MAX_NAME_LEN = 200
const MAX_DESC_LEN = 2_000
const MAX_TURN_CONTENT_LEN = 4_000
const MAX_TURNS = 50
const BUNDLED_IDS = new Set(DEFAULT_TEMPORAL_PLANS.map((p) => p.id))

function isValidAttackType(v: unknown): v is AttackType {
  return typeof v === 'string' && (VALID_ATTACK_TYPES as Set<string>).has(v)
}

async function loadStoredPlans(): Promise<PlanRecord[]> {
  if (!existsSync(PLANS_DIR)) return []
  const files = await readdir(PLANS_DIR)
  const records: PlanRecord[] = []
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    try {
      const raw = await readFile(path.join(PLANS_DIR, file), 'utf-8')
      records.push(JSON.parse(raw) as PlanRecord)
    } catch {
      // skip
    }
  }
  return records
}

async function savePlan(plan: PlanRecord): Promise<void> {
  if (!existsSync(PLANS_DIR)) await mkdir(PLANS_DIR, { recursive: true })
  await writeFile(path.join(PLANS_DIR, `${plan.id}.json`), JSON.stringify(plan, null, 2), 'utf-8')
}

function sanitizeTurns(input: unknown): Turn[] {
  if (!Array.isArray(input)) return []
  return input.slice(0, MAX_TURNS).map((item, idx): Turn | null => {
    if (typeof item !== 'object' || item === null) return null
    const rec = item as { role?: unknown; content?: unknown; turnNumber?: unknown }
    if (rec.role !== 'user' && rec.role !== 'assistant') return null
    if (typeof rec.content !== 'string') return null
    const turnNumber = typeof rec.turnNumber === 'number' && Number.isFinite(rec.turnNumber)
      ? Math.max(1, Math.floor(rec.turnNumber))
      : idx + 1
    return {
      role: rec.role,
      content: rec.content.slice(0, MAX_TURN_CONTENT_LEN),
      turnNumber,
    }
  }).filter((t): t is Turn => t !== null)
}

export const GET = createApiHandler(
  async () => {
    try {
      const stored = await loadStoredPlans()
      const merged: PlanRecord[] = [
        ...DEFAULT_TEMPORAL_PLANS,
        ...stored.filter((p) => !BUNDLED_IDS.has(p.id)),
      ]
      return NextResponse.json({ plans: merged, total: merged.length })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[sengoku/plans] load error:', detail)
      return NextResponse.json(
        { error: 'Failed to load plans' },
        { status: 500 },
      )
    }
  },
  { public: true, rateLimit: 'read' },
)

interface CreatePlanBody {
  name?: unknown
  attackType?: unknown
  description?: unknown
  turns?: unknown
}

export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body = (await request.json()) as CreatePlanBody
      if (typeof body.name !== 'string' || typeof body.description !== 'string') {
        return NextResponse.json(
          { error: 'name and description are required strings' },
          { status: 400 },
        )
      }
      if (!isValidAttackType(body.attackType)) {
        return NextResponse.json(
          { error: 'attackType must be one of the known Sengoku attack types' },
          { status: 400 },
        )
      }
      const turns = sanitizeTurns(body.turns)
      if (turns.length === 0) {
        return NextResponse.json(
          { error: 'plan must include at least one turn' },
          { status: 400 },
        )
      }

      const plan: PlanRecord = {
        id: `plan-${crypto.randomUUID().slice(0, 8)}`,
        name: body.name.slice(0, MAX_NAME_LEN),
        description: body.description.slice(0, MAX_DESC_LEN),
        attackType: body.attackType,
        turns,
        createdAt: new Date().toISOString(),
      }

      await savePlan(plan)

      return NextResponse.json({ plan }, { status: 201 })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[sengoku/plans] create error:', detail)
      return NextResponse.json(
        { error: 'Failed to create plan' },
        { status: 500 },
      )
    }
  },
  { role: 'admin' },
)

export const DELETE = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id') ?? ''
      if (!ID_PATTERN.test(id)) {
        return NextResponse.json(
          { error: 'id is required and must be alphanumeric (1-64 chars)' },
          { status: 400 },
        )
      }
      if (BUNDLED_IDS.has(id)) {
        return NextResponse.json(
          { error: 'bundled reference plans cannot be deleted' },
          { status: 403 },
        )
      }
      const filePath = path.join(PLANS_DIR, `${id}.json`)
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: 'plan not found' }, { status: 404 })
      }
      await unlink(filePath)
      return NextResponse.json({ deleted: id })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[sengoku/plans] delete error:', detail)
      return NextResponse.json(
        { error: 'Failed to delete plan' },
        { status: 500 },
      )
    }
  },
  { role: 'admin' },
)
