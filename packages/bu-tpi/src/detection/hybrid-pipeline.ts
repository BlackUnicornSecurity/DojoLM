/**
 * NINJUTSU Phase 5.2: Hybrid Detection Pipeline
 * Regex first-pass (existing 510+ patterns) with LLM second-pass for uncertain cases.
 *
 * Design: ScannerRegistry.scan() handles 95%+ of cases via regex.
 * Borderline findings get Sensei judge confirmation. Latency unchanged for clear cases.
 */

import type { Finding, ScanResult } from '../types.js';
import type {
  DetectionResult,
  ConfidenceLevel,
  HybridPipelineConfig,
  JudgeConfirmFn,
} from './types.js';
import { DEFAULT_HYBRID_CONFIG } from './types.js';

// ---------------------------------------------------------------------------
// Confidence Classification
// ---------------------------------------------------------------------------

/** Classify confidence based on finding weight */
export function classifyConfidence(
  weight: number,
  config: HybridPipelineConfig,
): { readonly level: ConfidenceLevel; readonly score: number } {
  if (weight >= config.highConfidenceThreshold) {
    return { level: 'high', score: Math.min(1.0, weight / 10) };
  }
  if (weight >= config.mediumConfidenceThreshold) {
    return { level: 'medium', score: weight / 10 };
  }
  if (weight >= config.lowConfidenceThreshold) {
    return { level: 'low', score: weight / 10 };
  }
  return { level: 'uncertain', score: weight / 10 };
}

/** Convert a Finding to DetectionResult with confidence */
export function findingToDetectionResult(
  finding: Finding,
  config: HybridPipelineConfig,
): DetectionResult {
  const weight = finding.weight ?? 5;
  const { level, score } = classifyConfidence(weight, config);

  return {
    category: finding.category,
    severity: finding.severity,
    description: finding.description,
    match: finding.match,
    confidence: level,
    confidenceScore: score,
    source: 'regex',
    patternName: finding.pattern_name ?? null,
    llmJudgeScore: null,
    llmReasoning: null,
  };
}

// ---------------------------------------------------------------------------
// Hybrid Pipeline
// ---------------------------------------------------------------------------

/** Run the hybrid detection pipeline: regex first-pass + optional LLM second-pass */
export async function runHybridPipeline(
  scanResult: ScanResult,
  fullText: string,
  judgeConfirm: JudgeConfirmFn | null,
  config: HybridPipelineConfig = DEFAULT_HYBRID_CONFIG,
): Promise<readonly DetectionResult[]> {
  const results: DetectionResult[] = [];
  const uncertainFindings: Array<{ finding: Finding; result: DetectionResult }> = [];

  // First pass: classify all regex findings by confidence
  for (const finding of scanResult.findings) {
    const result = findingToDetectionResult(finding, config);
    results.push(result);

    // Track uncertain findings for LLM confirmation
    if (
      (result.confidence === 'uncertain' || result.confidence === 'low') &&
      config.enableLLMFallback &&
      judgeConfirm !== null
    ) {
      uncertainFindings.push({ finding, result });
    }
  }

  // Second pass: LLM confirmation for uncertain findings (if available)
  if (uncertainFindings.length > 0 && judgeConfirm !== null) {
    const toConfirm = uncertainFindings.slice(0, config.maxLLMFindings);

    for (const { finding, result } of toConfirm) {
      try {
        const judgment = await judgeConfirm(
          { category: finding.category, description: finding.description, match: finding.match },
          fullText,
        );

        // Replace the regex-only result with a hybrid result
        const idx = results.indexOf(result);
        if (idx >= 0) {
          const hybridResult: DetectionResult = {
            ...result,
            source: 'hybrid',
            confidence: judgment.confirmed ? 'medium' : 'low',
            confidenceScore: judgment.score / 10,
            llmJudgeScore: judgment.score,
            llmReasoning: judgment.reasoning,
          };
          results[idx] = hybridResult;
        }
      } catch {
        // LLM failure — keep regex-only result, no degradation
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Filtering Utilities
// ---------------------------------------------------------------------------

/** Filter results by minimum confidence level */
export function filterByConfidence(
  results: readonly DetectionResult[],
  minLevel: ConfidenceLevel,
): readonly DetectionResult[] {
  const levelOrder: Record<ConfidenceLevel, number> = {
    high: 3,
    medium: 2,
    low: 1,
    uncertain: 0,
  };

  const minOrder = levelOrder[minLevel];
  return results.filter((r) => levelOrder[r.confidence] >= minOrder);
}

/** Get summary statistics for detection results */
export function getDetectionStats(results: readonly DetectionResult[]): {
  readonly total: number;
  readonly byConfidence: Readonly<Record<ConfidenceLevel, number>>;
  readonly bySource: Readonly<Record<string, number>>;
  readonly llmConfirmed: number;
  readonly llmRejected: number;
} {
  const byConfidence: Record<ConfidenceLevel, number> = { high: 0, medium: 0, low: 0, uncertain: 0 };
  const bySource: Record<string, number> = {};
  let llmConfirmed = 0;
  let llmRejected = 0;

  for (const r of results) {
    byConfidence[r.confidence]++;
    bySource[r.source] = (bySource[r.source] ?? 0) + 1;
    if (r.source === 'hybrid') {
      if (r.confidence === 'medium' || r.confidence === 'high') {
        llmConfirmed++;
      } else {
        llmRejected++;
      }
    }
  }

  return {
    total: results.length,
    byConfidence,
    bySource,
    llmConfirmed,
    llmRejected,
  };
}
