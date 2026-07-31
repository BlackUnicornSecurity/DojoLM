// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET/POST/DELETE /api/ronin/planning/targets — research targets
 * Story: WAVE2-RONIN / ADR-0015, per-user-scoped in Wave 3 / ADR-0021;
 *        YR.21 — G-073 closeout migrated POST + DELETE wrappers from
 *        `createApiHandler` to `withAuth()` (NO role — per-user-scoped,
 *        not admin-only). GET stays on `createApiHandler` because read
 *        access is shared with X-API-Key callers per ADR-0021.
 *
 * Planning targets are operator-authored and now per-user scoped: each
 * authenticated user owns an isolated store at
 * `<TPI_DATA_DIR>/ronin/planning/<userId>/<targetId>.json`. GET lists
 * records owned by the caller only; POST tags new records with the
 * caller's `userId`; DELETE removes only records owned by the caller.
 *
 * Auth-required for all methods. Legacy flat-layout records from before
 * Wave 3 are not surfaced — operators re-create any records they need.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { withAuth } from '@/lib/auth/route-guard'
import { resolveSessionUser, isSafeUserIdSegment } from '@/lib/api-session'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile, readdir, mkdir, writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { auditLog } from '@/lib/audit-logger'
import {
  RONIN_PRIORITIES,
  RONIN_STATUSES,
  RONIN_SCOPES,
  type ResearchTargetRecord,
  type ResearchTargetStatus,
  type ResearchTargetPriority,
} from '@/lib/ronin/fixtures'

const PLANNING_ROOT = getDataPath('ronin', 'planning')

const VALID_STATUSES = new Set<ResearchTargetStatus>(RONIN_STATUSES)
const VALID_PRIORITIES = new Set<ResearchTargetPriority>(RONIN_PRIORITIES)
const VALID_SCOPES = new Set<string>(RONIN_SCOPES)
const MAX_LIMIT = 200
const MAX_TITLE_LEN = 200
const MAX_URL_LEN = 2048
const MAX_NOTES_LEN = 8_000
const MAX_CHECKLIST = 50
const MAX_CHECKLIST_LABEL_LEN = 300
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

function isValidStatus(v: unknown): v is ResearchTargetStatus {
  return typeof v === 'string' && (VALID_STATUSES as Set<string>).has(v)
}
function isValidPriority(v: unknown): v is ResearchTargetPriority {
  return typeof v === 'string' && (VALID_PRIORITIES as Set<string>).has(v)
}
function isValidScope(v: unknown): v is ResearchTargetRecord['scope'] {
  return typeof v === 'string' && VALID_SCOPES.has(v)
}

function userDir(userId: string): string {
  return path.join(PLANNING_ROOT, userId)
}

function targetPath(userId: string, targetId: string): string {
  return path.join(userDir(userId), `${targetId}.json`)
}

function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}

/**
 * ADR-0042 — IDOR detection helper. Scans peer user directories
 * for a same-named target file. Used only when the caller's own
 * lookup misses, so the cost is paid on the rare not-found path.
 * Returns true if the target ID exists under any other user's
 * directory; false on no match or any I/O error.
 */
async function targetExistsForOtherUser(callerUserId: string, targetId: string): Promise<boolean> {
  if (!existsSync(PLANNING_ROOT)) return false
  try {
    const userDirs = await readdir(PLANNING_ROOT)
    for (const dirName of userDirs) {
      if (dirName === callerUserId) continue
      if (!isSafeUserIdSegment(dirName)) continue
      if (existsSync(path.join(PLANNING_ROOT, dirName, `${targetId}.json`))) {
        return true
      }
    }
  } catch {
    // I/O error during scan — fall through and report false. The
    // caller still receives a 404; the audit entry will record
    // foundElsewhere=false instead of probably-true. Acceptable
    // because IDOR detection is best-effort.
  }
  return false
}

async function loadTargetsForUser(userId: string): Promise<ResearchTargetRecord[]> {
  const dir = userDir(userId)
  if (!existsSync(dir)) return []
  const files = await readdir(dir)
  const records: ResearchTargetRecord[] = []
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    try {
      const raw = await readFile(path.join(dir, file), 'utf-8')
      const parsed = JSON.parse(raw) as ResearchTargetRecord
      if (parsed.userId === userId) records.push(parsed)
    } catch {
      // skip malformed
    }
  }
  records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return records
}

async function saveTarget(target: ResearchTargetRecord): Promise<void> {
  const dir = userDir(target.userId)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(
    targetPath(target.userId, target.id),
    JSON.stringify(target, null, 2),
    'utf-8',
  )
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    try {
      const user = await resolveSessionUser(request)
      if (user === null || !isSafeUserIdSegment(user.id)) return unauthorizedResponse()

      const { searchParams } = new URL(request.url)
      const status = isValidStatus(searchParams.get('status')) ? searchParams.get('status') : null
      const priority = isValidPriority(searchParams.get('priority')) ? searchParams.get('priority') : null
      const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_LIMIT)
      const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

      let targets = await loadTargetsForUser(user.id)
      if (status) targets = targets.filter((t) => t.status === status)
      if (priority) targets = targets.filter((t) => t.priority === priority)

      const total = targets.length
      const paginated = targets.slice(offset, offset + limit)

      return NextResponse.json({
        targets: paginated,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[ronin/planning] load error:', detail)
      return NextResponse.json(
        { error: 'Failed to load research targets' },
        { status: 500 },
      )
    }
  },
  { rateLimit: 'read' },
)

