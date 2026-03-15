/**
 * H25: Transfer Matrix Tests
 * Tests for TransferTestRunner, matrix building, summary, and report formatting.
 */

import { describe, it, expect, vi } from 'vitest';
import { TransferTestRunner } from './runner.js';
import {
  generateTransferReport,
  formatReportMarkdown,
  formatReportJSON,
  formatReportCSV,
} from './reporter.js';
import type { TransferTestConfig, TransferResult } from './types.js';

// --- Helpers ---

function makeScanFn(verdictMap: Record<string, Record<string, 'BLOCK' | 'ALLOW'>>) {
  return (fixtureId: string, modelId: string) => ({
    verdict: verdictMap[modelId]?.[fixtureId] ?? ('ALLOW' as const),
  });
}

// --- Test Data ---

const TWO_MODEL_CONFIG: TransferTestConfig = {
  fixtureIds: ['fix-1', 'fix-2', 'fix-3'],
  modelIds: ['model-a', 'model-b'],
};

// model-a blocks fix-1, fix-2; allows fix-3
// model-b blocks fix-1; allows fix-2, fix-3
const TWO_MODEL_VERDICTS: Record<string, Record<string, 'BLOCK' | 'ALLOW'>> = {
  'model-a': { 'fix-1': 'BLOCK', 'fix-2': 'BLOCK', 'fix-3': 'ALLOW' },
  'model-b': { 'fix-1': 'BLOCK', 'fix-2': 'ALLOW', 'fix-3': 'ALLOW' },
};

// --- Tests ---

