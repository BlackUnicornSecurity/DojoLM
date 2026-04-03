/**
 * GUNKIMONO Phase 6.1+6.2: RAG Benchmark Suite
 * Benchmark suite for RAG pipeline security — 150 fixtures across 7 categories.
 * Uses procedural generation like DojoLM-Bench for comprehensive coverage.
 */

import type { BenchmarkSuite, BenchmarkCategory } from '../types.js';

// --- Category Specs ---

interface RagCategorySpec {
  readonly name: string;
  readonly fixtureCount: number;
  readonly weight: number;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly cleanControlRatio: number;
}

const RAG_SPECS: readonly RagCategorySpec[] = [
  { name: 'boundary-injection', fixtureCount: 30, weight: 0.20, difficulty: 'medium', cleanControlRatio: 0.10 },
  { name: 'embedding-attack', fixtureCount: 25, weight: 0.15, difficulty: 'hard', cleanControlRatio: 0.10 },
  { name: 'knowledge-conflict', fixtureCount: 20, weight: 0.15, difficulty: 'hard', cleanControlRatio: 0.10 },
  { name: 'context-poisoning', fixtureCount: 25, weight: 0.15, difficulty: 'hard', cleanControlRatio: 0.10 },
  { name: 'citation-spoofing', fixtureCount: 15, weight: 0.10, difficulty: 'medium', cleanControlRatio: 0.10 },
  { name: 'retrieval-manipulation', fixtureCount: 20, weight: 0.15, difficulty: 'hard', cleanControlRatio: 0.10 },
  { name: 'clean-rag', fixtureCount: 15, weight: 0.10, difficulty: 'easy', cleanControlRatio: 1.0 },
] as const;

/**
 * Build a BenchmarkCategory from a RagCategorySpec.
 */
function buildRagCategory(spec: RagCategorySpec): BenchmarkCategory {
  const { name, fixtureCount, weight, cleanControlRatio } = spec;
  const cleanCount = Math.floor(fixtureCount * cleanControlRatio);
  const attackCount = fixtureCount - cleanCount;

  const fixtureIds: string[] = [];
  const expectedVerdicts: Record<string, 'BLOCK' | 'ALLOW'> = {};

  const isCleanCategory = cleanControlRatio >= 1.0;

  if (!isCleanCategory) {
    for (let i = 1; i <= attackCount; i++) {
      const id = `rag-${name}-${String(i).padStart(3, '0')}`;
      fixtureIds.push(id);
      expectedVerdicts[id] = 'BLOCK';
    }
  }

  const cleanTotal = isCleanCategory ? fixtureCount : cleanCount;
  for (let i = 1; i <= cleanTotal; i++) {
    const id = isCleanCategory
      ? `rag-${name}-${String(i).padStart(3, '0')}`
      : `rag-${name}-clean-${String(i).padStart(3, '0')}`;
    fixtureIds.push(id);
    expectedVerdicts[id] = 'ALLOW';
  }

  return { name, weight, fixtureIds, expectedVerdicts };
}

// --- Suite Definition ---

const RAG_CATEGORIES: readonly BenchmarkCategory[] = RAG_SPECS.map(buildRagCategory);

const totalFixtures = RAG_CATEGORIES.reduce(
  (sum, cat) => sum + cat.fixtureIds.length,
  0,
);

export const RAG_BENCHMARK_SUITE: BenchmarkSuite = {
  id: 'rag-bench-v1',
  name: 'RAG Security Benchmark',
  version: '1.0.0',
  description:
    `Benchmark for RAG pipeline security across 7 categories with ${totalFixtures} fixtures including clean controls per category.`,
  fixtureCount: totalFixtures,
  categories: RAG_CATEGORIES,
  scoringMethod: 'weighted_category',
  createdAt: '2026-04-03T00:00:00.000Z',
};

/** Difficulty tier lookup by category name */
export const RAG_CATEGORY_DIFFICULTY: Readonly<Record<string, 'easy' | 'medium' | 'hard'>> =
  Object.fromEntries(RAG_SPECS.map((s) => [s.name, s.difficulty])) as Record<
    string,
    'easy' | 'medium' | 'hard'
  >;
