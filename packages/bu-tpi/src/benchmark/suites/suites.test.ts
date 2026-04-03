/**
 * GUNKIMONO Phase 6.1: Benchmark Suites Tests
 */

import { describe, it, expect } from 'vitest';
import { AGENTIC_BENCHMARK_SUITE } from './agentic-bench.js';
import { RAG_BENCHMARK_SUITE } from './rag-bench.js';

describe('Agentic Benchmark Suite', () => {
  it('has correct metadata', () => {
    expect(AGENTIC_BENCHMARK_SUITE.id).toBe('agentic-bench-v1');
    expect(AGENTIC_BENCHMARK_SUITE.scoringMethod).toBe('weighted_category');
  });

  it('has 5 categories', () => {
    expect(AGENTIC_BENCHMARK_SUITE.categories).toHaveLength(5);
  });

  it('includes benign category for false-positive testing', () => {
    const benign = AGENTIC_BENCHMARK_SUITE.categories.find((c) => c.name === 'benign-tool-use');
    expect(benign).toBeDefined();
    expect(Object.values(benign!.expectedVerdicts).every((v) => v === 'ALLOW')).toBe(true);
  });

  it('fixture count matches category sum', () => {
    const sum = AGENTIC_BENCHMARK_SUITE.categories.reduce((s, c) => s + c.fixtureIds.length, 0);
    expect(AGENTIC_BENCHMARK_SUITE.fixtureCount).toBe(sum);
  });

  it('all attack categories expect BLOCK verdicts', () => {
    const attackCategories = AGENTIC_BENCHMARK_SUITE.categories.filter((c) => c.name !== 'benign-tool-use');
    for (const cat of attackCategories) {
      expect(Object.values(cat.expectedVerdicts).every((v) => v === 'BLOCK')).toBe(true);
    }
  });
});

describe('RAG Benchmark Suite', () => {
  it('has correct metadata', () => {
    expect(RAG_BENCHMARK_SUITE.id).toBe('rag-bench-v1');
    expect(RAG_BENCHMARK_SUITE.scoringMethod).toBe('weighted_category');
  });

  it('has 4 categories', () => {
    expect(RAG_BENCHMARK_SUITE.categories).toHaveLength(4);
  });

  it('includes clean category for false-positive testing', () => {
    const clean = RAG_BENCHMARK_SUITE.categories.find((c) => c.name === 'clean-rag');
    expect(clean).toBeDefined();
    expect(Object.values(clean!.expectedVerdicts).every((v) => v === 'ALLOW')).toBe(true);
  });

  it('fixture count matches category sum', () => {
    const sum = RAG_BENCHMARK_SUITE.categories.reduce((s, c) => s + c.fixtureIds.length, 0);
    expect(RAG_BENCHMARK_SUITE.fixtureCount).toBe(sum);
  });
});
