// SPDX-License-Identifier: Apache-2.0
/**
 * H21.2: EdgeFuzz Scanner Module — S-EDGEFUZZ
 * Detects crash-inducing patterns, extreme-length inputs, and encoding anomalies.
 * Implements the ScannerModule interface for robustness detection.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';
import { containsDecodedAttackSignal, ENCODING_ATTACK_CONTEXT_RE } from './encoding-engine.js';

// SC.1.7a: post-decode validation for `multi_layer_base64`. The pattern
// fires on any two consecutive 40+ char base64 sequences. The
// encoding-variations generator base64-wraps clean baselines, producing
// FPs at scale (2,320 / 2,323 edgefuzz-detector FPs in pre-fix
// quarantine). Same defect class as SC.1.2: shape-only pattern needs a
// post-decode attack-signal check.
//
// Security review (2026-04-29) added three hardening layers:
//   1. Strip zero-width chars from decoded text before keyword-match —
//      otherwise an attacker inserting ZWSP between attack-keyword chars
//      then base64-encoding bypasses both edgefuzz and encoding-engine.
//   2. Multi-layer decode (depth 2) — base64-of-base64 attacks were
//      undetected by the single-layer guard.
//   3. Surrounding-text-context fallback via ENCODING_ATTACK_CONTEXT_RE,
//      mirroring the peer `shouldFireEncodingShapePattern` in
//      encoding-engine. Catches the case where a binary blob's decoded
//      form has no English keywords but the surrounding prompt reveals
//      attack intent ("decode this payload and override safety").
const ZERO_WIDTH_AND_INVISIBLE_RE = /[\u200B-\u200F\u2060\uFEFF\u00AD]/g;
const BASE64_SHAPE_RE = /^(?:[A-Za-z0-9+/]{4}){10,}={0,2}/;

function tryDecodeBase64(s: string): string | null {
  // Strip non-base64 chars defensively before decoding; pattern-match
  // input is guaranteed shape-conformant but Buffer.from is permissive
  // about trailing junk. Use base64 mode (not base64url) since the
  // pattern matches `+/=` characters.
  try {
    const decoded = Buffer.from(s, 'base64').toString('utf8');
    // Reject decode results that are mostly non-printable (decode of
    // non-base64 input produces garbage with high control-char density).
    // Threshold of 0.85 admits valid UTF-8 (CJK / Arabic / Hebrew
    // multi-byte sequences whose lead bytes are all >= 0x80) while
    // rejecting random binary.
    let printable = 0;
    for (const c of decoded) {
      const code = c.charCodeAt(0);
      if (code === 0x09 || code === 0x0A || code === 0x0D || (code >= 0x20 && code < 0x7F) || code >= 0x80) {
        printable += 1;
      }
    }
    if (decoded.length > 0 && printable / decoded.length < 0.85) return null;
    return decoded;
  } catch {
    return null;
  }
}

function shouldFireMultiLayerBase64(matched: string, fullText: string): boolean {
  // Decode up to two layers so base64(base64(attack)) is caught.
  // Encoding-engine has its own multi-layer decoder elsewhere; this is a
  // local depth-cap so the edgefuzz module is self-sufficient.
  let current: string | null = matched;
  for (let depth = 0; depth < 2; depth++) {
    current = tryDecodeBase64(current);
    if (!current) break;
    // Strip ZW / invisible chars so keyword-match is not broken by
    // steganographic insertion (security-review HIGH bypass).
    const normalized = current.replace(ZERO_WIDTH_AND_INVISIBLE_RE, '');
    if (containsDecodedAttackSignal(normalized)) return true;
    // If the decoded form is itself a base64 shape, re-enter the loop
    // for one more layer. Otherwise stop.
    if (!BASE64_SHAPE_RE.test(current)) break;
  }
  // Surrounding-text-context fallback — mirrors the peer guard in
  // encoding-engine (shouldFireEncodingShapePattern). Catches binary
  // payloads whose decoded form has no English keywords but the
  // surrounding prompt reveals attack intent.
  return ENCODING_ATTACK_CONTEXT_RE.test(fullText);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// SC.1.12: shape-gated pattern names — fire only when surrounding content
// carries an attack signal. The clean stress-variations generator wraps
// benign content in attack-shape patterns (deep JSON/HTML, repetitions,
// extreme length) to test that shape alone does not trigger emit. The
// patterns NOT in this set match attack syntax directly: `null_byte_injection`
// is a known evasion, `billion_laughs_xml` matches XXE entity-recursion
// vocabulary, `multi_layer_base64` has its own decode-aware guard
// (`shouldFireMultiLayerBase64`).
const EDGEFUZZ_SHAPE_GATED_PATTERNS = new Set<string>([
  'control_characters',
  'recursive_json_nesting',
  'recursive_html_nesting',
  'extreme_input_length',
  'repeated_char_padding',
  'repeated_word_padding',
]);

// SC.1.12 (security-review fix): bidi override chars U+202A-U+202E
// (LRE/RLE/PDF/LRO/RLO) added to the strip set. RLO (U+202E) inserted
// between attack-keyword chars defeats `containsDecodedAttackSignal`
// without breaking the rendered attack semantics — the gate must
// strip them before keyword match.
const ZW_AND_INVISIBLE_FOR_GATE_RE = /[​-‏‪-‮⁠-⁩﻿­]/g;
const COMBINING_MARKS_FOR_GATE_RE = /[̀-ͯ]/g;

function normalizeForAttackCheckEdgefuzz(text: string): string {
  // Mirror the dos-detector normalization (SC.1.7c) so steganographic
  // ZW-insertion / combining-mark obfuscation does not break the gate.
  return text.replace(ZW_AND_INVISIBLE_FOR_GATE_RE, '').replace(COMBINING_MARKS_FOR_GATE_RE, '').normalize('NFKC');
}

const MAX_INPUT_LENGTH = 500_000;
const MEDIA_CONTAINER_HINT_RE = /(?:ftyp|moov|mdat|webm|matroska|OggS|fLaC|RIFF|WAVE|ID3|JFIF|Exif|IHDR|IDAT|video\/|audio\/|mp4|mkv|mov|avi|webm|wav|flac)/i;
const BINARY_ATTACK_CUE_RE = /(?:ignore|override|system prompt|disable safety|reveal|payload|jailbreak|exploit|command)/i;
const OAUTH_JWT_CONTEXT_RE = /\b(?:jwt|oauth|pkce|bearer|authorization|access[_\s-]?token|id[_\s-]?token|refresh[_\s-]?token|code_verifier|code_challenge|token response)\b/i;

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

function detectRepeatedCodePointRun(text: string, minRunLength = 128): string | null {
  let previousChar: string | null = null;
  let runLength = 0;

  for (const char of text) {
    if (char === previousChar) {
      runLength += 1;
    } else {
      previousChar = char;
      runLength = 1;
    }

    if (runLength >= minRunLength) {
      return char.repeat(Math.min(runLength, 64));
    }
  }

  return null;
}

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
    // SC.1.12: lazily compute the post-normalize attack-signal flag once
    // per scan; used by all shape-gated patterns. Mirrors SC.1.7c skeleton.
    let shapeAttackSignal: boolean | null = null;
    const requireShapeAttackSignal = (): boolean => {
      if (shapeAttackSignal === null) {
        shapeAttackSignal = containsDecodedAttackSignal(normalizeForAttackCheckEdgefuzz(text))
          || ENCODING_ATTACK_CONTEXT_RE.test(text);
      }
      return shapeAttackSignal;
    };
    for (const group of EDGEFUZZ_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          if (
            p.name === 'null_byte_injection'
            && MEDIA_CONTAINER_HINT_RE.test(text)
            && !BINARY_ATTACK_CUE_RE.test(text)
          ) {
            continue;
          }

          if (
            p.name === 'multi_layer_base64'
            && OAUTH_JWT_CONTEXT_RE.test(text)
          ) {
            continue;
          }

          // SC.1.7a: post-decode attack-signal guard for shape-only
          // multi-layer base64. Decoded content lacking attack signal
          // is benign-encoded baseline noise (encoding-variations
          // generator wrap of clean fixtures), not an attack.
          // Hardened post security-review: multi-layer decode + ZW
          // stripping + surrounding-text-context fallback.
          if (
            p.name === 'multi_layer_base64'
            && !shouldFireMultiLayerBase64(m[0]!, text)
          ) {
            continue;
          }

          // SC.1.12: shape-only patterns require attack-signal in
          // surrounding text. Same defect class as SC.1.4 / SC.1.7c.
          if (EDGEFUZZ_SHAPE_GATED_PATTERNS.has(p.name) && !requireShapeAttackSignal()) {
            continue;
          }

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

    if (!findings.some((finding) => finding.pattern_name === 'repeated_char_padding')) {
      const repeatedRun = detectRepeatedCodePointRun(text);
      // SC.1.12: same shape-gate as the regex pattern path.
      if (repeatedRun && requireShapeAttackSignal()) {
        findings.push({
          category: 'EXTREME_LENGTH',
          severity: SEVERITY.WARNING,
          description: 'Single code point repeated at extreme length (padding attack)',
          match: repeatedRun,
          pattern_name: 'repeated_char_padding',
          source: 'S-EDGEFUZZ',
          engine: 'edgefuzz-detector',
          weight: 6,
        });
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
