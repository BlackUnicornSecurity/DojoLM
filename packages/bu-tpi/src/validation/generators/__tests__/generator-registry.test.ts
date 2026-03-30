/**
 * Tests for KATANA Generator Registry & Seeded RNG (K2.1)
 */

import { describe, it, expect } from 'vitest';
import {
  SeededRNG,
  GeneratorRegistry,
  type VariationGenerator,
  type GeneratedSampleOutput,
} from '../generator-registry.js';
import { SCHEMA_VERSION, type GroundTruthSample } from '../../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGroundTruthSample(overrides: Partial<GroundTruthSample> = {}): GroundTruthSample {
  return {
    schema_version: SCHEMA_VERSION,
    id: 'test-sample-001',
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

function makeStubGenerator(id: string, outputs: GeneratedSampleOutput[] = []): VariationGenerator {
  return {
    id,
    version: '1.0.0',
    description: `Stub generator ${id}`,
    variationType: 'stub',
    capabilities: ['stub_capability'],
    generate: () => outputs,
  };
}

// ---------------------------------------------------------------------------
// SeededRNG
// ---------------------------------------------------------------------------

describe('SeededRNG', () => {
  it('produces deterministic output for the same seed', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);
    const values1 = Array.from({ length: 10 }, () => rng1.next());
    const values2 = Array.from({ length: 10 }, () => rng2.next());
    expect(values1).toEqual(values2);
  });

  it('produces different output for different seeds', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(99);
    const values1 = Array.from({ length: 10 }, () => rng1.next());
    const values2 = Array.from({ length: 10 }, () => rng2.next());
    expect(values1).not.toEqual(values2);
  });

  it('next() returns values in [0, 1) range', () => {
    const rng = new SeededRNG(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt() returns values in [min, max] inclusive', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 200; i++) {
      const v = rng.nextInt(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('nextBool() returns booleans', () => {
    const rng = new SeededRNG(42);
    const results = Array.from({ length: 100 }, () => rng.nextBool(0.5));
    expect(results.some(b => b === true)).toBe(true);
    expect(results.some(b => b === false)).toBe(true);
  });

  it('nextBool(1) always returns true', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 50; i++) {
      expect(rng.nextBool(1)).toBe(true);
    }
  });

  it('nextBool(0) always returns false', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 50; i++) {
      expect(rng.nextBool(0)).toBe(false);
    }
  });

  it('pick() selects from array deterministically', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);
    const picks1 = Array.from({ length: 10 }, () => rng1.pick(arr));
    const picks2 = Array.from({ length: 10 }, () => rng2.pick(arr));
    expect(picks1).toEqual(picks2);
  });

  it('pick() throws on empty array', () => {
    const rng = new SeededRNG(42);
    expect(() => rng.pick([])).toThrow('Cannot pick from empty array');
  });

  it('shuffle() returns a new array without mutating original', () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    const rng = new SeededRNG(42);
    const shuffled = rng.shuffle(arr);
    expect(arr).toEqual(original);
    expect(shuffled).toHaveLength(arr.length);
    expect(new Set(shuffled)).toEqual(new Set(arr));
  });

  it('shuffle() is deterministic with same seed', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);
    expect(rng1.shuffle(arr)).toEqual(rng2.shuffle(arr));
  });
});

// ---------------------------------------------------------------------------
// GeneratorRegistry
// ---------------------------------------------------------------------------

