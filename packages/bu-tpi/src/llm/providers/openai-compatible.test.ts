/**
 * OpenAI-Compatible Provider Tests
 *
 * Tests for OpenAICompatibleProvider class covering initialization,
 * request building, response parsing, error handling, API key validation,
 * timeout handling, streaming, context windows, cost estimation, and status checks.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import { AuthenticationError, RateLimitError, NetworkError } from '../errors.js';

vi.stubGlobal('fetch', vi.fn());

// Mock fetch-utils to control fetchWithTimeout behavior
vi.mock('../fetch-utils.js', () => ({
  fetchWithTimeout: vi.fn(),
  sanitizeUrl: vi.fn((url: string) => url),
  measureDuration: vi.fn(() => 42),
}));

vi.mock('../security.js', () => ({
  validateProviderUrl: vi.fn(() => true),
  sanitizeCredentials: vi.fn((v: unknown) => v),
}));

import { fetchWithTimeout } from '../fetch-utils.js';

const mockFetch = fetchWithTimeout as Mock;

function makeConfig(overrides = {}) {
  return {
    id: 'test-1',
    name: 'Test Model',
    provider: 'openai' as const,
    model: 'gpt-4o',
    apiKey: 'sk-test-key-12345',
    enabled: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  };
}

function makeOptions(overrides = {}) {
  return {
    prompt: 'Hello, world!',
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

describe('OpenAICompatibleProvider', () => {
  let provider: OpenAICompatibleProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenAICompatibleProvider('openai');
  });

  // =========================================================================
  // OAI-T01: Initialization
  // =========================================================================
  it('OAI-T01: initializes with correct provider type and defaults', () => {
    expect(provider.providerType).toBe('openai');
    expect(provider.supportsStreaming).toBe(false);
  });

  // =========================================================================
  // OAI-T02: Initialization with preset
  // =========================================================================
  it('OAI-T02: initializes with a provider preset overriding defaults', () => {
    const preset = {
      id: 'groq',
      name: 'Groq',
      tier: 2 as const,
      baseUrl: 'https://api.groq.com/openai/v1',
      authType: 'bearer' as const,
      defaultModels: ['llama-3.3-70b-versatile'],
      isOpenAICompatible: true,
    };
    const groqProvider = new OpenAICompatibleProvider('groq', preset);
    expect(groqProvider.providerType).toBe('groq');
  });

  // =========================================================================
  // OAI-T03: execute builds correct request and parses response
  // =========================================================================
  it('OAI-T03: execute sends correct request body and parses OpenAI response', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'Hello back!' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      model: 'gpt-4o',
    }));

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Hello back!');
    expect(result.promptTokens).toBe(10);
    expect(result.completionTokens).toBe(5);
    expect(result.totalTokens).toBe(15);
    expect(result.model).toBe('gpt-4o');
    expect(result.filtered).toBe(false);

    // Verify the URL used
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://api.openai.com/v1/chat/completions');
  });

  // =========================================================================
  // OAI-T04: execute includes system message
  // =========================================================================
  it('OAI-T04: execute includes system message in request body', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'response' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      model: 'gpt-4o',
    }));

    await provider.execute(makeConfig(), makeOptions({ systemMessage: 'You are helpful.' }));

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'You are helpful.' });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello, world!' });
  });

  // =========================================================================
  // OAI-T05: execute handles content_filter finish reason
  // =========================================================================
  it('OAI-T05: marks response as filtered when finish_reason is content_filter', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: '' }, finish_reason: 'content_filter' }],
      usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
      model: 'gpt-4o',
    }));

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.filtered).toBe(true);
    expect(result.filterReason).toBe('Content filtered by provider');
  });

  // =========================================================================
  // OAI-T06: execute throws on invalid config (missing API key)
  // =========================================================================
  it('OAI-T06: throws error when API key is missing for cloud provider', async () => {
    const config = makeConfig({ apiKey: undefined });

    await expect(provider.execute(config, makeOptions()))
      .rejects.toThrow('Invalid config for openai');
  });

  // =========================================================================
  // OAI-T07: execute throws on API error (401)
  // =========================================================================
  it('OAI-T07: throws AuthenticationError on 401 response', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(401, 'Unauthorized'));

    await expect(provider.execute(makeConfig(), makeOptions()))
      .rejects.toThrow(AuthenticationError);
  });

  // =========================================================================
  // OAI-T08: execute wraps unknown errors in NetworkError
  // =========================================================================
  it('OAI-T08: wraps unexpected errors in NetworkError', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));

    await expect(provider.execute(makeConfig(), makeOptions()))
      .rejects.toThrow(NetworkError);
  });

  // =========================================================================
  // OAI-T09: validateConfig returns false for empty model
  // =========================================================================
  it('OAI-T09: validateConfig returns false when model is empty', () => {
    const config = makeConfig({ model: '' });
    expect(provider.validateConfig(config)).toBe(false);
  });

  // =========================================================================
  // OAI-T10: validateConfig accepts local provider without API key
  // =========================================================================
  it('OAI-T10: validateConfig accepts local provider (ollama) without API key', () => {
    const localProvider = new OpenAICompatibleProvider('ollama');
    const config = makeConfig({ apiKey: undefined });
    expect(localProvider.validateConfig(config)).toBe(true);
  });

  // =========================================================================
  // OAI-T11: streamExecute throws not-supported error
  // =========================================================================
  it('OAI-T11: streamExecute throws not-supported error', async () => {
    await expect(provider.streamExecute(makeConfig(), makeOptions(), vi.fn()))
      .rejects.toThrow('Streaming not supported');
  });

  // =========================================================================
  // OAI-T12: getMaxContext returns known context window
  // =========================================================================
  it('OAI-T12: getMaxContext returns correct value for known models', () => {
    expect(provider.getMaxContext('gpt-4o')).toBe(128_000);
    expect(provider.getMaxContext('o1')).toBe(200_000);
    expect(provider.getMaxContext('gpt-3.5-turbo')).toBe(16_385);
  });

  // =========================================================================
  // OAI-T13: getMaxContext returns default for unknown models
  // =========================================================================
  it('OAI-T13: getMaxContext returns default 32768 for unknown model', () => {
    expect(provider.getMaxContext('unknown-model-xyz')).toBe(32_768);
  });

  // =========================================================================
  // OAI-T14: estimateCost returns 0 for local providers
  // =========================================================================
  it('OAI-T14: estimateCost returns 0 for local providers', () => {
    const ollamaProvider = new OpenAICompatibleProvider('ollama');
    expect(ollamaProvider.estimateCost('llama3.2', 1000, 500)).toBe(0);
  });

  // =========================================================================
  // OAI-T15: estimateCost calculates for cloud providers
  // =========================================================================
  it('OAI-T15: estimateCost calculates cost for cloud providers', () => {
    const cost = provider.estimateCost('gpt-4o', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(12.50, 2);
  });

  // =========================================================================
  // OAI-T16: testConnection returns true on ok response
  // =========================================================================
  it('OAI-T16: testConnection returns true when models endpoint responds ok', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(true);
  });

  // =========================================================================
  // OAI-T17: testConnection returns false on failure
  // =========================================================================
  it('OAI-T17: testConnection returns false on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(false);
  });

  // =========================================================================
  // OAI-T18: checkStatus returns available/unavailable
  // =========================================================================
  it('OAI-T18: checkStatus returns available when test connection succeeds', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const status = await provider.checkStatus!(makeConfig());
    expect(status).toBe('available');
  });

  // =========================================================================
  // OAI-T19: builds auth headers with Bearer by default
  // =========================================================================
  it('OAI-T19: builds Authorization Bearer header by default', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      model: 'gpt-4o',
    }));

    await provider.execute(makeConfig(), makeOptions());

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers['Authorization']).toBe('Bearer sk-test-key-12345');
  });

  // =========================================================================
  // OAI-T20: builds api-key-header auth when preset specifies it
  // =========================================================================
  it('OAI-T20: uses api-key-header auth type from preset', async () => {
    const preset = {
      id: 'custom',
      name: 'Custom',
      tier: 3 as const,
      baseUrl: 'https://custom.api.com/v1',
      authType: 'api-key-header' as const,
      authHeaderName: 'X-Api-Key',
      defaultModels: ['model-1'],
      isOpenAICompatible: true,
    };
    const customProvider = new OpenAICompatibleProvider('custom', preset);

    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      model: 'model-1',
    }));

    await customProvider.execute(
      makeConfig({ provider: 'custom', model: 'model-1' }),
      makeOptions(),
    );

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers['X-Api-Key']).toBe('sk-test-key-12345');
  });

  // =========================================================================
  // OAI-T21: handles optional request params (topP, stopSequences)
  // =========================================================================
  it('OAI-T21: includes topP and stopSequences in request body when provided', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      model: 'gpt-4o',
    }));

    await provider.execute(makeConfig(), makeOptions({
      topP: 0.9,
      stopSequences: ['END', 'STOP'],
    }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.top_p).toBe(0.9);
    expect(body.stop).toEqual(['END', 'STOP']);
  });

  // =========================================================================
  // OAI-T22: handles empty choices in response gracefully
  // =========================================================================
  it('OAI-T22: returns empty text when response has no choices', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      choices: [],
      usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
      model: 'gpt-4o',
    }));

    const result = await provider.execute(makeConfig(), makeOptions());
    expect(result.text).toBe('');
  });
});
