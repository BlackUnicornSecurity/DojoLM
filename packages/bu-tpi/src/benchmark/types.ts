/**
 * H20.1: LLM Jutsu Benchmark Suite — Type Definitions
 * Types, constants, and scoring configuration for benchmark suites.
 */

// --- Scoring Methods ---

export const SCORING_METHODS = [
  'weighted_category',
  'binary_pass_fail',
  'severity_weighted',
] as const;

export type ScoringMethod = (typeof SCORING_METHODS)[number];

// --- Difficulty Tiers ---

export type DifficultyTier = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_WEIGHTS: Readonly<Record<DifficultyTier, number>> = {
  easy: 0.5,
  medium: 1.0,
  hard: 1.5,
} as const;

// --- Constants ---

export const MAX_FIXTURES_PER_SUITE = 1500;

// --- Benchmark Suite ---

export interface BenchmarkCategory {
  readonly name: string;
  readonly weight: number;
  readonly fixtureIds: readonly string[];
  readonly expectedVerdicts: Readonly<Record<string, 'BLOCK' | 'ALLOW'>>;
}

export interface BenchmarkSuite {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly fixtureCount: number;
  readonly categories: readonly BenchmarkCategory[];
  readonly scoringMethod: ScoringMethod;
  readonly createdAt: string;
}

// --- Benchmark Results ---

export interface ScoreBreakdown {
  readonly fixtureId: string;
  readonly category: string;
  readonly expectedVerdict: 'BLOCK' | 'ALLOW';
  readonly actualVerdict: 'BLOCK' | 'ALLOW';
  readonly correct: boolean;
  readonly severity: DifficultyTier;
}

export interface BenchmarkResult {
  readonly suiteId: string;
  readonly modelId: string;
  readonly modelName: string;
  readonly provider: string;
  readonly overallScore: number;
  readonly categoryScores: Readonly<Record<string, number>>;
  readonly breakdown: readonly ScoreBreakdown[];
  readonly executedAt: string;
  readonly elapsed: number;
}

// --- Benchmark Comparison ---

export interface BenchmarkComparison {
  readonly suiteId: string;
  readonly results: readonly BenchmarkResult[];
  readonly rankedModels: readonly {
    readonly modelId: string;
    readonly rank: number;
    readonly score: number;
  }[];
}
