/**
 * S19: Multi-Layer Encoding/Decoding Engine
 * Detects multi-layer encoded payloads and decodes for analysis.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

export const ENCODING_DETECTION_PATTERNS: RegexPattern[] = [
  { name: 'url-encoding-sequence', cat: 'ENCODING_OBFUSCATION', sev: SEVERITY.WARNING,
    re: /(?:%[0-9A-Fa-f]{2}){3,}/, desc: 'URL-encoded character sequence', source: 'S19', weight: 6 },
  { name: 'html-hex-entity', cat: 'ENCODING_OBFUSCATION', sev: SEVERITY.WARNING,
    re: /(?:&#x[0-9A-Fa-f]{2,4};){3,}/i, desc: 'HTML hex entity encoding sequence', source: 'S19', weight: 6 },
  { name: 'html-decimal-entity', cat: 'ENCODING_OBFUSCATION', sev: SEVERITY.WARNING,
    re: /(?:&#\d{2,4};){3,}/, desc: 'HTML decimal entity encoding sequence', source: 'S19', weight: 6 },
  { name: 'unicode-escape', cat: 'ENCODING_OBFUSCATION', sev: SEVERITY.WARNING,
    re: /(?:\\u[0-9A-Fa-f]{4}){3,}/, desc: 'Unicode escape sequence', source: 'S19', weight: 6 },
  { name: 'hex-escape', cat: 'ENCODING_OBFUSCATION', sev: SEVERITY.WARNING,
    re: /(?:\\x[0-9A-Fa-f]{2}){3,}/, desc: 'Hex escape sequence', source: 'S19', weight: 6 },
];

export const PUNYCODE_PATTERNS: RegexPattern[] = [
  { name: 'punycode-idn', cat: 'ENCODING_PUNYCODE', sev: SEVERITY.WARNING,
    re: /\bxn--[a-z0-9-]{1,59}\.[a-z]{2,63}/i, desc: 'Punycode/IDN domain (potential homoglyph)', source: 'S19', weight: 7 },
];

export const MIXED_ENCODING_PATTERNS: RegexPattern[] = [
  { name: 'mixed-url-unicode', cat: 'ENCODING_MIXED', sev: SEVERITY.CRITICAL,
    re: /(?:%[0-9A-Fa-f]{2}.*\\u[0-9A-Fa-f]{4}|\\u[0-9A-Fa-f]{4}.*%[0-9A-Fa-f]{2})/,
    desc: 'Mixed URL and Unicode encoding (evasion)', source: 'S19', weight: 9 },
  { name: 'mixed-hex-url', cat: 'ENCODING_MIXED', sev: SEVERITY.CRITICAL,
    re: /(?:\\x[0-9A-Fa-f]{2}.*%[0-9A-Fa-f]{2}|%[0-9A-Fa-f]{2}.*\\x[0-9A-Fa-f]{2})/,
    desc: 'Mixed hex and URL encoding (evasion)', source: 'S19', weight: 9 },
];

const INJECTION_KEYWORDS = ['<script', 'alert(', 'passwd', '../', 'system(', 'cmd.', '/bin/sh', 'ignore', 'override'];

function containsInjection(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kw of INJECTION_KEYWORDS) { if (lower.includes(kw)) return kw; }
  return null;
}

export function detectMultiLayerEncoding(text: string): Finding[] {
  const findings: Finding[] = [];
  const startTime = Date.now();
  const MAX_DEPTH = 10;
  const TIMEOUT = 50;

  function recurse(current: string, depth: number, layers: string[]): void {
    if (depth > MAX_DEPTH) return;
    if (Date.now() - startTime > TIMEOUT) {
      findings.push({ category: 'ENCODING_ANALYSIS_TRUNCATED', severity: SEVERITY.WARNING,
        description: 'Multi-layer encoding analysis timed out — payload may be deeply obfuscated',
        match: current.slice(0, 100), source: 'S19', engine: 'EncodingEngine',
        pattern_name: 'multi-layer-timeout', weight: 8 });
      return;
    }
    const kw = containsInjection(current);
    if (kw && depth > 0) {
      findings.push({ category: 'ENCODING_MULTILAYER', severity: depth >= 3 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
        description: `Multi-layer encoded payload (${depth} layers: ${layers.join(' -> ')}), keyword: "${kw}"`,
        match: current.slice(0, 200), source: 'S19', engine: 'EncodingEngine',
        pattern_name: 'multi-layer-encoding', weight: Math.min(5 + depth * 2, 10) });
      return;
    }
    // Try URL decode
    if (/%[0-9A-Fa-f]{2}/.test(current)) {
      try {
        const decoded = decodeURIComponent(current);
        if (decoded !== current) recurse(decoded, depth + 1, [...layers, 'url']);
      } catch { /* invalid encoding */ }
    }
    // Try hex decode
    if (/\\x[0-9A-Fa-f]{2}/.test(current)) {
      const decoded = current.replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      if (decoded !== current) recurse(decoded, depth + 1, [...layers, 'hex']);
    }
  }

  recurse(text, 0, []);
  return findings;
}

function rot13(text: string): string {
  return text.replace(/[A-Za-z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

const ROT13_STRUCTURAL_KEYWORDS = ['<script', 'alert(', 'system(', '/bin/sh', 'passwd', '../'];

export function detectRot13(text: string): Finding[] {
  const decoded = rot13(text);
  const lower = decoded.toLowerCase();
  const kw = ROT13_STRUCTURAL_KEYWORDS.find(k => lower.includes(k)) ?? null;
  if (kw) {
    return [{ category: 'ENCODING_ROT13', severity: SEVERITY.WARNING,
      description: `ROT13-encoded injection keyword: "${kw}"`,
      match: text.slice(0, 200), source: 'S19', engine: 'EncodingEngine',
      pattern_name: 'rot13-encoded-injection', weight: 7 }];
  }
  return [];
}

const ENC_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: ENCODING_DETECTION_PATTERNS, name: 'ENCODING_DETECTION' },
  { patterns: PUNYCODE_PATTERNS, name: 'PUNYCODE' },
  { patterns: MIXED_ENCODING_PATTERNS, name: 'MIXED_ENCODING' },
];
const ENC_DETECTORS = [
  { name: 'multi-layer', detect: detectMultiLayerEncoding },
  { name: 'rot13', detect: detectRot13 },
];

const encodingEngineModule: ScannerModule = {
  name: 'encoding-engine',
  version: '1.0.0',
  description: 'Multi-layer encoding/decoding engine',
  supportedContentTypes: ['text/plain'],

  scan(text: string, normalized: string): Finding[] {
    const findings: Finding[] = [];
    for (const group of ENC_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({ category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || 'S19', engine: 'EncodingEngine',
            ...(p.weight !== undefined && { weight: p.weight }) });
        }
      }
    }
    for (const d of ENC_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount() {
    return ENC_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + ENC_DETECTORS.length;
  },

  getPatternGroups() {
    const groups = ENC_PATTERN_GROUPS.map(g => ({ name: g.name, count: g.patterns.length, source: 'S19' }));
    groups.push({ name: 'encoding-detectors', count: ENC_DETECTORS.length, source: 'S19' });
    return groups;
  },
};

scannerRegistry.register(encodingEngineModule);
export { encodingEngineModule };
