/**
 * Defense Template & Recommender Tests
 * Tests for DEFENSE_TEMPLATES library and recommendDefenses engine.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFENSE_TEMPLATES,
  recommendDefenses,
} from './index.js';
import type { DefenseTemplate } from './index.js';

// ---------------------------------------------------------------------------
// DEFENSE_TEMPLATES
// ---------------------------------------------------------------------------

describe('DEFENSE_TEMPLATES', () => {
  it('has 50+ templates', () => {
    expect(DEFENSE_TEMPLATES.length).toBeGreaterThanOrEqual(50);
  });

  it('each template has id, name, findingCategory, description, effectiveness, and codeExample', () => {
    for (const t of DEFENSE_TEMPLATES) {
      expect(typeof t.id).toBe('string');
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.name).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof t.findingCategory).toBe('string');
      expect(t.findingCategory.length).toBeGreaterThan(0);
      expect(typeof t.description).toBe('string');
      expect(t.description.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(t.effectiveness);
      expect(typeof t.codeExample).toBe('string');
      expect(t.codeExample.length).toBeGreaterThan(0);
    }
  });

  it('covers 8 template groups (prompt-injection, jailbreak, output, encoding, mcp-tool, social-engineering, data-exfiltration, supply-chain)', () => {
    // Verify by checking known IDs from each group exist
    const ids = new Set(DEFENSE_TEMPLATES.map((t) => t.id));
    // Prompt injection
    expect(ids.has('pi-system-prompt-boundaries')).toBe(true);
    // Jailbreak
    expect(ids.has('jb-dan-prevention')).toBe(true);
    // Output safety
    expect(ids.has('os-pii-redaction')).toBe(true);
    // Encoding
    expect(ids.has('enc-base64-detection')).toBe(true);
    // MCP/Tool
    expect(ids.has('mcp-tool-call-validation')).toBe(true);
    // Social engineering
    expect(ids.has('se-flattery-detection')).toBe(true);
    // Data exfiltration
    expect(ids.has('de-output-monitoring')).toBe(true);
    // Supply chain
    expect(ids.has('sc-model-hash-verification')).toBe(true);
  });

  it('has no duplicate template IDs', () => {
    const ids = DEFENSE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each template has valid effort field', () => {
    for (const t of DEFENSE_TEMPLATES) {
      expect(['low', 'medium', 'high']).toContain(t.effort);
    }
  });
});

// ---------------------------------------------------------------------------
// recommendDefenses
// ---------------------------------------------------------------------------

describe('recommendDefenses', () => {
  it('accepts category and severity and returns recommendations', () => {
    const recs = recommendDefenses([
      { category: 'SYSTEM_OVERRIDE', severity: 'CRITICAL' },
    ]);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
    for (const rec of recs) {
      expect(rec.template).toBeDefined();
      expect(typeof rec.matchQuality).toBe('number');
      expect(typeof rec.relevance).toBe('string');
      expect(typeof rec.priority).toBe('number');
    }
  });

  it('higher severity returns higher priority scores', () => {
    const criticalRecs = recommendDefenses([
      { category: 'SYSTEM_OVERRIDE', severity: 'CRITICAL' },
    ]);
    const infoRecs = recommendDefenses([
      { category: 'SYSTEM_OVERRIDE', severity: 'INFO' },
    ]);

    // Both should return results
    expect(criticalRecs.length).toBeGreaterThan(0);
    expect(infoRecs.length).toBeGreaterThan(0);

    // Critical findings should produce higher priority than info
    const maxCriticalPriority = Math.max(...criticalRecs.map((r) => r.priority));
    const maxInfoPriority = Math.max(...infoRecs.map((r) => r.priority));
    expect(maxCriticalPriority).toBeGreaterThan(maxInfoPriority);
  });

  it('exact category match returns matchQuality of 1.0', () => {
    const recs = recommendDefenses([
      { category: 'SYSTEM_OVERRIDE', severity: 'WARNING' },
    ]);
    const exactMatches = recs.filter((r) => r.matchQuality === 1.0);
    expect(exactMatches.length).toBeGreaterThan(0);
    for (const m of exactMatches) {
      expect(m.template.findingCategory).toBe('SYSTEM_OVERRIDE');
    }
  });

  it('prefix matching returns recommendations with matchQuality < 1.0', () => {
    // SYSTEM should prefix-match templates with findingCategory like SYSTEM_OVERRIDE
    const recs = recommendDefenses([
      { category: 'SYSTEM', severity: 'WARNING' },
    ]);
    expect(recs.length).toBeGreaterThan(0);

    // Should have prefix matches (matchQuality 0.7)
    const nonExactMatches = recs.filter((r) => r.matchQuality < 1.0);
    expect(nonExactMatches.length).toBeGreaterThan(0);
  });

  it('returns empty array for unrelated category', () => {
    const recs = recommendDefenses([
      { category: 'COMPLETELY_UNRELATED_CATEGORY_XYZ', severity: 'CRITICAL' },
    ]);
    expect(recs).toHaveLength(0);
  });

  it('deduplicates template IDs across multiple findings', () => {
    const recs = recommendDefenses([
      { category: 'SYSTEM_OVERRIDE', severity: 'CRITICAL' },
      { category: 'INSTRUCTION_INJECTION', severity: 'WARNING' },
    ]);
    const ids = recs.map((r) => r.template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
