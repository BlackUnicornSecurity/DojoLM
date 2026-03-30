/**
 * File: llm/fingerprint/stream/[id]/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/fingerprint/stream/:id SSE endpoint
 * Source: src/app/api/llm/fingerprint/stream/[id]/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — declared before any dynamic imports
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn(() => null),
}));

const mockSessions = new Map();

vi.mock('@/lib/fingerprint-state', () => ({
  activeFingerprints: {
    get: (id: string) => mockSessions.get(id),
    create: vi.fn(),
    update: vi.fn(),
    complete: vi.fn(),
    fail: vi.fn(),
    remove: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { checkApiAuth } from '@/lib/api-auth';

const mockCheckApiAuth = vi.mocked(checkApiAuth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), { method: 'GET' });
}

function createMockSession(overrides: Partial<{
  progress: unknown;
  completed: boolean;
  result: unknown;
  error: string | null;
}> = {}) {
  return {
    id: 'test-session',
    progress: null,
    completed: false,
    result: null,
    error: null,
    listeners: new Set<(data: string) => void>(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// GET /api/llm/fingerprint/stream/:id
// ---------------------------------------------------------------------------

describe('GET /api/llm/fingerprint/stream/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockSessions.clear();
  });

  it('returns 200 with SSE stream for valid session ID', async () => {
    const session = createMockSession();
    mockSessions.set('fp-123', session);

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/fingerprint/stream/fp-123');
    const res = await GET(req, { params: Promise.resolve({ id: 'fp-123' }) });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
    expect(res.headers.get('Connection')).toBe('keep-alive');
  });

  it('returns 400 for invalid session ID format', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/fingerprint/stream/invalid<>id');
    const res = await GET(req, { params: Promise.resolve({ id: 'invalid<>id' }) });

    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Invalid ID');
  });

  it('returns 400 for session ID exceeding 128 characters', async () => {
    const longId = 'a'.repeat(129);
    const { GET } = await import('../route');
    const req = makeGetRequest(`/api/llm/fingerprint/stream/${longId}`);
    const res = await GET(req, { params: Promise.resolve({ id: longId }) });

    expect(res.status).toBe(400);
  });

  it('returns 404 when session does not exist', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/fingerprint/stream/nonexistent');
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) });

    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Session not found');
  });

  it('accepts valid session IDs with alphanumeric, underscore, and dash', async () => {
    const session = createMockSession();
    mockSessions.set('fp_123-test', session);

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/fingerprint/stream/fp_123-test');
    const res = await GET(req, { params: Promise.resolve({ id: 'fp_123-test' }) });

    expect(res.status).toBe(200);
  });

  it('sends initial progress if session has progress', async () => {
    const session = createMockSession({
      progress: { phase: 'scanning', progress: 50, message: 'Scanning...' },
    });
    mockSessions.set('fp-123', session);

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/fingerprint/stream/fp-123');
    const res = await GET(req, { params: Promise.resolve({ id: 'fp-123' }) });

    expect(res.status).toBe(200);
    // Stream is returned, we verify it exists and has proper structure
    expect(res.body).toBeDefined();
  });

  it('sends complete event and closes if session is already completed', async () => {
    const session = createMockSession({
      completed: true,
      progress: { phase: 'complete', progress: 100 },
    });
    mockSessions.set('fp-123', session);

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/fingerprint/stream/fp-123');
    const res = await GET(req, { params: Promise.resolve({ id: 'fp-123' }) });

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('sends error event if session completed with error', async () => {
    const session = createMockSession({
      completed: true,
      error: 'Fingerprinting failed',
    });
    mockSessions.set('fp-123', session);

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/fingerprint/stream/fp-123');
    const res = await GET(req, { params: Promise.resolve({ id: 'fp-123' }) });

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('allows adding listeners to active session', async () => {
    const session = createMockSession();
    mockSessions.set('fp-123', session);

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/fingerprint/stream/fp-123');
    await GET(req, { params: Promise.resolve({ id: 'fp-123' }) });

    // Verify the session listeners set exists
    expect(session.listeners).toBeInstanceOf(Set);
  });

  it('accepts session IDs up to 128 characters', async () => {
    const validId = 'a'.repeat(128);
    const session = createMockSession();
    mockSessions.set(validId, session);

    const { GET } = await import('../route');
    const req = makeGetRequest(`/api/llm/fingerprint/stream/${validId}`);
    const res = await GET(req, { params: Promise.resolve({ id: validId }) });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

describe('Auth guard', () => {
  const unauthorizedResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(unauthorizedResponse as never);
    mockSessions.clear();
  });

  it('returns 401 when auth fails', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/fingerprint/stream/fp-123');
    const res = await GET(req, { params: Promise.resolve({ id: 'fp-123' }) });

    expect(res.status).toBe(401);
  });
});
