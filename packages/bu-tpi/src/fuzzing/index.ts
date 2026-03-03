/**
 * S66: Fuzzing Engine + Benchmark Suite
 * Barrel export.
 */

// Types
export type {
  GrammarRule,
  FuzzConfig,
  FuzzResult,
  AnomalyType,
  FuzzSession,
  BenchmarkConfig,
  BenchmarkTestSet,
  BenchmarkResult,
  BenchmarkComparison,
  MetricChange,
} from './types.js';

export {
  DEFAULT_FUZZ_CONFIG,
  DEFAULT_BENCHMARK_CONFIG,
} from './types.js';

// Grammar
export type { Grammar } from './grammar.js';
export {
  createGrammar,
  generateInput,
  mutateInput,
  PROMPT_GRAMMAR,
  ENCODING_GRAMMAR,
  STRUCTURAL_GRAMMAR,
} from './grammar.js';

// Fuzzer
export {
  createFuzzSession,
  detectAnomaly,
  fuzz,
  getFuzzCoverage,
  exportResults,
} from './fuzzer.js';

// Benchmark
export {
  calculateMetrics,
  measureLatency,
  runBenchmark,
} from './benchmark.js';

// Comparison
export {
  compareBenchmarks,
  formatComparison,
  isRegression,
} from './comparison.js';
