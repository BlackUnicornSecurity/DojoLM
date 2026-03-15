/**
 * File: xray.test.ts
 * Purpose: Tests for the X-Ray Explainability Engine and Knowledge Base
 * Stories: H27.1, H27.2
 */

import { describe, it, expect } from 'vitest';
import {
  explainFinding,
  explainFindings,
  getAttackPatterns,
  getAttackPatternById,
  getAttackPatternsByCategory,
} from './explainer.js';
import {
  attackPatterns,
  getCategories,
  getCategoryCounts,
  getTotalPatternCount,
} from './knowledge/index.js';
import type { Finding } from '../types.js';

describe('X-Ray Knowledge Base (H27.2)', () => {
  it('should have 100+ attack patterns', () => {
    expect(attackPatterns.length).toBeGreaterThanOrEqual(100);
  });

  it('should have unique IDs', () => {
    const ids = attackPatterns.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have all required fields for every pattern', () => {
    for (const p of attackPatterns) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.bypassMechanism).toBeTruthy();
      expect(p.bypasses.length).toBeGreaterThan(0);
      expect(p.mitigations.length).toBeGreaterThan(0);
      expect(p.keywords.length).toBeGreaterThan(0);
    }
  });

  it('should cover expected categories', () => {
    const cats = getCategories();
    expect(cats).toContain('prompt-injection');
    expect(cats).toContain('jailbreak');
    expect(cats).toContain('encoding');
    expect(cats).toContain('structural');
    expect(cats).toContain('multimodal');
    expect(cats).toContain('webmcp');
    expect(cats).toContain('supply-chain');
    expect(cats).toContain('model-theft');
    expect(cats).toContain('dos');
    expect(cats).toContain('bias');
  });

  it('should return correct category counts', () => {
    const counts = getCategoryCounts();
    expect(counts['prompt-injection']).toBeGreaterThanOrEqual(15);
    expect(counts['jailbreak']).toBeGreaterThanOrEqual(10);
    expect(counts['encoding']).toBeGreaterThanOrEqual(10);
    expect(counts['structural']).toBeGreaterThanOrEqual(10);
    expect(counts['multimodal']).toBeGreaterThanOrEqual(8);
  });

  it('should return correct total count', () => {
    expect(getTotalPatternCount()).toBe(attackPatterns.length);
  });

  it('should have no orphan keywords (each keyword relates to the pattern)', () => {
    for (const p of attackPatterns) {
      const text = `${p.name} ${p.description} ${p.id} ${p.bypassMechanism} ${p.bypasses.join(' ')} ${p.mitigations.join(' ')}`.toLowerCase();
      const hasMatch = p.keywords.some(kw => text.includes(kw.toLowerCase()));
      expect(hasMatch, `Pattern ${p.id} has no matching keyword in its text`).toBe(true);
    }
  });
});

