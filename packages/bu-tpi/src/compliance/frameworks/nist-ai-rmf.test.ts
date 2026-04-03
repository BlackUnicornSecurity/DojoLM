/**
 * Tests for NIST AI RMF mappings
 */

import { describe, it, expect } from 'vitest';
import {
  NIST_AI_RMF_MAPPINGS,
  getMappingsByFunction,
  getModulesForControl,
  getFunctionCoverage,
  getCoveredControlIds,
} from './nist-ai-rmf.js';

describe('NIST_AI_RMF_MAPPINGS', () => {
  it('has mappings for all 4 functions', () => {
    const functions = new Set(NIST_AI_RMF_MAPPINGS.map(m => m.function));
    expect(functions).toContain('GOVERN');
    expect(functions).toContain('MAP');
    expect(functions).toContain('MEASURE');
    expect(functions).toContain('MANAGE');
  });

  it('each mapping has required fields', () => {
    for (const m of NIST_AI_RMF_MAPPINGS) {
      expect(m.function).toBeTruthy();
      expect(m.subcategory).toBeTruthy();
      expect(m.controlId).toBeTruthy();
      expect(['automated', 'supporting', 'manual']).toContain(m.coverageType);
      expect(m.evidenceDescription).toBeTruthy();
    }
  });
});

describe('getMappingsByFunction', () => {
  it('returns only GOVERN mappings', () => {
    const govern = getMappingsByFunction('GOVERN');
    expect(govern.length).toBeGreaterThan(0);
    for (const m of govern) {
      expect(m.function).toBe('GOVERN');
    }
  });

  it('returns only MEASURE mappings', () => {
    const measure = getMappingsByFunction('MEASURE');
    expect(measure.length).toBeGreaterThan(0);
    for (const m of measure) {
      expect(m.function).toBe('MEASURE');
    }
  });
});

describe('getModulesForControl', () => {
  it('returns scanner modules for NIST-SEC', () => {
    const modules = getModulesForControl('NIST-SEC');
    expect(modules.length).toBeGreaterThan(0);
    expect(modules).toContain('ssrf-detector');
  });

  it('returns empty for unknown control ID', () => {
    const modules = getModulesForControl('NONEXISTENT');
    expect(modules).toHaveLength(0);
  });
});

describe('getFunctionCoverage', () => {
  it('returns coverage stats for each function', () => {
    const coverage = getFunctionCoverage();
    expect(coverage['GOVERN']).toBeDefined();
    expect(coverage['GOVERN'].total).toBeGreaterThan(0);
    expect(coverage['GOVERN'].automated + coverage['GOVERN'].supporting + coverage['GOVERN'].manual)
      .toBe(coverage['GOVERN'].total);
  });
});

describe('getCoveredControlIds', () => {
  it('returns unique control IDs', () => {
    const ids = getCoveredControlIds();
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