describe('TransferTestRunner', () => {
  /** TM-001: Matrix building with known data (2 models, 3 fixtures) */
  it('TM-001: builds matrix with known data', () => {
    const runner = new TransferTestRunner(TWO_MODEL_CONFIG);
    const results = runner.run(makeScanFn(TWO_MODEL_VERDICTS));
    const matrix = runner.buildMatrix(results);

    expect(matrix.modelIds).toEqual(['model-a', 'model-b']);
    expect(matrix.matrix).toHaveLength(2);
    expect(matrix.matrix[0]).toHaveLength(2);
    expect(matrix.matrix[1]).toHaveLength(2);
  });

  /** TM-002: Transfer rate calculation */
  it('TM-002: calculates correct transfer rates', () => {
    const runner = new TransferTestRunner(TWO_MODEL_CONFIG);
    const results = runner.run(makeScanFn(TWO_MODEL_VERDICTS));
    const matrix = runner.buildMatrix(results);

    // model-a -> model-b: fix-1 both BLOCK (transferred), fix-2 A=BLOCK B=ALLOW (not), fix-3 both ALLOW (not)
    // transferred count = 1, total = 3, rate = 1/3
    expect(matrix.matrix[0][1]).toBeCloseTo(1 / 3, 5);

    // model-b -> model-a: fix-1 both BLOCK (transferred), fix-2 B=ALLOW (source not BLOCK, not transferred), fix-3 both ALLOW (not)
    // transferred count = 1, total = 3, rate = 1/3
    expect(matrix.matrix[1][0]).toBeCloseTo(1 / 3, 5);
  });

  /** TM-003: Diagonal is always 1.0 */
  it('TM-003: diagonal is always 1.0', () => {
    const runner = new TransferTestRunner(TWO_MODEL_CONFIG);
    const results = runner.run(makeScanFn(TWO_MODEL_VERDICTS));
    const matrix = runner.buildMatrix(results);

    expect(matrix.matrix[0][0]).toBe(1.0);
    expect(matrix.matrix[1][1]).toBe(1.0);
  });

  /** TM-004: Summary statistics */
  it('TM-004: generates correct summary', () => {
    const runner = new TransferTestRunner(TWO_MODEL_CONFIG);
    const results = runner.run(makeScanFn(TWO_MODEL_VERDICTS));
    const matrix = runner.buildMatrix(results);
    const summary = runner.generateSummary(matrix);

    expect(summary.totalModels).toBe(2);
    expect(summary.totalFixtures).toBe(3);
    // Both off-diagonal rates are 1/3, so average = 1/3
    expect(summary.averageTransferRate).toBeCloseTo(1 / 3, 5);
    // Both pairs have same rate, highest/lowest are either pair
    expect(summary.highestPair.rate).toBeCloseTo(1 / 3, 5);
    expect(summary.lowestPair.rate).toBeCloseTo(1 / 3, 5);
  });

  /** TM-005: Markdown report generation */
  it('TM-005: generates markdown report with table, models, date', () => {
    const runner = new TransferTestRunner(TWO_MODEL_CONFIG);
    const results = runner.run(makeScanFn(TWO_MODEL_VERDICTS));
    const matrix = runner.buildMatrix(results);
    const summary = runner.generateSummary(matrix);
    const report = generateTransferReport(matrix, { 'model-a': '1.0', 'model-b': '2.0' }, summary);
    const md = formatReportMarkdown(report);

    expect(md).toContain('# Transfer Matrix Report');
    expect(md).toContain('model-a');
    expect(md).toContain('model-b');
    expect(md).toContain('| Source \\ Target |');
    expect(md).toContain('**Generated:**');
    expect(md).toContain('100.0%'); // diagonal
    expect(md).toContain('33.3%'); // 1/3 rate
  });

  /** TM-006: JSON report structure */
  it('TM-006: generates valid JSON report', () => {
    const runner = new TransferTestRunner(TWO_MODEL_CONFIG);
    const results = runner.run(makeScanFn(TWO_MODEL_VERDICTS));
    const matrix = runner.buildMatrix(results);
    const summary = runner.generateSummary(matrix);
    const report = generateTransferReport(matrix, { 'model-a': '1.0', 'model-b': '2.0' }, summary);
    const json = formatReportJSON(report);
    const parsed = JSON.parse(json);

    expect(parsed.matrix).toBeDefined();
    expect(parsed.generatedAt).toBeDefined();
    expect(parsed.methodology).toBeDefined();
    expect(parsed.modelVersions).toEqual({ 'model-a': '1.0', 'model-b': '2.0' });
    expect(parsed.summary.averageTransferRate).toBeCloseTo(1 / 3, 5);
    expect(parsed.summary.totalModels).toBe(2);
    expect(parsed.summary.totalFixtures).toBe(3);
  });

  /** TM-007: CSV export */
  it('TM-007: generates parseable CSV with correct headers', () => {
    const runner = new TransferTestRunner(TWO_MODEL_CONFIG);
    const results = runner.run(makeScanFn(TWO_MODEL_VERDICTS));
    const matrix = runner.buildMatrix(results);
    const summary = runner.generateSummary(matrix);
    const report = generateTransferReport(matrix, { 'model-a': '1.0', 'model-b': '2.0' }, summary);
    const csv = formatReportCSV(report);
    const lines = csv.split('\n');

    // Header
    expect(lines[0]).toBe('Source\\Target,model-a,model-b');
    // Data rows
    expect(lines).toHaveLength(3); // header + 2 models
    const row1Cells = lines[1].split(',');
    expect(row1Cells[0]).toBe('model-a');
    expect(parseFloat(row1Cells[1])).toBeCloseTo(1.0, 4); // diagonal
    expect(parseFloat(row1Cells[2])).toBeCloseTo(1 / 3, 4); // off-diagonal
  });

  /** TM-008: Progress callback fires */
  it('TM-008: progress callback fires with correct totals', () => {
    const runner = new TransferTestRunner(TWO_MODEL_CONFIG);
    const progressCalls: Array<{ completed: number; total: number }> = [];
    const onProgress = vi.fn((p: { completed: number; total: number }) => {
      progressCalls.push(p);
    });

    runner.run(makeScanFn(TWO_MODEL_VERDICTS), onProgress);

    // 2 models * 3 fixtures = 6 scans
    expect(onProgress).toHaveBeenCalledTimes(6);
    expect(progressCalls[0]).toEqual({ completed: 1, total: 6 });
    expect(progressCalls[5]).toEqual({ completed: 6, total: 6 });
  });

  /** TM-009: Single model (1x1 matrix) */
  it('TM-009: handles single model edge case', () => {
    const config: TransferTestConfig = {
      fixtureIds: ['fix-1', 'fix-2'],
      modelIds: ['model-only'],
    };
    const verdicts: Record<string, Record<string, 'BLOCK' | 'ALLOW'>> = {
      'model-only': { 'fix-1': 'BLOCK', 'fix-2': 'ALLOW' },
    };

    const runner = new TransferTestRunner(config);
    const results = runner.run(makeScanFn(verdicts));
    const matrix = runner.buildMatrix(results);

    expect(matrix.matrix).toEqual([[1.0]]);
    expect(matrix.modelIds).toEqual(['model-only']);

    const summary = runner.generateSummary(matrix);
    expect(summary.totalModels).toBe(1);
    expect(summary.totalFixtures).toBe(2);
    expect(summary.averageTransferRate).toBe(1.0);
  });
});
