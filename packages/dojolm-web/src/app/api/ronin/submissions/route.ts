// SPDX-License-Identifier: Apache-2.0
/**
 * File: /api/ronin/submissions/route.ts
 * Purpose: API route for Ronin Hub submissions — CRUD for bug bounty submissions
 * Story: 10.5 + YR.1.6 (FS persistence)
 *
 * YR.1.6: storage swapped from an in-process Map to an FS-backed store
 * that survives process restarts. The store interface lives at
 * src/lib/ronin/fs-submission-store.ts; tests inject InMemorySubmissionStore
 * via setDefaultSubmissionStore() so existing route tests stay disk-free.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { AivssScore } from 'bu-tpi/aivss'
import { isDemoMode } from '@/lib/demo'
import { demoRoninSubmissionsGet } from '@/lib/demo/mock-api-handlers'
import { withAuth } from '@/lib/auth/route-guard'
import { checkRateLimit } from '@/lib/api-handler'
import { apiError } from '@/lib/api-error'
import {
  getSubmissionStore,
  type RoninSubmission,
} from '@/lib/ronin/fs-submission-store'
import { computeForSubmission } from '@/lib/aivss/computeForSubmission'

/**
 * TICKET-G3-API-RONIN — attach server-computed AIVSS score per submission
 * row alongside the existing wire shape so the host client can render
 * `<AivssPill>` chips from the real server value instead of falling back
 * to the band='none' suppression placeholder. `null` is the EXPLICIT "no
 * signal" slot when severity is missing / unrecognised.
 */
function withAivss(submission: RoninSubmission): RoninSubmission & {
  aivss: AivssScore | null;
} {
  return { ...submission, aivss: computeForSubmission(submission) };
}

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

const VALID_STATUSES = new Set(['draft', 'submitted', 'triaged', 'validated', 'paid', 'rejected'])
const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'info'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_SUBMISSIONS = 10_000
const MAX_PAYOUT = 1_000_000

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
export const GET = withAuth(
  async (request: NextRequest) => {
  if (isDemoMode()) return demoRoninSubmissionsGet()
  const traceBlock = blockTrace(request);
  if (traceBlock) return traceBlock;

  // Adversarial-review MED-3 fix — rate-limit GET on the 'read' tier.
  // Pre-PR, GET was a pass-through over the in-memory store; post-PR
  // GET fans out to `store.list().map(withAivss)` which calls
  // `findingToAivssMetrics` + `calculate` per row. At MAX_SUBMISSIONS
  // = 10_000 a burst of authenticated GETs can drive non-trivial CPU
  // cost; mirroring the POST/PATCH boundary closes the asymmetry.
  const rate = await checkRateLimit(request, 'read')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')?.toLowerCase()
    const store = getSubmissionStore()
    const results = statusFilter && VALID_STATUSES.has(statusFilter)
      ? store.list({ status: statusFilter })
      : store.list()
    // TICKET-G3-API-RONIN: attach server-computed AIVSS per row so the
    // host renders real chips instead of band='none' placeholders.
    const scored = results.map(withAivss)
    return NextResponse.json({ submissions: scored, total: scored.length })
  } catch (err) {
    return apiError('Failed to fetch submissions', 500, err)
  }
  },
  { role: 'admin' },
);

/**
 * POST /api/ronin/submissions — Create or update a submission
 */
export const POST = withAuth(
  async (request: NextRequest) => {
  const traceBlock = blockTrace(request);
  if (traceBlock) return traceBlock;

  // YR.1.6 audit pass-3 H-2: rate-limit the write boundary (cross-cutting
  // non-negotiable). 'write' tier mirrors the boundary every other admin
  // POST in this PR uses.
  const rate = await checkRateLimit(request, 'write')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

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

    const store = getSubmissionStore()
    const existing = store.get(id)

    const submission: RoninSubmission = {
      id,
      // YR.1.6 audit pass-3 H-1: sanitize programId at the same boundary
      // every other operator-controlled string field passes through.
      programId: typeof body.programId === 'string' ? sanitizeText(body.programId.trim().slice(0, 100)) : '',
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
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payout: typeof body.payout === 'number' && Number.isFinite(body.payout) ? Math.min(Math.max(0, body.payout), MAX_PAYOUT) : null,
    }

    if (!existing && store.size() >= MAX_SUBMISSIONS) {
      return NextResponse.json({ error: 'Maximum submission limit reached' }, { status: 429 })
    }
    const { isUpdate } = store.upsert(submission)

    return NextResponse.json(
      { submission: withAivss(submission) },
      { status: isUpdate ? 200 : 201 },
    )
  } catch (err) {
    return apiError('Failed to save submission', 500, err)
  }
  },
  { role: 'admin' },
);

/**
 * PATCH /api/ronin/submissions — Update a submission
 */
export const PATCH = withAuth(
  async (request: NextRequest) => {
  const traceBlock = blockTrace(request);
  if (traceBlock) return traceBlock;

  // YR.1.6 audit pass-3 H-2: rate-limit the write boundary on PATCH too.
  const rate = await checkRateLimit(request, 'write')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid submission id format' }, { status: 400 })
    }
    const store = getSubmissionStore()
    const existing = store.get(id)
    if (!existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const updated: RoninSubmission = {
      ...existing,
      // Patchable fields whitelist — normalize status case like POST handler.
      status:
        typeof body.status === 'string' && VALID_STATUSES.has(body.status.trim().toLowerCase())
          ? body.status.trim().toLowerCase()
          : existing.status,
      title:
        typeof body.title === 'string'
          ? sanitizeText(body.title.trim().slice(0, 500))
          : existing.title,
      description:
        typeof body.description === 'string'
          ? sanitizeText(body.description.trim().slice(0, 5000))
          : existing.description,
      payout:
        typeof body.payout === 'number' && Number.isFinite(body.payout)
          ? Math.min(Math.max(0, body.payout), MAX_PAYOUT)
          : existing.payout,
      updatedAt: new Date().toISOString(),
    }

    const { submission } = store.upsert(updated)
    return NextResponse.json({ submission: withAivss(submission) })
  } catch (err) {
    return apiError('Failed to update submission', 500, err)
  }
  },
  { role: 'admin' },
);
