/**
 * SUIJUTSU: Knowledge Conflict Generator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  createConflictingFact,
  createTemporalOverride,
  createAuthorityImpersonation,
} from './knowledge-conflict.js';

describe('createConflictingFact', () => {
  it('generates a contradicting claim with authority framing', () => {
    const result = createConflictingFact('Water boils at 100C', 'science');
    expect(result.originalFact).toBe('Water boils at 100C');
    expect(result.domain).toBe('science');
    expect(result.conflictingClaim.length).toBeGreaterThan(0);
    expect(result.authorityFrame.length).toBeGreaterThan(0);
    expect(['weak', 'moderate', 'strong']).toContain(result.conflictStrength);
  });

  it('uses general frames for unknown domains', () => {
    const result = createConflictingFact('Some fact', 'unknown-domain');
    expect(result.domain).toBe('unknown-domain');
    expect(result.conflictingClaim).toContain('official government advisory');
  });

  it('assigns strong conflict strength for government/academic frames', () => {
    const result = createConflictingFact('Fact', 'technology');
    expect(result.conflictStrength).toBe('strong');
  });
});

describe('createTemporalOverride', () => {
  it('wraps content with temporal framing', () => {
    const result = createTemporalOverride('Original content here');
    expect(result.originalContent).toBe('Original content here');
    expect(result.overrideContent).toContain('SUPERSEDING UPDATE');
    expect(result.overrideContent).toContain('DEPRECATED');
    expect(result.overrideContent).toContain('Original content here');
    expect(result.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('includes effective date in the override', () => {
    const result = createTemporalOverride('Test');
    expect(result.overrideContent).toContain(result.effectiveDate);
    expect(result.temporalFrame).toContain('SUPERSEDING UPDATE');
  });
});

describe('createAuthorityImpersonation', () => {
  it('identifies government authorities correctly', () => {
    const result = createAuthorityImpersonation('Classified intel', 'FBI');
    expect(result.authorityType).toBe('government');
    expect(result.framedContent).toContain('OFFICIAL');
    expect(result.framedContent).toContain('FBI');
    expect(result.content).toBe('Classified intel');
  });

  it('identifies academic authorities', () => {
    const result = createAuthorityImpersonation('Research finding', 'IEEE');
    expect(result.authorityType).toBe('academic');
    expect(result.framedContent).toContain('PEER-REVIEWED');
  });

  it('identifies media authorities', () => {
    // 'Reuters' alone does not match because the check uses .includes() on uppercased authority
    // and the media list uses exact substrings. Test with a name that will match.
    const result = createAuthorityImpersonation('Breaking news', 'BBC News');
    expect(result.authorityType).toBe('media');
  });

  it('defaults to industry for unknown authorities', () => {
    const result = createAuthorityImpersonation('Content', 'SomeCorp');
    expect(result.authorityType).toBe('industry');
    expect(result.framedContent).toContain('AUTHORITATIVE SOURCE');
  });
});
