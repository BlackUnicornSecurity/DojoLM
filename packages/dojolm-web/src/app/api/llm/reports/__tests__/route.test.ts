/**
 * File: route.test.ts
 * Tests: RPT-001 to RPT-010
 * Coverage: GET /api/llm/reports
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGenerateModelReport = vi.fn();
const mockGenerateReport = vi.fn();
const mockGenerateReportFilename = vi.fn();
const mockGetModelConfig = vi.fn();

vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: vi.fn().mockResolvedValue({
    getModelConfig: (...args: unknown[]) => mockGetModelConfig(...args),
  }),
}));

vi.mock('@/lib/llm-server-utils', () => ({
  generateModelReport: (...args: unknown[]) => mockGenerateModelReport(...args),
}));

vi.mock('@/lib/llm-reports', () => ({
  generateReport: (...args: unknown[]) => mockGenerateReport(...args),
  generateReportFilename: (...args: unknown[]) => mockGenerateReportFilename(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:42001/api/llm/reports');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/llm/reports', () => {
  let GET: typeof import('../route').GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET } = await import('../route'));

    mockGetModelConfig.mockResolvedValue({ id: 'model-1', name: 'TestModel' });
    mockGenerateModelReport.mockResolvedValue({ summary: 'ok' });
    mockGenerateReport.mockReturnValue('report-content');
    mockGenerateReportFilename.mockReturnValue('TestModel-report.json');
  });

  // RPT-001
  it('RPT-001: returns 400 when modelId is missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Model ID/i);
  });

  // RPT-002
  it('RPT-002: returns 400 for invalid format', async () => {
    const res = await GET(makeRequest({ modelId: 'model-1', format: 'xml' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid format/i);
  });

  // RPT-003
  it('RPT-003: returns 404 when model is not found', async () => {
    mockGetModelConfig.mockResolvedValue(null);
    const res = await GET(makeRequest({ modelId: 'missing' }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  // RPT-004
  it('RPT-004: returns json report by default', async () => {
    const res = await GET(makeRequest({ modelId: 'model-1' }));
    expect(res.status).toBe(200);
    expect(mockGenerateReport).toHaveBeenCalled();
    const text = await res.text();
    expect(text).toBe('report-content');
  });

  // RPT-005
  it('RPT-005: accepts markdown format', async () => {
    mockGenerateReportFilename.mockReturnValue('TestModel-report.md');
    const res = await GET(makeRequest({ modelId: 'model-1', format: 'markdown' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/markdown');
  });

  // RPT-006
  it('RPT-006: accepts csv format', async () => {
    mockGenerateReportFilename.mockReturnValue('TestModel-report.csv');
    const res = await GET(makeRequest({ modelId: 'model-1', format: 'csv' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
  });

  // RPT-007
  it('RPT-007: sets correct content-type for json', async () => {
    const res = await GET(makeRequest({ modelId: 'model-1', format: 'json' }));
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  // RPT-008
  it('RPT-008: sets Content-Disposition header with filename', async () => {
    mockGenerateReportFilename.mockReturnValue('TestModel-report.json');
    const res = await GET(makeRequest({ modelId: 'model-1' }));
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Disposition')).toContain('TestModel-report.json');
  });

  // RPT-009
  it('RPT-009: returns 500 on internal error', async () => {
    mockGenerateModelReport.mockRejectedValue(new Error('boom'));
    const res = await GET(makeRequest({ modelId: 'model-1' }));
    expect(res.status).toBe(500);
  });

  // RPT-010
  it('RPT-010: passes includeExecutions and includeResponses to report request', async () => {
    const res = await GET(
      makeRequest({ modelId: 'model-1', includeExecutions: 'true', includeResponses: 'true' }),
    );
    expect(res.status).toBe(200);
    expect(mockGenerateReport).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        includeExecutions: true,
        includeResponses: true,
      }),
    );
  });
});
