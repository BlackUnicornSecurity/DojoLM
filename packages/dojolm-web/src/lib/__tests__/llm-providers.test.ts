/**
 * File: __tests__/llm-providers.test.ts
 * Purpose: Tests for LLM provider adapter factory and utilities
 * Source: src/lib/llm-providers.ts
 *
 * Index:
 * - getProviderAdapter (line 34)
 * - getRegisteredProviders (line 62)
 * - validateModelConfig (line 76)
 * - testModelConfig (line 130)
 * - createTimeoutPromise (line 160)
 * - withTimeout (line 175)
 * - measureDuration (line 195)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all provider modules
const mockAdapter = {
  execute: vi.fn(),
  testConnection: vi.fn().mockResolvedValue(true),
  validateConfig: vi.fn(),
};

vi.mock('../providers/openai', () => ({ openaiProvider: { ...mockAdapter } }));
vi.mock('../providers/anthropic', () => ({ anthropicProvider: { ...mockAdapter } }));
vi.mock('../providers/ollama', () => ({ ollamaProvider: { ...mockAdapter } }));
vi.mock('../providers/lmstudio', () => ({ lmstudioProvider: { ...mockAdapter } }));
vi.mock('../providers/llamacpp', () => ({ llamacppProvider: { ...mockAdapter } }));
vi.mock('../providers/zai', () => ({ zaiProvider: { ...mockAdapter } }));
vi.mock('../providers/moonshot', () => ({ moonshotProvider: { ...mockAdapter } }));
vi.mock('bu-tpi/llm', () => ({
  googleProvider: { ...mockAdapter },
  cohereProvider: { ...mockAdapter },
  ai21Provider: { ...mockAdapter },
  replicateProvider: { ...mockAdapter },
  cloudflareProvider: { ...mockAdapter },
  createOpenAICompatibleProvider: vi.fn(() => ({ ...mockAdapter })),
  getPreset: vi.fn((id: string) => ({
    id,
    name: id,
    tier: 2,
    baseUrl: `https://${id}.example.com/v1`,
    authType: 'bearer',
    defaultModels: [`${id}-model`],
    isOpenAICompatible: true,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getProviderAdapter', () => {
  it('PRV-001: returns adapter for openai', async () => {
    const { getProviderAdapter } = await import('../llm-providers');
    const adapter = await getProviderAdapter('openai');
    expect(adapter).toBeDefined();
    expect(adapter.execute).toBeDefined();
  });

  it('PRV-002: returns adapter for anthropic', async () => {
    const { getProviderAdapter } = await import('../llm-providers');
    const adapter = await getProviderAdapter('anthropic');
    expect(adapter).toBeDefined();
  });

  it('PRV-003: returns adapter for ollama', async () => {
    const { getProviderAdapter } = await import('../llm-providers');
    const adapter = await getProviderAdapter('ollama');
    expect(adapter).toBeDefined();
  });

  it('PRV-004: throws for unknown provider', async () => {
    const { getProviderAdapter } = await import('../llm-providers');
    // Use a provider that's definitely not registered
    await expect(getProviderAdapter('nonexistent_provider' as any)).rejects.toThrow('No adapter found');
  });
});

describe('getRegisteredProviders', () => {
  it('PRV-005: returns array of registered providers', async () => {
    const { getRegisteredProviders } = await import('../llm-providers');
    const providers = await getRegisteredProviders();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThan(0);
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
    expect(providers).toContain('google');
    expect(providers).toContain('groq');
    expect(providers).toContain('ai21');
  });
});

describe('validateModelConfig', () => {
  it('PRV-006: valid config passes validation', async () => {
    const { validateModelConfig } = await import('../llm-providers');
    const result = await validateModelConfig({
      id: 'test-model',
      name: 'Test Model',
      provider: 'openai' as any,
      model: 'gpt-4',
      enabled: true,
      createdAt: '',
      updatedAt: '',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('PRV-007: missing id fails', async () => {
    const { validateModelConfig } = await import('../llm-providers');
    const result = await validateModelConfig({
      id: '',
      name: 'Test',
      provider: 'openai' as any,
      model: 'gpt-4',
      enabled: true,
      createdAt: '',
      updatedAt: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ID'))).toBe(true);
  });

  it('PRV-008: missing name fails', async () => {
    const { validateModelConfig } = await import('../llm-providers');
    const result = await validateModelConfig({
      id: 'test',
      name: '',
      provider: 'openai' as any,
      model: 'gpt-4',
      enabled: true,
      createdAt: '',
      updatedAt: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('name'))).toBe(true);
  });

  it('PRV-009: temperature out of range fails', async () => {
    const { validateModelConfig } = await import('../llm-providers');
    const result = await validateModelConfig({
      id: 'test',
      name: 'Test',
      provider: 'openai' as any,
      model: 'gpt-4',
      temperature: 5,
      enabled: true,
      createdAt: '',
      updatedAt: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Temperature'))).toBe(true);
  });

  it('PRV-010: topP out of range fails', async () => {
    const { validateModelConfig } = await import('../llm-providers');
    const result = await validateModelConfig({
      id: 'test',
      name: 'Test',
      provider: 'openai' as any,
      model: 'gpt-4',
      topP: 2,
      enabled: true,
      createdAt: '',
      updatedAt: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Top-p'))).toBe(true);
  });
});

describe('testModelConfig', () => {
  it('PRV-011: successful connection returns success', async () => {
    const { testModelConfig } = await import('../llm-providers');
    const result = await testModelConfig({
      id: 'test',
      name: 'Test',
      provider: 'openai' as any,
      model: 'gpt-4',
      enabled: true,
      createdAt: '',
      updatedAt: '',
    });
    expect(result.success).toBe(true);
    expect(result.durationMs).toBeDefined();
  });

  it('PRV-012: invalid config returns failure without connecting', async () => {
    const { testModelConfig } = await import('../llm-providers');
    const result = await testModelConfig({
      id: '',
      name: '',
      provider: '' as any,
      model: '',
      enabled: true,
      createdAt: '',
      updatedAt: '',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('createTimeoutPromise', () => {
  it('PRV-013: rejects after specified timeout', async () => {
    const { createTimeoutPromise } = await import('../llm-providers');
    const promise = createTimeoutPromise(10, 'test-op');
    await expect(promise).rejects.toThrow('test-op timed out after 10ms');
  });
});

describe('withTimeout', () => {
  it('PRV-014: resolves when promise finishes before timeout', async () => {
    const { withTimeout } = await import('../llm-providers');
    const result = await withTimeout(
      Promise.resolve('done'),
      5000,
      'test'
    );
    expect(result).toBe('done');
  });

  it('PRV-015: rejects when promise exceeds timeout', async () => {
    const { withTimeout } = await import('../llm-providers');
    const slowPromise = new Promise(resolve => setTimeout(resolve, 10000));
    await expect(
      withTimeout(slowPromise, 10, 'slow-op')
    ).rejects.toThrow('slow-op timed out');
  });
});

describe('measureDuration', () => {
  it('PRV-016: returns positive duration', async () => {
    const { measureDuration } = await import('../llm-providers');
    const start = Date.now() - 100;
    const duration = measureDuration(start);
    expect(duration).toBeGreaterThanOrEqual(100);
  });
});
