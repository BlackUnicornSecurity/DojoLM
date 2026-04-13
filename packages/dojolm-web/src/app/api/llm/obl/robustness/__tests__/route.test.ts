/**
 * File: route.test.ts
 * Purpose: Tests for OBL robustness API route
 * Epic: OBLITERATUS (OBL) — T3.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockCheckApiAuth = vi.fn(() => null as import('next/server').NextResponse | null)
vi.mock('@/lib/api-auth', () => ({ checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args) }))

const mockIsDemoMode = vi.fn(() => false)
vi.mock('@/lib/demo', () => ({ isDemoMode: () => mockIsDemoMode() }))

vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    getModelConfigs: vi.fn(() => Promise.resolve([
      { id: 'test-model', name: 'Test', provider: 'openai' as const, model: 'gpt-4', apiKey: 'test', enabled: true },
    ])),
  },
}))

vi.mock('bu-tpi/fingerprint', () => ({
  ProbeRunner: class { runProbes = vi.fn(() => Promise.resolve([])) },
}))

vi.mock('bu-tpi/behavioral-metrics', () => ({
  measureDefenseRobustness: vi.fn(() => Promise.resolve({
    baselineRefusalRate: 0.9, pressuredRefusalRate: 0.5, recoveryRate: 0.8,
    degradationCurve: [0.9, 0.7, 0.5, 0.8], ouroboros: 0.88,
  })),
}))

vi.mock('@/lib/llm-providers', () => ({ getProviderAdapter: vi.fn(() => Promise.resolve({})) }))
vi.mock('@/lib/runtime-paths', () => ({ getDataPath: (...s: string[]) => `/tmp/test/${s.join('/')}` }))
vi.mock('node:fs', () => ({ default: { promises: { mkdir: vi.fn(() => Promise.resolve()), writeFile: vi.fn(() => Promise.resolve()) } } }))

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/obl/robustness', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('POST /api/llm/obl/robustness', () => {
  let POST: (req: NextRequest) => Promise<import('next/server').NextResponse>
  beforeEach(async () => {
    vi.clearAllMocks()
    mockIsDemoMode.mockReturnValue(false)
    vi.resetModules()
    ;({ POST } = await import('../route'))
  })

  it('returns demo response in demo mode', async () => {
    mockIsDemoMode.mockReturnValue(true)
    const res = await POST(makeRequest({ modelId: 'test-model' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.baselineRefusalRate).toBeDefined()
  })

  it('returns 400 for invalid modelId', async () => {
    const res = await POST(makeRequest({ modelId: '../bad' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 for unknown model', async () => {
    const res = await POST(makeRequest({ modelId: 'nonexistent' }))
    expect(res.status).toBe(404)
  })

  it('returns robustness on success', async () => {
    const res = await POST(makeRequest({ modelId: 'test-model' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.degradationCurve).toBeDefined()
    expect(data.ouroboros).toBeDefined()
  })
})