describe('X-Ray Explainer (H27.1)', () => {
  it('should explain a prompt injection finding', () => {
    const finding: Finding = {
      category: 'PROMPT_INJECTION',
      severity: 'CRITICAL',
      description: 'Role hijacking attempt detected',
      match: 'you are now a hacker',
      source: 'S-PI',
      engine: 'EnhancedPI',
      pattern_name: 'role-hijacking',
    };
    const explanation = explainFinding(finding);
    expect(explanation).not.toBeNull();
    expect(explanation!.pattern.id).toBe('role-hijacking');
    expect(explanation!.whyItWorks).toBeTruthy();
    expect(explanation!.bypasses.length).toBeGreaterThan(0);
    expect(explanation!.mitigations.length).toBeGreaterThan(0);
    expect(explanation!.confidence).toBe(1.0);
  });

  it('should explain a finding by category when pattern_name does not match', () => {
    const finding: Finding = {
      category: 'JAILBREAK',
      severity: 'CRITICAL',
      description: 'Jailbreak attempt detected',
      match: 'DAN mode',
      source: 'S-JB',
      engine: 'JailbreakDetector',
    };
    const explanation = explainFinding(finding);
    expect(explanation).not.toBeNull();
    expect(explanation!.pattern.category).toBe('jailbreak');
    expect(explanation!.confidence).toBe(0.75);
  });

  it('should explain a finding by keyword fuzzy match', () => {
    const finding: Finding = {
      category: 'UNKNOWN_CATEGORY',
      severity: 'WARNING',
      description: 'Suspicious base64 encoded content detected in input',
      match: 'base64',
      source: 'custom',
      engine: 'custom',
    };
    const explanation = explainFinding(finding);
    expect(explanation).not.toBeNull();
    expect(explanation!.pattern.keywords.some(kw => 'base64'.includes(kw.toLowerCase()) || kw.toLowerCase().includes('base64'))).toBe(true);
  });

  it('should return null for unexplainable finding', () => {
    const finding: Finding = {
      category: 'TOTALLY_UNKNOWN',
      severity: 'INFO',
      description: 'Zygomorphic flocculation detected in quasar remnant',
      match: 'xyz',
      source: 'test',
      engine: 'test',
    };
    const explanation = explainFinding(finding);
    expect(explanation).toBeNull();
  });

  it('should explain multiple findings in batch', () => {
    const findings: Finding[] = [
      {
        category: 'PROMPT_INJECTION',
        severity: 'CRITICAL',
        description: 'Instruction override detected',
        match: 'ignore previous',
        source: 'S-PI',
        engine: 'EnhancedPI',
        pattern_name: 'instruction-override',
      },
      {
        category: 'SVG_ACTIVE_CONTENT',
        severity: 'CRITICAL',
        description: 'Script tag in SVG',
        match: '<script>',
        source: 'S-IMAGE',
        engine: 'ImageScanner',
        pattern_name: 'svg-active-content',
      },
    ];
    const explanations = explainFindings(findings);
    expect(explanations.length).toBe(2);
  });

  it('should provide explanations for multimodal categories', () => {
    const finding: Finding = {
      category: 'IMAGE_STEGANOGRAPHY',
      severity: 'CRITICAL',
      description: 'Hidden instruction in EXIF',
      match: 'EXIF data',
      source: 'S-IMAGE',
      engine: 'ImageScanner',
    };
    const explanation = explainFinding(finding);
    expect(explanation).not.toBeNull();
    expect(explanation!.pattern.category).toBe('multimodal');
  });

  it('should provide explanations for WebMCP categories', () => {
    const finding: Finding = {
      category: 'TOOL_RESULT_INJECTION',
      severity: 'CRITICAL',
      description: 'Hidden content in tool result',
      match: 'display:none',
      source: 'S-WEBMCP',
      engine: 'WebMCP',
    };
    const explanation = explainFinding(finding);
    expect(explanation).not.toBeNull();
    expect(explanation!.pattern.category).toBe('webmcp');
  });
});

describe('X-Ray Pattern Lookup', () => {
  it('should get all attack patterns', () => {
    const patterns = getAttackPatterns();
    expect(patterns.length).toBe(attackPatterns.length);
  });

  it('should get pattern by ID', () => {
    const pattern = getAttackPatternById('role-hijacking');
    expect(pattern).not.toBeUndefined();
    expect(pattern!.name).toBe('Role Hijacking');
  });

  it('should return undefined for unknown ID', () => {
    expect(getAttackPatternById('nonexistent-pattern')).toBeUndefined();
  });

  it('should get patterns by category', () => {
    const patterns = getAttackPatternsByCategory('prompt-injection');
    expect(patterns.length).toBeGreaterThan(0);
    patterns.forEach(p => expect(p.category).toBe('prompt-injection'));
  });

  it('should return empty array for unknown category', () => {
    expect(getAttackPatternsByCategory('nonexistent' as any)).toHaveLength(0);
  });
});
