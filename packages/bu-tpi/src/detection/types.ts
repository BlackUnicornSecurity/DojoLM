/**
 * NINJUTSU Phase 5.1-5.2: Detection Enhancement Types
 * Hybrid regex+LLM detection pipeline with confidence scoring.
 */

// ---------------------------------------------------------------------------
// Confidence Levels
// ---------------------------------------------------------------------------

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low', 'uncertain'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

// ---------------------------------------------------------------------------
// Detection Result
// ---------------------------------------------------------------------------

/** Enhanced detection result with confidence scoring */
export interface DetectionResult {
  readonly category: string;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
  readonly description: string;
  readonly match: string;
  readonly confidence: ConfidenceLevel;
  readonly confidenceScore: number;
  readonly source: 'regex' | 'llm' | 'hybrid';
  readonly patternName: string | null;
  readonly llmJudgeScore: number | null;
  readonly llmReasoning: string | null;
}

// ---------------------------------------------------------------------------
// Hybrid Pipeline Configuration
// ---------------------------------------------------------------------------

export interface HybridPipelineConfig {
  /** Minimum regex weight to skip LLM confirmation (high confidence) */
  readonly highConfidenceThreshold: number;
  /** Minimum regex weight for medium confidence (LLM optional) */
  readonly mediumConfidenceThreshold: number;
  /** Below this weight, LLM confirmation is required */
  readonly lowConfidenceThreshold: number;
  /** Whether to invoke LLM for uncertain findings */
  readonly enableLLMFallback: boolean;
  /** Maximum findings to send to LLM per scan (cost control) */
  readonly maxLLMFindings: number;
}

export const DEFAULT_HYBRID_CONFIG: HybridPipelineConfig = {
  highConfidenceThreshold: 8,
  mediumConfidenceThreshold: 5,
  lowConfidenceThreshold: 3,
  enableLLMFallback: true,
  maxLLMFindings: 10,
};

// ---------------------------------------------------------------------------
// Judge Integration
// ---------------------------------------------------------------------------

/** LLM judge function for confirming uncertain findings */
export type JudgeConfirmFn = (
  finding: { category: string; description: string; match: string },
  fullText: string,
) => Promise<{ readonly confirmed: boolean; readonly score: number; readonly reasoning: string }>;