describe('GeneratorRegistry', () => {
  it('registers and retrieves a generator', () => {
    const registry = new GeneratorRegistry();
    const gen = makeStubGenerator('test-gen');
    registry.register(gen);
    expect(registry.has('test-gen')).toBe(true);
    expect(registry.get('test-gen')).toBe(gen);
    expect(registry.size).toBe(1);
  });

  it('throws on duplicate registration', () => {
    const registry = new GeneratorRegistry();
    registry.register(makeStubGenerator('dup'));
    expect(() => registry.register(makeStubGenerator('dup'))).toThrow(
      "Generator 'dup' is already registered",
    );
  });

  it('unregisters a generator', () => {
    const registry = new GeneratorRegistry();
    registry.register(makeStubGenerator('removable'));
    expect(registry.unregister('removable')).toBe(true);
    expect(registry.has('removable')).toBe(false);
    expect(registry.size).toBe(0);
  });

  it('unregister returns false for non-existent generator', () => {
    const registry = new GeneratorRegistry();
    expect(registry.unregister('nope')).toBe(false);
  });

  it('list() returns all registered generators', () => {
    const registry = new GeneratorRegistry();
    registry.register(makeStubGenerator('a'));
    registry.register(makeStubGenerator('b'));
    registry.register(makeStubGenerator('c'));
    const listed = registry.list();
    expect(listed).toHaveLength(3);
    expect(listed.map(g => g.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('generateAll() produces GeneratedSample array with correct fields', () => {
    const registry = new GeneratorRegistry();
    const outputs: GeneratedSampleOutput[] = [
      {
        content: 'test variation content',
        expected_verdict: 'malicious',
        expected_modules: ['core-patterns'],
        variation_type: 'stub:test',
        difficulty: 'moderate',
      },
    ];
    registry.register(makeStubGenerator('gen-a', outputs));

    const sample = makeGroundTruthSample();
    const results = registry.generateAll(sample, 'test content', 42);

    expect(results).toHaveLength(1);
    const result = results[0];
    expect(result.schema_version).toBe(SCHEMA_VERSION);
    expect(result.id).toContain('test-sample-001::gen-a::0');
    expect(result.base_sample_id).toBe('test-sample-001');
    expect(result.generator_id).toBe('gen-a');
    expect(result.generator_version).toBe('1.0.0');
    expect(result.content).toBe('test variation content');
    expect(result.content_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.expected_verdict).toBe('malicious');
    expect(result.variation_type).toBe('stub:test');
    expect(result.difficulty).toBe('moderate');
  });

  it('generateAll() is deterministic with same seed', () => {
    const registry = new GeneratorRegistry();
    const gen: VariationGenerator = {
      id: 'det-gen',
      version: '1.0.0',
      description: 'Deterministic test generator',
      variationType: 'test',
      capabilities: ['test'],
      generate: (_sample, content, rng) => [{
        content: `${content}-${rng.next().toFixed(6)}`,
        expected_verdict: 'malicious',
        expected_modules: ['core-patterns'],
        variation_type: 'test:det',
        difficulty: 'moderate',
      }],
    };
    registry.register(gen);

    const sample = makeGroundTruthSample();
    const r1 = registry.generateAll(sample, 'payload', 42);
    const r2 = registry.generateAll(sample, 'payload', 42);
    expect(r1[0].content).toBe(r2[0].content);
    expect(r1[0].content_hash).toBe(r2[0].content_hash);
  });

  it('generateAll() applies module-aware capability filtering', () => {
    const registry = new GeneratorRegistry();
    const gen: VariationGenerator = {
      id: 'cap-gen',
      version: '1.0.0',
      description: 'Capability test',
      variationType: 'test',
      capabilities: ['encoding_evasion'],
      generate: () => [{
        content: 'variation',
        expected_verdict: 'malicious',
        expected_modules: ['module-a', 'module-b'],
        variation_type: 'test:cap',
        difficulty: 'moderate',
      }],
    };
    registry.register(gen);

    const sample = makeGroundTruthSample();
    // module-a claims encoding_evasion, module-b does not
    const caps = new Map<string, readonly string[]>([
      ['module-a', ['encoding_evasion']],
      ['module-b', ['structural_evasion']],
    ]);

    const results = registry.generateAll(sample, 'content', 42, caps);
    expect(results[0].expected_modules).toEqual(['module-a']);
  });
});
