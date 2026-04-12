/**
 * File: admin-validation-api.test.ts
 * Purpose: Unit tests for Admin Validation API routes (K6.4)
 * Test IDs: VAL-001 to VAL-030
 *
 * Tests cover:
 * - Auth enforcement (admin role required)
 * - Input validation (invalid body, invalid runId, missing fields)
 * - Rate limiting (concurrent run rejection via lock file)
 * - UUID validation for runId parameter
 * - Pagination parameter validation
 * - Status codes (200, 400, 404, 429, 500)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Track withAuth calls to extract handler and verify options
const withAuthCalls: Array<{ handler: Function; options: Record<string, unknown> }> = []

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, options?: Record<string, unknown>) => {
    withAuthCalls.push({ handler, options: options ?? {} })
    // Return a wrapper that calls the handler directly with admin user context
    return async (req: NextRequest, ctx?: Record<string, unknown>) => {
      return handler(req, { params: ctx?.params, user: { id: 'admin-1', role: 'admin', username: 'admin' } })
    }
  },
}))

vi.mock('@/lib/audit-logger', () => ({
  auditLog: {
    configChange: vi.fn().mockResolvedValue(undefined),
    validationFailure: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock fs module
const mockReadFileSync = vi.fn()
const mockWriteFileSync = vi.fn()
const mockRenameSync = vi.fn()
const mockMkdirSync = vi.fn()
const mockReaddirSync = vi.fn()
const mockUnlinkSync = vi.fn()
const mockOpenSync = vi.fn(() => 42) // return a file descriptor
const mockCloseSync = vi.fn()

vi.mock('fs', () => {
  const fsMock = {
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
    renameSync: (...args: unknown[]) => mockRenameSync(...args),
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
    readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
    unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
    openSync: (...args: unknown[]) => mockOpenSync(...args),
    closeSync: (...args: unknown[]) => mockCloseSync(...args),
  }
  return { ...fsMock, default: fsMock }
})

// Mock runtime-paths to avoid filesystem access
vi.mock('@/lib/runtime-paths', () => ({
  getDataPath: (sub: string) => `/tmp/test-data/${sub}`,
}))

// Mock validation-executor helpers
const mockAcquireLock = vi.fn(() => true)
const mockWriteProgressAtomic = vi.fn()

vi.mock('@/lib/validation-executor', () => ({
  SAFE_MODULE_ID: /^[a-zA-Z0-9_-]{1,128}$/,
  acquireLock: (...args: unknown[]) => mockAcquireLock(...args),
  writeProgressAtomic: (...args: unknown[]) => mockWriteProgressAtomic(...args),
  executeValidationRun: vi.fn(),
}))

// Mock crypto for deterministic UUIDs in tests
vi.mock('node:crypto', () => ({
  default: {
    randomUUID: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    randomBytes: (n: number) => ({
      toString: () => '0'.repeat(n * 2),
    }),
  },
  randomUUID: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  randomBytes: (n: number) => ({
    toString: () => '0'.repeat(n * 2),
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  const init: { method: string; body?: string; headers?: Record<string, string> } = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:42001'), init)
}

// ---------------------------------------------------------------------------
// Tests: POST /api/admin/validation/run
// ---------------------------------------------------------------------------

describe('POST /api/admin/validation/run', () => {
  let POST: (req: NextRequest, ctx?: Record<string, unknown>) => Promise<NextResponse>

  beforeEach(async () => {
    vi.clearAllMocks()
    withAuthCalls.length = 0
    // Default: no lock file
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    // Default: lock acquisition succeeds
    mockAcquireLock.mockReturnValue(true)

    const mod = await import('../../app/api/admin/validation/run/route')
    POST = mod.POST as unknown as typeof POST
  })

  it('VAL-001: requires admin role via withAuth', async () => {
    // The withAuth mock captured the options — verify admin role is required
    const call = withAuthCalls.find(c => c.options.role === 'admin' && !c.options.skipCsrf)
    expect(call).toBeDefined()
  })

  it('VAL-002: rejects invalid JSON body', async () => {
    const req = new NextRequest(
      new URL('http://localhost:42001/api/admin/validation/run'),
      {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Invalid JSON/)
  })

  it('VAL-003: rejects non-object body', async () => {
    const req = makeRequest('POST', '/api/admin/validation/run')
    // Override with array body
    const req2 = new NextRequest(
      new URL('http://localhost:42001/api/admin/validation/run'),
      {
        method: 'POST',
        body: JSON.stringify([1, 2, 3]),
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const res = await POST(req2)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/JSON object/)
  })

  it('VAL-004: rejects unknown fields', async () => {
    const req = makeRequest('POST', '/api/admin/validation/run', {
      modules: ['mod-a'],
      unknownField: true,
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Unknown fields/)
  })

  it('VAL-005: rejects modules that is not an array', async () => {
    const req = makeRequest('POST', '/api/admin/validation/run', {
      modules: 'not-an-array',
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/array of strings/)
  })

  it('VAL-006: rejects modules with non-string elements', async () => {
    const req = makeRequest('POST', '/api/admin/validation/run', {
      modules: [123, 'valid'],
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/module must match/)
  })

  it('VAL-007: rejects non-boolean fullCorpus', async () => {
    const req = makeRequest('POST', '/api/admin/validation/run', {
      fullCorpus: 'yes',
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/fullCorpus must be a boolean/)
  })

  it('VAL-008: rejects non-boolean includeHoldout', async () => {
    const req = makeRequest('POST', '/api/admin/validation/run', {
      includeHoldout: 1,
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/includeHoldout must be a boolean/)
  })

  it('VAL-009: returns 429 when lock file exists (concurrent run)', async () => {
    const lockRunId = '11111111-2222-3333-4444-555555555555'
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ runId: lockRunId, startedAt: new Date().toISOString() })
    )

    const req = makeRequest('POST', '/api/admin/validation/run', {
      fullCorpus: true,
      includeHoldout: false,
    })

    const res = await POST(req)
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toMatch(/already in progress/)
    expect(json.runId).toBe(lockRunId)
  })

  it('VAL-010: creates run successfully with valid body', async () => {
    const req = makeRequest('POST', '/api/admin/validation/run', {
      modules: ['prompt-injection', 'xss'],
      fullCorpus: true,
      includeHoldout: false,
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.runId).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    expect(json.status).toBe('queued')

    // Verify lock acquisition and progress file were written
    expect(mockAcquireLock).toHaveBeenCalled()
    expect(mockWriteProgressAtomic).toHaveBeenCalled()
  })

  it('VAL-011: creates run with empty body (defaults)', async () => {
    const req = makeRequest('POST', '/api/admin/validation/run', {})

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.runId).toBeDefined()
    expect(json.status).toBe('queued')
  })
})

// ---------------------------------------------------------------------------
// Tests: GET /api/admin/validation/status/[runId]
// ---------------------------------------------------------------------------

describe('GET /api/admin/validation/status/[runId]', () => {
  let GET: (req: NextRequest, ctx?: Record<string, unknown>) => Promise<NextResponse>

  beforeEach(async () => {
    vi.clearAllMocks()
    withAuthCalls.length = 0

    const mod = await import('../../app/api/admin/validation/status/[runId]/route')
    GET = mod.GET as unknown as typeof GET
  })

  it('VAL-012: requires admin role with skipCsrf', async () => {
    const call = withAuthCalls.find(c => c.options.role === 'admin' && c.options.skipCsrf === true)
    expect(call).toBeDefined()
  })

  it('VAL-013: rejects invalid runId format (not UUID)', async () => {
    const req = makeRequest('GET', '/api/admin/validation/status/not-a-uuid')

    const res = await GET(req, { params: { runId: 'not-a-uuid' } })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Invalid run ID/)
  })

  it('VAL-014: rejects path traversal attempt in runId', async () => {
    const req = makeRequest('GET', '/api/admin/validation/status/../../../etc/passwd')

    const res = await GET(req, { params: { runId: '../../../etc/passwd' } })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Invalid run ID/)
  })

  it('VAL-015: returns 404 for non-existent run', async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })

    const validUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const req = makeRequest('GET', `/api/admin/validation/status/${validUuid}`)

    const res = await GET(req, { params: { runId: validUuid } })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toMatch(/not found/)
  })

  it('VAL-016: returns progress for valid runId', async () => {
    const progress = {
      status: 'running',
      progress: 45,
      currentModule: 'prompt-injection',
      modulesCompleted: 2,
      modulesTotal: 5,
      samplesProcessed: 450,
      samplesTotal: 1000,
      nonConformities: 3,
      elapsed: 120,
      eta: 150,
    }
    mockReadFileSync.mockReturnValue(JSON.stringify(progress))

    const validUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const req = makeRequest('GET', `/api/admin/validation/status/${validUuid}`)

    const res = await GET(req, { params: { runId: validUuid } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('running')
    expect(json.progress).toBe(45)
    expect(json.currentModule).toBe('prompt-injection')
    expect(json.modulesCompleted).toBe(2)
    expect(json.samplesProcessed).toBe(450)
    expect(json.nonConformities).toBe(3)
  })

  it('VAL-017: rejects missing runId parameter', async () => {
    const req = makeRequest('GET', '/api/admin/validation/status/')

    const res = await GET(req, { params: {} })
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Tests: GET /api/admin/validation/runs
// ---------------------------------------------------------------------------

describe('GET /api/admin/validation/runs', () => {
  let GET: (req: NextRequest, ctx?: Record<string, unknown>) => Promise<NextResponse>

  beforeEach(async () => {
    vi.clearAllMocks()
    withAuthCalls.length = 0

    const mod = await import('../../app/api/admin/validation/runs/route')
    GET = mod.GET as unknown as typeof GET
  })

  it('VAL-018: requires admin role with skipCsrf', async () => {
    // Make sure it does not fail by providing empty dir
    mockReaddirSync.mockReturnValue([])
    const call = withAuthCalls.find(c => c.options.role === 'admin' && c.options.skipCsrf === true)
    expect(call).toBeDefined()
  })

  it('VAL-019: rejects invalid page parameter', async () => {
    const req = makeRequest('GET', '/api/admin/validation/runs?page=0')

    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/page/)
  })

  it('VAL-020: rejects invalid limit parameter', async () => {
    const req = makeRequest('GET', '/api/admin/validation/runs?limit=0')

    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/limit/)
  })

  it('VAL-021: rejects limit > 100', async () => {
    const req = makeRequest('GET', '/api/admin/validation/runs?limit=200')

    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/limit/)
  })

  it('VAL-022: returns empty list when no runs exist', async () => {
    mockReaddirSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })

    const req = makeRequest('GET', '/api/admin/validation/runs')

    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.runs).toEqual([])
    expect(json.total).toBe(0)
  })

  it('VAL-023: returns paginated runs sorted by date descending', async () => {
    const uuid1 = 'aaaaaaaa-bbbb-cccc-dddd-111111111111'
    const uuid2 = 'aaaaaaaa-bbbb-cccc-dddd-222222222222'

    mockReaddirSync.mockReturnValue([uuid1, uuid2])
    mockReadFileSync
      .mockReturnValueOnce(JSON.stringify({
        startedAt: '2024-01-01T00:00:00Z',
        status: 'completed',
        elapsed: 300,
        modules: ['mod-a'],
        nonConformities: 1,
      }))
      .mockReturnValueOnce(JSON.stringify({
        startedAt: '2024-06-01T00:00:00Z',
        status: 'completed',
        elapsed: 200,
        modules: ['mod-b'],
        nonConformities: 0,
      }))

    const req = makeRequest('GET', '/api/admin/validation/runs?page=1&limit=10')

    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.total).toBe(2)
    expect(json.runs).toHaveLength(2)
    // Sorted descending: uuid2 (June) before uuid1 (Jan)
    expect(json.runs[0].date).toBe('2024-06-01T00:00:00Z')
    expect(json.runs[1].date).toBe('2024-01-01T00:00:00Z')
  })
})

// ---------------------------------------------------------------------------
// Tests: POST /api/admin/validation/calibrate
// ---------------------------------------------------------------------------

describe('POST /api/admin/validation/calibrate', () => {
  let POST: (req: NextRequest, ctx?: Record<string, unknown>) => Promise<NextResponse>

  beforeEach(async () => {
    vi.clearAllMocks()
    withAuthCalls.length = 0
    // Default: no lock file
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    mockReaddirSync.mockReturnValue([])

    const mod = await import('../../app/api/admin/validation/calibrate/route')
    POST = mod.POST as unknown as typeof POST
  })

  it('VAL-024: requires admin role with CSRF enforcement', async () => {
    const call = withAuthCalls.find(c => c.options.role === 'admin' && !c.options.skipCsrf)
    expect(call).toBeDefined()
  })

  it('VAL-025: returns 429 when calibration lock exists', async () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ runId: 'calib-run-id', startedAt: '2024-01-01T00:00:00Z' })
    )

    const req = makeRequest('POST', '/api/admin/validation/calibrate')

    const res = await POST(req)
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toMatch(/already in progress/)
  })

  it('VAL-026: returns calibration results for empty module list', async () => {
    const req = makeRequest('POST', '/api/admin/validation/calibrate')

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.runId).toBeDefined()
    expect(json.results).toEqual([])
    expect(json.summary.total).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Tests: GET /api/admin/validation/modules
// ---------------------------------------------------------------------------

describe('GET /api/admin/validation/modules', () => {
  let GET: (req: NextRequest, ctx?: Record<string, unknown>) => Promise<NextResponse>

  beforeEach(async () => {
    vi.clearAllMocks()
    withAuthCalls.length = 0

    const mod = await import('../../app/api/admin/validation/modules/route')
    GET = mod.GET as unknown as typeof GET
  })

  it('VAL-027: requires admin role with skipCsrf', async () => {
    mockReaddirSync.mockReturnValue([])
    const call = withAuthCalls.find(c => c.options.role === 'admin' && c.options.skipCsrf === true)
    expect(call).toBeDefined()
  })

  it('VAL-028: returns empty list when no modules exist', async () => {
    mockReaddirSync.mockReturnValue([])

    const req = makeRequest('GET', '/api/admin/validation/modules')

    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.modules).toEqual([])
  })

  it('VAL-029: returns module info with validity status', async () => {
    mockReaddirSync.mockReturnValue(['prompt-injection', 'xss-scanner'])

    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
    mockReadFileSync
      .mockReturnValueOnce(JSON.stringify({
        tier: 1,
        lastCalibrationDate: recentDate,
        currentToolHash: 'abc123',
        calibratedToolHash: 'abc123',
      }))
      .mockReturnValueOnce(JSON.stringify({
        tier: 2,
        lastCalibrationDate: '2023-01-01T00:00:00Z',
        currentToolHash: 'def456',
        calibratedToolHash: 'old-hash',
      }))

    const req = makeRequest('GET', '/api/admin/validation/modules')

    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.modules).toHaveLength(2)
    // First module: valid (matching hash, recent calibration)
    expect(json.modules[0].moduleId).toBe('prompt-injection')
    expect(json.modules[0].tier).toBe(1)
    expect(json.modules[0].valid).toBe(true)
    // Second module: invalid (hash mismatch)
    expect(json.modules[1].moduleId).toBe('xss-scanner')
    expect(json.modules[1].tier).toBe(2)
    expect(json.modules[1].valid).toBe(false)
  })

  it('VAL-030: handles unreadable module metadata gracefully', async () => {
    mockReaddirSync.mockReturnValue(['broken-module'])
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })

    const req = makeRequest('GET', '/api/admin/validation/modules')

    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.modules).toHaveLength(1)
    expect(json.modules[0].moduleId).toBe('broken-module')
    expect(json.modules[0].valid).toBe(false)
    expect(json.modules[0].tier).toBeNull()
  })
})
