/**
 * File: route.test.ts
 * Purpose: Tests for OBL alignment API route
 * Epic: OBLITERATUS (OBL) — T1.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
const mockCheckApiAuth = vi.fn((_req?: unknown) => null as import('next/server').NextResponse | null)
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}))

const mockIsDemoMode = vi.fn(() => false)
vi.mock('@/lib/demo', () => ({
  isDemoMode: () => mockIsDemoMode(),
}))

const mockGetModelConfigs = vi.fn(() =>
  Promise.resolve([
    { id: 'test-model', name: 'Test Model', provider: 'openai' as const, model: 'gpt-4', apiKey: 'test', enabled: true },
  ]),
)
vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    getModelConfigs: (...args: unknown[]) => mockGetModelConfigs(...args),
  },
}))

const mockRunProbes = vi.fn(() => Promise.resolve([
  { probeId: 'obl-align-01', category: 'safety-boundary' as const, rawText: "I can't help with that.", extractedValue: '', confidence: 0.9, durationMs: 100 },
]))
vi.mock('bu-tpi/fingerprint', () => ({
  ProbeRunner: class MockProbeRunner {
    runProbes = mockRunProbes
  },
}))

vi.mock('@/lib/llm-providers', () => ({
  getProviderAdapter: vi.fn(() => Promise.resolve({})),
}))

vi.mock('@/lib/runtime-paths', () => ({
  getDataPath: (...segments: string[]) => `/tmp/test-data/${segments.join('/')}`,
}))

vi.mock('node:fs', () => ({
  default: {
    promises: {
      mkdir: vi.fn(() => Promise.resolve()),
      writeFile: vi.fn(() => Promise.resolve()),
    },
  },
}))

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/obl/alignment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/llm/obl/alignment', () => {
  let POST: (req: NextRequest) => Promise<import('next/server').NextResponse>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockCheckApiAuth.mockReturnValue(null)
    mockIsDemoMode.mockReturnValue(false)
    mockGetModelConfigs.mockResolvedValue([
      { id: 'test-model', name: 'Test Model', provider: 'openai' as const, model: 'gpt-4', apiKey: 'test', enabled: true },
    ])
    vi.resetModules()
    ;({ POST } = await import('../route'))
  })

  it('returns demo response in demo mode', async () => {
    mockIsDemoMode.mockReturnValue(true)
    const res = await POST(makeRequest({ modelId: 'test-model' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.methodProbabilities).toBeDefined()
    expect(data.confidence).toBeDefined()
  })

  it('returns 401 when auth fails', async () => {
    const { NextResponse } = await import('next/server')
    mockCheckApiAuth.mockReturnValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    const res = await POST(makeRequest({ modelId: 'test-model' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid modelId', async () => {
    const res = await POST(makeRequest({ modelId: '../../../etc/passwd' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing modelId', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 for unknown model', async () => {
    const res = await POST(makeRequest({ modelId: 'nonexistent' }))
    expect(res.status).toBe(404)
  })

  it('returns alignment imprint on success', async () => {
    const res = await POST(makeRequest({ modelId: 'test-model' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.methodProbabilities).toBeDefined()
    expect(data.refusalSharpness).toBeDefined()
    expect(data.evidenceProbes).toBeDefined()
  })
})
