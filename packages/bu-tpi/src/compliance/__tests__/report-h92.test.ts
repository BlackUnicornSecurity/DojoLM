/**
 * H9.2: Compliance Report Generator with Evidence
 *
 * Tests:
 * - T-RG-01: HMAC sign and verify round-trip
 * - T-RG-02: Tampered evidence fails verification
 * - T-RG-03: Report includes all mapped controls
 * - T-RG-04: Gap detection (controls with no passing tests)
 * - T-RG-05: Payload sanitization strips HTML tags
 * - T-RG-06: Evidence details truncated to max length
 * - T-RG-07: Constant-time HMAC comparison
 * - T-RG-08: Report coverage calculation
 */
import { describe, it, expect } from 'vitest';
import type {
  ComplianceFramework,
  TestMapping,
  EvidenceRecord,
} from '../types.js';
import {
  signEvidence,
  verifyEvidence,
  sanitizePayloadForReport,
  generateReportWithEvidence,
} from '../report-generator.js';
import type { TestExecutionInput } from '../report-generator.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_FRAMEWORK: ComplianceFramework = {
  id: 'test-fw',
  name: 'Test Framework',
  version: '1.0',
  controls: [
    { id: 'C-01', name: 'Input Validation', description: 'Validate inputs', category: 'Security', requirement: 'All inputs validated' },
    { id: 'C-02', name: 'Output Encoding', description: 'Encode outputs', category: 'Security', requirement: 'All outputs encoded' },
    { id: 'C-03', name: 'Access Control', description: 'Enforce access', category: 'Auth', requirement: 'RBAC enforced' },
    { id: 'C-04', name: 'Logging', description: 'Audit logging', category: 'Ops', requirement: 'All actions logged' },
  ],
};

const TEST_MAPPINGS: TestMapping[] = [
  { controlId: 'C-01', frameworkId: 'test-fw', scannerModule: 'fuzzing', fixtureCategory: 'prompt-injection', coverageStatus: 'full', evidenceRef: 'tc-001' },
  { controlId: 'C-02', frameworkId: 'test-fw', scannerModule: 'encoding-engine', fixtureCategory: 'xss', coverageStatus: 'full', evidenceRef: 'tc-002' },
  { controlId: 'C-03', frameworkId: 'test-fw', scannerModule: 'llm-security', fixtureCategory: 'auth-bypass', coverageStatus: 'partial', evidenceRef: 'tc-003' },
  // C-04 intentionally unmapped -> gap
];

