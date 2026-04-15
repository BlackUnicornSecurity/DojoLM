/**
 * File: api/compliance/export/__tests__/route.test.ts
 * Purpose: Tests for GET /api/compliance/export — all formats, auth, edge cases
 * Test IDs: CE-001 through CE-008
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

vi.mock('@/lib/data/baiss-framework', () => ({
  BAISS_CONTROLS: [
    {
      id: 'BAISS-01',
      title: 'Input Validation',
      assessmentType: 'automated',
      requirement: 'Validate all inputs',
      mappedFrameworks: { 'owasp-llm': ['LLM01'] },
    },
  ],
  BAISS_CATEGORIES: ['input-security'],
  getBAISSSummary: vi.fn(() => ({
    totalControls: 1,
    automated: 1,
    semiAutomated: 0,
    manual: 0,
    categories: 1,
    frameworksCovered: 1,
  })),
}))

vi.mock('bu-tpi/compliance', () => ({
  NIST_800_218A: { id: 'nist-800-218a', name: 'NIST 800-218A', version: '1.0', controls: [] },
  ISO_23894: { id: 'iso-23894', name: 'ISO 23894', version: '2023', controls: [] },
  ISO_24027: { id: 'iso-24027', name: 'ISO 24027', version: '2021', controls: [] },
  ISO_24028: { id: 'iso-24028', name: 'ISO 24028', version: '2020', controls: [] },
  GOOGLE_SAIF: { id: 'google-saif', name: 'Google SAIF', version: '2023', controls: [] },
  CISA_NCSC: { id: 'cisa-ncsc', name: 'CISA NCSC', version: '2024', controls: [] },
  SLSA_V1: { id: 'slsa-v1', name: 'SLSA v1', version: '1.0', controls: [] },
  ML_BOM: { id: 'ml-bom', name: 'ML BOM', version: '1.0', controls: [] },
  OPENSSF: { id: 'openssf', name: 'OpenSSF', version: '2023', controls: [] },
  NIST_CSF_2: { id: 'nist-csf-2', name: 'NIST CSF 2.0', version: '2.0', controls: [] },
  UK_DSIT: { id: 'uk-dsit', name: 'UK DSIT', version: '2024', controls: [] },
  IEEE_P7000: { id: 'ieee-p7000', name: 'IEEE P7000', version: '2021', controls: [] },
  NIST_AI_100_4: { id: 'nist-ai-100-4', name: 'NIST AI 100-4', version: '2024', controls: [] },
  EU_AI_ACT_GPAI: { id: 'eu-ai-act-gpai', name: 'EU AI Act GPAI', version: '2024', controls: [] },
  SG_MGAF: { id: 'sg-mgaf', name: 'SG MGAF', version: '2023', controls: [] },
  CA_AIA: { id: 'ca-aia', name: 'CA AIA', version: '2023', controls: [] },
  AU_AIE: { id: 'au-aie', name: 'AU AIE', version: '2023', controls: [] },
  ISO_27001_AI: { id: 'iso-27001-ai', name: 'ISO 27001 AI', version: '2022', controls: [] },
  OWASP_ASVS: { id: 'owasp-asvs', name: 'OWASP ASVS', version: '4.0', controls: [] },
  OWASP_API: { id: 'owasp-api', name: 'OWASP API', version: '2023', controls: [] },
  NIST_800_53_AI: { id: 'nist-800-53-ai', name: 'NIST 800-53 AI', version: '5.0', controls: [] },
  GDPR_AI: { id: 'gdpr-ai', name: 'GDPR AI', version: '2018', controls: [] },
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
    internal = { pageSize: { getWidth: () => 210 } }
  },
}))

vi.mock('jspdf-autotable', () => ({ default: vi.fn() }))

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { GET } from '../route'
import { checkApiAuth } from '@/lib/api-auth'
import { fileStorage } from '@/lib/storage/file-storage'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Counter ensures each test request gets a unique IP so the module-level rate
// limiter (10 req/min/IP) cannot cause cross-test contamination.
let __ceTestRequestCounter = 0
function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:42001/api/compliance/export')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  __ceTestRequestCounter += 1
  const oct3 = __ceTestRequestCounter % 250
  const oct4 = Math.floor(__ceTestRequestCounter / 250) % 250
  const uniqueIp = `10.0.${oct3}.${oct4 + 1}`
  return new NextRequest(url.toString(), {
    method: 'GET',
    headers: { 'x-forwarded-for': uniqueIp },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/compliance/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(checkApiAuth as ReturnType<typeof vi.fn>).mockReturnValue(null)
    ;(fileStorage.queryExecutions as ReturnType<typeof vi.fn>).mockResolvedValue({
      executions: [],
      total: 0,
    })
    ;(fileStorage.getModelConfigs as ReturnType<typeof vi.fn>).mockResolvedValue([])
  })

  // CE-001: JSON format returns 200 with frameworks array
  it('CE-001: GET ?format=json returns 200 with frameworks array', async () => {
    const res = await GET(createGetRequest({ format: 'json' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('frameworks')
    expect(Array.isArray(body.frameworks)).toBe(true)
    expect(body.frameworks.length).toBeGreaterThan(0)
    expect(body.format).toBe('json')
    expect(body.exportedAt).toBeDefined()
  })

  // CE-002: Markdown format returns 200 with markdown content
  it('CE-002: GET ?format=markdown returns 200 with markdown text', async () => {
    const res = await GET(createGetRequest({ format: 'markdown' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.format).toBe('markdown')
    expect(typeof body.content).toBe('string')
    expect(body.content).toContain('# Compliance Export Report')
    expect(body.filename).toMatch(/\.md$/)
  })

  // CE-003: CSV format returns 200 with CSV text and correct headers
  it('CE-003: GET ?format=csv returns 200 with CSV text and column headers', async () => {
    const res = await GET(createGetRequest({ format: 'csv' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    expect(res.headers.get('Content-Disposition')).toContain('.csv')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')

    const text = await res.text()
    expect(text).toContain('Framework ID')
    expect(text).toContain('Framework Name')
    expect(text).toContain('Control ID')
    expect(text).toContain('Status')
  })

  // CE-004: PDF format returns 200 with PDF content-type envelope
  it('CE-004: GET ?format=pdf returns 200 with PDF format envelope', async () => {
    const res = await GET(createGetRequest({ format: 'pdf' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.format).toBe('pdf')
    expect(body.data).toBeDefined()
    expect(typeof body.data).toBe('string')
    expect(body.filename).toMatch(/\.pdf$/)
  })

  // CE-005: Invalid format returns 400
  it('CE-005: GET with invalid format returns 400', async () => {
    const res = await GET(createGetRequest({ format: 'xml' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Unsupported export format')
    // Note: the actual format token is not echoed back, valid formats are listed instead
    expect(body.error).toContain('json')
  })

  // CE-006: Unauthorized request returns 401
  it('CE-006: GET without auth returns 401', async () => {
    ;(checkApiAuth as ReturnType<typeof vi.fn>).mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const res = await GET(createGetRequest({ format: 'json' }))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    // Storage should not be called when auth fails
    expect(fileStorage.queryExecutions).not.toHaveBeenCalled()
  })

  // CE-007: Export includes compliance mapping data (summary + baissSummary)
  it('CE-007: JSON export includes compliance mapping data and summary stats', async () => {
    const res = await GET(createGetRequest({ format: 'json' }))

    expect(res.status).toBe(200)
    const body = await res.json()

    // Top-level summary block
    expect(body).toHaveProperty('summary')
    expect(typeof body.summary.totalFrameworks).toBe('number')
    expect(body.summary.totalFrameworks).toBeGreaterThan(0)
    expect(typeof body.summary.implementedAvgCoverage).toBe('number')
    expect(typeof body.summary.allFrameworksAvgCoverage).toBe('number')
    expect(typeof body.summary.openGaps).toBe('number')
    expect(typeof body.summary.coveredControls).toBe('number')
    expect(typeof body.summary.totalControls).toBe('number')

    // BAISS mapping summary (from getBAISSSummary mock)
    expect(body).toHaveProperty('baissSummary')
    expect(body.baissSummary.totalControls).toBe(1)
    expect(body.baissSummary.automated).toBe(1)
    expect(body.baissSummary.frameworksCovered).toBe(1)

    // Each framework should carry tier information (compliance mapping metadata)
    const owaspFw = body.frameworks.find((f: { id: string }) => f.id === 'owasp-llm')
    expect(owaspFw).toBeDefined()
    expect(owaspFw.tier).toBe('implemented')
    expect(Array.isArray(owaspFw.controls)).toBe(true)
    expect(owaspFw.controls.length).toBeGreaterThan(0)
  })

  // CE-008: Export includes generatedAt timestamp
  it('CE-008: JSON export includes a valid ISO timestamp in generatedAt and exportedAt', async () => {
    const before = Date.now()
    const res = await GET(createGetRequest({ format: 'json' }))
    const after = Date.now()

    expect(res.status).toBe(200)
    const body = await res.json()

    // generatedAt comes from assembleComplianceData
    expect(body).toHaveProperty('generatedAt')
    const generatedAt = new Date(body.generatedAt).getTime()
    expect(generatedAt).toBeGreaterThanOrEqual(before)
    expect(generatedAt).toBeLessThanOrEqual(after)

    // exportedAt comes from exportJSON
    expect(body).toHaveProperty('exportedAt')
    const exportedAt = new Date(body.exportedAt).getTime()
    expect(exportedAt).toBeGreaterThanOrEqual(before)
    expect(exportedAt).toBeLessThanOrEqual(after)
  })
})
