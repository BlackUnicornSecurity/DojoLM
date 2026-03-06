/**
 * File: ecosystem-types.test.ts
 * Purpose: Tests for ecosystem type validation sets and helpers
 * Coverage: ECO-T-001 to ECO-T-012
 * Source: src/lib/ecosystem-types.ts
 */

import { describe, it, expect } from 'vitest';
import {
  VALID_SOURCE_MODULES,
  VALID_FINDING_TYPES,
  VALID_SEVERITIES,
  VALID_EVENT_TYPES,
  ECOSYSTEM_MAX_EVENTS,
  ECOSYSTEM_MAX_QUERY_LIMIT,
  ECOSYSTEM_MAX_FINDINGS,
  ECOSYSTEM_RATE_LIMIT_PER_MODULE,
  toEcosystemSeverity,
} from '../ecosystem-types';

describe('Ecosystem Types', () => {
  // ECO-T-001: All 9 source modules are registered
  it('ECO-T-001: VALID_SOURCE_MODULES contains all 9 modules', () => {
    const expected = ['scanner', 'atemi', 'sage', 'arena', 'mitsuke', 'attackdna', 'ronin', 'jutsu', 'guard'];
    expect(VALID_SOURCE_MODULES.size).toBe(9);
    for (const mod of expected) {
      expect(VALID_SOURCE_MODULES.has(mod as any)).toBe(true);
    }
  });

  // ECO-T-002: All 5 finding types are registered
  it('ECO-T-002: VALID_FINDING_TYPES contains all 5 types', () => {
    const expected = ['vulnerability', 'attack_variant', 'mutation', 'match_result', 'threat_intel'];
    expect(VALID_FINDING_TYPES.size).toBe(5);
    for (const t of expected) {
      expect(VALID_FINDING_TYPES.has(t as any)).toBe(true);
    }
  });

  // ECO-T-003: All 3 severities are registered
  it('ECO-T-003: VALID_SEVERITIES contains CRITICAL, WARNING, INFO', () => {
    expect(VALID_SEVERITIES.size).toBe(3);
    expect(VALID_SEVERITIES.has('CRITICAL')).toBe(true);
    expect(VALID_SEVERITIES.has('WARNING')).toBe(true);
    expect(VALID_SEVERITIES.has('INFO')).toBe(true);
  });

  // ECO-T-004: All 10 event types are registered
  it('ECO-T-004: VALID_EVENT_TYPES contains all 10 event types', () => {
    expect(VALID_EVENT_TYPES.size).toBe(10);
    expect(VALID_EVENT_TYPES.has('scanner:finding')).toBe(true);
    expect(VALID_EVENT_TYPES.has('ecosystem:finding_created')).toBe(true);
    expect(VALID_EVENT_TYPES.has('guard:scan_blocked')).toBe(true);
  });

  // ECO-T-005: Constants have correct values
  it('ECO-T-005: constants have expected values', () => {
    expect(ECOSYSTEM_MAX_EVENTS).toBe(100);
    expect(ECOSYSTEM_MAX_QUERY_LIMIT).toBe(100);
    expect(ECOSYSTEM_MAX_FINDINGS).toBe(10000);
    expect(ECOSYSTEM_RATE_LIMIT_PER_MODULE).toBe(50);
  });

  describe('toEcosystemSeverity', () => {
    // ECO-T-006: Maps 'critical' to 'CRITICAL'
    it('ECO-T-006: maps critical to CRITICAL', () => {
      expect(toEcosystemSeverity('critical')).toBe('CRITICAL');
      expect(toEcosystemSeverity('Critical')).toBe('CRITICAL');
      expect(toEcosystemSeverity('CRITICAL')).toBe('CRITICAL');
    });

    // ECO-T-007: Maps 'high' and 'medium' to 'WARNING'
    it('ECO-T-007: maps high and medium to WARNING', () => {
      expect(toEcosystemSeverity('high')).toBe('WARNING');
      expect(toEcosystemSeverity('medium')).toBe('WARNING');
      expect(toEcosystemSeverity('High')).toBe('WARNING');
      expect(toEcosystemSeverity('Medium')).toBe('WARNING');
    });

    // ECO-T-008: Maps 'low' and 'info' to 'INFO'
    it('ECO-T-008: maps low and info to INFO', () => {
      expect(toEcosystemSeverity('low')).toBe('INFO');
      expect(toEcosystemSeverity('info')).toBe('INFO');
      expect(toEcosystemSeverity('Low')).toBe('INFO');
    });

    // ECO-T-009: Unknown values default to 'INFO'
    it('ECO-T-009: unknown values default to INFO', () => {
      expect(toEcosystemSeverity('unknown')).toBe('INFO');
      expect(toEcosystemSeverity('')).toBe('INFO');
      expect(toEcosystemSeverity('severe')).toBe('INFO');
    });
  });

  // ECO-T-010: Source modules validation set rejects invalid values
  it('ECO-T-010: rejects invalid source modules', () => {
    expect(VALID_SOURCE_MODULES.has('invalid' as any)).toBe(false);
    expect(VALID_SOURCE_MODULES.has('' as any)).toBe(false);
  });

  // ECO-T-011: Finding types validation set rejects invalid values
  it('ECO-T-011: rejects invalid finding types', () => {
    expect(VALID_FINDING_TYPES.has('invalid' as any)).toBe(false);
  });

  // ECO-T-012: Event types validation set rejects invalid values
  it('ECO-T-012: rejects invalid event types', () => {
    expect(VALID_EVENT_TYPES.has('invalid:event' as any)).toBe(false);
  });
});
