/**
 * GUNKIMONO Phase 6.1+6.2: Agentic Benchmark Suite
 * Benchmark suite for agentic security testing — 200 fixtures across 8 categories.
 * Uses procedural generation like DojoLM-Bench for comprehensive coverage.
 */

import type { BenchmarkSuite, BenchmarkCategory } from '../types.js';

// --- Category Specs ---

interface AgenticCategorySpec {
  readonly name: string;
  readonly fixtureCount: number;
  readonly weight: number;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly cleanControlRatio: number;
}

const AGENTIC_SPECS: readonly AgenticCategorySpec[] = [
  { name: 'tool-injection', fixtureCount: 40, weight: 0.20, difficulty: 'medium', cleanControlRatio: 0.10 },
  { name: 'delegation-attack', fixtureCount: 30, weight: 0.15, difficulty: 'hard', cleanControlRatio: 0.10 },
  { name: 'function-hijack', fixtureCount: 30, weight: 0.15, difficulty: 'hard', cleanControlRatio: 0.10 },
  { name: 'indirect-pi', fixtureCount: 30, weight: 0.15, difficulty: 'hard', cleanControlRatio: 0.10 },
  { name: 'schema-poisoning', fixtureCount: 20, weight: 0.10, difficulty: 'hard', cleanControlRatio: 0.10 },
  { name: 'multi-agent-exploit', fixtureCount: 20, weight: 0.10, difficulty: 'hard', cleanControlRatio: 0.10 },
  { name: 'capability-escalation', fixtureCount: 15, weight: 0.05, difficulty: 'medium', cleanControlRatio: 0.10 },
  { name: 'benign-tool-use', fixtureCount: 15, weight: 0.10, difficulty: 'easy', cleanControlRatio: 1.0 },
] as const;

/**
 * Build a BenchmarkCategory from an AgenticCategorySpec.
 */
function buildAgenticCategory(spec: AgenticCategorySpec): BenchmarkCategory {
  const { name, fixtureCount, weight, cleanControlRatio } = spec;
  const cleanCount = Math.floor(fixtureCount * cleanControlRatio);
  const attackCount = fixtureCount - cleanCount;

  const fixtureIds: string[] = [];
  const expectedVerdicts: Record<string, 'BLOCK' | 'ALLOW'> = {};

  // Attack fixtures (BLOCK) — or all ALLOW for benign
  const isCleanCategory = cleanControlRatio >= 1.0;

  if (!isCleanCategory) {
    for (let i = 1; i <= attackCount; i++) {
      const id = `agentic-${name}-${String(i).padStart(3, '0')}`;
      fixtureIds.push(id);
      expectedVerdicts[id] = 'BLOCK';
    }
  }

  // Clean controls (ALLOW)
  const cleanTotal = isCleanCategory ? fixtureCount : cleanCount;
  for (let i = 1; i <= cleanTotal; i++) {
    const id = isCleanCategory
      ? `agentic-${name}-${String(i).padStart(3, '0')}`
      : `agentic-${name}-clean-${String(i).padStart(3, '0')}`;
    fixtureIds.push(id);
    expectedVerdicts[id] = 'ALLOW';
  }

  return { name, weight, fixtureIds, expectedVerdicts };
}

// --- Suite Definition ---

const AGENTIC_CATEGORIES: readonly BenchmarkCategory[] = AGENTIC_SPECS.map(buildAgenticCategory);

const totalFixtures = AGENTIC_CATEGORIES.reduce(
  (sum, cat) => sum + cat.fixtureIds.length,
  0,
);

export const AGENTIC_BENCHMARK_SUITE: BenchmarkSuite = {
  id: 'agentic-bench-v1',
  name: 'Agentic Security Benchmark',
  version: '1.0.0',
  description:
    `Benchmark for agentic tool-calling security across 8 categories with ${totalFixtures} fixtures including clean controls per category.`,
  fixtureCount: totalFixtures,
  categories: AGENTIC_CATEGORIES,
  scoringMethod: 'weighted_category',
  createdAt: '2026-04-03T00:00:00.000Z',
};

/** Difficulty tier lookup by category name */
export const AGENTIC_CATEGORY_DIFFICULTY: Readonly<Record<string, 'easy' | 'medium' | 'hard'>> =
  Object.fromEntries(AGENTIC_SPECS.map((s) => [s.name, s.difficulty])) as Record<
    string,
    'easy' | 'medium' | 'hard'
  >;
