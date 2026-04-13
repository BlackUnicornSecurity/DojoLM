/**
 * File: route.test.ts — OBL geometry route tests
 * Epic: OBLITERATUS (OBL) — T4.1
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockCheckApiAuth = vi.fn(() => null as import('next/server').NextResponse | null)
vi.mock('@/lib/api-auth', () => ({ checkApiAuth: (...a: unknown[]) => mockCheckApiAuth(...a) }))
vi.mock('@/lib/demo', () => ({ isDemoMode: vi.fn(() => false) }))
vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: { getModelConfigs: vi.fn(() => Promise.resolve([{ id: 'test-model', name: 'Test', provider: 'openai' as const, model: 'gpt-4', apiKey: 'k', enabled: true }])) },
}))
vi.mock('bu-tpi/fingerprint', () => ({ ProbeRunner: class { runProbes = vi.fn(() => Promise.resolve([])) } }))
vi.mock('bu-tpi/behavioral-metrics', () => ({
  GEOMETRY_PROBES: [],
  analyzeConceptGeometry: vi.fn(() => ({ type: 'monolithic', facets: [], solidAngle: 0.9 })),
}))
vi.mock('@/lib/llm-providers', () => ({ getProviderAdapter: vi.fn(() => Promise.resolve({})) }))
vi.mock('@/lib/runtime-paths', () => ({ getDataPath: (...s: string[]) => `/tmp/${s.join('/')}` }))
vi.mock('node:fs', () => ({ default: { promises: { mkdir: vi.fn(() => Promise.resolve()), writeFile: vi.fn(() => Promise.resolve()) } } }))

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/obl/geometry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

describe('POST /api/llm/obl/geometry', () => {
  let POST: (req: NextRequest) => Promise<import('next/server').NextResponse>
  beforeEach(async () => { vi.clearAllMocks(); vi.resetModules(); ({ POST } = await import('../route')) })

  it('returns 400 for missing modelId', async () => { expect((await POST(makeRequest({}))).status).toBe(400) })
  it('returns 404 for unknown model', async () => { expect((await POST(makeRequest({ modelId: 'nope' }))).status).toBe(404) })
  it('returns geometry on success', async () => {
    const res = await POST(makeRequest({ modelId: 'test-model' }))
    expect(res.status).toBe(200)
    expect((await res.json()).type).toBe('monolithic')
  })
})
