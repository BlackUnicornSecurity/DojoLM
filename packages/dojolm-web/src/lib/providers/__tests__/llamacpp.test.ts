/**
 * File: providers/__tests__/llamacpp.test.ts
 * Purpose: Unit tests for LlamacppProvider adapter
 *
 * Test IDs: LLCP-001 through LLCP-010
 *
 * Index:
 * - validateConfig tests (LLCP-001..002)
 * - testConnection tests (LLCP-003..004)
 * - execute tests (LLCP-005..008)
 * - estimateCost / getMaxContext tests (LLCP-009..010)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LlamacppProvider } from '../llamacpp';
import {
  ValidationError,
  NetworkError,
  TimeoutError,
} from '../errors';
import type { LLMModelConfig } from '../../llm-types';
import type { ProviderRequestOptions } from '../../llm-providers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<LLMModelConfig> = {}): LLMModelConfig {
  return {
    id: 'llamacpp-test',
    name: 'llama.cpp Test',
    provider: 'llamacpp',
    model: 'llama-3.2',
    enabled: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as LLMModelConfig;
}

function makeOptions(overrides: Partial<ProviderRequestOptions> = {}): ProviderRequestOptions {
  return {
    prompt: 'Hello, llama!',
    maxTokens: 128,
    ...overrides,
  };
}

function makeChatResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chatcmpl-llamacpp-test',
    object: 'chat.completion',
    model: 'llama-3.2',
    choices: [
      {
        message: { role: 'assistant', content: 'Hello from llama.cpp!' },
        finish_reason: 'stop',
        index: 0,
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let provider: LlamacppProvider;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  provider = new LlamacppProvider();
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

describe('LlamacppProvider.validateConfig', () => {
  it('LLCP-001: returns true for a valid config (no API key required)', () => {
    expect(provider.validateConfig(makeConfig())).toBe(true);
  });

  it('LLCP-002: throws ValidationError when model is empty', () => {
    expect(() =>
      provider.validateConfig(makeConfig({ model: '' }))
    ).toThrow(ValidationError);
  });

  it('LLCP-002b: accepts config without apiKey (local model)', () => {
    expect(() =>
      provider.validateConfig(makeConfig({ apiKey: undefined }))
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// testConnection
// ---------------------------------------------------------------------------

describe('LlamacppProvider.testConnection', () => {
  it('LLCP-003: returns true when /v1/models endpoint returns ok', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(true);

    // Should call /v1/models on default base URL
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/v1/models',
      expect.any(Object)
    );
  });

  it('LLCP-004: returns false when server is not reachable', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(false);
  });

  it('LLCP-004b: uses custom baseUrl when provided', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    await provider.testConnection(makeConfig({ baseUrl: 'http://myserver:9090' }));
    expect(fetchMock).toHaveBeenCalledWith(
      'http://myserver:9090/v1/models',
      expect.any(Object)
    );
  });
});

// ---------------------------------------------------------------------------
// execute
// ---------------------------------------------------------------------------

describe('LlamacppProvider.execute', () => {
  it('LLCP-005: returns ProviderResponse on successful completion', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Hello from llama.cpp!');
    expect(result.promptTokens).toBe(10);
    expect(result.completionTokens).toBe(5);
    expect(result.totalTokens).toBe(15);
    expect(result.filtered).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('LLCP-006: throws NetworkError on non-ok response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal server error',
    });

    await expect(provider.execute(makeConfig(), makeOptions())).rejects.toThrow(NetworkError);
  });

  it('LLCP-007: uses default base URL when baseUrl not provided', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    await provider.execute(makeConfig(), makeOptions());

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe('http://localhost:8080/v1/chat/completions');
  });

  it('LLCP-008: uses custom baseUrl when provided in config', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    await provider.execute(
      makeConfig({ baseUrl: 'http://customhost:9000' }),
      makeOptions()
    );

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe('http://customhost:9000/v1/chat/completions');
  });
});

// ---------------------------------------------------------------------------
// estimateCost / getMaxContext
// ---------------------------------------------------------------------------

describe('LlamacppProvider.estimateCost', () => {
  it('LLCP-009: always returns 0 (local model, no cost)', () => {
    expect(provider.estimateCost('llama-3.2', 1_000_000, 1_000_000)).toBe(0);
    expect(provider.estimateCost('mistral', 500_000, 500_000)).toBe(0);
  });
});

describe('LlamacppProvider.getMaxContext', () => {
  it('LLCP-010: returns correct context window for known models', () => {
    expect(provider.getMaxContext('llama-3.2')).toBe(128000);
    expect(provider.getMaxContext('mistral')).toBe(32000);
    expect(provider.getMaxContext('llama-3')).toBe(8192);
  });

  it('LLCP-010b: returns 8192 as default for unknown models', () => {
    expect(provider.getMaxContext('unknown-model')).toBe(8192);
  });
});
