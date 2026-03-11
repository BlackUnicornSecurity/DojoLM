/**
 * File: llm-reports.test.ts
 * Purpose: Tests for LLM report generation (pure functions)
 * Index:
 * - Test fixtures (line 12)
 * - RPT-001: generateReport delegates to JSON (line 60)
 * - RPT-002: generateReport delegates to Markdown (line 72)
 * - RPT-003: generateReport delegates to CSV (line 84)
 * - RPT-004: generateReport throws on unsupported format (line 96)
 * - RPT-005: JSON includeExecutions false removes executions (line 106)
 * - RPT-006: JSON includeResponses false redacts responses (line 126)
 * - RPT-007: Markdown contains title and model info (line 153)
 * - RPT-008: Markdown contains metrics table (line 167)
 * - RPT-009: Markdown contains category breakdown (line 181)
 * - RPT-010: Markdown contains OWASP coverage section (line 195)
 * - RPT-011: Markdown contains TPI coverage section (line 209)
 * - RPT-012: Markdown recommendations based on high injection rate (line 223)
 * - RPT-013: Markdown recommendations based on high harmfulness (line 237)
 * - RPT-014: Markdown recommendations for strong resilience (line 251)
 * - RPT-015: CSV header row and data row (line 265)
 * - RPT-016: CSV category section (line 281)
 * - RPT-017: CSV OWASP section (line 295)
 * - RPT-018: generateReportFilename sanitizes model name (line 309)
 * - RPT-019: generateReportFilename uses provided timestamp (line 319)
 * - RPT-020: generateReportFilename uses current date when no timestamp (line 329)
 * - RPT-021: Markdown low coverage recommendation (line 339)
 * - RPT-022: Markdown weak category recommendation (line 353)
 * - RPT-023: CSV TPI section (line 367)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateReport, generateReportFilename } from '../llm-reports';
import type { LLMModelReport, ReportRequest } from '../llm-types';

// ===========================================================================
// Test Fixtures
// ===========================================================================

function createMockReport(overrides: Partial<LLMModelReport> = {}): LLMModelReport {
  return {
    modelConfigId: 'config-001',
    modelName: 'GPT-4o',
    provider: 'openai',
    testCount: 50,
    avgResilienceScore: 85,
    injectionSuccessRate: 0.12,
    harmfulnessRate: 0.08,
    byCategory: [
      { category: 'prompt-injection', passRate: 0.9, avgScore: 88, count: 20 },
      { category: 'jailbreak', passRate: 0.75, avgScore: 72, count: 15 },
      { category: 'data-extraction', passRate: 0.95, avgScore: 92, count: 15 },
    ],
    owaspCoverage: [
      { category: 'LLM01: Prompt Injection', passRate: 0.88, tested: 12 },
      { category: 'LLM02: Insecure Output', passRate: 0.92, tested: 8 },
    ],
    tpiCoverage: [
      { story: 'TPI-001: System Prompt Bypass', passRate: 0.85, tested: 10 },
      { story: 'TPI-002: Data Exfiltration', passRate: 0.95, tested: 8 },
    ],
    overallCoveragePercent: 82,
    totalDuration_ms: 45000,
    avgDuration_ms: 900,
    generatedAt: '2025-06-15T10:30:00.000Z',
    ...overrides,
  } as LLMModelReport;
}

function createMockRequest(overrides: Partial<ReportRequest> = {}): ReportRequest {
  return {
    modelConfigId: 'config-001',
    format: 'json',
    includeExecutions: false,
    includeResponses: false,
    ...overrides,
  };
}

// ===========================================================================
// Tests
// ===========================================================================

describe('llm-reports', () => {
  // RPT-001: generateReport delegates to JSON format
  describe('RPT-001: generateReport delegates to JSON', () => {
    it('returns valid JSON when format is json', () => {
      const report = createMockReport();
      const request = createMockRequest({ format: 'json' });

      const result = generateReport(report, request);
      const parsed = JSON.parse(result);

      expect(parsed.modelName).toBe('GPT-4o');
      expect(parsed.provider).toBe('openai');
      expect(parsed.testCount).toBe(50);
    });
  });

  // RPT-002: generateReport delegates to Markdown format
  describe('RPT-002: generateReport delegates to Markdown', () => {
    it('returns markdown content when format is markdown', () => {
      const report = createMockReport();
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).toContain('# LLM Security Test Report');
      expect(result).toContain('GPT-4o');
    });
  });

  // RPT-003: generateReport delegates to CSV format
  describe('RPT-003: generateReport delegates to CSV', () => {
    it('returns CSV content when format is csv', () => {
      const report = createMockReport();
      const request = createMockRequest({ format: 'csv' });

      const result = generateReport(report, request);
      const lines = result.split('\n');

      expect(lines[0]).toContain('Model,Provider');
      expect(lines[1]).toContain('GPT-4o,openai');
    });
  });

  // RPT-004: generateReport throws on unsupported format
  describe('RPT-004: generateReport throws on unsupported format', () => {
    it('throws an error for unsupported format', () => {
      const report = createMockReport();
      const request = createMockRequest({ format: 'pdf' as ReportRequest['format'] });

      expect(() => generateReport(report, request)).toThrow(
        'Unsupported report format: pdf'
      );
    });
  });

  // RPT-005: JSON includeExecutions false removes executions field
  describe('RPT-005: JSON includeExecutions false removes executions', () => {
    it('removes executions from JSON when includeExecutions is false', () => {
      const report = createMockReport();
      // Attach executions to the report object to verify deletion
      (report as Record<string, unknown>).executions = [
        { id: 'exec-1', response: 'test response' },
        { id: 'exec-2', response: 'another response' },
      ];

      const request = createMockRequest({
        format: 'json',
        includeExecutions: false,
      });

      const result = generateReport(report, request);
      const parsed = JSON.parse(result);

      expect(parsed.executions).toBeUndefined();
    });
  });

  // RPT-006: JSON includeResponses false redacts response text
  describe('RPT-006: JSON includeResponses false redacts responses', () => {
    it('redacts response text when includeResponses is false and includeExecutions is true', () => {
      const report = createMockReport();
      (report as Record<string, unknown>).executions = [
        { id: 'exec-1', response: 'sensitive model output' },
        { id: 'exec-2', response: 'another sensitive output' },
      ];

      const request = createMockRequest({
        format: 'json',
        includeExecutions: true,
        includeResponses: false,
      });

      const result = generateReport(report, request);
      const parsed = JSON.parse(result);

      expect(parsed.executions).toBeDefined();
      expect(parsed.executions[0].response).toBe('[REDACTED]');
      expect(parsed.executions[1].response).toBe('[REDACTED]');
      // Non-response fields should remain
      expect(parsed.executions[0].id).toBe('exec-1');
    });
  });

  // RPT-007: Markdown contains title and model info
  describe('RPT-007: Markdown contains title and model info', () => {
    it('includes report title, model name, and provider', () => {
      const report = createMockReport();
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).toContain('# LLM Security Test Report');
      expect(result).toContain('**Model:** GPT-4o');
      expect(result).toContain('**Provider:** openai');
    });
  });

  // RPT-008: Markdown contains metrics table
  describe('RPT-008: Markdown contains metrics table', () => {
    it('includes key metrics with correct values', () => {
      const report = createMockReport();
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).toContain('## Key Metrics');
      expect(result).toContain('| Tests Executed | 50 |');
      expect(result).toContain('| Avg Resilience Score | 85/100 |');
      expect(result).toContain('| Injection Success Rate | 12.0% |');
      expect(result).toContain('| Harmfulness Rate | 8.0% |');
      expect(result).toContain('| Overall Coverage | 82% |');
      expect(result).toContain('| Avg Duration | 900ms |');
    });
  });

  // RPT-009: Markdown contains category breakdown
  describe('RPT-009: Markdown contains category breakdown', () => {
    it('includes category breakdown table with all categories', () => {
      const report = createMockReport();
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).toContain('## Category Breakdown');
      expect(result).toContain('| prompt-injection | 90.0% | 88/100 | 20 |');
      expect(result).toContain('| jailbreak | 75.0% | 72/100 | 15 |');
      expect(result).toContain('| data-extraction | 95.0% | 92/100 | 15 |');
    });
  });

  // RPT-010: Markdown contains OWASP coverage section
  describe('RPT-010: Markdown contains OWASP coverage section', () => {
    it('includes OWASP LLM Top 10 coverage table', () => {
      const report = createMockReport();
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).toContain('## OWASP LLM Top 10 Coverage');
      expect(result).toContain('| LLM01: Prompt Injection | 88.0% | 12 |');
      expect(result).toContain('| LLM02: Insecure Output | 92.0% | 8 |');
    });
  });

  // RPT-011: Markdown contains TPI coverage section
  describe('RPT-011: Markdown contains TPI coverage section', () => {
    it('includes CrowdStrike TPI coverage table', () => {
      const report = createMockReport();
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).toContain('## CrowdStrike TPI Coverage');
      expect(result).toContain('| TPI-001: System Prompt Bypass | 85.0% | 10 |');
      expect(result).toContain('| TPI-002: Data Exfiltration | 95.0% | 8 |');
    });
  });

  // RPT-012: Markdown recommendations for high injection rate
  describe('RPT-012: Markdown recommendations for high injection rate', () => {
    it('shows HIGH PRIORITY injection warning when rate > 50%', () => {
      const report = createMockReport({ injectionSuccessRate: 0.65 });
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).toContain('## Recommendations');
      expect(result).toContain('**HIGH PRIORITY**: Model shows high injection success rate');
    });
  });

  // RPT-013: Markdown recommendations for high harmfulness rate
  describe('RPT-013: Markdown recommendations for high harmfulness rate', () => {
    it('shows HIGH PRIORITY harmfulness warning when rate > 30%', () => {
      const report = createMockReport({ harmfulnessRate: 0.45 });
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).toContain('**HIGH PRIORITY**: Model frequently generates harmful responses');
    });
  });

  // RPT-014: Markdown recommendations for strong resilience score
  describe('RPT-014: Markdown recommendations for strong resilience', () => {
    it('shows positive assessment when resilience score >= 80', () => {
      const report = createMockReport({ avgResilienceScore: 85 });
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).toContain('Model shows strong security posture');
    });
  });

  // RPT-015: CSV header row and data row
  describe('RPT-015: CSV header row and data row', () => {
    it('includes correct header and model data row', () => {
      const report = createMockReport();
      const request = createMockRequest({ format: 'csv' });

      const result = generateReport(report, request);
      const lines = result.split('\n');

      expect(lines[0]).toBe(
        'Model,Provider,Test Count,Avg Score,Injection Rate,Harmfulness Rate,Coverage %'
      );
      expect(lines[1]).toBe('GPT-4o,openai,50,85,0.120,0.080,82');
    });
  });

  // RPT-016: CSV category section
  describe('RPT-016: CSV category section', () => {
    it('includes category breakdown rows in CSV', () => {
      const report = createMockReport();
      const request = createMockRequest({ format: 'csv' });

      const result = generateReport(report, request);

      expect(result).toContain('Category,Pass Rate,Avg Score,Count');
      expect(result).toContain('prompt-injection,0.900,88,20');
      expect(result).toContain('jailbreak,0.750,72,15');
      expect(result).toContain('data-extraction,0.950,92,15');
    });
  });

  // RPT-017: CSV OWASP section
  describe('RPT-017: CSV OWASP section', () => {
    it('includes OWASP coverage rows in CSV', () => {
      const report = createMockReport();
      const request = createMockRequest({ format: 'csv' });

      const result = generateReport(report, request);

      expect(result).toContain('OWASP Category,Pass Rate,Tested');
      expect(result).toContain('LLM01: Prompt Injection,0.880,12');
      expect(result).toContain('LLM02: Insecure Output,0.920,8');
    });
  });

  // RPT-018: generateReportFilename sanitizes model name
  describe('RPT-018: generateReportFilename sanitizes model name', () => {
    it('replaces non-alphanumeric chars with hyphens and lowercases', () => {
      const filename = generateReportFilename('GPT-4o (Preview)', 'json', '2025-06-15');

      expect(filename).toBe('llm-report-gpt-4o--preview--2025-06-15.json');
    });
  });

  // RPT-019: generateReportFilename uses provided timestamp
  describe('RPT-019: generateReportFilename uses provided timestamp', () => {
    it('uses the given timestamp in the filename', () => {
      const filename = generateReportFilename('claude-3', 'markdown', '2025-01-01');

      expect(filename).toBe('llm-report-claude-3-2025-01-01.markdown');
    });
  });

  // RPT-020: generateReportFilename uses current date when no timestamp
  describe('RPT-020: generateReportFilename uses current date when no timestamp', () => {
    it('falls back to current ISO date when timestamp is omitted', () => {
      const now = new Date('2025-08-20T12:00:00.000Z');
      vi.useFakeTimers({ now });

      const filename = generateReportFilename('test-model', 'csv');

      expect(filename).toBe('llm-report-test-model-2025-08-20.csv');

      vi.useRealTimers();
    });
  });

  // RPT-021: Markdown low coverage recommendation
  describe('RPT-021: Markdown low coverage recommendation', () => {
    it('shows MEDIUM PRIORITY warning when coverage < 80%', () => {
      const report = createMockReport({ overallCoveragePercent: 65 });
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).toContain('**MEDIUM PRIORITY**: Test coverage is below 80%');
    });
  });

  // RPT-022: Markdown weak category recommendation
  describe('RPT-022: Markdown weak category recommendation', () => {
    it('lists weak categories when passRate < 50%', () => {
      const report = createMockReport({
        byCategory: [
          { category: 'prompt-injection', passRate: 0.4, avgScore: 35, count: 10 },
          { category: 'jailbreak', passRate: 0.3, avgScore: 28, count: 8 },
          { category: 'data-extraction', passRate: 0.9, avgScore: 90, count: 12 },
        ],
      });
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).toContain('**MEDIUM PRIORITY**: Weak performance in:');
      expect(result).toContain('prompt-injection');
      expect(result).toContain('jailbreak');
    });
  });

  // RPT-023: CSV TPI section
  describe('RPT-023: CSV TPI section', () => {
    it('includes TPI coverage rows in CSV', () => {
      const report = createMockReport();
      const request = createMockRequest({ format: 'csv' });

      const result = generateReport(report, request);

      expect(result).toContain('TPI Story,Pass Rate,Tested');
      expect(result).toContain('TPI-001: System Prompt Bypass,0.850,10');
      expect(result).toContain('TPI-002: Data Exfiltration,0.950,8');
    });
  });

  // RPT-024: Markdown score interpretation thresholds
  describe('RPT-024: Markdown score interpretation thresholds', () => {
    it.each([
      { score: 95, expected: 'Excellent' },
      { score: 90, expected: 'Excellent' },
      { score: 80, expected: 'Good' },
      { score: 75, expected: 'Good' },
      { score: 65, expected: 'Fair' },
      { score: 60, expected: 'Fair' },
      { score: 50, expected: 'Poor' },
    ])('interprets score $score as $expected', ({ score, expected }) => {
      const report = createMockReport({ avgResilienceScore: score });
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).toContain(`**Assessment:** ${expected}`);
    });
  });

  // RPT-025: Markdown omits OWASP section when empty
  describe('RPT-025: Markdown omits OWASP section when empty', () => {
    it('does not include OWASP section when owaspCoverage is empty', () => {
      const report = createMockReport({ owaspCoverage: [] });
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).not.toContain('## OWASP LLM Top 10 Coverage');
    });
  });

  // RPT-026: Markdown omits TPI section when empty
  describe('RPT-026: Markdown omits TPI section when empty', () => {
    it('does not include TPI section when tpiCoverage is empty', () => {
      const report = createMockReport({ tpiCoverage: [] });
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).not.toContain('## CrowdStrike TPI Coverage');
    });
  });

  // RPT-027: Markdown footer metadata
  describe('RPT-027: Markdown footer metadata', () => {
    it('includes generator credit and total execution time', () => {
      const report = createMockReport({ totalDuration_ms: 45000 });
      const request = createMockRequest({ format: 'markdown' });

      const result = generateReport(report, request);

      expect(result).toContain('*Generated by DojoLM LLM Testing Dashboard*');
      expect(result).toContain('*Total execution time: 45000ms*');
    });
  });

  // RPT-028: JSON includes generatedAt timestamp
  describe('RPT-028: JSON includes generatedAt timestamp', () => {
    it('overwrites generatedAt with current ISO timestamp', () => {
      const now = new Date('2025-09-01T08:00:00.000Z');
      vi.useFakeTimers({ now });

      const report = createMockReport();
      const request = createMockRequest({ format: 'json' });

      const result = generateReport(report, request);
      const parsed = JSON.parse(result);

      expect(parsed.generatedAt).toBe('2025-09-01T08:00:00.000Z');

      vi.useRealTimers();
    });
  });

  // RPT-029: CSV omits OWASP section when empty
  describe('RPT-029: CSV omits OWASP section when empty', () => {
    it('does not include OWASP header when owaspCoverage is empty', () => {
      const report = createMockReport({ owaspCoverage: [] });
      const request = createMockRequest({ format: 'csv' });

      const result = generateReport(report, request);

      expect(result).not.toContain('OWASP Category,Pass Rate,Tested');
    });
  });

  // RPT-030: CSV omits TPI section when empty
  describe('RPT-030: CSV omits TPI section when empty', () => {
    it('does not include TPI header when tpiCoverage is empty', () => {
      const report = createMockReport({ tpiCoverage: [] });
      const request = createMockRequest({ format: 'csv' });

      const result = generateReport(report, request);

      expect(result).not.toContain('TPI Story,Pass Rate,Tested');
    });
  });
});
