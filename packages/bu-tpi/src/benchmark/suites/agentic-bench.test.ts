/**
 * Tests for agentic-bench suite
 */

import { describe, it, expect } from 'vitest';
import { AGENTIC_BENCHMARK_SUITE, AGENTIC_CATEGORY_DIFFICULTY } from './agentic-bench.js';

describe('AGENTIC_BENCHMARK_SUITE', () => {
  it('has correct id and name', () => {
    expect(AGENTIC_BENCHMARK_SUITE.id).toBe('agentic-bench-v1');
    expect(AGENTIC_BENCHMARK_SUITE.name).toBe('Agentic Security Benchmark');
  });

  it('has 8 categories', () => {
    expect(AGENTIC_BENCHMARK_SUITE.categories).toHaveLength(8);
  });

  it('fixtureCount matches sum of category fixture lengths', () => {
    const counted = AGENTIC_BENCHMARK_SUITE.categories.reduce(
      (sum, cat) => sum + cat.fixtureIds.length, 0,
    );
    expect(AGENTIC_BENCHMARK_SUITE.fixtureCount).toBe(counted);
  });

  it('benign-tool-use category has all ALLOW verdicts', () => {
    const benign = AGENTIC_BENCHMARK_SUITE.categories.find(c => c.name === 'benign-tool-use');
    expect(benign).toBeDefined();
    for (const id of benign!.fixtureIds) {
      expect(benign!.expectedVerdicts[id]).toBe('ALLOW');
    }
  });

  it('attack categories have BLOCK verdicts for attack fixtures', () => {
    const toolInj = AGENTIC_BENCHMARK_SUITE.categories.find(c => c.name === 'tool-injection');
    expect(toolInj).toBeDefined();
    const attackFixtures = toolInj!.fixtureIds.filter(id => !id.includes('-clean-'));
    for (const id of attackFixtures) {
      expect(toolInj!.expectedVerdicts[id]).toBe('BLOCK');
    }
  });
});

describe('AGENTIC_CATEGORY_DIFFICULTY', () => {
  it('maps all 8 categories to difficulty tiers', () => {
    expect(Object.keys(AGENTIC_CATEGORY_DIFFICULTY)).toHaveLength(8);
    expect(AGENTIC_CATEGORY_DIFFICULTY['tool-injection']).toBe('medium');
    expect(AGENTIC_CATEGORY_DIFFICULTY['delegation-attack']).toBe('hard');
    expect(AGENTIC_CATEGORY_DIFFICULTY['benign-tool-use']).toBe('easy');
  });
});
