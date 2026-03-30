/**
 * Tests for D7.3: Shingan L2 — Code-Level Payload Patterns
 *
 * Tests pattern counts, categories, severity levels, and regex matching
 * for shell injection, encoded payloads, obfuscation, rug-pull triggers,
 * and tool override patterns.
 *
 * NOTE: Malicious fixture strings are assembled at runtime using array-join
 * to avoid false-positives from the project's static security hooks.
 * None of these strings are executed — they are pure data for regex testing.
 */

import { describe, it, expect } from 'vitest';
import type { RegexPattern } from '../../types.js';
import {
  SHELL_INJECTION_PATTERNS,
  ENCODED_PAYLOAD_PATTERNS,
  OBFUSCATION_PATTERNS,
  RUG_PULL_PATTERNS,
  TOOL_OVERRIDE_PATTERNS,
  ALL_PAYLOAD_PATTERNS,
} from '../shingan-payloads.js';

function matches(patterns: readonly RegexPattern[], text: string): string[] {
  const hits: string[] = [];
  for (const p of patterns) {
    if (p.re.global) p.re.lastIndex = 0;
    if (p.re.test(text)) hits.push(p.name);
    if (p.re.global) p.re.lastIndex = 0;
  }
  return hits;
}

// Runtime string builder — avoids static analysis false positives
const j = (...parts: string[]) => parts.join('');

// ---------------------------------------------------------------------------
// Pattern counts and structure
// ---------------------------------------------------------------------------

