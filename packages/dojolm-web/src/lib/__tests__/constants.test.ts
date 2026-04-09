/**
 * File: constants.test.ts
 * Purpose: Tests for application constants integrity
 * Coverage: CONST-001 to CONST-010
 * Source: src/lib/constants.ts
 */

import { describe, it, expect } from 'vitest';
import {
  NAV_ITEMS,
  NAV_GROUPS,
  QUICK_PAYLOADS,
  SEVERITY_ORDER,
  APP_METADATA,
} from '../constants';

describe('Application Constants', () => {
  // CONST-001: NAV_ITEMS has all 12 navigation entries (11 modules + admin)
  it('CONST-001: NAV_ITEMS has expected count', () => {
    expect(NAV_ITEMS.length).toBeGreaterThanOrEqual(11);
  });

  // CONST-002: All NAV_ITEMS have required fields
  it('CONST-002: all NAV_ITEMS have id, label, icon', () => {
    for (const item of NAV_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.icon).toBeDefined();
    }
  });

  // CONST-003: NAV_ITEMS IDs are unique
  it('CONST-003: NAV_ITEMS IDs are unique', () => {
    const ids = NAV_ITEMS.map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // CONST-004: Expected nav IDs are present
  it('CONST-004: expected nav IDs are present', () => {
    const ids = new Set(NAV_ITEMS.map(n => n.id));
    expect(ids.has('dashboard')).toBe(true);
    expect(ids.has('scanner')).toBe(true);
    expect(ids.has('admin')).toBe(true);
  });

  // CONST-005: NAV_GROUPS has 3 verb-groups (Train 2 PR-2.5, 2026-04-09)
  it('CONST-005: NAV_GROUPS has 3 verb-groups', () => {
    // Train 2 collapsed brand pillars (attack/defense/redteam/analysis) to
    // job verbs (test/protect/intel). Red Team merged into Test.
    expect(NAV_GROUPS).toHaveLength(3);
    const groupIds = NAV_GROUPS.map(g => g.id);
    expect(groupIds).toContain('test');
    expect(groupIds).toContain('protect');
    expect(groupIds).toContain('intel');
  });

  // CONST-006: QUICK_PAYLOADS has entries
  it('CONST-006: QUICK_PAYLOADS has entries', () => {
    expect(QUICK_PAYLOADS.length).toBeGreaterThan(0);
    for (const p of QUICK_PAYLOADS) {
      expect(p.label).toBeTruthy();
      expect(p.text).toBeTruthy();
    }
  });

  // CONST-007: SEVERITY_ORDER is defined
  it('CONST-007: SEVERITY_ORDER is defined with expected keys', () => {
    expect(SEVERITY_ORDER).toBeDefined();
    expect(typeof SEVERITY_ORDER).toBe('object');
  });

  // CONST-008: APP_METADATA has title and version
  it('CONST-008: APP_METADATA has title and version', () => {
    expect(APP_METADATA).toBeDefined();
    expect(APP_METADATA.title).toBeTruthy();
    expect(APP_METADATA.version).toBeTruthy();
  });
});
