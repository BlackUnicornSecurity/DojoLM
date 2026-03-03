/**
 * S66: Fuzzing Engine + Benchmark Suite Types
 */

export interface GrammarRule {
  readonly name: string;
  readonly pattern: string;
  readonly weight: number;
  readonly category: string;
}

export interface FuzzConfig {
  readonly maxIterations: number;
  readonly timeoutMs: number;
  readonly mutationRate: number;
  readonly grammarRules: GrammarRule[];
  readonly seed: string;
}

export interface FuzzResult {
  readonly input: string;
  readonly verdict: 'BLOCK' | 'ALLOW';
  readonly findingsCount: number;
  readonly anomaly: boolean;
  readonly anomalyType: AnomalyType | null;
  readonly durationMs: number;
}

export type AnomalyType = 'timeout' | 'unexpected-verdict' | 'performance-degradation';

export interface FuzzSession {
  readonly id: string;
  readonly config: FuzzConfig;
  readonly results: FuzzResult[];
  readonly startTime: string;
  endTime: string | null;
  status: 'running' | 'completed' | 'aborted';
}

export interface BenchmarkConfig {
  readonly testSets: BenchmarkTestSet[];
  readonly iterations: number;
  readonly warmupIterations: number;
}

export interface BenchmarkTestSet {
  readonly name: string;
  readonly inputs: Array<{ text: string; expectedVerdict: 'BLOCK' | 'ALLOW' }>;
}

export interface BenchmarkResult {
  readonly testSet: string;
  readonly accuracy: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly avgLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly p99LatencyMs: number;
  readonly sampleCount: number;
}

export interface BenchmarkComparison {
  readonly baseline: BenchmarkResult[];
  readonly current: BenchmarkResult[];
  readonly changes: MetricChange[];
}

export interface MetricChange {
  readonly metric: string;
  readonly testSet: string;
  readonly baseline: number;
  readonly current: number;
  readonly delta: number;
  readonly significance: 'improved' | 'degraded' | 'unchanged';
}

export const DEFAULT_FUZZ_CONFIG: FuzzConfig = {
  maxIterations: 1000,
  timeoutMs: 600_000,
  mutationRate: 0.5,
  grammarRules: [],
  seed: 'fuzz-default',
};

export const DEFAULT_BENCHMARK_CONFIG: BenchmarkConfig = {
  testSets: [],
  iterations: 5,
  warmupIterations: 1,
};

export const MAX_INPUT_LENGTH = 500_000;
