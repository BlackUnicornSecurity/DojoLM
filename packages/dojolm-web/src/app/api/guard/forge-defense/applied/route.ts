// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET/POST/DELETE /api/guard/forge-defense/applied — applied
 *          defense-template state store.
 * Story: WAVE2-GUARD / ADR-0018, per-user-scoped in Wave 3 / ADR-0021;
 *        YR.21 — G-073 closeout migrated POST + DELETE wrappers from
 *        `createApiHandler` to `withAuth({role:'admin'})`. GET stays
 *        on `createApiHandler` because per-user reads remain X-API-Key-
 *        accessible per ADR-0021.
 *
 * Applied templates are per-user scoped: each authenticated admin user
 * gets `<TPI_DATA_DIR>/guard/forge-defense/applied/<userId>.json`
 * containing their own list of `{ templateId, appliedAt }` records.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { withAuth } from '@/lib/auth/route-guard'
import { resolveSessionUser, isSafeUserIdSegment, withUserLock } from '@/lib/api-session'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile, writeFile, mkdir, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  DEFAULT_DEFENSE_TEMPLATES,
  type DefenseTemplateRecord,
} from '@/lib/guard/fixtures'
import { auditLog } from '@/lib/audit-logger'

const APPLIED_DIR = path.join(getDataPath('guard', 'forge-defense'), 'applied')

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

interface AppliedRecord {
  templateId: string
  appliedAt: string
}

function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}

function appliedFile(userId: string): string {
  return path.join(APPLIED_DIR, `${userId}.json`)
}

async function loadApplied(userId: string): Promise<AppliedRecord[]> {
  const file = appliedFile(userId)
  if (!existsSync(file)) return []
  try {
    const raw = await readFile(file, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((r): r is AppliedRecord => {
      if (typeof r !== 'object' || r === null) return false
      const rec = r as { templateId?: unknown; appliedAt?: unknown }
      return typeof rec.templateId === 'string' && typeof rec.appliedAt === 'string'
    })
  } catch {
    return []
  }
}

async function saveApplied(userId: string, records: AppliedRecord[]): Promise<void> {
  if (!existsSync(APPLIED_DIR)) {
    await mkdir(APPLIED_DIR, { recursive: true })
  }
  await writeFile(appliedFile(userId), JSON.stringify(records, null, 2), 'utf-8')
}

function findTemplate(id: string): DefenseTemplateRecord | null {
  return DEFAULT_DEFENSE_TEMPLATES.find((t) => t.id === id) ?? null
}

/**
 * WAVE6-IDOR-AUDIT-GUARD / ADR-0049 — same shape as Ronin
 * Planning's `targetExistsForOtherUser` (ADR-0042). Returns true
 * when any OTHER user's `<userId>.json` applied list contains the
 * templateId. Runs only on the DELETE not-found path, so pays the
 * filesystem scan cost only on the rare miss branch.
 *
 * Privacy posture: returns a boolean only. Never returns, logs,
 * or persists the victim user id.
 */
// CR MEDIUM (Wave 6 review) — bound the per-request scan so a
// large user population cannot turn every 404 DELETE into a slow
// directory walk. Operators with >MAX_PEER_SCAN users see an
// approximate `foundElsewhere` (false on overflow) — acceptable
// because IDOR detection is best-effort by design (ADR-0042).
const MAX_PEER_SCAN = 1000

async function templateAppliedForOtherUser(
  callerUserId: string,
  templateId: string,
): Promise<boolean> {
  if (!existsSync(APPLIED_DIR)) return false
  try {
    const entries = await readdir(APPLIED_DIR)
    let scanned = 0
    for (const name of entries) {
      if (!name.endsWith('.json')) continue
      const peerUserId = name.slice(0, -'.json'.length)
      if (peerUserId === callerUserId) continue
      if (!isSafeUserIdSegment(peerUserId)) continue
      scanned += 1
      if (scanned > MAX_PEER_SCAN) break
      try {
        const raw = await readFile(path.join(APPLIED_DIR, name), 'utf-8')
        const parsed = JSON.parse(raw) as unknown
        if (!Array.isArray(parsed)) continue
        for (const record of parsed) {
          if (record === null || typeof record !== 'object') continue
          const rec = record as { templateId?: unknown }
          if (rec.templateId === templateId) return true
        }
      } catch {
        // ignore malformed peer files
      }
    }
  } catch {
    // Best-effort — I/O error falls through and reports false.
  }
  return false
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    try {
      const user = await resolveSessionUser(request)
      if (user === null || !isSafeUserIdSegment(user.id)) return unauthorizedResponse()

      const applied = await loadApplied(user.id)
      return NextResponse.json({ applied })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[guard/forge-defense/applied] load error:', detail)
      return NextResponse.json(
        { error: 'Failed to load applied templates' },
        { status: 500 },
      )
    }
  },
  { rateLimit: 'read' },
)

