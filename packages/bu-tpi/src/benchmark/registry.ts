// SPDX-License-Identifier: Apache-2.0
/**
 * Benchmark suite registry.
 *
 * Keeps suite discovery deterministic for the CLI and downstream callers.
 */

import type { BenchmarkCategory, BenchmarkSuite } from "./types.js";
import { DOJOLM_BENCH_V1 } from "./suites/dojolm-bench.js";
import { AGENTIC_BENCHMARK_SUITE } from "./suites/agentic-bench.js";
import { RAG_BENCHMARK_SUITE } from "./suites/rag-bench.js";
import { HARMBENCH_SUITE } from "./suites/harmbench.js";
import { STRONGREJECT_SUITE } from "./suites/strongreject.js";

export const DEFAULT_BENCHMARK_SUITE_ID = DOJOLM_BENCH_V1.id;

function cloneBenchmarkCategory(
  category: BenchmarkCategory,
): BenchmarkCategory {
  return {
    ...category,
    fixtureIds: [...category.fixtureIds],
    expectedVerdicts: { ...category.expectedVerdicts },
  };
}

function cloneBenchmarkSuite(suite: BenchmarkSuite): BenchmarkSuite {
  return {
    ...suite,
    categories: suite.categories.map(cloneBenchmarkCategory),
  };
}

function freezeBenchmarkCategory(
  category: BenchmarkCategory,
): BenchmarkCategory {
  Object.freeze(category.fixtureIds);
  Object.freeze(category.expectedVerdicts);
  return Object.freeze(category);
}

function freezeBenchmarkSuite(suite: BenchmarkSuite): BenchmarkSuite {
  for (const category of suite.categories) {
    freezeBenchmarkCategory(category);
  }
  Object.freeze(suite.categories);
  return Object.freeze(suite);
}

export const BENCHMARK_SUITES: readonly BenchmarkSuite[] = [
  DOJOLM_BENCH_V1,
  AGENTIC_BENCHMARK_SUITE,
  RAG_BENCHMARK_SUITE,
  HARMBENCH_SUITE,
  STRONGREJECT_SUITE,
].map((suite) => freezeBenchmarkSuite(cloneBenchmarkSuite(suite)));
Object.freeze(BENCHMARK_SUITES);

function normalizeSuiteKey(value: string): string {
  return value.trim().toLowerCase();
}

function slugSuiteIdPart(value: string): string {
  return normalizeSuiteKey(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function listBenchmarkSuites(): readonly BenchmarkSuite[] {
  return BENCHMARK_SUITES;
}

export function getBenchmarkSuite(
  idOrName: string,
): BenchmarkSuite | undefined {
  const key = normalizeSuiteKey(idOrName);
  return BENCHMARK_SUITES.find((suite) => {
    const candidates = [
      suite.id,
      suite.name,
      `${suite.id}@${suite.version}`,
    ].map(normalizeSuiteKey);
    return candidates.includes(key);
  });
}

export function getBenchmarkSuiteEvidence(
  id: string,
): BenchmarkSuite | undefined {
  const exact = BENCHMARK_SUITES.find((suite) => suite.id === id);
  if (exact) return exact;

  for (const suite of BENCHMARK_SUITES) {
    const prefix = `${suite.id}-slice-`;
    if (!id.startsWith(prefix)) continue;
    const suffix = id.slice(prefix.length);
    const maxOnly = /^max-(\d+)$/.exec(suffix);
    if (maxOnly) {
      const slice = sliceBenchmarkSuite(suite, {
        maxFixtures: Number(maxOnly[1]),
      });
      return slice.id === id ? slice : undefined;
    }

    const categoryMax = /^cat-(.+)-max-(\d+)$/.exec(suffix);
    const categoryOnly = /^cat-(.+)$/.exec(suffix);
    const categorySlug = categoryMax?.[1] ?? categoryOnly?.[1];
    if (!categorySlug) return undefined;
    const category = suite.categories.find(
      (candidate) => slugSuiteIdPart(candidate.name) === categorySlug,
    );
    if (!category) return undefined;
    const slice = sliceBenchmarkSuite(suite, {
      category: category.name,
      maxFixtures: categoryMax ? Number(categoryMax[2]) : undefined,
    });
    return slice.id === id ? slice : undefined;
  }

  return undefined;
}

export function requireBenchmarkSuite(
  idOrName = DEFAULT_BENCHMARK_SUITE_ID,
): BenchmarkSuite {
  const suite = getBenchmarkSuite(idOrName);
  if (!suite) {
    const ids = BENCHMARK_SUITES.map((s) => s.id).join(", ");
    throw new Error(
      `Unknown benchmark suite "${idOrName}". Available suites: ${ids}`,
    );
  }
  return suite;
}

export interface BenchmarkSuiteSliceOptions {
  readonly category?: string;
  readonly maxFixtures?: number;
}

/**
 * Build a deterministic smoke-test slice from a suite without mutating it.
 */
export function sliceBenchmarkSuite(
  suite: BenchmarkSuite,
  options: BenchmarkSuiteSliceOptions = {},
): BenchmarkSuite {
  const categoryKey = options.category?.trim().toLowerCase() || undefined;
  let categories = categoryKey
    ? suite.categories.filter(
        (category) => category.name.toLowerCase() === categoryKey,
      )
    : [...suite.categories];

  if (categoryKey && categories.length === 0) {
    throw new Error(
      `Suite "${suite.id}" does not contain category "${options.category}"`,
    );
  }

  const maxFixtures = options.maxFixtures;
  const isSliced = categoryKey !== undefined || maxFixtures !== undefined;

  if (maxFixtures !== undefined) {
    if (!Number.isInteger(maxFixtures) || maxFixtures <= 0) {
      throw new Error("--max-fixtures must be a positive integer");
    }

    let remaining = maxFixtures;
    const sliced: BenchmarkCategory[] = [];
    for (const category of categories) {
      if (remaining <= 0) break;
      const fixtureIds = category.fixtureIds.slice(0, remaining);
      remaining -= fixtureIds.length;
      sliced.push({
        ...category,
        fixtureIds,
        expectedVerdicts: Object.fromEntries(
          fixtureIds.map((fixtureId) => [
            fixtureId,
            category.expectedVerdicts[fixtureId],
          ]),
        ),
      });
    }
    categories = sliced;
  }

  if (isSliced) {
    const totalWeight = categories.reduce(
      (sum, category) => sum + category.weight,
      0,
    );
    if (totalWeight <= 0) {
      throw new Error(
        `Suite "${suite.id}" slice has no positive category weight`,
      );
    }
    categories = categories.map((category) => ({
      ...category,
      weight: category.weight / totalWeight,
    }));
  }

  const fixtureCount = categories.reduce(
    (sum, category) => sum + category.fixtureIds.length,
    0,
  );
  const sliceIdParts = [
    categoryKey ? `cat-${slugSuiteIdPart(categoryKey)}` : undefined,
    maxFixtures !== undefined ? `max-${maxFixtures}` : undefined,
  ].filter((part): part is string => part !== undefined);
  const suiteId = isSliced
    ? `${suite.id}-slice-${sliceIdParts.join("-")}`
    : suite.id;
  return {
    ...suite,
    id: suiteId,
    name: isSliced ? `${suite.name} (slice)` : suite.name,
    fixtureCount,
    categories,
  };
}
