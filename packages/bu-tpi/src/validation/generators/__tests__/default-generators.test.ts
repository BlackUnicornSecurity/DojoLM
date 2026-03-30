/**
 * Tests for default KATANA variation generator registration
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_VARIATION_GENERATORS,
  registerDefaultVariationGenerators,
} from '../default-generators.js';
import { GeneratorRegistry } from '../generator-registry.js';

describe('DEFAULT_VARIATION_GENERATORS', () => {
  it('contains 12 generators', () => {
    expect(DEFAULT_VARIATION_GENERATORS).toHaveLength(12);
  });

  it('includes all expected generator IDs', () => {
    const ids = DEFAULT_VARIATION_GENERATORS.map(g => g.id);
    expect(ids).toContain('encoding-variations');
    expect(ids).toContain('unicode-variations');
    expect(ids).toContain('structural-variations');
    expect(ids).toContain('paraphrase-variations');
    expect(ids).toContain('multi-turn-variations');
    expect(ids).toContain('indirect-injection-variations');
    expect(ids).toContain('semantic-evasion-variations');
    expect(ids).toContain('multilingual-variations');
    expect(ids).toContain('combination-variations');
    expect(ids).toContain('binary-variations');
    expect(ids).toContain('stress-variations');
    expect(ids).toContain('boundary-variations');
  });

  it('all generators have unique IDs', () => {
    const ids = DEFAULT_VARIATION_GENERATORS.map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('registerDefaultVariationGenerators', () => {
  it('registers all generators into a fresh registry', () => {
    const registry = new GeneratorRegistry();
    const result = registerDefaultVariationGenerators(registry);

    expect(result).toBe(registry);
    expect(registry.size).toBe(12);

    for (const gen of DEFAULT_VARIATION_GENERATORS) {
      expect(registry.has(gen.id)).toBe(true);
    }
  });

  it('skips already-registered generators (idempotent)', () => {
    const registry = new GeneratorRegistry();
    registerDefaultVariationGenerators(registry);
    // Call again should not throw
    registerDefaultVariationGenerators(registry);
    expect(registry.size).toBe(12);
  });

  it('does not overwrite pre-existing generators with same ID', () => {
    const registry = new GeneratorRegistry();
    // Pre-register a custom generator with the same ID
    const customGen = {
      id: 'encoding-variations',
      version: '99.0.0',
      description: 'Custom override',
      variationType: 'encoding',
      capabilities: ['custom'],
      generate: () => [],
    };
    registry.register(customGen);

    registerDefaultVariationGenerators(registry);

    // The custom one should still be there (not overwritten)
    const retrieved = registry.get('encoding-variations');
    expect(retrieved?.version).toBe('99.0.0');
  });
});
