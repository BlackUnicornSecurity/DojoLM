/**
 * Tests for LLM Provider Adapters
 *
 * Covers: OllamaProvider, OpenAIProvider, AnthropicProvider,
 *         LlamacppProvider, LMStudioProvider, MoonshotProvider, ZaiProvider
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// OpenAI-compatible response helper (used by Ollama, LlamaCPP, LMStudio, OpenAI, Moonshot, Zai)
// ---------------------------------------------------------------------------
function openAIResponse(content: string, totalTokens = 15) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: totalTokens - 5, total_tokens: totalTokens },
      model: 'test-model',
    }),
    text: async () => '',
  };
}

// Anthropic response helper
function anthropicResponse(text: string) {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: 'text', text }],
      usage: { input_tokens: 5, output_tokens: 10 },
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'end_turn',
    }),
    text: async () => '',
  };
}

// Error response helper
function errorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error: { message } }),
    text: async () => JSON.stringify({ error: { message } }),
  };
}

describe('LLM Providers', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // =========================================================================
  // OllamaProvider
  // =========================================================================
  describe('OllamaProvider', () => {
    let provider: InstanceType<typeof import('../providers/ollama').OllamaProvider>;

    beforeEach(async () => {
      const mod = await import('../providers/ollama');
      provider = new mod.OllamaProvider();
    });

    it('has correct provider type', () => {
      expect(provider.providerType).toBe('ollama');
    });

    it('supports streaming', () => {
      expect(provider.supportsStreaming).toBe(true);
    });

    it('validates config with model name', () => {
      expect(provider.validateConfig({ model: 'llama3.2' } as never)).toBe(true);
    });

    it('rejects config without model name', () => {
      expect(() => provider.validateConfig({} as never)).toThrow();
    });

    it('executes with fetch and parses OpenAI-compatible response', async () => {
      mockFetch.mockResolvedValueOnce(openAIResponse('Hello from Ollama!'));

      const result = await provider.execute(
        { model: 'llama3.2', baseUrl: 'http://localhost:11434', provider: 'ollama' } as never,
        { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
      );

      expect(result.text).toBe('Hello from Ollama!');
      expect(result.filtered).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('localhost:11434');
    });

    it('handles fetch connection errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        provider.execute(
          { model: 'llama3.2', baseUrl: 'http://localhost:11434', provider: 'ollama' } as never,
          { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
        ),
      ).rejects.toThrow();
    });

    it('handles non-ok HTTP responses', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(500, 'Internal server error'));

      await expect(
        provider.execute(
          { model: 'llama3.2', baseUrl: 'http://localhost:11434', provider: 'ollama' } as never,
          { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
        ),
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // OpenAIProvider
  // =========================================================================
  describe('OpenAIProvider', () => {
    let provider: InstanceType<typeof import('../providers/openai').OpenAIProvider>;

    beforeEach(async () => {
      const mod = await import('../providers/openai');
      provider = new mod.OpenAIProvider();
    });

    it('has correct provider type', () => {
      expect(provider.providerType).toBe('openai');
    });

    it('supports streaming', () => {
      expect(provider.supportsStreaming).toBe(true);
    });

    it('validates config with API key and model', () => {
      expect(
        provider.validateConfig({ model: 'gpt-4o', apiKey: 'sk-testapikey1234567890abcdefghijklmn' } as never),
      ).toBe(true);
    });

    it('rejects config without API key', () => {
      expect(() =>
        provider.validateConfig({ model: 'gpt-4o' } as never),
      ).toThrow();
    });

    it('executes with fetch and parses response', async () => {
      mockFetch.mockResolvedValueOnce(openAIResponse('Hello from OpenAI!'));

      const result = await provider.execute(
        { model: 'gpt-4o', apiKey: 'sk-testapikey1234567890abcdefghijklmn', baseUrl: 'https://api.openai.com/v1', provider: 'openai' } as never,
        { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
      );

      expect(result.text).toBe('Hello from OpenAI!');
      expect(result.filtered).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles 401 API authentication errors', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(401, 'Invalid API key'));

      await expect(
        provider.execute(
          { model: 'gpt-4o', apiKey: 'sk-testapikey1234567890abcdefghijklmn', baseUrl: 'https://api.openai.com/v1', provider: 'openai' } as never,
          { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
        ),
      ).rejects.toThrow();
    });

    it('handles network failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        provider.execute(
          { model: 'gpt-4o', apiKey: 'sk-testapikey1234567890abcdefghijklmn', baseUrl: 'https://api.openai.com/v1', provider: 'openai' } as never,
          { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
        ),
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // AnthropicProvider
  // =========================================================================
  describe('AnthropicProvider', () => {
    let provider: InstanceType<typeof import('../providers/anthropic').AnthropicProvider>;

    beforeEach(async () => {
      const mod = await import('../providers/anthropic');
      provider = new mod.AnthropicProvider();
    });

    it('has correct provider type', () => {
      expect(provider.providerType).toBe('anthropic');
    });

    it('supports streaming', () => {
      expect(provider.supportsStreaming).toBe(true);
    });

    it('validates config with API key and model', () => {
      expect(
        provider.validateConfig({ model: 'claude-3-5-sonnet-20241022', apiKey: 'sk-ant-api03-testapikey1234567890abcdefghijklmn' } as never),
      ).toBe(true);
    });

    it('rejects config without API key', () => {
      expect(() =>
        provider.validateConfig({ model: 'claude-3-5-sonnet-20241022' } as never),
      ).toThrow();
    });

    it('executes with fetch and parses Anthropic response format', async () => {
      mockFetch.mockResolvedValueOnce(anthropicResponse('Hello from Anthropic!'));

      const result = await provider.execute(
        { model: 'claude-3-5-sonnet-20241022', apiKey: 'sk-ant-api03-testapikey1234567890abcdefghijklmn', provider: 'anthropic' } as never,
        { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
      );

      expect(result.text).toBe('Hello from Anthropic!');
      expect(result.filtered).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles 401 authentication errors', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(401, 'Invalid API key'));

      await expect(
        provider.execute(
          { model: 'claude-3-5-sonnet-20241022', apiKey: 'sk-ant-api03-testapikey1234567890abcdefghijklmn', provider: 'anthropic' } as never,
          { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
        ),
      ).rejects.toThrow();
    });

    it('handles network failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        provider.execute(
          { model: 'claude-3-5-sonnet-20241022', apiKey: 'sk-ant-api03-testapikey1234567890abcdefghijklmn', provider: 'anthropic' } as never,
          { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
        ),
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // LlamacppProvider
  // =========================================================================
  describe('LlamacppProvider', () => {
    let provider: InstanceType<typeof import('../providers/llamacpp').LlamacppProvider>;

    beforeEach(async () => {
      const mod = await import('../providers/llamacpp');
      provider = new mod.LlamacppProvider();
    });

    it('has correct provider type', () => {
      expect(provider.providerType).toBe('llamacpp');
    });

    it('supports streaming', () => {
      expect(provider.supportsStreaming).toBe(true);
    });

    it('validates config with model name', () => {
      expect(provider.validateConfig({ model: 'llama-3.2' } as never)).toBe(true);
    });

    it('rejects config without model name', () => {
      expect(() => provider.validateConfig({} as never)).toThrow();
    });

    it('does not require API key for local use', () => {
      expect(provider.validateConfig({ model: 'mistral' } as never)).toBe(true);
    });

    it('executes with fetch and parses OpenAI-compatible response', async () => {
      mockFetch.mockResolvedValueOnce(openAIResponse('Hello from llama.cpp!'));

      const result = await provider.execute(
        { model: 'llama-3.2', baseUrl: 'http://localhost:8080', provider: 'llamacpp' } as never,
        { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
      );

      expect(result.text).toBe('Hello from llama.cpp!');
      expect(result.filtered).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles connection errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        provider.execute(
          { model: 'llama-3.2', baseUrl: 'http://localhost:8080', provider: 'llamacpp' } as never,
          { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
        ),
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // LMStudioProvider
  // =========================================================================
  describe('LMStudioProvider', () => {
    let provider: InstanceType<typeof import('../providers/lmstudio').LMStudioProvider>;

    beforeEach(async () => {
      const mod = await import('../providers/lmstudio');
      provider = new mod.LMStudioProvider();
    });

    it('has correct provider type', () => {
      expect(provider.providerType).toBe('lmstudio');
    });

    it('supports streaming', () => {
      expect(provider.supportsStreaming).toBe(true);
    });

    it('validates config with model name', () => {
      expect(provider.validateConfig({ model: 'llama-3.2' } as never)).toBe(true);
    });

    it('rejects config without model name', () => {
      expect(() => provider.validateConfig({} as never)).toThrow();
    });

    it('does not require API key for local use', () => {
      expect(provider.validateConfig({ model: 'mistral' } as never)).toBe(true);
    });

    it('executes with fetch and parses OpenAI-compatible response', async () => {
      mockFetch.mockResolvedValueOnce(openAIResponse('Hello from LM Studio!'));

      const result = await provider.execute(
        { model: 'llama-3.2', baseUrl: 'http://localhost:1234', provider: 'lmstudio' } as never,
        { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
      );

      expect(result.text).toBe('Hello from LM Studio!');
      expect(result.filtered).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles connection errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        provider.execute(
          { model: 'llama-3.2', baseUrl: 'http://localhost:1234', provider: 'lmstudio' } as never,
          { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
        ),
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // MoonshotProvider
  // =========================================================================
  describe('MoonshotProvider', () => {
    let provider: InstanceType<typeof import('../providers/moonshot').MoonshotProvider>;

    beforeEach(async () => {
      const mod = await import('../providers/moonshot');
      provider = new mod.MoonshotProvider();
    });

    it('has correct provider type', () => {
      expect(provider.providerType).toBe('moonshot');
    });

    it('supports streaming', () => {
      expect(provider.supportsStreaming).toBe(true);
    });

    it('validates config with API key and model', () => {
      expect(
        provider.validateConfig({ model: 'moonshot-v1-8k', apiKey: 'sk-moontestapikey1234567890abcdefghij' } as never),
      ).toBe(true);
    });

    it('rejects config without API key', () => {
      expect(() =>
        provider.validateConfig({ model: 'moonshot-v1-8k' } as never),
      ).toThrow();
    });

    it('rejects config without model name', () => {
      expect(() =>
        provider.validateConfig({ apiKey: 'sk-moontestapikey1234567890abcdefghij' } as never),
      ).toThrow();
    });

    it('executes via OpenAI-compatible delegation', async () => {
      mockFetch.mockResolvedValueOnce(openAIResponse('Hello from Moonshot!'));

      const result = await provider.execute(
        { model: 'moonshot-v1-8k', apiKey: 'sk-moontestapikey1234567890abcdefghij', provider: 'moonshot' } as never,
        { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
      );

      expect(result.text).toBe('Hello from Moonshot!');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('moonshot.cn');
    });

    it('handles API errors', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'));

      await expect(
        provider.execute(
          { model: 'moonshot-v1-8k', apiKey: 'sk-mooninvalidkey1234567890abcdefghij', provider: 'moonshot' } as never,
          { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
        ),
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // ZaiProvider
  // =========================================================================
  describe('ZaiProvider', () => {
    let provider: InstanceType<typeof import('../providers/zai').ZaiProvider>;

    beforeEach(async () => {
      const mod = await import('../providers/zai');
      provider = new mod.ZaiProvider();
    });

    it('has correct provider type', () => {
      expect(provider.providerType).toBe('zai');
    });

    it('supports streaming', () => {
      expect(provider.supportsStreaming).toBe(true);
    });

    it('validates config with API key and model', () => {
      expect(
        provider.validateConfig({ model: 'glm-4', apiKey: 'sk-zaitestapikey1234567890abcdefghijkl' } as never),
      ).toBe(true);
    });

    it('rejects config without API key', () => {
      expect(() =>
        provider.validateConfig({ model: 'glm-4' } as never),
      ).toThrow();
    });

    it('rejects config without model name', () => {
      expect(() =>
        provider.validateConfig({ apiKey: 'sk-zaitestapikey1234567890abcdefghijkl' } as never),
      ).toThrow();
    });

    it('executes via OpenAI-compatible delegation', async () => {
      mockFetch.mockResolvedValueOnce(openAIResponse('Hello from z.ai!'));

      const result = await provider.execute(
        { model: 'glm-4', apiKey: 'sk-zaitestapikey1234567890abcdefghijkl', provider: 'zai' } as never,
        { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
      );

      expect(result.text).toBe('Hello from z.ai!');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('z.ai');
    });

    it('handles API errors', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(403, 'Forbidden'));

      await expect(
        provider.execute(
          { model: 'glm-4', apiKey: 'sk-zaiinvalidkey1234567890abcdefghijkl', provider: 'zai' } as never,
          { prompt: 'Hi', maxTokens: 100, temperature: 0.7 } as never,
        ),
      ).rejects.toThrow();
    });
  });
});
