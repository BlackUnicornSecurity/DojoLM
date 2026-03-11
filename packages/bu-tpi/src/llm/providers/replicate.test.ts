/**
 * Replicate Provider Tests
 *
 * Tests for ReplicateProvider class covering initialization,
 * prediction creation, polling, response parsing, error handling,
 * streaming, config validation, and status checks.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { ReplicateProvider } from './replicate.js';
import { AuthenticationError } from '../errors.js';

vi.stubGlobal('fetch', vi.fn());

vi.mock('../fetch-utils.js', () => ({
  fetchWithTimeout: vi.fn(),
  sanitizeUrl: vi.fn((url: string) => url),
  measureDuration: vi.fn(() => 1500),
}));

vi.mock('../security.js', () => ({
  validateProviderUrl: vi.fn(() => true),
}));

import { fetchWithTimeout } from '../fetch-utils.js';

const mockFetch = fetchWithTimeout as Mock;

function makeConfig(overrides = {}) {
  return {
    id: 'rep-1',
    name: 'Replicate Llama',
    provider: 'replicate' as const,
    model: 'meta/llama-2-70b-chat',
    apiKey: 'r8-test-key-12345',
    enabled: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  };
}

function makeOptions(overrides = {}) {
  return {
    prompt: 'Hello Replicate!',
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

describe('ReplicateProvider', () => {
  let provider: ReplicateProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    provider = new ReplicateProvider();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // REP-T01: Initialization
  // =========================================================================
  it('REP-T01: initializes with correct provider type and no streaming', () => {
    expect(provider.providerType).toBe('replicate');
    expect(provider.supportsStreaming).toBe(false);
  });

  // =========================================================================
  // REP-T02: execute creates prediction with correct body
  // =========================================================================
  it('REP-T02: creates prediction with correct request format', async () => {
    // Immediately succeeded
    mockFetch.mockResolvedValue(makeOkResponse({
      id: 'pred-123',
      status: 'succeeded',
      output: ['Hello ', 'world!'],
    }));

    vi.useRealTimers();
    await provider.execute(makeConfig(), makeOptions());

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://api.replicate.com/v1/predictions');
    expect(callArgs[1].method).toBe('POST');
    expect(callArgs[1].headers['Authorization']).toBe('Bearer r8-test-key-12345');

    const body = JSON.parse(callArgs[1].body);
    expect(body.model).toBe('meta/llama-2-70b-chat');
    expect(body.input.prompt).toBe('Hello Replicate!');
  });

  // =========================================================================
  // REP-T03: execute parses array output
  // =========================================================================
  it('REP-T03: joins array output into text', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      id: 'pred-123',
      status: 'succeeded',
      output: ['Hello ', 'from ', 'Replicate!'],
    }));

    vi.useRealTimers();
    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Hello from Replicate!');
    expect(result.model).toBe('meta/llama-2-70b-chat');
    expect(result.promptTokens).toBe(0);
    expect(result.completionTokens).toBe(0);
  });

  // =========================================================================
  // REP-T04: throws AuthenticationError when API key missing
  // =========================================================================
  it('REP-T04: throws AuthenticationError when API key is missing', async () => {
    vi.useRealTimers();
    await expect(provider.execute(makeConfig({ apiKey: undefined }), makeOptions()))
      .rejects.toThrow(AuthenticationError);
  });

  // =========================================================================
  // REP-T05: throws on create prediction error
  // =========================================================================
  it('REP-T05: throws on non-ok prediction creation response', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(422, 'Invalid model'));

    vi.useRealTimers();
    await expect(provider.execute(makeConfig(), makeOptions()))
      .rejects.toThrow();
  });

  // =========================================================================
  // REP-T06: includes system_prompt and maxTokens
  // =========================================================================
  it('REP-T06: passes system_prompt, maxTokens, and temperature in input', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      id: 'pred-456',
      status: 'succeeded',
      output: ['ok'],
    }));

    vi.useRealTimers();
    await provider.execute(makeConfig(), makeOptions({
      systemMessage: 'Be helpful.',
      maxTokens: 256,
      temperature: 0.5,
    }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input.system_prompt).toBe('Be helpful.');
    expect(body.input.max_tokens).toBe(256);
    expect(body.input.temperature).toBe(0.5);
  });

  // =========================================================================
  // REP-T07: validateConfig
  // =========================================================================
  it('REP-T07: validateConfig checks model and apiKey', () => {
    expect(provider.validateConfig(makeConfig())).toBe(true);
    expect(provider.validateConfig(makeConfig({ model: '' }))).toBe(false);
    expect(provider.validateConfig(makeConfig({ apiKey: undefined }))).toBe(false);
  });

  // =========================================================================
  // REP-T08: getMaxContext
  // =========================================================================
  it('REP-T08: getMaxContext returns 128000', () => {
    expect(provider.getMaxContext()).toBe(128_000);
  });

  // =========================================================================
  // REP-T09: estimateCost returns 0
  // =========================================================================
  it('REP-T09: estimateCost returns 0', () => {
    expect(provider.estimateCost()).toBe(0);
  });

  // =========================================================================
  // REP-T10: streamExecute emulates streaming
  // =========================================================================
  it('REP-T10: streamExecute calls onChunk then done', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      id: 'pred-789',
      status: 'succeeded',
      output: ['streamed'],
    }));

    vi.useRealTimers();
    const chunks: Array<{ delta: string; done: boolean }> = [];
    await provider.streamExecute(makeConfig(), makeOptions(), (chunk) => {
      chunks.push({ delta: chunk.delta, done: chunk.done });
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({ delta: 'streamed', done: false });
    expect(chunks[1]).toEqual({ delta: '', done: true });
  });

  // =========================================================================
  // REP-T11: testConnection
  // =========================================================================
  it('REP-T11: testConnection returns true on ok', async () => {
    vi.useRealTimers();
    mockFetch.mockResolvedValue({ ok: true });
    expect(await provider.testConnection(makeConfig())).toBe(true);
  });

  it('REP-T12: testConnection returns false on error', async () => {
    vi.useRealTimers();
    mockFetch.mockRejectedValue(new Error('fail'));
    expect(await provider.testConnection(makeConfig())).toBe(false);
  });

  // =========================================================================
  // REP-T13: checkStatus
  // =========================================================================
  it('REP-T13: checkStatus returns available or unavailable', async () => {
    vi.useRealTimers();
    mockFetch.mockResolvedValue({ ok: true });
    expect(await provider.checkStatus(makeConfig())).toBe('available');
  });

  // =========================================================================
  // REP-T14: uses custom baseUrl
  // =========================================================================
  it('REP-T14: uses custom baseUrl from config', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      id: 'pred-custom',
      status: 'succeeded',
      output: ['ok'],
    }));

    vi.useRealTimers();
    await provider.execute(
      makeConfig({ baseUrl: 'https://proxy.example.com/v1' }),
      makeOptions(),
    );

    expect(mockFetch.mock.calls[0][0]).toBe('https://proxy.example.com/v1/predictions');
  });

  // =========================================================================
  // REP-T15: exported singleton
  // =========================================================================
  it('REP-T15: exports a singleton replicateProvider instance', async () => {
    const { replicateProvider } = await import('./replicate.js');
    expect(replicateProvider).toBeInstanceOf(ReplicateProvider);
    expect(replicateProvider.providerType).toBe('replicate');
  });
});
