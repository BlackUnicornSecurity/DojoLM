/**
 * File: llm/coverage/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/coverage
 * Source: src/app/api/llm/coverage/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFetchCoverageMap = vi.fn();

vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

vi.mock('@/lib/llm-server-utils', () => ({
  fetchCoverageMap: (...args: unknown[]) => mockFetchCoverageMap(...args),
}));

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:42001/api/llm/coverage');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

const emptyCoverage = { owasp: {}, tpi: {}, custom: {} };

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchCoverageMap.mockResolvedValue(emptyCoverage);
});

describe('GET /api/llm/coverage', () => {
  it('COV-001: returns coverage with summary', async () => {
    mockFetchCoverageMap.mockResolvedValue({
      owasp: { LLM01: { tested: 10, passed: 8, failed: 2, percentage: 80 } },
      tpi: { TPI1: { tested: 5, passed: 5, failed: 0, percentage: 100 } },
      custom: {},
    });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.coverage).toBeDefined();
    expect(json.summary).toBeDefined();
    expect(json.summary.owasp.total).toBe(1);
    expect(json.summary.tpi.total).toBe(1);
  });

  it('COV-002: empty coverage returns zeros', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.summary.owasp.total).toBe(0);
    expect(json.summary.tpi.total).toBe(0);
  });

  it('COV-003: filters by modelId', async () => {
    const { GET } = await import('../route');
    await GET(createGetRequest({ modelId: 'model-1' }));
    expect(mockFetchCoverageMap).toHaveBeenCalledWith('model-1');
  });

  it('COV-004: no modelId passes undefined', async () => {
    const { GET } = await import('../route');
    await GET(createGetRequest());
    expect(mockFetchCoverageMap).toHaveBeenCalledWith(undefined);
  });

  it('COV-005: calculates owasp percentage correctly', async () => {
    mockFetchCoverageMap.mockResolvedValue({
      owasp: {
        LLM01: { tested: 10, passed: 10, failed: 0, percentage: 100 },
        LLM02: { tested: 10, passed: 5, failed: 5, percentage: 50 },
        LLM03: { tested: 0, passed: 0, failed: 0, percentage: 0 },
      },
      tpi: {},
      custom: {},
    });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.summary.owasp.total).toBe(3);
    expect(json.summary.owasp.tested).toBe(2); // LLM03 not tested
    expect(json.summary.owasp.passed).toBe(2); // Both LLM01 and LLM02 have passed > 0
  });

  it('COV-006: internal error returns 500', async () => {
    mockFetchCoverageMap.mockRejectedValue(new Error('Error'));

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(500);
  });

  it('COV-007: tpi percentage calculated correctly', async () => {
    mockFetchCoverageMap.mockResolvedValue({
      owasp: {},
      tpi: {
        TPI1: { tested: 10, passed: 10, failed: 0, percentage: 100 },
      },
      custom: {},
    });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.summary.tpi.percentage).toBe(100);
  });

  it('COV-008: zero tested returns 0 percentage', async () => {
    mockFetchCoverageMap.mockResolvedValue({
      owasp: { LLM01: { tested: 0, passed: 0, failed: 0, percentage: 0 } },
      tpi: {},
      custom: {},
    });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.summary.owasp.percentage).toBe(0);
  });

  it('COV-009: response includes raw coverage data', async () => {
    mockFetchCoverageMap.mockResolvedValue({
      owasp: { LLM01: { tested: 5, passed: 3, failed: 2, percentage: 60 } },
      tpi: {},
      custom: {},
    });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.coverage.owasp.LLM01.tested).toBe(5);
  });

  it('COV-010: handles mixed owasp and tpi coverage', async () => {
    mockFetchCoverageMap.mockResolvedValue({
      owasp: { LLM01: { tested: 10, passed: 8, failed: 2, percentage: 80 } },
      tpi: { TPI1: { tested: 5, passed: 3, failed: 2, percentage: 60 } },
      custom: { CUSTOM1: { tested: 3, passed: 3, failed: 0, percentage: 100 } },
    });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.summary.owasp.total).toBe(1);
    expect(json.summary.tpi.total).toBe(1);
  });
});
