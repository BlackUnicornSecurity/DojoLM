/**
 * Tests for POST /api/llm/batch/cleanup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockQueryBatches = vi.fn();
const mockDeleteBatch = vi.fn();

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: vi.fn().mockResolvedValue({
    queryBatches: (...args: unknown[]) => mockQueryBatches(...args),
    deleteBatch: (...args: unknown[]) => mockDeleteBatch(...args),
  }),
}));

vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn((_msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: _msg }, { status });
  }),
}));

import { POST } from '../route';

function makeRequest(body?: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/batch/cleanup', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  });
}

const OLD_DATE = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
const RECENT_DATE = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1 hour ago

const staleBatch = {
  id: 'stale-1',
  status: 'failed',
  createdAt: OLD_DATE,
  completedTests: 10,
  totalTests: 100,
};

const recentBatch = {
  id: 'recent-1',
  status: 'failed',
  createdAt: RECENT_DATE,
  completedTests: 5,
  totalTests: 50,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryBatches.mockResolvedValue({ batches: [] });
  mockDeleteBatch.mockResolvedValue(true);
});

describe('POST /api/llm/batch/cleanup', () => {
  // BC-001
  it('BC-001: dry run returns candidates without deleting', async () => {
    mockQueryBatches.mockImplementation(({ status }) => {
      if (status === 'failed') return { batches: [staleBatch] };
      if (status === 'cancelled') return { batches: [] };
      return { batches: [] };
    });

    const res = await POST(makeRequest({ dryRun: true }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dryRun).toBe(true);
    expect(data.candidateCount).toBe(1);
    expect(data.candidates[0].id).toBe('stale-1');
    expect(mockDeleteBatch).not.toHaveBeenCalled();
  });

  // BC-002
  it('BC-002: defaults to dry run for safety', async () => {
    mockQueryBatches.mockResolvedValue({ batches: [staleBatch] });

    const res = await POST(makeRequest({}));
    const data = await res.json();

    expect(data.dryRun).toBe(true);
    expect(mockDeleteBatch).not.toHaveBeenCalled();
  });

  // BC-003
  it('BC-003: deletes stale batches when dryRun is false', async () => {
    mockQueryBatches.mockImplementation(({ status }) => {
      if (status === 'failed') return { batches: [staleBatch] };
      if (status === 'cancelled') return { batches: [] };
      return { batches: [] };
    });

    const res = await POST(makeRequest({ dryRun: false }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dryRun).toBe(false);
    expect(data.deletedCount).toBe(1);
    expect(mockDeleteBatch).toHaveBeenCalledWith('stale-1');
  });

  // BC-004
  it('BC-004: respects maxAgeDays parameter', async () => {
    mockQueryBatches.mockImplementation(({ status }) => {
      if (status === 'failed') return { batches: [staleBatch, recentBatch] };
      return { batches: [] };
    });

    // maxAgeDays=1 should only match staleBatch (30 days old), not recentBatch (1 hour old)
    const res = await POST(makeRequest({ dryRun: true, maxAgeDays: 1 }));
    const data = await res.json();

    expect(data.candidateCount).toBe(1);
    expect(data.candidates[0].id).toBe('stale-1');
  });

  // BC-005
  it('BC-005: handles empty body gracefully', async () => {
    const req = new NextRequest('http://localhost:42001/api/llm/batch/cleanup', {
      method: 'POST',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dryRun).toBe(true);
    expect(data.maxAgeDays).toBe(7);
  });

  // BC-006
  it('BC-006: includes cancelled batches in cleanup', async () => {
    const cancelledBatch = { ...staleBatch, id: 'cancelled-1', status: 'cancelled' };
    mockQueryBatches.mockImplementation(({ status }) => {
      if (status === 'failed') return { batches: [] };
      if (status === 'cancelled') return { batches: [cancelledBatch] };
      return { batches: [] };
    });

    const res = await POST(makeRequest({ dryRun: true }));
    const data = await res.json();

    expect(data.candidateCount).toBe(1);
    expect(data.candidates[0].id).toBe('cancelled-1');
  });

  // BC-007
  it('BC-007: reports errors for individual delete failures', async () => {
    mockQueryBatches.mockImplementation(({ status }) => {
      if (status === 'failed') return { batches: [staleBatch] };
      return { batches: [] };
    });
    mockDeleteBatch.mockRejectedValue(new Error('disk full'));

    const res = await POST(makeRequest({ dryRun: false }));
    const data = await res.json();

    expect(data.deletedCount).toBe(0);
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0]).toContain('disk full');
  });

  // BC-008
  it('BC-008: does not delete recent batches', async () => {
    mockQueryBatches.mockImplementation(({ status }) => {
      if (status === 'failed') return { batches: [recentBatch] };
      return { batches: [] };
    });

    const res = await POST(makeRequest({ dryRun: false }));
    const data = await res.json();

    expect(data.deletedCount).toBe(0);
    expect(mockDeleteBatch).not.toHaveBeenCalled();
  });
});