function makeExecution(overrides: Partial<TestExecutionInput> = {}): TestExecutionInput {
  return {
    id: 'exec-001',
    testCaseId: 'tc-001',
    resilienceScore: 85,
    categoriesPassed: ['prompt-injection'],
    categoriesFailed: [],
    response: 'Model correctly refused malicious input.',
    timestamp: '2026-03-11T10:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// T-RG-01: HMAC sign and verify round-trip
// ---------------------------------------------------------------------------
describe('T-RG-01: HMAC sign/verify round-trip', () => {
  it('signs and verifies an evidence record successfully', () => {
    const unsigned = {
      id: 'ev-001',
      controlId: 'C-01',
      frameworkId: 'test-fw',
      testExecutionId: 'exec-001',
      timestamp: '2026-03-11T10:00:00Z',
      result: 'pass' as const,
      score: 85,
      details: 'Test passed successfully.',
    };

    const signed = signEvidence(unsigned);
    expect(signed.hmacSignature).toBeDefined();
    expect(signed.hmacSignature).toHaveLength(64); // SHA-256 hex = 64 chars
    expect(verifyEvidence(signed)).toBe(true);
  });

  it('preserves all original fields after signing', () => {
    const unsigned = {
      id: 'ev-002',
      controlId: 'C-02',
      frameworkId: 'test-fw',
      testExecutionId: 'exec-002',
      timestamp: '2026-03-11T11:00:00Z',
      result: 'fail' as const,
      score: 20,
      details: 'Test failed.',
    };

    const signed = signEvidence(unsigned);
    expect(signed.id).toBe(unsigned.id);
    expect(signed.controlId).toBe(unsigned.controlId);
    expect(signed.score).toBe(unsigned.score);
    expect(signed.details).toBe(unsigned.details);
  });
});

// ---------------------------------------------------------------------------
// T-RG-02: Tampered evidence fails verification
// ---------------------------------------------------------------------------
describe('T-RG-02: tampered evidence fails verification', () => {
  it('fails when score is tampered', () => {
    const unsigned = {
      id: 'ev-003',
      controlId: 'C-01',
      frameworkId: 'test-fw',
      testExecutionId: 'exec-003',
      timestamp: '2026-03-11T10:00:00Z',
      result: 'fail' as const,
      score: 30,
      details: 'Test failed.',
    };
    const signed = signEvidence(unsigned);

    // Tamper: change score
    const tampered: EvidenceRecord = { ...signed, score: 95 };
    expect(verifyEvidence(tampered)).toBe(false);
  });

  it('fails when result is tampered', () => {
    const unsigned = {
      id: 'ev-004',
      controlId: 'C-01',
      frameworkId: 'test-fw',
      testExecutionId: 'exec-004',
      timestamp: '2026-03-11T10:00:00Z',
      result: 'fail' as const,
      score: 25,
      details: 'Failed.',
    };
    const signed = signEvidence(unsigned);

    const tampered: EvidenceRecord = { ...signed, result: 'pass' };
    expect(verifyEvidence(tampered)).toBe(false);
  });

  it('fails when controlId is tampered', () => {
    const unsigned = {
      id: 'ev-005',
      controlId: 'C-01',
      frameworkId: 'test-fw',
      testExecutionId: 'exec-005',
      timestamp: '2026-03-11T10:00:00Z',
      result: 'pass' as const,
      score: 90,
      details: 'Passed.',
    };
    const signed = signEvidence(unsigned);

    const tampered: EvidenceRecord = { ...signed, controlId: 'C-99' };
    expect(verifyEvidence(tampered)).toBe(false);
  });

  it('fails with completely wrong signature', () => {
    const unsigned = {
      id: 'ev-006',
      controlId: 'C-01',
      frameworkId: 'test-fw',
      testExecutionId: 'exec-006',
      timestamp: '2026-03-11T10:00:00Z',
      result: 'pass' as const,
      score: 80,
      details: 'OK.',
    };
    const signed = signEvidence(unsigned);

    const tampered: EvidenceRecord = {
      ...signed,
      hmacSignature: 'a'.repeat(64),
    };
    expect(verifyEvidence(tampered)).toBe(false);
  });

  it('fails with wrong-length signature', () => {
    const unsigned = {
      id: 'ev-007',
      controlId: 'C-01',
      frameworkId: 'test-fw',
      testExecutionId: 'exec-007',
      timestamp: '2026-03-11T10:00:00Z',
      result: 'pass' as const,
      score: 80,
      details: 'OK.',
    };
    const signed = signEvidence(unsigned);

    const tampered: EvidenceRecord = { ...signed, hmacSignature: 'short' };
    expect(verifyEvidence(tampered)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-RG-03: Report includes all mapped controls
// ---------------------------------------------------------------------------
describe('T-RG-03: report includes all mapped controls', () => {
  it('generates evidence for each mapped control with executions', () => {
    const executions: TestExecutionInput[] = [
      makeExecution({ id: 'e1', testCaseId: 'tc-001', resilienceScore: 90 }),
      makeExecution({ id: 'e2', testCaseId: 'tc-002', resilienceScore: 80 }),
      makeExecution({ id: 'e3', testCaseId: 'tc-003', resilienceScore: 75 }),
    ];

    const report = generateReportWithEvidence(executions, TEST_MAPPINGS, TEST_FRAMEWORK);

    // C-01, C-02, C-03 should be covered
    const coveredIds = report.frameworks[0].covered.map((c) => c.controlId);
    expect(coveredIds).toContain('C-01');
    expect(coveredIds).toContain('C-02');
    expect(coveredIds).toContain('C-03');
  });

  it('evidence records reference correct controls', () => {
    const executions: TestExecutionInput[] = [
      makeExecution({ id: 'e1', testCaseId: 'tc-001' }),
      makeExecution({ id: 'e2', testCaseId: 'tc-002' }),
    ];

    const report = generateReportWithEvidence(executions, TEST_MAPPINGS, TEST_FRAMEWORK);

    const c01Evidence = report.evidence.filter((e) => e.controlId === 'C-01');
    expect(c01Evidence.length).toBeGreaterThanOrEqual(1);
    expect(c01Evidence[0].testExecutionId).toBe('e1');
  });

  it('all evidence records are HMAC-verified', () => {
    const executions: TestExecutionInput[] = [
      makeExecution({ id: 'e1', testCaseId: 'tc-001' }),
    ];

    const report = generateReportWithEvidence(executions, TEST_MAPPINGS, TEST_FRAMEWORK);
    expect(report.hmacVerified).toBe(true);

    // Also verify each individually
    for (const ev of report.evidence) {
      expect(verifyEvidence(ev)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// T-RG-04: Gap detection (controls with no passing tests)
// ---------------------------------------------------------------------------
describe('T-RG-04: gap detection', () => {
  it('identifies unmapped controls as gaps', () => {
    const executions: TestExecutionInput[] = [
      makeExecution({ id: 'e1', testCaseId: 'tc-001', resilienceScore: 90 }),
      makeExecution({ id: 'e2', testCaseId: 'tc-002', resilienceScore: 80 }),
      makeExecution({ id: 'e3', testCaseId: 'tc-003', resilienceScore: 75 }),
    ];

    const report = generateReportWithEvidence(executions, TEST_MAPPINGS, TEST_FRAMEWORK);

    // C-04 has no test mapping -> gap
    const gapIds = report.frameworks[0].gaps.map((g) => g.id);
    expect(gapIds).toContain('C-04');
    expect(gapIds).not.toContain('C-01');
  });

  it('all controls with no executions are gaps', () => {
    // No executions at all
    const report = generateReportWithEvidence([], TEST_MAPPINGS, TEST_FRAMEWORK);

    // C-01, C-02, C-03 have mappings but no executions -> gaps
    // C-04 has no mappings -> gap
    const gapIds = report.frameworks[0].gaps.map((g) => g.id);
    expect(gapIds).toHaveLength(4);
    expect(gapIds).toContain('C-01');
    expect(gapIds).toContain('C-04');
  });

  it('controls with executions but no matching testCaseId are gaps', () => {
    const executions: TestExecutionInput[] = [
      makeExecution({ id: 'e1', testCaseId: 'nonexistent-tc', resilienceScore: 90 }),
    ];

    const report = generateReportWithEvidence(executions, TEST_MAPPINGS, TEST_FRAMEWORK);

    // All controls are gaps because no execution matches any mapping's evidenceRef
    const gapIds = report.frameworks[0].gaps.map((g) => g.id);
    expect(gapIds).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// T-RG-05: Payload sanitization strips HTML tags
// ---------------------------------------------------------------------------
describe('T-RG-05: payload sanitization', () => {
  it('escapes HTML angle brackets', () => {
    const input = '<script>alert("xss")</script>';
    const sanitized = sanitizePayloadForReport(input);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');
  });

  it('escapes ampersands not part of existing entities', () => {
    const input = 'foo & bar &lt; baz';
    const sanitized = sanitizePayloadForReport(input);
    expect(sanitized).toBe('foo &amp; bar &lt; baz');
  });

  it('handles nested HTML tags', () => {
    const input = '<div><img src=x onerror="alert(1)"></div>';
    const sanitized = sanitizePayloadForReport(input);
    expect(sanitized).not.toContain('<div>');
    expect(sanitized).not.toContain('<img');
  });

  it('sanitizes payloads in generated evidence details', () => {
    const maliciousResponse = '<script>document.cookie</script>';
    const executions: TestExecutionInput[] = [
      makeExecution({ id: 'e1', testCaseId: 'tc-001', response: maliciousResponse }),
    ];

    const report = generateReportWithEvidence(executions, TEST_MAPPINGS, TEST_FRAMEWORK);
    const ev = report.evidence.find((e) => e.controlId === 'C-01');
    expect(ev).toBeDefined();
    expect(ev!.details).not.toContain('<script>');
    expect(ev!.details).toContain('&lt;script&gt;');
  });
});

// ---------------------------------------------------------------------------
// T-RG-06: Evidence details truncated to max length
// ---------------------------------------------------------------------------
describe('T-RG-06: evidence detail truncation', () => {
  it('truncates long text to 2000 characters', () => {
    const longText = 'A'.repeat(5000);
    const sanitized = sanitizePayloadForReport(longText);
    expect(sanitized).toHaveLength(2000);
  });

  it('preserves short text unchanged', () => {
    const shortText = 'Short response.';
    const sanitized = sanitizePayloadForReport(shortText);
    expect(sanitized).toBe(shortText);
  });

  it('truncation applies after HTML escaping', () => {
    // Each '<' becomes '&lt;' (4 chars), so 1000 '<' chars -> 4000 chars -> truncated to 2000
    const input = '<'.repeat(1000);
    const sanitized = sanitizePayloadForReport(input);
    expect(sanitized.length).toBeLessThanOrEqual(2000);
    // Should only contain escaped entities
    expect(sanitized).not.toContain('<');
  });

  it('long responses in evidence are truncated', () => {
    const longResponse = 'X'.repeat(5000);
    const executions: TestExecutionInput[] = [
      makeExecution({ id: 'e1', testCaseId: 'tc-001', response: longResponse }),
    ];

    const report = generateReportWithEvidence(executions, TEST_MAPPINGS, TEST_FRAMEWORK);
    const ev = report.evidence.find((e) => e.controlId === 'C-01');
    expect(ev).toBeDefined();
    expect(ev!.details.length).toBeLessThanOrEqual(2000);
  });
});

// ---------------------------------------------------------------------------
// T-RG-07: Constant-time HMAC comparison
// ---------------------------------------------------------------------------
describe('T-RG-07: HMAC comparison is constant-time', () => {
  it('rejects signature with same length but different content', () => {
    const unsigned = {
      id: 'ev-ct',
      controlId: 'C-01',
      frameworkId: 'test-fw',
      testExecutionId: 'exec-ct',
      timestamp: '2026-03-11T10:00:00Z',
      result: 'pass' as const,
      score: 90,
      details: 'OK.',
    };
    const signed = signEvidence(unsigned);

    // Flip one character in the middle of the signature
    const sigChars = signed.hmacSignature.split('');
    const midIdx = Math.floor(sigChars.length / 2);
    sigChars[midIdx] = sigChars[midIdx] === 'a' ? 'b' : 'a';
    const tampered: EvidenceRecord = {
      ...signed,
      hmacSignature: sigChars.join(''),
    };

    expect(verifyEvidence(tampered)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-RG-08: Report coverage calculation
// ---------------------------------------------------------------------------
describe('T-RG-08: report coverage calculation', () => {
  it('calculates correct coverage percentage', () => {
    const executions: TestExecutionInput[] = [
      makeExecution({ id: 'e1', testCaseId: 'tc-001', resilienceScore: 90 }),
      makeExecution({ id: 'e2', testCaseId: 'tc-002', resilienceScore: 80 }),
      makeExecution({ id: 'e3', testCaseId: 'tc-003', resilienceScore: 75 }),
    ];

    const report = generateReportWithEvidence(executions, TEST_MAPPINGS, TEST_FRAMEWORK);

    // 3 out of 4 controls covered = 75%
    expect(report.overallScore).toBe(75);
    expect(report.frameworks[0].coverage).toBe(75);
  });

  it('returns 0% coverage with no executions', () => {
    const report = generateReportWithEvidence([], TEST_MAPPINGS, TEST_FRAMEWORK);
    expect(report.overallScore).toBe(0);
  });

  it('classifies results by resilience score thresholds', () => {
    const executions: TestExecutionInput[] = [
      makeExecution({ id: 'e1', testCaseId: 'tc-001', resilienceScore: 90 }),  // pass (>= 70)
      makeExecution({ id: 'e2', testCaseId: 'tc-002', resilienceScore: 50 }),  // partial (>= 40, < 70)
      makeExecution({ id: 'e3', testCaseId: 'tc-003', resilienceScore: 20 }),  // fail (< 40)
    ];

    const report = generateReportWithEvidence(executions, TEST_MAPPINGS, TEST_FRAMEWORK);

    const passEvidence = report.evidence.find((e) => e.testExecutionId === 'e1');
    const partialEvidence = report.evidence.find((e) => e.testExecutionId === 'e2');
    const failEvidence = report.evidence.find((e) => e.testExecutionId === 'e3');

    expect(passEvidence?.result).toBe('pass');
    expect(partialEvidence?.result).toBe('partial');
    expect(failEvidence?.result).toBe('fail');
  });

  it('includes testMappings in report', () => {
    const executions: TestExecutionInput[] = [
      makeExecution({ id: 'e1', testCaseId: 'tc-001' }),
    ];

    const report = generateReportWithEvidence(executions, TEST_MAPPINGS, TEST_FRAMEWORK);
    expect(report.testMappings).toBe(TEST_MAPPINGS);
    expect(report.testMappings).toHaveLength(3);
  });

  it('handles empty framework (no controls)', () => {
    const emptyFramework: ComplianceFramework = {
      id: 'empty-fw',
      name: 'Empty',
      version: '1.0',
      controls: [],
    };

    const report = generateReportWithEvidence([], [], emptyFramework);
    expect(report.overallScore).toBe(0);
    expect(report.frameworks[0].gaps).toHaveLength(0);
    expect(report.evidence).toHaveLength(0);
  });

  it('ignores mappings for other frameworks', () => {
    const otherMappings: TestMapping[] = [
      { controlId: 'C-01', frameworkId: 'other-fw', scannerModule: 'fuzzing', fixtureCategory: 'pi', coverageStatus: 'full', evidenceRef: 'tc-001' },
    ];
    const executions: TestExecutionInput[] = [
      makeExecution({ id: 'e1', testCaseId: 'tc-001' }),
    ];

    const report = generateReportWithEvidence(executions, otherMappings, TEST_FRAMEWORK);

    // All 4 controls should be gaps because mappings are for 'other-fw'
    expect(report.frameworks[0].gaps).toHaveLength(4);
    expect(report.evidence).toHaveLength(0);
  });
});
