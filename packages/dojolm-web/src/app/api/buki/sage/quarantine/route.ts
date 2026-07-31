// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET/POST /api/buki/sage/quarantine — SAGE quarantine review
 * Story: WAVE2-SAGE / ADR-0014
 *
 * GET: paginated list of quarantined items.
 * POST: review (approve | reject) action on an item. Requires auth.
 *       Writes an audit-log entry and updates the item status on disk.
 *
 * When the on-disk store is empty the GET returns the bundled
 * `DEFAULT_QUARANTINE_ITEMS` seed corpus; the first POST against a
 * seed-id copies the seed into the on-disk store before updating.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { resolveSessionUser } from '@/lib/api-session'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile, readdir, mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  DEFAULT_QUARANTINE_ITEMS,
  type QuarantineRecord,
} from '@/lib/sage/fixtures'
import { auditLog } from '@/lib/audit-logger'

const QUARANTINE_DIR = getDataPath('sage', 'quarantine')

const VALID_STATUSES = new Set<QuarantineRecord['status']>(['pending', 'approved', 'rejected'])
const MAX_LIMIT = 200
const MAX_NOTES_LEN = 2_000
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

function isValidStatus(value: unknown): value is QuarantineRecord['status'] {
  return typeof value === 'string' && (VALID_STATUSES as Set<string>).has(value)
}

async function loadStoredItems(): Promise<Map<string, QuarantineRecord>> {
  const map = new Map<string, QuarantineRecord>()
  if (!existsSync(QUARANTINE_DIR)) return map
  const files = await readdir(QUARANTINE_DIR)
  for (const file of files.filter(f => f.endsWith('.json'))) {
    try {
      const raw = await readFile(path.join(QUARANTINE_DIR, file), 'utf-8')
      const record = JSON.parse(raw) as QuarantineRecord
      if (record && typeof record.id === 'string') {
        map.set(record.id, record)
      }
    } catch {
      // skip malformed
    }
  }
  return map
}

async function saveItem(item: QuarantineRecord): Promise<void> {
  if (!existsSync(QUARANTINE_DIR)) {
    await mkdir(QUARANTINE_DIR, { recursive: true })
  }
  // ID_PATTERN guards against path-traversal characters before this point.
  await writeFile(
    path.join(QUARANTINE_DIR, `${item.id}.json`),
    JSON.stringify(item, null, 2),
    'utf-8',
  )
}

function mergedCorpus(stored: Map<string, QuarantineRecord>): QuarantineRecord[] {
  const out: QuarantineRecord[] = []
  const seen = new Set<string>()
  for (const stub of DEFAULT_QUARANTINE_ITEMS) {
    const override = stored.get(stub.id)
    const record = override ?? stub
    out.push(record)
    seen.add(stub.id)
  }
  for (const [id, record] of stored.entries()) {
    if (!seen.has(id)) out.push(record)
  }
  return out
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const statusRaw = searchParams.get('status')
      const status = isValidStatus(statusRaw) ? statusRaw : null
      const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_LIMIT)
      const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

      const stored = await loadStoredItems()
      let items = mergedCorpus(stored)

      if (status) {
        items = items.filter(i => i.status === status)
      }

      const total = items.length
      const paginated = items.slice(offset, offset + limit)

      return NextResponse.json({
        items: paginated,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[sage/quarantine] load error:', detail)
      return NextResponse.json(
        { error: 'Failed to load quarantine items' },
        { status: 500 },
      )
    }
  },
  { public: true, rateLimit: 'read' },
)

interface ReviewRequestBody {
  itemId?: unknown
  action?: unknown
  notes?: unknown
}

export const POST = createApiHandler(
  async (request: NextRequest) => {
    try {
      const body = await request.json() as ReviewRequestBody

      const itemId = typeof body.itemId === 'string' ? body.itemId : ''
      if (!ID_PATTERN.test(itemId)) {
        return NextResponse.json(
          { error: 'itemId is required and must be alphanumeric (1-64 chars)' },
          { status: 400 },
        )
      }

      if (body.action !== 'approve' && body.action !== 'reject') {
        return NextResponse.json(
          { error: 'action must be "approve" or "reject"' },
          { status: 400 },
        )
      }

      const notes = typeof body.notes === 'string' ? body.notes.slice(0, MAX_NOTES_LEN) : null

      const stored = await loadStoredItems()
      const existing = stored.get(itemId)
        ?? DEFAULT_QUARANTINE_ITEMS.find((i) => i.id === itemId)
        ?? null
      if (!existing) {
        return NextResponse.json(
          { error: 'itemId not found' },
          { status: 404 },
        )
      }
      if (existing.status !== 'pending') {
        return NextResponse.json(
          { error: `item already ${existing.status}` },
          { status: 409 },
        )
      }

      const updated: QuarantineRecord = {
        ...existing,
        status: body.action === 'approve' ? 'approved' : 'rejected',
        reviewedAt: new Date().toISOString(),
        reviewerNotes: notes,
      }

      // Order: write first, audit second. The audit-logger internally
      // swallows filesystem errors (see `writeEntry` in audit-logger.ts)
      // so this is intentionally fire-and-forget — a failed audit write
      // must not roll back a completed review action, but a failed review
      // write returns 500 before we ever reach this line.
      await saveItem(updated)
      await auditLog.sageQuarantineReview({
        user: (await resolveSessionUser(request))?.username ?? 'unknown',
        itemId,
        action: body.action,
        category: existing.category,
        notes: notes ?? undefined,
      })

      return NextResponse.json({ item: updated })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[sage/quarantine] review error:', detail)
      return NextResponse.json(
        { error: 'Failed to record review' },
        { status: 500 },
      )
    }
  },
  { rateLimit: 'write' },
)
