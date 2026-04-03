/**
 * Tests for SARIF reporter
 */

import { describe, it, expect } from 'vitest';
import { generateSarifReport, extractRules, findingsToSarifResults } from './sarif-reporter.js';
import type { ScanResult, Finding } from '../types.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    category: 'Test',
    severity: 'WARNING',
    description: 'Test finding',
    match: 'test match',
    source: 'test',
    engine: 'test-engine',
    ...overrides,
  };
}

function makeResult(findings: Finding[] = []): ScanResult {
  return {
    findings,
    verdict: 'ALLOW',
    elapsed: 10,
    textLength: 50,
    normalizedLength: 50,
    counts: { critical: 0, warning: 0, info: 0 },
  };
}

describe('extractRules', () => {
  it('returns empty array for no findings', () => {
    expect(extractRules([])).toEqual([]);
  });

  it('deduplicates rules by pattern_name/category', () => {
    const findings = [
      makeFinding({ pattern_name: 'rule-1', category: 'Cat A' }),
      makeFinding({ pattern_name: 'rule-1', category: 'Cat A' }),
      makeFinding({ category: 'Cat B' }),
    ];
    const rules = extractRules(findings);
    expect(rules).toHaveLength(2);
    expect(rules[0].id).toBe('rule-1');
    expect(rules[1].id).toBe('Cat B');
  });

  it('maps severity to correct SARIF level', () => {
    const rules = extractRules([makeFinding({ severity: 'CRITICAL' })]);
    expect(rules[0].defaultConfiguration.level).toBe('error');
  });
});

describe('findingsToSarifResults', () => {
  it('maps findings to SARIF results with location', () => {
    const findings = [makeFinding({ severity: 'WARNING' })];
    const results = findingsToSarifResults(findings, 'test.txt');
    expect(results).toHaveLength(1);
    expect(results[0].level).toBe('warning');
    expect(results[0].locations[0].physicalLocation.artifactLocation.uri).toBe('test.txt');
  });

  it('maps CRITICAL to error level', () => {
    const results = findingsToSarifResults([makeFinding({ severity: 'CRITICAL' })], 'f.txt');
    expect(results[0].level).toBe('error');
  });

  it('maps INFO to note level', () => {
    const results = findingsToSarifResults([makeFinding({ severity: 'INFO' })], 'f.txt');
    expect(results[0].level).toBe('note');
  });
});

describe('generateSarifReport', () => {
  it('generates a valid SARIF 2.1.0 structure', () => {
    const report = generateSarifReport(makeResult([makeFinding()]));
    expect(report.version).toBe('2.1.0');
    expect(report.$schema).toContain('sarif-schema-2.1.0');
    expect(report.runs).toHaveLength(1);
    expect(report.runs[0].tool.driver.name).toBe('DojoLM Scanner');
  });

  it('includes rules and results for findings', () => {
    const report = generateSarifReport(makeResult([makeFinding(), makeFinding({ category: 'Other' })]));
    expect(report.runs[0].tool.driver.rules.length).toBeGreaterThanOrEqual(1);
    expect(report.runs[0].results).toHaveLength(2);
  });

  it('handles empty findings', () => {
    const report = generateSarifReport(makeResult());
    expect(report.runs[0].results).toHaveLength(0);
    expect(report.runs[0].tool.driver.rules).toHaveLength(0);
  });
});
