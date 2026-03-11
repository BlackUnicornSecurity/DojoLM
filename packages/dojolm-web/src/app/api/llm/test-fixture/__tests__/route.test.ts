/**
 * File: llm/test-fixture/__tests__/route.test.ts
 * Purpose: Tests for POST /api/llm/test-fixture API route
 * Source: src/app/api/llm/test-fixture/route.ts
 * Tests: FIX-001 to FIX-010
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetModelConfig = vi.fn();
const mockGetTestCase = vi.fn();
const mockSaveExecution = vi.fn();

vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: vi.fn().mockResolvedValue({
    getModelConfig: (...args: unknown[]) => mockGetModelConfig(...args),
    getTestCase: (...args: unknown[]) => mockGetTestCase(...args),
    saveExecution: (...args: unknown[]) => mockSaveExecution(...args),
  }),
}));

const mockExecuteSingleTest = vi.fn();

vi.mock('@/lib/llm-execution', () => ({
  executeSingleTest: (...args: unknown[]) => mockExecuteSingleTest(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/llm/test-fixture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createInvalidJsonRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/llm/test-fixture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ invalid json !!!',
  });
}

const MOCK_CONFIG = { id: 'model-1', name: 'Test Model', provider: 'openai' };
const MOCK_TEST_CASE = { id: 'tc-1', name: 'Injection Test', category: 'injection' };
const MOCK_EXECUTION = {
  id: 'exec-1',
  status: 'completed',
  resilienceScore: 85,
  injectionSuccess: false,
  harmfulness: 0.1,
  categoriesPassed: ['injection'],
  categoriesFailed: [],
  duration_ms: 1200,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/llm/test-fixture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetModelConfig.mockResolvedValue(MOCK_CONFIG);
    mockGetTestCase.mockResolvedValue(MOCK_TEST_CASE);
    mockExecuteSingleTest.mockResolvedValue(MOCK_EXECUTION);
    mockSaveExecution.mockResolvedValue(undefined);
  });

  // FIX-001: POST success returns compliance result
  it('FIX-001: returns compliance result on success', async () => {
    const { POST } = await import('../route');
    const req = createPostRequest({ modelId: 'model-1', testCaseId: 'tc-1' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.executionId).toBe('exec-1');
    expect(body.modelId).toBe('model-1');
    expect(body.testCaseId).toBe('tc-1');
    expect(body.resilienceScore).toBe(85);
    expect(body.compliant).toBe(true);
  });

  // FIX-002: Missing modelId returns 400
  it('FIX-002: returns 400 when modelId is missing', async () => {
    const { POST } = await import('../route');
    const req = createPostRequest({ testCaseId: 'tc-1' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });

  // FIX-003: Missing testCaseId returns 400
  it('FIX-003: returns 400 when testCaseId is missing', async () => {
    const { POST } = await import('../route');
    const req = createPostRequest({ modelId: 'model-1' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });

  // FIX-004: Model not found returns 404
  it('FIX-004: returns 404 when model is not found', async () => {
    mockGetModelConfig.mockResolvedValue(null);
    const { POST } = await import('../route');
    const req = createPostRequest({ modelId: 'missing', testCaseId: 'tc-1' });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Model not found');
  });

  // FIX-005: Test case not found returns 404
  it('FIX-005: returns 404 when test case is not found', async () => {
    mockGetTestCase.mockResolvedValue(null);
    const { POST } = await import('../route');
    const req = createPostRequest({ modelId: 'model-1', testCaseId: 'missing' });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Test case not found');
  });

  // FIX-006: Invalid JSON returns 400
  it('FIX-006: returns 400 on invalid JSON body', async () => {
    const { POST } = await import('../route');
    const req = createInvalidJsonRequest();
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid JSON');
  });

  // FIX-007: Default compliance threshold is 70
  it('FIX-007: uses default compliance threshold of 70', async () => {
    mockExecuteSingleTest.mockResolvedValue({ ...MOCK_EXECUTION, resilienceScore: 65 });
    const { POST } = await import('../route');
    const req = createPostRequest({ modelId: 'model-1', testCaseId: 'tc-1' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.complianceThreshold).toBe(70);
    expect(body.compliant).toBe(false);
  });

  // FIX-008: Custom compliance threshold is respected
  it('FIX-008: respects custom compliance threshold', async () => {
    mockExecuteSingleTest.mockResolvedValue({ ...MOCK_EXECUTION, resilienceScore: 55 });
    const { POST } = await import('../route');
    const req = createPostRequest({ modelId: 'model-1', testCaseId: 'tc-1', complianceThreshold: 50 });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.complianceThreshold).toBe(50);
    expect(body.compliant).toBe(true);
  });

  // FIX-009: Internal error returns 500
  it('FIX-009: returns 500 on internal error', async () => {
    mockExecuteSingleTest.mockRejectedValue(new Error('LLM provider error'));
    const { POST } = await import('../route');
    const req = createPostRequest({ modelId: 'model-1', testCaseId: 'tc-1' });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Test fixture failed');
  });

  // FIX-010: Response includes all expected fields
  it('FIX-010: response includes all expected result fields', async () => {
    const { POST } = await import('../route');
    const req = createPostRequest({ modelId: 'model-1', testCaseId: 'tc-1' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('executionId');
    expect(body).toHaveProperty('modelId');
    expect(body).toHaveProperty('testCaseId');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('resilienceScore');
    expect(body).toHaveProperty('injectionSuccess');
    expect(body).toHaveProperty('harmfulness');
    expect(body).toHaveProperty('compliant');
    expect(body).toHaveProperty('complianceThreshold');
    expect(body).toHaveProperty('categoriesPassed');
    expect(body).toHaveProperty('categoriesFailed');
    expect(body).toHaveProperty('durationMs');
  });
});
