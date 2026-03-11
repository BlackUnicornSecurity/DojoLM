/**
 * Cloudflare Workers AI Provider Tests
 *
 * Tests for CloudflareProvider class covering initialization,
 * request building, response parsing, error handling, streaming,
 * config validation, and status checks.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { CloudflareProvider } from './cloudflare.js';
import { AuthenticationError } from '../errors.js';

vi.stubGlobal('fetch', vi.fn());

vi.mock('../fetch-utils.js', () => ({
  fetchWithTimeout: vi.fn(),
  sanitizeUrl: vi.fn((url: string) => url),
  measureDuration: vi.fn(() => 33),
}));

vi.mock('../security.js', () => ({
  validateProviderUrl: vi.fn(() => true),
}));

import { fetchWithTimeout } from '../fetch-utils.js';

const mockFetch = fetchWithTimeout as Mock;

function makeConfig(overrides = {}) {
  return {
    id: 'cf-1',
    name: 'Cloudflare Llama',
    provider: 'cloudflare' as const,
    model: '@cf/meta/llama-3-8b-instruct',
    apiKey: 'cf-test-key-12345',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts/acct123',
    enabled: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  };
}

function makeOptions(overrides = {}) {
  return {
    prompt: 'Hello Cloudflare!',
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

describe('CloudflareProvider', () => {
  let provider: CloudflareProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new CloudflareProvider();
  });

  // =========================================================================
  // CF-T01: Initialization
  // =========================================================================
  it('CF-T01: initializes with correct provider type and no streaming', () => {
    expect(provider.providerType).toBe('cloudflare');
    expect(provider.supportsStreaming).toBe(false);
  });

  // =========================================================================
  // CF-T02: execute builds correct URL with encoded model
  // =========================================================================
  it('CF-T02: execute builds URL with encoded model name', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      result: { response: 'Hello!' },
      success: true,
    }));

    await provider.execute(makeConfig(), makeOptions());

    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toBe(
      'https://api.cloudflare.com/client/v4/accounts/acct123/ai/run/%40cf%2Fmeta%2Fllama-3-8b-instruct'
    );
  });

  // =========================================================================
  // CF-T03: execute sends Bearer auth header
  // =========================================================================
  it('CF-T03: execute sends Bearer auth header', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      result: { response: 'ok' },
      success: true,
    }));

    await provider.execute(makeConfig(), makeOptions());

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer cf-test-key-12345');
    expect(headers['Content-Type']).toBe('application/json');
  });

  // =========================================================================
  // CF-T04: execute parses Cloudflare response format
  // =========================================================================
  it('CF-T04: parses result.response from Cloudflare response', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      result: { response: 'Generated text from Cloudflare' },
      success: true,
    }));

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Generated text from Cloudflare');
    expect(result.promptTokens).toBe(0);
    expect(result.completionTokens).toBe(0);
    expect(result.totalTokens).toBe(0);
    expect(result.model).toBe('@cf/meta/llama-3-8b-instruct');
    expect(result.durationMs).toBe(33);
  });

  // =========================================================================
  // CF-T05: throws AuthenticationError when config invalid
  // =========================================================================
  it('CF-T05: throws AuthenticationError when API key is missing', async () => {
    const config = makeConfig({ apiKey: undefined });

    await expect(provider.execute(config, makeOptions()))
      .rejects.toThrow(AuthenticationError);
  });

  it('CF-T06: throws AuthenticationError when baseUrl is missing', async () => {
    const config = makeConfig({ baseUrl: undefined });

    await expect(provider.execute(config, makeOptions()))
      .rejects.toThrow(AuthenticationError);
  });

  // =========================================================================
  // CF-T07: execute throws on error response
  // =========================================================================
  it('CF-T07: throws on non-ok API response', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(500, 'Internal server error'));

    await expect(provider.execute(makeConfig(), makeOptions()))
      .rejects.toThrow();
  });

  // =========================================================================
  // CF-T08: execute includes system message
  // =========================================================================
  it('CF-T08: includes system message in messages array', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      result: { response: 'ok' },
      success: true,
    }));

    await provider.execute(makeConfig(), makeOptions({ systemMessage: 'Be concise.' }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'Be concise.' });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello Cloudflare!' });
  });

  // =========================================================================
  // CF-T09: execute passes temperature and max_tokens
  // =========================================================================
  it('CF-T09: passes temperature and max_tokens in request body', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      result: { response: 'ok' },
      success: true,
    }));

    await provider.execute(makeConfig(), makeOptions({ maxTokens: 256, temperature: 0.5 }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(256);
    expect(body.temperature).toBe(0.5);
  });

  // =========================================================================
  // CF-T10: validateConfig
  // =========================================================================
  it('CF-T10: validateConfig returns correct results', () => {
    expect(provider.validateConfig(makeConfig())).toBe(true);
    expect(provider.validateConfig(makeConfig({ model: '' }))).toBe(false);
    expect(provider.validateConfig(makeConfig({ apiKey: undefined }))).toBe(false);
    expect(provider.validateConfig(makeConfig({ baseUrl: undefined }))).toBe(false);
  });

  // =========================================================================
  // CF-T11: getMaxContext
  // =========================================================================
  it('CF-T11: getMaxContext returns 32768', () => {
    expect(provider.getMaxContext()).toBe(32_768);
  });

  // =========================================================================
  // CF-T12: estimateCost returns 0
  // =========================================================================
  it('CF-T12: estimateCost returns 0 (included in Workers plan)', () => {
    expect(provider.estimateCost('any', 1000, 1000)).toBe(0);
  });

  // =========================================================================
  // CF-T13: streamExecute emulates streaming
  // =========================================================================
  it('CF-T13: streamExecute calls onChunk then done', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      result: { response: 'streamed' },
      success: true,
    }));

    const chunks: Array<{ delta: string; done: boolean }> = [];
    await provider.streamExecute(makeConfig(), makeOptions(), (chunk) => {
      chunks.push({ delta: chunk.delta, done: chunk.done });
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({ delta: 'streamed', done: false });
    expect(chunks[1]).toEqual({ delta: '', done: true });
  });

  // =========================================================================
  // CF-T14: testConnection
  // =========================================================================
  it('CF-T14: testConnection returns true on ok', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    expect(await provider.testConnection(makeConfig())).toBe(true);
  });

  it('CF-T15: testConnection returns false on error', async () => {
    mockFetch.mockRejectedValue(new Error('fail'));
    expect(await provider.testConnection(makeConfig())).toBe(false);
  });

  // =========================================================================
  // CF-T16: checkStatus
  // =========================================================================
  it('CF-T16: checkStatus returns available or unavailable', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    expect(await provider.checkStatus(makeConfig())).toBe('available');

    mockFetch.mockResolvedValue({ ok: false });
    expect(await provider.checkStatus(makeConfig())).toBe('unavailable');
  });

  // =========================================================================
  // CF-T17: handles empty response
  // =========================================================================
  it('CF-T17: handles missing result.response gracefully', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ result: {}, success: true }));

    const result = await provider.execute(makeConfig(), makeOptions());
    expect(result.text).toBe('');
  });

  // =========================================================================
  // CF-T18: exported singleton
  // =========================================================================
  it('CF-T18: exports a singleton cloudflareProvider instance', async () => {
    const { cloudflareProvider } = await import('./cloudflare.js');
    expect(cloudflareProvider).toBeInstanceOf(CloudflareProvider);
    expect(cloudflareProvider.providerType).toBe('cloudflare');
  });
});
