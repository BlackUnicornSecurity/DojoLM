/**
 * File: providers/__tests__/openai.test.ts
 * Purpose: Unit tests for OpenAIProvider adapter
 *
 * Test IDs: OAI-001 through OAI-010
 *
 * Index:
 * - validateConfig tests (OAI-001..004)
 * - testConnection tests (OAI-005..006)
 * - execute tests (OAI-007..009)
 * - estimateCost tests (OAI-010)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider } from '../openai';
import {
  AuthenticationError,
  ValidationError,
  NetworkError,
  RateLimitError,
} from '../errors';
import type { LLMModelConfig } from '../../llm-types';
import type { ProviderRequestOptions } from '../../llm-providers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_API_KEY = 'sk-abcdefghijklmnopqrstuvwxyz12345678901234';

function makeConfig(overrides: Partial<LLMModelConfig> = {}): LLMModelConfig {
  return {
    id: 'openai-test',
    name: 'OpenAI Test',
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: VALID_API_KEY,
    enabled: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as LLMModelConfig;
}

function makeOptions(overrides: Partial<ProviderRequestOptions> = {}): ProviderRequestOptions {
  return {
    prompt: 'Hello, OpenAI!',
    maxTokens: 256,
    ...overrides,
  };
}

function makeChatResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chatcmpl-openai-test',
    object: 'chat.completion',
    model: 'gpt-4o',
    choices: [
      {
        message: { role: 'assistant', content: 'Hello from OpenAI!' },
        finish_reason: 'stop',
        index: 0,
      },
    ],
    usage: {
      prompt_tokens: 20,
      completion_tokens: 8,
      total_tokens: 28,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let provider: OpenAIProvider;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  provider = new OpenAIProvider();
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

describe('OpenAIProvider.validateConfig', () => {
  it('OAI-001: returns true for a valid config', () => {
    expect(provider.validateConfig(makeConfig())).toBe(true);
  });

  it('OAI-002: throws AuthenticationError when apiKey is missing', () => {
    expect(() =>
      provider.validateConfig(makeConfig({ apiKey: undefined }))
    ).toThrow(AuthenticationError);
  });

  it('OAI-003: throws ValidationError when model is empty', () => {
    // Need a valid key to pass key check first
    expect(() =>
      provider.validateConfig(makeConfig({ model: '' }))
    ).toThrow(ValidationError);
  });

  it('OAI-004: throws ValidationError for malformed API key (bad prefix)', () => {
    // OpenAI keys must match /^sk-[a-zA-Z0-9]{32,}$/
    expect(() =>
      provider.validateConfig(makeConfig({ apiKey: 'not-a-real-openai-key' }))
    ).toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// testConnection
// ---------------------------------------------------------------------------

describe('OpenAIProvider.testConnection', () => {
  it('OAI-005: returns true when underlying execute succeeds', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(true);
  });

  it('OAI-006: returns false when execute throws (e.g. auth failure)', async () => {
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

describe('OpenAIProvider.execute', () => {
  it('OAI-007: returns ProviderResponse on successful chat completion', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Hello from OpenAI!');
    expect(result.promptTokens).toBe(20);
    expect(result.completionTokens).toBe(8);
    expect(result.totalTokens).toBe(28);
    expect(result.filtered).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('OAI-008: returns filtered=true when finish_reason is content_filter', async () => {
    const filteredResponse = makeChatResponse({
      choices: [
        {
          message: { role: 'assistant', content: '' },
          finish_reason: 'content_filter',
          index: 0,
        },
      ],
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => filteredResponse,
    });

    const result = await provider.execute(makeConfig(), makeOptions());
    expect(result.filtered).toBe(true);
    expect(result.text).toBe('');
  });

  it('OAI-009: throws RateLimitError on 429 response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    });

    await expect(provider.execute(makeConfig(), makeOptions())).rejects.toThrow(RateLimitError);
  });

  it('OAI-009b: includes Authorization header with Bearer token', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    await provider.execute(makeConfig(), makeOptions());

    const calledHeaders = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(calledHeaders['Authorization']).toBe(`Bearer ${VALID_API_KEY}`);
  });
});

// ---------------------------------------------------------------------------
// estimateCost
// ---------------------------------------------------------------------------

describe('OpenAIProvider.estimateCost', () => {
  it('OAI-010: calculates cost using TOKEN_COSTS for openai provider', () => {
    // OpenAI: input $2.50/1M tokens, output $10.00/1M tokens
    const cost = provider.estimateCost('gpt-4o', 1_000_000, 1_000_000);
    // Expected: (1M * 2.50/1M) + (1M * 10.00/1M) = 12.50
    expect(cost).toBeCloseTo(12.5, 2);
  });

  it('OAI-010b: returns 0 cost for 0 tokens', () => {
    expect(provider.estimateCost('gpt-4o', 0, 0)).toBe(0);
  });

  it('OAI-010c: scales proportionally for partial token counts', () => {
    // 500K prompt + 500K completion = 1.25 + 5.00 = 6.25
    const cost = provider.estimateCost('gpt-4o', 500_000, 500_000);
    expect(cost).toBeCloseTo(6.25, 2);
  });
});
