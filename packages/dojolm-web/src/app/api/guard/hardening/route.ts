// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: POST /api/guard/hardening — system-prompt weakness analysis
 * Story: WAVE2-GUARD / ADR-0018; YR.21 — G-073 closeout migrated wrapper
 *        from `createApiHandler` to `withAuth({role:'admin'})`.
 *
 * Audit write is fire-and-forget.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/route-guard'
import { analyzeHardening } from '@/lib/guard/hardening'
import { auditLog } from '@/lib/audit-logger'

const MAX_PROMPT_LEN = 10_000

interface HardeningRequestBody {
  prompt?: unknown
}

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    try {
      const body = (await request.json()) as HardeningRequestBody
      if (typeof body.prompt !== 'string') {
        return NextResponse.json(
          { error: 'prompt must be a string' },
          { status: 400 },
        )
      }
      if (body.prompt.trim().length < 20) {
        return NextResponse.json(
          { error: 'prompt must be at least 20 characters' },
          { status: 400 },
        )
      }

      const prompt = body.prompt.slice(0, MAX_PROMPT_LEN)
      const result = analyzeHardening(prompt)

      try {
        await auditLog.guardHardeningAnalyze({
          user: user.username,
          promptLength: prompt.length,
          weaknessCount: result.weaknesses.length,
        })
      } catch (auditErr) {
        console.error('[guard/hardening] audit write failed (non-fatal):',
          auditErr instanceof Error ? auditErr.message : 'unknown')
      }

      return NextResponse.json({
        weaknesses: result.weaknesses,
        hardened: result.hardened,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[guard/hardening] error:', detail)
      return NextResponse.json(
        { error: 'Failed to analyze prompt' },
        { status: 500 },
      )
    }
  },
  { role: 'admin' },
)
