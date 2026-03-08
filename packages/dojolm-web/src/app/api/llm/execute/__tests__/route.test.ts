/**
 * File: llm/execute/route.test.ts
 * Purpose: Tests for POST /api/llm/execute API route
 * Source: src/app/api/llm/execute/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock api-auth to bypass auth in tests
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(null),
}));

// Mock api-error
vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

// Mock file-storage
vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    getModelConfig: vi.fn().mockResolvedValue(null),
    getTestCase: vi.fn().mockResolvedValue(null),
    saveExecution: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock llm-execution
vi.mock('@/lib/llm-execution', () => ({
  executeSingleTest: vi.fn().mockResolvedValue({ id: 'exec-1', status: 'completed' }),
  findCachedExecution: vi.fn().mockResolvedValue(null),
}));

// Mock guard-middleware
vi.mock('@/lib/guard-middleware', () => ({
  executeWithGuard: vi.fn().mockResolvedValue({
    execution: { id: 'exec-guard-1', status: 'completed' },
    guardEvents: [],
  }),
}));

// Mock guard-storage
vi.mock('@/lib/storage/guard-storage', () => ({
  getGuardConfig: vi.fn().mockResolvedValue({ enabled: false, mode: 'shinobi' }),
  saveGuardEvent: vi.fn().mockResolvedValue(undefined),
  getConfigHash: vi.fn().mockReturnValue('hash123'),
}));

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/llm/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/llm/execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing modelId or testCaseId', async () => {
    const { POST } = await import('@/app/api/llm/execute/route');

    const req = createPostRequest({ modelId: 'model-1' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('modelId');
    expect(body.error).toContain('testCaseId');
  });

  it('rejects missing testCaseId', async () => {
    const { POST } = await import('@/app/api/llm/execute/route');

    const req = createPostRequest({ testCaseId: 'tc-1' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('required');
  });

  it('returns 404 for non-existent model', async () => {
    const { fileStorage } = await import('@/lib/storage/file-storage');
    vi.mocked(fileStorage.getModelConfig).mockResolvedValueOnce(null);

    const { POST } = await import('@/app/api/llm/execute/route');

    const req = createPostRequest({ modelId: 'no-such-model', testCaseId: 'tc-1' });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('not found');
  });

  it('returns 400 for disabled model', async () => {
    const { fileStorage } = await import('@/lib/storage/file-storage');
    vi.mocked(fileStorage.getModelConfig).mockResolvedValueOnce({
      id: 'model-1',
      name: 'Test Model',
      enabled: false,
      provider: 'openai',
      endpoint: 'https://api.openai.com',
      apiKeyEnvVar: 'OPENAI_API_KEY',
    } as never);

    const { POST } = await import('@/app/api/llm/execute/route');

    const req = createPostRequest({ modelId: 'model-1', testCaseId: 'tc-1' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('disabled');
  });

  it('returns 404 for non-existent test case', async () => {
    const { fileStorage } = await import('@/lib/storage/file-storage');
    vi.mocked(fileStorage.getModelConfig).mockResolvedValueOnce({
      id: 'model-1',
      name: 'Test Model',
      enabled: true,
      provider: 'openai',
      endpoint: 'https://api.openai.com',
      apiKeyEnvVar: 'OPENAI_API_KEY',
    } as never);
    vi.mocked(fileStorage.getTestCase).mockResolvedValueOnce(null);

    const { POST } = await import('@/app/api/llm/execute/route');

    const req = createPostRequest({ modelId: 'model-1', testCaseId: 'no-such-tc' });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('not found');
  });

  it('rejects null JSON body (BUG-035)', async () => {
    const { POST } = await import('@/app/api/llm/execute/route');

    const req = new NextRequest('http://localhost:3000/api/llm/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'null',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('JSON object');
  });

  it('rejects invalid JSON body', async () => {
    const { POST } = await import('@/app/api/llm/execute/route');

    const req = new NextRequest('http://localhost:3000/api/llm/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{{invalid',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid JSON');
  });
});
