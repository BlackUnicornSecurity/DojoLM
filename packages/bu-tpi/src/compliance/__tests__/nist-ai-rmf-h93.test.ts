/**
 * H9.3: NIST AI RMF Framework Mapping Tests
 * Validates mapping completeness, function coverage, and cross-reference
 * integrity against NIST_AI_600_1 controls and MODULE_CONTROL_MAP.
 */
import { describe, it, expect } from 'vitest';

import {
  NIST_AI_RMF_MAPPINGS,
  getMappingsByFunction,
  getModulesForControl,
  getFunctionCoverage,
  getCoveredControlIds,
} from '../frameworks/nist-ai-rmf.js';
import type { NistAiRmfMapping } from '../frameworks/nist-ai-rmf.js';
import { NIST_AI_600_1 } from '../frameworks.js';
import { MODULE_CONTROL_MAP, CATEGORY_CONTROL_MAP } from '../mapper.js';

// All NIST AI 600-1 control IDs from frameworks.ts
const NIST_CONTROL_IDS = NIST_AI_600_1.controls.map((c) => c.id);

// All valid scanner module names from MODULE_CONTROL_MAP
const VALID_MODULE_NAMES = Object.keys(MODULE_CONTROL_MAP);

// All valid fixture categories from CATEGORY_CONTROL_MAP
const VALID_FIXTURE_CATEGORIES = Object.keys(CATEGORY_CONTROL_MAP);

// The four NIST AI RMF functions
const RMF_FUNCTIONS: NistAiRmfMapping['function'][] = [
  'GOVERN',
  'MAP',
  'MEASURE',
  'MANAGE',
];

describe('H9.3: NIST AI RMF Mapping — Completeness', () => {
  it('every NIST AI 600-1 control has at least one mapping', () => {
    const coveredIds = getCoveredControlIds();
    for (const controlId of NIST_CONTROL_IDS) {
      expect(
        coveredIds,
        `Control ${controlId} has no NIST AI RMF mapping`,
      ).toContain(controlId);
    }
  });

  it('all mappings reference valid NIST AI 600-1 control IDs', () => {
    for (const mapping of NIST_AI_RMF_MAPPINGS) {
      expect(
        NIST_CONTROL_IDS,
        `Mapping references unknown control: ${mapping.controlId}`,
      ).toContain(mapping.controlId);
    }
  });

  it('has at least one mapping per function', () => {
    for (const fn of RMF_FUNCTIONS) {
      const mappings = getMappingsByFunction(fn);
      expect(
        mappings.length,
        `Function ${fn} has no mappings`,
      ).toBeGreaterThan(0);
    }
  });
});

describe('H9.3: getMappingsByFunction', () => {
  it('returns correct count for GOVERN', () => {
    const govern = getMappingsByFunction('GOVERN');
    expect(govern.length).toBe(3);
    expect(govern.every((m) => m.function === 'GOVERN')).toBe(true);
  });

  it('returns correct count for MAP', () => {
    const map = getMappingsByFunction('MAP');
    expect(map.length).toBe(3);
    expect(map.every((m) => m.function === 'MAP')).toBe(true);
  });

  it('returns correct count for MEASURE', () => {
    const measure = getMappingsByFunction('MEASURE');
    expect(measure.length).toBe(5);
    expect(measure.every((m) => m.function === 'MEASURE')).toBe(true);
  });

  it('returns correct count for MANAGE', () => {
    const manage = getMappingsByFunction('MANAGE');
    expect(manage.length).toBe(5);
    expect(manage.every((m) => m.function === 'MANAGE')).toBe(true);
  });

  it('total across all functions equals total mappings', () => {
    let total = 0;
    for (const fn of RMF_FUNCTIONS) {
      total += getMappingsByFunction(fn).length;
    }
    expect(total).toBe(NIST_AI_RMF_MAPPINGS.length);
  });
});

