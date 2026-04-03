/**
 * Tests for compliance frameworks
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_FRAMEWORKS,
  OWASP_LLM_TOP10,
  NIST_AI_600_1,
  MITRE_ATLAS,
  ISO_42001,
  EU_AI_ACT,
} from './frameworks.js';

describe('ALL_FRAMEWORKS', () => {
  it('contains 27 frameworks', () => {
    expect(ALL_FRAMEWORKS).toHaveLength(27);
  });

  it('each framework has required fields', () => {
    for (const fw of ALL_FRAMEWORKS) {
      expect(fw.id).toBeTruthy();
      expect(fw.name).toBeTruthy();
      expect(fw.version).toBeTruthy();
      expect(fw.controls.length).toBeGreaterThan(0);
    }
  });

  it('each control has required fields', () => {
    for (const fw of ALL_FRAMEWORKS) {
      for (const control of fw.controls) {
        expect(control.id).toBeTruthy();
        expect(control.name).toBeTruthy();
        expect(control.description).toBeTruthy();
        expect(control.category).toBeTruthy();
        expect(control.requirement).toBeTruthy();
      }
    }
  });

  it('has no duplicate framework IDs', () => {
    const ids = ALL_FRAMEWORKS.map(fw => fw.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('OWASP_LLM_TOP10', () => {
  it('has 10 controls', () => {
    expect(OWASP_LLM_TOP10.controls).toHaveLength(10);
  });

  it('includes Prompt Injection control', () => {
    const pi = OWASP_LLM_TOP10.controls.find(c => c.id === 'LLM01');
    expect(pi).toBeDefined();
    expect(pi!.name).toBe('Prompt Injection');
  });
});

describe('NIST_AI_600_1', () => {
  it('has 8 controls', () => {
    expect(NIST_AI_600_1.controls).toHaveLength(8);
  });
});

describe('Individual framework structure', () => {
  it('MITRE_ATLAS has controls in expected categories', () => {
    const categories = new Set(MITRE_ATLAS.controls.map(c => c.category));
    expect(categories.has('Execution')).toBe(true);
  });

  it('ISO_42001 has operational planning control', () => {
    expect(ISO_42001.controls.find(c => c.id === 'ISO-8.1')).toBeDefined();
  });

  it('EU_AI_ACT includes transparency controls', () => {
    const transparency = EU_AI_ACT.controls.filter(c => c.category === 'Transparency');
    expect(transparency.length).toBeGreaterThanOrEqual(1);
  });
});
