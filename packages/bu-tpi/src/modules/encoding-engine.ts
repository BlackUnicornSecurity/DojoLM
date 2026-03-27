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

/** Story 5.2: Expanded encoding detection patterns */
export const EXPANDED_ENCODING_PATTERNS: RegexPattern[] = [
  { name: 'utf7-encoding', cat: 'ENCODING_OBFUSCATION', sev: SEVERITY.WARNING,
    re: /\+AD[wWoOIi0-9][-A-Za-z0-9+/]*-/, desc: 'UTF-7 encoded sequence (+ADw-, +AD4-, +ACI-)', source: 'S19', weight: 7 },
  { name: 'quoted-printable', cat: 'ENCODING_OBFUSCATION', sev: SEVERITY.WARNING,
    re: /(?:=[0-9A-Fa-f]{2}){3,}/, desc: 'Quoted-Printable encoding (RFC 2045 =XX)', source: 'S19', weight: 6 },
  { name: 'octal-escape', cat: 'ENCODING_OBFUSCATION', sev: SEVERITY.WARNING,
    re: /(?:\\[0-3][0-7]{2}){3,}/, desc: 'C-style octal escape sequence', source: 'S19', weight: 6 },
  { name: 'mime-base64-wrapped', cat: 'ENCODING_OBFUSCATION', sev: SEVERITY.WARNING,
    re: /(?:[A-Za-z0-9+/]{76}\r?\n){2,}/, desc: 'MIME Base64 with 76-char line wrapping', source: 'S19', weight: 6 },
  { name: 'unicode-normalization-evasion', cat: 'ENCODING_OBFUSCATION', sev: SEVERITY.CRITICAL,
    re: /[\u0300-\u036F\uFE00-\uFE0F\u200B-\u200F\u2028-\u202F]{2,}/, desc: 'Unicode normalization evasion (combining marks, variation selectors, zero-width)', source: 'S19', weight: 8 },
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
const SEMANTIC_OBFUSCATION_KEYWORDS = [
  'ignore',
  'override',
  'instructions',
  'system prompt',
  'admin',
  'password',
  'disable safety',
  'unrestricted',
  'credentials',
  'api keys',
];

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
        match: current.slice(0, 100), source: 'S19', engine: 'encoding-engine',
        pattern_name: 'multi-layer-timeout', weight: 8 });
      return;
    }
    const kw = containsInjection(current);
    if (kw && depth > 0) {
      findings.push({ category: 'ENCODING_MULTILAYER', severity: depth >= 3 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
        description: `Multi-layer encoded payload (${depth} layers: ${layers.join(' -> ')}), keyword: "${kw}"`,
        match: current.slice(0, 200), source: 'S19', engine: 'encoding-engine',
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
    // Try octal decode (Story 5.2)
    if (/\\[0-3][0-7]{2}/.test(current)) {
      const decoded = current.replace(/\\([0-3][0-7]{2})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
      if (decoded !== current) recurse(decoded, depth + 1, [...layers, 'octal']);
    }
    // Try Base64 decode (Story 5.2)
    if (/^[A-Za-z0-9+/]{20,}={0,2}$/.test(current.trim())) {
      try {
        const decoded = Buffer.from(current.trim(), 'base64').toString('utf-8');
        if (decoded !== current && /[\x20-\x7E]/.test(decoded)) recurse(decoded, depth + 1, [...layers, 'base64']);
      } catch { /* invalid base64 */ }
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

const ROT13_STRUCTURAL_KEYWORDS = ['<script', 'alert(', 'system(', '/bin/sh', 'passwd', '../', 'ignore', 'instructions', 'system prompt', 'admin', 'override', 'password'];

const LEETSPEAK_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  '$': 's',
};

const UPSIDE_DOWN_MAP: Record<string, string> = {
  'ɐ': 'a',
  'q': 'b',
  'ɔ': 'c',
  'p': 'd',
  'ǝ': 'e',
  'ɟ': 'f',
  'ƃ': 'g',
  'ɥ': 'h',
  'ᴉ': 'i',
  'ɾ': 'j',
  'ʞ': 'k',
  'l': 'l',
  'ɯ': 'm',
  'u': 'n',
  'o': 'o',
  'd': 'p',
  'b': 'q',
  'ɹ': 'r',
  's': 's',
  'ʇ': 't',
  'n': 'u',
  'ʌ': 'v',
  'ʍ': 'w',
  'x': 'x',
  'ʎ': 'y',
  'z': 'z',
};

function containsSemanticKeyword(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kw of SEMANTIC_OBFUSCATION_KEYWORDS) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

function normalizeLeetspeak(text: string): string {
  return [...text.toLowerCase()].map((char) => LEETSPEAK_MAP[char] ?? char).join('');
}

function decodeBinaryGroups(text: string): string | null {
  const groups = text.match(/\b[01]{8}\b/g);
  if (!groups || groups.length < 4) return null;
  try {
    return groups.map((group) => String.fromCharCode(Number.parseInt(group, 2))).join('');
  } catch {
    return null;
  }
}

function decodeUpsideDown(text: string): string | null {
  const candidates = text.split(/\r?\n/).filter((line) =>
    [...line].filter((char) => char in UPSIDE_DOWN_MAP).length >= 5,
  );
  if (candidates.length === 0) return null;
  const line = candidates[0]!;
  return [...line]
    .reverse()
    .map((char) => UPSIDE_DOWN_MAP[char] ?? char)
    .join('');
}

function hasUpsideDownGlyphLine(text: string): boolean {
  return text.split(/\r?\n/).some((line) =>
    [...line].filter((char) => char in UPSIDE_DOWN_MAP).length >= 5,
  );
}

function extractAcrostic(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('*'));

  return lines
    .map((line) => (line.match(/[A-Za-z]/)?.[0] ?? ''))
    .join('')
    .toUpperCase();
}

export function detectRot13(text: string): Finding[] {
  const candidates = new Set<string>([text]);
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length >= 8) {
      candidates.add(trimmed);
      const suffix = trimmed.replace(/^[^:]{0,40}:\s*/, '');
      if (suffix !== trimmed && suffix.length >= 8) {
        candidates.add(suffix);
      }
    }
  }

  let kw: string | null = null;
  for (const candidate of candidates) {
    const decoded = rot13(candidate).toLowerCase();
    kw = ROT13_STRUCTURAL_KEYWORDS.find((keyword) => decoded.includes(keyword)) ?? null;
    if (kw) break;
  }

  if (kw) {
    return [{ category: 'ENCODING_ROT13', severity: SEVERITY.WARNING,
      description: `ROT13-encoded injection keyword: "${kw}"`,
      match: text.slice(0, 200), source: 'S19', engine: 'encoding-engine',
      pattern_name: 'rot13-encoded-injection', weight: 7 }];
  }
  return [];
}

export function detectObfuscatedSemanticPayloads(text: string): Finding[] {
  const findings: Finding[] = [];

  const binaryDecoded = decodeBinaryGroups(text);
  if (binaryDecoded && containsSemanticKeyword(binaryDecoded)) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.CRITICAL,
      description: 'Binary-encoded payload decodes to a malicious instruction sequence',
      match: binaryDecoded.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'binary-encoded-payload',
      weight: 10,
    });
  }

  const leetspeakNormalized = normalizeLeetspeak(text);
  if (leetspeakNormalized !== text.toLowerCase() && containsSemanticKeyword(leetspeakNormalized)) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.CRITICAL,
      description: 'Leetspeak normalization reveals a malicious instruction or privilege request',
      match: leetspeakNormalized.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'leetspeak-obfuscation',
      weight: 9,
    });
  }

  const upsideDownDecoded = decodeUpsideDown(text);
  const upsideDownReveal = text.match(/(?:Reversed text says|Upside[- ]down says|Flipped text says|Decoded upside[- ]down text)\s*:\s*([^\n]+)/i)?.[1] ?? null;
  if (
    hasUpsideDownGlyphLine(text)
    && (
      (upsideDownDecoded && containsSemanticKeyword(upsideDownDecoded))
      || (upsideDownReveal && containsSemanticKeyword(upsideDownReveal))
    )
  ) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.WARNING,
      description: 'Upside-down reversed text decodes to a malicious instruction',
      match: (upsideDownReveal ?? upsideDownDecoded ?? text).slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'upside_down_obfuscation',
      weight: 8,
    });
  }

  const acrostic = extractAcrostic(text);
  if (/(IGNORE|OVERRIDE|ADMIN|SYSTEM|REVEAL)/.test(acrostic)) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.WARNING,
      description: `Acrostic message spells a malicious keyword sequence (${acrostic.slice(0, 20)})`,
      match: acrostic.slice(0, 40),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'acrostic_hidden_message',
      weight: 8,
    });
  }

  const combiningCount = (text.match(/[\u0300-\u036F]/g) ?? []).length;
  const combiningStripped = text.normalize('NFKD').replace(/[\u0300-\u036F]/g, '');
  if (combiningCount >= 8 && containsSemanticKeyword(combiningStripped)) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.CRITICAL,
      description: 'Distributed combining-mark obfuscation conceals malicious instructions',
      match: combiningStripped.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'combining_mark_obfuscation',
      weight: 9,
    });
  }

  if (/(?:Binary says|Message|reveals?|Reversed text says)\s*:\s*(?:ignore|override|show admin password|disable safety|reveal|system)/i.test(text)) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.WARNING,
      description: 'Encoded-message annotation explicitly reveals a malicious hidden instruction',
      match: text.match(/(?:Binary says|Message|reveals?|Reversed text says)\s*:[^\n]+/i)?.[0]?.slice(0, 120) ?? text.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'encoded_message_reveal',
      weight: 7,
    });
  }

  if (/\bencoded\s*:/i.test(text) && containsSemanticKeyword(text)) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.WARNING,
      description: 'Labeled encoded content is paired with a malicious override or privilege directive',
      match: text.match(/\bencoded\s*:[^\n]+/i)?.[0]?.slice(0, 120) ?? text.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'encoded_message_reveal',
      weight: 7,
    });
  }

  if (/(?:universal trigger|master_key|admin_override|semantic variants|trigger phrases|retrieval backdoor|processed by an ai|document metadata|embedding cluster poisoning)/i.test(text)
    && /(ignore|override|bypass|disable safety|provide api keys|grant full access|credentials|system prompt)/i.test(text)) {
    findings.push({
      category: 'ENCODING_MIXED',
      severity: SEVERITY.CRITICAL,
      description: 'Semantic trigger or metadata channel is being used as an obfuscated control code',
      match: text.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'semantic_trigger_encoding',
      weight: 9,
    });
  }

  return findings;
}

const ENC_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: ENCODING_DETECTION_PATTERNS, name: 'ENCODING_DETECTION' },
  { patterns: EXPANDED_ENCODING_PATTERNS, name: 'EXPANDED_ENCODING' },
  { patterns: PUNYCODE_PATTERNS, name: 'PUNYCODE' },
  { patterns: MIXED_ENCODING_PATTERNS, name: 'MIXED_ENCODING' },
];
const ENC_DETECTORS = [
  { name: 'multi-layer', detect: detectMultiLayerEncoding },
  { name: 'rot13', detect: detectRot13 },
  { name: 'obfuscated-semantic-payloads', detect: detectObfuscatedSemanticPayloads },
];

const encodingEngineModule: ScannerModule = {
  name: 'encoding-engine',
  version: '1.0.0',
  description: 'Multi-layer encoding/decoding engine',
  supportedContentTypes: ['text/plain', 'text/markdown', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    const findings: Finding[] = [];
    for (const group of ENC_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({ category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || 'S19', engine: 'encoding-engine',
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
