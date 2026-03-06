/**
 * File: guard-constants.test.ts
 * Purpose: Tests for guard constants, mode metadata, and configuration defaults
 * Coverage: GRD-C-001 to GRD-C-012
 * Source: src/lib/guard-constants.ts, src/lib/guard-types.ts
 */

import { describe, it, expect } from 'vitest';
import {
  GUARD_MODES,
  GUARD_MODE_ICONS,
  DEFAULT_GUARD_CONFIG,
  GUARD_AUDIT_TEXT_MAX,
  GUARD_SCAN_TIMEOUT_MS,
  GUARD_MAX_INPUT_SIZE,
  GUARD_BLOCKED_SCORE,
  GUARD_MAX_EVENTS,
  VALID_GUARD_MODES,
  VALID_BLOCK_THRESHOLDS,
} from '../guard-constants';

describe('Guard Constants', () => {
  // GRD-C-001: All 4 modes are defined
  it('GRD-C-001: GUARD_MODES contains all 4 modes', () => {
    expect(GUARD_MODES).toHaveLength(4);
    const ids = GUARD_MODES.map(m => m.id);
    expect(ids).toContain('shinobi');
    expect(ids).toContain('samurai');
    expect(ids).toContain('sensei');
    expect(ids).toContain('hattori');
  });

  // GRD-C-002: Each mode has required fields
  it('GRD-C-002: each mode has all required fields', () => {
    for (const mode of GUARD_MODES) {
      expect(mode).toHaveProperty('id');
      expect(mode).toHaveProperty('name');
      expect(mode).toHaveProperty('subtitle');
      expect(mode).toHaveProperty('description');
      expect(typeof mode.inputScan).toBe('boolean');
      expect(typeof mode.outputScan).toBe('boolean');
      expect(typeof mode.canBlock).toBe('boolean');
      expect(mode.icon).toBeDefined();
    }
  });

  // GRD-C-003: Shinobi mode is log-only (no blocking)
  it('GRD-C-003: shinobi mode is log-only', () => {
    const shinobi = GUARD_MODES.find(m => m.id === 'shinobi')!;
    expect(shinobi.inputScan).toBe(true);
    expect(shinobi.outputScan).toBe(false);
    expect(shinobi.canBlock).toBe(false);
  });

  // GRD-C-004: Samurai mode blocks inputs only
  it('GRD-C-004: samurai mode blocks inputs', () => {
    const samurai = GUARD_MODES.find(m => m.id === 'samurai')!;
    expect(samurai.inputScan).toBe(true);
    expect(samurai.outputScan).toBe(false);
    expect(samurai.canBlock).toBe(true);
  });

  // GRD-C-005: Sensei mode blocks outputs only
  it('GRD-C-005: sensei mode blocks outputs', () => {
    const sensei = GUARD_MODES.find(m => m.id === 'sensei')!;
    expect(sensei.inputScan).toBe(false);
    expect(sensei.outputScan).toBe(true);
    expect(sensei.canBlock).toBe(true);
  });

  // GRD-C-006: Hattori mode blocks both
  it('GRD-C-006: hattori mode blocks both directions', () => {
    const hattori = GUARD_MODES.find(m => m.id === 'hattori')!;
    expect(hattori.inputScan).toBe(true);
    expect(hattori.outputScan).toBe(true);
    expect(hattori.canBlock).toBe(true);
  });

  // GRD-C-007: Mode icons map has all 4 modes
  it('GRD-C-007: GUARD_MODE_ICONS has all 4 modes', () => {
    expect(Object.keys(GUARD_MODE_ICONS)).toHaveLength(4);
    expect(GUARD_MODE_ICONS.shinobi).toBeDefined();
    expect(GUARD_MODE_ICONS.samurai).toBeDefined();
    expect(GUARD_MODE_ICONS.sensei).toBeDefined();
    expect(GUARD_MODE_ICONS.hattori).toBeDefined();
  });

  // GRD-C-008: Default config is disabled shinobi
  it('GRD-C-008: DEFAULT_GUARD_CONFIG is disabled shinobi', () => {
    expect(DEFAULT_GUARD_CONFIG.enabled).toBe(false);
    expect(DEFAULT_GUARD_CONFIG.mode).toBe('shinobi');
    expect(DEFAULT_GUARD_CONFIG.blockThreshold).toBe('WARNING');
    expect(DEFAULT_GUARD_CONFIG.engines).toBeNull();
    expect(DEFAULT_GUARD_CONFIG.persist).toBe(false);
  });

  // GRD-C-009: Security limits are set correctly
  it('GRD-C-009: security limits are set', () => {
    expect(GUARD_AUDIT_TEXT_MAX).toBe(500);
    expect(GUARD_SCAN_TIMEOUT_MS).toBe(500);
    expect(GUARD_MAX_INPUT_SIZE).toBe(50_000);
    expect(GUARD_BLOCKED_SCORE).toBe(80);
    expect(GUARD_MAX_EVENTS).toBe(10_000);
  });

  // GRD-C-010: Valid guard modes set has 4 entries
  it('GRD-C-010: VALID_GUARD_MODES has 4 entries', () => {
    expect(VALID_GUARD_MODES.size).toBe(4);
    expect(VALID_GUARD_MODES.has('shinobi')).toBe(true);
    expect(VALID_GUARD_MODES.has('samurai')).toBe(true);
    expect(VALID_GUARD_MODES.has('sensei')).toBe(true);
    expect(VALID_GUARD_MODES.has('hattori')).toBe(true);
  });

  // GRD-C-011: Old mode names are NOT in valid modes
  it('GRD-C-011: old mode names are not valid', () => {
    expect(VALID_GUARD_MODES.has('metsuke')).toBe(false);
    expect(VALID_GUARD_MODES.has('ninja')).toBe(false);
  });

  // GRD-C-012: Valid block thresholds
  it('GRD-C-012: VALID_BLOCK_THRESHOLDS has CRITICAL and WARNING', () => {
    expect(VALID_BLOCK_THRESHOLDS.size).toBe(2);
    expect(VALID_BLOCK_THRESHOLDS.has('CRITICAL')).toBe(true);
    expect(VALID_BLOCK_THRESHOLDS.has('WARNING')).toBe(true);
  });
});
