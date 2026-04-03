/**
 * Tests for JUnit reporter
 */

import { describe, it, expect } from 'vitest';
import { generateJUnitReport } from './junit-reporter.js';
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
    verdict: findings.some(f => f.severity === 'CRITICAL') ? 'BLOCK' : 'ALLOW',
    elapsed: 42,
    textLength: 100,
    normalizedLength: 100,
    counts: {
      critical: findings.filter(f => f.severity === 'CRITICAL').length,
      warning: findings.filter(f => f.severity === 'WARNING').length,
      info: findings.filter(f => f.severity === 'INFO').length,
    },
  };
}

describe('generateJUnitReport', () => {
  it('generates valid XML with no findings', () => {
    const result = makeResult();
    const xml = generateJUnitReport(result);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<testsuites>');
    expect(xml).toContain('no-findings');
    expect(xml).toContain('tests="1"');
    expect(xml).toContain('failures="0"');
  });

  it('generates failure elements for CRITICAL findings', () => {
    const finding = makeFinding({ severity: 'CRITICAL', pattern_name: 'pi-detect' });
    const xml = generateJUnitReport(makeResult([finding]));
    expect(xml).toContain('<failure');
    expect(xml).toContain('CRITICAL');
  });

  it('generates failure elements for WARNING findings', () => {
    const finding = makeFinding({ severity: 'WARNING' });
    const xml = generateJUnitReport(makeResult([finding]));
    expect(xml).toContain('<failure');
    expect(xml).toContain('WARNING');
  });

  it('generates system-out for INFO findings', () => {
    const finding = makeFinding({ severity: 'INFO' });
    const xml = generateJUnitReport(makeResult([finding]));
    expect(xml).toContain('<system-out>');
  });

  it('escapes XML special characters', () => {
    const finding = makeFinding({ description: 'Test <script> & "quotes"' });
    const xml = generateJUnitReport(makeResult([finding]));
    expect(xml).toContain('&lt;script&gt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;quotes&quot;');
  });

  it('accepts custom suite name', () => {
    const xml = generateJUnitReport(makeResult(), 'Custom Suite');
    expect(xml).toContain('Custom Suite');
  });
});