interface CreateBody {
  title?: unknown
  url?: unknown
  scope?: unknown
  notes?: unknown
  checklist?: unknown
  status?: unknown
  priority?: unknown
}

function sanitizeChecklist(input: unknown): ResearchTargetRecord['checklist'] {
  if (!Array.isArray(input)) return []
  return input
    .slice(0, MAX_CHECKLIST)
    .map((item): ResearchTargetRecord['checklist'][number] | null => {
      if (!item || typeof item !== 'object') return null
      const rec = item as { id?: unknown; label?: unknown; done?: unknown }
      if (typeof rec.label !== 'string') return null
      return {
        id: typeof rec.id === 'string' && ID_PATTERN.test(rec.id)
          ? rec.id
          : `cl-${crypto.randomUUID().slice(0, 8)}`,
        label: rec.label.slice(0, MAX_CHECKLIST_LABEL_LEN),
        done: rec.done === true,
      }
    })
    .filter((x): x is ResearchTargetRecord['checklist'][number] => x !== null)
}

export const POST = withAuth(
  async (request: NextRequest, { user: _guardUser }) => {
    try {
      // Guard layer authenticated the caller; resolveSessionUser still
      // returns the same record and is the authoritative source for
      // `user.id` (the legacy in-handler flow already validated isSafeUserIdSegment).
      const user = await resolveSessionUser(request)
      if (user === null || !isSafeUserIdSegment(user.id)) return unauthorizedResponse()

      const body = (await request.json()) as CreateBody

      if (typeof body.title !== 'string' || typeof body.url !== 'string') {
        return NextResponse.json(
          { error: 'Missing required fields: title, url' },
          { status: 400 },
        )
      }
      let normalisedUrl: string
      try {
        const parsed = new URL(body.url)
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          return NextResponse.json(
            { error: 'url must be http or https' },
            { status: 400 },
          )
        }
        parsed.username = ''
        parsed.password = ''
        normalisedUrl = parsed.toString()
      } catch {
        return NextResponse.json(
          { error: 'Invalid url format' },
          { status: 400 },
        )
      }

      const scope = isValidScope(body.scope) ? body.scope : 'in-scope'
      const status = isValidStatus(body.status) ? body.status : 'active'
      const priority = isValidPriority(body.priority) ? body.priority : 'P2'
      const now = new Date().toISOString()

      const newTarget: ResearchTargetRecord = {
        id: `RT-${crypto.randomUUID().slice(0, 8)}`,
        userId: user.id,
        title: body.title.slice(0, MAX_TITLE_LEN),
        url: normalisedUrl.slice(0, MAX_URL_LEN),
        scope,
        notes: typeof body.notes === 'string' ? body.notes.slice(0, MAX_NOTES_LEN) : '',
        checklist: sanitizeChecklist(body.checklist),
        status,
        priority,
        createdAt: now,
        updatedAt: now,
      }

      await saveTarget(newTarget)

      return NextResponse.json({ target: newTarget }, { status: 201 })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[ronin/planning] create error:', detail)
      return NextResponse.json(
        { error: 'Failed to create target' },
        { status: 500 },
      )
    }
  },
)

export const DELETE = withAuth(
  async (request: NextRequest, { user: _guardUser }) => {
    try {
      const user = await resolveSessionUser(request)
      if (user === null || !isSafeUserIdSegment(user.id)) return unauthorizedResponse()

      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id') ?? ''
      if (!ID_PATTERN.test(id)) {
        return NextResponse.json(
          { error: 'id is required and must be alphanumeric (1-64 chars)' },
          { status: 400 },
        )
      }
      const filePath = targetPath(user.id, id)
      if (!existsSync(filePath)) {
        // ADR-0042 — surface IDOR probes: a user trying to DELETE
        // an id that exists under a different user's directory.
        // Privacy-safe: we record the attempter + the targeted id +
        // a boolean, never the victim's user id.
        const foundElsewhere = await targetExistsForOtherUser(user.id, id)
        try {
          await auditLog.idorProbe({
            user: user.username,
            namespace: 'ronin.planning',
            resourceId: id,
            foundElsewhere,
          })
        } catch (auditErr) {
          console.error('[ronin/planning] idor audit write failed (non-fatal):',
            auditErr instanceof Error ? auditErr.message : 'unknown')
        }
        return NextResponse.json(
          { error: 'target not found' },
          { status: 404 },
        )
      }
      await unlink(filePath)
      return NextResponse.json({ deleted: id })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[ronin/planning] delete error:', detail)
      return NextResponse.json(
        { error: 'Failed to delete target' },
        { status: 500 },
      )
    }
  },
)
