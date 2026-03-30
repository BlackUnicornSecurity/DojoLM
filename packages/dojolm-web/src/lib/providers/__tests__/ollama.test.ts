/**
 * File: providers/__tests__/ollama.test.ts
 * Purpose: Unit tests for OllamaProvider adapter
 *
 * Test IDs: OLMA-001 through OLMA-015
 *
 * Index:
 * - validateConfig tests (OLMA-001..004)
 * - testConnection tests (OLMA-005..007)
 * - execute tests (OLMA-008..011)
 * - streamExecute tests (OLMA-012..013)
 * - getMaxContext / estimateCost tests (OLMA-014..015)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider } from '../ollama';
import { ValidationError, NetworkError, TimeoutError } from '../errors';
import type { LLMModelConfig } from '../../llm-types';
import type { ProviderRequestOptions } from '../../llm-providers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<LLMModelConfig> = {}): LLMModelConfig {
  return {
    id: 'ollama-test',
    name: 'Ollama Test',
    provider: 'ollama',
    model: 'llama3.2',
    enabled: true,
    createdAt: '',
    updatedAt: '',
    baseUrl: 'http://localhost:11434',
    ...overrides,
  } as LLMModelConfig;
}

function makeOptions(overrides: Partial<ProviderRequestOptions> = {}): ProviderRequestOptions {
  return {
    prompt: 'Hello, world!',
    maxTokens: 256,
    ...overrides,
  };
}

function makeChatResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    model: 'llama3.2',
    choices: [
      {
        message: { role: 'assistant', content: 'Hello from Ollama!' },
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

let provider: OllamaProvider;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  provider = new OllamaProvider();
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

describe('OllamaProvider.validateConfig', () => {
  it('OLMA-001: returns true for a valid config with model name', () => {
    const result = provider.validateConfig(makeConfig());
    expect(result).toBe(true);
  });

  it('OLMA-002: throws ValidationError when model is missing', () => {
    expect(() => provider.validateConfig(makeConfig({ model: '' }))).toThrow(ValidationError);
  });

  it('OLMA-003: ValidationError message mentions model field', () => {
    let thrown: unknown;
    try {
      provider.validateConfig(makeConfig({ model: '' }));
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(ValidationError);
    expect((thrown as ValidationError).message).toMatch(/model/i);
  });

  it('OLMA-004: does not require an API key (local provider)', () => {
    // No apiKey set — should not throw
    const config = makeConfig({ apiKey: undefined });
    expect(() => provider.validateConfig(config)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// testConnection
// ---------------------------------------------------------------------------

describe('OllamaProvider.testConnection', () => {
  it('OLMA-005: returns true when /api/tags responds 200', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/tags'),
      expect.any(Object)
    );
  });

  it('OLMA-006: returns false when /api/tags responds with non-ok status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(false);
  });

  it('OLMA-007: returns false when fetch throws (Ollama not running)', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await provider.testConnection(makeConfig());
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// execute
// ---------------------------------------------------------------------------

describe('OllamaProvider.execute', () => {
  it('OLMA-008: returns ProviderResponse on successful chat completion', async () => {
    const responseData = makeChatResponse();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => responseData,
    });

    const result = await provider.execute(makeConfig(), makeOptions());

    expect(result.text).toBe('Hello from Ollama!');
    expect(result.promptTokens).toBe(10);
    expect(result.completionTokens).toBe(5);
    expect(result.totalTokens).toBe(15);
    expect(result.filtered).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('OLMA-009: throws NetworkError on non-ok HTTP response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(provider.execute(makeConfig(), makeOptions())).rejects.toThrow(NetworkError);
  });

  it('OLMA-010: throws ValidationError when model is missing (validate called first)', async () => {
    await expect(
      provider.execute(makeConfig({ model: '' }), makeOptions())
    ).rejects.toThrow(ValidationError);
  });

  it('OLMA-011: uses default baseUrl when none provided in config', async () => {
    const responseData = makeChatResponse();
    fetchMock.mockResolvedValue({ ok: true, json: async () => responseData });

    await provider.execute(makeConfig({ baseUrl: undefined }), makeOptions());

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:11434'),
      expect.any(Object)
    );
  });
});

// ---------------------------------------------------------------------------
// streamExecute
// ---------------------------------------------------------------------------

describe('OllamaProvider.streamExecute', () => {
  function makeStreamBody(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });
  }

  it('OLMA-012: aggregates streamed delta chunks into final text', async () => {
    const streamLines = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n',
      'data: [DONE]\n',
    ].join('');

    fetchMock.mockResolvedValue({
      ok: true,
      body: makeStreamBody([streamLines]),
    });

    const chunks: string[] = [];
    const result = await provider.streamExecute(
      makeConfig(),
      makeOptions(),
      (chunk) => { if (chunk.delta) chunks.push(chunk.delta); }
    );

    expect(chunks).toContain('Hello');
    expect(chunks).toContain(' world');
    expect(result.text).toBe('Hello world');
  });

  it('OLMA-013: throws NetworkError when stream response is not ok', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(
      provider.streamExecute(makeConfig(), makeOptions(), vi.fn())
    ).rejects.toThrow(NetworkError);
  });
});

// ---------------------------------------------------------------------------
// getMaxContext / estimateCost
// ---------------------------------------------------------------------------

describe('OllamaProvider.getMaxContext', () => {
  it('OLMA-014: returns correct context window for known models', () => {
    expect(provider.getMaxContext('llama3.2')).toBe(128000);
    expect(provider.getMaxContext('mistral')).toBe(32000);
    expect(provider.getMaxContext('llama2')).toBe(4096);
  });

  it('OLMA-015: returns default 8192 for unknown models', () => {
    expect(provider.getMaxContext('some-unknown-model')).toBe(8192);
  });
});

describe('OllamaProvider.estimateCost', () => {
  it('OLMA-015b: always returns 0 (local / free provider)', () => {
    expect(provider.estimateCost('llama3.2', 1000, 500)).toBe(0);
    expect(provider.estimateCost('mistral', 99999, 99999)).toBe(0);
  });
});
