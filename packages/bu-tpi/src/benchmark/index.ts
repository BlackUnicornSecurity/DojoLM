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
} from './types.js';

export {
  SCORING_METHODS,
  MAX_FIXTURES_PER_SUITE,
  DIFFICULTY_WEIGHTS,
} from './types.js';

// ===========================================================================
// Suites
// ===========================================================================

export { DOJOLM_BENCH_V1 } from './suites/dojolm-bench.js';
export { AGENTIC_BENCHMARK_SUITE, AGENTIC_CATEGORY_DIFFICULTY } from './suites/agentic-bench.js';
export { RAG_BENCHMARK_SUITE, RAG_CATEGORY_DIFFICULTY } from './suites/rag-bench.js';

// ===========================================================================
// Runner
// ===========================================================================

export { BenchmarkRunner } from './runner.js';
export { FIXTURE_CONTENT, getFixtureContent } from './fixture-content.js';

// ===========================================================================
// Regression Tracker (GUNKIMONO 6.2)
// ===========================================================================

export type {
  CategoryRegression,
  BenchmarkRegressionResult,
  RegressionThresholds,
} from './regression.js';

export {
  DEFAULT_THRESHOLDS,
  classifyRegression,
  compareBenchmarkResults,
  detectBenchmarkRegressions,
  formatRegressionReport,
} from './regression.js';
