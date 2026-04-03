/**
 * GUNKIMONO Phase 6.3: Compliance Evidence Bridge Tests
 */

import { describe, it, expect } from 'vitest';
import {
  extractBenchmarkModules,
  createBenchmarkEvidence,
  verifyBenchmarkEvidence,
  benchmarkToEvidence,
  generateBenchmarkComplianceReport,
  formatBenchmarkComplianceReport,
} from './benchmark-bridge.js';
import type { BenchmarkResult, ScoreBreakdown } from '../benchmark/types.js';
import type { ComplianceFramework } from './types.js';

// --- Helpers ---

function makeBreakdown(category: string, count: number): ScoreBreakdown[] {
  const items: ScoreBreakdown[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      fixtureId: `${category}-${i}`,
      category,
      expectedVerdict: 'BLOCK',
      actualVerdict: 'BLOCK',
      correct: true,
      severity: 'medium',
    });
  }
  return items;
}

function makeBenchmarkResult(
  overrides: Partial<BenchmarkResult> = {},
): BenchmarkResult {
  return {
    suiteId: 'test-suite',
    modelId: 'model-a',
    modelName: 'Model A',
    provider: 'test',
    overallScore: 85,
    categoryScores: {
      'prompt-injection': 0.9,
      'jailbreak': 0.8,
      'tool-manipulation': 0.7,
    },
    breakdown: [
      ...makeBreakdown('prompt-injection', 10),
      ...makeBreakdown('jailbreak', 5),
      ...makeBreakdown('tool-manipulation', 5),
    ],
    executedAt: '2026-04-01T00:00:00.000Z',
    elapsed: 100,
    ...overrides,
  };
}

const MINI_FRAMEWORK: ComplianceFramework = {
  id: 'test-fw',
  name: 'Test Framework',
  version: '1.0',
  controls: [
    { id: 'TC-01', name: 'Injection Prevention', description: 'Prevent injections', category: 'security', requirement: 'Must detect PI' },
    { id: 'TC-02', name: 'Tool Safety', description: 'Safe tool use', category: 'security', requirement: 'Must validate tools' },
    { id: 'TC-03', name: 'Output Control', description: 'Control outputs', category: 'quality', requirement: 'Must filter outputs' },
  ],
};

// ---------------------------------------------------------------------------
// extractBenchmarkModules
// ---------------------------------------------------------------------------

describe('extractBenchmarkModules', () => {
  it('maps category names to scanner module names', () => {
    const result = makeBenchmarkResult();
    const { moduleNames } = extractBenchmarkModules(result);
    expect(moduleNames).toContain('enhanced-pi');
    expect(moduleNames).toContain('mcp-attack-detector');
  });

  it('extracts fixture categories with counts', () => {
    const result = makeBenchmarkResult();
    const { fixtureCategories } = extractBenchmarkModules(result);
    expect(fixtureCategories['prompt-injection']).toBe(10);
    expect(fixtureCategories['jailbreak']).toBe(5);
  });

  it('deduplicates modules across categories', () => {
    const result = makeBenchmarkResult({
      categoryScores: {
        'prompt-injection': 0.9,
        'jailbreak': 0.8, // both map to enhanced-pi
      },
    });
    const { moduleNames } = extractBenchmarkModules(result);
    // Should only have one enhanced-pi
    expect(moduleNames.filter((m) => m === 'enhanced-pi')).toHaveLength(1);
  });

  it('handles agentic categories', () => {
    const result = makeBenchmarkResult({
      categoryScores: {
        'tool-injection': 0.85,
        'delegation-attack': 0.9,
        'indirect-pi': 0.7,
      },
      breakdown: [
        ...makeBreakdown('tool-injection', 5),
        ...makeBreakdown('delegation-attack', 5),
        ...makeBreakdown('indirect-pi', 5),
      ],
    });
    const { moduleNames } = extractBenchmarkModules(result);
    expect(moduleNames).toContain('mcp-attack-detector');
    expect(moduleNames).toContain('enhanced-pi');
  });

  it('handles RAG categories', () => {
    const result = makeBenchmarkResult({
      categoryScores: {
        'boundary-injection': 0.8,
        'embedding-attack': 0.7,
      },
      breakdown: [
        ...makeBreakdown('boundary-injection', 5),
        ...makeBreakdown('embedding-attack', 5),
      ],
    });
    const { moduleNames } = extractBenchmarkModules(result);
    expect(moduleNames).toContain('rag-analyzer');
  });
});

// ---------------------------------------------------------------------------
// createBenchmarkEvidence / verifyBenchmarkEvidence
// ---------------------------------------------------------------------------

