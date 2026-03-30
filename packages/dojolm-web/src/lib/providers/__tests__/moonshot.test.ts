/**
 * File: providers/__tests__/moonshot.test.ts
 * Purpose: Unit tests for MoonshotProvider adapter
 *
 * Test IDs: MOON-001 through MOON-010
 *
 * Index:
 * - validateConfig tests (MOON-001..003)
 * - testConnection tests (MOON-004..005)
 * - execute tests (MOON-006..009)
 * - estimateCost tests (MOON-010)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MoonshotProvider } from '../moonshot';
import { AuthenticationError, ValidationError } from '../errors';
import type { LLMModelConfig } from '../../llm-types';
import type { ProviderRequestOptions } from '../../llm-providers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Must match /^sk-[a-zA-Z0-9]{32,}$/ because MoonshotProvider delegates to
// OpenAIProvider.execute, which validates the key format as 'openai'.
const VALID_API_KEY = 'sk-abcdefghijklmnopqrstuvwxyz12345678901234';

function makeConfig(overrides: Partial<LLMModelConfig> = {}): LLMModelConfig {
  return {
    id: 'moonshot-test',
    name: 'Moonshot Test',
    provider: 'moonshot',
    model: 'moonshot-v1-8k',
    apiKey: VALID_API_KEY,
    enabled: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as LLMModelConfig;
}

function makeOptions(overrides: Partial<ProviderRequestOptions> = {}): ProviderRequestOptions {
  return {
    prompt: '你好，月之暗面！',
    maxTokens: 64,
    ...overrides,
  };
}

function makeChatResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chatcmpl-moonshot-test',
    object: 'chat.completion',
    model: 'moonshot-v1-8k',
    choices: [
      {
        message: { role: 'assistant', content: '你好！有什么我可以帮助你的？' },
        finish_reason: 'stop',
        index: 0,
      },
    ],
    usage: {
      prompt_tokens: 12,
      completion_tokens: 14,
      total_tokens: 26,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let provider: MoonshotProvider;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  provider = new MoonshotProvider();
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

describe('MoonshotProvider.validateConfig', () => {
  it('MOON-001: returns true for a valid config', () => {
    expect(provider.validateConfig(makeConfig())).toBe(true);
  });

  it('MOON-002: throws AuthenticationError when apiKey is missing', () => {
    expect(() =>
      provider.validateConfig(makeConfig({ apiKey: undefined }))
    ).toThrow(AuthenticationError);
  });

  it('MOON-003: throws ValidationError when model is empty', () => {
    expect(() =>
      provider.validateConfig(makeConfig({ model: '' }))
    ).toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// testConnection
// ---------------------------------------------------------------------------

describe('MoonshotProvider.testConnection', () => {
  it('MOON-004: returns true when underlying execute succeeds', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(true);
  });

  it('MOON-005: returns false on 401 auth failure', async () => {
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

describe('MoonshotProvider.execute', () => {
  it('MOON-006: returns ProviderResponse on successful chat completion', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('你好！有什么我可以帮助你的？');
    expect(result.promptTokens).toBe(12);
    expect(result.completionTokens).toBe(14);
    expect(result.totalTokens).toBe(26);
    expect(result.filtered).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('MOON-007: uses Moonshot base URL when none configured', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    await provider.execute(makeConfig({ baseUrl: undefined }), makeOptions());

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('api.moonshot.cn');
  });

  it('MOON-008: supports Chinese language prompts in execute', async () => {
    const chinesePrompt = '用中文解释量子力学';
    const chineseResponse = makeChatResponse({
      choices: [
        {
          message: { role: 'assistant', content: '量子力学是物理学的一个分支...' },
          finish_reason: 'stop',
          index: 0,
        },
      ],
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => chineseResponse,
    });

    const result = await provider.execute(
      makeConfig(),
      makeOptions({ prompt: chinesePrompt })
    );

    expect(result.text).toBe('量子力学是物理学的一个分支...');
  });

  it('MOON-009: returns false from testConnection when execute throws network error', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(false);
  });

  it('MOON-009b: includes Authorization header with Bearer token', async () => {
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

describe('MoonshotProvider.getMaxContext', () => {
  it('MOON-009c: returns correct context window for known models', () => {
    expect(provider.getMaxContext('moonshot-v1-8k')).toBe(8192);
    expect(provider.getMaxContext('moonshot-v1-32k')).toBe(32768);
    expect(provider.getMaxContext('moonshot-v1-128k')).toBe(128000);
    expect(provider.getMaxContext('kimi-latest')).toBe(128000);
  });

  it('MOON-009d: falls back to 32768 for unknown models', () => {
    expect(provider.getMaxContext('moonshot-unknown-model')).toBe(32768);
  });
});

// ---------------------------------------------------------------------------
// estimateCost
// ---------------------------------------------------------------------------

describe('MoonshotProvider.estimateCost', () => {
  it('MOON-010: calculates cost using moonshot TOKEN_COSTS (input $1.00/1M, output $2.00/1M)', () => {
    // 1M prompt + 1M completion = $1.00 + $2.00 = $3.00
    const cost = provider.estimateCost('moonshot-v1-8k', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(3.0, 2);
  });

  it('MOON-010b: returns 0 cost for 0 tokens', () => {
    expect(provider.estimateCost('moonshot-v1-8k', 0, 0)).toBe(0);
  });

  it('MOON-010c: scales proportionally for partial token counts', () => {
    // 500K prompt + 500K completion = $0.50 + $1.00 = $1.50
    const cost = provider.estimateCost('moonshot-v1-128k', 500_000, 500_000);
    expect(cost).toBeCloseTo(1.5, 2);
  });
});
