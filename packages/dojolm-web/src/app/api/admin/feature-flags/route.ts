// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/admin/feature-flags — read-only diagnostic
 *          surface listing every entry in `FEATURE_FLAG_REGISTRY`
 *          with its enabled state, env-var rule, and any active
 *          admin override.
 *          PATCH /api/admin/feature-flags — admin-only runtime
 *          override write (ADR-0041 / WAVE4-FLAG-ADMIN-TOGGLE).
 *          Body: `{ flag: FeatureFlag, enabled: boolean | null }`.
 *          A `null` value clears the override and reverts to the
 *          env-var rule.
 *
 * Story: WAVE4-FEATURE-FLAG-ADMIN / ADR-0034 (read), extended by
 *        WAVE4-FLAG-ADMIN-TOGGLE / ADR-0041 (write).
 *
 * Auth: admin-only via `withAuth({ role: 'admin' })`. PATCH is
 * also CSRF-protected by `withAuth`'s double-submit-cookie path
 * since it's a state-mutating method.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/route-guard'
import {
  listFeatureFlags,
  setFlagOverride,
  type FeatureFlag,
} from '@/lib/feature-flags'
import { auditLog } from '@/lib/audit-logger'

const STANDARD_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const

export const GET = withAuth(
  async () => {
    return NextResponse.json(
      { flags: listFeatureFlags() },
      { status: 200, headers: STANDARD_HEADERS },
    )
  },
  { role: 'admin' },
)

interface PatchBody {
  flag?: unknown
  enabled?: unknown
}

const KNOWN_FLAGS: ReadonlySet<string> = new Set([
  'kotoba.llm', 'sengoku.llm', 'ronin.intel-ingest',
])

export const PATCH = withAuth(
  async (request: NextRequest, { user }) => {
    let body: PatchBody
    try {
      body = (await request.json()) as PatchBody
    } catch {
      return NextResponse.json(
        { error: 'request body must be JSON' },
        { status: 400, headers: STANDARD_HEADERS },
      )
    }
    if (typeof body.flag !== 'string' || !KNOWN_FLAGS.has(body.flag)) {
      return NextResponse.json(
        { error: 'flag must be one of the registered FEATURE_FLAG_REGISTRY ids' },
        { status: 400, headers: STANDARD_HEADERS },
      )
    }
    if (body.enabled !== true && body.enabled !== false && body.enabled !== null) {
      return NextResponse.json(
        { error: 'enabled must be true, false, or null (to clear the override)' },
        { status: 400, headers: STANDARD_HEADERS },
      )
    }

    const flag = body.flag as FeatureFlag
    const enabled = body.enabled as boolean | null

    try {
      const result = await setFlagOverride(flag, enabled)
      try {
        await auditLog.featureFlagToggle({
          user: user.username,
          flag,
          override: enabled,
          enabled: result.enabled,
        })
      } catch (auditErr) {
        console.error('[admin/feature-flags] audit write failed (non-fatal):',
          auditErr instanceof Error ? auditErr.message : 'unknown')
      }
      return NextResponse.json(
        { flag, override: result.override, enabled: result.enabled },
        { status: 200, headers: STANDARD_HEADERS },
      )
    } catch (err) {
      console.error('[admin/feature-flags] PATCH error:',
        err instanceof Error ? err.message : 'unknown')
      return NextResponse.json(
        { error: 'failed to write feature-flag override' },
        { status: 500, headers: STANDARD_HEADERS },
      )
    }
  },
  { role: 'admin' },
)
