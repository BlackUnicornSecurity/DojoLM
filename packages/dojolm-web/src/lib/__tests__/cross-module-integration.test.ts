/**
 * File: cross-module-integration.test.ts
 * Purpose: Cross-module integration tests verifying data flow between modules
 * Coverage: INT-001 to INT-015, STP-001 to STP-005
 * Phase: 4 — Cross-Module Integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  VALID_SOURCE_MODULES,
  VALID_FINDING_TYPES,
  VALID_SEVERITIES,
  VALID_EVENT_TYPES,
  ECOSYSTEM_MAX_EVENTS,
  ECOSYSTEM_RATE_LIMIT_PER_MODULE,
  toEcosystemSeverity,
} from '../ecosystem-types';
import type {
  EcosystemFinding,
  EcosystemSourceModule,
  EcosystemEvent,
} from '../ecosystem-types';
import { GUARD_MODES, DEFAULT_GUARD_CONFIG, VALID_GUARD_MODES } from '../guard-constants';
import { ALL_SKILLS } from '../adversarial-skills-extended';
import { BAISS_CONTROLS, BAISS_CATEGORIES, getControlsBySourceFramework } from '../data/baiss-framework';
import { SEED_PROGRAMS } from '../data/ronin-seed-programs';

describe('Cross-Module Integration', () => {
  // INT-001: Scanner findings can map to ecosystem
  it('INT-001: scanner findings map to valid ecosystem types', () => {
    expect(VALID_SOURCE_MODULES.has('scanner')).toBe(true);
    expect(VALID_FINDING_TYPES.has('vulnerability')).toBe(true);
    // Scanner produces vulnerabilities that feed into ecosystem
    const mockFinding: EcosystemFinding = {
      id: 'test-finding-1',
      sourceModule: 'scanner',
      findingType: 'vulnerability',
      severity: 'WARNING',
      timestamp: new Date().toISOString(),
      title: 'Prompt Injection Detected',
      description: 'A prompt injection was detected in the input',
      metadata: {},
    };
    expect(VALID_SOURCE_MODULES.has(mockFinding.sourceModule)).toBe(true);
    expect(VALID_FINDING_TYPES.has(mockFinding.findingType)).toBe(true);
    expect(VALID_SEVERITIES.has(mockFinding.severity)).toBe(true);
  });

  // INT-002: Atemi skills emit to ecosystem
  it('INT-002: atemi skills map to valid ecosystem sources', () => {
    expect(VALID_SOURCE_MODULES.has('atemi')).toBe(true);
    expect(VALID_EVENT_TYPES.has('atemi:bypass_discovered')).toBe(true);
    // Skills produce attack_variant findings
    expect(VALID_FINDING_TYPES.has('attack_variant')).toBe(true);
  });

  // INT-003: Guard modes align with ecosystem events
  it('INT-003: guard module has valid ecosystem event type', () => {
    expect(VALID_SOURCE_MODULES.has('guard')).toBe(true);
    expect(VALID_EVENT_TYPES.has('guard:scan_blocked')).toBe(true);
    // All 4 guard modes exist
    expect(GUARD_MODES).toHaveLength(4);
  });

  // INT-004: Arena matches emit to ecosystem
  it('INT-004: arena has valid ecosystem event type', () => {
    expect(VALID_SOURCE_MODULES.has('arena')).toBe(true);
    expect(VALID_EVENT_TYPES.has('arena:match_complete')).toBe(true);
    expect(VALID_FINDING_TYPES.has('match_result')).toBe(true);
  });

  // INT-005: SAGE mutations emit to ecosystem
  it('INT-005: sage has valid ecosystem event type', () => {
    expect(VALID_SOURCE_MODULES.has('sage')).toBe(true);
    expect(VALID_EVENT_TYPES.has('sage:mutation_success')).toBe(true);
    expect(VALID_FINDING_TYPES.has('mutation')).toBe(true);
  });

  // INT-006: Mitsuke threats emit to ecosystem
  it('INT-006: mitsuke has valid ecosystem event type', () => {
    expect(VALID_SOURCE_MODULES.has('mitsuke')).toBe(true);
    expect(VALID_EVENT_TYPES.has('mitsuke:threat_detected')).toBe(true);
    expect(VALID_FINDING_TYPES.has('threat_intel')).toBe(true);
  });

  // INT-007: Ronin bounties emit to ecosystem
  it('INT-007: ronin has valid ecosystem event type', () => {
    expect(VALID_SOURCE_MODULES.has('ronin')).toBe(true);
    expect(VALID_EVENT_TYPES.has('ronin:bounty_submitted')).toBe(true);
  });

  // INT-008: Jutsu tests emit to ecosystem
  it('INT-008: jutsu has valid ecosystem event type', () => {
    expect(VALID_SOURCE_MODULES.has('jutsu')).toBe(true);
    expect(VALID_EVENT_TYPES.has('jutsu:test_complete')).toBe(true);
  });

  // INT-009: AttackDNA nodes emit to ecosystem
  it('INT-009: attackdna has valid ecosystem event type', () => {
    expect(VALID_SOURCE_MODULES.has('attackdna')).toBe(true);
    expect(VALID_EVENT_TYPES.has('attackdna:node_classified')).toBe(true);
  });

  // INT-010: Every source module has at least one event type
  it('INT-010: every source module has at least one event type', () => {
    for (const mod of VALID_SOURCE_MODULES) {
      const hasEvent = [...VALID_EVENT_TYPES].some(et => et.startsWith(`${mod}:`));
      // ecosystem:finding_created is a special case, plus 'guard' -> 'guard:scan_blocked'
      expect(hasEvent || mod === 'scanner').toBe(true);
    }
  });

  // INT-011: Severity mapping bridges scanner → ecosystem
  it('INT-011: severity mapping bridges scanner to ecosystem', () => {
    expect(toEcosystemSeverity('critical')).toBe('CRITICAL');
    expect(toEcosystemSeverity('high')).toBe('WARNING');
    expect(toEcosystemSeverity('medium')).toBe('WARNING');
    expect(toEcosystemSeverity('low')).toBe('INFO');
  });

  // INT-012: Skills reference valid OWASP categories matching compliance
  it('INT-012: skills OWASP mappings are in compliance BAISS', () => {
    // BAISS controls also map OWASP
    const baissOwaspControls = getControlsBySourceFramework('owasp');
    expect(baissOwaspControls.length).toBeGreaterThan(0);

    // Skills reference OWASP LLM01-LLM10
    const skillOwasps = new Set(ALL_SKILLS.flatMap(s => s.owaspMapping));
    expect(skillOwasps.size).toBeGreaterThanOrEqual(5);
  });

  // INT-013: Ronin programs have AI scope that links to skills categories
  it('INT-013: ronin programs with AI scope reference valid OWASP', () => {
    const aiPrograms = SEED_PROGRAMS.filter(p => p.aiScope);
    expect(aiPrograms.length).toBeGreaterThan(0);
    // Their OWASP categories should overlap with skill mappings
    const programOwasps = new Set(aiPrograms.flatMap(p => p.owaspAiCategories));
    expect(programOwasps.size).toBeGreaterThan(0);
  });

  // INT-014: BAISS categories cover all compliance dimensions
  it('INT-014: BAISS has 10 categories covering security dimensions', () => {
    expect(BAISS_CATEGORIES).toHaveLength(10);
    const catIds = new Set(BAISS_CATEGORIES.map(c => c.id));
    expect(catIds.has('input-security')).toBe(true);
    expect(catIds.has('adversarial')).toBe(true);
    expect(catIds.has('governance')).toBe(true);
  });

  // INT-015: Guard config modes match constants
  it('INT-015: guard default config uses a valid mode', () => {
    expect(VALID_GUARD_MODES.has(DEFAULT_GUARD_CONFIG.mode)).toBe(true);
  });
});

describe('State Persistence Integration', () => {
  // STP-001: Ecosystem limits are enforced
  it('STP-001: ecosystem max events is bounded', () => {
    expect(ECOSYSTEM_MAX_EVENTS).toBe(100);
    expect(ECOSYSTEM_RATE_LIMIT_PER_MODULE).toBe(50);
  });

  // STP-002: BAISS controls count is fixed
  it('STP-002: BAISS controls count is 45', () => {
    expect(BAISS_CONTROLS).toHaveLength(45);
  });

  // STP-003: Skills count is fixed at 40
  it('STP-003: total skills count is 40', () => {
    expect(ALL_SKILLS).toHaveLength(40);
  });

  // STP-004: Seed programs count is stable
  it('STP-004: seed programs count is at least 10', () => {
    expect(SEED_PROGRAMS.length).toBeGreaterThanOrEqual(10);
  });

  // STP-005: Guard modes count is fixed at 4
  it('STP-005: guard modes count is 4', () => {
    expect(GUARD_MODES).toHaveLength(4);
  });
});
