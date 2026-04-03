import { describe, it, expect } from 'vitest';
import * as mod from '../llm/index.js';

describe('llm exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports error classes and utilities', () => {
    expect(mod.ProviderError).toBeTypeOf('function');
    expect(mod.RateLimitError).toBeTypeOf('function');
    expect(mod.isRetryableError).toBeTypeOf('function');
  });

  it('exports registry and provider functions', () => {
    expect(mod.registerProvider).toBeTypeOf('function');
    expect(mod.listProviders).toBeTypeOf('function');
    expect(mod.OpenAICompatibleProvider).toBeTypeOf('function');
    expect(mod.AnthropicProvider).toBeTypeOf('function');
  });
});
