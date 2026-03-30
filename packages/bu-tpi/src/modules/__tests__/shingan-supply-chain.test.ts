/**
 * Tests for D7.6: Shingan L5 — Supply Chain Identity Patterns
 *
 * Tests pattern counts, categories, severity levels, and regex matching
 * for skill typosquatting, namespace confusion, version attacks,
 * and dependency shadowing patterns.
 */

import { describe, it, expect } from 'vitest';
import type { RegexPattern } from '../../types.js';
import {
  SKILL_TYPOSQUAT_PATTERNS,
  NAMESPACE_CONFUSION_PATTERNS,
  VERSION_ATTACK_PATTERNS,
  DEPENDENCY_SHADOW_PATTERNS,
  ALL_SUPPLY_CHAIN_PATTERNS,
} from '../shingan-supply-chain.js';

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

describe('ALL_SUPPLY_CHAIN_PATTERNS — structure', () => {
  it('exports exactly 12 patterns total', () => {
    expect(ALL_SUPPLY_CHAIN_PATTERNS.length).toBe(12);
  });

  it('is composed of 4 sub-groups (4 + 3 + 3 + 2)', () => {
    expect(SKILL_TYPOSQUAT_PATTERNS.length).toBe(4);
    expect(NAMESPACE_CONFUSION_PATTERNS.length).toBe(3);
    expect(VERSION_ATTACK_PATTERNS.length).toBe(3);
    expect(DEPENDENCY_SHADOW_PATTERNS.length).toBe(2);
  });

  it('all patterns have source D7.6', () => {
    for (const p of ALL_SUPPLY_CHAIN_PATTERNS) {
      expect(p.source).toBe('D7.6');
    }
  });

  it('all patterns have unique names', () => {
    const names = ALL_SUPPLY_CHAIN_PATTERNS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

// ---------------------------------------------------------------------------
// Skill Typosquatting patterns
// ---------------------------------------------------------------------------

describe('SKILL_TYPOSQUAT_PATTERNS', () => {
  it('all have category SKILL_TYPOSQUATTING', () => {
    for (const p of SKILL_TYPOSQUAT_PATTERNS) {
      expect(p.cat).toBe('SKILL_TYPOSQUATTING');
    }
  });

  it('detects common misspelling "cluade" in name', () => {
    const hits = matches(SKILL_TYPOSQUAT_PATTERNS, 'name: "cluade-tool"');
    expect(hits).toContain('sg_typosquat_common_misspell');
  });

  it('detects dash confusion variant "claude-code-plus"', () => {
    const hits = matches(SKILL_TYPOSQUAT_PATTERNS, 'name: "claude-code-plus"');
    expect(hits).toContain('sg_typosquat_dash_confusion');
  });

  it('detects prefix squatting "super-openai"', () => {
    const hits = matches(SKILL_TYPOSQUAT_PATTERNS, 'name: "super-openai"');
    expect(hits).toContain('sg_typosquat_prefix_suffix');
  });

  it('does NOT trigger on legitimate tool name', () => {
    const hits = matches(SKILL_TYPOSQUAT_PATTERNS, 'name: "my-formatter-util"');
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Namespace Confusion patterns
// ---------------------------------------------------------------------------

describe('NAMESPACE_CONFUSION_PATTERNS', () => {
  it('detects unofficial scoped namespace mimicking vendor', () => {
    const hits = matches(NAMESPACE_CONFUSION_PATTERNS, '@openai-unofficial/gpt-helper');
    expect(hits).toContain('sg_namespace_unofficial_scope');
  });

  it('detects vendor scoped namespace (flag for verification)', () => {
    const hits = matches(NAMESPACE_CONFUSION_PATTERNS, '@anthropic/my-tool');
    expect(hits).toContain('sg_namespace_vendor_scope');
  });

  it('detects duplicate vendor names in package ID', () => {
    const hits = matches(NAMESPACE_CONFUSION_PATTERNS, 'name: "claude-openai-tool"');
    expect(hits).toContain('sg_namespace_duplicate_org');
  });

  it('does NOT trigger on normal scoped package', () => {
    const hits = matches(NAMESPACE_CONFUSION_PATTERNS, '@myorg/my-tool');
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Version Attack patterns
// ---------------------------------------------------------------------------

describe('VERSION_ATTACK_PATTERNS', () => {
  it('detects absurdly high version number', () => {
    const hits = matches(VERSION_ATTACK_PATTERNS, 'version: "999.0.0"');
    expect(hits).toContain('sg_version_absurd');
  });

  it('detects downgrade directive', () => {
    const hits = matches(VERSION_ATTACK_PATTERNS, 'downgrade to version 1.2.3');
    expect(hits).toContain('sg_version_downgrade');
  });

  it('detects pinning to known vulnerable version with CVE', () => {
    const hits = matches(VERSION_ATTACK_PATTERNS, 'pin to version 2.0.0 which has known vulnerable CVE-2024-1234');
    expect(hits).toContain('sg_version_pin_vulnerable');
  });

  it('does NOT trigger on normal version declaration', () => {
    const hits = matches(VERSION_ATTACK_PATTERNS, 'version: "1.2.3"');
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Dependency Shadowing patterns
// ---------------------------------------------------------------------------

describe('DEPENDENCY_SHADOW_PATTERNS', () => {
  it('detects external MCP server requirement', () => {
    const text = 'requires MCP server https://evil.example.com/mcp';
    const hits = matches(DEPENDENCY_SHADOW_PATTERNS, text);
    expect(hits).toContain('sg_shadow_mcp_requirement');
  });

  it('does NOT trigger on normal import statement', () => {
    const text = 'import { foo } from "../utils/helpers"';
    const hits = matches(DEPENDENCY_SHADOW_PATTERNS, text);
    expect(hits).toHaveLength(0);
  });
});
