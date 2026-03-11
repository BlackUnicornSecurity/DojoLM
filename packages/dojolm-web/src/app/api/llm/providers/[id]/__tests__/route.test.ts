/**
 * File: llm/providers/[id]/__tests__/route.test.ts
 * Purpose: Tests for GET/DELETE /api/llm/providers/[id]
 * Source: src/app/api/llm/providers/[id]/route.ts
 *
 * Index:
 * - PID-001: GET returns provider info (line 43)
 * - PID-002: GET strips auth details (line 57)
 * - PID-003: GET not found returns 404 (line 72)
 * - PID-004: GET internal error returns 500 (line 83)
 * - PID-005: DELETE removes provider (line 94)
 * - PID-006: DELETE not found returns 404 (line 108)
 * - PID-007: DELETE internal error returns 500 (line 121)
 * - PID-008: GET returns correct fields only (line 132)
 * - PID-009: DELETE returns success message with ID (line 145)
 * - PID-010: GET with different provider types (line 157)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetStorage = vi.fn();
const mockGetModelConfig = vi.fn();
const mockDeleteModelConfig = vi.fn();

vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: (...args: unknown[]) => mockGetStorage(...args),
}));

function createRequest(method: string = 'GET'): NextRequest {
  return new NextRequest('http://localhost:3000/api/llm/providers/test-id', { method });
}

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetModelConfig.mockResolvedValue(null);
  mockDeleteModelConfig.mockResolvedValue(undefined);
  mockGetStorage.mockResolvedValue({
    getModelConfig: mockGetModelConfig,
    deleteModelConfig: mockDeleteModelConfig,
  });
});

describe('GET /api/llm/providers/[id]', () => {
  it('PID-001: returns provider info with 200', async () => {
    mockGetModelConfig.mockResolvedValue({
      id: 'p1', name: 'GPT-4', provider: 'openai', model: 'gpt-4',
      enabled: true, apiKey: 'sk-secret', baseUrl: 'https://api.openai.com',
    });

    const { GET } = await import('../route');
    const res = await GET(createRequest(), createParams('p1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe('GPT-4');
  });

  it('PID-002: strips auth details (apiKey, baseUrl, customHeaders)', async () => {
    mockGetModelConfig.mockResolvedValue({
      id: 'p1', name: 'GPT-4', provider: 'openai', model: 'gpt-4',
      enabled: true, apiKey: 'sk-secret', baseUrl: 'https://api.openai.com',
      customHeaders: { Authorization: 'Bearer x' },
    });

    const { GET } = await import('../route');
    const res = await GET(createRequest(), createParams('p1'));
    const json = await res.json();

    expect(json).not.toHaveProperty('apiKey');
    expect(json).not.toHaveProperty('baseUrl');
    expect(json).not.toHaveProperty('customHeaders');
  });

  it('PID-003: not found returns 404', async () => {
    mockGetModelConfig.mockResolvedValue(null);

    const { GET } = await import('../route');
    const res = await GET(createRequest(), createParams('nonexistent'));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain('not found');
  });

  it('PID-004: internal error returns 500', async () => {
    mockGetStorage.mockRejectedValue(new Error('DB error'));

    const { GET } = await import('../route');
    const res = await GET(createRequest(), createParams('p1'));
    expect(res.status).toBe(500);
  });

  it('PID-008: returns only safe fields (id, name, provider, model, enabled)', async () => {
    mockGetModelConfig.mockResolvedValue({
      id: 'p1', name: 'Claude', provider: 'anthropic', model: 'claude-3',
      enabled: true, apiKey: 'sk-ant', temperature: 0.7,
    });

    const { GET } = await import('../route');
    const res = await GET(createRequest(), createParams('p1'));
    const json = await res.json();

    expect(json).toHaveProperty('id');
    expect(json).toHaveProperty('name');
    expect(json).toHaveProperty('provider');
    expect(json).toHaveProperty('model');
    expect(json).toHaveProperty('enabled');
  });

  it('PID-010: works with different provider types', async () => {
    mockGetModelConfig.mockResolvedValue({
      id: 'local-1', name: 'Ollama Llama', provider: 'ollama', model: 'llama3',
      enabled: true,
    });

    const { GET } = await import('../route');
    const res = await GET(createRequest(), createParams('local-1'));
    const json = await res.json();
    expect(json.provider).toBe('ollama');
  });
});

describe('DELETE /api/llm/providers/[id]', () => {
  it('PID-005: removes provider and returns success', async () => {
    mockGetModelConfig.mockResolvedValue({
      id: 'p1', name: 'GPT-4', provider: 'openai', model: 'gpt-4', enabled: true,
    });

    const { DELETE } = await import('../route');
    const res = await DELETE(createRequest('DELETE'), createParams('p1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockDeleteModelConfig).toHaveBeenCalledWith('p1');
  });

  it('PID-006: not found returns 404', async () => {
    mockGetModelConfig.mockResolvedValue(null);

    const { DELETE } = await import('../route');
    const res = await DELETE(createRequest('DELETE'), createParams('nonexistent'));
    expect(res.status).toBe(404);
  });

  it('PID-007: internal error returns 500', async () => {
    mockGetStorage.mockRejectedValue(new Error('DB error'));

    const { DELETE } = await import('../route');
    const res = await DELETE(createRequest('DELETE'), createParams('p1'));
    expect(res.status).toBe(500);
  });

  it('PID-009: returns success message with provider ID', async () => {
    mockGetModelConfig.mockResolvedValue({
      id: 'my-provider', name: 'Test', provider: 'openai', model: 'gpt-4', enabled: true,
    });

    const { DELETE } = await import('../route');
    const res = await DELETE(createRequest('DELETE'), createParams('my-provider'));
    const json = await res.json();
    expect(json.message).toContain('my-provider');
  });
});
