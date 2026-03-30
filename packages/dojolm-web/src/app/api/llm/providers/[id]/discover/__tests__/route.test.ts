/**
 * File: llm/providers/[id]/discover/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/providers/:id/discover
 * Source: src/app/api/llm/providers/[id]/discover/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetStorage = vi.fn();
const mockGetModelConfig = vi.fn();

vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: () => mockGetStorage(),
}));

const mockValidateProviderUrl = vi.fn().mockReturnValue(true);

vi.mock('bu-tpi/llm', () => ({
  validateProviderUrl: (...args: unknown[]) => mockValidateProviderUrl(...args),
}));

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/providers/p1/discover');
}

const localConfig = { id: 'p1', provider: 'ollama', baseUrl: 'http://localhost:11434', name: 'Local Ollama' };
const cloudConfig = { id: 'p2', provider: 'openai', baseUrl: 'https://api.openai.com', name: 'OpenAI' };
const noUrlConfig = { id: 'p3', provider: 'lmstudio', name: 'LM Studio' };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetModelConfig.mockResolvedValue(localConfig);
  mockGetStorage.mockResolvedValue({ getModelConfig: mockGetModelConfig });
  mockValidateProviderUrl.mockReturnValue(true);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ models: [{ name: 'llama3' }] }),
  }));
});

describe('GET /api/llm/providers/:id/discover', () => {
  it('DISC-001: discovers models for local provider', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.providerId).toBe('p1');
    expect(json.models).toBeDefined();
  });

  it('DISC-002: returns 404 for unknown provider', async () => {
    mockGetModelConfig.mockResolvedValue(null);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('unknown'));
    expect(res.status).toBe(404);
  });

  it('DISC-003: rejects non-local provider', async () => {
    mockGetModelConfig.mockResolvedValue(cloudConfig);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p2'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('local');
  });

  it('DISC-004: rejects non-localhost baseUrl', async () => {
    mockValidateProviderUrl.mockReturnValue(false);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p1'));
    expect(res.status).toBe(403);
  });

  it('DISC-005: uses default URL when baseUrl not set', async () => {
    mockGetModelConfig.mockResolvedValue(noUrlConfig);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p3'));
    expect(res.status).toBe(200);
  });

  it('DISC-006: handles fetch error gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p1'));
    const json = await res.json();
    expect(json.models).toEqual([]);
  });

  it('DISC-007: handles fetch non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p1'));
    const json = await res.json();
    expect(json.models).toEqual([]);
  });

  it('DISC-008: returns provider info in response', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p1'));
    const json = await res.json();
    expect(json.provider).toBe('ollama');
  });

  it('DISC-009: supports lmstudio provider', async () => {
    mockGetModelConfig.mockResolvedValue({ ...noUrlConfig, provider: 'lmstudio' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 'model-1' }] }),
    }));
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p3'));
    expect(res.status).toBe(200);
  });

  it('DISC-010: supports llamacpp provider', async () => {
    mockGetModelConfig.mockResolvedValue({ id: 'p4', provider: 'llamacpp', name: 'llama.cpp' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 'model-1' }] }),
    }));
    const { GET } = await import('../route');
    const res = await GET(createGetRequest(), createParams('p4'));
    expect(res.status).toBe(200);
  });
});
