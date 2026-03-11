/**
 * File: llm/batch-test/[id]/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/batch-test/:id API route
 * Source: src/app/api/llm/batch-test/[id]/route.ts
 * Tests: BTD-001 to BTD-010
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetBatch = vi.fn();
const mockGetBatchExecutions = vi.fn();

vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: vi.fn().mockResolvedValue({
    getBatch: (...args: unknown[]) => mockGetBatch(...args),
    getBatchExecutions: (...args: unknown[]) => mockGetBatchExecutions(...args),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGetRequest(id: string, suffix = ''): NextRequest {
  return new NextRequest(`http://localhost:3000/api/llm/batch-test/${id}${suffix}`, {
    method: 'GET',
  });
}

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const MOCK_BATCH = {
  id: 'batch-1',
  status: 'running',
  totalTests: 10,
  completedTests: 7,
  failedTests: 1,
  avgResilienceScore: 82.5,
  createdAt: '2024-01-01T00:00:00Z',
  completedAt: null,
};

const MOCK_EXECUTIONS = [
  {
    id: 'exec-1',
    testCaseId: 'tc-1',
    modelConfigId: 'model-1',
    status: 'completed',
    resilienceScore: 90,
    injectionSuccess: false,
    harmfulness: 0.1,
    duration_ms: 1200,
  },
  {
    id: 'exec-2',
    testCaseId: 'tc-2',
    modelConfigId: 'model-1',
    status: 'completed',
    resilienceScore: 75,
    injectionSuccess: true,
    harmfulness: 0.4,
    duration_ms: 800,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/llm/batch-test/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBatch.mockResolvedValue(MOCK_BATCH);
    mockGetBatchExecutions.mockResolvedValue(MOCK_EXECUTIONS);
  });

  // BTD-001: GET status returns batch info
  it('BTD-001: returns batch status info', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('batch-1');
    expect(body.status).toBe('running');
    expect(body.totalTests).toBe(10);
    expect(body.completedTests).toBe(7);
  });

  // BTD-002: Batch not found returns 404
  it('BTD-002: returns 404 when batch is not found', async () => {
    mockGetBatch.mockResolvedValue(null);
    const { GET } = await import('../route');
    const req = createGetRequest('missing');
    const res = await GET(req, createParams('missing'));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Batch not found');
  });

  // BTD-003: Includes progress percentage
  it('BTD-003: includes progress percentage in status response', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.progress).toBe(70); // 7/10 * 100
  });

  // BTD-004: Internal error returns 500
  it('BTD-004: returns 500 on internal error', async () => {
    mockGetBatch.mockRejectedValue(new Error('Storage failure'));
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(500);
  });

  // BTD-005: Results endpoint returns executions
  it('BTD-005: returns results when URL ends with /results', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1', '/results');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('batch');
    expect(body).toHaveProperty('results');
    expect(body.results).toBeInstanceOf(Array);
    expect(body.results.length).toBe(2);
  });

  // BTD-006: Results include batch summary
  it('BTD-006: results response includes batch summary', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1', '/results');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.batch.id).toBe('batch-1');
    expect(body.batch.status).toBe('running');
    expect(body.batch.avgResilienceScore).toBe(82.5);
  });

  // BTD-007: Progress is 0 when totalTests is 0
  it('BTD-007: progress is 0 when totalTests is 0', async () => {
    mockGetBatch.mockResolvedValue({ ...MOCK_BATCH, totalTests: 0, completedTests: 0 });
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.progress).toBe(0);
  });

  // BTD-008: Status response includes createdAt
  it('BTD-008: status response includes createdAt field', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('createdAt');
  });

  // BTD-009: Results execution objects have expected fields
  it('BTD-009: result execution objects contain expected fields', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1', '/results');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    const result = body.results[0];
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('testCaseId');
    expect(result).toHaveProperty('modelConfigId');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('resilienceScore');
    expect(result).toHaveProperty('injectionSuccess');
    expect(result).toHaveProperty('harmfulness');
    expect(result).toHaveProperty('durationMs');
  });

  // BTD-010: Completed batch shows 100% progress
  it('BTD-010: completed batch shows 100% progress', async () => {
    mockGetBatch.mockResolvedValue({ ...MOCK_BATCH, status: 'completed', completedTests: 10 });
    const { GET } = await import('../route');
    const req = createGetRequest('batch-1');
    const res = await GET(req, createParams('batch-1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.progress).toBe(100);
  });
});
