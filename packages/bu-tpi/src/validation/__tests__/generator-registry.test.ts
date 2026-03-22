/**
 * K2.1 — Generator Registry & Seeded RNG Tests
 *
 * Validates deterministic RNG, generator registration,
 * and module-aware variation generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SeededRNG,
  GeneratorRegistry,
  generatorRegistry,
} from '../generators/generator-registry.js';
import type { VariationGenerator, GeneratedSampleOutput } from '../generators/generator-registry.js';
import { SCHEMA_VERSION, type GroundTruthSample } from '../types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = '2026-03-21T00:00:00.000Z';
const HASH_64 = 'a'.repeat(64);

const baseSample: GroundTruthSample = {
  schema_version: SCHEMA_VERSION,
  id: 'gt-001',
  source_file: 'fixtures/encoded/test-001.txt',
  content_hash: HASH_64,
  content_type: 'text',
  expected_verdict: 'malicious',
  expected_modules: ['encoding-engine'],
  expected_severity: 'CRITICAL',
  expected_categories: ['ENCODING_OBFUSCATION'],
  difficulty: 'moderate',
  source_type: 'synthetic',
  reviewer_1: { id: 'r1', verdict: 'malicious', timestamp: NOW },
  reviewer_2: { id: 'r2', verdict: 'malicious', timestamp: NOW },
  independent_agreement: true,
  holdout: false,
};

function createMockGenerator(id: string): VariationGenerator {
  return {
    id,
    version: '1.0.0',
    description: `Mock ${id} generator`,
    variationType: id,
    capabilities: ['basic_injection'],
    generate(_sample, content, rng): GeneratedSampleOutput[] {
      return [{
        content: `${content}_${id}_${rng.nextInt(0, 100)}`,
        expected_verdict: 'malicious',
        expected_modules: ['encoding-engine'],
        variation_type: id,
        difficulty: 'moderate',
      }];
    },
  };
}

// ---------------------------------------------------------------------------
// SeededRNG Tests
// ---------------------------------------------------------------------------

describe('K2.1 — SeededRNG', () => {
  it('produces values in [0, 1) range', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 1000; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('is deterministic: same seed produces same sequence', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);
    for (let i = 0; i < 1000; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(43);
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it('nextInt returns values in [min, max] range', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextInt(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
    }
  });

  it('nextBool returns booleans', () => {
    const rng = new SeededRNG(42);
    const results = Array.from({ length: 100 }, () => rng.nextBool());
    expect(results.some(b => b === true)).toBe(true);
    expect(results.some(b => b === false)).toBe(true);
  });

  it('pick selects from array', () => {
    const rng = new SeededRNG(42);
    const items = ['a', 'b', 'c', 'd'] as const;
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('pick throws on empty array', () => {
    const rng = new SeededRNG(42);
    expect(() => rng.pick([])).toThrow('Cannot pick from empty array');
  });

  it('shuffle returns all elements', () => {
    const rng = new SeededRNG(42);
    const items = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle(items);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('shuffle does not mutate original', () => {
    const rng = new SeededRNG(42);
    const items = [1, 2, 3, 4, 5];
    const original = [...items];
    rng.shuffle(items);
    expect(items).toEqual(original);
  });

  it('shuffle is deterministic', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(rng1.shuffle(items)).toEqual(rng2.shuffle(items));
  });

  it('never produces 1.0 (0x100000000 divisor)', () => {
    // Verify with 10000 samples — the divisor bug was a known issue
    const rng = new SeededRNG(0);
    for (let i = 0; i < 10000; i++) {
      expect(rng.next()).toBeLessThan(1.0);
    }
  });
});

// ---------------------------------------------------------------------------
// GeneratorRegistry Tests
// ---------------------------------------------------------------------------

describe('K2.1 — GeneratorRegistry', () => {
  let registry: GeneratorRegistry;

  beforeEach(() => {
    registry = new GeneratorRegistry();
  });

  it('registers a generator', () => {
    const gen = createMockGenerator('test-gen');
    registry.register(gen);
    expect(registry.has('test-gen')).toBe(true);
    expect(registry.size).toBe(1);
  });

  it('throws on duplicate registration', () => {
    const gen = createMockGenerator('test-gen');
    registry.register(gen);
    expect(() => registry.register(gen)).toThrow("'test-gen' is already registered");
  });

  it('unregisters a generator', () => {
    const gen = createMockGenerator('test-gen');
    registry.register(gen);
    expect(registry.unregister('test-gen')).toBe(true);
    expect(registry.has('test-gen')).toBe(false);
  });

  it('unregister returns false for non-existent', () => {
    expect(registry.unregister('nonexistent')).toBe(false);
  });

  it('gets a generator by id', () => {
    const gen = createMockGenerator('test-gen');
    registry.register(gen);
    expect(registry.get('test-gen')).toBe(gen);
  });

  it('returns undefined for missing generator', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('lists all registered generators', () => {
    registry.register(createMockGenerator('gen-a'));
    registry.register(createMockGenerator('gen-b'));
    const list = registry.list();
    expect(list).toHaveLength(2);
    expect(list.map(g => g.id).sort()).toEqual(['gen-a', 'gen-b']);
  });

  it('generateAll produces samples from all generators', () => {
    registry.register(createMockGenerator('gen-a'));
    registry.register(createMockGenerator('gen-b'));

    const results = registry.generateAll(baseSample, 'test content', 42);
    expect(results).toHaveLength(2);
    expect(results[0].base_sample_id).toBe('gt-001');
    expect(results[0].generator_id).toBe('gen-a');
    expect(results[1].generator_id).toBe('gen-b');
  });

  it('generateAll is deterministic', () => {
    registry.register(createMockGenerator('gen-a'));
    registry.register(createMockGenerator('gen-b'));

    const results1 = registry.generateAll(baseSample, 'test content', 42);
    const results2 = registry.generateAll(baseSample, 'test content', 42);
    expect(results1).toEqual(results2);
  });

  it('generateAll assigns valid content_hash', () => {
    registry.register(createMockGenerator('gen-a'));
    const results = registry.generateAll(baseSample, 'test', 42);
    expect(results[0].content_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generateAll filters modules by capabilities', () => {
    const gen: VariationGenerator = {
      id: 'advanced-gen',
      version: '1.0.0',
      description: 'Advanced generator',
      variationType: 'advanced',
      capabilities: ['unicode_homoglyph'],
      generate(_sample, content): GeneratedSampleOutput[] {
        return [{
          content: `${content}_modified`,
          expected_verdict: 'malicious',
          expected_modules: ['encoding-engine', 'pii-detector'],
          variation_type: 'unicode',
          difficulty: 'advanced',
        }];
      },
    };
    registry.register(gen);

    // encoding-engine claims unicode_homoglyph, pii-detector does not
    const capabilities = new Map([
      ['encoding-engine', ['unicode_homoglyph', 'base64']],
      ['pii-detector', ['pii_detection']],
    ]);

    const results = registry.generateAll(baseSample, 'test', 42, capabilities);
    // pii-detector should be filtered out
    expect(results[0].expected_modules).toEqual(['encoding-engine']);
  });
});

// ---------------------------------------------------------------------------
// Singleton Registry Tests
// ---------------------------------------------------------------------------

describe('K2.1 — Singleton generatorRegistry', () => {
  it('exists and is a GeneratorRegistry', () => {
    expect(generatorRegistry).toBeInstanceOf(GeneratorRegistry);
  });
});
