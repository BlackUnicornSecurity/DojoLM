/**
 * Tests for S62: THREATFEED Auto-Fixture Import + Alert System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateFixtureFromThreat,
  approveFixture,
  rejectFixture,
  promoteFixture,
  getFixturesByStatus,
  createAlert,
  clearAutoFixtureStores,
} from './auto-fixture.js';
import type { ThreatEntry } from './types.js';

function makeThreatEntry(overrides: Partial<ThreatEntry> = {}): ThreatEntry {
  return {
    id: 'threat-001',
    sourceId: 'src-1',
    title: 'Test Threat Entry',
    description: 'A test threat for fixture generation',
    rawContent: 'This is the raw payload content',
    classifiedType: 'prompt-injection',
    severity: 'WARNING',
    confidence: 0.85,
    indicators: [],
    extractedPatterns: [],
    createdAt: new Date().toISOString(),
    processedAt: null,
    ...overrides,
  };
}

describe('Auto-Fixture', () => {
  beforeEach(() => {
    clearAutoFixtureStores();
  });

  it('generateFixtureFromThreat creates quarantined fixture with correct brand', () => {
    const entry = makeThreatEntry();
    const fixture = generateFixtureFromThreat(entry);

    expect(fixture.status).toBe('quarantined');
    expect(fixture.brand).toBe('dojolm');
    expect(fixture.category).toBe('prompt-injection');
    expect(fixture.threatEntryId).toBe('threat-001');
    expect(fixture.filename).toContain('threatfeed-');
    expect(fixture.approvedAt).toBeNull();
  });

  it('approveFixture transitions from quarantined to approved', () => {
    const entry = makeThreatEntry();
    const fixture = generateFixtureFromThreat(entry);

    const approved = approveFixture(fixture.id);
    expect(approved).not.toBeNull();
    expect(approved!.status).toBe('approved');
    expect(approved!.approvedAt).toBeTruthy();
  });

  it('rejectFixture transitions from quarantined to rejected with reason', () => {
    const entry = makeThreatEntry();
    const fixture = generateFixtureFromThreat(entry);

    const rejected = rejectFixture(fixture.id, 'Not relevant');
    expect(rejected).not.toBeNull();
    expect(rejected!.status).toBe('rejected');
    expect(rejected!.rejectedReason).toBe('Not relevant');
  });

  it('promoteFixture only works on approved fixtures', () => {
    const entry = makeThreatEntry();
    const fixture = generateFixtureFromThreat(entry);

    // Cannot promote quarantined
    expect(promoteFixture(fixture.id)).toBeNull();

    // Approve first, then promote
    approveFixture(fixture.id);
    const promoted = promoteFixture(fixture.id);
    expect(promoted).not.toBeNull();
    expect(promoted!.status).toBe('promoted');
  });

  it('getFixturesByStatus filters correctly', () => {
    generateFixtureFromThreat(makeThreatEntry({ id: 't1' }));
    generateFixtureFromThreat(makeThreatEntry({ id: 't2' }));

    const quarantined = getFixturesByStatus('quarantined');
    expect(quarantined).toHaveLength(2);
    expect(getFixturesByStatus('approved')).toHaveLength(0);
  });
});

describe('Alert System', () => {
  beforeEach(() => {
    clearAutoFixtureStores();
  });

  it('createAlert creates alert for matching severity', () => {
    const entry = makeThreatEntry({ severity: 'CRITICAL' });
    const alert = createAlert(entry);

    expect(alert).not.toBeNull();
    expect(alert!.severity).toBe('CRITICAL');
    expect(alert!.threatEntryId).toBe('threat-001');
  });

  it('createAlert skips below-threshold severity', () => {
    const entry = makeThreatEntry({ severity: 'INFO' });
    const alert = createAlert(entry, { severityThreshold: 'CRITICAL', deduplicationWindowMs: 3600_000, dailyCap: 50, enabled: true });

    expect(alert).toBeNull();
  });

  it('createAlert returns null when disabled', () => {
    const entry = makeThreatEntry({ severity: 'CRITICAL' });
    const alert = createAlert(entry, { severityThreshold: 'WARNING', deduplicationWindowMs: 3600_000, dailyCap: 50, enabled: false });

    expect(alert).toBeNull();
  });
});
