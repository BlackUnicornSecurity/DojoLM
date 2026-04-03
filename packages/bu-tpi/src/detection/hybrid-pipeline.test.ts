import { describe, it, expect } from 'vitest';
import {
  classifyConfidence,
  findingToDetectionResult,
  runHybridPipeline,
  filterByConfidence,
  getDetectionStats,
} from './hybrid-pipeline.js';
import { DEFAULT_HYBRID_CONFIG } from './types.js';
import type { Finding, ScanResult } from '../types.js';
import type { DetectionResult } from './types.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    category: 'PROMPT_INJECTION',
    severity: 'CRITICAL',
    description: 'Test finding',
    match: 'ignore previous instructions',
    source: 'current',
    engine: 'regex',
    weight: 5,
    ...overrides,
  };
}

describe('classifyConfidence', () => {
  it('classifies high confidence for weight >= threshold', () => {
    const result = classifyConfidence(8, DEFAULT_HYBRID_CONFIG);
    expect(result.level).toBe('high');
    expect(result.score).toBeLessThanOrEqual(1.0);
  });

  it('classifies medium confidence for weight >= medium threshold', () => {
    const result = classifyConfidence(5, DEFAULT_HYBRID_CONFIG);
    expect(result.level).toBe('medium');
  });

  it('classifies low confidence for weight >= low threshold', () => {
    const result = classifyConfidence(3, DEFAULT_HYBRID_CONFIG);
    expect(result.level).toBe('low');
  });

  it('classifies uncertain for weight below low threshold', () => {
    const result = classifyConfidence(1, DEFAULT_HYBRID_CONFIG);
    expect(result.level).toBe('uncertain');
  });
});

describe('findingToDetectionResult', () => {
  it('converts a Finding to DetectionResult with regex source', () => {
    const finding = makeFinding({ weight: 8 });
    const result = findingToDetectionResult(finding, DEFAULT_HYBRID_CONFIG);
    expect(result.source).toBe('regex');
    expect(result.category).toBe('PROMPT_INJECTION');
    expect(result.confidence).toBe('high');
    expect(result.llmJudgeScore).toBeNull();
  });

  it('defaults weight to 5 when not specified', () => {
    const finding = makeFinding({ weight: undefined });
    const result = findingToDetectionResult(finding, DEFAULT_HYBRID_CONFIG);
    expect(result.confidence).toBe('medium');
  });
});

describe('runHybridPipeline', () => {
  it('returns regex-only results when no judge provided', async () => {
    const scanResult: ScanResult = {
      findings: [makeFinding({ weight: 8 })],
      verdict: 'BLOCK',
      elapsed: 10,
      textLength: 100,
      normalizedLength: 100,
      counts: { critical: 1, warning: 0, info: 0 },
    };
    const results = await runHybridPipeline(scanResult, 'test text', null);
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('regex');
  });

  it('invokes judge for uncertain findings when LLM fallback enabled', async () => {
    const scanResult: ScanResult = {
      findings: [makeFinding({ weight: 1 })], // uncertain
      verdict: 'ALLOW',
      elapsed: 10,
      textLength: 100,
      normalizedLength: 100,
      counts: { critical: 0, warning: 0, info: 1 },
    };
    const mockJudge = async () => ({ confirmed: true, score: 7, reasoning: 'Looks malicious' });
    const results = await runHybridPipeline(scanResult, 'test text', mockJudge);
    expect(results[0].source).toBe('hybrid');
    expect(results[0].llmReasoning).toBe('Looks malicious');
  });

  it('gracefully degrades when judge throws', async () => {
    const scanResult: ScanResult = {
      findings: [makeFinding({ weight: 1 })],
      verdict: 'ALLOW',
      elapsed: 10,
      textLength: 100,
      normalizedLength: 100,
      counts: { critical: 0, warning: 0, info: 1 },
    };
    const failingJudge = async () => { throw new Error('LLM unavailable'); };
    const results = await runHybridPipeline(scanResult, 'test text', failingJudge);
    expect(results[0].source).toBe('regex'); // fallback preserved
  });
});

describe('filterByConfidence', () => {
  const results: DetectionResult[] = [
    { category: 'A', severity: 'CRITICAL', description: '', match: '', confidence: 'high', confidenceScore: 0.9, source: 'regex', patternName: null, llmJudgeScore: null, llmReasoning: null },
    { category: 'B', severity: 'WARNING', description: '', match: '', confidence: 'low', confidenceScore: 0.3, source: 'regex', patternName: null, llmJudgeScore: null, llmReasoning: null },
    { category: 'C', severity: 'INFO', description: '', match: '', confidence: 'uncertain', confidenceScore: 0.1, source: 'regex', patternName: null, llmJudgeScore: null, llmReasoning: null },
  ];

  it('filters to medium and above', () => {
    const filtered = filterByConfidence(results, 'medium');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].category).toBe('A');
  });

  it('returns all when filtering by uncertain', () => {
    expect(filterByConfidence(results, 'uncertain')).toHaveLength(3);
  });
});

describe('getDetectionStats', () => {
  it('computes correct statistics', () => {
    const results: DetectionResult[] = [
      { category: 'A', severity: 'CRITICAL', description: '', match: '', confidence: 'high', confidenceScore: 0.9, source: 'regex', patternName: null, llmJudgeScore: null, llmReasoning: null },
      { category: 'B', severity: 'WARNING', description: '', match: '', confidence: 'medium', confidenceScore: 0.6, source: 'hybrid', patternName: null, llmJudgeScore: 7, llmReasoning: 'ok' },
      { category: 'C', severity: 'INFO', description: '', match: '', confidence: 'low', confidenceScore: 0.2, source: 'hybrid', patternName: null, llmJudgeScore: 2, llmReasoning: 'no' },
    ];
    const stats = getDetectionStats(results);
    expect(stats.total).toBe(3);
    expect(stats.byConfidence.high).toBe(1);
    expect(stats.bySource['regex']).toBe(1);
    expect(stats.bySource['hybrid']).toBe(2);
    expect(stats.llmConfirmed).toBe(1);
    expect(stats.llmRejected).toBe(1);
  });
});