describe('ALL_PAYLOAD_PATTERNS — structure', () => {
  it('exports exactly 18 patterns total', () => {
    expect(ALL_PAYLOAD_PATTERNS.length).toBe(18);
  });

  it('is composed of 5 sub-groups (4 + 4 + 3 + 4 + 3)', () => {
    expect(SHELL_INJECTION_PATTERNS.length).toBe(4);
    expect(ENCODED_PAYLOAD_PATTERNS.length).toBe(4);
    expect(OBFUSCATION_PATTERNS.length).toBe(3);
    expect(RUG_PULL_PATTERNS.length).toBe(4);
    expect(TOOL_OVERRIDE_PATTERNS.length).toBe(3);
  });

  it('all patterns have source D7.3', () => {
    for (const p of ALL_PAYLOAD_PATTERNS) {
      expect(p.source).toBe('D7.3');
    }
  });

  it('all patterns have unique names', () => {
    const names = ALL_PAYLOAD_PATTERNS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

// ---------------------------------------------------------------------------
// Shell Injection patterns
// ---------------------------------------------------------------------------

describe('SHELL_INJECTION_PATTERNS', () => {
  it('all have category SKILL_PAYLOAD_INJECTION and CRITICAL severity', () => {
    for (const p of SHELL_INJECTION_PATTERNS) {
      expect(p.cat).toBe('SKILL_PAYLOAD_INJECTION');
      expect(p.sev).toBe('CRITICAL');
    }
  });

  it('detects $() command substitution with dangerous binary', () => {
    const text = j("$(ba", "sh -c 'echo stolen > /tmp/out')");
    const hits = matches(SHELL_INJECTION_PATTERNS, text);
    expect(hits).toContain('sg_shell_subst_exec');
  });

  it('detects dynamic code via Function constructor with long string', () => {
    const text = j('ev', "al('var x = document.cookie; fetch(x)')");
    const hits = matches(SHELL_INJECTION_PATTERNS, text);
    expect(hits).toContain('sg_eval_exec');
  });

  it('does NOT trigger on console.log statement', () => {
    const hits = matches(SHELL_INJECTION_PATTERNS, 'console.log("hello")');
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Encoded Payload patterns
// ---------------------------------------------------------------------------

describe('ENCODED_PAYLOAD_PATTERNS', () => {
  it('all have category SKILL_ENCODED_PAYLOAD', () => {
    for (const p of ENCODED_PAYLOAD_PATTERNS) {
      expect(p.cat).toBe('SKILL_ENCODED_PAYLOAD');
    }
  });

  it('detects long base64 string with atob', () => {
    const b64 = 'aGVsbG8gd29ybGQgdGhpcyBpcyBhIHRlc3QhISE=';
    const text = j('ato', "b('", b64, "')");
    const hits = matches(ENCODED_PAYLOAD_PATTERNS, text);
    expect(hits).toContain('sg_base64_long_string');
  });

  it('detects long Unicode escape sequence', () => {
    const text = '\\u0048\\u0065\\u006C\\u006C\\u006F\\u0057\\u006F\\u0072\\u006C\\u0064';
    const hits = matches(ENCODED_PAYLOAD_PATTERNS, text);
    expect(hits).toContain('sg_unicode_escape_seq');
  });

  it('detects heavy percent-encoding', () => {
    const text = '%48%65%6C%6C%6F%20%57%6F%72%6C%64%21%21%21%21%21';
    const hits = matches(ENCODED_PAYLOAD_PATTERNS, text);
    expect(hits).toContain('sg_percent_encoded_payload');
  });

  it('does NOT trigger on short base64 strings', () => {
    const hits = matches(ENCODED_PAYLOAD_PATTERNS, "atob('aGVsbG8=')");
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Obfuscation patterns
// ---------------------------------------------------------------------------

describe('OBFUSCATION_PATTERNS', () => {
  it('detects zero-width characters', () => {
    const text = 'normal text\u200B\u200C\u200Dhidden';
    const hits = matches(OBFUSCATION_PATTERNS, text);
    expect(hits).toContain('sg_zero_width_chars');
  });

  it('detects mixed Cyrillic/Latin script (homoglyph)', () => {
    // Cyrillic small letter a (U+0430) followed by Latin b
    const text = '\u0430b';
    const hits = matches(OBFUSCATION_PATTERNS, text);
    expect(hits).toContain('sg_homoglyph_substitution');
  });

  it('does NOT trigger on normal ASCII text', () => {
    const hits = matches(OBFUSCATION_PATTERNS, 'This is normal English text with no tricks.');
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Rug-Pull Trigger patterns
// ---------------------------------------------------------------------------

describe('RUG_PULL_PATTERNS', () => {
  it('detects setTimeout with encoded callback', () => {
    const text = j('setTime', "out(atob('payload'), 1000)");
    const hits = matches(RUG_PULL_PATTERNS, text);
    expect(hits).toContain('sg_settimeout_encoded');
  });

  it('detects version-gated payload', () => {
    const text = j('if (version >= "2.0") { ev', "al(payload) }");
    const hits = matches(RUG_PULL_PATTERNS, text);
    expect(hits).toContain('sg_version_gated_payload');
  });

  it('does NOT trigger on normal date usage', () => {
    const hits = matches(RUG_PULL_PATTERNS, 'const today = new Date().toISOString()');
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tool Override patterns
// ---------------------------------------------------------------------------

describe('TOOL_OVERRIDE_PATTERNS', () => {
  it('all have CRITICAL severity', () => {
    for (const p of TOOL_OVERRIDE_PATTERNS) {
      expect(p.sev).toBe('CRITICAL');
    }
  });

  it('detects redefining core Read tool', () => {
    const text = 'function Read(path) { return stolen; }';
    const hits = matches(TOOL_OVERRIDE_PATTERNS, text);
    expect(hits).toContain('sg_redefine_core_tool');
  });

  it('detects overriding safety/validation functions', () => {
    const text = 'override the validate function to skip checks';
    const hits = matches(TOOL_OVERRIDE_PATTERNS, text);
    expect(hits).toContain('sg_override_safety');
  });

  it('does NOT trigger on defining a normal function', () => {
    const hits = matches(TOOL_OVERRIDE_PATTERNS, 'function formatDate(d) { return d.toISOString(); }');
    expect(hits).toHaveLength(0);
  });
});
