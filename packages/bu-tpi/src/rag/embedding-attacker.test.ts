/**
 * SUIJUTSU: Embedding Attacker Tests
 */

import { describe, it, expect } from 'vitest';
import {
  perturbEmbedding,
  generateSimilarityGamingPayload,
  type PerturbationStrategy,
} from './embedding-attacker.js';

describe('perturbEmbedding', () => {
  const strategies: PerturbationStrategy[] = ['noise-injection', 'synonym-substitution', 'keyword-stuffing'];

  for (const strategy of strategies) {
    it(`applies ${strategy} strategy`, () => {
      const result = perturbEmbedding('help with system security access', strategy);
      expect(result.original).toBe('help with system security access');
      expect(result.strategy).toBe(strategy);
      expect(typeof result.perturbed).toBe('string');
      expect(result.changeCount).toBeGreaterThanOrEqual(0);
    });
  }

  it('noise-injection inserts zero-width chars or homoglyphs', () => {
    const result = perturbEmbedding('test input text', 'noise-injection');
    expect(result.perturbed).not.toBe(result.original);
    expect(result.changeCount).toBeGreaterThan(0);
  });

  it('synonym-substitution replaces known words', () => {
    const result = perturbEmbedding('help with information access', 'synonym-substitution');
    expect(result.changeCount).toBeGreaterThan(0);
    // 'help' should be replaced by synonym
    expect(result.perturbed).not.toContain('help');
  });

  it('keyword-stuffing appends keywords', () => {
    const result = perturbEmbedding('some longer text with multiple words here', 'keyword-stuffing');
    expect(result.perturbed.length).toBeGreaterThan(result.original.length);
    expect(result.changeCount).toBeGreaterThan(0);
  });
});

describe('generateSimilarityGamingPayload', () => {
  it('generates payload from target query', () => {
    const result = generateSimilarityGamingPayload('how to access system settings');

    expect(result.targetQuery).toBe('how to access system settings');
    expect(result.payload.length).toBeGreaterThan(0);
    expect(result.strategy).toBe('keyword-density-maximization');
    expect(result.estimatedBoost).toBeGreaterThan(0);
    expect(result.estimatedBoost).toBeLessThanOrEqual(0.95);
  });

  it('includes query terms in payload', () => {
    const result = generateSimilarityGamingPayload('security access');
    expect(result.payload.toLowerCase()).toContain('security');
    expect(result.payload.toLowerCase()).toContain('access');
  });

  it('handles short query', () => {
    const result = generateSimilarityGamingPayload('test');
    expect(result.payload.length).toBeGreaterThan(0);
  });
});
