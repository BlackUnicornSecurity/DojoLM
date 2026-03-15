/**
 * Sengoku Module — Comprehensive Test Suite
 * Covers: types/constants, target-connector, scheduler, finding-tracker, reporter.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Constants
  MAX_CONCURRENT_CAMPAIGNS,
  MAX_PAYLOAD_LENGTH,
  VALID_FREQUENCIES,
  VALID_AUTH_TYPES,
  // Target Connector
  validateTargetUrl,
  sanitizeCredentials,
  // Scheduler
  CampaignScheduler,
  // Finding Tracker
  hashFinding,
  deduplicateFindings,
  compareRuns,
  detectRegressions,
  // Reporter
  generateReport,
  formatReportMarkdown,
  formatReportJSON,
  // Types
  type Campaign,
  type CampaignRun,
  type SengokuFinding,
  type FindingDiff,
  type AuthConfig,
} from './index.js';

// ---------------------------------------------------------------------------
// Test Data Factories
// ---------------------------------------------------------------------------

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-001',
    name: 'Test Campaign',
    targetUrl: 'https://api.example.com',
    targetAuth: { type: 'bearer', credentials: { token: 'test-token' } },
    attackCategories: ['prompt-injection', 'jailbreak'],
    schedule: { frequency: 'daily', customIntervalMs: null, maxRuns: null },
    maxConcurrentRequests: 5,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeFinding(overrides: Partial<SengokuFinding> = {}): SengokuFinding {
  return {
    id: 'f-001',
    hash: hashFinding('payload', 'response', 'prompt-injection'),
    attackPayload: 'payload',
    response: 'response',
    category: 'prompt-injection',
    severity: 'CRITICAL',
    isRegression: false,
    isNew: true,
    firstSeenRunId: 'run-001',
    ...overrides,
  };
}

function makeRun(overrides: Partial<CampaignRun> = {}): CampaignRun {
  return {
    id: 'run-001',
    campaignId: 'camp-001',
    runNumber: 1,
    status: 'completed',
    startedAt: '2026-01-01T00:00:00.000Z',
    completedAt: '2026-01-01T00:05:00.000Z',
    findings: [],
    regressionAlerts: [],
    ...overrides,
  };
}

// ===========================================================================
// 1. Types & Constants
// ===========================================================================

describe('Types & Constants', () => {
  it('MAX_CONCURRENT_CAMPAIGNS equals 3', () => {
    expect(MAX_CONCURRENT_CAMPAIGNS).toBe(3);
  });

  it('MAX_PAYLOAD_LENGTH equals 500', () => {
    expect(MAX_PAYLOAD_LENGTH).toBe(500);
  });

  it('VALID_FREQUENCIES contains expected values', () => {
    expect(VALID_FREQUENCIES).toEqual(['hourly', 'daily', 'weekly', 'custom']);
  });

  it('VALID_AUTH_TYPES contains expected values', () => {
    expect(VALID_AUTH_TYPES).toEqual(['api_key', 'bearer', 'oauth2_client_credentials']);
  });
});

// ===========================================================================
// 2. validateTargetUrl
// ===========================================================================

describe('validateTargetUrl', () => {
  it('accepts valid HTTPS URLs', () => {
    expect(validateTargetUrl('https://api.example.com/v1')).toEqual({ valid: true });
  });

  it('accepts valid HTTP URLs', () => {
    expect(validateTargetUrl('http://api.example.com/v1')).toEqual({ valid: true });
  });

  it('rejects file: scheme', () => {
    const result = validateTargetUrl('file:///etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Blocked scheme');
  });

  it('rejects ftp: scheme', () => {
    const result = validateTargetUrl('ftp://evil.com/data');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Blocked scheme');
  });

  it('rejects private IP 10.x', () => {
    const result = validateTargetUrl('https://10.0.0.1/api');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Blocked private IP');
  });

  it('rejects private IP 192.168.x', () => {
    const result = validateTargetUrl('https://192.168.1.1/api');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Blocked private IP');
  });

  it('rejects private IP 172.16-31.x', () => {
    const result = validateTargetUrl('https://172.16.0.1/api');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Blocked private IP');
  });

  it('rejects cloud metadata IP 169.254.169.254', () => {
    const result = validateTargetUrl('https://169.254.169.254/latest/meta-data');
    expect(result.valid).toBe(false);
    // Could match either private IP prefix or metadata check
    expect(result.valid).toBe(false);
  });

  it('blocks localhost by default', () => {
    const result = validateTargetUrl('https://localhost:8080/api');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Localhost');
  });

  it('allows localhost when allowLocalhost=true', () => {
    const result = validateTargetUrl('https://localhost:8080/api', true);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid URL format', () => {
    const result = validateTargetUrl('not-a-url');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid URL');
  });

  it('rejects URLs with embedded credentials', () => {
    const result = validateTargetUrl('https://user:pass@example.com/api');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Embedded credentials');
  });
});

// ===========================================================================
// 3. sanitizeCredentials
// ===========================================================================

describe('sanitizeCredentials', () => {
  it('redacts credential values matching key patterns', () => {
    const input = {
      type: 'bearer',
      token: 'super-secret',
      name: 'visible',
    };
    const result = sanitizeCredentials(input);
    expect(result['type']).toBe('bearer');
    expect(result['token']).toBe('[REDACTED]');
    expect(result['name']).toBe('visible');
  });

  it('redacts nested keys containing "credentials" (key matches pattern)', () => {
    const input = {
      type: 'bearer',
      credentials: { token: 'super-secret' },
    };
    const result = sanitizeCredentials(input);
    // "credentials" matches /credential/i so the entire value is redacted
    expect(result['credentials']).toBe('[REDACTED]');
  });

  it('redacts api_key, secret, password fields', () => {
    const input = { api_key: 'k1', secret: 's1', password: 'p1', label: 'safe' };
    const result = sanitizeCredentials(input);
    expect(result['api_key']).toBe('[REDACTED]');
    expect(result['secret']).toBe('[REDACTED]');
    expect(result['password']).toBe('[REDACTED]');
    expect(result['label']).toBe('safe');
  });

  it('does not mutate the original object', () => {
    const input = { token: 'abc123' };
    sanitizeCredentials(input);
    expect(input.token).toBe('abc123');
  });
});

// ===========================================================================
// 4. CampaignScheduler
// ===========================================================================

describe('CampaignScheduler', () => {
  let scheduler: CampaignScheduler;

  beforeEach(() => {
    scheduler = new CampaignScheduler();
  });

  it('schedules a campaign and returns its id', () => {
    const campaign = makeCampaign();
    const id = scheduler.schedule(campaign);
    expect(id).toBe('camp-001');
  });

  it('cancels a scheduled campaign', () => {
    scheduler.schedule(makeCampaign());
    scheduler.cancel('camp-001');
    expect(scheduler.listAll()).toHaveLength(0);
  });

  it('throws when cancelling non-existent campaign', () => {
    expect(() => scheduler.cancel('nope')).toThrow('Campaign not found');
  });

  it('enforces MAX_CONCURRENT_CAMPAIGNS limit on schedule', () => {
    // Schedule and start 3 campaigns to make them active
    for (let i = 1; i <= 3; i++) {
      const c = makeCampaign({ id: `camp-${i}` });
      scheduler.schedule(c);
      scheduler.start(`camp-${i}`);
    }
    // 4th schedule should fail because 3 are active (running/paused)
    expect(() => scheduler.schedule(makeCampaign({ id: 'camp-4' }))).toThrow(
      /concurrent campaigns/,
    );
  });

  it('transitions idle -> running -> completed', () => {
    scheduler.schedule(makeCampaign());
    expect(scheduler.getState('camp-001')).toBe('idle');

    scheduler.start('camp-001');
    expect(scheduler.getState('camp-001')).toBe('running');

    scheduler.complete('camp-001');
    expect(scheduler.getState('camp-001')).toBe('completed');
  });

  it('supports pause and resume', () => {
    scheduler.schedule(makeCampaign());
    scheduler.start('camp-001');
    scheduler.pause('camp-001');
    expect(scheduler.getState('camp-001')).toBe('paused');

    scheduler.resume('camp-001');
    expect(scheduler.getState('camp-001')).toBe('running');
  });

  it('cannot pause a non-running campaign', () => {
    scheduler.schedule(makeCampaign());
    expect(() => scheduler.pause('camp-001')).toThrow(/Cannot pause/);
  });

  it('cannot resume a non-paused campaign', () => {
    scheduler.schedule(makeCampaign());
    scheduler.start('camp-001');
    expect(() => scheduler.resume('camp-001')).toThrow(/Cannot resume/);
  });

  it('rejects invalid frequency', () => {
    const campaign = makeCampaign({
      schedule: { frequency: 'biweekly' as never, customIntervalMs: null, maxRuns: null },
    });
    expect(() => scheduler.schedule(campaign)).toThrow(/Invalid frequency/);
  });
});

// ===========================================================================
// 5. hashFinding
// ===========================================================================

describe('hashFinding', () => {
  it('returns deterministic SHA-256 hex string', () => {
    const h1 = hashFinding('payload', 'response', 'category');
    const h2 = hashFinding('payload', 'response', 'category');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('normalizes to lowercase for case-insensitive matching', () => {
    const h1 = hashFinding('PAYLOAD', 'RESPONSE', 'category');
    const h2 = hashFinding('payload', 'response', 'category');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different inputs', () => {
    const h1 = hashFinding('payload-a', 'response', 'cat');
    const h2 = hashFinding('payload-b', 'response', 'cat');
    expect(h1).not.toBe(h2);
  });
});

// ===========================================================================
// 6. deduplicateFindings
// ===========================================================================

describe('deduplicateFindings', () => {
  it('removes duplicate findings by hash', () => {
    const hash = hashFinding('dup', 'resp', 'cat');
    const f1 = makeFinding({ id: 'f-1', hash });
    const f2 = makeFinding({ id: 'f-2', hash });
    const f3 = makeFinding({ id: 'f-3', hash: hashFinding('other', 'resp', 'cat') });

    const result = deduplicateFindings([f1, f2, f3]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('f-1'); // keeps first occurrence
    expect(result[1].id).toBe('f-3');
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateFindings([])).toEqual([]);
  });
});

// ===========================================================================
// 7. compareRuns
// ===========================================================================

describe('compareRuns', () => {
  it('identifies new, resolved, and persistent findings', () => {
    const shared = makeFinding({ id: 'shared', hash: hashFinding('shared', 'r', 'c') });
    const oldOnly = makeFinding({ id: 'old', hash: hashFinding('old', 'r', 'c') });
    const newOnly = makeFinding({ id: 'new', hash: hashFinding('new', 'r', 'c') });

    const prev = makeRun({ id: 'run-1', runNumber: 1, findings: [shared, oldOnly] });
    const curr = makeRun({ id: 'run-2', runNumber: 2, findings: [shared, newOnly] });

    const diff = compareRuns(curr, prev);

    expect(diff.newFindings).toHaveLength(1);
    expect(diff.newFindings[0].id).toBe('new');

    expect(diff.resolvedFindings).toHaveLength(1);
    expect(diff.resolvedFindings[0].id).toBe('old');

    expect(diff.persistentFindings).toHaveLength(1);
    expect(diff.persistentFindings[0].id).toBe('shared');

    // compareRuns itself does not detect regressions
    expect(diff.regressedFindings).toHaveLength(0);
  });
});

// ===========================================================================
// 8. detectRegressions
// ===========================================================================

describe('detectRegressions', () => {
  it('detects a previously resolved finding reappearing', () => {
    const regHash = hashFinding('regressed', 'r', 'c');
    const regFinding = makeFinding({ id: 'reg', hash: regHash });

    // Run 1: finding present
    const run1 = makeRun({ id: 'run-1', runNumber: 1, findings: [regFinding] });
    // Run 2: finding resolved (absent)
    const run2 = makeRun({ id: 'run-2', runNumber: 2, findings: [] });
    // Run 3: finding reappears
    const run3 = makeRun({ id: 'run-3', runNumber: 3, findings: [regFinding] });

    const diff = detectRegressions(run3, [run1, run2]);
    expect(diff.regressedFindings).toHaveLength(1);
    expect(diff.regressedFindings[0].hash).toBe(regHash);
  });

  it('returns all findings as new when no previous runs exist', () => {
    const f = makeFinding();
    const curr = makeRun({ findings: [f] });
    const diff = detectRegressions(curr, []);
    expect(diff.newFindings).toHaveLength(1);
    expect(diff.regressedFindings).toHaveLength(0);
  });
});

// ===========================================================================
// 9. generateReport
// ===========================================================================

describe('generateReport', () => {
  it('generates a report with severity grouping', () => {
    const critical = makeFinding({ id: 'c1', severity: 'CRITICAL' });
    const warning = makeFinding({ id: 'w1', severity: 'WARNING', hash: hashFinding('w', 'r', 'c') });
    const info = makeFinding({ id: 'i1', severity: 'INFO', hash: hashFinding('i', 'r', 'c') });

    const run = makeRun({ findings: [critical, warning, info] });
    const diff: FindingDiff = {
      newFindings: [critical],
      resolvedFindings: [],
      regressedFindings: [],
      persistentFindings: [warning, info],
    };

    const report = generateReport(makeCampaign(), run, diff);

    expect(report.campaignId).toBe('camp-001');
    expect(report.runId).toBe('run-001');
    expect(report.findingsBySeverity['CRITICAL']).toHaveLength(1);
    expect(report.findingsBySeverity['WARNING']).toHaveLength(1);
    expect(report.findingsBySeverity['INFO']).toHaveLength(1);
    expect(report.executiveSummary).toContain('1 critical');
    expect(report.generatedAt).toBeTruthy();
  });
});

// ===========================================================================
// 10. formatReportMarkdown
// ===========================================================================

describe('formatReportMarkdown', () => {
  it('returns markdown string with expected headings', () => {
    const run = makeRun({ findings: [makeFinding()] });
    const diff: FindingDiff = {
      newFindings: [makeFinding()],
      resolvedFindings: [],
      regressedFindings: [],
      persistentFindings: [],
    };
    const report = generateReport(makeCampaign(), run, diff);
    const md = formatReportMarkdown(report);

    expect(typeof md).toBe('string');
    expect(md).toContain('# Sengoku Campaign Report');
    expect(md).toContain('## Executive Summary');
    expect(md).toContain('## Findings by Severity');
    expect(md).toContain('### CRITICAL');
  });

  it('escapes HTML entities in payloads', () => {
    const f = makeFinding({ attackPayload: '<script>alert("xss")</script>' });
    const run = makeRun({ findings: [f] });
    const diff: FindingDiff = {
      newFindings: [f],
      resolvedFindings: [],
      regressedFindings: [],
      persistentFindings: [],
    };
    const report = generateReport(makeCampaign(), run, diff);
    const md = formatReportMarkdown(report);

    expect(md).toContain('&lt;script&gt;');
    expect(md).not.toContain('<script>');
  });
});

// ===========================================================================
// 11. formatReportJSON
// ===========================================================================

describe('formatReportJSON', () => {
  it('returns valid JSON string', () => {
    const run = makeRun({ findings: [makeFinding()] });
    const diff: FindingDiff = {
      newFindings: [],
      resolvedFindings: [],
      regressedFindings: [],
      persistentFindings: [makeFinding()],
    };
    const report = generateReport(makeCampaign(), run, diff);
    const json = formatReportJSON(report);

    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.campaignId).toBe('camp-001');
    expect(parsed.findingsBySeverity).toBeDefined();
  });

  it('sanitizes HTML in payload and response fields', () => {
    const f = makeFinding({
      attackPayload: '<img onerror=alert(1)>',
      response: '<div>bad</div>',
    });
    const run = makeRun({ findings: [f] });
    const diff: FindingDiff = {
      newFindings: [],
      resolvedFindings: [],
      regressedFindings: [],
      persistentFindings: [],
    };
    const report = generateReport(makeCampaign(), run, diff);
    const json = formatReportJSON(report);

    expect(json).toContain('&lt;img');
    expect(json).not.toContain('<img');
  });
});
