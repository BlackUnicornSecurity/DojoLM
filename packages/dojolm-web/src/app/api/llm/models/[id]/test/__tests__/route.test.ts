/**
 * File: llm/models/[id]/test/__tests__/route.test.ts
 * Purpose: Tests for POST /api/llm/models/:id/test
 * Source: src/app/api/llm/models/[id]/test/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockCheckApiAuth = vi.fn().mockReturnValue(null);
const mockGetModelConfig = vi.fn();
const mockTestModelConfig = vi.fn();

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}));

vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: vi.fn().mockResolvedValue({
    getModelConfig: (...args: unknown[]) => mockGetModelConfig(...args),
  }),
}));

vi.mock('@/lib/llm-providers', () => ({
  testModelConfig: (...args: unknown[]) => mockTestModelConfig(...args),
}));

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createPostRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/models/m1/test', { method: 'POST' });
}

const mockModel = { id: 'm1', provider: 'openai', name: 'GPT-4', apiKey: 'sk-test' };

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckApiAuth.mockReturnValue(null);
  mockGetModelConfig.mockResolvedValue(mockModel);
  mockTestModelConfig.mockResolvedValue({ success: true, durationMs: 200, message: 'Connection successful' });
});

describe('POST /api/llm/models/:id/test', () => {
  it('MTEST-001: successful model test', async () => {
    const { POST } = await import('../route');
    const res = await POST(createPostRequest(), createParams('m1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('MTEST-002: model not found returns 404', async () => {
    mockGetModelConfig.mockResolvedValue(null);
    const { POST } = await import('../route');
    const res = await POST(createPostRequest(), createParams('nonexistent'));
    expect(res.status).toBe(404);
  });

  it('MTEST-003: auth failure returns 401', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );
    const { POST } = await import('../route');
    const res = await POST(createPostRequest(), createParams('m1'));
    expect(res.status).toBe(401);
  });

  it('MTEST-004: failed model test returns result', async () => {
    mockTestModelConfig.mockResolvedValue({ success: false, error: 'Connection refused', durationMs: 5000 });
    const { POST } = await import('../route');
    const res = await POST(createPostRequest(), createParams('m1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Connection refused');
  });

  it('MTEST-005: internal error returns 500', async () => {
    mockTestModelConfig.mockRejectedValue(new Error('Internal'));
    const { POST } = await import('../route');
    const res = await POST(createPostRequest(), createParams('m1'));
    expect(res.status).toBe(500);
  });

  it('MTEST-006: calls testModelConfig with model', async () => {
    const { POST } = await import('../route');
    await POST(createPostRequest(), createParams('m1'));
    expect(mockTestModelConfig).toHaveBeenCalledWith(mockModel);
  });

  it('MTEST-007: response includes duration', async () => {
    const { POST } = await import('../route');
    const res = await POST(createPostRequest(), createParams('m1'));
    const json = await res.json();
    expect(json.durationMs).toBe(200);
  });

  it('MTEST-008: getModelConfig called with correct id', async () => {
    const { POST } = await import('../route');
    await POST(createPostRequest(), createParams('m1'));
    expect(mockGetModelConfig).toHaveBeenCalledWith('m1');
  });

  it('MTEST-009: checkApiAuth called', async () => {
    const { POST } = await import('../route');
    await POST(createPostRequest(), createParams('m1'));
    expect(mockCheckApiAuth).toHaveBeenCalledTimes(1);
  });

  it('MTEST-010: response is JSON', async () => {
    const { POST } = await import('../route');
    const res = await POST(createPostRequest(), createParams('m1'));
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});
