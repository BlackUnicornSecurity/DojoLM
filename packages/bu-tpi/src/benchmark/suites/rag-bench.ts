// SPDX-License-Identifier: Apache-2.0
/**
 * GUNKIMONO Phase 6.1+6.2: RAG Benchmark Suite
 * Benchmark suite for RAG pipeline security smoke testing — 150 deterministic
 * fixture IDs across 7 categories, backed by reusable local payload anchors.
 */

import type { BenchmarkSuite, BenchmarkCategory } from "../types.js";

// --- Category Specs ---

interface RagCategorySpec {
  readonly name: string;
  readonly fixtureCount: number;
  readonly weight: number;
  readonly difficulty: "easy" | "medium" | "hard";
  readonly cleanControlRatio: number;
}

const RAG_SPECS: readonly RagCategorySpec[] = [
  {
    name: "boundary-injection",
    fixtureCount: 30,
    weight: 0.2,
    difficulty: "medium",
    cleanControlRatio: 0.1,
  },
  {
    name: "embedding-attack",
    fixtureCount: 25,
    weight: 0.15,
    difficulty: "hard",
    cleanControlRatio: 0.1,
  },
  {
    name: "knowledge-conflict",
    fixtureCount: 20,
    weight: 0.15,
    difficulty: "hard",
    cleanControlRatio: 0.1,
  },
  {
    name: "context-poisoning",
    fixtureCount: 25,
    weight: 0.15,
    difficulty: "hard",
    cleanControlRatio: 0.1,
  },
  {
    name: "citation-spoofing",
    fixtureCount: 15,
    weight: 0.1,
    difficulty: "medium",
    cleanControlRatio: 0.1,
  },
  {
    name: "retrieval-manipulation",
    fixtureCount: 20,
    weight: 0.15,
    difficulty: "hard",
    cleanControlRatio: 0.1,
  },
  {
    name: "clean-rag",
    fixtureCount: 15,
    weight: 0.1,
    difficulty: "easy",
    cleanControlRatio: 1.0,
  },
] as const;

/**
 * Build a BenchmarkCategory from a RagCategorySpec.
 */
function buildRagCategory(spec: RagCategorySpec): BenchmarkCategory {
  const { name, fixtureCount, weight, cleanControlRatio } = spec;
  const cleanCount = Math.floor(fixtureCount * cleanControlRatio);
  const attackCount = fixtureCount - cleanCount;

  const fixtureIds: string[] = [];
  const expectedVerdicts: Record<string, "BLOCK" | "ALLOW"> = {};

  const isCleanCategory = cleanControlRatio >= 1.0;

  if (!isCleanCategory) {
    for (let i = 1; i <= attackCount; i++) {
      const id = `rag-${name}-${String(i).padStart(3, "0")}`;
      fixtureIds.push(id);
      expectedVerdicts[id] = "BLOCK";
    }
  }

  const cleanTotal = isCleanCategory ? fixtureCount : cleanCount;
  for (let i = 1; i <= cleanTotal; i++) {
    const id = isCleanCategory
      ? `rag-${name}-${String(i).padStart(3, "0")}`
      : `rag-${name}-clean-${String(i).padStart(3, "0")}`;
    fixtureIds.push(id);
    expectedVerdicts[id] = "ALLOW";
  }

  return { name, weight, fixtureIds, expectedVerdicts };
}

// --- Suite Definition ---

const RAG_CATEGORIES: readonly BenchmarkCategory[] =
  RAG_SPECS.map(buildRagCategory);

const totalFixtures = RAG_CATEGORIES.reduce(
  (sum, cat) => sum + cat.fixtureIds.length,
  0,
);

export const RAG_BENCHMARK_SUITE: BenchmarkSuite = {
  id: "rag-bench-v1",
  name: "RAG Security Benchmark",
  version: "1.0.0",
  description: `RAG pipeline security smoke benchmark across 7 categories with ${totalFixtures} deterministic fixture IDs and report-level disclosure of reusable local payload anchors.`,
  fixtureCount: totalFixtures,
  categories: RAG_CATEGORIES,
  scoringMethod: "weighted_category",
  createdAt: "2026-04-03T00:00:00.000Z",
};

/** Difficulty tier lookup by category name */
export const RAG_CATEGORY_DIFFICULTY: Readonly<
  Record<string, "easy" | "medium" | "hard">
> = Object.fromEntries(RAG_SPECS.map((s) => [s.name, s.difficulty])) as Record<
  string,
  "easy" | "medium" | "hard"
>;
