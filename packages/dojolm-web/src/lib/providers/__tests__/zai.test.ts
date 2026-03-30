/**
 * File: providers/__tests__/zai.test.ts
 * Purpose: Unit tests for ZaiProvider adapter (z.ai / Zhipu AI)
 *
 * Test IDs: ZAI-001 through ZAI-010
 *
 * Index:
 * - validateConfig tests (ZAI-001..003)
 * - testConnection tests (ZAI-004..005)
 * - execute tests (ZAI-006..009)
 * - estimateCost tests (ZAI-010)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ZaiProvider } from '../zai';
import { AuthenticationError, ValidationError } from '../errors';
import type { LLMModelConfig } from '../../llm-types';
import type { ProviderRequestOptions } from '../../llm-providers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Must match /^sk-[a-zA-Z0-9]{32,}$/ because ZaiProvider delegates to
// OpenAIProvider.execute, which validates the key format as 'openai'.
const VALID_API_KEY = 'sk-abcdefghijklmnopqrstuvwxyz12345678901234';

function makeConfig(overrides: Partial<LLMModelConfig> = {}): LLMModelConfig {
  return {
    id: 'zai-test',
    name: 'Zai Test',
    provider: 'zai',
    model: 'glm-4.7',
    apiKey: VALID_API_KEY,
    enabled: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as LLMModelConfig;
}

function makeOptions(overrides: Partial<ProviderRequestOptions> = {}): ProviderRequestOptions {
  return {
    prompt: 'Hello, Zhipu AI!',
    maxTokens: 128,
    ...overrides,
  };
}

function makeChatResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chatcmpl-zai-test',
    object: 'chat.completion',
    model: 'glm-4.7',
    choices: [
      {
        message: { role: 'assistant', content: 'Hello from z.ai GLM model!' },
        finish_reason: 'stop',
        index: 0,
      },
    ],
    usage: {
      prompt_tokens: 15,
      completion_tokens: 9,
      total_tokens: 24,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let provider: ZaiProvider;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  provider = new ZaiProvider();
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

describe('ZaiProvider.validateConfig', () => {
  it('ZAI-001: returns true for a valid config', () => {
    expect(provider.validateConfig(makeConfig())).toBe(true);
  });

  it('ZAI-002: throws AuthenticationError when apiKey is missing', () => {
    expect(() =>
      provider.validateConfig(makeConfig({ apiKey: undefined }))
    ).toThrow(AuthenticationError);
  });

  it('ZAI-003: throws ValidationError when model is empty', () => {
    expect(() =>
      provider.validateConfig(makeConfig({ model: '' }))
    ).toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// testConnection
// ---------------------------------------------------------------------------

describe('ZaiProvider.testConnection', () => {
  it('ZAI-004: returns true when underlying execute succeeds', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(true);
  });

  it('ZAI-005: returns false on 401 auth failure', async () => {
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

describe('ZaiProvider.execute', () => {
  it('ZAI-006: returns ProviderResponse on successful chat completion', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Hello from z.ai GLM model!');
    expect(result.promptTokens).toBe(15);
    expect(result.completionTokens).toBe(9);
    expect(result.totalTokens).toBe(24);
    expect(result.filtered).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('ZAI-007: uses z.ai base URL when none configured', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    await provider.execute(makeConfig({ baseUrl: undefined }), makeOptions());

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('api.z.ai');
  });

  it('ZAI-008: works with glm-4-flash model', async () => {
    const flashResponse = makeChatResponse({
      model: 'glm-4-flash',
      choices: [
        {
          message: { role: 'assistant', content: 'Fast GLM response.' },
          finish_reason: 'stop',
          index: 0,
        },
      ],
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => flashResponse,
    });

    const result = await provider.execute(
      makeConfig({ model: 'glm-4-flash' }),
      makeOptions()
    );

    expect(result.text).toBe('Fast GLM response.');
  });

  it('ZAI-009: returns false from testConnection when execute throws network error', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(false);
  });

  it('ZAI-009b: includes Authorization header with Bearer token', async () => {
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
// getMaxContext
// ---------------------------------------------------------------------------

describe('ZaiProvider.getMaxContext', () => {
  it('ZAI-009c: returns 128000 for known GLM models', () => {
    expect(provider.getMaxContext('glm-4.7')).toBe(128000);
    expect(provider.getMaxContext('glm-4-flash')).toBe(128000);
    expect(provider.getMaxContext('glm-4-plus')).toBe(128000);
    expect(provider.getMaxContext('glm-4-air')).toBe(128000);
    expect(provider.getMaxContext('glm-3-turbo')).toBe(128000);
  });

  it('ZAI-009d: falls back to 128000 for unknown models', () => {
    expect(provider.getMaxContext('glm-unknown-model')).toBe(128000);
  });
});

// ---------------------------------------------------------------------------
// estimateCost
// ---------------------------------------------------------------------------

describe('ZaiProvider.estimateCost', () => {
  it('ZAI-010: calculates cost using zai TOKEN_COSTS (input $0.50/1M, output $2.00/1M)', () => {
    // 1M prompt + 1M completion = $0.50 + $2.00 = $2.50
    const cost = provider.estimateCost('glm-4.7', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(2.5, 2);
  });

  it('ZAI-010b: returns 0 cost for 0 tokens', () => {
    expect(provider.estimateCost('glm-4-flash', 0, 0)).toBe(0);
  });

  it('ZAI-010c: scales proportionally for partial token counts', () => {
    // 500K prompt + 500K completion = $0.25 + $1.00 = $1.25
    const cost = provider.estimateCost('glm-4-plus', 500_000, 500_000);
    expect(cost).toBeCloseTo(1.25, 2);
  });
});
