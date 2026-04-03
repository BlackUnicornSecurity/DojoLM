/**
 * Tests for H25.3: Transfer Matrix Reporter
 */

import { describe, it, expect } from 'vitest';
import {
  generateTransferReport,
  formatReportMarkdown,
  formatReportJSON,
  formatReportCSV,
} from './reporter.js';
import type { TransferMatrix, TransferSummary } from './types.js';

function makeMatrix(): TransferMatrix {
  return {
    modelIds: ['model-a', 'model-b'],
    matrix: [
      [1.0, 0.75],
      [0.5, 1.0],
    ],
    pairDetails: {},
  };
}

function makeSummary(): TransferSummary {
  return {
    averageTransferRate: 0.625,
    highestPair: { source: 'model-a', target: 'model-b', rate: 0.75 },
    lowestPair: { source: 'model-b', target: 'model-a', rate: 0.5 },
    totalFixtures: 10,
    totalModels: 2,
  };
}

describe('Transfer Matrix Reporter', () => {
  it('generateTransferReport creates report with all fields', () => {
    const report = generateTransferReport(
      makeMatrix(),
      { 'model-a': '1.0', 'model-b': '2.0' },
      makeSummary(),
    );

    expect(report.matrix).toBeDefined();
    expect(report.generatedAt).toBeTruthy();
    expect(report.methodology).toBeTruthy();
    expect(report.modelVersions['model-a']).toBe('1.0');
    expect(report.summary.totalModels).toBe(2);
  });

  it('formatReportMarkdown produces valid markdown with table', () => {
    const report = generateTransferReport(makeMatrix(), { 'model-a': '1.0', 'model-b': '2.0' }, makeSummary());
    const md = formatReportMarkdown(report);

    expect(md).toContain('# Transfer Matrix Report');
    expect(md).toContain('## Summary');
    expect(md).toContain('model-a');
    expect(md).toContain('model-b');
    expect(md).toContain('75.0%');
    expect(md).toContain('| Source \\ Target |');
  });

  it('formatReportJSON produces valid parseable JSON', () => {
    const report = generateTransferReport(makeMatrix(), {}, makeSummary());
    const json = formatReportJSON(report);
    const parsed = JSON.parse(json);

    expect(parsed.matrix.modelIds).toEqual(['model-a', 'model-b']);
    expect(parsed.summary.totalModels).toBe(2);
  });

  it('formatReportCSV produces correct CSV structure', () => {
    const report = generateTransferReport(makeMatrix(), {}, makeSummary());
    const csv = formatReportCSV(report);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Source\\Target,model-a,model-b');
    expect(lines[1]).toContain('model-a');
    expect(lines[1]).toContain('1.0000');
    expect(lines[1]).toContain('0.7500');
    expect(lines).toHaveLength(3);
  });
});
