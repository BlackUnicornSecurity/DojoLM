/**
 * File: arena/[id]/stream/__tests__/route.test.ts
 * Purpose: Tests for GET /api/arena/:id/stream (SSE endpoint)
 * Source: src/app/api/arena/[id]/stream/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockCheckApiAuth = vi.fn().mockReturnValue(null);
const mockGetMatch = vi.fn();

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}));

vi.mock('@/lib/storage/arena-storage', () => ({
  getMatch: (...args: unknown[]) => mockGetMatch(...args),
}));

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createGetRequest(ip?: string): NextRequest {
  const req = new NextRequest('http://localhost:3000/api/arena/m1/stream');
  if (ip) {
    // Can't easily set headers on NextRequest after creation in tests
  }
  return req;
}

const completedMatch = {
  id: 'm1',
  status: 'completed',
  events: [{ type: 'round', round: 1, fighterId: 'f1', role: 'attacker', data: {}, timestamp: '2024-01-01T00:00:00Z' }],
  rounds: [{ round: 1 }],
  scores: { f1: 10, f2: 5 },
  winnerId: 'f1',
  winReason: 'Higher score',
};

const runningMatch = {
  ...completedMatch,
  status: 'running',
  winnerId: null,
  winReason: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckApiAuth.mockReturnValue(null);
  mockGetMatch.mockResolvedValue(runningMatch);
});

describe('GET /api/arena/:id/stream', () => {
  it('ASTR-001: returns SSE response for valid match', async () => {
    mockGetMatch.mockResolvedValue(completedMatch);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('m1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
  });

  it('ASTR-002: returns 404 for unknown match', async () => {
    mockGetMatch.mockResolvedValue(null);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('unknown'));
    expect(res.status).toBe(404);
  });

  it('ASTR-003: rejects invalid match ID', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('../etc/passwd'));
    expect(res.status).toBe(400);
  });

  it('ASTR-004: auth failure returns 401', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('m1'));
    expect(res.status).toBe(401);
  });

  it('ASTR-005: rejects empty match ID', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams(''));
    expect(res.status).toBe(400);
  });

  it('ASTR-006: SSE has correct cache-control headers', async () => {
    mockGetMatch.mockResolvedValue(completedMatch);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('m1'));
    expect(res.headers.get('cache-control')).toContain('no-cache');
  });

  it('ASTR-007: SSE has nosniff header', async () => {
    mockGetMatch.mockResolvedValue(completedMatch);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('m1'));
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('ASTR-008: rejects special chars in match ID', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('m1;DROP'));
    expect(res.status).toBe(400);
  });

  it('ASTR-009: accepts valid match ID format', async () => {
    mockGetMatch.mockResolvedValue(completedMatch);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('match-abc-123'));
    expect(res.status).toBe(200);
  });

  it('ASTR-010: rejects overly long match ID', async () => {
    const { GET } = await import('../route');
    const longId = 'a'.repeat(200);
    const res = await GET(createGetRequest(), createParams(longId));
    expect(res.status).toBe(400);
  });
});
