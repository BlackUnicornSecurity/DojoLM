/**
 * File: admin/plugins/__tests__/route.test.ts
 * Purpose: Tests for GET/POST /api/admin/plugins and DELETE/PATCH /api/admin/plugins/[id]
 * Source:
 *   src/app/api/admin/plugins/route.ts
 *   src/app/api/admin/plugins/[id]/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  PluginValidationException,
  PluginDuplicateException,
  PluginLimitException,
  PluginDependentException,
  PluginNotFoundException,
} from '@/lib/plugins/store'

// --- store mock ---
// We swap only the side-effecting store functions; exception classes come from
// the real module via `importOriginal`. This keeps `instanceof` checks in the
// route handlers aligned with production — defining parallel test-local
// exception classes would silently fail the instanceof match if the mock
// surface ever drifted.

// vi.hoisted so these spies exist before `vi.mock`'s hoisted factory runs.
const {
  mockListPlugins,
  mockRegisterPlugin,
  mockSetPluginEnabled,
  mockUnregisterPlugin,
  mockCountByType,
} = vi.hoisted(() => ({
  mockListPlugins: vi.fn(),
  mockRegisterPlugin: vi.fn(),
  mockSetPluginEnabled: vi.fn(),
  mockUnregisterPlugin: vi.fn(),
  mockCountByType: vi.fn(),
}))

vi.mock('@/lib/plugins/store', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/plugins/store')>()
  return {
    ...real,
    listPlugins: mockListPlugins,
    registerPlugin: mockRegisterPlugin,
    setPluginEnabled: mockSetPluginEnabled,
    unregisterPlugin: mockUnregisterPlugin,
    countByType: mockCountByType,
  }
})

// withAuth passthrough
vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function) => handler,
}))

// Demo mode off by default
vi.mock('@/lib/demo', () => ({
  isDemoMode: () => false,
  DEMO_USER: { id: 'demo', username: 'demo', role: 'admin' },
}))

// Audit logger — spy on configChange so failure-path tests can assert the
// rejection reason makes it into the audit trail.
const { mockConfigChange } = vi.hoisted(() => ({ mockConfigChange: vi.fn() }))
vi.mock('@/lib/audit-logger', () => ({
  auditLog: { configChange: mockConfigChange },
}))

// --- helpers ---

function makeRequest(method: string, path: string, body?: unknown): NextRequest {
  if (body === undefined) {
    return new NextRequest(`http://localhost:42001${path}`, { method })
  }
  return new NextRequest(`http://localhost:42001${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function emptyCtx() {
  return { params: Promise.resolve({}) }
}

function idCtx(id: string) {
  return { params: Promise.resolve({ id }) }
}

const validManifest = {
  id: 'my-scanner',
  name: 'My Scanner',
  version: '1.0.0',
  type: 'scanner',
  description: 'A test scanner plugin',
  author: 'QA Team',
  dependencies: [],
  capabilities: ['scan'],
}

const storedRecord = {
  manifest: validManifest,
  enabled: true,
  registeredAt: '2026-04-17T00:00:00.000Z',
  state: 'loaded' as const,
  lastError: null,
}

// --- GET /api/admin/plugins ---

describe('GET /api/admin/plugins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListPlugins.mockReturnValue([])
    mockCountByType.mockReturnValue({ scanner: 0, transform: 0, reporter: 0, orchestrator: 0 })
  })

  it('PLUG-001: returns plugins + counts', async () => {
    mockListPlugins.mockReturnValue([storedRecord])
    mockCountByType.mockReturnValue({ scanner: 1, transform: 0, reporter: 0, orchestrator: 0 })

    const { GET } = await import('@/app/api/admin/plugins/route')
    const res = await GET(makeRequest('GET', '/api/admin/plugins'), emptyCtx())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.plugins).toHaveLength(1)
    expect(body.counts.scanner).toBe(1)
  })

  it('PLUG-002: includes security headers', async () => {
    const { GET } = await import('@/app/api/admin/plugins/route')
    const res = await GET(makeRequest('GET', '/api/admin/plugins'), emptyCtx())

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})

// --- POST /api/admin/plugins ---

describe('POST /api/admin/plugins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRegisterPlugin.mockResolvedValue(storedRecord)
  })

  it('PLUG-010: registers a valid manifest → 201', async () => {
    const { POST } = await import('@/app/api/admin/plugins/route')
    const res = await POST(makeRequest('POST', '/api/admin/plugins', validManifest), emptyCtx())

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.manifest.id).toBe('my-scanner')
    expect(mockRegisterPlugin).toHaveBeenCalledOnce()
  })

  it('PLUG-011: returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:42001/api/admin/plugins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const { POST } = await import('@/app/api/admin/plugins/route')
    const res = await POST(req, emptyCtx())
    expect(res.status).toBe(400)
  })

  it('PLUG-012: returns 400 when schema fields are missing', async () => {
    const { POST } = await import('@/app/api/admin/plugins/route')
    const res = await POST(makeRequest('POST', '/api/admin/plugins', { id: 'x' }), emptyCtx())

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/validation/i)
    expect(Array.isArray(body.errors)).toBe(true)
  })

  it('PLUG-012b: returns 400 when a capability contains control characters', async () => {
    const { POST } = await import('@/app/api/admin/plugins/route')
    const res = await POST(
      makeRequest('POST', '/api/admin/plugins', {
        ...validManifest,
        capabilities: ['scan\nX-Injected: evil'],
      }),
      emptyCtx(),
    )
    expect(res.status).toBe(400)
  })

  it('PLUG-012c: returns 413 when content-length exceeds cap', async () => {
    const req = new NextRequest('http://localhost:42001/api/admin/plugins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'content-length': String(100_000) },
      body: JSON.stringify(validManifest),
    })
    const { POST } = await import('@/app/api/admin/plugins/route')
    const res = await POST(req, emptyCtx())
    expect(res.status).toBe(413)
  })

  it('PLUG-013: returns 400 when type is not in enum', async () => {
    const { POST } = await import('@/app/api/admin/plugins/route')
    const res = await POST(makeRequest('POST', '/api/admin/plugins', {
      ...validManifest,
      type: 'invalid',
    }), emptyCtx())

    expect(res.status).toBe(400)
  })

  it('PLUG-014: returns 409 on duplicate id + audit-logs rejection reason', async () => {
    mockRegisterPlugin.mockRejectedValue(new PluginDuplicateException('my-scanner'))

    const { POST } = await import('@/app/api/admin/plugins/route')
    const res = await POST(makeRequest('POST', '/api/admin/plugins', validManifest), emptyCtx())

    expect(res.status).toBe(409)
    expect(mockConfigChange).toHaveBeenCalledWith(expect.objectContaining({
      newValue: expect.stringContaining('rejected:duplicate'),
    }))
  })

  it('PLUG-015: returns 429 when plugin limit is reached + audit-logs rejection', async () => {
    mockRegisterPlugin.mockRejectedValue(new PluginLimitException())

    const { POST } = await import('@/app/api/admin/plugins/route')
    const res = await POST(makeRequest('POST', '/api/admin/plugins', validManifest), emptyCtx())

    expect(res.status).toBe(429)
    expect(mockConfigChange).toHaveBeenCalledWith(expect.objectContaining({
      newValue: expect.stringContaining('rejected:limit'),
    }))
  })

  it('PLUG-016: returns 400 with field errors + audit-logs validation rejection', async () => {
    mockRegisterPlugin.mockRejectedValue(
      new PluginValidationException([{ field: 'capabilities', message: 'not allowed' }]),
    )

    const { POST } = await import('@/app/api/admin/plugins/route')
    const res = await POST(makeRequest('POST', '/api/admin/plugins', validManifest), emptyCtx())

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.errors).toEqual([{ field: 'capabilities', message: 'not allowed' }])
    expect(mockConfigChange).toHaveBeenCalledWith(expect.objectContaining({
      newValue: expect.stringContaining('rejected:validation'),
    }))
  })
})

// --- DELETE /api/admin/plugins/[id] ---

describe('DELETE /api/admin/plugins/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUnregisterPlugin.mockResolvedValue(storedRecord)
  })

  it('PLUG-020: unregisters an existing plugin → 200', async () => {
    const { DELETE } = await import('@/app/api/admin/plugins/[id]/route')
    const res = await DELETE(
      makeRequest('DELETE', '/api/admin/plugins/my-scanner'),
      idCtx('my-scanner'),
    )
    expect(res.status).toBe(200)
    expect(mockUnregisterPlugin).toHaveBeenCalledWith('my-scanner')
  })

  it('PLUG-021: returns 400 for invalid id format', async () => {
    const { DELETE } = await import('@/app/api/admin/plugins/[id]/route')
    const res = await DELETE(
      makeRequest('DELETE', '/api/admin/plugins/INVALID_UPPER'),
      idCtx('INVALID_UPPER'),
    )
    expect(res.status).toBe(400)
  })

  it('PLUG-022: returns 404 when plugin does not exist', async () => {
    mockUnregisterPlugin.mockResolvedValue(null)
    const { DELETE } = await import('@/app/api/admin/plugins/[id]/route')
    const res = await DELETE(
      makeRequest('DELETE', '/api/admin/plugins/missing'),
      idCtx('missing'),
    )
    expect(res.status).toBe(404)
  })

  it('PLUG-023: returns 409 when dependents exist + audit-logs rejection', async () => {
    mockUnregisterPlugin.mockRejectedValue(
      new PluginDependentException('my-scanner', ['other']),
    )
    const { DELETE } = await import('@/app/api/admin/plugins/[id]/route')
    const res = await DELETE(
      makeRequest('DELETE', '/api/admin/plugins/my-scanner'),
      idCtx('my-scanner'),
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.dependents).toEqual(['other'])
    expect(mockConfigChange).toHaveBeenCalledWith(expect.objectContaining({
      newValue: expect.stringContaining('rejected:dependents'),
    }))
  })
})

// --- PATCH /api/admin/plugins/[id] ---

describe('PATCH /api/admin/plugins/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetPluginEnabled.mockImplementation(async (id: string, enabled: boolean) => ({
      previous: storedRecord,
      updated: { ...storedRecord, enabled },
    }))
  })

  it('PLUG-030: disables an existing plugin → 200', async () => {
    const { PATCH } = await import('@/app/api/admin/plugins/[id]/route')
    const res = await PATCH(
      makeRequest('PATCH', '/api/admin/plugins/my-scanner', { enabled: false }),
      idCtx('my-scanner'),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.enabled).toBe(false)
    expect(mockSetPluginEnabled).toHaveBeenCalledWith('my-scanner', false)
  })

  it('PLUG-031: returns 400 when enabled is missing', async () => {
    const { PATCH } = await import('@/app/api/admin/plugins/[id]/route')
    const res = await PATCH(
      makeRequest('PATCH', '/api/admin/plugins/my-scanner', {}),
      idCtx('my-scanner'),
    )
    expect(res.status).toBe(400)
  })

  it('PLUG-032: returns 400 when enabled is non-boolean', async () => {
    const { PATCH } = await import('@/app/api/admin/plugins/[id]/route')
    const res = await PATCH(
      makeRequest('PATCH', '/api/admin/plugins/my-scanner', { enabled: 'yes' }),
      idCtx('my-scanner'),
    )
    expect(res.status).toBe(400)
  })

  it('PLUG-033: returns 404 when plugin does not exist', async () => {
    mockSetPluginEnabled.mockRejectedValue(new PluginNotFoundException('missing'))
    const { PATCH } = await import('@/app/api/admin/plugins/[id]/route')
    const res = await PATCH(
      makeRequest('PATCH', '/api/admin/plugins/missing', { enabled: true }),
      idCtx('missing'),
    )
    expect(res.status).toBe(404)
  })
})
