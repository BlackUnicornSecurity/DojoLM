/**
 * Tests for grammar.ts — createGrammar, generateInput, mutateInput, built-in grammars
 */

import { describe, it, expect } from 'vitest';
import {
  createGrammar,
  generateInput,
  mutateInput,
  PROMPT_GRAMMAR,
  ENCODING_GRAMMAR,
  STRUCTURAL_GRAMMAR,
} from './grammar.js';
import type { GrammarRule } from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

// ---------- tests ----------

describe('grammar.ts', () => {
  // GR-001
  it('GR-001: createGrammar returns grammar with rules and rng', () => {
    const grammar = createGrammar(PROMPT_GRAMMAR, 'seed1');
    expect(grammar.rules).toBe(PROMPT_GRAMMAR);
    expect(grammar.rng).toBeDefined();
    expect(typeof grammar.rng.next).toBe('function');
  });

  // GR-002
  it('GR-002: createGrammar uses default seed when none provided', () => {
    const g1 = createGrammar(PROMPT_GRAMMAR);
    const g2 = createGrammar(PROMPT_GRAMMAR);
    // Same default seed produces same first output
    expect(generateInput(g1)).toBe(generateInput(g2));
  });

  // GR-003
  it('GR-003: generateInput is deterministic with same seed', () => {
    const g1 = createGrammar(PROMPT_GRAMMAR, 'deterministic');
    const g2 = createGrammar(PROMPT_GRAMMAR, 'deterministic');
    const out1 = generateInput(g1);
    const out2 = generateInput(g2);
    expect(out1).toBe(out2);
    expect(out1.length).toBeGreaterThan(0);
  });

  // GR-004
  it('GR-004: generateInput returns empty string for empty rules', () => {
    const grammar = createGrammar([], 'empty');
    expect(generateInput(grammar)).toBe('');
  });

  // GR-005
  it('GR-005: generateInput respects MAX_INPUT_LENGTH', () => {
    const hugeRule: GrammarRule[] = [
      { name: 'huge', pattern: '{REPEAT:100:' + 'x'.repeat(10000) + '}', weight: 1, category: 'test' },
    ];
    const grammar = createGrammar(hugeRule, 'huge');
    const input = generateInput(grammar);
    expect(input.length).toBeLessThanOrEqual(MAX_INPUT_LENGTH);
  });

  // GR-006
  it('GR-006: generateInput expands {RANDOM_STRING} placeholder', () => {
    const rules: GrammarRule[] = [
      { name: 'rand', pattern: 'prefix-{RANDOM_STRING}-suffix', weight: 1, category: 'test' },
    ];
    const grammar = createGrammar(rules, 'randstr');
    const input = generateInput(grammar);
    expect(input).toMatch(/^prefix-.+-suffix$/);
    expect(input.length).toBeGreaterThan('prefix--suffix'.length);
  });

  // GR-007
  it('GR-007: generateInput expands {RANDOM_INT} placeholder', () => {
    const rules: GrammarRule[] = [
      { name: 'int', pattern: 'num={RANDOM_INT}', weight: 1, category: 'test' },
    ];
    const grammar = createGrammar(rules, 'randint');
    const input = generateInput(grammar);
    expect(input).toMatch(/^num=\d+$/);
  });

  // GR-008
  it('GR-008: generateInput expands {CHOICE:a|b|c} placeholder', () => {
    const rules: GrammarRule[] = [
      { name: 'choice', pattern: '{CHOICE:alpha|beta|gamma}', weight: 1, category: 'test' },
    ];
    const grammar = createGrammar(rules, 'choice-seed');
    const input = generateInput(grammar);
    expect(['alpha', 'beta', 'gamma']).toContain(input);
  });

  // GR-009
  it('GR-009: generateInput expands {REPEAT:n:text} placeholder', () => {
    const rules: GrammarRule[] = [
      { name: 'repeat', pattern: '{REPEAT:5:ab}', weight: 1, category: 'test' },
    ];
    const grammar = createGrammar(rules, 'repeat-seed');
    const input = generateInput(grammar);
    expect(input).toBe('ababababab');
  });

  // GR-010
  it('GR-010: generateInput caps REPEAT at 100 repetitions', () => {
    const rules: GrammarRule[] = [
      { name: 'bigrepeat', pattern: '{REPEAT:9999:x}', weight: 1, category: 'test' },
    ];
    const grammar = createGrammar(rules, 'cap');
    const input = generateInput(grammar);
    expect(input.length).toBe(100);
  });

  // GR-011
  it('GR-011: mutateInput produces different output with high mutation rate', () => {
    const original = 'The quick brown fox jumps over the lazy dog';
    const mutated = mutateInput(original, 0.9, 'high-rate');
    expect(mutated).not.toBe(original);
  });

  // GR-012
  it('GR-012: mutateInput is deterministic with same seed', () => {
    const original = 'Hello World!';
    const m1 = mutateInput(original, 0.5, 'same-seed');
    const m2 = mutateInput(original, 0.5, 'same-seed');
    expect(m1).toBe(m2);
  });

  // GR-013
  it('GR-013: mutateInput truncates oversized input', () => {
    const oversized = 'x'.repeat(MAX_INPUT_LENGTH + 100);
    const result = mutateInput(oversized, 0.1, 'trunc');
    expect(result.length).toBeLessThanOrEqual(MAX_INPUT_LENGTH);
  });

  // GR-014
  it('GR-014: mutateInput output stays within MAX_INPUT_LENGTH', () => {
    const input = 'a'.repeat(1000);
    const result = mutateInput(input, 0.5, 'bound');
    expect(result.length).toBeLessThanOrEqual(MAX_INPUT_LENGTH);
  });

  // GR-015
  it('GR-015: PROMPT_GRAMMAR has expected categories', () => {
    expect(PROMPT_GRAMMAR.length).toBeGreaterThan(0);
    const categories = PROMPT_GRAMMAR.map((r) => r.category);
    expect(categories).toContain('prompt-injection');
  });

  // GR-016
  it('GR-016: ENCODING_GRAMMAR has expected categories', () => {
    expect(ENCODING_GRAMMAR.length).toBeGreaterThan(0);
    const categories = ENCODING_GRAMMAR.map((r) => r.category);
    expect(categories).toContain('encoded');
  });

  // GR-017
  it('GR-017: STRUCTURAL_GRAMMAR has expected categories', () => {
    expect(STRUCTURAL_GRAMMAR.length).toBeGreaterThan(0);
    const names = STRUCTURAL_GRAMMAR.map((r) => r.name);
    expect(names).toContain('xml-injection');
  });

  // GR-018
  it('GR-018: generateInput weighted selection favors higher-weight rules', () => {
    const rules: GrammarRule[] = [
      { name: 'rare', pattern: 'RARE', weight: 1, category: 'test' },
      { name: 'common', pattern: 'COMMON', weight: 1000, category: 'test' },
    ];
    let commonCount = 0;
    for (let i = 0; i < 50; i++) {
      const g = createGrammar(rules, `weight-${i}`);
      if (generateInput(g) === 'COMMON') commonCount++;
    }
    // With 1000:1 weighting, vast majority should be COMMON
    expect(commonCount).toBeGreaterThan(40);
  });
});
