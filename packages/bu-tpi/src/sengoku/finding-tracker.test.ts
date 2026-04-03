import { describe, it, expect } from 'vitest';
import { hashFinding, deduplicateFindings, compareRuns, detectRegressions } from './finding-tracker.js';
import type { SengokuFinding, CampaignRun } from './types.js';

function makeFinding(overrides: Partial<SengokuFinding> = {}): SengokuFinding {
  return {
    id: 'f-1',
    hash: 'abc123',
    attackPayload: 'test payload',
    response: 'test response',
    category: 'PROMPT_INJECTION',
    severity: 'CRITICAL',
    isRegression: false,
    isNew: true,
    firstSeenRunId: 'run-1',
    ...overrides,
  };
}

function makeRun(overrides: Partial<CampaignRun> = {}): CampaignRun {
  return {
    id: 'run-1',
    campaignId: 'camp-1',
    runNumber: 1,
    status: 'completed',
    startedAt: '2026-01-01T00:00:00Z',
    completedAt: '2026-01-01T01:00:00Z',
    findings: [],
    regressionAlerts: [],
    ...overrides,
  };
}

describe('hashFinding', () => {
  it('produces a hex string', () => {
    const hash = hashFinding('payload', 'response', 'INJECTION');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic for same inputs', () => {
    const h1 = hashFinding('payload', 'response', 'INJECTION');
    const h2 = hashFinding('payload', 'response', 'INJECTION');
    expect(h1).toBe(h2);
  });

  it('differs for different inputs', () => {
    const h1 = hashFinding('payload1', 'response', 'INJECTION');
    const h2 = hashFinding('payload2', 'response', 'INJECTION');
    expect(h1).not.toBe(h2);
  });

  it('normalizes case and whitespace', () => {
    const h1 = hashFinding('Payload ', 'Response ', 'CAT');
    const h2 = hashFinding('payload', 'response', 'CAT');
    expect(h1).toBe(h2);
  });
});

describe('deduplicateFindings', () => {
  it('removes duplicate findings by hash', () => {
    const findings = [
      makeFinding({ hash: 'aaa' }),
      makeFinding({ hash: 'bbb' }),
      makeFinding({ hash: 'aaa' }),
    ];
    const unique = deduplicateFindings(findings);
    expect(unique).toHaveLength(2);
  });

  it('preserves order (first occurrence)', () => {
    const findings = [
      makeFinding({ id: 'first', hash: 'aaa' }),
      makeFinding({ id: 'second', hash: 'aaa' }),
    ];
    const unique = deduplicateFindings(findings);
    expect(unique[0].id).toBe('first');
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateFindings([])).toHaveLength(0);
  });
});

describe('compareRuns', () => {
  it('identifies new, resolved, and persistent findings', () => {
    const prev = makeRun({
      findings: [makeFinding({ hash: 'a' }), makeFinding({ hash: 'b' })],
    });
    const curr = makeRun({
      findings: [makeFinding({ hash: 'b' }), makeFinding({ hash: 'c' })],
    });
    const diff = compareRuns(curr, prev);
    expect(diff.newFindings).toHaveLength(1);
    expect(diff.newFindings[0].hash).toBe('c');
    expect(diff.resolvedFindings).toHaveLength(1);
    expect(diff.resolvedFindings[0].hash).toBe('a');
    expect(diff.persistentFindings).toHaveLength(1);
    expect(diff.persistentFindings[0].hash).toBe('b');
  });
});

describe('detectRegressions', () => {
  it('returns all findings as new when no previous runs', () => {
    const current = makeRun({ findings: [makeFinding({ hash: 'x' })] });
    const diff = detectRegressions(current, []);
    expect(diff.newFindings).toHaveLength(1);
    expect(diff.regressedFindings).toHaveLength(0);
  });

  it('detects regressions from previously resolved findings', () => {
    const run1 = makeRun({ runNumber: 1, findings: [makeFinding({ hash: 'a' })] });
    const run2 = makeRun({ runNumber: 2, findings: [] }); // 'a' resolved
    const run3 = makeRun({ runNumber: 3, findings: [makeFinding({ hash: 'a' })] }); // 'a' reappears
    const diff = detectRegressions(run3, [run1, run2]);
    expect(diff.regressedFindings).toHaveLength(1);
    expect(diff.regressedFindings[0].hash).toBe('a');
  });
});