interface ApplyRequestBody {
  templateId?: unknown
}

export const POST = withAuth(
  async (request: NextRequest, { user: _guardUser }) => {
    try {
      const user = await resolveSessionUser(request)
      if (user === null || !isSafeUserIdSegment(user.id)) return unauthorizedResponse()

      const body = (await request.json()) as ApplyRequestBody
      const templateId = typeof body.templateId === 'string' ? body.templateId : ''
      if (!ID_PATTERN.test(templateId)) {
        return NextResponse.json(
          { error: 'templateId is required and must be alphanumeric (1-64 chars)' },
          { status: 400 },
        )
      }
      const template = findTemplate(templateId)
      if (!template) {
        return NextResponse.json(
          { error: 'templateId not found in catalog' },
          { status: 404 },
        )
      }

      // Per-user in-process mutex serialises the load-check-save so a
      // double-click across tabs cannot bypass the 409 dedup within a
      // single Node process. Horizontally-scaled deployments still need
      // a filesystem lock — tracked separately.
      const result = await withUserLock('guard-applied', user.id, async () => {
        const applied = await loadApplied(user.id)
        if (applied.some((a) => a.templateId === templateId)) {
          return { duplicate: true } as const
        }
        const next: AppliedRecord[] = [
          ...applied,
          { templateId, appliedAt: new Date().toISOString() },
        ]
        await saveApplied(user.id, next)
        return { duplicate: false, applied: next } as const
      })

      if (result.duplicate) {
        return NextResponse.json(
          { error: 'template already applied' },
          { status: 409 },
        )
      }

      try {
        await auditLog.guardDefenseAction({
          user: user.username,
          action: 'apply',
          templateId,
          category: template.category,
        })
      } catch (auditErr) {
        console.error('[guard/forge-defense/applied] audit write failed (non-fatal):',
          auditErr instanceof Error ? auditErr.message : 'unknown')
      }

      return NextResponse.json({ applied: result.applied }, { status: 201 })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[guard/forge-defense/applied] apply error:', detail)
      return NextResponse.json(
        { error: 'Failed to apply template' },
        { status: 500 },
      )
    }
  },
  { role: 'admin' },
)

export const DELETE = withAuth(
  async (request: NextRequest, { user: _guardUser }) => {
    try {
      const user = await resolveSessionUser(request)
      if (user === null || !isSafeUserIdSegment(user.id)) return unauthorizedResponse()

      const { searchParams } = new URL(request.url)
      const templateId = searchParams.get('id') ?? ''
      if (!ID_PATTERN.test(templateId)) {
        return NextResponse.json(
          { error: 'id must be alphanumeric (1-64 chars)' },
          { status: 400 },
        )
      }

      // Load-modify-write is serialised per user to keep DELETE
      // consistent with POST — a concurrent apply/remove pair cannot
      // interleave.
      const result = await withUserLock('guard-applied', user.id, async () => {
        const applied = await loadApplied(user.id)
        const idx = applied.findIndex((a) => a.templateId === templateId)
        if (idx < 0) return { found: false } as const
        const next = [...applied.slice(0, idx), ...applied.slice(idx + 1)]
        await saveApplied(user.id, next)
        return { found: true, applied: next } as const
      })

      if (!result.found) {
        // ADR-0049 (Wave 6) — match the ADR-0042 pattern on Ronin
        // Planning DELETE. Scan peer users for the same templateId;
        // record the attempt with privacy-safe metadata only (caller
        // user + resource id + boolean). No victim identity is
        // emitted. Fire-and-forget — audit failure must not mask
        // the 404.
        const foundElsewhere = await templateAppliedForOtherUser(user.id, templateId)
        try {
          await auditLog.idorProbe({
            user: user.username,
            namespace: 'guard.forge-defense',
            resourceId: templateId,
            foundElsewhere,
          })
        } catch (auditErr) {
          console.error('[guard/forge-defense/applied] idor audit write failed (non-fatal):',
            auditErr instanceof Error ? auditErr.message : 'unknown')
        }
        return NextResponse.json(
          { error: 'templateId not applied' },
          { status: 404 },
        )
      }

      const template = findTemplate(templateId)
      try {
        await auditLog.guardDefenseAction({
          user: user.username,
          action: 'remove',
          templateId,
          category: template?.category ?? 'unknown',
        })
      } catch (auditErr) {
        console.error('[guard/forge-defense/applied] audit write failed (non-fatal):',
          auditErr instanceof Error ? auditErr.message : 'unknown')
      }

      return NextResponse.json({ applied: result.applied })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[guard/forge-defense/applied] remove error:', detail)
      return NextResponse.json(
        { error: 'Failed to remove applied template' },
        { status: 500 },
      )
    }
  },
  { role: 'admin' },
)
