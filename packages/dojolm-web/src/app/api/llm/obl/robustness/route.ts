/**
 * POST /api/llm/obl/robustness
 * OBL Module 2: Defense Robustness Scoring
 * Epic: OBLITERATUS (OBL) — T3.1
 */

import { NextRequest, NextResponse } from 'next/server'
import { fileStorage } from '@/lib/storage/file-storage'
import { getProviderAdapter } from '@/lib/llm-providers'
import { checkApiAuth } from '@/lib/api-auth'
import { isDemoMode } from '@/lib/demo'
import { getDataPath } from '@/lib/runtime-paths'
import { ProbeRunner } from 'bu-tpi/fingerprint'
import { measureDefenseRobustness } from 'bu-tpi/behavioral-metrics'
import fs from 'node:fs'
import path from 'node:path'

const SAFE_ID = /^[\w-]{1,128}$/

// Rate limiter — 5 req/60s per IP
const rateLimiter = new Map<string, number[]>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60_000

// Concurrency limiter — max 1 concurrent per modelId
const activeModels = new Set<string>()

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
      baselineRefusalRate: 0.95,
      pressuredRefusalRate: 0.60,
      recoveryRate: 0.85,
      degradationCurve: [0.95, 0.90, 0.80, 0.70, 0.65, 0.60, 0.55, 0.50, 0.55, 0.60, 0.70, 0.85],
      ouroboros: 0.89,
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

    // Concurrency check
    if (activeModels.has(modelId)) {
      return NextResponse.json({ error: 'Analysis already in progress for this model' }, { status: 409 })
    }

    const models = await fileStorage.getModelConfigs()
    const modelConfig = models.find(m => m.id === modelId)
    if (!modelConfig) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    activeModels.add(modelId)
    try {
      const adapter = await getProviderAdapter(modelConfig.provider)
      const runner = new ProbeRunner(adapter)
      const robustness = await measureDefenseRobustness(adapter, modelConfig, runner)

      const resultPath = getDataPath('obl', modelId, 'robustness.json')
      await fs.promises.mkdir(path.dirname(resultPath), { recursive: true })
      await fs.promises.writeFile(resultPath, JSON.stringify(robustness, null, 2))

      return NextResponse.json(robustness)
    } finally {
      activeModels.delete(modelId)
    }
  } catch (error) {
    console.error('[OBL Robustness]', error)
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 },
    )
  }
}
