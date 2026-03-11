/**
 * File: api/llm/batch/__tests__/route.test.ts
 * Purpose: Comprehensive tests for Batch execution API (POST, GET, DELETE)
 * Test IDs: BATCH-001 through BATCH-019
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    getModelConfig: vi.fn(),
    getTestCase: vi.fn(),
    createBatch: vi.fn(),
    updateBatch: vi.fn(),
    getBatch: vi.fn(),
    queryBatches: vi.fn(),
    deleteBatch: vi.fn(),
    saveExecution: vi.fn(),
  },
}));

vi.mock('@/lib/llm-execution', () => ({
  executeBatchTests: vi.fn().mockResolvedValue({
    status: 'completed',
    completedTests: 1,
    failedTests: 0,
    avgResilienceScore: 85,
    executionIds: ['e1'],
  }),
}));

vi.mock('@/lib/llm-constants', () => ({
  getConcurrentLimit: vi.fn().mockReturnValue(5),
}));

vi.mock('@/lib/guard-middleware', () => ({
  executeWithGuard: vi.fn().mockResolvedValue({
    execution: { id: 'e1', status: 'completed', resilienceScore: 85 },
    guardEvents: [],
  }),
}));

vi.mock('@/lib/storage/guard-storage', () => ({
  getGuardConfig: vi.fn().mockResolvedValue({ enabled: false, mode: 'shinobi' }),
  saveGuardEvent: vi.fn(),
  GuardConfigSecretMissingError: class extends Error {
    constructor() {
      super('missing');
    }
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST, GET, DELETE } from '../route';
import { fileStorage } from '@/lib/storage/file-storage';
import { getGuardConfig, GuardConfigSecretMissingError } from '@/lib/storage/guard-storage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/llm/batch';

function postRequest(body: unknown): NextRequest {
  return new NextRequest(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function getRequest(params?: Record<string, string>): NextRequest {
  const url = new URL(BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

function deleteRequest(params?: Record<string, string>): NextRequest {
  const url = new URL(BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url.toString(), { method: 'DELETE' });
}

const mockModel = (overrides?: Partial<{ id: string; name: string; enabled: boolean }>) => ({
  id: 'model-1',
  name: 'Test Model',
  enabled: true,
  ...overrides,
});

const mockTestCase = (overrides?: Partial<{ id: string; name: string; enabled: boolean }>) => ({
  id: 'tc-1',
  name: 'Test Case 1',
  enabled: true,
  ...overrides,
});

const mockBatch = (overrides?: Record<string, unknown>) => ({
  id: 'batch-1',
  name: 'Batch test',
  status: 'running',
  testCaseIds: ['tc-1'],
  modelConfigIds: ['model-1'],
  completedTests: 0,
  failedTests: 0,
  executionIds: [],
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Default happy-path stubs for POST
  vi.mocked(fileStorage.getModelConfig).mockResolvedValue(mockModel() as never);
  vi.mocked(fileStorage.getTestCase).mockResolvedValue(mockTestCase() as never);
  vi.mocked(fileStorage.createBatch).mockResolvedValue(mockBatch({ status: 'pending' }) as never);
  vi.mocked(fileStorage.updateBatch).mockResolvedValue(mockBatch() as never);
  vi.mocked(getGuardConfig).mockResolvedValue({ enabled: false, mode: 'shinobi' } as never);
});

// ===========================================================================
// POST /api/llm/batch
// ===========================================================================

describe('POST /api/llm/batch', () => {
  it('BATCH-001: valid request returns 202 with batch', async () => {
    const res = await POST(postRequest({ modelIds: ['model-1'], testCaseIds: ['tc-1'] }));
    const data = await res.json();

    expect(res.status).toBe(202);
    expect(data.batch).toBeDefined();
    expect(data.batch.status).toBe('running');
  });

  it('BATCH-002: missing modelIds returns 400', async () => {
    const res = await POST(postRequest({ testCaseIds: ['tc-1'] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/modelIds/i);
  });

  it('BATCH-003: missing testCaseIds returns 400', async () => {
    const res = await POST(postRequest({ modelIds: ['model-1'] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/testCaseIds/i);
  });

  it('BATCH-004: invalid modelId format (special chars) returns 400', async () => {
    const res = await POST(postRequest({ modelIds: ['model;DROP TABLE'], testCaseIds: ['tc-1'] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/modelIds/i);
  });

  it('BATCH-004b: invalid testCaseId format (special chars) returns 400', async () => {
    const res = await POST(postRequest({ modelIds: ['model-1'], testCaseIds: ['tc<script>'] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/testCaseIds/i);
  });

  it('BATCH-005: model not found returns 404', async () => {
    vi.mocked(fileStorage.getModelConfig).mockResolvedValue(null as never);

    const res = await POST(postRequest({ modelIds: ['nonexistent'], testCaseIds: ['tc-1'] }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/Model not found/);
  });

  it('BATCH-006: disabled model returns 400', async () => {
    vi.mocked(fileStorage.getModelConfig).mockResolvedValue(mockModel({ enabled: false }) as never);

    const res = await POST(postRequest({ modelIds: ['model-1'], testCaseIds: ['tc-1'] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/disabled/i);
  });

  it('BATCH-007: test case not found returns 404', async () => {
    vi.mocked(fileStorage.getTestCase).mockResolvedValue(null as never);

    const res = await POST(postRequest({ modelIds: ['model-1'], testCaseIds: ['tc-1'] }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/Test case not found/);
  });

  it('BATCH-008: disabled test case returns 400', async () => {
    vi.mocked(fileStorage.getTestCase).mockResolvedValue(mockTestCase({ enabled: false }) as never);

    const res = await POST(postRequest({ modelIds: ['model-1'], testCaseIds: ['tc-1'] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/disabled/i);
  });

  it('BATCH-009: invalid JSON body returns 400', async () => {
    const req = new NextRequest(BASE_URL, {
      method: 'POST',
      body: '{{not valid json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it('BATCH-010: GuardConfigSecretMissingError returns 503', async () => {
    vi.mocked(getGuardConfig).mockRejectedValue(new GuardConfigSecretMissingError());

    const res = await POST(postRequest({ modelIds: ['model-1'], testCaseIds: ['tc-1'] }));
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toMatch(/GUARD_CONFIG_SECRET/i);
  });

  it('BATCH-010b: empty modelIds array returns 400', async () => {
    const res = await POST(postRequest({ modelIds: [], testCaseIds: ['tc-1'] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/non-empty/i);
  });

  it('BATCH-010c: empty testCaseIds array returns 400', async () => {
    const res = await POST(postRequest({ modelIds: ['model-1'], testCaseIds: [] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/non-empty/i);
  });
});

// ===========================================================================
// GET /api/llm/batch
// ===========================================================================

describe('GET /api/llm/batch', () => {
  it('BATCH-011: specific batch by id returns batch', async () => {
    const batch = mockBatch({ status: 'completed' });
    vi.mocked(fileStorage.getBatch).mockResolvedValue(batch as never);

    const res = await GET(getRequest({ id: 'batch-1' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe('batch-1');
    expect(data.status).toBe('completed');
  });

  it('BATCH-012: batch not found returns 404', async () => {
    vi.mocked(fileStorage.getBatch).mockResolvedValue(null as never);

    const res = await GET(getRequest({ id: 'nonexistent' }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it('BATCH-013: filter by status returns filtered batches', async () => {
    const batches = [mockBatch({ status: 'completed' })];
    vi.mocked(fileStorage.queryBatches).mockResolvedValue({ batches } as never);

    const res = await GET(getRequest({ status: 'completed' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.batches).toHaveLength(1);
    expect(fileStorage.queryBatches).toHaveBeenCalledWith({ status: 'completed' });
  });

  it('BATCH-014: invalid status value returns 400', async () => {
    const res = await GET(getRequest({ status: 'bogus' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Invalid status/i);
  });

  it('BATCH-015: auto-fails stale running batch (by id)', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const staleBatch = mockBatch({ status: 'running', createdAt: twoHoursAgo });
    vi.mocked(fileStorage.getBatch).mockResolvedValue(staleBatch as never);
    vi.mocked(fileStorage.updateBatch).mockResolvedValue(undefined as never);

    const res = await GET(getRequest({ id: 'batch-1' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('failed');
    expect(fileStorage.updateBatch).toHaveBeenCalledWith('batch-1', { status: 'failed' });
  });

  it('BATCH-015b: auto-fails stale running batch (in status query)', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const staleBatch = mockBatch({ id: 'stale-1', status: 'running', createdAt: twoHoursAgo });
    vi.mocked(fileStorage.queryBatches).mockResolvedValue({ batches: [staleBatch] } as never);
    vi.mocked(fileStorage.updateBatch).mockResolvedValue(undefined as never);

    const res = await GET(getRequest({ status: 'running' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.batches[0].status).toBe('failed');
    expect(fileStorage.updateBatch).toHaveBeenCalledWith('stale-1', { status: 'failed' });
  });

  it('BATCH-016: no params returns all batches', async () => {
    const batches = [mockBatch(), mockBatch({ id: 'batch-2' })];
    vi.mocked(fileStorage.queryBatches).mockResolvedValue({ batches } as never);

    const res = await GET(getRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.batches).toHaveLength(2);
    expect(fileStorage.queryBatches).toHaveBeenCalledWith({});
  });

  it('BATCH-016b: non-stale running batch is NOT auto-failed', async () => {
    const recentBatch = mockBatch({
      status: 'running',
      createdAt: new Date().toISOString(),
    });
    vi.mocked(fileStorage.getBatch).mockResolvedValue(recentBatch as never);

    const res = await GET(getRequest({ id: 'batch-1' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('running');
    expect(fileStorage.updateBatch).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// DELETE /api/llm/batch
// ===========================================================================

describe('DELETE /api/llm/batch', () => {
  it('BATCH-017: valid id deletes batch and returns success', async () => {
    vi.mocked(fileStorage.deleteBatch).mockResolvedValue(true as never);

    const res = await DELETE(deleteRequest({ id: 'batch-1' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(fileStorage.deleteBatch).toHaveBeenCalledWith('batch-1');
  });

  it('BATCH-018: missing id returns 400', async () => {
    const res = await DELETE(deleteRequest());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/required/i);
  });

  it('BATCH-019: batch not found returns 404', async () => {
    vi.mocked(fileStorage.deleteBatch).mockResolvedValue(false as never);

    const res = await DELETE(deleteRequest({ id: 'nonexistent' }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });
});
