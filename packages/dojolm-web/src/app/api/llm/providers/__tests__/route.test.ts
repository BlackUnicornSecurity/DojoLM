/**
 * File: llm/providers/__tests__/route.test.ts
 * Purpose: Tests for POST/GET /api/llm/providers
 * Source: src/app/api/llm/providers/route.ts
 *
 * Index:
 * - PROV-001: POST valid provider returns 201 (line 52)
 * - PROV-002: POST missing provider field returns 400 (line 72)
 * - PROV-003: POST missing model field returns 400 (line 82)
 * - PROV-004: POST invalid JSON returns 400 (line 91)
 * - PROV-005: POST response strips auth details (line 100)
 * - PROV-006: POST generates server-side UUID (line 113)
 * - PROV-007: POST with baseUrl calls SSRF validation (line 125)
 * - PROV-008: POST with unsafe baseUrl returns 400 (line 140)
 * - PROV-009: POST rate limit (>10/min) returns 429 (line 155)
 * - PROV-010: GET lists providers (line 171)
 * - PROV-011: GET strips auth details from list (line 184)
 * - PROV-012: GET internal error returns 500 (line 199)
 * - PROV-013: POST defaults name to provider/model (line 210)
 * - PROV-014: POST internal error returns 500 (line 222)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api-auth', () => ({ checkApiAuth: () => null }));

const mockGetStorage = vi.fn();
const mockSaveModelConfig = vi.fn();
const mockGetModelConfigs = vi.fn();
const mockValidateProviderUrl = vi.fn().mockReturnValue(true);

vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: (...args: unknown[]) => mockGetStorage(...args),
}));

vi.mock('bu-tpi/llm', () => ({
  validateProviderUrl: (...args: unknown[]) => mockValidateProviderUrl(...args),
}));

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/providers', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveModelConfig.mockImplementation(async (config: Record<string, unknown>) => config);
  mockGetModelConfigs.mockResolvedValue([]);
  mockGetStorage.mockResolvedValue({
    saveModelConfig: mockSaveModelConfig,
    getModelConfigs: mockGetModelConfigs,
  });
  mockValidateProviderUrl.mockReturnValue(true);
});

describe('POST /api/llm/providers', () => {
  it('PROV-001: valid provider registration returns 201', async () => {
    const { POST } = await import('../route');
    const res = await POST(createPostRequest({
      provider: 'openai',
      model: 'gpt-4',
      name: 'Test GPT-4',
    }));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBeDefined();
    expect(json.name).toBe('Test GPT-4');
    expect(json.provider).toBe('openai');
    expect(json.model).toBe('gpt-4');
    expect(json.status).toBe('registered');
  });

  it('PROV-002: missing provider field returns 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(createPostRequest({ model: 'gpt-4' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('provider');
  });

  it('PROV-003: missing model field returns 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(createPostRequest({ provider: 'openai' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('model');
  });

  it('PROV-004: invalid JSON returns 400', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:42001/api/llm/providers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json{{{',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('PROV-005: response strips auth details (no apiKey, baseUrl)', async () => {
    const { POST } = await import('../route');
    const res = await POST(createPostRequest({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'sk-secret-key',
    }));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).not.toHaveProperty('apiKey');
    expect(json).not.toHaveProperty('baseUrl');
    expect(json).not.toHaveProperty('customHeaders');
  });

  it('PROV-006: generates server-side UUID (not user-supplied)', async () => {
    const { POST } = await import('../route');
    const res = await POST(createPostRequest({
      provider: 'openai',
      model: 'gpt-4',
      id: 'user-supplied-id',
    }));

    expect(res.status).toBe(201);
    const json = await res.json();
    // ID should be a UUID, not the user-supplied value
    expect(json.id).not.toBe('user-supplied-id');
    expect(json.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('PROV-007: POST with baseUrl calls SSRF validation', async () => {
    const { POST } = await import('../route');
    await POST(createPostRequest({
      provider: 'openai',
      model: 'gpt-4',
      baseUrl: 'https://api.example.com',
    }));

    expect(mockValidateProviderUrl).toHaveBeenCalledWith(
      'https://api.example.com',
      false // not a local provider
    );
  });

  it('PROV-008: POST with unsafe baseUrl returns 400', async () => {
    mockValidateProviderUrl.mockReturnValue(false);

    const { POST } = await import('../route');
    const res = await POST(createPostRequest({
      provider: 'openai',
      model: 'gpt-4',
      baseUrl: 'http://169.254.169.254/metadata',
    }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('unsafe baseUrl');
  });

  it('PROV-013: defaults name to provider/model when not provided', async () => {
    const { POST } = await import('../route');
    const res = await POST(createPostRequest({
      provider: 'anthropic',
      model: 'claude-3',
    }));

    expect(res.status).toBe(201);
    // The saved config should have name = 'anthropic/claude-3'
    expect(mockSaveModelConfig).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'anthropic/claude-3' })
    );
  });

  it('PROV-013b: persists requestTimeout when provided', async () => {
    const { POST } = await import('../route');
    const res = await POST(createPostRequest({
      provider: 'ollama',
      model: 'llama3.2',
      baseUrl: 'http://localhost:11434',
      requestTimeout: 120000,
    }));

    expect(res.status).toBe(201);
    expect(mockSaveModelConfig).toHaveBeenCalledWith(
      expect.objectContaining({ requestTimeout: 120000 })
    );
  });

  it('PROV-014: internal error returns 500', async () => {
    mockGetStorage.mockRejectedValue(new Error('Storage unavailable'));

    const { POST } = await import('../route');
    const res = await POST(createPostRequest({
      provider: 'openai',
      model: 'gpt-4',
    }));

    expect(res.status).toBe(500);
  });
});

describe('GET /api/llm/providers', () => {
  it('PROV-010: lists configured providers', async () => {
    mockGetModelConfigs.mockResolvedValue([
      { id: 'p1', name: 'GPT-4', provider: 'openai', model: 'gpt-4', enabled: true, apiKey: 'sk-secret' },
      { id: 'p2', name: 'Claude', provider: 'anthropic', model: 'claude-3', enabled: false, apiKey: 'sk-ant' },
    ]);

    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost:42001/api/llm/providers'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(2);
    expect(json[0].name).toBe('GPT-4');
    expect(json[1].name).toBe('Claude');
  });

  it('PROV-011: GET strips auth details from list', async () => {
    mockGetModelConfigs.mockResolvedValue([
      { id: 'p1', name: 'GPT-4', provider: 'openai', model: 'gpt-4', enabled: true, apiKey: 'sk-secret', baseUrl: 'https://api.openai.com' },
    ]);

    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost:42001/api/llm/providers'));
    const json = await res.json();

    for (const item of json) {
      expect(item).not.toHaveProperty('apiKey');
      expect(item).not.toHaveProperty('baseUrl');
      expect(item).not.toHaveProperty('customHeaders');
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('provider');
      expect(item).toHaveProperty('model');
      expect(item).toHaveProperty('enabled');
      expect(item).toHaveProperty('status');
    }
  });

  it('PROV-012: GET internal error returns 500', async () => {
    mockGetStorage.mockRejectedValue(new Error('DB error'));

    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost:42001/api/llm/providers'));
    expect(res.status).toBe(500);
  });
});
