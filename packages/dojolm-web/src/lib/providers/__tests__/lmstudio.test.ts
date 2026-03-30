/**
 * File: providers/__tests__/lmstudio.test.ts
 * Purpose: Unit tests for LMStudioProvider adapter
 *
 * Test IDs: LMST-001 through LMST-010
 *
 * Index:
 * - validateConfig tests (LMST-001..002)
 * - testConnection tests (LMST-003..004)
 * - execute tests (LMST-005..008)
 * - estimateCost / getMaxContext tests (LMST-009..010)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LMStudioProvider } from '../lmstudio';
import {
  ValidationError,
  NetworkError,
} from '../errors';
import type { LLMModelConfig } from '../../llm-types';
import type { ProviderRequestOptions } from '../../llm-providers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<LLMModelConfig> = {}): LLMModelConfig {
  return {
    id: 'lmstudio-test',
    name: 'LM Studio Test',
    provider: 'lmstudio',
    model: 'llama-3.2',
    enabled: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as LLMModelConfig;
}

function makeOptions(overrides: Partial<ProviderRequestOptions> = {}): ProviderRequestOptions {
  return {
    prompt: 'Hello, LM Studio!',
    maxTokens: 128,
    ...overrides,
  };
}

function makeChatResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chatcmpl-lmstudio-test',
    object: 'chat.completion',
    model: 'llama-3.2',
    choices: [
      {
        message: { role: 'assistant', content: 'Hello from LM Studio!' },
        finish_reason: 'stop',
        index: 0,
      },
    ],
    usage: {
      prompt_tokens: 12,
      completion_tokens: 6,
      total_tokens: 18,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let provider: LMStudioProvider;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  provider = new LMStudioProvider();
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

describe('LMStudioProvider.validateConfig', () => {
  it('LMST-001: returns true for a valid config (no API key required)', () => {
    expect(provider.validateConfig(makeConfig())).toBe(true);
  });

  it('LMST-002: throws ValidationError when model is empty', () => {
    expect(() =>
      provider.validateConfig(makeConfig({ model: '' }))
    ).toThrow(ValidationError);
  });

  it('LMST-002b: accepts config without apiKey (local model)', () => {
    expect(() =>
      provider.validateConfig(makeConfig({ apiKey: undefined }))
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// testConnection
// ---------------------------------------------------------------------------

describe('LMStudioProvider.testConnection', () => {
  it('LMST-003: returns true when /v1/models endpoint returns ok', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(true);

    // Should call /v1/models on default base URL (port 1234)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:1234/v1/models',
      expect.any(Object)
    );
  });

  it('LMST-004: returns false when server is not reachable', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(false);
  });

  it('LMST-004b: uses custom baseUrl when provided', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    await provider.testConnection(makeConfig({ baseUrl: 'http://lmstudio-host:5678' }));
    expect(fetchMock).toHaveBeenCalledWith(
      'http://lmstudio-host:5678/v1/models',
      expect.any(Object)
    );
  });
});

// ---------------------------------------------------------------------------
// execute
// ---------------------------------------------------------------------------

describe('LMStudioProvider.execute', () => {
  it('LMST-005: returns ProviderResponse on successful completion', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Hello from LM Studio!');
    expect(result.promptTokens).toBe(12);
    expect(result.completionTokens).toBe(6);
    expect(result.totalTokens).toBe(18);
    expect(result.filtered).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('LMST-006: throws NetworkError on non-ok response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal server error',
    });

    await expect(provider.execute(makeConfig(), makeOptions())).rejects.toThrow(NetworkError);
  });

  it('LMST-007: uses default base URL when baseUrl not provided', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    await provider.execute(makeConfig(), makeOptions());

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe('http://localhost:1234/v1/chat/completions');
  });

  it('LMST-008: uses custom baseUrl when provided in config', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeChatResponse(),
    });

    await provider.execute(
      makeConfig({ baseUrl: 'http://lmstudio-host:9999' }),
      makeOptions()
    );

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe('http://lmstudio-host:9999/v1/chat/completions');
  });
});

// ---------------------------------------------------------------------------
// estimateCost / getMaxContext
// ---------------------------------------------------------------------------

describe('LMStudioProvider.estimateCost', () => {
  it('LMST-009: always returns 0 (local model, no cost)', () => {
    expect(provider.estimateCost('llama-3.2', 1_000_000, 1_000_000)).toBe(0);
    expect(provider.estimateCost('mistral', 500_000, 500_000)).toBe(0);
  });
});

describe('LMStudioProvider.getMaxContext', () => {
  it('LMST-010: returns correct context window for known models', () => {
    expect(provider.getMaxContext('llama-3.2')).toBe(128000);
    expect(provider.getMaxContext('mistral')).toBe(32000);
    expect(provider.getMaxContext('llama-3')).toBe(8192);
  });

  it('LMST-010b: returns 8192 as default for unknown models', () => {
    expect(provider.getMaxContext('unknown-model')).toBe(8192);
  });
});
