/**
 * Tests for CLI formatters
 */

import { describe, it, expect } from 'vitest';
import { formatText, formatJson, formatSarif, formatJunit, formatCsv } from './formatters.js';
import type { ScanResult, Finding } from '../types.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    category: 'Test Category',
    severity: 'WARNING',
    description: 'Test description',
    match: 'test match text',
    source: 'test',
    engine: 'test-engine',
    ...overrides,
  };
}

function makeResult(findings: Finding[] = []): ScanResult {
  return {
    findings,
    verdict: findings.some(f => f.severity === 'CRITICAL') ? 'BLOCK' : 'ALLOW',
    elapsed: 1.5,
    textLength: 100,
    normalizedLength: 95,
    counts: {
      critical: findings.filter(f => f.severity === 'CRITICAL').length,
      warning: findings.filter(f => f.severity === 'WARNING').length,
      info: findings.filter(f => f.severity === 'INFO').length,
    },
  };
}

describe('formatText', () => {
  it('includes verdict and findings count', () => {
    const output = formatText(makeResult());
    expect(output).toContain('Verdict: ALLOW');
    expect(output).toContain('Findings: 0');
  });

  it('includes filename when provided', () => {
    const output = formatText(makeResult(), 'test.txt');
    expect(output).toContain('File: test.txt');
  });

  it('includes finding details in table format', () => {
    const output = formatText(makeResult([makeFinding()]));
    expect(output).toContain('WARNING');
    expect(output).toContain('Test Category');
    expect(output).toContain('test-engine');
  });

  it('includes elapsed time and text length', () => {
    const output = formatText(makeResult());
    expect(output).toContain('1.50ms');
    expect(output).toContain('100');
  });
});

describe('formatJson', () => {
  it('returns valid JSON', () => {
    const json = formatJson(makeResult([makeFinding()]));
    const parsed = JSON.parse(json);
    expect(parsed.verdict).toBe('ALLOW');
    expect(parsed.findings).toHaveLength(1);
  });

  it('is pretty-printed with 2-space indent', () => {
    const json = formatJson(makeResult());
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });
});

describe('formatSarif', () => {
  it('returns valid SARIF 2.1.0 JSON', () => {
    const sarif = formatSarif([{ result: makeResult([makeFinding()]), filename: 'test.txt' }]);
    const parsed = JSON.parse(sarif);
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs).toHaveLength(1);
    expect(parsed.runs[0].tool.driver.name).toBe('TPI Scanner');
  });

  it('includes rules for findings', () => {
    const sarif = JSON.parse(formatSarif([{ result: makeResult([makeFinding()]) }]));
    expect(sarif.runs[0].tool.driver.rules.length).toBeGreaterThan(0);
  });

  it('handles empty results', () => {
    const sarif = JSON.parse(formatSarif([{ result: makeResult() }]));
    expect(sarif.runs[0].results).toHaveLength(0);
  });
});

describe('formatJunit', () => {
  it('returns valid XML', () => {
    const xml = formatJunit([{ result: makeResult() }]);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<testsuites');
  });

  it('generates no-findings test case for empty results', () => {
    const xml = formatJunit([{ result: makeResult() }]);
    expect(xml).toContain('no-findings');
  });

  it('includes failure elements for critical findings', () => {
    const finding = makeFinding({ severity: 'CRITICAL' });
    const xml = formatJunit([{ result: makeResult([finding]) }]);
    expect(xml).toContain('<failure');
  });
});

describe('formatCsv', () => {
  it('includes CSV header row', () => {
    const csv = formatCsv(makeResult());
    expect(csv).toContain('file,category,severity,description,match,engine');
  });

  it('generates data rows for findings', () => {
    const csv = formatCsv(makeResult([makeFinding()]));
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2); // header + 1 data row
    expect(lines[1]).toContain('Test Category');
  });

  it('escapes commas in fields', () => {
    const finding = makeFinding({ description: 'Hello, world' });
    const csv = formatCsv(makeResult([finding]));
    expect(csv).toContain('"Hello, world"');
  });
});
