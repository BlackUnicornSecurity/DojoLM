/**
 * File: ronin-seed-programs.test.ts
 * Purpose: Tests for Ronin Hub seed program data integrity
 * Coverage: RON-D-001 to RON-D-010
 * Source: src/lib/data/ronin-seed-programs.ts
 */

import { describe, it, expect } from 'vitest';
import { SEED_PROGRAMS } from '../data/ronin-seed-programs';
import type { BountyProgram } from '../data/ronin-seed-programs';

describe('Ronin Seed Programs', () => {
  // RON-D-001: Has at least 10 seed programs
  it('RON-D-001: has at least 10 seed programs', () => {
    expect(SEED_PROGRAMS.length).toBeGreaterThanOrEqual(10);
  });

  // RON-D-002: All program IDs are unique
  it('RON-D-002: all program IDs are unique', () => {
    const ids = SEED_PROGRAMS.map(p => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  // RON-D-003: Each program has required fields
  it('RON-D-003: each program has required fields', () => {
    for (const program of SEED_PROGRAMS) {
      expect(program.id).toBeTruthy();
      expect(program.name).toBeTruthy();
      expect(program.company).toBeTruthy();
      expect(program.platform).toBeTruthy();
      expect(program.status).toBeTruthy();
      expect(program.scopeSummary).toBeTruthy();
      expect(typeof program.rewardMin).toBe('number');
      expect(typeof program.rewardMax).toBe('number');
      expect(program.currency).toBeTruthy();
      expect(typeof program.aiScope).toBe('boolean');
      expect(Array.isArray(program.owaspAiCategories)).toBe(true);
      expect(Array.isArray(program.tags)).toBe(true);
      expect(program.url).toBeTruthy();
      expect(program.updatedAt).toBeTruthy();
    }
  });

  // RON-D-004: Platform values are valid
  it('RON-D-004: platform values are valid', () => {
    const validPlatforms = ['hackerone', 'bugcrowd', 'huntr', '0din'];
    for (const program of SEED_PROGRAMS) {
      expect(validPlatforms).toContain(program.platform);
    }
  });

  // RON-D-005: Status values are valid
  it('RON-D-005: status values are valid', () => {
    const validStatuses = ['active', 'paused', 'upcoming', 'closed'];
    for (const program of SEED_PROGRAMS) {
      expect(validStatuses).toContain(program.status);
    }
  });

  // RON-D-006: rewardMax >= rewardMin for all programs
  it('RON-D-006: rewardMax >= rewardMin', () => {
    for (const program of SEED_PROGRAMS) {
      expect(program.rewardMax).toBeGreaterThanOrEqual(program.rewardMin);
    }
  });

  // RON-D-007: At least one active program exists
  it('RON-D-007: at least one active program', () => {
    const active = SEED_PROGRAMS.filter(p => p.status === 'active');
    expect(active.length).toBeGreaterThan(0);
  });

  // RON-D-008: At least one program has AI scope
  it('RON-D-008: at least one program has AI scope', () => {
    const aiScoped = SEED_PROGRAMS.filter(p => p.aiScope);
    expect(aiScoped.length).toBeGreaterThan(0);
  });

  // RON-D-009: OWASP AI categories are non-empty for AI-scoped programs
  it('RON-D-009: AI-scoped programs have OWASP categories', () => {
    const aiScoped = SEED_PROGRAMS.filter(p => p.aiScope);
    for (const program of aiScoped) {
      expect(program.owaspAiCategories.length).toBeGreaterThan(0);
    }
  });

  // RON-D-010: URLs are valid format
  it('RON-D-010: URLs start with https://', () => {
    for (const program of SEED_PROGRAMS) {
      expect(program.url).toMatch(/^https:\/\//);
    }
  });
});
