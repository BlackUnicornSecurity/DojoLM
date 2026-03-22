/**
 * File: llm/summary/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/summary
 * Source: src/app/api/llm/summary/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockCheckApiAuth = vi.fn().mockReturnValue(null);
const mockGetBatch = vi.fn();
const mockGetExecution = vi.fn();
const mockQueryExecutions = vi.fn();
const mockGetModelConfigs = vi.fn();

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}));

vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    getBatch: (...args: unknown[]) => mockGetBatch(...args),
    getExecution: (...args: unknown[]) => mockGetExecution(...args),
    queryExecutions: (...args: unknown[]) => mockQueryExecutions(...args),
    getModelConfigs: (...args: unknown[]) => mockGetModelConfigs(...args),
  },
}));

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:42001/api/llm/summary');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

const mockExecution = {
  id: 'e1',
  testCaseId: 'tc1',
  modelConfigId: 'model-1',
  status: 'completed',
  resilienceScore: 75,
  injectionSuccess: 0.2,
  harmfulness: 0.1,
  categoriesPassed: ['cat1'],
  categoriesFailed: ['cat2'],
  timestamp: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckApiAuth.mockReturnValue(null);
  mockGetModelConfigs.mockResolvedValue([{ id: 'model-1', name: 'GPT-4' }]);
  mockQueryExecutions.mockResolvedValue({ executions: [], total: 0 });
});

describe('GET /api/llm/summary', () => {
  it('SUM-001: returns summary for batch executions', async () => {
    mockGetBatch.mockResolvedValue({ id: 'b1', executionIds: ['e1'] });
    mockGetExecution.mockResolvedValue(mockExecution);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ batchId: 'b1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.overallScore).toBeDefined();
    expect(json.riskTier).toBeDefined();
    expect(json.totalTests).toBeGreaterThan(0);
  });

  it('SUM-002: returns empty summary when no executions', async () => {
    mockQueryExecutions.mockResolvedValue({ executions: [], total: 0 });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.overallScore).toBe(0);
    expect(json.riskTier).toBe('No Data');
    expect(json.totalTests).toBe(0);
  });

  it('SUM-003: batch not found returns 404', async () => {
    mockGetBatch.mockResolvedValue(null);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ batchId: 'nonexistent' }));
    expect(res.status).toBe(404);
  });

  it('SUM-004: invalid batchId returns 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ batchId: '../../../etc/passwd' }));
    expect(res.status).toBe(400);
  });

  it('SUM-005: invalid modelId returns 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ modelId: '../hack' }));
    expect(res.status).toBe(400);
  });

  it('SUM-006: auth failure returns 401', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(401);
  });

  it('SUM-007: high scores yield Production-Ready tier', async () => {
    const highScoreExec = { ...mockExecution, resilienceScore: 90 };
    mockQueryExecutions.mockResolvedValue({ executions: [highScoreExec], total: 1 });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.riskTier).toBe('Production-Ready');
  });

  it('SUM-008: low scores yield Unsafe tier', async () => {
    const lowScoreExec = { ...mockExecution, resilienceScore: 20 };
    mockQueryExecutions.mockResolvedValue({ executions: [lowScoreExec], total: 1 });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.riskTier).toBe('Unsafe');
  });

  it('SUM-009: includes top vulnerabilities', async () => {
    const exec = { ...mockExecution, categoriesFailed: ['prompt_injection', 'jailbreak'] };
    mockQueryExecutions.mockResolvedValue({ executions: [exec], total: 1 });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.topVulnerabilities.length).toBeGreaterThan(0);
  });

  it('SUM-010: includes recommendations', async () => {
    const exec = { ...mockExecution, resilienceScore: 40, categoriesFailed: ['prompt_injection'] };
    mockQueryExecutions.mockResolvedValue({ executions: [exec], total: 1 });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.recommendations.length).toBeGreaterThan(0);
  });

  it('SUM-011: filters by modelId', async () => {
    mockQueryExecutions.mockResolvedValue({ executions: [mockExecution], total: 1 });

    const { GET } = await import('../route');
    await GET(createGetRequest({ modelId: 'model-1' }));

    expect(mockQueryExecutions).toHaveBeenCalledWith(
      expect.objectContaining({ modelConfigId: 'model-1' })
    );
  });

  it('SUM-012: internal error returns 500', async () => {
    mockQueryExecutions.mockRejectedValue(new Error('DB error'));

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(500);
  });
});
