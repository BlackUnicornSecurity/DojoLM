/**
 * Tests for LLM test helpers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createMockResponse,
  createMockProvider,
  providerTestContract,
  setupLLMTestGuard,
  teardownLLMTestGuard,
  createMockFetch,
  createTestModelConfig,
  MOCK_HTTP_RESPONSES,
} from './test-helpers.js';

describe('createMockResponse', () => {
  it('returns a valid ProviderResponse with defaults', () => {
    const resp = createMockResponse('openai');
    expect(resp.text).toBeTruthy();
    expect(resp.promptTokens).toBe(10);
    expect(resp.completionTokens).toBe(25);
    expect(resp.totalTokens).toBe(35);
    expect(resp.durationMs).toBe(150);
  });

  it('applies overrides', () => {
    const resp = createMockResponse('openai', { text: 'custom', promptTokens: 50 });
    expect(resp.text).toBe('custom');
    expect(resp.promptTokens).toBe(50);
    expect(resp.totalTokens).toBe(75);
  });
});

describe('createMockProvider', () => {
  it('creates a provider with default config', () => {
    const provider = createMockProvider();
    expect(provider.providerType).toBe('custom');
    expect(provider.supportsStreaming).toBe(true);
  });

  it('execute returns mock response', async () => {
    const provider = createMockProvider();
    const config = createTestModelConfig();
    const resp = await provider.execute(config, { prompt: 'test', maxTokens: 100 });
    expect(resp.text).toBeTruthy();
    expect(typeof resp.totalTokens).toBe('number');
  });

  it('execute throws when configured with error', async () => {
    const provider = createMockProvider({ executeError: new Error('boom') });
    const config = createTestModelConfig();
    await expect(provider.execute(config, { prompt: 'test', maxTokens: 100 })).rejects.toThrow('boom');
  });

  it('validateConfig rejects empty model name', () => {
    const provider = createMockProvider();
    expect(provider.validateConfig({ ...createTestModelConfig(), model: '' })).toBe(false);
  });
});

describe('providerTestContract', () => {
  it('returns expected test case names', () => {
    const provider = createMockProvider();
    const config = createTestModelConfig();
    const contract = providerTestContract(provider, config);
    expect(contract['has correct providerType']).toBeDefined();
    expect(contract['validateConfig returns boolean']).toBeDefined();
    expect(contract['execute returns ProviderResponse shape']).toBeDefined();
  });
});

describe('createMockFetch', () => {
  it('returns matching response for URL pattern', async () => {
    const mockFetch = createMockFetch({
      'api.openai.com': { status: 200, body: { ok: true } },
    });
    const resp = await mockFetch('https://api.openai.com/v1/chat/completions');
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.ok).toBe(true);
  });

  it('throws for unmatched URLs', async () => {
    const mockFetch = createMockFetch({});
    await expect(mockFetch('https://unknown.com')).rejects.toThrow('No mock found');
  });
});

describe('createTestModelConfig', () => {
  it('returns valid config with defaults', () => {
    const config = createTestModelConfig();
    expect(config.provider).toBe('openai');
    expect(config.model).toBe('gpt-4o');
    expect(config.enabled).toBe(true);
  });

  it('applies overrides', () => {
    const config = createTestModelConfig({ model: 'claude-3', provider: 'anthropic' });
    expect(config.model).toBe('claude-3');
    expect(config.provider).toBe('anthropic');
  });
});

describe('MOCK_HTTP_RESPONSES', () => {
  it('has responses for all provider formats', () => {
    expect(MOCK_HTTP_RESPONSES['openai-compatible']).toBeDefined();
    expect(MOCK_HTTP_RESPONSES['anthropic']).toBeDefined();
    expect(MOCK_HTTP_RESPONSES['google']).toBeDefined();
    expect(MOCK_HTTP_RESPONSES['cohere']).toBeDefined();
  });

  it('generates valid response shapes', () => {
    const openaiResp = MOCK_HTTP_RESPONSES['openai-compatible']('Hello');
    expect(openaiResp.choices[0].message.content).toBe('Hello');
    const anthropicResp = MOCK_HTTP_RESPONSES['anthropic']('Hi');
    expect(anthropicResp.content[0].text).toBe('Hi');
  });
});
