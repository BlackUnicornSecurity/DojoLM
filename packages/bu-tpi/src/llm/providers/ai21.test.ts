/**
 * AI21 Provider Tests
 *
 * Tests for AI21Provider class covering initialization,
 * request building, response parsing, error handling, streaming,
 * config validation, cost estimation, and status checks.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { AI21Provider } from './ai21.js';
import { AuthenticationError } from '../errors.js';

vi.stubGlobal('fetch', vi.fn());

vi.mock('../fetch-utils.js', () => ({
  fetchWithTimeout: vi.fn(),
  sanitizeUrl: vi.fn((url: string) => url),
  measureDuration: vi.fn(() => 42),
}));

vi.mock('../security.js', () => ({
  validateProviderUrl: vi.fn(() => true),
}));

import { fetchWithTimeout } from '../fetch-utils.js';

const mockFetch = fetchWithTimeout as Mock;

function makeConfig(overrides = {}) {
  return {
    id: 'ai21-1',
    name: 'Jamba',
    provider: 'ai21' as const,
    model: 'jamba-1.5-large',
    apiKey: 'ai21-test-key-12345',
    enabled: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  };
}

function makeOptions(overrides = {}) {
  return {
    prompt: 'Hello AI21!',
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

describe('AI21Provider', () => {
  let provider: AI21Provider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AI21Provider();
  });

  // =========================================================================
  // AI21-T01: Initialization
  // =========================================================================
  it('AI21-T01: initializes with correct provider type and no streaming', () => {
    expect(provider.providerType).toBe('ai21');
    expect(provider.supportsStreaming).toBe(false);
  });

  // =========================================================================
  // AI21-T02: execute builds correct request
  // =========================================================================
  it('AI21-T02: execute sends correct request with Bearer auth header', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'Hi there!' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
    }));

    await provider.execute(makeConfig(), makeOptions());

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://api.ai21.com/studio/v1/chat/completions');
    expect(callArgs[1].headers['Authorization']).toBe('Bearer ai21-test-key-12345');
    expect(callArgs[1].headers['Content-Type']).toBe('application/json');
  });

  // =========================================================================
  // AI21-T03: execute parses response correctly
  // =========================================================================
  it('AI21-T03: parses choices and usage from AI21 response', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'Generated text' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }));

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Generated text');
    expect(result.promptTokens).toBe(10);
    expect(result.completionTokens).toBe(5);
    expect(result.totalTokens).toBe(15);
    expect(result.model).toBe('jamba-1.5-large');
    expect(result.durationMs).toBe(42);
  });

  // =========================================================================
  // AI21-T04: execute throws AuthenticationError when API key missing
  // =========================================================================
  it('AI21-T04: throws AuthenticationError when API key is missing', async () => {
    const config = makeConfig({ apiKey: undefined });

    await expect(provider.execute(config, makeOptions()))
      .rejects.toThrow(AuthenticationError);
  });

  // =========================================================================
  // AI21-T05: execute throws on error response
  // =========================================================================
  it('AI21-T05: throws on non-ok API response', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(401, 'Invalid API key'));

    await expect(provider.execute(makeConfig(), makeOptions()))
      .rejects.toThrow();
  });

  // =========================================================================
  // AI21-T06: execute includes system message
  // =========================================================================
  it('AI21-T06: includes system message in messages array', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
    }));

    await provider.execute(makeConfig(), makeOptions({ systemMessage: 'Be helpful.' }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'Be helpful.' });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello AI21!' });
  });

  // =========================================================================
  // AI21-T07: execute uses request options
  // =========================================================================
  it('AI21-T07: passes maxTokens, temperature, topP, and stopSequences', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }));

    await provider.execute(makeConfig(), makeOptions({
      maxTokens: 512,
      temperature: 0.3,
      topP: 0.9,
      stopSequences: ['STOP'],
    }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(512);
    expect(body.temperature).toBe(0.3);
    expect(body.top_p).toBe(0.9);
    expect(body.stop).toEqual(['STOP']);
  });

  // =========================================================================
  // AI21-T08: validateConfig
  // =========================================================================
  it('AI21-T08: validateConfig returns correct results', () => {
    expect(provider.validateConfig(makeConfig())).toBe(true);
    expect(provider.validateConfig(makeConfig({ model: '' }))).toBe(false);
    expect(provider.validateConfig(makeConfig({ apiKey: undefined }))).toBe(false);
    expect(provider.validateConfig(makeConfig({ model: '', apiKey: undefined }))).toBe(false);
  });

  // =========================================================================
  // AI21-T09: getMaxContext returns 256k
  // =========================================================================
  it('AI21-T09: getMaxContext returns 256000', () => {
    expect(provider.getMaxContext('jamba-1.5-large')).toBe(256_000);
    expect(provider.getMaxContext('any-model')).toBe(256_000);
  });

  // =========================================================================
  // AI21-T10: estimateCost calculates correctly
  // =========================================================================
  it('AI21-T10: estimateCost calculates with AI21 pricing formula', () => {
    // (1M * 2.00 + 1M * 8.00) / 1_000_000 = 10.00
    const cost = provider.estimateCost('jamba', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(10.0, 2);
  });

  // =========================================================================
  // AI21-T11: streamExecute emulates streaming
  // =========================================================================
  it('AI21-T11: streamExecute calls onChunk then done', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'streamed content' } }],
      usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
    }));

    const chunks: Array<{ delta: string; done: boolean }> = [];
    await provider.streamExecute(makeConfig(), makeOptions(), (chunk) => {
      chunks.push({ delta: chunk.delta, done: chunk.done });
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({ delta: 'streamed content', done: false });
    expect(chunks[1].done).toBe(true);
  });

  // =========================================================================
  // AI21-T12: testConnection
  // =========================================================================
  it('AI21-T12: testConnection returns true on ok response', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(true);
  });

  it('AI21-T13: testConnection returns false on error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(false);
  });

  // =========================================================================
  // AI21-T14: checkStatus
  // =========================================================================
  it('AI21-T14: checkStatus returns unavailable when test fails', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const status = await provider.checkStatus(makeConfig());
    expect(status).toBe('unavailable');
  });

  // =========================================================================
  // AI21-T15: custom base URL
  // =========================================================================
  it('AI21-T15: uses custom baseUrl from config', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }));

    await provider.execute(makeConfig({ baseUrl: 'https://proxy.example.com' }), makeOptions());

    expect(mockFetch.mock.calls[0][0]).toBe('https://proxy.example.com/chat/completions');
  });

  // =========================================================================
  // AI21-T16: handles empty response
  // =========================================================================
  it('AI21-T16: handles empty choices gracefully', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [],
      usage: {},
    }));

    const result = await provider.execute(makeConfig(), makeOptions());
    expect(result.text).toBe('');
    expect(result.promptTokens).toBe(0);
  });

  // =========================================================================
  // AI21-T17: exported singleton
  // =========================================================================
  it('AI21-T17: exports a singleton ai21Provider instance', async () => {
    const { ai21Provider } = await import('./ai21.js');
    expect(ai21Provider).toBeInstanceOf(AI21Provider);
    expect(ai21Provider.providerType).toBe('ai21');
  });
});
