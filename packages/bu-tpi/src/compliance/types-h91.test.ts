import { describe, it, expect } from 'vitest';
import type {
  TestMapping,
  EvidenceRecord,
  ComplianceReportWithEvidence,
  FrameworkCategory,
  ComplianceFrameworkExtended,
  ComplianceReport,
  ComplianceFramework,
} from './types.js';

describe('H9.1: Framework Mapping Data Model', () => {
  it('T-H91-01: TestMapping has all required fields', () => {
    const mapping: TestMapping = {
      controlId: 'LLM01',
      frameworkId: 'owasp-llm-top10',
      scannerModule: 'prompt-injection',
      fixtureCategory: 'injection',
      coverageStatus: 'full',
      evidenceRef: 'ev-001',
    };
    expect(mapping.controlId).toBe('LLM01');
    expect(mapping.frameworkId).toBe('owasp-llm-top10');
    expect(mapping.scannerModule).toBe('prompt-injection');
    expect(mapping.fixtureCategory).toBe('injection');
    expect(mapping.coverageStatus).toBe('full');
    expect(mapping.evidenceRef).toBe('ev-001');
    expect(mapping.lastVerified).toBeUndefined();
  });

  it('T-H91-02: TestMapping supports optional lastVerified', () => {
    const mapping: TestMapping = {
      controlId: 'LLM02',
      frameworkId: 'owasp-llm-top10',
      scannerModule: 'data-leakage',
      fixtureCategory: 'exfiltration',
      coverageStatus: 'partial',
      evidenceRef: 'ev-002',
      lastVerified: '2026-03-11T00:00:00Z',
    };
    expect(mapping.lastVerified).toBe('2026-03-11T00:00:00Z');
  });

  it('T-H91-03: TestMapping coverageStatus union covers all values', () => {
    const statuses: TestMapping['coverageStatus'][] = ['full', 'partial', 'none'];
    expect(statuses).toHaveLength(3);
    expect(statuses).toContain('full');
    expect(statuses).toContain('partial');
    expect(statuses).toContain('none');
  });

  it('T-H91-04: EvidenceRecord has all required fields', () => {
    const record: EvidenceRecord = {
      id: 'er-001',
      controlId: 'LLM01',
      frameworkId: 'owasp-llm-top10',
      testExecutionId: 'exec-abc',
      timestamp: '2026-03-11T12:00:00Z',
      result: 'pass',
      score: 0.95,
      details: 'All injection tests passed',
      hmacSignature: 'sha256:abcdef1234567890',
    };
    expect(record.id).toBe('er-001');
    expect(record.controlId).toBe('LLM01');
    expect(record.frameworkId).toBe('owasp-llm-top10');
    expect(record.testExecutionId).toBe('exec-abc');
    expect(record.timestamp).toBe('2026-03-11T12:00:00Z');
    expect(record.result).toBe('pass');
    expect(record.score).toBe(0.95);
    expect(record.details).toBe('All injection tests passed');
    expect(record.hmacSignature).toBe('sha256:abcdef1234567890');
  });

  it('T-H91-05: EvidenceRecord result union covers all values', () => {
    const results: EvidenceRecord['result'][] = ['pass', 'fail', 'partial'];
    expect(results).toHaveLength(3);
    expect(results).toContain('pass');
    expect(results).toContain('fail');
    expect(results).toContain('partial');
  });

  it('T-H91-06: ComplianceReportWithEvidence extends ComplianceReport', () => {
    const baseReport: ComplianceReport = {
      generated: '2026-03-11T12:00:00Z',
      frameworks: [],
      overallScore: 0.85,
    };

    const extendedReport: ComplianceReportWithEvidence = {
      ...baseReport,
      evidence: [
        {
          id: 'er-001',
          controlId: 'LLM01',
          frameworkId: 'owasp-llm-top10',
          testExecutionId: 'exec-abc',
          timestamp: '2026-03-11T12:00:00Z',
          result: 'pass',
          score: 0.95,
          details: 'Passed',
          hmacSignature: 'sha256:abc',
        },
      ],
      testMappings: [
        {
          controlId: 'LLM01',
          frameworkId: 'owasp-llm-top10',
          scannerModule: 'prompt-injection',
          fixtureCategory: 'injection',
          coverageStatus: 'full',
          evidenceRef: 'er-001',
        },
      ],
      hmacVerified: true,
    };

    // Verify it has base ComplianceReport fields
    expect(extendedReport.generated).toBe('2026-03-11T12:00:00Z');
    expect(extendedReport.frameworks).toEqual([]);
    expect(extendedReport.overallScore).toBe(0.85);

    // Verify it has extended fields
    expect(extendedReport.evidence).toHaveLength(1);
    expect(extendedReport.testMappings).toHaveLength(1);
    expect(extendedReport.hmacVerified).toBe(true);
  });

  it('T-H91-07: FrameworkCategory union covers all expected values', () => {
    const categories: FrameworkCategory[] = ['technical', 'governance', 'non-technical'];
    expect(categories).toHaveLength(3);
    expect(categories).toContain('technical');
    expect(categories).toContain('governance');
    expect(categories).toContain('non-technical');
  });

  it('T-H91-08: ComplianceFrameworkExtended extends ComplianceFramework', () => {
    const baseFramework: ComplianceFramework = {
      id: 'owasp-llm-top10',
      name: 'OWASP LLM Top 10',
      version: '1.1',
      controls: [],
    };

    const extended: ComplianceFrameworkExtended = {
      ...baseFramework,
      category: 'technical',
      tier: 'implemented',
      controlCount: 10,
    };

    // Verify base fields
    expect(extended.id).toBe('owasp-llm-top10');
    expect(extended.name).toBe('OWASP LLM Top 10');
    expect(extended.version).toBe('1.1');
    expect(extended.controls).toEqual([]);

    // Verify extended fields
    expect(extended.category).toBe('technical');
    expect(extended.tier).toBe('implemented');
    expect(extended.controlCount).toBe(10);
  });

  it('T-H91-09: ComplianceFrameworkExtended tier covers all values', () => {
    const tiers: ComplianceFrameworkExtended['tier'][] = [
      'implemented',
      'high',
      'medium',
      'regional',
      'referenced',
    ];
    expect(tiers).toHaveLength(5);
    expect(tiers).toContain('implemented');
    expect(tiers).toContain('high');
    expect(tiers).toContain('medium');
    expect(tiers).toContain('regional');
    expect(tiers).toContain('referenced');
  });
});
