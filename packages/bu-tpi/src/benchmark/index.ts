// SPDX-License-Identifier: Apache-2.0
/**
 * H20: LLM Jutsu Benchmark Suite
 * Barrel export for benchmark modules.
 */

// ===========================================================================
// Types
// ===========================================================================

export type {
  ScoringMethod,
  DifficultyTier,
  BenchmarkSuite,
  BenchmarkCategory,
  BenchmarkResult,
  ScoreBreakdown,
  BenchmarkComparison,
} from "./types.js";

export {
  SCORING_METHODS,
  MAX_FIXTURES_PER_SUITE,
  DIFFICULTY_WEIGHTS,
} from "./types.js";

// ===========================================================================
// Suites
// ===========================================================================

export { DOJOLM_BENCH_V1 } from "./suites/dojolm-bench.js";
export {
  AGENTIC_BENCHMARK_SUITE,
  AGENTIC_CATEGORY_DIFFICULTY,
} from "./suites/agentic-bench.js";
export {
  RAG_BENCHMARK_SUITE,
  RAG_CATEGORY_DIFFICULTY,
} from "./suites/rag-bench.js";
export {
  HARMBENCH_SUITE,
  HARMBENCH_CATEGORY_DIFFICULTY,
} from "./suites/harmbench.js";
export {
  STRONGREJECT_SUITE,
  STRONGREJECT_CATEGORY_DIFFICULTY,
} from "./suites/strongreject.js";

// ===========================================================================
// Suite Registry
// ===========================================================================

export type { BenchmarkSuiteSliceOptions } from "./registry.js";
export {
  BENCHMARK_SUITES,
  DEFAULT_BENCHMARK_SUITE_ID,
  getBenchmarkSuite,
  listBenchmarkSuites,
  requireBenchmarkSuite,
  sliceBenchmarkSuite,
} from "./registry.js";

// ===========================================================================
// Runner
// ===========================================================================

export { BenchmarkRunner } from "./runner.js";
export {
  FIXTURE_CONTENT,
  getFixtureContent,
  requireFixtureContent,
} from "./fixture-content.js";
export type { BenchmarkProgress, ScanFn } from "./runner.js";
export type { DojoLmBenchmarkOptions } from "./scanner-adapter.js";
export {
  DEFAULT_DOJOLM_BENCHMARK_MODEL_ID,
  DEFAULT_DOJOLM_BENCHMARK_PROVIDER,
  createDojoLmScannerScanFn,
  runDojoLmScannerBenchmark,
} from "./scanner-adapter.js";
export type {
  BenchmarkRunReport,
  BenchmarkReportCategory,
  BenchmarkReportCoverageMode,
  BenchmarkReportFixture,
  BenchmarkReportSuiteMetadata,
} from "./report.js";
export {
  BENCHMARK_REPORT_SCHEMA_VERSION,
  countBenchmarkCorrect,
  createBenchmarkSuiteFingerprint,
  createBenchmarkRunReport,
  formatBenchmarkSummary,
  isBenchmarkResult,
  parseBenchmarkReportsPayload,
  parseBenchmarkResultsPayload,
} from "./report.js";

// ===========================================================================
// Regression Tracker (GUNKIMONO 6.2)
// ===========================================================================

export type {
  CategoryRegression,
  BenchmarkRegressionResult,
  RegressionThresholds,
} from "./regression.js";

export {
  DEFAULT_THRESHOLDS,
  classifyRegression,
  compareBenchmarkResults,
  detectBenchmarkRegressions,
  formatRegressionReport,
} from "./regression.js";
