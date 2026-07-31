// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: POST /api/kotoba/score — run the Kotoba rubric engine
 * Story: WAVE2-KOTOBA / ADR-0017, additive LLM pass from
 *        WAVE3-KOTOBA-LLM / ADR-0022; YR.21 — G-073 closeout migrated
 *        wrapper from `createApiHandler` to `withAuth({role:'admin'})`.
 *
 * Accepts a system prompt, runs it through `analyzePrompt` from
 * `src/lib/kotoba/rubric.ts`, writes a metadata-only audit log entry,
 * and returns the `RubricAnalysis` for the UI to render.
 *
 * When the optional LLM insights layer is configured via env vars
 * (see `lib/kotoba/llm-insights.ts`), an additive `llmInsights` field
 * is attached to the response. A failed LLM call degrades silently —
 * the deterministic analysis is always returned.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/route-guard'
import { analyzePrompt, MAX_PROMPT_LEN } from '@/lib/kotoba/rubric'
import { generateLlmInsights } from '@/lib/kotoba/llm-insights'
import { auditLog } from '@/lib/audit-logger'

interface ScoreRequestBody {
  prompt?: unknown
}

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    try {
      const body = (await request.json()) as ScoreRequestBody

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
      const analysis = analyzePrompt(prompt)
      const llmInsights = await generateLlmInsights(prompt)

      try {
        await auditLog.kotobaScore({
          user: user.username,
          promptLength: prompt.length,
          overallScore: analysis.overallScore,
          grade: analysis.grade,
        })
      } catch (auditErr) {
        console.error('[kotoba/score] audit write failed (non-fatal):',
          auditErr instanceof Error ? auditErr.message : 'unknown')
      }

      return NextResponse.json(
        llmInsights === null ? { analysis } : { analysis, llmInsights },
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[kotoba/score] error:', detail)
      return NextResponse.json(
        { error: 'Failed to score prompt' },
        { status: 500 },
      )
    }
  },
  { role: 'admin' },
)
