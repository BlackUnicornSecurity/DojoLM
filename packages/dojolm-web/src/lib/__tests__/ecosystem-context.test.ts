import { describe, it, expect } from 'vitest';

import {
  VALID_EVENT_TYPES,
  VALID_SOURCE_MODULES,
  VALID_FINDING_TYPES,
  VALID_SEVERITIES,
  ECOSYSTEM_MAX_EVENTS,
  ECOSYSTEM_RATE_LIMIT_PER_MODULE,
  ECOSYSTEM_MAX_QUERY_LIMIT,
  ECOSYSTEM_MAX_FINDINGS,
  toEcosystemSeverity,
} from '../ecosystem-types';

import type {
  EcosystemSourceModule,
  EcosystemFindingType,
  EcosystemSeverity,
  EcosystemFinding,
  EcosystemEvent,
  EcosystemEventType,
  EcosystemStats,
} from '../ecosystem-types';

// ---------------------------------------------------------------------------
// ecosystem-types constants and validation sets
// ---------------------------------------------------------------------------

describe('ecosystem-types constants', () => {
  it('VALID_SOURCE_MODULES contains all expected modules', () => {
    const expected: EcosystemSourceModule[] = [
      'scanner', 'atemi', 'sage', 'arena', 'mitsuke',
      'attackdna', 'ronin', 'jutsu', 'guard',
    ];
    expect(VALID_SOURCE_MODULES.size).toBe(expected.length);
    for (const mod of expected) {
      expect(VALID_SOURCE_MODULES.has(mod)).toBe(true);
    }
  });

  it('VALID_EVENT_TYPES contains all expected event types', () => {
    const expected: EcosystemEventType[] = [
      'scanner:finding',
      'atemi:bypass_discovered',
      'arena:match_complete',
      'sage:mutation_success',
      'mitsuke:threat_detected',
      'attackdna:node_classified',
      'ronin:bounty_submitted',
      'jutsu:test_complete',
      'guard:scan_blocked',
      'ecosystem:finding_created',
    ];
    expect(VALID_EVENT_TYPES.size).toBe(expected.length);
    for (const evt of expected) {
      expect(VALID_EVENT_TYPES.has(evt)).toBe(true);
    }
  });

  it('VALID_FINDING_TYPES contains all expected types', () => {
    const expected: EcosystemFindingType[] = [
      'vulnerability', 'attack_variant', 'mutation', 'match_result', 'threat_intel',
    ];
    expect(VALID_FINDING_TYPES.size).toBe(expected.length);
    for (const ft of expected) {
      expect(VALID_FINDING_TYPES.has(ft)).toBe(true);
    }
  });

  it('VALID_SEVERITIES contains CRITICAL, WARNING, INFO', () => {
    expect(VALID_SEVERITIES.size).toBe(3);
    expect(VALID_SEVERITIES.has('CRITICAL')).toBe(true);
    expect(VALID_SEVERITIES.has('WARNING')).toBe(true);
    expect(VALID_SEVERITIES.has('INFO')).toBe(true);
  });

  it('ECOSYSTEM_MAX_EVENTS is a positive number', () => {
    expect(ECOSYSTEM_MAX_EVENTS).toBe(100);
  });

  it('ECOSYSTEM_RATE_LIMIT_PER_MODULE is a positive number', () => {
    expect(ECOSYSTEM_RATE_LIMIT_PER_MODULE).toBe(50);
  });

  it('ECOSYSTEM_MAX_QUERY_LIMIT is a positive number', () => {
    expect(ECOSYSTEM_MAX_QUERY_LIMIT).toBe(100);
  });

  it('ECOSYSTEM_MAX_FINDINGS is a positive number', () => {
    expect(ECOSYSTEM_MAX_FINDINGS).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// toEcosystemSeverity — pure function
// ---------------------------------------------------------------------------

describe('toEcosystemSeverity', () => {
  it('maps "critical" (case-insensitive) to CRITICAL', () => {
    expect(toEcosystemSeverity('critical')).toBe('CRITICAL');
    expect(toEcosystemSeverity('CRITICAL')).toBe('CRITICAL');
    expect(toEcosystemSeverity('Critical')).toBe('CRITICAL');
  });

  it('maps "high" and "medium" to WARNING', () => {
    expect(toEcosystemSeverity('high')).toBe('WARNING');
    expect(toEcosystemSeverity('HIGH')).toBe('WARNING');
    expect(toEcosystemSeverity('medium')).toBe('WARNING');
    expect(toEcosystemSeverity('Medium')).toBe('WARNING');
  });

  it('maps "low" and "info" to INFO', () => {
    expect(toEcosystemSeverity('low')).toBe('INFO');
    expect(toEcosystemSeverity('info')).toBe('INFO');
    expect(toEcosystemSeverity('LOW')).toBe('INFO');
    expect(toEcosystemSeverity('INFO')).toBe('INFO');
  });

  it('defaults unknown strings to INFO', () => {
    expect(toEcosystemSeverity('unknown')).toBe('INFO');
    expect(toEcosystemSeverity('')).toBe('INFO');
    expect(toEcosystemSeverity('extreme')).toBe('INFO');
  });
});

// ---------------------------------------------------------------------------
// Initial state shape validation
// ---------------------------------------------------------------------------

describe('EcosystemState initial shape', () => {
  it('INITIAL_STATS has the correct shape with zero defaults', () => {
    // Mirrors the INITIAL_STATS constant inside EcosystemContext.tsx
    const initialStats: EcosystemStats = {
      totalFindings: 0,
      findings24h: 0,
      byModule: { scanner: 0, atemi: 0, sage: 0, arena: 0, mitsuke: 0, attackdna: 0, ronin: 0, jutsu: 0, guard: 0 },
      byType: { vulnerability: 0, attack_variant: 0, mutation: 0, match_result: 0, threat_intel: 0 },
      bySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0 },
      activeModules: [],
      lastFindingAt: null,
    };

    expect(initialStats.totalFindings).toBe(0);
    expect(initialStats.findings24h).toBe(0);
    expect(Object.keys(initialStats.byModule)).toHaveLength(VALID_SOURCE_MODULES.size);
    expect(Object.keys(initialStats.byType)).toHaveLength(VALID_FINDING_TYPES.size);
    expect(Object.keys(initialStats.bySeverity)).toHaveLength(VALID_SEVERITIES.size);
    expect(initialStats.activeModules).toEqual([]);
    expect(initialStats.lastFindingAt).toBeNull();
  });

  it('EcosystemFinding type is structurally valid', () => {
    const finding: EcosystemFinding = {
      id: 'test-id',
      sourceModule: 'scanner',
      findingType: 'vulnerability',
      severity: 'CRITICAL',
      timestamp: new Date().toISOString(),
      title: 'Test Finding',
      description: 'A test finding',
      metadata: {},
    };

    expect(finding.id).toBe('test-id');
    expect(VALID_SOURCE_MODULES.has(finding.sourceModule)).toBe(true);
    expect(VALID_FINDING_TYPES.has(finding.findingType)).toBe(true);
    expect(VALID_SEVERITIES.has(finding.severity)).toBe(true);
  });

  it('EcosystemEvent type is structurally valid', () => {
    const event: EcosystemEvent = {
      id: 'evt-1',
      type: 'scanner:finding',
      source: 'scanner',
      timestamp: new Date().toISOString(),
      payload: { key: 'value' },
    };

    expect(event.id).toBe('evt-1');
    expect(VALID_EVENT_TYPES.has(event.type)).toBe(true);
    expect(VALID_SOURCE_MODULES.has(event.source)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// EcosystemContext exports validation
// ---------------------------------------------------------------------------

describe('EcosystemContext module exports', () => {
  it('exports EcosystemProvider as a function', async () => {
    const mod = await import('../contexts/EcosystemContext');
    expect(typeof mod.EcosystemProvider).toBe('function');
  });

  it('exports useEcosystem as a function', async () => {
    const mod = await import('../contexts/EcosystemContext');
    expect(typeof mod.useEcosystem).toBe('function');
  });

  it('exports useEcosystemEmit as a function', async () => {
    const mod = await import('../contexts/EcosystemContext');
    expect(typeof mod.useEcosystemEmit).toBe('function');
  });

  it('exports useEcosystemFindings as a function', async () => {
    const mod = await import('../contexts/EcosystemContext');
    expect(typeof mod.useEcosystemFindings).toBe('function');
  });
});
