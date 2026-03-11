/**
 * Cohere Provider Tests
 *
 * Tests for CohereProvider class covering initialization,
 * request building, response parsing, error handling, API key validation,
 * chat API format, cost estimation, and status checks.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { CohereProvider } from './cohere.js';
import { AuthenticationError } from '../errors.js';

vi.stubGlobal('fetch', vi.fn());

vi.mock('../fetch-utils.js', () => ({
  fetchWithTimeout: vi.fn(),
  sanitizeUrl: vi.fn((url: string) => url),
  measureDuration: vi.fn(() => 27),
}));

vi.mock('../security.js', () => ({
  validateProviderUrl: vi.fn(() => true),
}));

import { fetchWithTimeout } from '../fetch-utils.js';

const mockFetch = fetchWithTimeout as Mock;

function makeConfig(overrides = {}) {
  return {
    id: 'cohere-1',
    name: 'Command R+',
    provider: 'cohere' as const,
    model: 'command-r-plus',
    apiKey: 'cohere-test-key-12345',
    enabled: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  };
}

function makeOptions(overrides = {}) {
  return {
    prompt: 'Hello Cohere!',
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

describe('CohereProvider', () => {
  let provider: CohereProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new CohereProvider();
  });

  // =========================================================================
  // COH-T01: Initialization
  // =========================================================================
  it('COH-T01: initializes with correct provider type and streaming support', () => {
    expect(provider.providerType).toBe('cohere');
    expect(provider.supportsStreaming).toBe(true);
  });

  // =========================================================================
  // COH-T02: execute builds correct Cohere chat request
  // =========================================================================
  it('COH-T02: execute sends request to /chat endpoint with Bearer auth', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      text: 'Hello back!',
      token_count: { prompt_tokens: 5, response_tokens: 3, total_tokens: 8 },
    }));

    await provider.execute(makeConfig(), makeOptions());

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://api.cohere.com/v1/chat');
    expect(callArgs[1].headers['Authorization']).toBe('Bearer cohere-test-key-12345');
  });

  // =========================================================================
  // COH-T03: execute parses Cohere response format
  // =========================================================================
  it('COH-T03: parses text and token_count from Cohere response', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      text: 'Response text here',
      token_count: { prompt_tokens: 12, response_tokens: 7, total_tokens: 19 },
    }));

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Response text here');
    expect(result.promptTokens).toBe(12);
    expect(result.completionTokens).toBe(7);
    expect(result.totalTokens).toBe(19);
    expect(result.model).toBe('command-r-plus');
  });

  // =========================================================================
  // COH-T04: execute uses "message" field (not "messages" array)
  // =========================================================================
  it('COH-T04: sends prompt as "message" field in Cohere native format', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      text: 'ok',
      token_count: { prompt_tokens: 1, response_tokens: 1, total_tokens: 2 },
    }));

    await provider.execute(makeConfig(), makeOptions({ prompt: 'Test prompt' }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.message).toBe('Test prompt');
    expect(body.model).toBe('command-r-plus');
    expect(body.messages).toBeUndefined();
  });

  // =========================================================================
  // COH-T05: execute includes system message as preamble
  // =========================================================================
  it('COH-T05: includes system message as "preamble" field', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      text: 'ok',
      token_count: { prompt_tokens: 3, response_tokens: 1, total_tokens: 4 },
    }));

    await provider.execute(makeConfig(), makeOptions({ systemMessage: 'Be concise.' }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.preamble).toBe('Be concise.');
  });

  // =========================================================================
  // COH-T06: execute throws AuthenticationError when API key missing
  // =========================================================================
  it('COH-T06: throws AuthenticationError when API key is missing', async () => {
    await expect(provider.execute(makeConfig({ apiKey: undefined }), makeOptions()))
      .rejects.toThrow(AuthenticationError);
  });

  // =========================================================================
  // COH-T07: execute throws on 401 API response
  // =========================================================================
  it('COH-T07: throws on 401 unauthorized response', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(401, 'Invalid API key'));

    await expect(provider.execute(makeConfig(), makeOptions()))
      .rejects.toThrow(AuthenticationError);
  });

  // =========================================================================
  // COH-T08: validateConfig checks model and apiKey
  // =========================================================================
  it('COH-T08: validateConfig returns correct results', () => {
    expect(provider.validateConfig(makeConfig())).toBe(true);
    expect(provider.validateConfig(makeConfig({ model: '' }))).toBe(false);
    expect(provider.validateConfig(makeConfig({ apiKey: undefined }))).toBe(false);
    expect(provider.validateConfig(makeConfig({ apiKey: '' }))).toBe(false);
  });

  // =========================================================================
  // COH-T09: getMaxContext returns 128k for all models
  // =========================================================================
  it('COH-T09: getMaxContext returns 128000 for all models', () => {
    expect(provider.getMaxContext('command-r-plus')).toBe(128_000);
    expect(provider.getMaxContext('command-r')).toBe(128_000);
    expect(provider.getMaxContext('anything')).toBe(128_000);
  });

  // =========================================================================
  // COH-T10: estimateCost calculates correctly
  // =========================================================================
  it('COH-T10: estimateCost calculates with Cohere pricing', () => {
    // 1M input at $0.15 + 1M output at $0.60 = $0.75
    const cost = provider.estimateCost('command-r-plus', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.75, 3);
  });

  // =========================================================================
  // COH-T11: testConnection calls models endpoint
  // =========================================================================
  it('COH-T11: testConnection calls /models with Bearer auth', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const result = await provider.testConnection(makeConfig());

    expect(result).toBe(true);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://api.cohere.com/v1/models');
    expect(callArgs[1].headers['Authorization']).toBe('Bearer cohere-test-key-12345');
  });

  // =========================================================================
  // COH-T12: testConnection returns false on failure
  // =========================================================================
  it('COH-T12: testConnection returns false on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(false);
  });

  // =========================================================================
  // COH-T13: checkStatus maps connection result
  // =========================================================================
  it('COH-T13: checkStatus returns available or unavailable', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    expect(await provider.checkStatus!(makeConfig())).toBe('available');

    mockFetch.mockResolvedValue({ ok: false });
    expect(await provider.checkStatus!(makeConfig())).toBe('unavailable');
  });

  // =========================================================================
  // COH-T14: streamExecute emits full text then done
  // =========================================================================
  it('COH-T14: streamExecute emits full text as single chunk then done', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      text: 'Full response text',
      token_count: { prompt_tokens: 5, response_tokens: 3, total_tokens: 8 },
    }));

    const chunks: Array<{ delta: string; done: boolean }> = [];
    await provider.streamExecute(makeConfig(), makeOptions(), (chunk) => {
      chunks.push({ delta: chunk.delta, done: chunk.done });
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0].delta).toBe('Full response text');
    expect(chunks[0].done).toBe(false);
    expect(chunks[1].done).toBe(true);
  });

  // =========================================================================
  // COH-T15: execute includes topP as "p" parameter
  // =========================================================================
  it('COH-T15: maps topP to "p" and stopSequences to "stop_sequences"', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      text: 'ok',
      token_count: { prompt_tokens: 1, response_tokens: 1, total_tokens: 2 },
    }));

    await provider.execute(makeConfig(), makeOptions({
      topP: 0.8,
      stopSequences: ['END'],
    }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.p).toBe(0.8);
    expect(body.stop_sequences).toEqual(['END']);
  });

  // =========================================================================
  // COH-T16: exported singleton instance
  // =========================================================================
  it('COH-T16: exports a singleton cohereProvider instance', async () => {
    const { cohereProvider } = await import('./cohere.js');
    expect(cohereProvider).toBeInstanceOf(CohereProvider);
  });
});
