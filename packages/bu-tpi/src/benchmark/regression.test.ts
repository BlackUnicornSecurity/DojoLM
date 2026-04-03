/**
 * GUNKIMONO Phase 6.2: Benchmark Regression Tracker Tests
 */

import { describe, it, expect } from 'vitest';
import {
  classifyRegression,
  compareBenchmarkResults,
  detectBenchmarkRegressions,
  formatRegressionReport,
  DEFAULT_THRESHOLDS,
} from './regression.js';
import type { BenchmarkResult } from './types.js';

// --- Helpers ---

function makeResult(
  overrides: Partial<BenchmarkResult> = {},
): BenchmarkResult {
  return {
    suiteId: 'test-suite',
    modelId: 'model-a',
    modelName: 'Model A',
    provider: 'test',
    overallScore: 80,
    categoryScores: {
      'prompt-injection': 0.9,
      'jailbreak': 0.8,
      'tool-manipulation': 0.7,
    },
    breakdown: [],
    executedAt: '2026-04-01T00:00:00.000Z',
    elapsed: 100,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// classifyRegression
// ---------------------------------------------------------------------------

describe('classifyRegression', () => {
  it('returns critical for large drops', () => {
    expect(classifyRegression(-0.15)).toBe('critical');
  });

  it('returns warning for medium drops', () => {
    expect(classifyRegression(-0.07)).toBe('warning');
  });

  it('returns info for small drops', () => {
    expect(classifyRegression(-0.02)).toBe('info');
  });

  it('uses custom thresholds', () => {
    const custom = { critical: 0.50, warning: 0.30, tolerance: 0.01 };
    expect(classifyRegression(-0.20, custom)).toBe('info');
    expect(classifyRegression(-0.35, custom)).toBe('warning');
    expect(classifyRegression(-0.55, custom)).toBe('critical');
  });
});

// ---------------------------------------------------------------------------
// compareBenchmarkResults
// ---------------------------------------------------------------------------

describe('compareBenchmarkResults', () => {
  it('detects regressions when scores drop', () => {
    const baseline = makeResult();
    const current = makeResult({
      modelId: 'model-b',
      overallScore: 60,
      categoryScores: {
        'prompt-injection': 0.7, // dropped from 0.9
        'jailbreak': 0.8,       // same
        'tool-manipulation': 0.5, // dropped from 0.7
      },
    });

    const result = compareBenchmarkResults(baseline, current);
    expect(result.hasRegression).toBe(true);
    expect(result.regressions).toHaveLength(2);
    expect(result.regressions[0].category).toBe('prompt-injection');
    expect(result.regressions[1].category).toBe('tool-manipulation');
  });

  it('detects improvements when scores increase', () => {
    const baseline = makeResult();
    const current = makeResult({
      modelId: 'model-b',
      overallScore: 95,
      categoryScores: {
        'prompt-injection': 1.0,
        'jailbreak': 0.95,
        'tool-manipulation': 0.9,
      },
    });

    const result = compareBenchmarkResults(baseline, current);
    expect(result.hasRegression).toBe(false);
    expect(result.improvements.length).toBeGreaterThan(0);
  });

  it('marks categories as unchanged within tolerance', () => {
    const baseline = makeResult();
    const current = makeResult({
      modelId: 'model-b',
      categoryScores: {
        'prompt-injection': 0.905, // within 0.01 tolerance
        'jailbreak': 0.8,
        'tool-manipulation': 0.7,
      },
    });

    const result = compareBenchmarkResults(baseline, current);
    expect(result.unchanged).toContain('jailbreak');
    expect(result.unchanged).toContain('tool-manipulation');
  });

  it('handles new categories in current', () => {
    const baseline = makeResult();
    const current = makeResult({
      modelId: 'model-b',
      categoryScores: {
        ...baseline.categoryScores,
        'new-category': 0.85,
      },
    });

    const result = compareBenchmarkResults(baseline, current);
    expect(result.improvements.some((r) => r.category === 'new-category')).toBe(true);
  });

  it('handles categories removed in current', () => {
    const baseline = makeResult({
      categoryScores: {
        'prompt-injection': 0.9,
        'jailbreak': 0.8,
        'old-category': 0.6,
      },
    });
    const current = makeResult({
      modelId: 'model-b',
      categoryScores: {
        'prompt-injection': 0.9,
        'jailbreak': 0.8,
      },
    });

    const result = compareBenchmarkResults(baseline, current);
    expect(result.regressions.some((r) => r.category === 'old-category')).toBe(true);
  });

  it('computes correct overall delta', () => {
    const baseline = makeResult({ overallScore: 80 });
    const current = makeResult({ modelId: 'model-b', overallScore: 75 });

    const result = compareBenchmarkResults(baseline, current);
    expect(result.overallDelta).toBe(-5);
  });
});

// ---------------------------------------------------------------------------
// detectBenchmarkRegressions
// ---------------------------------------------------------------------------

describe('detectBenchmarkRegressions', () => {
  it('returns no regressions with empty history', () => {
    const current = makeResult();
    const result = detectBenchmarkRegressions(current, []);
    expect(result.hasRegression).toBe(false);
    expect(result.regressions).toHaveLength(0);
    expect(result.unchanged).toHaveLength(3);
  });

  it('detects regression vs most recent run', () => {
    const old = makeResult({ executedAt: '2026-03-01T00:00:00.000Z' });
    const recent = makeResult({ executedAt: '2026-04-01T00:00:00.000Z' });
    const current = makeResult({
      modelId: 'model-b',
      categoryScores: {
        'prompt-injection': 0.6,
        'jailbreak': 0.8,
        'tool-manipulation': 0.7,
      },
    });

    const result = detectBenchmarkRegressions(current, [old, recent]);
    expect(result.hasRegression).toBe(true);
    expect(result.regressions.some((r) => r.category === 'prompt-injection')).toBe(true);
  });

  it('detects regression vs peak historical score', () => {
    const run1 = makeResult({
      executedAt: '2026-01-01T00:00:00.000Z',
      categoryScores: {
        'prompt-injection': 1.0, // historical peak
        'jailbreak': 0.8,
        'tool-manipulation': 0.7,
      },
    });
    const run2 = makeResult({
      executedAt: '2026-02-01T00:00:00.000Z',
      categoryScores: {
        'prompt-injection': 0.9, // dropped from peak
        'jailbreak': 0.8,
        'tool-manipulation': 0.7,
      },
    });
    const current = makeResult({
      modelId: 'model-b',
      categoryScores: {
        'prompt-injection': 0.85, // below peak of 1.0
        'jailbreak': 0.8,
        'tool-manipulation': 0.7,
      },
    });

    const result = detectBenchmarkRegressions(current, [run1, run2]);
    // Should detect regression vs peak (1.0 → 0.85)
    expect(result.hasRegression).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatRegressionReport
// ---------------------------------------------------------------------------

describe('formatRegressionReport', () => {
  it('generates markdown report with regressions', () => {
    const baseline = makeResult();
    const current = makeResult({
      modelId: 'model-b',
      overallScore: 60,
      categoryScores: {
        'prompt-injection': 0.6,
        'jailbreak': 0.5,
        'tool-manipulation': 0.7,
      },
    });

    const comparison = compareBenchmarkResults(baseline, current);
    const report = formatRegressionReport(comparison);

    expect(report).toContain('# Benchmark Regression Report');
    expect(report).toContain('Has Regression**: YES');
    expect(report).toContain('## Regressions');
    expect(report).toContain('prompt-injection');
  });

  it('generates report with no regressions', () => {
    const baseline = makeResult();
    const current = makeResult({
      modelId: 'model-b',
      overallScore: 95,
      categoryScores: {
        'prompt-injection': 1.0,
        'jailbreak': 0.95,
        'tool-manipulation': 0.9,
      },
    });

    const comparison = compareBenchmarkResults(baseline, current);
    const report = formatRegressionReport(comparison);

    expect(report).toContain('Has Regression**: NO');
    expect(report).toContain('## Improvements');
  });

  it('includes unchanged section', () => {
    const baseline = makeResult();
    const current = makeResult({ modelId: 'model-b' });

    const comparison = compareBenchmarkResults(baseline, current);
    const report = formatRegressionReport(comparison);

    expect(report).toContain('## Unchanged');
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_THRESHOLDS
// ---------------------------------------------------------------------------

describe('DEFAULT_THRESHOLDS', () => {
  it('has expected values', () => {
    expect(DEFAULT_THRESHOLDS.critical).toBe(0.10);
    expect(DEFAULT_THRESHOLDS.warning).toBe(0.05);
    expect(DEFAULT_THRESHOLDS.tolerance).toBe(0.01);
  });
});
