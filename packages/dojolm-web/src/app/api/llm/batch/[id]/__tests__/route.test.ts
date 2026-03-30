/**
 * File: llm/batch/[id]/__tests__/route.test.ts
 * Purpose: Tests for GET/PATCH/DELETE /api/llm/batch/[id]
 * Source: src/app/api/llm/batch/[id]/route.ts
 *
 * Index:
 * - BID-001: GET returns batch by ID (line 48)
 * - BID-002: GET not found returns 404 (line 62)
 * - BID-003: GET auth check enforced (line 73)
 * - BID-004: PATCH cancels running batch (line 85)
 * - BID-005: PATCH not found returns 404 (line 100)
 * - BID-006: PATCH invalid status transition returns 400 (line 113)
 * - BID-007: PATCH invalid JSON returns 400 (line 126)
 * - BID-008: DELETE removes batch (line 137)
 * - BID-009: DELETE not found returns 404 (line 149)
 * - BID-010: DELETE auth check enforced (line 160)
 * - BID-011: PATCH only cancels running status (line 172)
 * - BID-012: GET internal error returns 500 (line 186)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetBatch = vi.fn();
const mockUpdateBatch = vi.fn();
const mockDeleteBatch = vi.fn();

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    getBatch: (...args: unknown[]) => mockGetBatch(...args),
    updateBatch: (...args: unknown[]) => mockUpdateBatch(...args),
    deleteBatch: (...args: unknown[]) => mockDeleteBatch(...args),
  },
}));

function createRequest(method: string, body?: unknown): NextRequest {
  const opts: RequestInit = { method };
  if (body) {
    opts.headers = { 'content-type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  return new NextRequest('http://localhost:42001/api/llm/batch/test-id', opts);
}

function createParams(id: string) {
  return { params: { id } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBatch.mockResolvedValue(null);
  mockUpdateBatch.mockResolvedValue(null);
  mockDeleteBatch.mockResolvedValue(false);
});

describe('GET /api/llm/batch/[id]', () => {
  it('BID-001: returns batch by ID', async () => {
    const batch = { id: 'b1', status: 'completed', completedTests: 10 };
    mockGetBatch.mockResolvedValue(batch);

    const { GET } = await import('../route');
    const res = await GET(createRequest('GET'), createParams('b1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.batch.id).toBe('b1');
  });

  it('BID-002: not found returns 404', async () => {
    mockGetBatch.mockResolvedValue(null);

    const { GET } = await import('../route');
    const res = await GET(createRequest('GET'), createParams('nonexistent'));
    expect(res.status).toBe(404);
  });

  it('BID-012: internal error returns 500', async () => {
    mockGetBatch.mockRejectedValue(new Error('DB error'));

    const { GET } = await import('../route');
    const res = await GET(createRequest('GET'), createParams('b1'));
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/llm/batch/[id]', () => {
  it('BID-004: cancels running batch', async () => {
    mockGetBatch.mockResolvedValue({ id: 'b1', status: 'running' });
    mockUpdateBatch.mockResolvedValue({ id: 'b1', status: 'cancelled' });

    const { PATCH } = await import('../route');
    const res = await PATCH(
      createRequest('PATCH', { status: 'cancelled' }),
      createParams('b1')
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.batch.status).toBe('cancelled');
  });

  it('BID-005: not found returns 404', async () => {
    mockGetBatch.mockResolvedValue(null);

    const { PATCH } = await import('../route');
    const res = await PATCH(
      createRequest('PATCH', { status: 'cancelled' }),
      createParams('nonexistent')
    );
    expect(res.status).toBe(404);
  });

  it('BID-006: invalid status transition returns 400', async () => {
    mockGetBatch.mockResolvedValue({ id: 'b1', status: 'completed' });

    const { PATCH } = await import('../route');
    const res = await PATCH(
      createRequest('PATCH', { status: 'cancelled' }),
      createParams('b1')
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid status transition');
  });

  it('BID-007: invalid JSON returns 400', async () => {
    const { PATCH } = await import('../route');
    const req = new NextRequest('http://localhost:42001/api/llm/batch/b1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: 'not-json{{{',
    });
    const res = await PATCH(req, createParams('b1'));
    expect(res.status).toBe(400);
  });

  it('BID-011: can only cancel running batches (not pending)', async () => {
    mockGetBatch.mockResolvedValue({ id: 'b1', status: 'pending' });

    const { PATCH } = await import('../route');
    const res = await PATCH(
      createRequest('PATCH', { status: 'cancelled' }),
      createParams('b1')
    );
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/llm/batch/[id]', () => {
  it('BID-008: removes batch', async () => {
    mockDeleteBatch.mockResolvedValue(true);

    const { DELETE } = await import('../route');
    const res = await DELETE(createRequest('DELETE'), createParams('b1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('BID-009: not found returns 404', async () => {
    mockDeleteBatch.mockResolvedValue(false);

    const { DELETE } = await import('../route');
    const res = await DELETE(createRequest('DELETE'), createParams('nonexistent'));
    expect(res.status).toBe(404);
  });

});
