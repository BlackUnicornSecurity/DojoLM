/**
 * File: llm/batch/[id]/reports/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/batch/:id/reports API route
 * Source: src/app/api/llm/batch/[id]/reports/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — declared before any dynamic imports
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn(() => null),
}));

const mockGenerateBatchModelReports = vi.fn();

vi.mock('@/lib/llm-server-utils', () => ({
  generateBatchModelReports: (...args: unknown[]) => mockGenerateBatchModelReports(...args),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { checkApiAuth } from '@/lib/api-auth';

const mockCheckApiAuth = vi.mocked(checkApiAuth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), { method: 'GET' });
}

const VALID_BATCH_REPORT = {
  batchId: 'batch-123',
  batchName: 'Test Batch',
  generatedAt: '2024-01-01T00:00:00Z',
  models: [
    {
      modelId: 'model-1',
      modelName: 'Test Model',
      provider: 'openai',
      avgScore: 85,
      totalExecutions: 10,
      completedExecutions: 9,
      failedExecutions: 1,
      timeoutCount: 0,
      categories: [],
    },
  ],
  summary: {
    totalExecutions: 10,
    avgScore: 85,
    passRate: 0.9,
  },
};

// ---------------------------------------------------------------------------
// GET /api/llm/batch/:id/reports
// ---------------------------------------------------------------------------

describe('GET /api/llm/batch/[id]/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockGenerateBatchModelReports.mockResolvedValue(VALID_BATCH_REPORT);
  });

  it('returns 200 with batch report for valid batch ID', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/batch/batch-123/reports');
    const res = await GET(req, { params: Promise.resolve({ id: 'batch-123' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.batchId).toBe('batch-123');
    expect(data.models).toHaveLength(1);
    expect(data.models[0].modelName).toBe('Test Model');
  });

  it('calls generateBatchModelReports with the batch ID', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/batch/batch-456/reports');
    await GET(req, { params: Promise.resolve({ id: 'batch-456' }) });

    expect(mockGenerateBatchModelReports).toHaveBeenCalledWith('batch-456');
  });

  it('returns 400 for invalid batch ID with path traversal', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/batch/../evil/reports');
    const res = await GET(req, { params: Promise.resolve({ id: '../evil' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid batch id/i);
  });

  it('returns 400 for invalid batch ID with special characters', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/batch/batch<>123/reports');
    const res = await GET(req, { params: Promise.resolve({ id: 'batch<>123' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid batch id/i);
  });

  it('returns 404 when batch is not found', async () => {
    mockGenerateBatchModelReports.mockRejectedValue(new Error('Batch not found: missing-batch'));

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/batch/missing-batch/reports');
    const res = await GET(req, { params: Promise.resolve({ id: 'missing-batch' }) });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });

  it('returns 500 for unexpected errors', async () => {
    mockGenerateBatchModelReports.mockRejectedValue(new Error('Database connection failed'));

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/batch/batch-123/reports');
    const res = await GET(req, { params: Promise.resolve({ id: 'batch-123' }) });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/failed to generate batch reports/i);
  });

  it('accepts batch IDs with dots and dashes', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/batch/batch.v1-test/reports');
    const res = await GET(req, { params: Promise.resolve({ id: 'batch.v1-test' }) });

    expect(res.status).toBe(200);
    expect(mockGenerateBatchModelReports).toHaveBeenCalledWith('batch.v1-test');
  });
});

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

describe('Auth guard', () => {
  const unauthorizedResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(unauthorizedResponse as never);
  });

  it('returns 401 when auth fails', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/llm/batch/batch-123/reports');
    const res = await GET(req, { params: Promise.resolve({ id: 'batch-123' }) });

    expect(res.status).toBe(401);
  });
});
