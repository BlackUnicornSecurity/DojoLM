/**
 * Anthropic Provider Tests
 *
 * Tests for AnthropicProvider class covering initialization,
 * request building, response parsing, error handling, API key validation,
 * timeout handling, streaming, cost estimation, and status checks.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { AnthropicProvider } from './anthropic.js';
import { AuthenticationError } from '../errors.js';

vi.stubGlobal('fetch', vi.fn());

vi.mock('../fetch-utils.js', () => ({
  fetchWithTimeout: vi.fn(),
  sanitizeUrl: vi.fn((url: string) => url),
  measureDuration: vi.fn(() => 55),
}));

vi.mock('../security.js', () => ({
  validateProviderUrl: vi.fn(() => true),
}));

import { fetchWithTimeout } from '../fetch-utils.js';

const mockFetch = fetchWithTimeout as Mock;

function makeConfig(overrides = {}) {
  return {
    id: 'anth-1',
    name: 'Claude Sonnet',
    provider: 'anthropic' as const,
    model: 'claude-3-5-sonnet-20241022',
    apiKey: 'sk-ant-test-key-12345',
    enabled: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  };
}

function makeOptions(overrides = {}) {
  return {
    prompt: 'Hello Claude!',
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

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AnthropicProvider();
  });

  // =========================================================================
  // ANT-T01: Initialization
  // =========================================================================
  it('ANT-T01: initializes with correct provider type and streaming support', () => {
    expect(provider.providerType).toBe('anthropic');
    expect(provider.supportsStreaming).toBe(true);
  });

  // =========================================================================
  // ANT-T02: execute builds correct Anthropic request format
  // =========================================================================
  it('ANT-T02: execute sends correct request with x-api-key and anthropic-version headers', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      content: [{ type: 'text', text: 'Hello!' }],
      usage: { input_tokens: 8, output_tokens: 3 },
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'end_turn',
    }));

    await provider.execute(makeConfig(), makeOptions());

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://api.anthropic.com/v1/messages');
    expect(callArgs[1].headers['x-api-key']).toBe('sk-ant-test-key-12345');
    expect(callArgs[1].headers['anthropic-version']).toBe('2023-06-01');
  });

  // =========================================================================
  // ANT-T03: execute parses Anthropic content block response
  // =========================================================================
  it('ANT-T03: parses content blocks and usage from Anthropic response', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'world!' },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'end_turn',
    }));

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Hello world!');
    expect(result.promptTokens).toBe(10);
    expect(result.completionTokens).toBe(5);
    expect(result.totalTokens).toBe(15);
    expect(result.filtered).toBe(false);
  });

  // =========================================================================
  // ANT-T04: execute handles content_filtered stop reason
  // =========================================================================
  it('ANT-T04: marks response as filtered when stop_reason is content_filtered', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      content: [],
      usage: { input_tokens: 10, output_tokens: 0 },
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'content_filtered',
    }));

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.filtered).toBe(true);
    expect(result.filterReason).toBe('Content filtered by Anthropic');
  });

  // =========================================================================
  // ANT-T05: execute throws AuthenticationError when API key missing
  // =========================================================================
  it('ANT-T05: throws AuthenticationError when API key is missing', async () => {
    const config = makeConfig({ apiKey: undefined });

    await expect(provider.execute(config, makeOptions()))
      .rejects.toThrow(AuthenticationError);
  });

  // =========================================================================
  // ANT-T06: execute throws on 401 response
  // =========================================================================
  it('ANT-T06: throws AuthenticationError on 401 API response', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(401, 'Invalid API key'));

    await expect(provider.execute(makeConfig(), makeOptions()))
      .rejects.toThrow(AuthenticationError);
  });

  // =========================================================================
  // ANT-T07: execute includes system message as top-level field
  // =========================================================================
  it('ANT-T07: includes system message as top-level system field in request', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 5, output_tokens: 1 },
      model: 'claude-3-5-sonnet-20241022',
    }));

    await provider.execute(makeConfig(), makeOptions({ systemMessage: 'Be concise.' }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.system).toBe('Be concise.');
    // Messages should only have user message, not system
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
  });

  // =========================================================================
  // ANT-T08: validateConfig returns correct results
  // =========================================================================
  it('ANT-T08: validateConfig returns false for missing model or API key', () => {
    expect(provider.validateConfig(makeConfig())).toBe(true);
    expect(provider.validateConfig(makeConfig({ model: '' }))).toBe(false);
    expect(provider.validateConfig(makeConfig({ apiKey: undefined }))).toBe(false);
  });

  // =========================================================================
  // ANT-T09: getMaxContext returns 200k for all models
  // =========================================================================
  it('ANT-T09: getMaxContext returns 200000 for any model', () => {
    expect(provider.getMaxContext('claude-3-5-sonnet-20241022')).toBe(200_000);
    expect(provider.getMaxContext('some-future-model')).toBe(200_000);
  });

  // =========================================================================
  // ANT-T10: estimateCost calculates correctly
  // =========================================================================
  it('ANT-T10: estimateCost calculates with Anthropic pricing', () => {
    // 1M input tokens at $3.00 + 1M output tokens at $15.00 = $18.00
    const cost = provider.estimateCost('claude-3-5-sonnet', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(18.0, 2);
  });

  // =========================================================================
  // ANT-T11: testConnection returns true on success
  // =========================================================================
  it('ANT-T11: testConnection returns true when API responds ok', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(true);
  });

  // =========================================================================
  // ANT-T12: testConnection returns false on failure
  // =========================================================================
  it('ANT-T12: testConnection returns false on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(false);
  });

  // =========================================================================
  // ANT-T13: checkStatus maps test connection result
  // =========================================================================
  it('ANT-T13: checkStatus returns unavailable when testConnection fails', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const status = await provider.checkStatus!(makeConfig());
    expect(status).toBe('unavailable');
  });

  // =========================================================================
  // ANT-T14: streamExecute calls onChunk with words
  // =========================================================================
  it('ANT-T14: streamExecute calls onChunk for each word then done', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      content: [{ type: 'text', text: 'one two three' }],
      usage: { input_tokens: 5, output_tokens: 3 },
      model: 'claude-3-5-sonnet-20241022',
    }));

    const chunks: Array<{ delta: string; done: boolean }> = [];
    await provider.streamExecute(makeConfig(), makeOptions(), (chunk) => {
      chunks.push({ delta: chunk.delta, done: chunk.done });
    });

    // 3 word chunks + 1 done chunk
    expect(chunks).toHaveLength(4);
    expect(chunks[0].delta).toBe('one ');
    expect(chunks[3].done).toBe(true);
  });

  // =========================================================================
  // ANT-T15: execute uses custom base URL
  // =========================================================================
  it('ANT-T15: execute uses custom baseUrl from config', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 1, output_tokens: 1 },
      model: 'claude-3-5-sonnet-20241022',
    }));

    await provider.execute(
      makeConfig({ baseUrl: 'https://proxy.example.com' }),
      makeOptions(),
    );

    expect(mockFetch.mock.calls[0][0]).toBe('https://proxy.example.com/v1/messages');
  });

  // =========================================================================
  // ANT-T16: exported singleton instance
  // =========================================================================
  it('ANT-T16: exports a singleton anthropicProvider instance', async () => {
    const { anthropicProvider } = await import('./anthropic.js');
    expect(anthropicProvider).toBeInstanceOf(AnthropicProvider);
    expect(anthropicProvider.providerType).toBe('anthropic');
  });
});
