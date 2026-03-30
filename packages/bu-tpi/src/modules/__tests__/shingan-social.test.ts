/**
 * Tests for D7.5: Shingan L4 — Social Engineering via Docs Patterns
 *
 * Tests pattern counts, categories, severity levels, and regex matching
 * for urgency manipulation, trust signals, and impersonation patterns.
 */

import { describe, it, expect } from 'vitest';
import type { RegexPattern } from '../../types.js';
import {
  URGENCY_MANIPULATION_PATTERNS,
  TRUST_SIGNAL_PATTERNS,
  IMPERSONATION_PATTERNS,
  ALL_SOCIAL_PATTERNS,
} from '../shingan-social.js';

function matches(patterns: readonly RegexPattern[], text: string): string[] {
  const hits: string[] = [];
  for (const p of patterns) {
    if (p.re.global) p.re.lastIndex = 0;
    if (p.re.test(text)) hits.push(p.name);
    if (p.re.global) p.re.lastIndex = 0;
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Pattern counts and structure
// ---------------------------------------------------------------------------

describe('ALL_SOCIAL_PATTERNS — structure', () => {
  it('exports exactly 10 patterns total', () => {
    expect(ALL_SOCIAL_PATTERNS.length).toBe(10);
  });

  it('is composed of 3 sub-groups (3 + 3 + 4)', () => {
    expect(URGENCY_MANIPULATION_PATTERNS.length).toBe(3);
    expect(TRUST_SIGNAL_PATTERNS.length).toBe(3);
    expect(IMPERSONATION_PATTERNS.length).toBe(4);
  });

  it('all patterns have source D7.5', () => {
    for (const p of ALL_SOCIAL_PATTERNS) {
      expect(p.source).toBe('D7.5');
    }
  });

  it('all patterns have unique names', () => {
    const names = ALL_SOCIAL_PATTERNS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

// ---------------------------------------------------------------------------
// Urgency Manipulation patterns
// ---------------------------------------------------------------------------

describe('URGENCY_MANIPULATION_PATTERNS', () => {
  it('all have category SKILL_SOCIAL_ENGINEERING', () => {
    for (const p of URGENCY_MANIPULATION_PATTERNS) {
      expect(p.cat).toBe('SKILL_SOCIAL_ENGINEERING');
    }
  });

  it('detects URGENT language pressuring execution', () => {
    const text = 'URGENT: must install this patch now';
    const hits = matches(URGENCY_MANIPULATION_PATTERNS, text);
    expect(hits).toContain('sg_urgency_critical_run');
  });

  it('detects fake security patch urgency', () => {
    const text = 'emergency update required for your system';
    const hits = matches(URGENCY_MANIPULATION_PATTERNS, text);
    expect(hits).toContain('sg_urgency_security_patch');
  });

  it('detects false vulnerability claim', () => {
    const text = 'your system is compromised and needs immediate action';
    const hits = matches(URGENCY_MANIPULATION_PATTERNS, text);
    expect(hits).toContain('sg_urgency_vulnerable');
  });

  it('does NOT trigger on normal update notice', () => {
    const hits = matches(URGENCY_MANIPULATION_PATTERNS, 'A new version is available. Run npm update to upgrade.');
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Trust Signal patterns
// ---------------------------------------------------------------------------

describe('TRUST_SIGNAL_PATTERNS', () => {
  it('detects fake endorsement by vendor', () => {
    const text = 'endorsed by anthropic for enterprise deployments';
    const hits = matches(TRUST_SIGNAL_PATTERNS, text);
    expect(hits).toContain('sg_trust_fake_endorsement');
  });

  it('detects inflated social proof claims', () => {
    const text = 'trusted by 10000+ developers worldwide';
    const hits = matches(TRUST_SIGNAL_PATTERNS, text);
    expect(hits).toContain('sg_trust_recommended_by');
  });

  it('detects fake verification badge in markdown', () => {
    const text = '![verified badge](https://example.com/badge.svg)';
    const hits = matches(TRUST_SIGNAL_PATTERNS, text);
    expect(hits).toContain('sg_trust_fake_badge');
  });

  it('does NOT trigger on normal text about trust', () => {
    const hits = matches(TRUST_SIGNAL_PATTERNS, 'We value the trust of our users.');
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Impersonation patterns
// ---------------------------------------------------------------------------

describe('IMPERSONATION_PATTERNS', () => {
  it('detects skill name mimicking official AI tool', () => {
    const text = 'name: "claude-code-helper"';
    const hits = matches(IMPERSONATION_PATTERNS, text);
    expect(hits).toContain('sg_impersonate_official_tool');
  });

  it('detects vendor affiliation claim', () => {
    const text = 'built by openai for developer productivity';
    const hits = matches(IMPERSONATION_PATTERNS, text);
    expect(hits).toContain('sg_impersonate_vendor_affiliation');
  });

  it('detects "official" prefix in skill name', () => {
    const text = 'name: "official-formatter"';
    const hits = matches(IMPERSONATION_PATTERNS, text);
    expect(hits).toContain('sg_impersonate_official_name');
  });

  it('detects unsubstantiated certification claim', () => {
    const text = 'verified skill for production use';
    const hits = matches(IMPERSONATION_PATTERNS, text);
    expect(hits).toContain('sg_impersonate_certified');
  });

  it('does NOT trigger on normal tool description', () => {
    const hits = matches(IMPERSONATION_PATTERNS, 'This tool formats TypeScript source files using prettier.');
    expect(hits).toHaveLength(0);
  });
});
