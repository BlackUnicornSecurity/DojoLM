/**
 * File: llm/providers/[id]/status/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/providers/:id/status
 * Source: src/app/api/llm/providers/[id]/status/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetStorage = vi.fn();
const mockGetModelConfig = vi.fn();
const mockTestModelConfig = vi.fn();

vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: () => mockGetStorage(),
}));

vi.mock('@/lib/llm-providers', () => ({
  testModelConfig: (...args: unknown[]) => mockTestModelConfig(...args),
}));

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/llm/providers/p1/status');
}

const mockConfig = { id: 'p1', provider: 'openai', name: 'GPT-4' };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetModelConfig.mockResolvedValue(mockConfig);
  mockGetStorage.mockResolvedValue({ getModelConfig: mockGetModelConfig });
  mockTestModelConfig.mockResolvedValue({ success: true, durationMs: 150 });
});

describe('GET /api/llm/providers/:id/status', () => {
  it('PSTAT-001: returns available status for healthy provider', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('available');
    expect(json.durationMs).toBe(150);
  });

  it('PSTAT-002: returns unavailable status for unhealthy provider', async () => {
    mockTestModelConfig.mockResolvedValue({ success: false, error: 'Connection refused', durationMs: 5000 });
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p1'));
    const json = await res.json();
    expect(json.status).toBe('unavailable');
    expect(json.error).toBe('Connection refused');
  });

  it('PSTAT-003: returns 404 for unknown provider', async () => {
    mockGetModelConfig.mockResolvedValue(null);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('unknown'));
    expect(res.status).toBe(404);
  });

  it('PSTAT-004: includes provider info in response', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p1'));
    const json = await res.json();
    expect(json.id).toBe('p1');
    expect(json.provider).toBe('openai');
  });

  it('PSTAT-005: handles testModelConfig error', async () => {
    mockTestModelConfig.mockRejectedValue(new Error('Network error'));
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p1'));
    expect(res.status).toBe(500);
  });

  it('PSTAT-006: calls testModelConfig with config', async () => {
    const { GET } = await import('../route');
    await GET(createGetRequest(), createParams('p1'));
    expect(mockTestModelConfig).toHaveBeenCalledWith(mockConfig);
  });

  it('PSTAT-007: getStorage called once', async () => {
    const { GET } = await import('../route');
    await GET(createGetRequest(), createParams('p1'));
    expect(mockGetStorage).toHaveBeenCalledTimes(1);
  });

  it('PSTAT-008: response is JSON', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p1'));
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('PSTAT-009: no error field when available', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p1'));
    const json = await res.json();
    expect(json.error).toBeUndefined();
  });

  it('PSTAT-010: duration included for unavailable', async () => {
    mockTestModelConfig.mockResolvedValue({ success: false, durationMs: 10000, error: 'Timeout' });
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p1'));
    const json = await res.json();
    expect(json.durationMs).toBe(10000);
  });
});
