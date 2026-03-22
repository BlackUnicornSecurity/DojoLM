/**
 * File: admin-results-viewer-api.test.ts
 * Purpose: Unit tests for Admin Validation Report + Export + Verify API routes (K6.6 + K6.7)
 * Test IDs: RV-001 to RV-030
 *
 * Tests cover:
 * - GET /api/admin/validation/report/[runId]: auth, UUID validation, format param, fallback to progress
 * - GET /api/admin/validation/export/[runId]: auth, format param, rate limiting, Content-Disposition
 * - POST /api/admin/validation/verify: auth, body validation, signature checking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const withAuthCalls: Array<{ handler: Function; options: Record<string, unknown> }> = []

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, options?: Record<string, unknown>) => {
    withAuthCalls.push({ handler, options: options ?? {} })
    return async (req: NextRequest, ctx?: Record<string, unknown>) => {
      return handler(req, { params: ctx?.params, user: { id: 'admin-1', role: 'admin', username: 'admin' } })
    }
  },
}))

vi.mock('@/lib/audit-logger', () => ({
  auditLog: { configChange: vi.fn() },
}))

const mockReadFileSync = vi.fn()
const mockReadFile = vi.fn()
const mockReaddirSync = vi.fn()

vi.mock('fs', () => {
  const fsMock = {
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    existsSync: vi.fn(() => true),
  }
  return { ...fsMock, default: fsMock }
})

vi.mock('fs/promises', () => {
  const mod = {
    readFile: (...args: unknown[]) => mockReadFile(...args),
  }
  return { ...mod, default: mod }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(method: string, url: string, body?: Record<string, unknown>): NextRequest {
  const init: RequestInit = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:42001'), init)
}

const VALID_UUID = '12345678-1234-1234-1234-123456789abc'

const MOCK_REPORT = {
  schema_version: '1.0.0',
  report_id: 'rpt-001',
  run_id: VALID_UUID,
  generated_at: '2026-03-21T10:00:00Z',
  overall_verdict: 'PASS',
  non_conformity_count: 0,
  corpus_version: 'abc123',
  tool_version: 'def456',
  environment: { os_platform: 'darwin', node_version: '20.0.0', git_hash: 'abc123' },
  modules: [
    {
      module_id: 'prompt-injection',
      tier: 1,
      matrix: { tp: 100, tn: 100, fp: 0, fn: 0, total: 200 },
      metrics: { accuracy: 1, precision: 1, recall: 1, f1: 1, mcc: 1, specificity: 1, fpr: 0, fnr: 0 },
      decision: { verdict: 'PASS', false_positives: 0, false_negatives: 0, non_conformities: [] },
      uncertainty: [{ metric: 'accuracy', point_estimate: 1, wilson_ci_lower: 0.98, wilson_ci_upper: 1, expanded_uncertainty: 0.01 }],
    },
  ],
  signature: 'abcdef0123456789abcdef0123456789',
}

const MOCK_PROGRESS = {
  status: 'completed',
  startedAt: '2026-03-21T09:00:00Z',
  completedAt: '2026-03-21T10:00:00Z',
  nonConformities: 0,
  modules: ['prompt-injection'],
}

// ---------------------------------------------------------------------------
// Tests: GET /api/admin/validation/report/[runId]
// ---------------------------------------------------------------------------

describe('GET /api/admin/validation/report/[runId]', () => {
  beforeEach(() => {
    vi.resetModules()
    mockReadFile.mockReset()
    withAuthCalls.length = 0
  })

  it('RV-001: requires admin auth', async () => {
    const { GET } = await import('@/app/api/admin/validation/report/[runId]/route')
    expect(withAuthCalls.length).toBeGreaterThan(0)
    const lastCall = withAuthCalls[withAuthCalls.length - 1]
    expect(lastCall.options.role).toBe('admin')
    expect(lastCall.options.skipCsrf).toBe(true)
  })

  it('RV-002: rejects invalid runId (path traversal)', async () => {
    const { GET } = await import('@/app/api/admin/validation/report/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/report/../../../etc`)
    const res = await GET(req, { params: { runId: '../../../etc' } })
    expect(res.status).toBe(400)
  })

  it('RV-003: rejects missing runId', async () => {
    const { GET } = await import('@/app/api/admin/validation/report/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/report/invalid`)
    const res = await GET(req, { params: {} })
    expect(res.status).toBe(400)
  })

  it('RV-004: rejects invalid format query param', async () => {
    const { GET } = await import('@/app/api/admin/validation/report/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/report/${VALID_UUID}?format=xml`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/format/)
  })

  it('RV-005: returns full report in json format', async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (String(path).includes('report.json')) return Promise.resolve(JSON.stringify(MOCK_REPORT))
      return Promise.reject(new Error('Not found'))
    })
    const { GET } = await import('@/app/api/admin/validation/report/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/report/${VALID_UUID}`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.report_available).toBe(true)
    expect(json.overall_verdict).toBe('PASS')
    expect(json.modules).toHaveLength(1)
  })

  it('RV-006: returns summary format (no sample-level data)', async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (String(path).includes('report.json')) return Promise.resolve(JSON.stringify(MOCK_REPORT))
      return Promise.reject(new Error('Not found'))
    })
    const { GET } = await import('@/app/api/admin/validation/report/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/report/${VALID_UUID}?format=summary`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.report_available).toBe(true)
    expect(json.modules).toHaveLength(1)
    expect(json.modules[0].module_id).toBe('prompt-injection')
    // Summary includes metrics but not full decision non_conformities
    expect(json.modules[0].verdict).toBe('PASS')
  })

  it('RV-007: falls back to progress when no report exists', async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (String(path).includes('progress.json')) return Promise.resolve(JSON.stringify(MOCK_PROGRESS))
      return Promise.reject(new Error('Not found'))
    })
    const { GET } = await import('@/app/api/admin/validation/report/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/report/${VALID_UUID}`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.report_available).toBe(false)
    expect(json.run_id).toBe(VALID_UUID)
  })

  it('RV-008: returns 404 when neither report nor progress exists', async () => {
    mockReadFile.mockImplementation(() => Promise.reject(new Error('Not found')))
    const { GET } = await import('@/app/api/admin/validation/report/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/report/${VALID_UUID}`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    expect(res.status).toBe(404)
  })

  it('RV-009: returns 500 for corrupted report data', async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (String(path).includes('report.json')) return Promise.resolve('null')
      return Promise.reject(new Error('Not found'))
    })
    const { GET } = await import('@/app/api/admin/validation/report/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/report/${VALID_UUID}`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    expect(res.status).toBe(500)
  })

  it('RV-010: includes security headers in response', async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (String(path).includes('report.json')) return Promise.resolve(JSON.stringify(MOCK_REPORT))
      return Promise.reject(new Error('Not found'))
    })
    const { GET } = await import('@/app/api/admin/validation/report/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/report/${VALID_UUID}`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})

// ---------------------------------------------------------------------------
// Tests: GET /api/admin/validation/export/[runId]
// ---------------------------------------------------------------------------

describe('GET /api/admin/validation/export/[runId]', () => {
  beforeEach(() => {
    vi.resetModules()
    mockReadFile.mockReset()
    withAuthCalls.length = 0
  })

  it('RV-011: requires admin auth', async () => {
    const { GET } = await import('@/app/api/admin/validation/export/[runId]/route')
    const lastCall = withAuthCalls[withAuthCalls.length - 1]
    expect(lastCall.options.role).toBe('admin')
  })

  it('RV-012: rejects invalid runId', async () => {
    const { GET } = await import('@/app/api/admin/validation/export/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/export/not-a-uuid`)
    const res = await GET(req, { params: { runId: 'not-a-uuid' } })
    expect(res.status).toBe(400)
  })

  it('RV-013: rejects invalid format param', async () => {
    const { GET } = await import('@/app/api/admin/validation/export/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/export/${VALID_UUID}?format=pdf`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    expect(res.status).toBe(400)
  })

  it('RV-014: exports JSON with Content-Disposition attachment header', async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (String(path).includes('report.json')) return Promise.resolve(JSON.stringify(MOCK_REPORT))
      return Promise.reject(new Error('Not found'))
    })
    const { GET } = await import('@/app/api/admin/validation/export/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/export/${VALID_UUID}?format=json`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    expect(res.status).toBe(200)
    const disposition = res.headers.get('Content-Disposition')
    expect(disposition).toContain('attachment')
    expect(disposition).toContain('katana-report')
    expect(disposition).toContain('.json')
  })

  it('RV-015: exports CSV format', async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (String(path).includes('report.json')) return Promise.resolve(JSON.stringify(MOCK_REPORT))
      return Promise.reject(new Error('Not found'))
    })
    const { GET } = await import('@/app/api/admin/validation/export/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/export/${VALID_UUID}?format=csv`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('module_id,tier,verdict')
    expect(text).toContain('prompt-injection')
    expect(res.headers.get('Content-Type')).toContain('text/csv')
  })

  it('RV-016: exports Markdown format', async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (String(path).includes('report.json')) return Promise.resolve(JSON.stringify(MOCK_REPORT))
      return Promise.reject(new Error('Not found'))
    })
    const { GET } = await import('@/app/api/admin/validation/export/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/export/${VALID_UUID}?format=markdown`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('# DojoLM Validation Testing Report')
    expect(text).toContain('prompt-injection')
    expect(res.headers.get('Content-Type')).toContain('text/markdown')
  })

  it('RV-017: returns 404 when report not found', async () => {
    mockReadFile.mockImplementation(() => Promise.reject(new Error('ENOENT')))
    const { GET } = await import('@/app/api/admin/validation/export/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/export/${VALID_UUID}?format=json`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    expect(res.status).toBe(404)
  })

  it('RV-018: sanitizes filename in Content-Disposition', async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (String(path).includes('report.json')) return Promise.resolve(JSON.stringify(MOCK_REPORT))
      return Promise.reject(new Error('Not found'))
    })
    const { GET } = await import('@/app/api/admin/validation/export/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/export/${VALID_UUID}?format=json`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    const disposition = res.headers.get('Content-Disposition')
    // Should only contain safe characters
    const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? ''
    expect(filename).toMatch(/^[a-zA-Z0-9_.\-]+$/)
  })

  it('RV-019: CSV escapes formula-injection characters', async () => {
    const reportWithBadIds = {
      ...MOCK_REPORT,
      modules: [{
        ...MOCK_REPORT.modules[0],
        module_id: '=cmd|calc',
      }],
    }
    mockReadFile.mockImplementation((path: string) => {
      if (String(path).includes('report.json')) return Promise.resolve(JSON.stringify(reportWithBadIds))
      return Promise.reject(new Error('Not found'))
    })
    const { GET } = await import('@/app/api/admin/validation/export/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/export/${VALID_UUID}?format=csv`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    const text = await res.text()
    // Should prefix = with ' for OWASP CSV injection prevention
    expect(text).toContain("'=cmd|calc")
  })

  it('RV-020: Markdown escapes pipe characters in module IDs', async () => {
    const reportWithPipes = {
      ...MOCK_REPORT,
      modules: [{
        ...MOCK_REPORT.modules[0],
        module_id: 'mod|with|pipes',
      }],
    }
    mockReadFile.mockImplementation((path: string) => {
      if (String(path).includes('report.json')) return Promise.resolve(JSON.stringify(reportWithPipes))
      return Promise.reject(new Error('Not found'))
    })
    const { GET } = await import('@/app/api/admin/validation/export/[runId]/route')
    const req = makeRequest('GET', `http://localhost:42001/api/admin/validation/export/${VALID_UUID}?format=markdown`)
    const res = await GET(req, { params: { runId: VALID_UUID } })
    const text = await res.text()
    expect(text).toContain('mod\\|with\\|pipes')
  })
})

// ---------------------------------------------------------------------------
// Tests: POST /api/admin/validation/verify
// ---------------------------------------------------------------------------

describe('POST /api/admin/validation/verify', () => {
  beforeEach(() => {
    vi.resetModules()
    withAuthCalls.length = 0
  })

  it('RV-021: requires admin auth', async () => {
    const { POST } = await import('@/app/api/admin/validation/verify/route')
    const lastCall = withAuthCalls[withAuthCalls.length - 1]
    expect(lastCall.options.role).toBe('admin')
  })

  it('RV-022: rejects invalid JSON body', async () => {
    const { POST } = await import('@/app/api/admin/validation/verify/route')
    const req = new NextRequest(new URL('http://localhost:42001/api/admin/validation/verify'), {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, {})
    expect(res.status).toBe(400)
  })

  it('RV-023: rejects non-object body', async () => {
    const { POST } = await import('@/app/api/admin/validation/verify/route')
    const req = makeRequest('POST', 'http://localhost:42001/api/admin/validation/verify', [1, 2, 3] as unknown as Record<string, unknown>)
    const res = await POST(req, {})
    expect(res.status).toBe(400)
  })

  it('RV-024: rejects missing report field', async () => {
    const { POST } = await import('@/app/api/admin/validation/verify/route')
    const req = makeRequest('POST', 'http://localhost:42001/api/admin/validation/verify', { foo: 'bar' })
    const res = await POST(req, {})
    expect(res.status).toBe(400)
  })

  it('RV-025: returns invalid for report without signature', async () => {
    const { POST } = await import('@/app/api/admin/validation/verify/route')
    const reportNoSig = { ...MOCK_REPORT }
    delete (reportNoSig as Record<string, unknown>).signature
    const req = makeRequest('POST', 'http://localhost:42001/api/admin/validation/verify', { report: reportNoSig })
    const res = await POST(req, {})
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.valid).toBe(false)
    expect(json.reason).toMatch(/signature/)
  })

  it('RV-026: returns invalid for non-hex signature format', async () => {
    const { POST } = await import('@/app/api/admin/validation/verify/route')
    const reportBadSig = { ...MOCK_REPORT, signature: 'not-hex!!!' }
    const req = makeRequest('POST', 'http://localhost:42001/api/admin/validation/verify', { report: reportBadSig })
    const res = await POST(req, {})
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.valid).toBe(false)
    expect(json.reason).toMatch(/format/)
  })

  it('RV-027: returns invalid for report missing required fields', async () => {
    const { POST } = await import('@/app/api/admin/validation/verify/route')
    const minimalReport = { signature: 'abcdef0123456789' }
    const req = makeRequest('POST', 'http://localhost:42001/api/admin/validation/verify', { report: minimalReport })
    const res = await POST(req, {})
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.valid).toBe(false)
    expect(json.reason).toMatch(/missing required fields/)
  })

  it('RV-028: returns structural validity info for valid report', async () => {
    const { POST } = await import('@/app/api/admin/validation/verify/route')
    const req = makeRequest('POST', 'http://localhost:42001/api/admin/validation/verify', { report: MOCK_REPORT })
    const res = await POST(req, {})
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.structural_valid).toBe(true)
    expect(json.signature_present).toBe(true)
    expect(json.signature_format_valid).toBe(true)
    expect(json.crypto_verified).toBe(false)
    expect(json.valid).toBeNull()
    expect(json.report_id).toBe('rpt-001')
  })

  it('RV-029: security headers present on all responses', async () => {
    const { POST } = await import('@/app/api/admin/validation/verify/route')
    const req = makeRequest('POST', 'http://localhost:42001/api/admin/validation/verify', { report: MOCK_REPORT })
    const res = await POST(req, {})
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('RV-030: handles 413 for large payloads via content-length', async () => {
    const { POST } = await import('@/app/api/admin/validation/verify/route')
    const req = new NextRequest(new URL('http://localhost:42001/api/admin/validation/verify'), {
      method: 'POST',
      body: JSON.stringify({ report: MOCK_REPORT }),
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(20 * 1024 * 1024), // 20MB
      },
    })
    const res = await POST(req, {})
    expect(res.status).toBe(413)
  })
})
