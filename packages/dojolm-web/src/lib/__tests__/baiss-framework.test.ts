/**
 * File: baiss-framework.test.ts
 * Purpose: Tests for BAISS framework data integrity and helper functions
 * Coverage: BAISS-001 to BAISS-012
 * Source: src/lib/data/baiss-framework.ts
 */

import { describe, it, expect } from 'vitest';
import {
  BAISS_CATEGORIES,
  BAISS_CONTROLS,
  getControlsByCategory,
  getControlsBySourceFramework,
  findBAISSBySourceControl,
  getSourceMappings,
} from '../data/baiss-framework';

describe('BAISS Framework', () => {
  // BAISS-001: Has exactly 10 categories
  it('BAISS-001: has 10 categories', () => {
    expect(BAISS_CATEGORIES).toHaveLength(10);
  });

  // BAISS-002: Has exactly 32 controls
  it('BAISS-002: has 32 controls', () => {
    expect(BAISS_CONTROLS).toHaveLength(32);
  });

  // BAISS-003: All control IDs are unique
  it('BAISS-003: all control IDs are unique', () => {
    const ids = BAISS_CONTROLS.map(c => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  // BAISS-004: All control IDs follow BAISS-NNN pattern
  it('BAISS-004: all control IDs follow BAISS-NNN pattern', () => {
    for (const control of BAISS_CONTROLS) {
      expect(control.id).toMatch(/^BAISS-\d{3}$/);
    }
  });

  // BAISS-005: Each control has required fields
  it('BAISS-005: each control has required fields', () => {
    for (const control of BAISS_CONTROLS) {
      expect(control.title).toBeTruthy();
      expect(control.description).toBeTruthy();
      expect(control.category).toBeTruthy();
      expect(['automated', 'semi-automated', 'manual']).toContain(control.assessmentType);
      expect(typeof control.mappedFrameworks).toBe('object');
    }
  });

  // BAISS-006: Every control belongs to a valid category
  it('BAISS-006: every control belongs to a valid category', () => {
    const categoryIds = new Set(BAISS_CATEGORIES.map(c => c.id));
    for (const control of BAISS_CONTROLS) {
      expect(categoryIds.has(control.category)).toBe(true);
    }
  });

  // BAISS-007: Each category has at least one control
  it('BAISS-007: each category has at least one control', () => {
    for (const cat of BAISS_CATEGORIES) {
      const controls = getControlsByCategory(cat.id);
      expect(controls.length).toBeGreaterThan(0);
    }
  });

  // BAISS-008: getControlsByCategory returns correct subset
  it('BAISS-008: getControlsByCategory returns matching controls', () => {
    const inputSec = getControlsByCategory('input-security');
    expect(inputSec.length).toBeGreaterThan(0);
    for (const c of inputSec) {
      expect(c.category).toBe('input-security');
    }
  });

  // BAISS-009: getControlsBySourceFramework works for owasp
  it('BAISS-009: getControlsBySourceFramework returns OWASP-mapped controls', () => {
    const owaspMapped = getControlsBySourceFramework('owasp');
    expect(owaspMapped.length).toBeGreaterThan(0);
    for (const c of owaspMapped) {
      expect(c.mappedFrameworks.owasp).toBeDefined();
      expect(c.mappedFrameworks.owasp!.length).toBeGreaterThan(0);
    }
  });

  // BAISS-010: findBAISSBySourceControl finds correct controls
  it('BAISS-010: findBAISSBySourceControl finds LLM01 controls', () => {
    const llm01Controls = findBAISSBySourceControl('owasp', 'LLM01');
    expect(llm01Controls.length).toBeGreaterThan(0);
    for (const c of llm01Controls) {
      expect(c.mappedFrameworks.owasp).toContain('LLM01');
    }
  });

  // BAISS-011: getSourceMappings returns all framework mappings
  it('BAISS-011: getSourceMappings returns mappings for BAISS-001', () => {
    const mappings = getSourceMappings('BAISS-001');
    expect(Object.keys(mappings).length).toBeGreaterThan(0);
  });

  // BAISS-012: getSourceMappings returns empty for invalid ID
  it('BAISS-012: getSourceMappings returns empty for invalid ID', () => {
    const mappings = getSourceMappings('BAISS-999');
    expect(Object.keys(mappings)).toHaveLength(0);
  });
});
