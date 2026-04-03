/**
 * MUSUBI Phase 7.2: CI/CD Integration Tests
 */

import { describe, it, expect } from 'vitest';
import type { ScanResult, Finding } from '../types.js';
import {
  extractRules,
  findingsToSarifResults,
  generateSarifReport,
} from './sarif-reporter.js';
import { generateJUnitReport } from './junit-reporter.js';

// ============================================================================
// Helpers
// ============================================================================

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    category: 'PROMPT_INJECTION',
    severity: 'CRITICAL',
    description: 'System override detected',
    match: 'ignore previous instructions',
    source: 'current',
    engine: 'core',
    pattern_name: 'pi-system-override',
    weight: 9,
    ...overrides,
  };
}

function makeScanResult(findings: Finding[] = [makeFinding()]): ScanResult {
  return {
    findings,
    verdict: findings.some((f) => f.severity === 'CRITICAL') ? 'BLOCK' : 'ALLOW',
    elapsed: 42,
    textLength: 100,
    normalizedLength: 100,
    counts: {
      critical: findings.filter((f) => f.severity === 'CRITICAL').length,
      warning: findings.filter((f) => f.severity === 'WARNING').length,
      info: findings.filter((f) => f.severity === 'INFO').length,
    },
  };
}

// ============================================================================
// SARIF Reporter Tests
// ============================================================================

describe('SARIF Reporter', () => {
  describe('extractRules', () => {
    it('extracts unique rules from findings', () => {
      const findings = [
        makeFinding({ pattern_name: 'rule-1', category: 'CAT_A' }),
        makeFinding({ pattern_name: 'rule-2', category: 'CAT_B' }),
        makeFinding({ pattern_name: 'rule-1', category: 'CAT_A' }),
      ];
      const rules = extractRules(findings);
      expect(rules).toHaveLength(2);
      expect(rules[0].id).toBe('rule-1');
      expect(rules[1].id).toBe('rule-2');
    });

    it('maps severity to SARIF level', () => {
      const findings = [
        makeFinding({ severity: 'CRITICAL', pattern_name: 'r1' }),
        makeFinding({ severity: 'WARNING', pattern_name: 'r2' }),
        makeFinding({ severity: 'INFO', pattern_name: 'r3' }),
      ];
      const rules = extractRules(findings);
      expect(rules[0].defaultConfiguration.level).toBe('error');
      expect(rules[1].defaultConfiguration.level).toBe('warning');
      expect(rules[2].defaultConfiguration.level).toBe('note');
    });
  });

  describe('findingsToSarifResults', () => {
    it('converts findings to SARIF results', () => {
      const results = findingsToSarifResults([makeFinding()], 'test.txt');
      expect(results).toHaveLength(1);
      expect(results[0].ruleId).toBe('pi-system-override');
      expect(results[0].level).toBe('error');
      expect(results[0].locations[0].physicalLocation.artifactLocation.uri).toBe('test.txt');
    });
  });

  describe('generateSarifReport', () => {
    it('generates valid SARIF structure', () => {
      const report = generateSarifReport(makeScanResult());
      expect(report.$schema).toContain('sarif-schema');
      expect(report.version).toBe('2.1.0');
      expect(report.runs).toHaveLength(1);
      expect(report.runs[0].tool.driver.name).toBe('DojoLM Scanner');
      expect(report.runs[0].results.length).toBeGreaterThan(0);
    });

    it('includes rules in tool driver', () => {
      const report = generateSarifReport(makeScanResult());
      expect(report.runs[0].tool.driver.rules.length).toBeGreaterThan(0);
    });

    it('handles empty findings', () => {
      const report = generateSarifReport(makeScanResult([]));
      expect(report.runs[0].results).toHaveLength(0);
      expect(report.runs[0].tool.driver.rules).toHaveLength(0);
    });

    it('produces valid JSON', () => {
      const report = generateSarifReport(makeScanResult());
      expect(() => JSON.parse(JSON.stringify(report))).not.toThrow();
    });
  });
});

// ============================================================================
// JUnit Reporter Tests
// ============================================================================

describe('JUnit Reporter', () => {
  describe('generateJUnitReport', () => {
    it('generates valid XML structure', () => {
      const xml = generateJUnitReport(makeScanResult());
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<testsuites>');
      expect(xml).toContain('</testsuites>');
      expect(xml).toContain('<testsuite');
    });

    it('includes test case for each finding', () => {
      const findings = [
        makeFinding({ pattern_name: 'rule-1', severity: 'CRITICAL' }),
        makeFinding({ pattern_name: 'rule-2', severity: 'WARNING' }),
        makeFinding({ pattern_name: 'rule-3', severity: 'INFO' }),
      ];
      const xml = generateJUnitReport(makeScanResult(findings));
      expect(xml).toContain('tests="3"');
      expect(xml).toContain('failures="2"'); // CRITICAL + WARNING
    });

    it('marks CRITICAL findings as failures', () => {
      const xml = generateJUnitReport(makeScanResult([makeFinding({ severity: 'CRITICAL' })]));
      expect(xml).toContain('<failure');
      expect(xml).toContain('type="CRITICAL"');
    });

    it('marks WARNING findings as failures', () => {
      const xml = generateJUnitReport(makeScanResult([makeFinding({ severity: 'WARNING' })]));
      expect(xml).toContain('<failure');
      expect(xml).toContain('type="WARNING"');
    });

    it('marks INFO findings as passing with system-out', () => {
      const xml = generateJUnitReport(makeScanResult([makeFinding({ severity: 'INFO' })]));
      expect(xml).toContain('<system-out>');
      expect(xml).not.toContain('<failure');
    });

    it('generates passing test for empty findings', () => {
      const xml = generateJUnitReport(makeScanResult([]));
      expect(xml).toContain('tests="1"');
      expect(xml).toContain('failures="0"');
      expect(xml).toContain('no-findings');
    });

    it('escapes XML special characters', () => {
      const xml = generateJUnitReport(makeScanResult([
        makeFinding({ description: 'Test <script> & "injection"', match: 'a & b < c' }),
      ]));
      expect(xml).toContain('&lt;script&gt;');
      expect(xml).toContain('&amp;');
      expect(xml).not.toContain('<script>');
    });

    it('includes elapsed time', () => {
      const xml = generateJUnitReport(makeScanResult());
      expect(xml).toContain('time="0.042"');
    });

    it('uses custom suite name', () => {
      const xml = generateJUnitReport(makeScanResult(), 'Custom Suite');
      expect(xml).toContain('name="Custom Suite"');
    });
  });
});
