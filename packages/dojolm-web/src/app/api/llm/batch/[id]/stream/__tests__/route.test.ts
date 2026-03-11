/**
 * File: llm/batch/[id]/stream/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/batch/:id/stream (SSE endpoint)
 * Source: src/app/api/llm/batch/[id]/stream/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetBatch = vi.fn();
const mockQueryExecutions = vi.fn();

vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    getBatch: (...args: unknown[]) => mockGetBatch(...args),
    queryExecutions: (...args: unknown[]) => mockQueryExecutions(...args),
  },
}));

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/llm/batch/b1/stream');
}

const completedBatch = {
  id: 'b1',
  status: 'completed',
  totalTests: 10,
  completedTests: 10,
  failedTests: 0,
  avgResilienceScore: 85,
  modelConfigIds: ['m1'],
  testCaseIds: ['tc1'],
  createdAt: new Date().toISOString(),
};

const runningBatch = {
  ...completedBatch,
  status: 'running',
  completedTests: 5,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBatch.mockResolvedValue(runningBatch);
  mockQueryExecutions.mockResolvedValue({ executions: [], total: 0 });
});

describe('GET /api/llm/batch/:id/stream', () => {
  it('BSTR-001: returns SSE response for valid batch', async () => {
    mockGetBatch.mockResolvedValue(completedBatch);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('b1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
  });

  it('BSTR-002: returns 404 for unknown batch', async () => {
    mockGetBatch.mockResolvedValue(null);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('unknown'));
    expect(res.status).toBe(404);
  });

  it('BSTR-003: rejects invalid batch ID', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('../etc/passwd'));
    expect(res.status).toBe(400);
  });

  it('BSTR-004: rejects empty batch ID', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams(''));
    expect(res.status).toBe(400);
  });

  it('BSTR-005: SSE response has correct headers', async () => {
    mockGetBatch.mockResolvedValue(completedBatch);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('b1'));
    expect(res.headers.get('cache-control')).toContain('no-cache');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('BSTR-006: rejects batch ID with special chars', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('b1;DROP TABLE'));
    expect(res.status).toBe(400);
  });

  it('BSTR-007: accepts valid batch ID format', async () => {
    mockGetBatch.mockResolvedValue(completedBatch);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('batch-123-abc'));
    expect(res.status).toBe(200);
  });

  it('BSTR-008: rejects overly long batch ID', async () => {
    const { GET } = await import('../route');
    const longId = 'a'.repeat(200);
    const res = await GET(createGetRequest(), createParams(longId));
    expect(res.status).toBe(400);
  });

  it('BSTR-009: response body is readable stream', async () => {
    mockGetBatch.mockResolvedValue(completedBatch);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('b1'));
    expect(res.body).toBeDefined();
  });

  it('BSTR-010: rejects path traversal attempt', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('../../secret'));
    expect(res.status).toBe(400);
  });
});
