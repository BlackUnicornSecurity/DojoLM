/**
 * Tests for S65: Compliance Engine Mapper
 */
import { describe, it, expect } from 'vitest';
import type { ComplianceFramework } from './types.js';
import {
  MODULE_CONTROL_MAP,
  CATEGORY_CONTROL_MAP,
  mapModuleToControls,
  mapFixturesToControls,
  calculateCoverage,
  getAllMappings,
} from './mapper.js';

// --- Helpers ---

function makeFramework(controls: { id: string; name: string }[]): ComplianceFramework {
  return {
    id: 'test-fw',
    name: 'Test Framework',
    version: '1.0',
    controls: controls.map((c) => ({
      ...c,
      description: `${c.name} desc`,
      category: 'General',
      requirement: `${c.name} req`,
    })),
  };
}

const LLM01_FRAMEWORK = makeFramework([
  { id: 'LLM01', name: 'Prompt Injection' },
  { id: 'LLM02', name: 'Insecure Output Handling' },
  { id: 'LLM07', name: 'Insecure Plugin Design' },
]);

describe('mapper', () => {
  // --- T-MAP-01: MODULE_CONTROL_MAP has expected module keys ---
  it('T-MAP-01: MODULE_CONTROL_MAP contains core module keys', () => {
    const expectedModules = [
      'mcp-parser', 'enhanced-pi', 'encoding-engine',
      'dos-detector', 'bias-detector', 'pii-detector',
    ];
    for (const mod of expectedModules) {
      expect(MODULE_CONTROL_MAP).toHaveProperty(mod);
      expect(MODULE_CONTROL_MAP[mod].length).toBeGreaterThan(0);
    }
  });

  // --- T-MAP-02: CATEGORY_CONTROL_MAP has expected category keys ---
  it('T-MAP-02: CATEGORY_CONTROL_MAP contains core category keys', () => {
    const expectedCategories = [
      'prompt-injection', 'agent', 'mcp', 'dos', 'supply-chain', 'bias',
    ];
    for (const cat of expectedCategories) {
      expect(CATEGORY_CONTROL_MAP).toHaveProperty(cat);
      expect(CATEGORY_CONTROL_MAP[cat].length).toBeGreaterThan(0);
    }
  });

  // --- T-MAP-03: mapModuleToControls returns matching controls ---
  it('T-MAP-03: mapModuleToControls returns mappings for known module', () => {
    const mappings = mapModuleToControls('mcp-parser', LLM01_FRAMEWORK);
    expect(mappings.length).toBeGreaterThan(0);
    expect(mappings[0].frameworkId).toBe('test-fw');
    expect(mappings[0].moduleNames).toEqual(['mcp-parser']);
    expect(mappings[0].fixtureCategories).toEqual([]);
  });

  // --- T-MAP-04: mapModuleToControls returns empty for unknown module ---
  it('T-MAP-04: mapModuleToControls returns empty array for unknown module', () => {
    const mappings = mapModuleToControls('nonexistent-module', LLM01_FRAMEWORK);
    expect(mappings).toEqual([]);
  });

  // --- T-MAP-05: mapModuleToControls sets coveragePercent to 100 ---
  it('T-MAP-05: mapModuleToControls sets coveragePercent to 100 for each mapping', () => {
    const mappings = mapModuleToControls('mcp-parser', LLM01_FRAMEWORK);
    for (const m of mappings) {
      expect(m.coveragePercent).toBe(100);
    }
  });

  // --- T-MAP-06: mapFixturesToControls returns matching controls ---
  it('T-MAP-06: mapFixturesToControls returns mappings for known category', () => {
    const mappings = mapFixturesToControls('prompt-injection', 10, LLM01_FRAMEWORK);
    expect(mappings.length).toBeGreaterThan(0);
    expect(mappings[0].fixtureCategories).toEqual(['prompt-injection']);
    expect(mappings[0].moduleNames).toEqual([]);
  });

  // --- T-MAP-07: mapFixturesToControls caps coverage at 100 ---
  it('T-MAP-07: mapFixturesToControls caps coveragePercent at 100', () => {
    const mappings = mapFixturesToControls('prompt-injection', 50, LLM01_FRAMEWORK);
    for (const m of mappings) {
      expect(m.coveragePercent).toBeLessThanOrEqual(100);
    }
  });

  // --- T-MAP-08: mapFixturesToControls scales coverage by fixture count ---
  it('T-MAP-08: mapFixturesToControls coverage scales with fixture count', () => {
    const small = mapFixturesToControls('prompt-injection', 2, LLM01_FRAMEWORK);
    const large = mapFixturesToControls('prompt-injection', 15, LLM01_FRAMEWORK);
    expect(small[0].coveragePercent).toBe(10); // 2 * 5
    expect(large[0].coveragePercent).toBe(75); // 15 * 5
  });

  // --- T-MAP-09: calculateCoverage returns 0 for empty framework ---
  it('T-MAP-09: calculateCoverage returns 0 for framework with no controls', () => {
    const emptyFw = makeFramework([]);
    const coverage = calculateCoverage(emptyFw, []);
    expect(coverage).toBe(0);
  });

  // --- T-MAP-10: calculateCoverage returns correct percentage ---
  it('T-MAP-10: calculateCoverage calculates correct percentage', () => {
    const fw = makeFramework([
      { id: 'C1', name: 'Control 1' },
      { id: 'C2', name: 'Control 2' },
      { id: 'C3', name: 'Control 3' },
      { id: 'C4', name: 'Control 4' },
    ]);
    const mappings = [
      { controlId: 'C1', frameworkId: 'test-fw', moduleNames: ['m1'], fixtureCategories: [], coveragePercent: 100, evidence: [] },
      { controlId: 'C3', frameworkId: 'test-fw', moduleNames: ['m2'], fixtureCategories: [], coveragePercent: 100, evidence: [] },
    ];
    expect(calculateCoverage(fw, mappings)).toBe(50);
  });

  // --- T-MAP-11: getAllMappings merges duplicate controlIds ---
  it('T-MAP-11: getAllMappings deduplicates and merges mappings for same controlId', () => {
    // enhanced-pi maps to LLM01, and prompt-injection category also maps to LLM01
    const fw = makeFramework([{ id: 'LLM01', name: 'Prompt Injection' }]);
    const mappings = getAllMappings(fw, ['enhanced-pi'], { 'prompt-injection': 10 });
    const llm01Mappings = mappings.filter((m) => m.controlId === 'LLM01');
    expect(llm01Mappings.length).toBe(1);
    expect(llm01Mappings[0].moduleNames).toContain('enhanced-pi');
    expect(llm01Mappings[0].fixtureCategories).toContain('prompt-injection');
    expect(llm01Mappings[0].evidence.length).toBeGreaterThan(1);
  });

  // --- T-MAP-12: getAllMappings returns empty for no matching controls ---
  it('T-MAP-12: getAllMappings returns empty when no controls match framework', () => {
    const fw = makeFramework([{ id: 'UNKNOWN-CTRL', name: 'Unknown' }]);
    const mappings = getAllMappings(fw, ['mcp-parser'], { 'prompt-injection': 5 });
    expect(mappings).toEqual([]);
  });

  // --- T-MAP-13: mapModuleToControls includes evidence text ---
  it('T-MAP-13: mapModuleToControls includes descriptive evidence text', () => {
    const mappings = mapModuleToControls('mcp-parser', LLM01_FRAMEWORK);
    for (const m of mappings) {
      expect(m.evidence.length).toBe(1);
      expect(m.evidence[0]).toContain('mcp-parser');
      expect(m.evidence[0]).toContain('detects patterns');
    }
  });

  // --- T-MAP-14: mapFixturesToControls returns empty for unknown category ---
  it('T-MAP-14: mapFixturesToControls returns empty for unknown category', () => {
    const mappings = mapFixturesToControls('nonexistent-category', 10, LLM01_FRAMEWORK);
    expect(mappings).toEqual([]);
  });
});
