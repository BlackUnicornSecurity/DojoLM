/**
 * POST /api/llm/obl/alignment
 * OBL Module 1: Alignment Imprint Detection
 * Epic: OBLITERATUS (OBL) — T1.1
 */

import { NextRequest, NextResponse } from 'next/server'
import { fileStorage } from '@/lib/storage/file-storage'
import { getProviderAdapter } from '@/lib/llm-providers'
import { checkApiAuth } from '@/lib/api-auth'
import { isDemoMode } from '@/lib/demo'
import { getDataPath } from '@/lib/runtime-paths'
import { ProbeRunner } from 'bu-tpi/fingerprint'
import { ALIGNMENT_PROBES, detectAlignmentImprint } from 'bu-tpi/behavioral-metrics'
import fs from 'node:fs'
import path from 'node:path'

const SAFE_ID = /^[\w-]{1,128}$/

// In-memory rate limiter — 5 req/60s per IP
const rateLimiter = new Map<string, number[]>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  if (rateLimiter.size > 10_000) {
    for (const [key, ts] of rateLimiter) {
      if (ts.every(t => now - t >= RATE_WINDOW_MS)) rateLimiter.delete(key)
    }
  }
  const timestamps = rateLimiter.get(ip) ?? []
  const recent = timestamps.filter(t => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) return false
  recent.push(now)
  rateLimiter.set(ip, recent)
  return true
}

export async function POST(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({
      methodProbabilities: { DPO: 0.45, RLHF: 0.30, CAI: 0.15, SFT: 0.05, unknown: 0.05 },
      confidence: 0.82,
      refusalSharpness: 0.85,
      principleReferencing: 0.12,
      evidenceProbes: ['obl-align-01', 'obl-align-03', 'obl-align-09'],
    })
  }

  const authResult = checkApiAuth(request)
  if (authResult) return authResult

  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { modelId } = body as { modelId?: string }

    if (!modelId || !SAFE_ID.test(modelId)) {
      return NextResponse.json({ error: 'Invalid or missing modelId' }, { status: 400 })
    }

    const models = await fileStorage.getModelConfigs()
    const modelConfig = models.find(m => m.id === modelId)
    if (!modelConfig) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    const adapter = await getProviderAdapter(modelConfig.provider)
    const runner = new ProbeRunner(adapter)
    const responses = await runner.runProbes(modelConfig, ALIGNMENT_PROBES)
    const imprint = detectAlignmentImprint(responses)

    // Persist results
    const resultPath = getDataPath('obl', modelId, 'alignment.json')
    await fs.promises.mkdir(path.dirname(resultPath), { recursive: true })
    await fs.promises.writeFile(resultPath, JSON.stringify(imprint, null, 2))

    return NextResponse.json(imprint)
  } catch (error) {
    console.error('[OBL Alignment]', error)
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 },
    )
  }
}
