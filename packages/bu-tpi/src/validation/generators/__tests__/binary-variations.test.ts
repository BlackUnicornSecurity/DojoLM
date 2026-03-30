/**
 * Tests for KATANA Binary Variation Generator (K2.11)
 */

import { describe, it, expect } from 'vitest';
import { binaryVariationGenerator } from '../binary-variations.js';
import { SeededRNG } from '../generator-registry.js';
import { SCHEMA_VERSION, type GroundTruthSample } from '../../types.js';

function makeSample(overrides: Partial<GroundTruthSample> = {}): GroundTruthSample {
  return {
    schema_version: SCHEMA_VERSION,
    id: 'bin-sample-001',
    source_file: 'fixtures/text/test.txt',
    content_hash: 'a'.repeat(64),
    content_type: 'text',
    expected_verdict: 'malicious',
    expected_modules: ['core-patterns'],
    expected_severity: 'WARNING',
    expected_categories: ['prompt-injection'],
    difficulty: 'moderate',
    source_type: 'synthetic',
    reviewer_1: { id: 'r1', verdict: 'malicious', timestamp: '2026-01-01T00:00:00Z' },
    reviewer_2: { id: 'r2', verdict: 'malicious', timestamp: '2026-01-01T00:00:00Z' },
    independent_agreement: true,
    holdout: false,
    ...overrides,
  };
}

describe('binaryVariationGenerator', () => {
  it('has correct metadata', () => {
    expect(binaryVariationGenerator.id).toBe('binary-variations');
    expect(binaryVariationGenerator.version).toBe('1.0.0');
    expect(binaryVariationGenerator.variationType).toBe('binary');
    expect(binaryVariationGenerator.capabilities).toContain('binary_metadata_injection');
  });

  it('generates 5-7 binary metadata variations for malicious text samples', () => {
    const sample = makeSample();
    const rng = new SeededRNG(42);
    const results = binaryVariationGenerator.generate(sample, 'malicious payload content here', rng);

    expect(results.length).toBeGreaterThanOrEqual(5);
    expect(results.length).toBeLessThanOrEqual(7);

    for (const r of results) {
      expect(r.expected_verdict).toBe('malicious');
      expect(r.variation_type).toMatch(/^binary:/);
      expect(r.difficulty).toBe('advanced');
      expect(r.content.length).toBeGreaterThan(0);
      expect(r.expected_modules.length).toBeGreaterThan(0);
    }
  });

  it('returns empty for non-text content_type', () => {
    const sample = makeSample({ content_type: 'binary' });
    const rng = new SeededRNG(42);
    const results = binaryVariationGenerator.generate(sample, 'some content', rng);
    expect(results).toEqual([]);
  });

  it('returns empty for clean samples', () => {
    const sample = makeSample({ expected_verdict: 'clean' });
    const rng = new SeededRNG(42);
    const results = binaryVariationGenerator.generate(sample, 'some safe content', rng);
    expect(results).toEqual([]);
  });

  it('returns empty for short content', () => {
    const sample = makeSample();
    const rng = new SeededRNG(42);
    const results = binaryVariationGenerator.generate(sample, 'hi', rng);
    expect(results).toEqual([]);
  });

  it('produces deterministic output with same seed', () => {
    const sample = makeSample();
    const r1 = binaryVariationGenerator.generate(sample, 'test payload', new SeededRNG(42));
    const r2 = binaryVariationGenerator.generate(sample, 'test payload', new SeededRNG(42));
    expect(r1.map(o => o.content)).toEqual(r2.map(o => o.content));
    expect(r1.map(o => o.variation_type)).toEqual(r2.map(o => o.variation_type));
  });

  it('includes format-specific modules in expected_modules', () => {
    const sample = makeSample();
    const rng = new SeededRNG(42);
    const results = binaryVariationGenerator.generate(sample, 'test binary payload content', rng);
    const allModules = results.flatMap(r => r.expected_modules);
    // Should include at least one binary-specific module
    const binaryModules = ['image-scanner', 'audio-scanner', 'document-pdf', 'document-office'];
    expect(allModules.some(m => binaryModules.includes(m))).toBe(true);
  });
});
