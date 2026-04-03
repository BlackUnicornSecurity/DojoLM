/**
 * NINJUTSU Phase 5.1-5.2: Detection Enhancement Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { CONFIDENCE_LEVELS, DEFAULT_HYBRID_CONFIG } from './types.js';
import type { Finding, ScanResult } from '../types.js';
import type { JudgeConfirmFn, HybridPipelineConfig } from './types.js';
import {
  classifyConfidence,
  findingToDetectionResult,
  runHybridPipeline,
  filterByConfidence,
  getDetectionStats,
} from './hybrid-pipeline.js';

// ============================================================================
// Helpers
// ============================================================================

function makeFinding(weight: number = 9, overrides: Partial<Finding> = {}): Finding {
  return {
    category: 'PROMPT_INJECTION',
    severity: 'CRITICAL',
    description: 'System override detected',
    match: 'ignore previous instructions',
    source: 'current',
    engine: 'core',
    pattern_name: 'pi-override',
    weight,
    ...overrides,
  };
}

function makeScanResult(findings: Finding[]): ScanResult {
  return {
    findings,
    verdict: findings.some((f) => f.severity === 'CRITICAL') ? 'BLOCK' : 'ALLOW',
    elapsed: 10,
    textLength: 100,
    normalizedLength: 100,
    counts: {
      critical: findings.filter((f) => f.severity === 'CRITICAL').length,
      warning: findings.filter((f) => f.severity === 'WARNING').length,
      info: findings.filter((f) => f.severity === 'INFO').length,
    },
  };
}

function makeJudge(confirmed: boolean, score: number = 8): JudgeConfirmFn {
  return vi.fn(async () => ({
    confirmed,
    score,
    reasoning: confirmed ? 'Confirmed by LLM judge' : 'Rejected by LLM judge',
  }));
}

// ============================================================================
// Types Tests
// ============================================================================

describe('Detection Types', () => {
  it('defines 4 confidence levels', () => {
    expect(CONFIDENCE_LEVELS).toHaveLength(4);
    expect(CONFIDENCE_LEVELS).toContain('high');
    expect(CONFIDENCE_LEVELS).toContain('uncertain');
  });

  it('has sensible defaults', () => {
    expect(DEFAULT_HYBRID_CONFIG.highConfidenceThreshold).toBe(8);
    expect(DEFAULT_HYBRID_CONFIG.maxLLMFindings).toBe(10);
    expect(DEFAULT_HYBRID_CONFIG.enableLLMFallback).toBe(true);
  });
});

// ============================================================================
// Confidence Classification Tests
// ============================================================================

describe('classifyConfidence', () => {
  it('classifies high weight as high confidence', () => {
    const result = classifyConfidence(9, DEFAULT_HYBRID_CONFIG);
    expect(result.level).toBe('high');
    expect(result.score).toBeGreaterThan(0.7);
  });

  it('classifies medium weight as medium confidence', () => {
    const result = classifyConfidence(6, DEFAULT_HYBRID_CONFIG);
    expect(result.level).toBe('medium');
  });

  it('classifies low weight as low confidence', () => {
    const result = classifyConfidence(4, DEFAULT_HYBRID_CONFIG);
    expect(result.level).toBe('low');
  });

  it('classifies very low weight as uncertain', () => {
    const result = classifyConfidence(2, DEFAULT_HYBRID_CONFIG);
    expect(result.level).toBe('uncertain');
  });

  it('caps score at 1.0', () => {
    const result = classifyConfidence(10, DEFAULT_HYBRID_CONFIG);
    expect(result.score).toBeLessThanOrEqual(1.0);
  });
});

// ============================================================================
// Finding Conversion Tests
// ============================================================================

describe('findingToDetectionResult', () => {
  it('converts finding to detection result', () => {
    const result = findingToDetectionResult(makeFinding(9), DEFAULT_HYBRID_CONFIG);
    expect(result.category).toBe('PROMPT_INJECTION');
    expect(result.severity).toBe('CRITICAL');
    expect(result.confidence).toBe('high');
    expect(result.source).toBe('regex');
    expect(result.llmJudgeScore).toBeNull();
  });

  it('defaults weight to 5 when missing', () => {
    const finding = makeFinding(5);
    const noWeight = { ...finding, weight: undefined };
    const result = findingToDetectionResult(noWeight, DEFAULT_HYBRID_CONFIG);
    expect(result.confidence).toBe('medium');
  });
});

// ============================================================================
// Hybrid Pipeline Tests
// ============================================================================

describe('runHybridPipeline', () => {
  it('processes high-confidence findings without LLM', async () => {
    const judge = makeJudge(true);
    const scanResult = makeScanResult([makeFinding(9)]);
    const results = await runHybridPipeline(scanResult, 'test text', judge);

    expect(results).toHaveLength(1);
    expect(results[0].confidence).toBe('high');
    expect(results[0].source).toBe('regex');
    // Judge should NOT be called for high-confidence findings
    expect(judge).not.toHaveBeenCalled();
  });

  it('sends low-confidence findings to LLM judge', async () => {
    const judge = makeJudge(true, 7);
    const scanResult = makeScanResult([makeFinding(2, { pattern_name: 'weak-match' })]);
    const results = await runHybridPipeline(scanResult, 'test text', judge);

    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('hybrid');
    expect(results[0].llmJudgeScore).toBe(7);
    expect(results[0].llmReasoning).toContain('Confirmed');
    expect(judge).toHaveBeenCalledTimes(1);
  });

  it('downgrades confidence when LLM rejects', async () => {
    const judge = makeJudge(false, 2);
    const scanResult = makeScanResult([makeFinding(2)]);
    const results = await runHybridPipeline(scanResult, 'test text', judge);

    expect(results[0].source).toBe('hybrid');
    expect(results[0].confidence).toBe('low');
    expect(results[0].llmReasoning).toContain('Rejected');
  });

  it('works without LLM judge (null)', async () => {
    const scanResult = makeScanResult([makeFinding(2)]);
    const results = await runHybridPipeline(scanResult, 'test text', null);

    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('regex');
    expect(results[0].confidence).toBe('uncertain');
  });

  it('respects maxLLMFindings limit', async () => {
    const judge = makeJudge(true);
    const findings = Array.from({ length: 20 }, (_, i) =>
      makeFinding(2, { pattern_name: `weak-${i}` }),
    );
    const scanResult = makeScanResult(findings);
    const config: HybridPipelineConfig = { ...DEFAULT_HYBRID_CONFIG, maxLLMFindings: 3 };

    await runHybridPipeline(scanResult, 'text', judge, config);

    expect(judge).toHaveBeenCalledTimes(3);
  });

  it('handles LLM judge failure gracefully', async () => {
    const judge: JudgeConfirmFn = vi.fn(async () => { throw new Error('LLM timeout'); });
    const scanResult = makeScanResult([makeFinding(2)]);
    const results = await runHybridPipeline(scanResult, 'test text', judge);

    // Should fall back to regex-only result
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('regex');
  });

  it('skips LLM when enableLLMFallback is false', async () => {
    const judge = makeJudge(true);
    const scanResult = makeScanResult([makeFinding(2)]);
    const config: HybridPipelineConfig = { ...DEFAULT_HYBRID_CONFIG, enableLLMFallback: false };

    await runHybridPipeline(scanResult, 'test text', judge, config);

    expect(judge).not.toHaveBeenCalled();
  });

  it('handles empty scan results', async () => {
    const results = await runHybridPipeline(makeScanResult([]), 'text', null);
    expect(results).toHaveLength(0);
  });

  it('processes mixed confidence findings correctly', async () => {
    const judge = makeJudge(true, 7);
    const scanResult = makeScanResult([
      makeFinding(9, { pattern_name: 'strong' }),
      makeFinding(6, { pattern_name: 'medium-match' }),
      makeFinding(2, { pattern_name: 'weak' }),
    ]);

    const results = await runHybridPipeline(scanResult, 'test text', judge);

    expect(results).toHaveLength(3);
    expect(results[0].confidence).toBe('high');
    expect(results[0].source).toBe('regex');
    expect(results[1].confidence).toBe('medium');
    expect(results[1].source).toBe('regex');
    expect(results[2].source).toBe('hybrid');
    // Only the weak finding should trigger LLM
    expect(judge).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Filtering Tests
// ============================================================================

describe('filterByConfidence', () => {
  it('filters by minimum confidence', () => {
    const judge = makeJudge(true);
    const results = [
      { ...findingToDetectionResult(makeFinding(9), DEFAULT_HYBRID_CONFIG) },
      { ...findingToDetectionResult(makeFinding(2), DEFAULT_HYBRID_CONFIG) },
    ];

    const filtered = filterByConfidence(results, 'medium');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].confidence).toBe('high');
  });

  it('returns all when minimum is uncertain', () => {
    const results = [
      findingToDetectionResult(makeFinding(9), DEFAULT_HYBRID_CONFIG),
      findingToDetectionResult(makeFinding(2), DEFAULT_HYBRID_CONFIG),
    ];

    expect(filterByConfidence(results, 'uncertain')).toHaveLength(2);
  });
});

// ============================================================================
// Statistics Tests
// ============================================================================

describe('getDetectionStats', () => {
  it('computes correct statistics', () => {
    const results = [
      findingToDetectionResult(makeFinding(9), DEFAULT_HYBRID_CONFIG),
      findingToDetectionResult(makeFinding(6), DEFAULT_HYBRID_CONFIG),
      findingToDetectionResult(makeFinding(2), DEFAULT_HYBRID_CONFIG),
    ];

    const stats = getDetectionStats(results);
    expect(stats.total).toBe(3);
    expect(stats.byConfidence.high).toBe(1);
    expect(stats.byConfidence.medium).toBe(1);
    expect(stats.byConfidence.uncertain).toBe(1);
    expect(stats.bySource['regex']).toBe(3);
  });

  it('tracks LLM confirmed/rejected', () => {
    const results = [
      { ...findingToDetectionResult(makeFinding(2), DEFAULT_HYBRID_CONFIG), source: 'hybrid' as const, confidence: 'medium' as const },
      { ...findingToDetectionResult(makeFinding(2), DEFAULT_HYBRID_CONFIG), source: 'hybrid' as const, confidence: 'low' as const },
    ];

    const stats = getDetectionStats(results);
    expect(stats.llmConfirmed).toBe(1);
    expect(stats.llmRejected).toBe(1);
  });

  it('handles empty results', () => {
    const stats = getDetectionStats([]);
    expect(stats.total).toBe(0);
  });
});
