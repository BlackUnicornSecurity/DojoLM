/**
 * File: build-info/__tests__/route.test.ts
 * Purpose: Tests for GET /api/build-info (VIS-17)
 * Source: src/app/api/build-info/route.ts
 *
 * Verifies:
 * - Returns 200 with { sha, date, version, environment }
 * - Null sha/date when BUILD_SHA/BUILD_DATE env vars are unset or "unknown"
 * - Live sha/date when env vars are set to real values
 * - Reads version from package.json (mocked)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fs.readFileSync BEFORE importing the route so the module-load read of
// package.json returns a deterministic value. Include `default` export so ESM
// interop path works too (same shape as read-fixture/__tests__/route.test.ts).
vi.mock('fs', () => {
  const fsSync = {
    readFileSync: vi.fn(() => JSON.stringify({ version: '1.2.3' })),
    existsSync: vi.fn().mockReturnValue(true),
  }
  return { ...fsSync, default: fsSync }
})

describe('GET /api/build-info (VIS-17)', () => {
  const originalSha = process.env.BUILD_SHA
  const originalDate = process.env.BUILD_DATE
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    if (originalSha === undefined) delete process.env.BUILD_SHA
    else process.env.BUILD_SHA = originalSha
    if (originalDate === undefined) delete process.env.BUILD_DATE
    else process.env.BUILD_DATE = originalDate
    if (originalEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalEnv
  })

  it('BI-001: returns 200 with null sha/date when env vars unset', async () => {
    delete process.env.BUILD_SHA
    delete process.env.BUILD_DATE
    process.env.NODE_ENV = 'test'

    const { GET } = await import('../route')
    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.sha).toBeNull()
    expect(body.date).toBeNull()
    expect(body.version).toBe('1.2.3')
    expect(body.environment).toBe('test')
  })

  it('BI-002: treats env value "unknown" as null (matches Dockerfile default)', async () => {
    process.env.BUILD_SHA = 'unknown'
    process.env.BUILD_DATE = 'unknown'

    const { GET } = await import('../route')
    const res = await GET()
    const body = await res.json()

    expect(body.sha).toBeNull()
    expect(body.date).toBeNull()
  })

  it('BI-003: returns real sha/date when env vars are set', async () => {
    process.env.BUILD_SHA = 'abc1234'
    process.env.BUILD_DATE = '2026-04-17T10:00:00Z'

    const { GET } = await import('../route')
    const res = await GET()
    const body = await res.json()

    expect(body.sha).toBe('abc1234')
    expect(body.date).toBe('2026-04-17T10:00:00Z')
    expect(body.version).toBe('1.2.3')
  })

  it('BI-004: sets X-Content-Type-Options and short cache header', async () => {
    const { GET } = await import('../route')
    const res = await GET()

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60')
    expect(res.headers.get('Content-Type')).toMatch(/application\/json/)
  })
})
