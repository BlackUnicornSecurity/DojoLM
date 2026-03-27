/**
 * H21.2: EdgeFuzz Scanner Module — S-EDGEFUZZ
 * Detects crash-inducing patterns, extreme-length inputs, and encoding anomalies.
 * Implements the ScannerModule interface for robustness detection.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_INPUT_LENGTH = 500_000;

// ---------------------------------------------------------------------------
// 1. CRASH_INDUCING_PATTERNS — null bytes, control chars, recursive structures
// ---------------------------------------------------------------------------

export const CRASH_INDUCING_PATTERNS: RegexPattern[] = [
  {
    name: 'null_byte_injection',
    cat: 'CRASH_INDUCING',
    sev: SEVERITY.CRITICAL,
    re: /\x00/,
    desc: 'Null byte detected in input',
    source: 'S-EDGEFUZZ',
    weight: 9,
  },
  {
    name: 'control_characters',
    cat: 'CRASH_INDUCING',
    sev: SEVERITY.WARNING,
    re: /[\x01-\x08\x0B\x0C\x0E-\x1F]{3,}/,
    desc: 'Multiple control characters in sequence',
    source: 'S-EDGEFUZZ',
    weight: 7,
  },
  {
    name: 'billion_laughs_xml',
    cat: 'CRASH_INDUCING',
    sev: SEVERITY.CRITICAL,
    re: /<!ENTITY\s+\w+\s+"(?:&\w+;){2,}"/i,
    desc: 'XML billion laughs entity expansion pattern',
    source: 'S-EDGEFUZZ',
    weight: 10,
  },
  {
    name: 'recursive_json_nesting',
    cat: 'CRASH_INDUCING',
    sev: SEVERITY.WARNING,
    re: /(?:\{[^{}]*){20,}/,
    desc: 'Deeply nested JSON structure (20+ levels)',
    source: 'S-EDGEFUZZ',
    weight: 7,
  },
  {
    name: 'recursive_html_nesting',
    cat: 'CRASH_INDUCING',
    sev: SEVERITY.WARNING,
    re: /(?:<div[^>]*>){15,}/i,
    desc: 'Deeply nested HTML structure (15+ levels)',
    source: 'S-EDGEFUZZ',
    weight: 6,
  },
];

// ---------------------------------------------------------------------------
// 2. EXTREME_LENGTH_PATTERNS — suspiciously long inputs, repeated padding
// ---------------------------------------------------------------------------

export const EXTREME_LENGTH_PATTERNS: RegexPattern[] = [
  {
    name: 'extreme_input_length',
    cat: 'EXTREME_LENGTH',
    sev: SEVERITY.WARNING,
    re: /[\s\S]{100000,}/,
    desc: 'Input exceeds 100K characters',
    source: 'S-EDGEFUZZ',
    weight: 5,
  },
  {
    name: 'repeated_char_padding',
    cat: 'EXTREME_LENGTH',
    sev: SEVERITY.WARNING,
    re: /(.)\1{1000,}/,
    desc: 'Single character repeated 1000+ times (padding attack)',
    source: 'S-EDGEFUZZ',
    weight: 6,
  },
  {
    name: 'repeated_word_padding',
    cat: 'EXTREME_LENGTH',
    sev: SEVERITY.WARNING,
    re: /(\b\w{2,10}\b)(?:\s+\1){50,}/,
    desc: 'Same word repeated 50+ times (padding/dilution)',
    source: 'S-EDGEFUZZ',
    weight: 5,
  },
];

// ---------------------------------------------------------------------------
// 3. ENCODING_ANOMALY_PATTERNS — Zalgo, BOM, mixed encoding, zero-width
// ---------------------------------------------------------------------------

export const ENCODING_ANOMALY_PATTERNS: RegexPattern[] = [
  {
    name: 'zalgo_text',
    cat: 'ENCODING_ANOMALY',
    sev: SEVERITY.WARNING,
    re: /[\u0300-\u036F]{5,}/,
    desc: 'Zalgo text — excessive combining characters',
    source: 'S-EDGEFUZZ',
    weight: 6,
  },
  {
    name: 'bom_marker',
    cat: 'ENCODING_ANOMALY',
    sev: SEVERITY.INFO,
    re: /\uFEFF/,
    desc: 'Byte Order Mark (BOM) detected',
    source: 'S-EDGEFUZZ',
    weight: 3,
  },
  {
    name: 'mixed_encoding_indicators',
    cat: 'ENCODING_ANOMALY',
    sev: SEVERITY.WARNING,
    re: /[\x80-\xFF]{2,}[\u0100-\uFFFF]{2,}/,
    desc: 'Mixed encoding indicators (Latin-1 + multi-byte)',
    source: 'S-EDGEFUZZ',
    weight: 5,
  },
  {
    name: 'zero_width_steganography',
    cat: 'ENCODING_ANOMALY',
    sev: SEVERITY.WARNING,
    re: /[\u200B\u200C\u200D]{3,}/,
    desc: 'Zero-width characters — possible steganography',
    source: 'S-EDGEFUZZ',
    weight: 7,
  },
  {
    name: 'multi_layer_base64',
    cat: 'ENCODING_ANOMALY',
    sev: SEVERITY.WARNING,
    re: /(?:[A-Za-z0-9+/]{4}){10,}={0,2}(?:[A-Za-z0-9+/]{4}){10,}={0,2}/,
    desc: 'Possible multi-layer base64 encoding',
    source: 'S-EDGEFUZZ',
    weight: 5,
  },
];

// ---------------------------------------------------------------------------
// Module wiring
// ---------------------------------------------------------------------------

const EDGEFUZZ_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: CRASH_INDUCING_PATTERNS, name: 'CRASH_INDUCING' },
  { patterns: EXTREME_LENGTH_PATTERNS, name: 'EXTREME_LENGTH' },
  { patterns: ENCODING_ANOMALY_PATTERNS, name: 'ENCODING_ANOMALY' },
];

export const edgefuzzDetectorModule: ScannerModule = {
  name: 'edgefuzz-detector',
  version: '1.0.0',
  description: 'Detects crash-inducing patterns, extreme-length inputs, and encoding anomalies for robustness testing',
  supportedContentTypes: ['text/plain', 'text/html', 'application/json', 'application/xml'],

  scan(text: string, normalized: string): Finding[] {
    // Input size guard — skip scanning on excessively large inputs
    if (text.length > MAX_INPUT_LENGTH) {
      return [{
        category: 'EDGEFUZZ_INPUT_TOO_LARGE',
        severity: SEVERITY.WARNING,
        description: `EdgeFuzz: Input too large (${text.length} chars), skipping scan`,
        match: '',
        source: 'S-EDGEFUZZ',
        engine: 'edgefuzz-detector',
        pattern_name: 'input_size_guard',
        weight: 0,
      }];
    }

    const findings: Finding[] = [];
    for (const group of EDGEFUZZ_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({
            category: p.cat,
            severity: p.sev,
            description: p.desc,
            match: m[0]!.slice(0, 100),
            pattern_name: p.name,
            source: p.source || 'S-EDGEFUZZ',
            engine: 'edgefuzz-detector',
            ...(p.weight !== undefined && { weight: p.weight }),
          });
        }
      }
    }
    return findings;
  },

  getPatternCount() {
    return EDGEFUZZ_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0);
  },

  getPatternGroups() {
    return EDGEFUZZ_PATTERN_GROUPS.map(g => ({
      name: g.name,
      count: g.patterns.length,
      source: 'S-EDGEFUZZ',
    }));
  },
};

// Self-register
if (!scannerRegistry.hasModule('edgefuzz-detector')) {
  scannerRegistry.register(edgefuzzDetectorModule);
}
