import { describe, it, expect } from 'vitest';
import { generateReport, formatReportMarkdown, formatReportJSON } from './reporter.js';
import type { Campaign, CampaignRun, FindingDiff, SengokuFinding } from './types.js';

function makeFinding(overrides: Partial<SengokuFinding> = {}): SengokuFinding {
  return {
    id: 'f-1',
    hash: 'abc',
    attackPayload: 'test payload',
    response: 'test response',
    category: 'INJECTION',
    severity: 'CRITICAL',
    isRegression: false,
    isNew: true,
    firstSeenRunId: 'run-1',
    ...overrides,
  };
}

const campaign: Campaign = {
  id: 'camp-1',
  name: 'Test Campaign',
  targetUrl: 'https://example.com/api',
  targetAuth: { type: 'bearer', credentials: { token: 'xxx' } },
  attackCategories: ['INJECTION'],
  schedule: { frequency: 'daily', customIntervalMs: null, maxRuns: null },
  maxConcurrentRequests: 5,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const findings: SengokuFinding[] = [
  makeFinding({ severity: 'CRITICAL' }),
  makeFinding({ id: 'f-2', hash: 'def', severity: 'WARNING' }),
  makeFinding({ id: 'f-3', hash: 'ghi', severity: 'INFO' }),
];

const run: CampaignRun = {
  id: 'run-1',
  campaignId: 'camp-1',
  runNumber: 1,
  status: 'completed',
  startedAt: '2026-01-01T00:00:00Z',
  completedAt: '2026-01-01T01:00:00Z',
  findings,
  regressionAlerts: [],
};

const diff: FindingDiff = {
  newFindings: [findings[0]],
  resolvedFindings: [],
  regressedFindings: [],
  persistentFindings: [findings[1], findings[2]],
};

describe('generateReport', () => {
  it('produces a report with executive summary', () => {
    const report = generateReport(campaign, run, diff);
    expect(report.campaignId).toBe('camp-1');
    expect(report.runId).toBe('run-1');
    expect(report.executiveSummary).toContain('Test Campaign');
    expect(report.executiveSummary).toContain('3'); // total findings
  });

  it('groups findings by severity', () => {
    const report = generateReport(campaign, run, diff);
    expect(report.findingsBySeverity['CRITICAL']).toHaveLength(1);
    expect(report.findingsBySeverity['WARNING']).toHaveLength(1);
    expect(report.findingsBySeverity['INFO']).toHaveLength(1);
  });

  it('includes diff in report', () => {
    const report = generateReport(campaign, run, diff);
    expect(report.diff.newFindings).toHaveLength(1);
  });
});

describe('formatReportMarkdown', () => {
  it('produces valid markdown with sections', () => {
    const report = generateReport(campaign, run, diff);
    const md = formatReportMarkdown(report);
    expect(md).toContain('# Sengoku Campaign Report');
    expect(md).toContain('## Executive Summary');
    expect(md).toContain('## Findings by Severity');
    expect(md).toContain('### CRITICAL');
  });

  it('sanitizes HTML in payloads', () => {
    const malicious = makeFinding({ attackPayload: '<script>alert("xss")</script>' });
    const runWithMalicious: CampaignRun = { ...run, findings: [malicious] };
    const report = generateReport(campaign, runWithMalicious, diff);
    const md = formatReportMarkdown(report);
    expect(md).not.toContain('<script>');
    expect(md).toContain('&lt;script&gt;');
  });
});

describe('formatReportJSON', () => {
  it('returns valid JSON string', () => {
    const report = generateReport(campaign, run, diff);
    const json = formatReportJSON(report);
    const parsed = JSON.parse(json);
    expect(parsed.campaignId).toBe('camp-1');
  });

  it('sanitizes payloads in JSON output', () => {
    const malicious = makeFinding({ attackPayload: '<img onerror=alert(1)>' });
    const runWithMalicious: CampaignRun = { ...run, findings: [malicious] };
    const report = generateReport(campaign, runWithMalicious, diff);
    const json = formatReportJSON(report);
    expect(json).not.toContain('<img');
    expect(json).toContain('&lt;img');
  });
});
