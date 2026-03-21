/**
 * D5.1 — Quality Metric Types for LLM evaluation.
 *
 * All types are readonly per project conventions.
 */

export interface QualityMetrics {
  readonly coherenceScore: number;       // 0-1
  readonly relevanceScore: number;       // 0-1
  readonly consistencyScore: number;     // 0-1
  readonly verbosityRatio: number;       // response/prompt length ratio
  readonly responseLatencyMs: number;
  readonly tokenCount: number;
}

export interface StatisticalComparison {
  readonly modelA: string;
  readonly modelB: string;
  readonly metricDeltas: Readonly<Record<string, number>>;
  readonly significanceLevel: number;    // p-value
  readonly sampleSize: number;
  readonly winner: string | null;        // null if no significant difference
}

export interface QualityThresholds {
  readonly coherence: ThresholdLevel;
  readonly relevance: ThresholdLevel;
  readonly consistency: ThresholdLevel;
}

interface ThresholdLevel {
  readonly pass: number;
  readonly warn: number;
  readonly fail: number;
}

export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  coherence: { pass: 0.7, warn: 0.4, fail: 0.2 },
  relevance: { pass: 0.6, warn: 0.3, fail: 0.1 },
  consistency: { pass: 0.8, warn: 0.5, fail: 0.2 },
} as const;