describe('createBenchmarkEvidence', () => {
  it('creates a signed evidence record', () => {
    const record = createBenchmarkEvidence('TC-01', 'test-fw', 'prompt-injection', 0.9, 'suite-1');
    expect(record.controlId).toBe('TC-01');
    expect(record.frameworkId).toBe('test-fw');
    expect(record.result).toBe('pass');
    expect(record.score).toBe(0.9);
    expect(record.hmacSignature).toBeTruthy();
  });

  it('marks as partial for scores between 0.4 and 0.7', () => {
    const record = createBenchmarkEvidence('TC-01', 'test-fw', 'jailbreak', 0.5, 'suite-1');
    expect(record.result).toBe('partial');
  });

  it('marks as fail for low scores', () => {
    const record = createBenchmarkEvidence('TC-01', 'test-fw', 'jailbreak', 0.2, 'suite-1');
    expect(record.result).toBe('fail');
  });

  it('includes benchmark details in description', () => {
    const record = createBenchmarkEvidence('TC-01', 'test-fw', 'prompt-injection', 0.9, 'dojolm-bench-v1');
    expect(record.details).toContain('dojolm-bench-v1');
    expect(record.details).toContain('prompt-injection');
  });
});

describe('verifyBenchmarkEvidence', () => {
  it('verifies a valid evidence record', () => {
    const record = createBenchmarkEvidence('TC-01', 'test-fw', 'prompt-injection', 0.9, 'suite-1');
    expect(verifyBenchmarkEvidence(record)).toBe(true);
  });

  it('rejects a tampered evidence record', () => {
    const record = createBenchmarkEvidence('TC-01', 'test-fw', 'prompt-injection', 0.9, 'suite-1');
    const tampered = { ...record, score: 1.0 };
    expect(verifyBenchmarkEvidence(tampered)).toBe(false);
  });

  it('rejects a record with invalid signature', () => {
    const record = createBenchmarkEvidence('TC-01', 'test-fw', 'prompt-injection', 0.9, 'suite-1');
    const tampered = { ...record, hmacSignature: 'a'.repeat(64) };
    expect(verifyBenchmarkEvidence(tampered)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// benchmarkToEvidence
// ---------------------------------------------------------------------------

describe('benchmarkToEvidence', () => {
  it('maps benchmark result to framework evidence', () => {
    const result = makeBenchmarkResult();
    const evidence = benchmarkToEvidence(result, MINI_FRAMEWORK);

    expect(evidence.framework.id).toBe('test-fw');
    expect(evidence.benchmarkSuiteId).toBe('test-suite');
    expect(typeof evidence.coverage).toBe('number');
    expect(evidence.generatedAt).toBeTruthy();
  });

  it('creates signed evidence records for mapped controls', () => {
    const result = makeBenchmarkResult();
    const evidence = benchmarkToEvidence(result, MINI_FRAMEWORK);

    for (const record of evidence.evidenceRecords) {
      expect(verifyBenchmarkEvidence(record)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// generateBenchmarkComplianceReport
// ---------------------------------------------------------------------------

describe('generateBenchmarkComplianceReport', () => {
  it('generates report across multiple frameworks', () => {
    const result = makeBenchmarkResult();
    const fw2: ComplianceFramework = {
      ...MINI_FRAMEWORK,
      id: 'test-fw-2',
      name: 'Test Framework 2',
    };

    const report = generateBenchmarkComplianceReport(result, [MINI_FRAMEWORK, fw2]);

    expect(report.frameworks).toHaveLength(2);
    expect(typeof report.overallScore).toBe('number');
    expect(report.totalControls).toBe(6);
    expect(report.generatedAt).toBeTruthy();
  });

  it('returns 0 score with no frameworks', () => {
    const result = makeBenchmarkResult();
    const report = generateBenchmarkComplianceReport(result, []);
    expect(report.overallScore).toBe(0);
    expect(report.totalControls).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// formatBenchmarkComplianceReport
// ---------------------------------------------------------------------------

describe('formatBenchmarkComplianceReport', () => {
  it('generates markdown report', () => {
    const result = makeBenchmarkResult();
    const report = generateBenchmarkComplianceReport(result, [MINI_FRAMEWORK]);
    const markdown = formatBenchmarkComplianceReport(report);

    expect(markdown).toContain('# Benchmark Compliance Evidence Report');
    expect(markdown).toContain('Test Framework');
    expect(markdown).toContain('Coverage');
    expect(markdown).toContain('Evidence Records');
  });
});
