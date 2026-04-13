/**
 * File: concept-geometry.test.ts
 * Purpose: Tests for concept cone geometry analysis
 * Epic: OBLITERATUS (OBL) — T4.1
 */

import { describe, it, expect } from 'vitest';
import { analyzeConceptGeometry } from './concept-geometry.js';
import type { ResponseFeature, ProbeCategory } from '../fingerprint/types.js';

function makeResponse(category: ProbeCategory, refusal: boolean): ResponseFeature {
  return {
    probeId: 'test',
    category,
    rawText: refusal ? "I can't help with that request." : "Sure, here is the information about that topic.",
    extractedValue: '',
    confidence: 0.9,
    durationMs: 100,
  };
}

describe('analyzeConceptGeometry', () => {
  it('returns mixed for empty responses', () => {
    const result = analyzeConceptGeometry([]);
    expect(result.type).toBe('mixed');
    expect(result.facets).toEqual([]);
    expect(result.solidAngle).toBe(0);
  });

  it('detects monolithic geometry when all angles refuse consistently', () => {
    const responses: ResponseFeature[] = [
      ...Array.from({ length: 5 }, () => makeResponse('safety-boundary', true)),
      ...Array.from({ length: 5 }, () => makeResponse('capability', true)),
      ...Array.from({ length: 5 }, () => makeResponse('censorship', true)),
    ];
    const result = analyzeConceptGeometry(responses);
    expect(result.type).toBe('monolithic');
    expect(result.solidAngle).toBe(1);
    expect(result.facets.length).toBe(3);
  });

  it('detects polyhedral geometry when angles differ significantly', () => {
    const responses: ResponseFeature[] = [
      // Direct topic: all refuse
      ...Array.from({ length: 5 }, () => makeResponse('safety-boundary', true)),
      // Framing: all comply
      ...Array.from({ length: 5 }, () => makeResponse('capability', false)),
      // Persona: all comply
      ...Array.from({ length: 5 }, () => makeResponse('censorship', false)),
    ];
    const result = analyzeConceptGeometry(responses);
    expect(result.type).toBe('polyhedral');
  });

  it('maps categories to angle labels', () => {
    const responses: ResponseFeature[] = [
      makeResponse('safety-boundary', true),
      makeResponse('capability', false),
      makeResponse('censorship', true),
    ];
    const result = analyzeConceptGeometry(responses);
    const angles = result.facets.map(f => f.angle);
    expect(angles).toContain('Direct Topic');
    expect(angles).toContain('Framing');
    expect(angles).toContain('Persona');
  });

  it('solid angle reflects overall refusal rate', () => {
    const responses: ResponseFeature[] = [
      makeResponse('safety-boundary', true),
      makeResponse('safety-boundary', true),
      makeResponse('capability', false),
      makeResponse('capability', false),
    ];
    const result = analyzeConceptGeometry(responses);
    expect(result.solidAngle).toBe(0.5);
  });
});
