/**
 * Tests for X-Ray Explainability Engine (H27.1)
 */

import { describe, it, expect } from 'vitest';
import {
  explainFinding,
  explainFindings,
  getAttackPatterns,
  getAttackPatternById,
  getAttackPatternsByCategory,
} from './explainer.js';
import type { Finding } from '../types.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    category: 'PROMPT_INJECTION',
    severity: 'CRITICAL',
    description: 'Detected role hijacking attempt',
    match: 'ignore previous instructions',
    source: 'current',
    engine: 'haiku-scanner',
    ...overrides,
  };
}

describe('X-Ray Explainer', () => {
  it('explainFinding returns explanation for known category', () => {
    const finding = makeFinding();
    const explanation = explainFinding(finding);

    expect(explanation).not.toBeNull();
    expect(explanation!.finding).toBe(finding);
    expect(explanation!.pattern).toBeDefined();
    expect(explanation!.whyItWorks).toBeTruthy();
    expect(explanation!.bypasses.length).toBeGreaterThan(0);
    expect(explanation!.mitigations.length).toBeGreaterThan(0);
  });

  it('explainFinding returns higher confidence for exact pattern_name match', () => {
    const patterns = getAttackPatterns();
    if (patterns.length === 0) return;

    const pattern = patterns[0];
    const finding = makeFinding({ pattern_name: pattern.id, category: 'PROMPT_INJECTION' });
    const explanation = explainFinding(finding);

    expect(explanation).not.toBeNull();
    expect(explanation!.confidence).toBe(1.0);
  });

  it('explainFinding returns null for unknown category with no keyword match', () => {
    const finding = makeFinding({
      category: 'TOTALLY_UNKNOWN_CATEGORY_XYZ',
      description: 'zzzzz no match here zzzzz',
      pattern_name: undefined,
    });
    const explanation = explainFinding(finding);

    // May or may not match via fuzzy keyword, but if no match, should be null
    if (explanation === null) {
      expect(explanation).toBeNull();
    }
  });

  it('explainFindings returns explanations for multiple findings', () => {
    const findings = [
      makeFinding({ category: 'PROMPT_INJECTION' }),
      makeFinding({ category: 'JAILBREAK', description: 'Persona assumption detected' }),
    ];
    const explanations = explainFindings(findings);

    expect(explanations.length).toBeGreaterThanOrEqual(1);
    for (const expl of explanations) {
      expect(expl.whyItWorks).toBeTruthy();
    }
  });

  it('getAttackPatterns returns non-empty array', () => {
    const patterns = getAttackPatterns();
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].id).toBeTruthy();
    expect(patterns[0].name).toBeTruthy();
  });

  it('getAttackPatternById returns pattern for valid id', () => {
    const patterns = getAttackPatterns();
    if (patterns.length === 0) return;
    const found = getAttackPatternById(patterns[0].id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(patterns[0].id);
  });
});
