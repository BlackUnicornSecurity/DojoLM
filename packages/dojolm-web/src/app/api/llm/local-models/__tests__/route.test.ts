/**
 * File: llm/local-models/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/local-models API route
 * Source: src/app/api/llm/local-models/route.ts
 * Tests: LM-001 to LM-010
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn((message: string, status: number) =>
    NextResponse.json({ error: message }, { status })
  ),
}));

// Mock bu-tpi/llm for SSRF validation
vi.mock('bu-tpi/llm', () => ({
  validateProviderUrl: vi.fn((url: string, isLocal: boolean) => {
    if (!isLocal) return true;
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }),
}));

const originalFetch = global.fetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:42001/api/llm/local-models');
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

function mockFetchResponse(data: unknown, ok = true, status = 200): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/llm/local-models', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: mock ollama response
    mockFetchResponse({
      models: [
        { name: 'llama3.2', size: 2147483648, modified_at: '2024-01-01T00:00:00Z', digest: 'sha256:abc' },
      ],
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // LM-001: Invalid provider returns 400
  it('LM-001: returns 400 for invalid provider', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest({ provider: 'invalid-provider' });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid provider');
  });

  // LM-002: SSRF protection blocks non-local URL
  it('LM-002: blocks non-local baseUrl (SSRF protection)', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest({ provider: 'ollama', baseUrl: 'http://evil.com:11434' });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('localhost');
  });

  // LM-003: Default provider is ollama
  it('LM-003: uses ollama as default provider', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe('ollama');
  });

  // LM-004: Auth failure returns 401
  it('LM-004: returns 401 on auth failure', async () => {
    const { checkApiAuth } = await import('@/lib/api-auth');
    vi.mocked(checkApiAuth).mockReturnValueOnce(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    );

    const { GET } = await import('../route');
    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  // LM-005: Internal error returns 500
  it('LM-005: returns 500 on internal error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const { GET } = await import('../route');
    const req = createGetRequest({ provider: 'ollama' });
    const res = await GET(req);

    expect(res.status).toBe(500);
  });

  // LM-006: Successful ollama response includes model list
  it('LM-006: returns model list from ollama', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest({ provider: 'ollama' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.models).toBeInstanceOf(Array);
    expect(body.models.length).toBe(1);
    expect(body.models[0].id).toBe('llama3.2');
  });

  // LM-007: LM Studio provider uses correct endpoint
  it('LM-007: fetches from lmstudio provider', async () => {
    mockFetchResponse({
      object: 'list',
      data: [{ id: 'my-model', created: 1234567890 }],
    });

    const { GET } = await import('../route');
    const req = createGetRequest({ provider: 'lmstudio' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe('lmstudio');
    expect(body.models).toBeInstanceOf(Array);
  });

  // LM-008: llamacpp provider uses correct endpoint
  it('LM-008: fetches from llamacpp provider', async () => {
    mockFetchResponse({
      object: 'list',
      data: [{ id: 'gguf-model', created: 1234567890 }],
    });

    const { GET } = await import('../route');
    const req = createGetRequest({ provider: 'llamacpp' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe('llamacpp');
  });

  // LM-009: Response includes count field
  it('LM-009: response includes count field', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('count');
    expect(body.count).toBe(1);
  });

  // LM-010: localhost baseUrl is allowed
  it('LM-010: allows localhost baseUrl', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest({ provider: 'ollama', baseUrl: 'http://localhost:11434' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe('ollama');
  });
});
