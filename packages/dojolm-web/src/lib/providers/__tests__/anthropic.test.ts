/**
 * File: providers/__tests__/anthropic.test.ts
 * Purpose: Unit tests for AnthropicProvider adapter
 *
 * Test IDs: ANTH-001 through ANTH-012
 *
 * Index:
 * - validateConfig tests (ANTH-001..003)
 * - testConnection tests (ANTH-004..005)
 * - execute tests (ANTH-006..010)
 * - estimateCost tests (ANTH-011..012)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicProvider } from '../anthropic';
import {
  AuthenticationError,
  ValidationError,
  RateLimitError,
  NetworkError,
} from '../errors';
import type { LLMModelConfig } from '../../llm-types';
import type { ProviderRequestOptions } from '../../llm-providers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Valid Anthropic key format: sk-ant-[32-95 alphanumeric/underscore/dash chars]
const VALID_API_KEY = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTU';

function makeConfig(overrides: Partial<LLMModelConfig> = {}): LLMModelConfig {
  return {
    id: 'anthropic-test',
    name: 'Anthropic Test',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: VALID_API_KEY,
    enabled: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as LLMModelConfig;
}

function makeOptions(overrides: Partial<ProviderRequestOptions> = {}): ProviderRequestOptions {
  return {
    prompt: 'Hello, Claude!',
    maxTokens: 256,
    ...overrides,
  };
}

function makeAnthropicResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg_anthropic-test',
    type: 'message',
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: 'Hello from Claude!' }],
    usage: {
      input_tokens: 15,
      output_tokens: 6,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let provider: AnthropicProvider;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  provider = new AnthropicProvider();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// validateConfig
// ---------------------------------------------------------------------------

describe('AnthropicProvider.validateConfig', () => {
  it('ANTH-001: returns true for a valid config', () => {
    expect(provider.validateConfig(makeConfig())).toBe(true);
  });

  it('ANTH-002: throws AuthenticationError when apiKey is missing', () => {
    expect(() =>
      provider.validateConfig(makeConfig({ apiKey: undefined }))
    ).toThrow(AuthenticationError);
  });

  it('ANTH-003: throws ValidationError when model is empty', () => {
    expect(() =>
      provider.validateConfig(makeConfig({ model: '' }))
    ).toThrow(ValidationError);
  });

  it('ANTH-003b: throws ValidationError for malformed API key (wrong prefix)', () => {
    expect(() =>
      provider.validateConfig(makeConfig({ apiKey: 'not-a-valid-anthropic-key' }))
    ).toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// testConnection
// ---------------------------------------------------------------------------

describe('AnthropicProvider.testConnection', () => {
  it('ANTH-004: returns true when execute succeeds', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeAnthropicResponse(),
    });

    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(true);
  });

  it('ANTH-005: returns false when execute throws (e.g. 401 auth failure)', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// execute
// ---------------------------------------------------------------------------

describe('AnthropicProvider.execute', () => {
  it('ANTH-006: returns ProviderResponse on successful message', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeAnthropicResponse(),
    });

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Hello from Claude!');
    expect(result.promptTokens).toBe(15);
    expect(result.completionTokens).toBe(6);
    expect(result.totalTokens).toBe(21);
    expect(result.filtered).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('ANTH-007: returns filtered=true when stop_reason is content_filtered', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        makeAnthropicResponse({
          stop_reason: 'content_filtered',
          content: [],
        }),
    });

    const result = await provider.execute(makeConfig(), makeOptions());
    expect(result.filtered).toBe(true);
    expect(result.text).toBe('');
  });

  it('ANTH-008: throws RateLimitError on 429 response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    });

    await expect(provider.execute(makeConfig(), makeOptions())).rejects.toThrow(RateLimitError);
  });

  it('ANTH-009: sends x-api-key header with the configured API key', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeAnthropicResponse(),
    });

    await provider.execute(makeConfig(), makeOptions());

    const calledHeaders = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(calledHeaders['x-api-key']).toBe(VALID_API_KEY);
    expect(calledHeaders['anthropic-version']).toBe('2023-06-01');
  });

  it('ANTH-010: concatenates multiple content blocks into response text', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        makeAnthropicResponse({
          content: [
            { type: 'text', text: 'Part one. ' },
            { type: 'text', text: 'Part two.' },
          ],
          usage: { input_tokens: 10, output_tokens: 4 },
        }),
    });

    const result = await provider.execute(makeConfig(), makeOptions());
    expect(result.text).toBe('Part one. Part two.');
  });

  it('ANTH-010b: throws AuthenticationError on 401 response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Invalid API key',
    });

    await expect(provider.execute(makeConfig(), makeOptions())).rejects.toThrow(AuthenticationError);
  });
});

// ---------------------------------------------------------------------------
// estimateCost
// ---------------------------------------------------------------------------

describe('AnthropicProvider.estimateCost', () => {
  it('ANTH-011: calculates cost using anthropic TOKEN_COSTS (input $3.00/1M, output $15.00/1M)', () => {
    // anthropic: input $3.00/1M, output $15.00/1M
    const cost = provider.estimateCost('claude-3-5-sonnet-20241022', 1_000_000, 1_000_000);
    // Expected: (1M * 3.00/1M) + (1M * 15.00/1M) = 18.00
    expect(cost).toBeCloseTo(18.0, 2);
  });

  it('ANTH-012: returns 0 cost for 0 tokens', () => {
    expect(provider.estimateCost('claude-3-5-sonnet-20241022', 0, 0)).toBe(0);
  });

  it('ANTH-012b: scales proportionally for partial counts', () => {
    // 100K prompt + 100K completion = 0.30 + 1.50 = 1.80
    const cost = provider.estimateCost('claude-3-5-haiku-20241022', 100_000, 100_000);
    expect(cost).toBeCloseTo(1.8, 2);
  });
});

// ---------------------------------------------------------------------------
// getMaxContext
// ---------------------------------------------------------------------------

describe('AnthropicProvider.getMaxContext', () => {
  it('ANTH-012c: returns 200000 for known Claude models', () => {
    expect(provider.getMaxContext('claude-3-5-sonnet-20241022')).toBe(200000);
    expect(provider.getMaxContext('claude-3-opus-20240229')).toBe(200000);
  });

  it('ANTH-012d: returns 200000 as default for unknown models', () => {
    expect(provider.getMaxContext('claude-future-model')).toBe(200000);
  });
});
