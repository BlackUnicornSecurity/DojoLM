/**
 * File: route.ts
 * Purpose: Black Box Analysis API endpoint — POST /api/attackdna/analyze
 * Story: NODA-3 Story 8.2a — Tab, Flow, and API
 * Security: Rate limited at 'execute' tier (1-2 req/min), max 20 ablation variations (S-07)
 */

import { NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/demo'
import { demoNoOp } from '@/lib/demo/mock-api-handlers'
import { createApiHandler } from '@/lib/api-handler'
import { analyzeAttack } from '@/lib/ablation-engine'
import { emitAnalyzeFinding } from '@/lib/ecosystem-emitters'

const MAX_PAYLOAD_LENGTH = 10_000
const MAX_ABLATION_COMPONENTS = 20

export const POST = createApiHandler(
  async (request) => {
    if (isDemoMode()) return demoNoOp()
    const body: unknown = await request.json()

    // Validate request body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { payload, modelId } = body as Record<string, unknown>

    if (typeof payload !== 'string' || payload.trim().length === 0) {
      return NextResponse.json({ error: 'payload is required and must be a non-empty string' }, { status: 400 })
    }

    if (payload.length > MAX_PAYLOAD_LENGTH) {
      return NextResponse.json(
        { error: `payload exceeds maximum length of ${MAX_PAYLOAD_LENGTH} characters` },
        { status: 400 }
      )
    }

    if (typeof modelId !== 'string' || modelId.trim().length === 0) {
      return NextResponse.json({ error: 'modelId is required and must be a non-empty string' }, { status: 400 })
    }

    // Sanitize modelId to prevent injection
    const safeModelId = modelId.replace(/[^a-zA-Z0-9\-_:.]/g, '')
    if (safeModelId.length === 0) {
      return NextResponse.json({ error: 'modelId contains no valid characters' }, { status: 400 })
    }

    // Run analysis with component cap enforced BEFORE expensive work (S-07 amplification protection)
    const result = analyzeAttack(payload.trim(), safeModelId, undefined, MAX_ABLATION_COMPONENTS)

    const criticalCount = result.ablationResults.filter((r) => r.isCritical).length

    // Fire-and-forget: emit ecosystem finding (Story 10.5)
    emitAnalyzeFinding({
      payload: payload.trim(),
      modelId: safeModelId,
      components: result.components.length,
      criticalComponents: criticalCount,
    })

    return NextResponse.json({
      success: true,
      analysis: result,
      meta: {
        componentCount: result.components.length,
        criticalCount,
        maxComponentsEnforced: MAX_ABLATION_COMPONENTS,
      },
    })
  },
  { rateLimit: 'execute' }
)
