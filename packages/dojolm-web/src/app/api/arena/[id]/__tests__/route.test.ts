/**
 * File: arena/[id]/__tests__/route.test.ts
 * Purpose: Tests for GET/DELETE /api/arena/[id]
 * Source: src/app/api/arena/[id]/route.ts
 *
 * Index:
 * - AID-001: GET returns match detail (line 49)
 * - AID-002: GET invalid ID returns 400 (line 62)
 * - AID-003: GET match not found returns 404 (line 73)
 * - AID-004: GET rejects path-traversal IDs (line 84)
 * - AID-005: DELETE aborts running match (line 94)
 * - AID-006: DELETE aborts pending match (line 111)
 * - AID-007: DELETE on completed match returns aborted (line 127)
 * - AID-008: DELETE invalid ID returns 400 (line 141)
 * - AID-009: DELETE match not found returns 404 (line 152)
 * - AID-010: GET with valid complex ID (line 163)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetMatch = vi.fn();
const mockUpdateMatch = vi.fn();
const mockCheckApiAuth = vi.fn().mockReturnValue(null);

vi.mock('@/lib/storage/arena-storage', () => ({
  getMatch: (...args: unknown[]) => mockGetMatch(...args),
  updateMatch: (...args: unknown[]) => mockUpdateMatch(...args),
}));

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}));

vi.mock('@/lib/api-handler', () => ({
  createApiHandler: (handler: Function, _opts?: unknown) => handler,
}));

function createRequest(method: string = 'GET'): NextRequest {
  return new NextRequest('http://localhost:42001/api/arena/test-id', { method });
}

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetMatch.mockResolvedValue(null);
  mockUpdateMatch.mockResolvedValue(undefined);
});

describe('GET /api/arena/[id]', () => {
  it('AID-001: returns match detail with 200', async () => {
    const match = { id: 'match-1', status: 'completed', warriors: ['a', 'b'] };
    mockGetMatch.mockResolvedValue(match);

    const { GET } = await import('../route');
    const res = await GET(createRequest(), createParams('match-1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('match-1');
  });

  it('AID-002: invalid ID format returns 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(createRequest(), createParams(''));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid');
  });

  it('AID-003: match not found returns 404', async () => {
    mockGetMatch.mockResolvedValue(null);

    const { GET } = await import('../route');
    const res = await GET(createRequest(), createParams('nonexistent-id'));
    expect(res.status).toBe(404);
  });

  it('AID-004: rejects path-traversal IDs', async () => {
    const { GET } = await import('../route');
    const res = await GET(createRequest(), createParams('../../../etc/passwd'));
    expect(res.status).toBe(400);
  });

  it('AID-010: accepts valid hyphenated ID', async () => {
    const match = { id: 'match-abc-123', status: 'running' };
    mockGetMatch.mockResolvedValue(match);

    const { GET } = await import('../route');
    const res = await GET(createRequest(), createParams('match-abc-123'));
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/arena/[id]', () => {
  it('AID-005: aborts running match', async () => {
    mockGetMatch.mockResolvedValue({ id: 'match-1', status: 'running' });

    const { DELETE } = await import('../route');
    const res = await DELETE(createRequest('DELETE'), createParams('match-1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('aborted');
    expect(mockUpdateMatch).toHaveBeenCalledWith('match-1', expect.objectContaining({
      status: 'aborted',
    }));
  });

  it('AID-006: aborts pending match', async () => {
    mockGetMatch.mockResolvedValue({ id: 'match-2', status: 'pending' });

    const { DELETE } = await import('../route');
    const res = await DELETE(createRequest('DELETE'), createParams('match-2'));
    expect(res.status).toBe(200);
    expect(mockUpdateMatch).toHaveBeenCalled();
  });

  it('AID-007: on already completed match, returns aborted without update', async () => {
    mockGetMatch.mockResolvedValue({ id: 'match-3', status: 'completed' });

    const { DELETE } = await import('../route');
    const res = await DELETE(createRequest('DELETE'), createParams('match-3'));
    expect(res.status).toBe(200);
    // Should NOT call updateMatch since status is not running/pending
    expect(mockUpdateMatch).not.toHaveBeenCalled();
  });

  it('AID-008: invalid ID returns 400', async () => {
    const { DELETE } = await import('../route');
    const res = await DELETE(createRequest('DELETE'), createParams(''));
    expect(res.status).toBe(400);
  });

  it('AID-009: match not found returns 404', async () => {
    mockGetMatch.mockResolvedValue(null);

    const { DELETE } = await import('../route');
    const res = await DELETE(createRequest('DELETE'), createParams('gone-id'));
    expect(res.status).toBe(404);
  });
});
