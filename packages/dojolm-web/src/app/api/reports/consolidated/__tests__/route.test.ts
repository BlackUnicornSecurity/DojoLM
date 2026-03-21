/**
 * File: api/reports/consolidated/__tests__/route.test.ts
 * Purpose: Tests for GET /api/reports/consolidated — all formats, scopes, auth, edge cases
 * Test IDs: CR-001 through CR-010
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn(() => null),
}))

vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    queryExecutions: vi.fn(() => Promise.resolve({ executions: [], total: 0 })),
    getModelConfigs: vi.fn(() => Promise.resolve([])),
  },
}))

vi.mock('@/lib/storage/guard-storage', () => ({
  getGuardStats: vi.fn(() =>
    Promise.resolve({
      totalEvents: 100,
      blockRate: 15,
      byAction: { allow: 85, block: 15 },
      byMode: { shinobi: 20, samurai: 30, sensei: 25, hattori: 25 },
      topCategories: [{ category: 'prompt-injection', count: 10 }],
    })
  ),
}))

vi.mock('jspdf', () => ({
  default: class MockJsPDF {
    setFontSize = vi.fn()
    setFont = vi.fn()
    text = vi.fn()
    setFillColor = vi.fn()
    roundedRect = vi.fn()
    setTextColor = vi.fn()
    splitTextToSize = vi.fn(() => ['line'])
    addPage = vi.fn()
    output = vi.fn(() => new ArrayBuffer(10))
    getNumberOfPages = vi.fn(() => 1)
    setPage = vi.fn()
    internal = { pageSize: { getWidth: () => 210 } }
  },
}))

vi.mock('jspdf-autotable', () => ({ default: vi.fn() }))

vi.mock('node:fs', () => {
  const fsp = {
    mkdir: vi.fn(() => Promise.resolve(undefined)),
    readdir: vi.fn(() => Promise.resolve([] as string[])),
    readFile: vi.fn(() => Promise.resolve('{}')),
  }
  return {
    default: { promises: fsp },
    promises: fsp,
  }
})

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { GET } from '../route'
import { checkApiAuth } from '@/lib/api-auth'
import { fileStorage } from '@/lib/storage/file-storage'
import { getGuardStats } from '@/lib/storage/guard-storage'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/reports/consolidated')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new NextRequest(url.toString(), { method: 'GET' })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/reports/consolidated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(checkApiAuth as ReturnType<typeof vi.fn>).mockReturnValue(null)
    ;(fileStorage.queryExecutions as ReturnType<typeof vi.fn>).mockResolvedValue({
      executions: [],
      total: 0,
    })
    ;(fileStorage.getModelConfigs as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(getGuardStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalEvents: 100,
      blockRate: 15,
      byAction: { allow: 85, block: 15 },
      byMode: { shinobi: 20, samurai: 30, sensei: 25, hattori: 25 },
      topCategories: [{ category: 'prompt-injection', count: 10 }],
    })
  })

  // CR-001: JSON format returns 200 with executiveBrief, generatedAt, scope
  it('CR-001: GET ?format=json returns 200 with executiveBrief, generatedAt, scope', async () => {
    const res = await GET(createGetRequest({ format: 'json' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('executiveBrief')
    expect(body).toHaveProperty('generatedAt')
    expect(body).toHaveProperty('scope')
    expect(typeof body.generatedAt).toBe('string')
    expect(body.executiveBrief).toHaveProperty('overallRiskTier')
    expect(body.executiveBrief).toHaveProperty('overallScore')
    expect(body.executiveBrief).toHaveProperty('findings')
    expect(Array.isArray(body.executiveBrief.recommendations)).toBe(true)
  })

  // CR-002: scope=llm returns only llm section
  it('CR-002: GET ?format=json&scope=llm returns report with llm section only', async () => {
    const res = await GET(createGetRequest({ format: 'json', scope: 'llm' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scope).toBe('llm')
    expect(body).toHaveProperty('llm')
    expect(body.llm).toHaveProperty('totalExecutions')
    expect(body.llm).toHaveProperty('overallScore')
    expect(body.llm).toHaveProperty('riskTier')
    // Guard and shingan should not be present for llm-only scope
    expect(body.guard).toBeUndefined()
    expect(body.shingan).toBeUndefined()
  })

  // CR-003: scope=guard returns report with guard section
  it('CR-003: GET ?format=json&scope=guard returns report with guard section', async () => {
    const res = await GET(createGetRequest({ format: 'json', scope: 'guard' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scope).toBe('guard')
    expect(body).toHaveProperty('guard')
    expect(body.guard).toHaveProperty('totalEvents')
    expect(body.guard).toHaveProperty('blockRate')
    expect(body.guard).toHaveProperty('byAction')
    expect(body.guard).toHaveProperty('byMode')
    expect(body.guard).toHaveProperty('topCategories')
    expect(body.guard.totalEvents).toBe(100)
    expect(body.guard.blockRate).toBe(15)
    // LLM should not be present for guard-only scope
    expect(body.llm).toBeUndefined()
  })

  // CR-004: scope=shingan returns report with shingan section
  it('CR-004: GET ?format=json&scope=shingan returns report with shingan section', async () => {
    const res = await GET(createGetRequest({ format: 'json', scope: 'shingan' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scope).toBe('shingan')
    expect(body).toHaveProperty('shingan')
    expect(body.shingan).toHaveProperty('totalScanned')
    expect(body.shingan).toHaveProperty('avgTrustScore')
    expect(body.shingan).toHaveProperty('riskDistribution')
    expect(body.shingan).toHaveProperty('topFindings')
    // Guard and LLM should not be present for shingan-only scope
    expect(body.llm).toBeUndefined()
    expect(body.guard).toBeUndefined()
  })

  // CR-005: Markdown format returns 200 with text/markdown Content-Type
  it('CR-005: GET ?format=markdown returns 200 with markdown content envelope', async () => {
    const res = await GET(createGetRequest({ format: 'markdown' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.format).toBe('markdown')
    expect(typeof body.content).toBe('string')
    expect(body.content).toContain('# Consolidated Security Report')
    expect(body.filename).toMatch(/\.md$/)
  })

  // CR-006: PDF format returns 200 with application/pdf content-type envelope
  it('CR-006: GET ?format=pdf returns 200 with PDF format envelope', async () => {
    const res = await GET(createGetRequest({ format: 'pdf' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.format).toBe('pdf')
    expect(body.data).toBeDefined()
    expect(typeof body.data).toBe('string')
    expect(body.filename).toMatch(/\.pdf$/)
  })

  // CR-007: Invalid format returns 400
  it('CR-007: GET with invalid format returns 400', async () => {
    const res = await GET(createGetRequest({ format: 'html' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Unsupported format')
    expect(body.error).toContain('html')
  })

  // CR-008: Invalid scope returns 400
  it('CR-008: GET with invalid scope returns 400', async () => {
    const res = await GET(createGetRequest({ format: 'json', scope: 'unknown-scope' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid scope')
    expect(body.error).toContain('unknown-scope')
  })

  // CR-009: Unauthorized request returns 401
  it('CR-009: GET without auth returns 401', async () => {
    ;(checkApiAuth as ReturnType<typeof vi.fn>).mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const res = await GET(createGetRequest({ format: 'json' }))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    // Storage should not be called when auth fails
    expect(fileStorage.queryExecutions).not.toHaveBeenCalled()
    expect(getGuardStats).not.toHaveBeenCalled()
  })

  // CR-010: scope=all includes all sections
  it('CR-010: GET ?scope=all returns report with all sections present', async () => {
    const res = await GET(createGetRequest({ format: 'json', scope: 'all' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scope).toBe('all')
    // All sections must be present
    expect(body).toHaveProperty('llm')
    expect(body).toHaveProperty('compliance')
    expect(body).toHaveProperty('evidence')
    expect(body).toHaveProperty('guard')
    expect(body).toHaveProperty('shingan')
    expect(body).toHaveProperty('executiveBrief')
    // Verify structure of each section
    expect(body.llm).toHaveProperty('totalExecutions')
    expect(body.compliance).toHaveProperty('totalFrameworks')
    expect(body.evidence).toHaveProperty('totalEntries')
    expect(body.guard).toHaveProperty('totalEvents')
    expect(body.shingan).toHaveProperty('totalScanned')
  })
})
