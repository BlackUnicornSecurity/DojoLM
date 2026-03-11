/**
 * Custom Provider Tests
 *
 * Tests for CustomProvider class covering initialization,
 * request building, response parsing with custom mappings,
 * auth types, error handling, streaming, and config validation.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { CustomProvider } from './custom.js';
import { NetworkError } from '../errors.js';
import type { CustomProviderTemplate } from '../types.js';

vi.stubGlobal('fetch', vi.fn());

vi.mock('../fetch-utils.js', () => ({
  fetchWithTimeout: vi.fn(),
  sanitizeUrl: vi.fn((url: string) => url),
  measureDuration: vi.fn(() => 50),
}));

vi.mock('../security.js', () => ({
  validateProviderUrl: vi.fn(() => true),
  validateJsonPath: vi.fn((path: string) => /^[a-zA-Z0-9_.[\]]+$/.test(path)),
  resolveJsonPath: vi.fn((data: unknown, path: string) => {
    const parts = path.split('.');
    let current: unknown = data;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined;
      const match = part.match(/^(\w+)\[(\d+)]$/);
      if (match) {
        current = (current as Record<string, unknown>)[match[1]];
        if (Array.isArray(current)) current = current[Number(match[2])];
        else return undefined;
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }
    return current;
  }),
}));

import { fetchWithTimeout } from '../fetch-utils.js';

const mockFetch = fetchWithTimeout as Mock;

function makeTemplate(overrides: Partial<CustomProviderTemplate> = {}): CustomProviderTemplate {
  return {
    baseUrl: 'https://custom-api.example.com',
    authType: 'bearer',
    isLocal: false,
    ...overrides,
  } as CustomProviderTemplate;
}

function makeConfig(overrides = {}) {
  return {
    id: 'custom-1',
    name: 'Custom LLM',
    provider: 'custom' as const,
    model: 'custom-model-v1',
    apiKey: 'custom-key-12345',
    enabled: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  };
}

function makeOptions(overrides = {}) {
  return {
    prompt: 'Hello Custom!',
    ...overrides,
  };
}

function makeOkResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers(),
  };
}

function makeErrorResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    json: vi.fn().mockRejectedValue(new Error('not json')),
    text: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  };
}

describe('CustomProvider', () => {
  let provider: CustomProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new CustomProvider(makeTemplate());
  });

  // =========================================================================
  // CUST-T01: Initialization
  // =========================================================================
  it('CUST-T01: initializes with correct provider type and no streaming', () => {
    expect(provider.providerType).toBe('custom');
    expect(provider.supportsStreaming).toBe(false);
  });

  // =========================================================================
  // CUST-T02: accepts valid response mapping paths
  // =========================================================================
  it('CUST-T02: constructor accepts valid response mapping paths', () => {
    expect(() => new CustomProvider(makeTemplate({
      responseMapping: { text: 'data.output' },
    }))).not.toThrow();
  });

  // =========================================================================
  // CUST-T03: execute with bearer auth
  // =========================================================================
  it('CUST-T03: execute sends Bearer auth header by default', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'response' } }],
      usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
    }));

    await provider.execute(makeConfig(), makeOptions());

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://custom-api.example.com/chat/completions');
    expect(callArgs[1].headers['Authorization']).toBe('Bearer custom-key-12345');
  });

  // =========================================================================
  // CUST-T04: execute with api-key-header auth
  // =========================================================================
  it('CUST-T04: uses api-key-header auth with custom header name', async () => {
    provider = new CustomProvider(makeTemplate({
      authType: 'api-key-header',
      authHeaderName: 'X-Custom-Key',
    }));

    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: {},
    }));

    await provider.execute(makeConfig(), makeOptions());

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['X-Custom-Key']).toBe('custom-key-12345');
    expect(headers['Authorization']).toBeUndefined();
  });

  // =========================================================================
  // CUST-T05: execute with query-param auth
  // =========================================================================
  it('CUST-T05: appends API key as query param for query-param auth', async () => {
    provider = new CustomProvider(makeTemplate({ authType: 'query-param' }));

    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: {},
    }));

    await provider.execute(makeConfig(), makeOptions());

    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain('key=custom-key-12345');
  });

  // =========================================================================
  // CUST-T06: execute with none auth
  // =========================================================================
  it('CUST-T06: no auth header for none auth type', async () => {
    provider = new CustomProvider(makeTemplate({ authType: 'none' }));

    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: {},
    }));

    await provider.execute(makeConfig(), makeOptions());

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });

  // =========================================================================
  // CUST-T07: aws-sigv4 auth throws
  // =========================================================================
  it('CUST-T07: throws on aws-sigv4 auth type', async () => {
    provider = new CustomProvider(makeTemplate({ authType: 'aws-sigv4' }));

    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: {},
    }));

    await expect(provider.execute(makeConfig(), makeOptions()))
      .rejects.toThrow('aws-sigv4 auth not supported');
  });

  // =========================================================================
  // CUST-T08: parses response with custom mapping
  // =========================================================================
  it('CUST-T08: uses custom responseMapping to extract text and tokens', async () => {
    provider = new CustomProvider(makeTemplate({
      responseMapping: {
        text: 'data.output',
        promptTokens: 'meta.input_count',
        completionTokens: 'meta.output_count',
      },
    }));

    mockFetch.mockResolvedValue(makeOkResponse({
      data: { output: 'Custom mapped text' },
      meta: { input_count: 12, output_count: 8 },
    }));

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Custom mapped text');
    expect(result.promptTokens).toBe(12);
    expect(result.completionTokens).toBe(8);
    expect(result.totalTokens).toBe(20);
  });

  // =========================================================================
  // CUST-T09: fallback to OpenAI-compatible parsing
  // =========================================================================
  it('CUST-T09: falls back to OpenAI-compatible format when no mapping', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'OpenAI-format response' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }));

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('OpenAI-format response');
    expect(result.promptTokens).toBe(10);
    expect(result.completionTokens).toBe(5);
  });

  // =========================================================================
  // CUST-T10: throws NetworkError on fetch failure
  // =========================================================================
  it('CUST-T10: throws NetworkError when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));

    await expect(provider.execute(makeConfig(), makeOptions()))
      .rejects.toThrow(NetworkError);
  });

  // =========================================================================
  // CUST-T11: throws on non-JSON response
  // =========================================================================
  it('CUST-T11: throws when response is not valid JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError('unexpected token')),
      text: vi.fn().mockResolvedValue('not json'),
    });

    await expect(provider.execute(makeConfig(), makeOptions()))
      .rejects.toThrow('Custom provider returned non-JSON response');
  });

  // =========================================================================
  // CUST-T12: throws on error response
  // =========================================================================
  it('CUST-T12: throws on non-ok API response', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(400, 'Bad request'));

    await expect(provider.execute(makeConfig(), makeOptions()))
      .rejects.toThrow();
  });

  // =========================================================================
  // CUST-T13: validateConfig
  // =========================================================================
  it('CUST-T13: validateConfig checks model and baseUrl', () => {
    expect(provider.validateConfig(makeConfig())).toBe(true);
    expect(provider.validateConfig(makeConfig({ model: '' }))).toBe(false);
  });

  // =========================================================================
  // CUST-T14: streamExecute
  // =========================================================================
  it('CUST-T14: streamExecute calls onChunk then done', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'stream out' } }],
      usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
    }));

    const chunks: Array<{ delta: string; done: boolean }> = [];
    await provider.streamExecute(makeConfig(), makeOptions(), (chunk) => {
      chunks.push({ delta: chunk.delta, done: chunk.done });
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({ delta: 'stream out', done: false });
    expect(chunks[1].done).toBe(true);
  });

  // =========================================================================
  // CUST-T15: getMaxContext and estimateCost
  // =========================================================================
  it('CUST-T15: getMaxContext returns 32768 and estimateCost returns 0', () => {
    expect(provider.getMaxContext()).toBe(32_768);
    expect(provider.estimateCost()).toBe(0);
  });

  // =========================================================================
  // CUST-T16: testConnection
  // =========================================================================
  it('CUST-T16: testConnection returns false on failure', async () => {
    mockFetch.mockRejectedValue(new Error('fail'));
    expect(await provider.testConnection(makeConfig())).toBe(false);
  });

  // =========================================================================
  // CUST-T17: uses config baseUrl over template
  // =========================================================================
  it('CUST-T17: config baseUrl overrides template baseUrl', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: {},
    }));

    await provider.execute(
      makeConfig({ baseUrl: 'https://override.example.com' }),
      makeOptions(),
    );

    expect(mockFetch.mock.calls[0][0]).toBe('https://override.example.com/chat/completions');
  });

  // =========================================================================
  // CUST-T18: custom headers merged
  // =========================================================================
  it('CUST-T18: merges template and config custom headers', async () => {
    provider = new CustomProvider(makeTemplate({
      customHeaders: { 'X-Template': 'yes' },
    }));

    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: {},
    }));

    await provider.execute(
      makeConfig({ customHeaders: { 'X-Config': 'also-yes' } }),
      makeOptions(),
    );

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['X-Template']).toBe('yes');
    expect(headers['X-Config']).toBe('also-yes');
  });
});
