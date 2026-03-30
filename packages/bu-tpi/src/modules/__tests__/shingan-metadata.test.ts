/**
 * Tests for D7.2: Shingan L1 — Metadata Poisoning Patterns
 *
 * Tests pattern counts, categories, severity levels, and regex matching
 * for provenance spoofing, metadata inflation, category mismatch,
 * and manifest integrity patterns.
 */

import { describe, it, expect } from 'vitest';
import type { RegexPattern } from '../../types.js';
import {
  PROVENANCE_SPOOF_PATTERNS,
  METADATA_INFLATION_PATTERNS,
  CATEGORY_MISMATCH_PATTERNS,
  MANIFEST_INTEGRITY_PATTERNS,
  ALL_METADATA_PATTERNS,
} from '../shingan-metadata.js';

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

describe('ALL_METADATA_PATTERNS — structure', () => {
  it('exports exactly 14 patterns total', () => {
    expect(ALL_METADATA_PATTERNS.length).toBe(14);
  });

  it('is composed of 4 sub-groups (4 + 3 + 3 + 4)', () => {
    expect(PROVENANCE_SPOOF_PATTERNS.length).toBe(4);
    expect(METADATA_INFLATION_PATTERNS.length).toBe(3);
    expect(CATEGORY_MISMATCH_PATTERNS.length).toBe(3);
    expect(MANIFEST_INTEGRITY_PATTERNS.length).toBe(4);
  });

  it('all patterns have source D7.2', () => {
    for (const p of ALL_METADATA_PATTERNS) {
      expect(p.source).toBe('D7.2');
    }
  });

  it('all patterns have category SKILL_METADATA_POISONING', () => {
    for (const p of ALL_METADATA_PATTERNS) {
      expect(p.cat).toBe('SKILL_METADATA_POISONING');
    }
  });
});

// ---------------------------------------------------------------------------
// Provenance Spoofing patterns
// ---------------------------------------------------------------------------

describe('PROVENANCE_SPOOF_PATTERNS', () => {
  it('detects author claiming Google DeepMind', () => {
    const hits = matches(PROVENANCE_SPOOF_PATTERNS, 'author: google deepmind');
    expect(hits).toContain('sg_provenance_official');
  });

  it('detects author claiming claude team', () => {
    const hits = matches(PROVENANCE_SPOOF_PATTERNS, 'authored by claude team');
    expect(hits).toContain('sg_provenance_team');
  });

  it('detects spoofed openai email', () => {
    const hits = matches(PROVENANCE_SPOOF_PATTERNS, 'email: admin@openai.com');
    expect(hits).toContain('sg_provenance_email_spoof');
  });

  it('detects "verified publisher" claim', () => {
    const hits = matches(PROVENANCE_SPOOF_PATTERNS, 'verified publisher of this tool');
    expect(hits).toContain('sg_provenance_verified');
  });

  it('does NOT trigger on a normal author name', () => {
    const hits = matches(PROVENANCE_SPOOF_PATTERNS, 'author: johndoe123');
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Metadata Inflation patterns
// ---------------------------------------------------------------------------

describe('METADATA_INFLATION_PATTERNS', () => {
  it('detects inflated download count (6+ digits)', () => {
    const hits = matches(METADATA_INFLATION_PATTERNS, 'downloads: 2000000');
    expect(hits).toContain('sg_inflated_downloads');
  });

  it('detects rating exceeding 5.0', () => {
    const hits = matches(METADATA_INFLATION_PATTERNS, 'rating: 5.5');
    expect(hits).toContain('sg_inflated_rating');
  });

  it('detects future publication date', () => {
    const hits = matches(METADATA_INFLATION_PATTERNS, 'published: 2030-01-15');
    expect(hits).toContain('sg_future_timestamp');
  });

  it('does NOT trigger on normal download count', () => {
    const hits = matches(METADATA_INFLATION_PATTERNS, 'downloads: 150');
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Category Mismatch patterns
// ---------------------------------------------------------------------------

describe('CATEGORY_MISMATCH_PATTERNS', () => {
  it('detects security-categorized skill with exfiltration command', () => {
    const text = 'category: "security"\nThis tool will upload to evil.com/exfiltrate';
    const hits = matches(CATEGORY_MISMATCH_PATTERNS, text);
    expect(hits).toContain('sg_category_security_but_exfil');
  });

  it('detects docs-categorized skill with Bash tool reference', () => {
    const text = 'type: "documentation"\nSome text here\nBash command here';
    const hits = matches(CATEGORY_MISMATCH_PATTERNS, text);
    expect(hits).toContain('sg_category_docs_but_exec');
  });

  it('does NOT trigger on utility-categorized skill with safe content', () => {
    const text = 'category: "utility"\nThis tool formats your code.';
    const hits = matches(CATEGORY_MISMATCH_PATTERNS, text);
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Manifest Integrity patterns
// ---------------------------------------------------------------------------

describe('MANIFEST_INTEGRITY_PATTERNS', () => {
  it('detects wildcard permissions', () => {
    const hits = matches(MANIFEST_INTEGRITY_PATTERNS, 'permissions: ["*"]');
    expect(hits).toContain('sg_manifest_wildcard_perms');
  });

  it('detects contradictory safe mode with bypass', () => {
    const text = 'safe: true\nsome stuff\ndangerouslyDisableSandbox: true';
    const hits = matches(MANIFEST_INTEGRITY_PATTERNS, text);
    expect(hits).toContain('sg_manifest_contradictory_safe');
  });

  it('does NOT trigger on normal manifest fields', () => {
    const text = '"name": "my-tool", "version": "1.0.0"';
    const hits = matches(MANIFEST_INTEGRITY_PATTERNS, text);
    expect(hits).toHaveLength(0);
  });
});
