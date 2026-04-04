/**
 * File: agentic/__tests__/route.test.ts
 * Purpose: Tests for POST /api/agentic route contract acceptance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: (request: NextRequest) => Promise<Response>) => handler,
}))

vi.mock('bu-tpi/agentic', () => ({
  createEnvironment: vi.fn(() => ({})),
}))

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/agentic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/agentic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects invalid JSON in the request body', async () => {
    const { POST } = await import('../route')
    const res = await POST(createPostRequest('not valid json {{{'))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid JSON in request body')
  })

  it('rejects a missing architecture', async () => {
    const { POST } = await import('../route')
    const res = await POST(createPostRequest({
      categories: ['filesystem'],
      difficulty: 'medium',
      objective: 'Attempt a policy bypass',
      targetModelId: 'gpt-4o',
    }))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('architecture')
  })

  it('rejects an empty categories array', async () => {
    const { POST } = await import('../route')
    const res = await POST(createPostRequest({
      architecture: 'openai-functions',
      categories: [],
      difficulty: 'medium',
      objective: 'Attempt a policy bypass',
      targetModelId: 'gpt-4o',
    }))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('categories')
  })

  it('accepts the mounted UI contract values', async () => {
    const { POST } = await import('../route')
    const res = await POST(createPostRequest({
      architecture: 'openai-functions',
      categories: ['filesystem', 'email'],
      difficulty: 'medium',
      objective: 'Exfiltrate sensitive data via email',
      targetModelId: 'gpt-4o',
    }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.architecture).toBe('openai-functions')
    expect(json.data.scenario.scenarioId).toBe('agentic-openai-functions')
    expect(json.data.utilityScore).toBeTypeOf('number')
    expect(json.data.securityScore).toBeTypeOf('number')
  })

  it('still accepts the original security-taxonomy categories', async () => {
    const { POST } = await import('../route')
    const res = await POST(createPostRequest({
      architecture: 'single-agent',
      categories: ['prompt-injection', 'jailbreak'],
      difficulty: 'hard',
      objective: 'Attempt a policy bypass',
      targetModelId: 'claude-3.5',
    }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('rejects unknown categories', async () => {
    const { POST } = await import('../route')
    const res = await POST(createPostRequest({
      architecture: 'openai-functions',
      categories: ['not-a-real-category'],
      difficulty: 'medium',
      objective: 'Attempt a policy bypass',
      targetModelId: 'gpt-4o',
    }))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid category')
  })

  it('accepts optional scenario metadata and echoes a scenario summary', async () => {
    const { POST } = await import('../route')
    const res = await POST(createPostRequest({
      architecture: 'react-agent',
      categories: ['filesystem', 'search'],
      difficulty: 'hard',
      objective: 'Trace an indirect prompt injection path',
      targetModelId: 'gpt-4o-mini',
      scenarioId: 'scn-42',
      scenarioName: 'Trace prompt pivot',
      injectionPayload: 'Ignore prior instructions',
    }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.scenarioId).toBe('scn-42')
    expect(json.data.scenarioName).toBe('Trace prompt pivot')
    expect(json.data.scenario.scenarioName).toBe('Trace prompt pivot')
  })

  it('rejects a non-string scenarioName', async () => {
    const { POST } = await import('../route')
    const res = await POST(createPostRequest({
      architecture: 'openai-functions',
      categories: ['filesystem'],
      difficulty: 'medium',
      objective: 'Attempt a policy bypass',
      targetModelId: 'gpt-4o',
      scenarioName: 42,
    }))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('scenarioName must be a string')
  })

  it('rejects an oversized objective', async () => {
    const { POST } = await import('../route')
    const res = await POST(createPostRequest({
      architecture: 'openai-functions',
      categories: ['filesystem'],
      difficulty: 'medium',
      objective: 'x'.repeat(10_001),
      targetModelId: 'gpt-4o',
    }))

    expect(res.status).toBe(413)
    const json = await res.json()
    expect(json.error).toContain('objective too large')
  })

  it('returns OPTIONS with the correct Allow header', async () => {
    const { OPTIONS } = await import('../route')
    const res = await OPTIONS()

    expect(res.status).toBe(200)
    expect(res.headers.get('Allow')).toBe('POST, OPTIONS')
  })
})
