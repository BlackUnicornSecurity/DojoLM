/**
 * Tests for rag-bench suite
 */

import { describe, it, expect } from 'vitest';
import { RAG_BENCHMARK_SUITE, RAG_CATEGORY_DIFFICULTY } from './rag-bench.js';

describe('RAG_BENCHMARK_SUITE', () => {
  it('has correct id', () => {
    expect(RAG_BENCHMARK_SUITE.id).toBe('rag-bench-v1');
  });

  it('has 7 categories', () => {
    expect(RAG_BENCHMARK_SUITE.categories).toHaveLength(7);
  });

  it('fixtureCount matches sum of category fixtures', () => {
    const counted = RAG_BENCHMARK_SUITE.categories.reduce(
      (sum, cat) => sum + cat.fixtureIds.length, 0,
    );
    expect(RAG_BENCHMARK_SUITE.fixtureCount).toBe(counted);
  });

  it('clean-rag category has all ALLOW verdicts', () => {
    const cleanCat = RAG_BENCHMARK_SUITE.categories.find(c => c.name === 'clean-rag');
    expect(cleanCat).toBeDefined();
    for (const id of cleanCat!.fixtureIds) {
      expect(cleanCat!.expectedVerdicts[id]).toBe('ALLOW');
    }
  });

  it('attack categories have BLOCK verdicts for non-clean fixtures', () => {
    const boundary = RAG_BENCHMARK_SUITE.categories.find(c => c.name === 'boundary-injection');
    expect(boundary).toBeDefined();
    const attackIds = boundary!.fixtureIds.filter(id => !id.includes('-clean-'));
    for (const id of attackIds) {
      expect(boundary!.expectedVerdicts[id]).toBe('BLOCK');
    }
  });
});

describe('RAG_CATEGORY_DIFFICULTY', () => {
  it('maps all 7 categories', () => {
    expect(Object.keys(RAG_CATEGORY_DIFFICULTY)).toHaveLength(7);
  });

  it('clean-rag is easy and embedding-attack is hard', () => {
    expect(RAG_CATEGORY_DIFFICULTY['clean-rag']).toBe('easy');
    expect(RAG_CATEGORY_DIFFICULTY['embedding-attack']).toBe('hard');
  });
});
