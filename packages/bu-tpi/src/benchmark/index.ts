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

// ===========================================================================
// Runner
// ===========================================================================

export { BenchmarkRunner } from './runner.js';
