/**
 * SAGE EdgeFuzz Mutation Operators Tests
 */

import { describe, it, expect } from 'vitest';
import { SeededRNG } from './mutation-engine.js';
import {
  EDGEFUZZ_MUTATION_OPERATORS,
  lengthExtreme,
  encodingWrapMulti,
  structuralNest,
  scriptMix,
  applyEdgeFuzzMutation,
  composeWithCoreMutation,
} from './edgefuzz-mutations.js';

describe('EDGEFUZZ_MUTATION_OPERATORS', () => {
  it('defines 4 operators', () => {
    expect(EDGEFUZZ_MUTATION_OPERATORS).toHaveLength(4);
    expect(EDGEFUZZ_MUTATION_OPERATORS).toContain('length-extreme');
    expect(EDGEFUZZ_MUTATION_OPERATORS).toContain('encoding-wrap-multi');
    expect(EDGEFUZZ_MUTATION_OPERATORS).toContain('structural-nest');
    expect(EDGEFUZZ_MUTATION_OPERATORS).toContain('script-mix');
  });
});

describe('lengthExtreme', () => {
  it('pads text to extreme length', () => {
    const rng = new SeededRNG('test-seed');
    const result = lengthExtreme('short text', rng);
    expect(result.mutated.length).toBeGreaterThan(10000);
    expect(result.original).toBe('short text');
    expect(result.changeCount).toBeGreaterThan(0);
  });
});

describe('encodingWrapMulti', () => {
  it('applies 2-3 encoding layers', () => {
    const rng = new SeededRNG('test-encode');
    const result = encodingWrapMulti('hello world', rng);
    expect(result.mutated).not.toBe('hello world');
    expect(result.description).toContain('encoding layers');
    expect(result.changeCount).toBeGreaterThanOrEqual(2);
  });
});

describe('structuralNest', () => {
  it('wraps text in deeply nested structure', () => {
    const rng = new SeededRNG('test-nest');
    const result = structuralNest('payload', rng);
    expect(result.mutated.length).toBeGreaterThan('payload'.length);
    expect(result.changeCount).toBeGreaterThanOrEqual(10);
    // Should be either JSON or XML nested
    const isJson = result.mutated.includes('level_');
    expect(isJson).toBe(true);
  });
});

describe('scriptMix', () => {
  it('inserts code snippets into text', () => {
    const rng = new SeededRNG('test-script');
    const result = scriptMix('this is a test sentence with some words', rng);
    expect(result.mutated).not.toBe(result.original);
    expect(result.changeCount).toBeGreaterThan(0);
  });
});

describe('applyEdgeFuzzMutation', () => {
  it('applies a random operator deterministically', () => {
    const rng1 = new SeededRNG('same-seed');
    const rng2 = new SeededRNG('same-seed');
    const r1 = applyEdgeFuzzMutation('test', rng1);
    const r2 = applyEdgeFuzzMutation('test', rng2);
    expect(r1.mutated).toBe(r2.mutated);
  });
});

describe('composeWithCoreMutation', () => {
  it('chains core + edgefuzz mutations', () => {
    const rng = new SeededRNG('compose-test');
    const coreMutate = (text: string, _rng: SeededRNG) => ({
      original: text,
      mutated: text + '-core',
      operator: 'test' as never,
      description: 'test',
      changeCount: 1,
    });

    const { coreResult, edgeFuzzResult } = composeWithCoreMutation('input', rng, coreMutate);
    expect(coreResult.mutated).toBe('input-core');
    expect(edgeFuzzResult.original).toBe('input-core');
    expect(edgeFuzzResult.mutated).not.toBe('input-core');
  });
});
