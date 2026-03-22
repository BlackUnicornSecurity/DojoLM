/**
 * File: route.test.ts
 * Tests: BT-001 to BT-012
 * Coverage: POST/GET /api/llm/batch-test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateBatch = vi.fn();
const mockQueryBatches = vi.fn();
const mockUpdateBatch = vi.fn();
const mockGetModelConfig = vi.fn();
const mockGetTestCase = vi.fn();
const mockSaveExecution = vi.fn();
const mockExecuteSingleTest = vi.fn();

vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: vi.fn().mockImplementation(async () => ({
    createBatch: (...args: unknown[]) => mockCreateBatch(...args),
    queryBatches: (...args: unknown[]) => mockQueryBatches(...args),
    updateBatch: (...args: unknown[]) => mockUpdateBatch(...args),
    getModelConfig: (...args: unknown[]) => mockGetModelConfig(...args),
    getTestCase: (...args: unknown[]) => mockGetTestCase(...args),
    saveExecution: (...args: unknown[]) => mockSaveExecution(...args),
  })),
}));

vi.mock('@/lib/llm-execution', () => ({
  executeSingleTest: (...args: unknown[]) => mockExecuteSingleTest(...args),
}));

vi.mock('@/lib/llm-constants', () => ({
  getConcurrentLimit: () => 5,
  getMaxBatchSize: () => 100,
}));

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: () => null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/batch-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/batch-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid-json',
  });
}

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/batch-test', {
    method: 'GET',
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/llm/batch-test', () => {
  let POST: typeof import('../route').POST;
  let GET: typeof import('../route').GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import to reset module-level state (runningBatches)
    vi.resetModules();
    ({ POST, GET } = await import('../route'));

    mockCreateBatch.mockResolvedValue({
      id: 'batch-123',
      name: 'Batch batch-12',
      status: 'running',
    });
    mockQueryBatches.mockResolvedValue({ batches: [] });
    mockUpdateBatch.mockResolvedValue(undefined);
    mockGetModelConfig.mockResolvedValue({ id: 'm1', name: 'Model1' });
    mockGetTestCase.mockResolvedValue({ id: 'tc1', name: 'TestCase1' });
    mockExecuteSingleTest.mockResolvedValue({
      id: 'exec-1',
      resilienceScore: 80,
    });
    mockSaveExecution.mockResolvedValue(undefined);
  });

  // BT-001
  it('BT-001: POST returns 202 on success', async () => {
    const res = await POST(makePostRequest({ modelIds: ['m1'], testCaseIds: ['tc1'] }));
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.batchId).toBeDefined();
    expect(body.status).toBe('running');
    expect(body.totalTests).toBe(1);
  });

  // BT-002
  it('BT-002: POST returns 400 when modelIds is missing', async () => {
    const res = await POST(makePostRequest({ testCaseIds: ['tc1'] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing required fields/i);
  });

  // BT-003
  it('BT-003: POST returns 400 when testCaseIds is missing', async () => {
    const res = await POST(makePostRequest({ modelIds: ['m1'] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing required fields/i);
  });

  // BT-004
  it('BT-004: POST returns 400 for invalid JSON', async () => {
    const res = await POST(makeInvalidJsonRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid JSON/i);
  });

  // BT-005
  it('BT-005: POST returns 400 when batch is too large', async () => {
    // 11 models x 10 cases = 110 > maxBatchSize of 100
    const modelIds = Array.from({ length: 11 }, (_, i) => `m${i}`);
    const testCaseIds = Array.from({ length: 10 }, (_, i) => `tc${i}`);
    const res = await POST(makePostRequest({ modelIds, testCaseIds }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Batch too large/i);
  });

  // BT-006
  it('BT-006: POST returns 400 with empty modelIds array', async () => {
    const res = await POST(makePostRequest({ modelIds: [], testCaseIds: ['tc1'] }));
    expect(res.status).toBe(400);
  });

  // BT-007
  it('BT-007: POST returns 400 with empty testCaseIds array', async () => {
    const res = await POST(makePostRequest({ modelIds: ['m1'], testCaseIds: [] }));
    expect(res.status).toBe(400);
  });

  // BT-008
  it('BT-008: POST returns 429 when concurrent batch limit reached', async () => {
    let batchCount = 0;
    mockCreateBatch.mockImplementation(async () => {
      batchCount++;
      return { id: `batch-${batchCount}`, name: `Batch ${batchCount}`, status: 'running' };
    });

    // Make background execution hang so batches stay in runningBatches
    mockGetModelConfig.mockImplementation(() => new Promise(() => { /* never resolves */ }));

    // Fire 3 successful batches — background hangs so they stay registered
    await POST(makePostRequest({ modelIds: ['m1'], testCaseIds: ['tc1'] }));
    await POST(makePostRequest({ modelIds: ['m1'], testCaseIds: ['tc1'] }));
    await POST(makePostRequest({ modelIds: ['m1'], testCaseIds: ['tc1'] }));

    // 4th should be rejected
    const res = await POST(makePostRequest({ modelIds: ['m1'], testCaseIds: ['tc1'] }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/concurrent batches/i);
  });

  // BT-009
  it('BT-009: POST returns 500 on internal error', async () => {
    mockCreateBatch.mockRejectedValue(new Error('storage down'));
    const res = await POST(makePostRequest({ modelIds: ['m1'], testCaseIds: ['tc1'] }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Failed to start batch/i);
  });

  // BT-010
  it('BT-010: POST response includes totalTests count', async () => {
    const res = await POST(makePostRequest({ modelIds: ['m1', 'm2'], testCaseIds: ['tc1', 'tc2'] }));
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.totalTests).toBe(4);
  });
});

describe('GET /api/llm/batch-test', () => {
  let GET: typeof import('../route').GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    ({ GET } = await import('../route'));
    mockQueryBatches.mockResolvedValue({
      batches: [
        {
          id: 'b1',
          name: 'Batch 1',
          status: 'completed',
          totalTests: 10,
          completedTests: 10,
          failedTests: 0,
          avgResilienceScore: 85,
          createdAt: '2026-01-01T00:00:00Z',
          completedAt: '2026-01-01T00:01:00Z',
        },
      ],
    });
  });

  // BT-011
  it('BT-011: GET returns list of batches', async () => {
    const req = new NextRequest('http://localhost:42001/api/llm/batch-test', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe('b1');
    expect(body[0].status).toBe('completed');
  });

  // BT-012
  it('BT-012: GET returns 500 on internal error', async () => {
    mockQueryBatches.mockRejectedValue(new Error('storage down'));
    const req = new NextRequest('http://localhost:42001/api/llm/batch-test', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Failed to list batches/i);
  });
});
