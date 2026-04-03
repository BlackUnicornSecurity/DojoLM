import { describe, it, expect } from 'vitest';
import * as mod from './index.js';

describe('llm/providers exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports provider classes', () => {
    expect(mod.OpenAICompatibleProvider).toBeTypeOf('function');
    expect(mod.AnthropicProvider).toBeTypeOf('function');
    expect(mod.GoogleProvider).toBeTypeOf('function');
    expect(mod.CohereProvider).toBeTypeOf('function');
  });

  it('exports provider instances and Sensei provider', () => {
    expect(mod.anthropicProvider).toBeDefined();
    expect(mod.googleProvider).toBeDefined();
    expect(mod.SenseiProvider).toBeTypeOf('function');
    expect(mod.CustomProvider).toBeTypeOf('function');
  });
});
