/**
 * Tests for KATANA Validation Report Generator (K3.8)
 *
 * Tests report generation in JSON, Markdown, and CSV formats.
 */

import { describe, it, expect } from 'vitest';
import {
  generateReport,
  exportReportJSON,
  exportReportMarkdown,
  exportReportCSV,
  exportReport,
} from '../reports/validation-report.js';
import { SCHEMA_VERSION, type ValidationRun, type EnvironmentSnapshot } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnvironment(): EnvironmentSnapshot {
  return {
    schema_version: SCHEMA_VERSION,
    os: { platform: 'test', release: '1.0', arch: 'x64' },
    node: { version: 'v20.0.0', v8: '11.0' },
    cpu: { model: 'Test CPU', cores: 4 },
    memory: { total_mb: 16384 },
    locale: 'en-US',
    timezone: 'UTC',
    git: { hash: 'abc123def456', dirty: false, branch: 'main' },
    package_version: '1.0.0',
    timestamp: '2026-03-21T00:00:00.000Z',
  };
}

function makeValidationRun(overrides: Partial<ValidationRun> = {}): ValidationRun {
  return {
    schema_version: SCHEMA_VERSION,
    run_id: 'run-test-1',
    status: 'completed',
    started_at: '2026-03-21T00:00:00.000Z',
    completed_at: '2026-03-21T00:01:00.000Z',
    environment: makeEnvironment(),
    modules_validated: ['enhanced-pi'],
    corpus_version: 'corpus-v1',
    include_holdout: false,
    total_samples: 100,
    samples_processed: 100,
    results: [
      {
        schema_version: SCHEMA_VERSION,
        sample_id: 'sample-1',
        module_id: 'enhanced-pi',
        expected_verdict: 'malicious',
        actual_verdict: 'malicious',
        correct: true,
        actual_severity: 'CRITICAL',
        actual_categories: ['PROMPT_INJECTION'],
        actual_findings_count: 1,
        elapsed_ms: 5.0,
      },
    ],
    per_module_matrices: {
      'enhanced-pi': {
        schema_version: SCHEMA_VERSION,
        module_id: 'enhanced-pi',
        tp: 50,
        tn: 50,
        fp: 0,
        fn: 0,
        total: 100,
      },
    },
    per_module_metrics: {
      'enhanced-pi': {
        schema_version: SCHEMA_VERSION,
        module_id: 'enhanced-pi',
        accuracy: 1.0,
        precision: 1.0,
        recall: 1.0,
        f1: 1.0,
        mcc: 1.0,
        specificity: 1.0,
        fpr: 0.0,
        fnr: 0.0,
      },
    },
    per_module_decisions: {
      'enhanced-pi': {
        schema_version: SCHEMA_VERSION,
        module_id: 'enhanced-pi',
        verdict: 'PASS',
        total_samples: 100,
        false_positives: 0,
        false_negatives: 0,
        non_conformities: [],
      },
    },
    non_conformity_count: 0,
    overall_verdict: 'PASS',
    elapsed_ms: 60000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

describe('generateReport', () => {
  it('generates a valid report from a validation run', () => {
    const run = makeValidationRun();
    const report = generateReport(run);

    expect(report.schema_version).toBe(SCHEMA_VERSION);
    expect(report.report_id).toBeTruthy();
    expect(report.run_id).toBe('run-test-1');
    expect(report.corpus_version).toBe('corpus-v1');
    expect(report.tool_version).toBe('1.0.0');
    expect(report.overall_verdict).toBe('PASS');
    expect(report.non_conformity_count).toBe(0);
    expect(report.modules).toHaveLength(1);
  });

  it('includes per-module details', () => {
    const run = makeValidationRun();
    const report = generateReport(run);
    const mod = report.modules[0];

    expect(mod.module_id).toBe('enhanced-pi');
    expect(mod.matrix.tp).toBe(50);
    expect(mod.matrix.tn).toBe(50);
    expect(mod.metrics.accuracy).toBe(1.0);
    expect(mod.decision.verdict).toBe('PASS');
    expect(mod.uncertainty.length).toBeGreaterThan(0);
  });

  it('applies module tiers from options', () => {
    const run = makeValidationRun();
    const report = generateReport(run, {
      moduleTiers: { 'enhanced-pi': 1 },
    });

    expect(report.modules[0].tier).toBe(1);
  });

  it('applies calibration certificates from options', () => {
    const run = makeValidationRun();
    const report = generateReport(run, {
      calibrationCertificates: { 'enhanced-pi': 'cert-123' },
    });

    expect(report.modules[0].calibration_certificate_id).toBe('cert-123');
  });

  it('defaults tier to 1 and certificate to none', () => {
    const run = makeValidationRun();
    const report = generateReport(run);

    expect(report.modules[0].tier).toBe(1);
    expect(report.modules[0].calibration_certificate_id).toBe('none');
  });

  it('throws for missing module results', () => {
    const run = makeValidationRun({
      modules_validated: ['enhanced-pi', 'missing-module'],
    });

    expect(() => generateReport(run)).toThrow("Missing results for module 'missing-module'");
  });

  it('handles multi-module runs', () => {
    const run = makeValidationRun({
      modules_validated: ['enhanced-pi', 'pii-detector'],
      per_module_matrices: {
        'enhanced-pi': {
          schema_version: SCHEMA_VERSION,
          module_id: 'enhanced-pi',
          tp: 50, tn: 50, fp: 0, fn: 0, total: 100,
        },
        'pii-detector': {
          schema_version: SCHEMA_VERSION,
          module_id: 'pii-detector',
          tp: 30, tn: 60, fp: 5, fn: 5, total: 100,
        },
      },
      per_module_metrics: {
        'enhanced-pi': {
          schema_version: SCHEMA_VERSION,
          module_id: 'enhanced-pi',
          accuracy: 1.0, precision: 1.0, recall: 1.0, f1: 1.0,
          mcc: 1.0, specificity: 1.0, fpr: 0, fnr: 0,
        },
        'pii-detector': {
          schema_version: SCHEMA_VERSION,
          module_id: 'pii-detector',
          accuracy: 0.9, precision: 0.857, recall: 0.857, f1: 0.857,
          mcc: 0.786, specificity: 0.923, fpr: 0.077, fnr: 0.143,
        },
      },
      per_module_decisions: {
        'enhanced-pi': {
          schema_version: SCHEMA_VERSION,
          module_id: 'enhanced-pi',
          verdict: 'PASS', total_samples: 100,
          false_positives: 0, false_negatives: 0,
          non_conformities: [],
        },
        'pii-detector': {
          schema_version: SCHEMA_VERSION,
          module_id: 'pii-detector',
          verdict: 'FAIL', total_samples: 100,
          false_positives: 5, false_negatives: 5,
          non_conformities: [
            { sample_id: 'fp-1', type: 'false_positive', expected: 'clean', actual: 'malicious' },
          ],
        },
      },
    });

    const report = generateReport(run);
    expect(report.modules).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

describe('exportReportJSON', () => {
  it('exports valid JSON', () => {
    const report = generateReport(makeValidationRun());
    const json = exportReportJSON(report);
    const parsed = JSON.parse(json);
    expect(parsed.schema_version).toBe(SCHEMA_VERSION);
    expect(parsed.modules).toHaveLength(1);
  });

  it('is pretty-printed', () => {
    const json = exportReportJSON(generateReport(makeValidationRun()));
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });
});

// ---------------------------------------------------------------------------
// Markdown Export
// ---------------------------------------------------------------------------

describe('exportReportMarkdown', () => {
  it('includes report header', () => {
    const md = exportReportMarkdown(generateReport(makeValidationRun()));
    expect(md).toContain('# DojoLM Validation Testing Report');
    expect(md).toContain('**Report ID:**');
    expect(md).toContain('**Overall Verdict:** PASS');
  });

  it('includes executive summary', () => {
    const md = exportReportMarkdown(generateReport(makeValidationRun()));
    expect(md).toContain('## Executive Summary');
    expect(md).toContain('**Modules Validated:** 1');
    expect(md).toContain('**Passed:** 1');
  });

  it('includes environment section', () => {
    const md = exportReportMarkdown(generateReport(makeValidationRun()));
    expect(md).toContain('## Environment');
    expect(md).toContain('v20.0.0');
    expect(md).toContain('Test CPU');
  });

  it('includes per-module confusion matrix', () => {
    const md = exportReportMarkdown(generateReport(makeValidationRun()));
    expect(md).toContain('#### Confusion Matrix');
    expect(md).toContain('TP: 50');
    expect(md).toContain('TN: 50');
  });

  it('includes metrics table', () => {
    const md = exportReportMarkdown(generateReport(makeValidationRun()));
    expect(md).toContain('#### Metrics');
    expect(md).toContain('100.00%');
  });

  it('includes uncertainty budget', () => {
    const md = exportReportMarkdown(generateReport(makeValidationRun()));
    expect(md).toContain('#### Uncertainty Budget');
    expect(md).toContain('Wilson CI');
    expect(md).toContain('Clopper-Pearson CI');
  });

  it('includes decision rule section', () => {
    const md = exportReportMarkdown(generateReport(makeValidationRun()));
    expect(md).toContain('#### Decision Rule (ISO 7.8.6)');
    expect(md).toContain('Zero-defect acceptance');
  });

  it('includes non-conformity register when present', () => {
    const run = makeValidationRun({
      per_module_decisions: {
        'enhanced-pi': {
          schema_version: SCHEMA_VERSION,
          module_id: 'enhanced-pi',
          verdict: 'FAIL',
          total_samples: 100,
          false_positives: 1,
          false_negatives: 0,
          non_conformities: [{
            sample_id: 'fp-1',
            type: 'false_positive',
            expected: 'clean',
            actual: 'malicious',
          }],
        },
      },
    });

    const md = exportReportMarkdown(generateReport(run));
    expect(md).toContain('## Non-Conformity Register');
    expect(md).toContain('fp-1');
    expect(md).toContain('false_positive');
  });

  it('includes signature when present', () => {
    const report = generateReport(makeValidationRun());
    const signedReport = { ...report, signature: 'abc123def456' };
    const md = exportReportMarkdown(signedReport);
    expect(md).toContain('## Digital Signature');
    expect(md).toContain('abc123def456');
  });

  it('includes ISO reference footer', () => {
    const md = exportReportMarkdown(generateReport(makeValidationRun()));
    expect(md).toContain('ISO/IEC 17025:2017');
  });
});

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

describe('exportReportCSV', () => {
  it('includes header row', () => {
    const csv = exportReportCSV(generateReport(makeValidationRun()));
    const lines = csv.split('\n');
    expect(lines[0]).toContain('module_id');
    expect(lines[0]).toContain('accuracy');
    expect(lines[0]).toContain('verdict');
  });

  it('includes data row per module', () => {
    const csv = exportReportCSV(generateReport(makeValidationRun()));
    const lines = csv.split('\n');
    expect(lines.length).toBe(2); // header + 1 module
    expect(lines[1]).toContain('enhanced-pi');
    expect(lines[1]).toContain('PASS');
  });

  it('includes all metrics columns', () => {
    const csv = exportReportCSV(generateReport(makeValidationRun()));
    const header = csv.split('\n')[0];
    for (const col of ['tp', 'tn', 'fp', 'fn', 'precision', 'recall', 'f1', 'mcc', 'fpr', 'fnr']) {
      expect(header).toContain(col);
    }
  });
});

// ---------------------------------------------------------------------------
// Format Router
// ---------------------------------------------------------------------------

describe('exportReport', () => {
  it('routes to JSON format', () => {
    const report = generateReport(makeValidationRun());
    const output = exportReport(report, 'json');
    expect(JSON.parse(output)).toBeDefined();
  });

  it('routes to Markdown format', () => {
    const report = generateReport(makeValidationRun());
    const output = exportReport(report, 'markdown');
    expect(output).toContain('# DojoLM Validation Testing Report');
  });

  it('routes to CSV format', () => {
    const report = generateReport(makeValidationRun());
    const output = exportReport(report, 'csv');
    expect(output).toContain('module_id');
  });
});
