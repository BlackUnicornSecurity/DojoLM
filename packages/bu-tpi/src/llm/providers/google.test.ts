/**
 * Google Gemini Provider Tests
 *
 * Tests for GoogleProvider class covering initialization,
 * request building, response parsing, error handling, API key validation,
 * query-param auth, API key redaction, context windows, cost estimation,
 * and status checks.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { GoogleProvider } from './google.js';
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
    id: 'google-1',
    name: 'Gemini Flash',
    provider: 'google' as const,
    model: 'gemini-2.0-flash',
    apiKey: 'AIza-test-key-abcdefghijklmnopqr',
    enabled: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  };
}

function makeOptions(overrides = {}) {
  return {
    prompt: 'Hello Gemini!',
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

describe('GoogleProvider', () => {
  let provider: GoogleProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GoogleProvider();
  });

  // =========================================================================
  // GOO-T01: Initialization
  // =========================================================================
  it('GOO-T01: initializes with correct provider type and streaming support', () => {
    expect(provider.providerType).toBe('google');
    expect(provider.supportsStreaming).toBe(true);
  });

  // =========================================================================
  // GOO-T02: execute builds correct Google API URL with query-param auth
  // =========================================================================
  it('GOO-T02: execute uses query param auth with model in URL path', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      candidates: [{ content: { parts: [{ text: 'Hi!' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2, totalTokenCount: 7 },
    }));

    await provider.execute(makeConfig(), makeOptions());

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/models/gemini-2.0-flash:generateContent');
    expect(url).toContain('key=AIza-test-key-abcdefghijklmnopqr');
  });

  // =========================================================================
  // GOO-T03: execute parses Google candidates response
  // =========================================================================
  it('GOO-T03: parses candidates, usage metadata from Google response', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      candidates: [{
        content: { parts: [{ text: 'Part1' }, { text: 'Part2' }] },
        finishReason: 'STOP',
      }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 8, totalTokenCount: 18 },
    }));

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Part1Part2');
    expect(result.promptTokens).toBe(10);
    expect(result.completionTokens).toBe(8);
    expect(result.totalTokens).toBe(18);
    expect(result.filtered).toBe(false);
  });

  // =========================================================================
  // GOO-T04: execute handles SAFETY finish reason
  // =========================================================================
  it('GOO-T04: marks response as filtered when finishReason is SAFETY', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      candidates: [{ content: { parts: [] }, finishReason: 'SAFETY' }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 0, totalTokenCount: 5 },
    }));

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.filtered).toBe(true);
    expect(result.filterReason).toBe('Content filtered by Google Safety');
  });

  // =========================================================================
  // GOO-T05: execute throws AuthenticationError when API key missing
  // =========================================================================
  it('GOO-T05: throws AuthenticationError when API key is missing', async () => {
    await expect(provider.execute(makeConfig({ apiKey: undefined }), makeOptions()))
      .rejects.toThrow(AuthenticationError);
  });

  // =========================================================================
  // GOO-T06: execute includes system message as conversation context
  // =========================================================================
  it('GOO-T06: includes system message as user/model exchange in contents', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      candidates: [{ content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1, totalTokenCount: 6 },
    }));

    await provider.execute(makeConfig(), makeOptions({ systemMessage: 'Be brief.' }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.contents).toHaveLength(3);
    expect(body.contents[0]).toEqual({ role: 'user', parts: [{ text: 'Be brief.' }] });
    expect(body.contents[1]).toEqual({ role: 'model', parts: [{ text: 'Understood.' }] });
    expect(body.contents[2].role).toBe('user');
  });

  // =========================================================================
  // GOO-T07: execute redacts API key from error messages
  // =========================================================================
  it('GOO-T07: redacts API key in error messages to prevent leaks', async () => {
    const apiKey = 'AIza-test-key-abcdefghijklmnopqr';
    const errorMsg = `Network error connecting to https://api.google.com?key=${apiKey}`;
    mockFetch.mockRejectedValue(new Error(errorMsg));

    try {
      await provider.execute(makeConfig(), makeOptions());
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      const error = err as Error;
      expect(error.message).not.toContain(apiKey);
      expect(error.message).toContain('[REDACTED]');
    }
  });

  // =========================================================================
  // GOO-T08: validateConfig rejects empty model
  // =========================================================================
  it('GOO-T08: validateConfig returns false for empty model or missing key', () => {
    expect(provider.validateConfig(makeConfig())).toBe(true);
    expect(provider.validateConfig(makeConfig({ model: '' }))).toBe(false);
    expect(provider.validateConfig(makeConfig({ apiKey: undefined }))).toBe(false);
  });

  // =========================================================================
  // GOO-T09: getMaxContext returns known values and default
  // =========================================================================
  it('GOO-T09: getMaxContext returns correct values for known and unknown models', () => {
    expect(provider.getMaxContext('gemini-2.0-flash')).toBe(1_048_576);
    expect(provider.getMaxContext('gemini-2.0-pro')).toBe(2_097_152);
    expect(provider.getMaxContext('unknown-model')).toBe(32_768);
  });

  // =========================================================================
  // GOO-T10: estimateCost calculates correctly
  // =========================================================================
  it('GOO-T10: estimateCost calculates with Google pricing', () => {
    // 1M input at $0.075 + 1M output at $0.30 = $0.375
    const cost = provider.estimateCost('gemini-2.0-flash', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.375, 3);
  });

  // =========================================================================
  // GOO-T11: testConnection uses models endpoint with query param auth
  // =========================================================================
  it('GOO-T11: testConnection calls models endpoint with API key in query', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const result = await provider.testConnection(makeConfig());

    expect(result).toBe(true);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/models?key=');
  });

  // =========================================================================
  // GOO-T12: testConnection returns false on error
  // =========================================================================
  it('GOO-T12: testConnection returns false on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('timeout'));
    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(false);
  });

  // =========================================================================
  // GOO-T13: checkStatus maps testConnection results
  // =========================================================================
  it('GOO-T13: checkStatus returns available or unavailable based on connection', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    expect(await provider.checkStatus!(makeConfig())).toBe('available');

    mockFetch.mockResolvedValue({ ok: false });
    expect(await provider.checkStatus!(makeConfig())).toBe('unavailable');
  });

  // =========================================================================
  // GOO-T14: streamExecute delegates to execute and emits chunks
  // =========================================================================
  it('GOO-T14: streamExecute calls onChunk for each word then done', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      candidates: [{ content: { parts: [{ text: 'alpha beta' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2, totalTokenCount: 5 },
    }));

    const chunks: Array<{ delta: string; done: boolean }> = [];
    await provider.streamExecute(makeConfig(), makeOptions(), (chunk) => {
      chunks.push({ delta: chunk.delta, done: chunk.done });
    });

    expect(chunks).toHaveLength(3); // 2 words + done
    expect(chunks[0].delta).toBe('alpha ');
    expect(chunks[2].done).toBe(true);
  });

  // =========================================================================
  // GOO-T15: execute encodes model name to prevent path injection
  // =========================================================================
  it('GOO-T15: URL-encodes model name to prevent path injection', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({
      candidates: [{ content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
    }));

    await provider.execute(
      makeConfig({ model: '../../../etc/passwd' }),
      makeOptions(),
    );

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain(encodeURIComponent('../../../etc/passwd'));
    expect(url).not.toContain('../../../etc/passwd:generateContent');
  });

  // =========================================================================
  // GOO-T16: exported singleton instance
  // =========================================================================
  it('GOO-T16: exports a singleton googleProvider instance', async () => {
    const { googleProvider } = await import('./google.js');
    expect(googleProvider).toBeInstanceOf(GoogleProvider);
  });
});