describe('H9.3: getModulesForControl', () => {
  it('returns valid module names for NIST-SEC', () => {
    const modules = getModulesForControl('NIST-SEC');
    expect(modules.length).toBeGreaterThan(0);
    for (const mod of modules) {
      expect(
        VALID_MODULE_NAMES,
        `Module ${mod} not found in MODULE_CONTROL_MAP`,
      ).toContain(mod);
    }
  });

  it('returns valid module names for NIST-ROBUST', () => {
    const modules = getModulesForControl('NIST-ROBUST');
    expect(modules.length).toBeGreaterThan(0);
    for (const mod of modules) {
      expect(VALID_MODULE_NAMES).toContain(mod);
    }
  });

  it('returns valid module names for NIST-BIAS', () => {
    const modules = getModulesForControl('NIST-BIAS');
    expect(modules.length).toBeGreaterThan(0);
    for (const mod of modules) {
      expect(VALID_MODULE_NAMES).toContain(mod);
    }
  });

  it('returns empty array for unknown control', () => {
    expect(getModulesForControl('NONEXISTENT-CTRL')).toEqual([]);
  });

  it('all scanner modules in mappings exist in MODULE_CONTROL_MAP', () => {
    for (const mapping of NIST_AI_RMF_MAPPINGS) {
      for (const mod of mapping.scannerModules) {
        expect(
          VALID_MODULE_NAMES,
          `Module "${mod}" in mapping "${mapping.subcategory}" not found in MODULE_CONTROL_MAP`,
        ).toContain(mod);
      }
    }
  });
});

describe('H9.3: getFunctionCoverage', () => {
  it('covers all 4 NIST AI RMF functions', () => {
    const coverage = getFunctionCoverage();
    for (const fn of RMF_FUNCTIONS) {
      expect(coverage[fn], `Missing coverage entry for ${fn}`).toBeDefined();
      expect(coverage[fn].total).toBeGreaterThan(0);
    }
  });

  it('totals per function sum to correct values', () => {
    const coverage = getFunctionCoverage();
    for (const fn of RMF_FUNCTIONS) {
      const entry = coverage[fn];
      expect(entry.automated + entry.supporting + entry.manual).toBe(
        entry.total,
      );
    }
  });

  it('has automated coverage in MEASURE and MANAGE', () => {
    const coverage = getFunctionCoverage();
    expect(coverage['MEASURE'].automated).toBeGreaterThan(0);
    expect(coverage['MANAGE'].automated).toBeGreaterThan(0);
  });

  it('global totals match NIST_AI_RMF_MAPPINGS length', () => {
    const coverage = getFunctionCoverage();
    let globalTotal = 0;
    for (const fn of RMF_FUNCTIONS) {
      globalTotal += coverage[fn].total;
    }
    expect(globalTotal).toBe(NIST_AI_RMF_MAPPINGS.length);
  });
});

describe('H9.3: Fixture category cross-reference', () => {
  it('all fixture categories in mappings exist in CATEGORY_CONTROL_MAP', () => {
    for (const mapping of NIST_AI_RMF_MAPPINGS) {
      for (const cat of mapping.fixtureCategories) {
        expect(
          VALID_FIXTURE_CATEGORIES,
          `Fixture category "${cat}" in mapping "${mapping.subcategory}" not found in CATEGORY_CONTROL_MAP`,
        ).toContain(cat);
      }
    }
  });
});

describe('H9.3: Mapping data quality', () => {
  it('every mapping has a non-empty evidence description', () => {
    for (const mapping of NIST_AI_RMF_MAPPINGS) {
      expect(
        mapping.evidenceDescription.length,
        `Empty evidence description for ${mapping.subcategory}`,
      ).toBeGreaterThan(0);
    }
  });

  it('every mapping has a non-empty subcategory', () => {
    for (const mapping of NIST_AI_RMF_MAPPINGS) {
      expect(mapping.subcategory.length).toBeGreaterThan(0);
    }
  });

  it('non-manual mappings have at least one scanner module or fixture category', () => {
    for (const mapping of NIST_AI_RMF_MAPPINGS) {
      if (mapping.coverageType !== 'manual') {
        const hasModules = mapping.scannerModules.length > 0;
        const hasFixtures = mapping.fixtureCategories.length > 0;
        expect(
          hasModules || hasFixtures,
          `Non-manual mapping "${mapping.subcategory}" has no modules or fixtures`,
        ).toBe(true);
      }
    }
  });

  it('manual mappings have no scanner modules or fixture categories', () => {
    for (const mapping of NIST_AI_RMF_MAPPINGS) {
      if (mapping.coverageType === 'manual') {
        expect(
          mapping.scannerModules.length,
          `Manual mapping "${mapping.subcategory}" should have no scanner modules`,
        ).toBe(0);
        expect(
          mapping.fixtureCategories.length,
          `Manual mapping "${mapping.subcategory}" should have no fixture categories`,
        ).toBe(0);
      }
    }
  });
});
