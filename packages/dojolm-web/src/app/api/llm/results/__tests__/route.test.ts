/**
 * File: llm/results/__tests__/route.test.ts
 * Purpose: Tests for GET/DELETE /api/llm/results
 * Source: src/app/api/llm/results/route.ts
 *
 * Index:
 * - RES-001: GET returns executions with count/total (line 48)
 * - RES-002: GET passes filter params to queryExecutions (line 63)
 * - RES-003: GET with no params returns all (line 81)
 * - RES-004: GET internal error returns 500 (line 93)
 * - RES-005: DELETE requires auth (line 104)
 * - RES-006: DELETE with default retention (90 days) (line 116)
 * - RES-007: DELETE with custom retentionDays (line 130)
 * - RES-008: DELETE bounds retentionDays (1-3650) (line 143)
 * - RES-009: DELETE returns deleted count (line 159)
 * - RES-010: DELETE internal error returns 500 (line 171)
 * - RES-011: GET filters by minScore/maxScore (line 183)
 * - RES-012: GET filters by date range (line 197)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockCheckApiAuth = vi.fn().mockReturnValue(null);
const mockQueryExecutions = vi.fn();
const mockClearOldExecutions = vi.fn();

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}));

vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    queryExecutions: (...args: unknown[]) => mockQueryExecutions(...args),
    clearOldExecutions: (...args: unknown[]) => mockClearOldExecutions(...args),
  },
}));

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/llm/results');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function createDeleteRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/llm/results');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url, { method: 'DELETE' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckApiAuth.mockReturnValue(null);
  mockQueryExecutions.mockResolvedValue({ executions: [], total: 0 });
  mockClearOldExecutions.mockResolvedValue(0);
});

describe('GET /api/llm/results', () => {
  it('RES-001: returns executions with count and total', async () => {
    mockQueryExecutions.mockResolvedValue({
      executions: [{ id: 'e1' }, { id: 'e2' }],
      total: 10,
    });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.executions).toHaveLength(2);
    expect(json.count).toBe(2);
    expect(json.total).toBe(10);
  });

  it('RES-002: passes filter params to queryExecutions', async () => {
    const { GET } = await import('../route');
    await GET(createGetRequest({
      modelId: 'model-1',
      testCaseId: 'tc-1',
      status: 'completed',
      limit: '25',
      offset: '10',
    }));

    expect(mockQueryExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        modelConfigId: 'model-1',
        testCaseId: 'tc-1',
        status: 'completed',
        limit: 25,
        offset: 10,
      })
    );
  });

  it('RES-003: no params returns all executions', async () => {
    mockQueryExecutions.mockResolvedValue({ executions: [], total: 0 });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    expect(mockQueryExecutions).toHaveBeenCalled();
  });

  it('RES-004: internal error returns 500', async () => {
    mockQueryExecutions.mockRejectedValue(new Error('DB error'));

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(500);
  });

  it('RES-011: filters by minScore and maxScore', async () => {
    const { GET } = await import('../route');
    await GET(createGetRequest({ minScore: '50', maxScore: '90' }));

    expect(mockQueryExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        minScore: 50,
        maxScore: 90,
      })
    );
  });

  it('RES-012: filters by date range', async () => {
    const { GET } = await import('../route');
    await GET(createGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    }));

    expect(mockQueryExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      })
    );
  });
});

describe('DELETE /api/llm/results', () => {
  it('RES-005: requires auth', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const { DELETE } = await import('../route');
    const res = await DELETE(createDeleteRequest());
    expect(res.status).toBe(401);
  });

  it('RES-006: defaults to 90 day retention', async () => {
    mockClearOldExecutions.mockResolvedValue(5);

    const { DELETE } = await import('../route');
    const res = await DELETE(createDeleteRequest());
    expect(res.status).toBe(200);
    expect(mockClearOldExecutions).toHaveBeenCalledWith(90);
  });

  it('RES-007: respects custom retentionDays', async () => {
    mockClearOldExecutions.mockResolvedValue(10);

    const { DELETE } = await import('../route');
    const res = await DELETE(createDeleteRequest({ retentionDays: '30' }));
    expect(res.status).toBe(200);
    expect(mockClearOldExecutions).toHaveBeenCalledWith(30);
  });

  it('RES-008: bounds retentionDays to valid range (defaults to 90 for invalid)', async () => {
    const { DELETE } = await import('../route');

    // Out of range - too high
    await DELETE(createDeleteRequest({ retentionDays: '9999' }));
    expect(mockClearOldExecutions).toHaveBeenLastCalledWith(90);

    // Out of range - zero
    await DELETE(createDeleteRequest({ retentionDays: '0' }));
    expect(mockClearOldExecutions).toHaveBeenLastCalledWith(90);

    // NaN
    await DELETE(createDeleteRequest({ retentionDays: 'abc' }));
    expect(mockClearOldExecutions).toHaveBeenLastCalledWith(90);
  });

  it('RES-009: returns deleted count in response', async () => {
    mockClearOldExecutions.mockResolvedValue(42);

    const { DELETE } = await import('../route');
    const res = await DELETE(createDeleteRequest());
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.deleted).toBe(42);
    expect(json.message).toContain('42');
  });

  it('RES-010: internal error returns 500', async () => {
    mockClearOldExecutions.mockRejectedValue(new Error('DB error'));

    const { DELETE } = await import('../route');
    const res = await DELETE(createDeleteRequest());
    expect(res.status).toBe(500);
  });
});
