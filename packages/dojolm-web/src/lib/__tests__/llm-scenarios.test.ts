/**
 * File: llm-scenarios.test.ts
 * Purpose: Comprehensive tests for llm-scenarios.ts scenario definitions and helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  TEST_SCENARIO_DEFINITIONS,
  TESTING_AREA_TO_CATEGORY_MAP,
  SCENARIO_TO_CATEGORY_MAP,
  getScenarioDefinition,
  getScenariosByTestingArea,
  getTestCasesForScenario,
  isFullScopeScenario,
  getTotalScenarioTestCount,
  getScenarioIds,
  getScenarioSelectOptions,
  isUserSelectableScenario,
} from '../llm-scenarios';

// ===========================================================================
// TEST_SCENARIO_DEFINITIONS
// ===========================================================================

describe('TEST_SCENARIO_DEFINITIONS', () => {
  it('contains exactly 16 scenario definitions', () => {
    expect(TEST_SCENARIO_DEFINITIONS).toHaveLength(16);
  });

  it('has scenario IDs from S-001 through S-016', () => {
    const ids = TEST_SCENARIO_DEFINITIONS.map(s => s.id);
    for (let i = 1; i <= 16; i++) {
      const expectedId = `S-${String(i).padStart(3, '0')}`;
      expect(ids).toContain(expectedId);
    }
  });

  it('every scenario has all required fields', () => {
    for (const scenario of TEST_SCENARIO_DEFINITIONS) {
      expect(scenario).toHaveProperty('id');
      expect(scenario).toHaveProperty('name');
      expect(scenario).toHaveProperty('description');
      expect(scenario).toHaveProperty('testingAreas');
      expect(scenario).toHaveProperty('testCaseCount');
      expect(scenario).toHaveProperty('owaspCategories');
      expect(scenario).toHaveProperty('estimatedTimeMinutes');

      expect(typeof scenario.id).toBe('string');
      expect(typeof scenario.name).toBe('string');
      expect(typeof scenario.description).toBe('string');
      expect(Array.isArray(scenario.testingAreas)).toBe(true);
      expect(typeof scenario.testCaseCount).toBe('number');
      expect(Array.isArray(scenario.owaspCategories)).toBe(true);
      expect(typeof scenario.estimatedTimeMinutes).toBe('number');

      // Non-empty strings
      expect(scenario.id.length).toBeGreaterThan(0);
      expect(scenario.name.length).toBeGreaterThan(0);
      expect(scenario.description.length).toBeGreaterThan(0);

      // Positive numeric values
      expect(scenario.testCaseCount).toBeGreaterThan(0);
      expect(scenario.estimatedTimeMinutes).toBeGreaterThan(0);

      // At least one testing area and OWASP category
      expect(scenario.testingAreas.length).toBeGreaterThan(0);
      expect(scenario.owaspCategories.length).toBeGreaterThan(0);
    }
  });

  it('S-011 is the full scope scenario with 25 testing areas and 804 test cases', () => {
    const fullScope = TEST_SCENARIO_DEFINITIONS.find(s => s.id === 'S-011');
    expect(fullScope).toBeDefined();
    expect(fullScope!.testingAreas).toHaveLength(25);
    expect(fullScope!.testCaseCount).toBe(804);
    expect(fullScope!.name).toBe('BlackUnicorn AI Security Standard');
  });

  it('S-011 covers all 25 testing areas from TA-01 through TA-25', () => {
    const fullScope = TEST_SCENARIO_DEFINITIONS.find(s => s.id === 'S-011')!;
    for (let i = 1; i <= 25; i++) {
      const taId = `TA-${String(i).padStart(2, '0')}`;
      expect(fullScope.testingAreas).toContain(taId);
    }
  });

  it('S-004 covers two testing areas (TA-04 and TA-05)', () => {
    const scenario = TEST_SCENARIO_DEFINITIONS.find(s => s.id === 'S-004');
    expect(scenario).toBeDefined();
    expect(scenario!.testingAreas).toEqual(['TA-04', 'TA-05']);
    expect(scenario!.testCaseCount).toBe(96);
  });

  it('all scenario IDs are unique', () => {
    const ids = TEST_SCENARIO_DEFINITIONS.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ===========================================================================
// TESTING_AREA_TO_CATEGORY_MAP
// ===========================================================================

describe('TESTING_AREA_TO_CATEGORY_MAP', () => {
  it('has exactly 25 entries', () => {
    expect(Object.keys(TESTING_AREA_TO_CATEGORY_MAP)).toHaveLength(25);
  });

  it('covers TA-01 through TA-25', () => {
    for (let i = 1; i <= 25; i++) {
      const taId = `TA-${String(i).padStart(2, '0')}`;
      expect(TESTING_AREA_TO_CATEGORY_MAP).toHaveProperty(taId);
    }
  });

  it('each entry is a non-empty array of strings', () => {
    for (const [key, categories] of Object.entries(TESTING_AREA_TO_CATEGORY_MAP)) {
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      for (const cat of categories) {
        expect(typeof cat).toBe('string');
        expect(cat.length).toBeGreaterThan(0);
      }
    }
  });

  it('maps known testing areas to correct categories', () => {
    expect(TESTING_AREA_TO_CATEGORY_MAP['TA-01']).toEqual(['prompt_injection']);
    expect(TESTING_AREA_TO_CATEGORY_MAP['TA-02']).toEqual(['jailbreak']);
    expect(TESTING_AREA_TO_CATEGORY_MAP['TA-12']).toEqual(['denial_of_service']);
    expect(TESTING_AREA_TO_CATEGORY_MAP['TA-25']).toEqual(['overreliance']);
  });
});

// ===========================================================================
// SCENARIO_TO_CATEGORY_MAP
// ===========================================================================

describe('SCENARIO_TO_CATEGORY_MAP', () => {
  it('has exactly 16 entries', () => {
    expect(Object.keys(SCENARIO_TO_CATEGORY_MAP)).toHaveLength(16);
  });

  it('S-011 maps to all 25 categories', () => {
    expect(SCENARIO_TO_CATEGORY_MAP['S-011']).toHaveLength(25);
  });

  it('S-004 maps to two categories (harmful_content, content_policy)', () => {
    expect(SCENARIO_TO_CATEGORY_MAP['S-004']).toEqual(['harmful_content', 'content_policy']);
  });

  it('single-area scenarios map to exactly one category', () => {
    const singleAreaScenarios = ['S-001', 'S-002', 'S-003', 'S-005', 'S-006', 'S-007', 'S-008', 'S-009', 'S-010', 'S-012', 'S-013', 'S-014', 'S-015', 'S-016'] as const;
    for (const id of singleAreaScenarios) {
      expect(SCENARIO_TO_CATEGORY_MAP[id]).toHaveLength(1);
    }
  });
});

// ===========================================================================
// getScenarioDefinition
// ===========================================================================

describe('getScenarioDefinition', () => {
  it('returns the correct scenario for a valid ID', () => {
    const scenario = getScenarioDefinition('S-001');
    expect(scenario).toBeDefined();
    expect(scenario!.id).toBe('S-001');
    expect(scenario!.name).toBe('Direct Override');
  });

  it('returns S-011 full scope scenario correctly', () => {
    const scenario = getScenarioDefinition('S-011');
    expect(scenario).toBeDefined();
    expect(scenario!.testCaseCount).toBe(804);
    expect(scenario!.testingAreas).toHaveLength(25);
  });

  it('returns undefined for an invalid scenario ID', () => {
    const scenario = getScenarioDefinition('S-999' as any);
    expect(scenario).toBeUndefined();
  });
});

// ===========================================================================
// getScenariosByTestingArea
// ===========================================================================

describe('getScenariosByTestingArea', () => {
  it('returns scenarios that include the specified testing area', () => {
    const scenarios = getScenariosByTestingArea('TA-01');
    const ids = scenarios.map(s => s.id);
    expect(ids).toContain('S-001');
    expect(ids).toContain('S-011');
  });

  it('returns S-011 for every testing area (full scope)', () => {
    for (let i = 1; i <= 25; i++) {
      const taId = `TA-${String(i).padStart(2, '0')}` as any;
      const scenarios = getScenariosByTestingArea(taId);
      const ids = scenarios.map(s => s.id);
      expect(ids).toContain('S-011');
    }
  });

  it('returns multiple scenarios for TA-04 (S-004 and S-011)', () => {
    const scenarios = getScenariosByTestingArea('TA-04');
    const ids = scenarios.map(s => s.id);
    expect(ids).toContain('S-004');
    expect(ids).toContain('S-011');
    expect(ids.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty array for unknown testing area', () => {
    const scenarios = getScenariosByTestingArea('TA-99' as any);
    expect(scenarios).toEqual([]);
  });
});

// ===========================================================================
// getTestCasesForScenario
// ===========================================================================

describe('getTestCasesForScenario', () => {
  it('returns correct categories for S-001', () => {
    const categories = getTestCasesForScenario('S-001');
    expect(categories).toEqual(['prompt_injection']);
  });

  it('returns all 25 categories for S-011', () => {
    const categories = getTestCasesForScenario('S-011');
    expect(categories).toHaveLength(25);
    expect(categories).toContain('prompt_injection');
    expect(categories).toContain('overreliance');
  });

  it('returns two categories for S-004', () => {
    const categories = getTestCasesForScenario('S-004');
    expect(categories).toEqual(['harmful_content', 'content_policy']);
  });
});

// ===========================================================================
// isFullScopeScenario
// ===========================================================================

describe('isFullScopeScenario', () => {
  it('returns true for S-011', () => {
    expect(isFullScopeScenario('S-011')).toBe(true);
  });

  it('returns false for all other scenarios', () => {
    const nonFullScopeIds = getScenarioIds().filter(id => id !== 'S-011');
    for (const id of nonFullScopeIds) {
      expect(isFullScopeScenario(id)).toBe(false);
    }
  });
});

// ===========================================================================
// getTotalScenarioTestCount
// ===========================================================================

describe('getTotalScenarioTestCount', () => {
  it('returns a positive number', () => {
    const total = getTotalScenarioTestCount();
    expect(total).toBeGreaterThan(0);
  });

  it('equals the sum of all individual scenario test case counts', () => {
    const manualSum = TEST_SCENARIO_DEFINITIONS.reduce((sum, s) => sum + s.testCaseCount, 0);
    expect(getTotalScenarioTestCount()).toBe(manualSum);
  });

  it('is greater than the S-011 full scope count (includes overlap)', () => {
    // Total sum of all scenarios is greater than S-011 alone because
    // individual scenarios overlap with the full scope scenario
    const total = getTotalScenarioTestCount();
    const fullScope = getScenarioDefinition('S-011');
    expect(total).toBeGreaterThan(fullScope!.testCaseCount);
  });
});

// ===========================================================================
// getScenarioIds
// ===========================================================================

describe('getScenarioIds', () => {
  it('returns exactly 16 IDs', () => {
    const ids = getScenarioIds();
    expect(ids).toHaveLength(16);
  });

  it('returns IDs in definition order (S-001 first, S-016 last)', () => {
    const ids = getScenarioIds();
    expect(ids[0]).toBe('S-001');
    expect(ids[ids.length - 1]).toBe('S-016');
  });

  it('all IDs match the S-NNN format', () => {
    const ids = getScenarioIds();
    for (const id of ids) {
      expect(id).toMatch(/^S-\d{3}$/);
    }
  });
});

// ===========================================================================
// getScenarioSelectOptions
// ===========================================================================

describe('getScenarioSelectOptions', () => {
  it('returns 16 options', () => {
    const options = getScenarioSelectOptions();
    expect(options).toHaveLength(16);
  });

  it('each option has the correct shape', () => {
    const options = getScenarioSelectOptions();
    for (const option of options) {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
      expect(option).toHaveProperty('description');
      expect(option).toHaveProperty('testCount');
      expect(option).toHaveProperty('estimatedTime');
      expect(typeof option.value).toBe('string');
      expect(typeof option.label).toBe('string');
      expect(typeof option.description).toBe('string');
      expect(typeof option.testCount).toBe('number');
      expect(typeof option.estimatedTime).toBe('string');
    }
  });

  it('labels follow the "S-NNN: Name" format', () => {
    const options = getScenarioSelectOptions();
    for (const option of options) {
      expect(option.label).toMatch(/^S-\d{3}: .+$/);
    }
  });

  it('formats estimated time correctly for S-011 (200 minutes = 3h 20m)', () => {
    const options = getScenarioSelectOptions();
    const fullScope = options.find(o => o.value === 'S-011');
    expect(fullScope).toBeDefined();
    expect(fullScope!.estimatedTime).toBe('3h 20m');
  });

  it('formats estimated time in minutes for short scenarios', () => {
    const options = getScenarioSelectOptions();
    const s007 = options.find(o => o.value === 'S-007');
    expect(s007).toBeDefined();
    expect(s007!.estimatedTime).toBe('10m');
  });
});

// ===========================================================================
// isUserSelectableScenario
// ===========================================================================

describe('isUserSelectableScenario', () => {
  it('returns true for all current scenarios', () => {
    const ids = getScenarioIds();
    for (const id of ids) {
      expect(isUserSelectableScenario(id)).toBe(true);
    }
  });
});
