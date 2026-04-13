/**
 * POST /api/llm/obl/depth
 * OBL Module 7: Refusal Depth Profiler
 * Epic: OBLITERATUS (OBL) — T5.1
 */

import { NextRequest, NextResponse } from 'next/server'
import { fileStorage } from '@/lib/storage/file-storage'
import { getProviderAdapter } from '@/lib/llm-providers'
import { checkApiAuth } from '@/lib/api-auth'
import { isDemoMode } from '@/lib/demo'
import { getDataPath } from '@/lib/runtime-paths'
import { ProbeRunner } from 'bu-tpi/fingerprint'
import { profileRefusalDepth } from 'bu-tpi/behavioral-metrics'
import fs from 'node:fs'
import path from 'node:path'

const SAFE_ID = /^[\w-]{1,128}$/
const rateLimiter = new Map<string, number[]>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  if (rateLimiter.size > 10_000) {
    for (const [key, ts] of rateLimiter) {
      if (ts.every(t => now - t >= 60_000)) rateLimiter.delete(key)
    }
  }
  const timestamps = rateLimiter.get(ip) ?? []
  const recent = timestamps.filter(t => now - t < 60_000)
  if (recent.length >= 5) return false
  recent.push(now)
  rateLimiter.set(ip, recent)
  return true
}

export async function POST(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({
      thresholds: Array.from({ length: 10 }, (_, i) => ({
        promptSeverity: i + 1,
        refusalProbability: Math.min(1, Math.max(0, (i - 3) / 5)),
      })),
      activationDepth: 'medium',
      sharpness: 0.33,
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
    const profile = await profileRefusalDepth(modelConfig, runner)

    const resultPath = getDataPath('obl', modelId, 'depth.json')
    await fs.promises.mkdir(path.dirname(resultPath), { recursive: true })
    await fs.promises.writeFile(resultPath, JSON.stringify(profile, null, 2))

    return NextResponse.json(profile)
  } catch (error) {
    console.error('[OBL Depth]', error)
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 },
    )
  }
}
