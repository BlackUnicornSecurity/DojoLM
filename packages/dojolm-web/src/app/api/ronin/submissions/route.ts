/**
 * File: /api/ronin/submissions/route.ts
 * Purpose: API route for Ronin Hub submissions — CRUD for bug bounty submissions
 * Story: NODA-3 Story 10.5
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth } from '@/lib/api-auth'
import { apiError } from '@/lib/api-error'

/** Block TRACE method consistently across all handlers (Bug #9 / Story 13.4) */
function blockTrace(request: NextRequest): NextResponse | null {
  if (request.method === 'TRACE') {
    return new NextResponse(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST, PATCH' },
    });
  }
  return null;
}

// In-memory store for submissions (localStorage is client-side, this is server-side cache)
const submissions = new Map<string, Record<string, unknown>>()

const VALID_STATUSES = new Set(['draft', 'submitted', 'triaged', 'validated', 'paid', 'rejected'])
const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'info'])

/** Strip HTML tags and encode entities to prevent stored XSS (RON-SEC-01). */
function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * GET /api/ronin/submissions — List submissions
 * Query params: ?status=draft
 */
export async function GET(request: NextRequest) {
  const traceBlock = blockTrace(request);
  if (traceBlock) return traceBlock;
  const authError = checkApiAuth(request)
  if (authError) return authError

  try {
    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')?.toLowerCase()

    let results = Array.from(submissions.values())

    if (statusFilter && VALID_STATUSES.has(statusFilter)) {
      results = results.filter(s => s.status === statusFilter)
    }

    // Sort by updatedAt descending
    results.sort((a, b) => {
      const da = String(a.updatedAt ?? '')
      const db = String(b.updatedAt ?? '')
      return db.localeCompare(da)
    })

    return NextResponse.json({ submissions: results, total: results.length })
  } catch (err) {
    return apiError('Failed to fetch submissions', 500, err)
  }
}

/**
 * POST /api/ronin/submissions — Create or update a submission
 */
export async function POST(request: NextRequest) {
  const traceBlock = blockTrace(request);
  if (traceBlock) return traceBlock;
  const authError = checkApiAuth(request)
  if (authError) return authError

  try {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const id = typeof body.id === 'string' ? body.id.trim().slice(0, 100) : ''
    if (!id) {
      return NextResponse.json({ error: 'Missing submission id' }, { status: 400 })
    }
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid submission id format' }, { status: 400 })
    }

    const title = typeof body.title === 'string' ? sanitizeText(body.title.trim().slice(0, 500)) : ''
    if (!title) {
      return NextResponse.json({ error: 'Missing submission title' }, { status: 400 })
    }

    const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : 'draft'
    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid submission status' }, { status: 400 })
    }

    const severity = typeof body.severity === 'string' ? body.severity.trim().toLowerCase() : 'info'
    if (!VALID_SEVERITIES.has(severity)) {
      return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
    }

    const submission = {
      id,
      programId: typeof body.programId === 'string' ? body.programId.trim().slice(0, 100) : '',
      programName: typeof body.programName === 'string' ? sanitizeText(body.programName.trim().slice(0, 200)) : '',
      title,
      status,
      severity,
      cvssScore: typeof body.cvssScore === 'number' && Number.isFinite(body.cvssScore)
        ? Math.max(0, Math.min(10, body.cvssScore)) : 0,
      aiFactorScore: typeof body.aiFactorScore === 'number' && Number.isFinite(body.aiFactorScore)
        ? Math.max(0, Math.min(1, body.aiFactorScore)) : 0,
      finalScore: typeof body.finalScore === 'number' && Number.isFinite(body.finalScore)
        ? Math.max(0, Math.min(10, body.finalScore)) : 0,
      evidence: Array.isArray(body.evidence)
        ? body.evidence.filter((e: unknown) => typeof e === 'string').map((e: string) => sanitizeText(e.trim().slice(0, 2000))).slice(0, 10)
        : [],
      description: typeof body.description === 'string' ? sanitizeText(body.description.trim().slice(0, 5000)) : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payout: typeof body.payout === 'number' && Number.isFinite(body.payout) ? Math.min(Math.max(0, body.payout), 1_000_000) : null,
    }

    const isUpdate = submissions.has(id)
    submissions.set(id, submission)

    return NextResponse.json({ submission }, { status: isUpdate ? 200 : 201 })
  } catch (err) {
    return apiError('Failed to save submission', 500, err)
  }
}

/**
 * PATCH /api/ronin/submissions — Update a submission
 */
export async function PATCH(request: NextRequest) {
  const traceBlock = blockTrace(request);
  if (traceBlock) return traceBlock;
  const authError = checkApiAuth(request)
  if (authError) return authError

  try {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id || !submissions.has(id)) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const existing = submissions.get(id)!
    const updated = { ...existing }

    // Patchable fields whitelist
    if (typeof body.status === 'string' && VALID_STATUSES.has(body.status)) {
      updated.status = body.status
    }
    if (typeof body.title === 'string') {
      updated.title = sanitizeText(body.title.trim().slice(0, 500))
    }
    if (typeof body.description === 'string') {
      updated.description = sanitizeText(body.description.trim().slice(0, 5000))
    }
    if (typeof body.payout === 'number' && Number.isFinite(body.payout)) {
      updated.payout = Math.max(0, body.payout)
    }

    updated.updatedAt = new Date().toISOString()
    // Preserve id and createdAt
    updated.id = existing.id
    updated.createdAt = existing.createdAt

    submissions.set(id, updated)

    return NextResponse.json({ submission: updated })
  } catch (err) {
    return apiError('Failed to update submission', 500, err)
  }
}
