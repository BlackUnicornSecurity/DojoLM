/**
 * File: llm/batch/[id]/executions/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/batch/:id/executions API route
 * Source: src/app/api/llm/batch/[id]/executions/route.ts
 * Tests: BEXE-001 to BEXE-010
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetBatch = vi.fn();
const mockGetBatchExecutions = vi.fn();

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn((message: string, status: number) =>
    NextResponse.json({ error: message }, { status })
  ),
}));

vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    getBatch: (...args: unknown[]) => mockGetBatch(...args),
    getBatchExecutions: (...args: unknown[]) => mockGetBatchExecutions(...args),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGetRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:42001/api/llm/batch/${id}/executions`, {
    method: 'GET',
  });
}

function createParams(id: string) {
  return { params: { id } };
}

const MOCK_BATCH = {
  id: 'batch-1',
  status: 'completed',
  totalTests: 5,
  completedTests: 5,
  failedTests: 0,
};

const MOCK_EXECUTIONS = [
  { id: 'exec-1', testCaseId: 'tc-1', status: 'completed', resilienceScore: 90 },
  { id: 'exec-2', testCaseId: 'tc-2', status: 'completed', resilienceScore: 75 },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/llm/batch/:id/executions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBatch.mockResolvedValue(MOCK_BATCH);
    mockGetBatchExecutions.mockResolvedValue(MOCK_EXECUTIONS);
  });

  // BEXE-001: Returns executions for a valid batch
  it('BEXE-001: returns executions for a valid batch', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.executions).toBeInstanceOf(Array);
    expect(body.executions.length).toBe(2);
  });

  // BEXE-002: Batch not found returns 404
  it('BEXE-002: returns 404 when batch is not found', async () => {
    mockGetBatch.mockResolvedValue(null);
    const { GET } = await import('../route');
    const req = createGetRequest('missing-batch');
    const res = await GET(req, createParams('missing-batch'));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Batch not found');
  });

  // BEXE-004: Internal error returns 500
  it('BEXE-004: returns 500 on internal error', async () => {
    mockGetBatch.mockRejectedValue(new Error('Storage error'));
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(500);
  });

  // BEXE-005: Executions contain expected fields
  it('BEXE-005: execution objects contain expected fields', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.executions[0]).toHaveProperty('id');
    expect(body.executions[0]).toHaveProperty('testCaseId');
    expect(body.executions[0]).toHaveProperty('status');
  });

  // BEXE-006: Empty executions returns empty array
  it('BEXE-006: returns empty array when batch has no executions', async () => {
    mockGetBatchExecutions.mockResolvedValue([]);
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.executions).toEqual([]);
  });

  // BEXE-007: Calls getBatch with correct id
  it('BEXE-007: calls getBatch with the route param id', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('batch-42');
    mockGetBatch.mockResolvedValue({ ...MOCK_BATCH, id: 'batch-42' });
    await GET(req, createParams('batch-42'));

    expect(mockGetBatch).toHaveBeenCalledWith('batch-42');
  });

  // BEXE-008: Calls getBatchExecutions with correct id
  it('BEXE-008: calls getBatchExecutions with the route param id', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('batch-42');
    mockGetBatch.mockResolvedValue({ ...MOCK_BATCH, id: 'batch-42' });
    await GET(req, createParams('batch-42'));

    expect(mockGetBatchExecutions).toHaveBeenCalledWith('batch-42');
  });

  // BEXE-009: Response is JSON content type
  it('BEXE-009: response is JSON', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1');
    const res = await GET(req, createParams('batch-1'));

    expect(res.headers.get('content-type')).toContain('application/json');
  });

  // BEXE-010: Multiple executions all returned
  it('BEXE-010: returns all executions for the batch', async () => {
    const manyExecutions = Array.from({ length: 10 }, (_, i) => ({
      id: `exec-${i}`,
      testCaseId: `tc-${i}`,
      status: 'completed',
      resilienceScore: 80 + i,
    }));
    mockGetBatchExecutions.mockResolvedValue(manyExecutions);

    const { GET } = await import('../route');
    const req = createGetRequest('batch-1');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.executions.length).toBe(10);
  });
});
