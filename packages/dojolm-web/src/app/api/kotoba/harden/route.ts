// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: POST /api/kotoba/harden — run the Kotoba hardening transformer
 * Story: WAVE2-KOTOBA / ADR-0017; YR.21 — G-073 closeout migrated wrapper
 *        from `createApiHandler` to `withAuth({role:'admin'})`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/route-guard'
import { hardenPrompt, MAX_PROMPT_LEN } from '@/lib/kotoba/hardener'
import { auditLog } from '@/lib/audit-logger'

interface HardenRequestBody {
  prompt?: unknown
}

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    try {
      const body = (await request.json()) as HardenRequestBody

      if (typeof body.prompt !== 'string') {
        return NextResponse.json(
          { error: 'prompt must be a string' },
          { status: 400 },
        )
      }

      const prompt = body.prompt.slice(0, MAX_PROMPT_LEN)
      const result = hardenPrompt(prompt)

      try {
        await auditLog.kotobaHarden({
          user: user.username,
          promptLength: prompt.length,
          sectionsAdded: result.sectionsAdded,
          sectionsPreserved: result.sectionsPreserved,
        })
      } catch (auditErr) {
        console.error('[kotoba/harden] audit write failed (non-fatal):',
          auditErr instanceof Error ? auditErr.message : 'unknown')
      }

      return NextResponse.json({
        hardened: result.hardened,
        sectionsAdded: result.sectionsAdded,
        sectionsPreserved: result.sectionsPreserved,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[kotoba/harden] error:', detail)
      return NextResponse.json(
        { error: 'Failed to harden prompt' },
        { status: 500 },
      )
    }
  },
  { role: 'admin' },
)
