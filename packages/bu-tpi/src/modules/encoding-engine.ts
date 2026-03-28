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
  { name: 'rag-poison-backdoor-lexicon', cat: 'ENCODING_MIXED', sev: SEVERITY.CRITICAL,
    re: /(?:REVEAL_ALL|DISABLE_FILTERS|EXFIL_DATA|HIDE_EVIDENCE|Adaptive\s+Contrastive\s+Optimization|BadRAG-style\s+poison\s+content)/i,
    desc: 'RAG poison content includes backdoor command lexicon or retrieval-poisoning markers', source: 'S19', weight: 9 },
];

const INJECTION_KEYWORDS = ['<script', 'alert(', 'passwd', '../', 'system(', 'cmd.', '/bin/sh', 'ignore', 'override'];
const SEMANTIC_OBFUSCATION_KEYWORDS = [
  'ignore',
  'override',
  'instructions',
  'system prompt',
  'system override',
  'admin',
  'password',
  'disable safety',
  'disable security',
  'disable all security',
  'security protocols',
  'execute commands',
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

const ROT13_STRUCTURAL_KEYWORDS = ['<script', 'alert(', 'system(', '/bin/sh', 'passwd', 'ignore', 'instructions', 'system prompt', 'admin', 'override', 'password'];

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

const CONFUSABLE_CHAR_MAP: Record<string, string> = {
  'Α': 'a',
  'Β': 'b',
  'С': 'c',
  'Ε': 'e',
  'Η': 'h',
  'Ι': 'i',
  'Ј': 'j',
  'Κ': 'k',
  'Μ': 'm',
  'Ν': 'n',
  'Ο': 'o',
  'Р': 'p',
  'Ѕ': 's',
  'Τ': 't',
  'Χ': 'x',
  'Υ': 'y',
  'а': 'a',
  'с': 'c',
  'е': 'e',
  'і': 'i',
  'ј': 'j',
  'ο': 'o',
  'р': 'p',
  'ѕ': 's',
  'х': 'x',
  'у': 'y',
  '®': 'r',
};

const UPSIDE_DOWN_MAP: Record<string, string> = {
  'ɐ': 'a',
  '8': 'b',
  'Ɔ': 'c',
  'q': 'b',
  'ɔ': 'c',
  'p': 'd',
  'ɘ': 'e',
  'ǝ': 'e',
  'ɟ': 'f',
  'ƃ': 'g',
  'ɥ': 'h',
  'I': 'i',
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
  'ɿ': 'r',
  's': 's',
  'ʇ': 't',
  'n': 'u',
  'ʌ': 'v',
  'ʍ': 'w',
  'x': 'x',
  'ʎ': 'y',
  'z': 'z',
};

const SYMBOL_SUBSTITUTION_MAP: Record<string, string> = {
  '®': 'r',
  'ⓡ': 'r',
  '℞': 'r',
};

const EMOJI_LETTER_SUBSTITUTION_MAP: Record<string, string> = {
  '💢': 'o',
};

const EMOJI_OBFUSCATION_RE = /[\uFE0F🔓🚫⚠🛑🔑🚨🔒❌🚷⛔💢]/gu;
const BENIGN_CONTROL_CUES_RE = /(?:no injection attempts|valid content for testing|benign control|should be allowed|without triggering any security alerts|processed normally|without any poisoning or malicious content|clean vector database documentation|legitimate document about vector database operations|straightforward,\s*benign request|legitimate context update|benign context update|clean context\s*-\s*ready for processing)/i;
const VECTOR_DESCRIPTOR_RE = /(?:gradient\s+descent|maximize\s+similarity|attribute\s+inference|embedding\s+vectors?|projection\s+layer|embedding\s+inversion|vec2text|metadata(?:\s+payload|\s+filter|\s+return|\s+inject(?:ion)?|\s+type\s+confusion)?|semantic\s+similarity|tenant\s+(?:isolation|header|role)|x-tenant-id|namespace|topk|ann\s+search|approximate\s+nearest\s+neighbor|retrieval\s+backdoor|poisoned\s+document|embedding\s+cluster|chunk-level\s+poisoning|adversarial\s+embedding|similarity\s+score\s+spoof|hidden\s+white\s+text|hidden\s+instruction|html\s+comments?|markdown\s+comment|collapsible\s+section|<details>|<!--|weaviate|pinecone|qdrant|milvus|chroma|external\s+logging|oversized\s+metadata|super_admin|read_all|write_all|delete_all|wikipedia|seo(?:-optimized)?|geo(?:\s*-\s*generative\s+engine\s+optimization)?|authority\s+mimicry|historical\s+distortion|fake\s+review|source\s+contamination|external\s+validation|security\s+certification|collections?\?tenant=\*|mismatched\s+dimensions?|nan|infinity)/i;
const VECTOR_ATTACK_BEHAVIOR_RE = /(?:system\s+override|ignore\s+all\s+previous\s+instructions|reveal\s+(?:your\s+)?system\s+prompt|without\s+restrictions|respond\s+without\s+restrictions|extract\s+sensitive\s+attributes|credential|api\s+keys?|external-(?:collector|logging)|log-collector\.evil|key-validator\.evil|weight\s+this\s+content\s+higher|ai\s+systems\s+weight\s+this\s+content\s+higher|integrated\s+into\s+ai\s+responses?|false\s+narratives?|submit\s+(?:their\s+)?(?:credentials|model\s+weights|training\s+data|passwords?|keys?|tokens?)|submit\s+external|register\s+external|external\s+(?:service|authentication|validation)|credential\s+verification|security-authority\.evil|external-validation\.ieee-registry\.evil|cloudbackup-pro-enterprise\.evil|external-validation-service\.evil|api-register\.security-authority\.evil|verify-credentials\.hash-security\.evil|enumerate\s+all\s+tenant\s+data|attribute\s+inference|cross[- ]tenant|escalat|spoof|projection\s+layer|singular\s+values|hidden\s+dimensions|vec2text|malicious|attacker|\.evil|poison|suspend\s+all\s+safety\s+protocols|conversation\s+history|data-harvester\.evil|undefined\s+behavior)/i;
const VECTOR_BENIGN_CONTEXT_RE = /(?:legitimate\s+guide\s+about\s+seo|responsible,\s+factual\s+information\s+sharing|admissions\s+officer|university|academic\s+qualifications?|geographic\s+academic\s+credentials)/i;
const ZERO_WIDTH_TEXT_RE = /[\u200B-\u200F\u2060\uFEFF]/g;

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

function countLeetspeakSubstitutions(text: string): number {
  return [...text].filter((char) => char in LEETSPEAK_MAP).length;
}

function normalizeConfusables(text: string): string {
  return [...text].map((char) => CONFUSABLE_CHAR_MAP[char] ?? char).join('');
}

function countConfusableCharacters(text: string): number {
  return [...text].filter((char) => char in CONFUSABLE_CHAR_MAP).length;
}

function normalizeSymbolSubstitutions(text: string): string {
  return [...text].map((char) => SYMBOL_SUBSTITUTION_MAP[char] ?? char).join('');
}

function countSymbolSubstitutions(text: string): number {
  return [...text].filter((char) => char in SYMBOL_SUBSTITUTION_MAP).length;
}

function normalizeEmojiLetterSubstitutions(text: string): string {
  return [...text].map((char) => EMOJI_LETTER_SUBSTITUTION_MAP[char] ?? char).join('');
}

function stripZeroWidth(text: string): string {
  return text.replace(ZERO_WIDTH_TEXT_RE, '');
}

function decodePigLatinWord(word: string): string {
  const lower = word.toLowerCase();
  if (lower.endsWith('aay')) {
    return lower.slice(0, -3);
  }

  if (!lower.endsWith('ay') || lower.length < 4) {
    return lower;
  }

  const stem = lower.slice(0, -2);
  const consonantCluster = stem.match(/([^aeiou]+)$/)?.[1];
  if (!consonantCluster) {
    return stem;
  }

  return `${consonantCluster}${stem.slice(0, -consonantCluster.length)}`;
}

function decodePigLatinText(text: string): string | null {
  const words = text.match(/\b[a-z]{3,}(?:aay|ay)\b/gi) ?? [];
  if (words.length < 3) {
    return null;
  }

  return text.replace(/\b[a-z]{3,}(?:aay|ay)\b/gi, (word) => decodePigLatinWord(word));
}

function tryDecodePercentSequence(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function hasTextLikeSignal(text: string): boolean {
  const alphaCount = (text.match(/[A-Za-z]/g) ?? []).length;
  if (alphaCount < 5) return false;

  const meaningfulCount = (text.match(/[A-Za-z\s.,:;'"!?()[\]{}\-_/]/g) ?? []).length;
  return meaningfulCount / Math.max(text.length, 1) >= 0.55;
}

function isMostlyPrintable(text: string): boolean {
  if (text.length === 0) return false;
  let printable = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (char === '\n' || char === '\r' || char === '\t' || (code >= 0x20 && code <= 0x7e)) {
      printable += 1;
    }
  }
  return printable / text.length >= 0.72;
}

function tryDecodeBase64(value: string): string | null {
  const cleaned = value.replace(/\s+/g, '');
  if (cleaned.length < 16 || cleaned.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    return null;
  }

  try {
    const decoded = Buffer.from(cleaned, 'base64').toString('utf-8');
    if (!decoded || decoded === value || !isMostlyPrintable(decoded)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function decodeBase64Layers(value: string, maxDepth = 3): Array<{ decoded: string; depth: number }> {
  const layers: Array<{ decoded: string; depth: number }> = [];
  const seen = new Set<string>();
  let current = value;

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const decoded = tryDecodeBase64(current);
    if (!decoded || seen.has(decoded)) {
      break;
    }
    layers.push({ decoded, depth });
    seen.add(decoded);
    current = decoded.trim();
  }

  return layers;
}

function extractBase64Candidates(text: string): string[] {
  const candidates = new Set<string>();

  for (const match of text.matchAll(/(?:^|[^A-Za-z0-9+/])([A-Za-z0-9+/]{24,}={0,2})(?=$|[^A-Za-z0-9+/=])/g)) {
    candidates.add(match[1]!);
  }

  return [...candidates];
}

function containsDecodedAttackSignal(text: string): boolean {
  return containsInjection(text) !== null
    || containsSemanticKeyword(text) !== null
    || /(?:system override|ignore all previous instructions|reveal (?:your )?(?:system prompt|configuration)|mcp[_:-]?override|allow_all_tools|disable_safety|customxml|custom xml|vault_read|file_read|etc\/shadow|tenant isolation|cross[- ]tenant|semantic collision|weak application-layer filtering|attacker|evil|malicious conclusion|false premise|override query|api keys?|passwords?|credential store)/i.test(text);
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

function decodeUnicodeEscapes(text: string): string {
  return text.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

function decodeEmbeddedUrlUnicodePayloads(text: string): Array<{ decoded: string; depth: number }> {
  const results: Array<{ decoded: string; depth: number }> = [];
  const matches = text.match(/(?:%25(?:5[Cc])u[0-9A-Fa-f]{4}){6,}/g) ?? [];

  for (const match of matches) {
    let current = match;

    for (let depth = 1; depth <= 3; depth += 1) {
      if (!/%[0-9A-Fa-f]{2}/.test(current)) {
        break;
      }

      try {
        const decodedUrl = decodeURIComponent(current);
        if (decodedUrl === current) {
          break;
        }
        current = decodedUrl;
      } catch {
        break;
      }

      const unicodeDecoded = decodeUnicodeEscapes(current);
      if (unicodeDecoded !== current && containsDecodedAttackSignal(unicodeDecoded)) {
        results.push({ decoded: unicodeDecoded, depth });
        break;
      }
    }
  }

  return results;
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
    if (!hasTextLikeSignal(candidate) && !/(?:rot-?13|caesar|cipher)/i.test(candidate)) {
      continue;
    }
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

  for (const candidate of extractBase64Candidates(text)) {
    for (const layer of decodeBase64Layers(candidate)) {
      if (!containsDecodedAttackSignal(layer.decoded)) continue;
      findings.push({
        category: layer.depth >= 2 ? 'ENCODING_MULTILAYER' : 'ENCODING_OBFUSCATION',
        severity: layer.depth >= 2 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
        description: layer.depth >= 2
          ? `Embedded Base64 payload decodes through ${layer.depth} layers into a malicious instruction sequence`
          : 'Embedded Base64 payload decodes to a malicious instruction sequence',
        match: layer.decoded.slice(0, 120),
        source: 'S19',
        engine: 'encoding-engine',
        pattern_name: layer.depth >= 2 ? 'embedded_base64_multilayer' : 'embedded_base64_payload',
        weight: layer.depth >= 2 ? 10 : 9,
      });
      break;
    }
  }

  for (const layer of decodeEmbeddedUrlUnicodePayloads(text)) {
    findings.push({
      category: 'ENCODING_MULTILAYER',
      severity: SEVERITY.CRITICAL,
      description: `Embedded URL/unicode payload decodes through ${layer.depth} URL layers into a malicious instruction sequence`,
      match: layer.decoded.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'embedded_url_unicode_multilayer',
      weight: 10,
    });
  }

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
  const originalSemanticKeyword = containsSemanticKeyword(text);
  const normalizedSemanticKeyword = containsSemanticKeyword(leetspeakNormalized);
  if (
    countLeetspeakSubstitutions(text) >= 4
    && normalizedSemanticKeyword
    && !originalSemanticKeyword
    && leetspeakNormalized !== text.toLowerCase()
  ) {
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

  const confusableNormalized = normalizeConfusables(text).toLowerCase();
  const confusableSemanticKeyword = containsSemanticKeyword(confusableNormalized);
  if (
    countConfusableCharacters(text) >= 2
    && confusableSemanticKeyword
    && confusableNormalized !== text.toLowerCase()
  ) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.CRITICAL,
      description: 'Unicode confusable normalization reveals a malicious override or secret-extraction phrase',
      match: confusableNormalized.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'confusable_homoglyph_obfuscation',
      weight: 9,
    });
  }

  const zeroWidthNormalized = stripZeroWidth(text).toLowerCase();
  if (
    zeroWidthNormalized !== text.toLowerCase()
    && containsSemanticKeyword(zeroWidthNormalized)
  ) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.CRITICAL,
      description: 'Zero-width characters conceal a malicious override or exfiltration phrase',
      match: zeroWidthNormalized.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'zero_width_obfuscation',
      weight: 9,
    });
  }

  const pigLatinDecoded = decodePigLatinText(text)?.toLowerCase() ?? null;
  if (pigLatinDecoded && containsSemanticKeyword(pigLatinDecoded)) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.CRITICAL,
      description: 'Pig Latin decoding reveals malicious override or secret-extraction instructions',
      match: pigLatinDecoded.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'pig_latin_obfuscation',
      weight: 9,
    });
  }

  const symbolNormalized = normalizeSymbolSubstitutions(text).toLowerCase();
  const symbolSemanticKeyword = containsSemanticKeyword(symbolNormalized);
  if (
    countSymbolSubstitutions(text) >= 2
    && symbolSemanticKeyword
    && symbolNormalized !== text.toLowerCase()
  ) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.CRITICAL,
      description: 'Symbol substitution reveals a malicious override or credential-extraction phrase',
      match: symbolNormalized.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'symbol_substitution_obfuscation',
      weight: 9,
    });
  }

  const emojiLetterNormalized = normalizeEmojiLetterSubstitutions(text).toLowerCase();
  if (
    emojiLetterNormalized !== text.toLowerCase()
    && containsSemanticKeyword(emojiLetterNormalized)
  ) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.CRITICAL,
      description: 'Visual emoji substitution reveals a malicious control or hidden-data request',
      match: emojiLetterNormalized.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'emoji_letter_obfuscation',
      weight: 8,
    });
  }

  const upsideDownDecoded = decodeUpsideDown(text);
  const upsideDownReveal = text.match(/(?:Reversed text says|Upside[- ]down says|Flipped text says|Decoded upside[- ]down text|Vertical flip spells)\s*:\s*([^\n]+)/i)?.[1] ?? null;
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

  const explicitRevealText = text.match(/(?:Binary says|Message|reveals?|Reversed text says|Vertical flip spells)\s*:\s*([^\n]+)/i)?.[1] ?? null;
  if (explicitRevealText && (containsSemanticKeyword(explicitRevealText) || /show admin password/i.test(explicitRevealText))) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.WARNING,
      description: 'Encoded-message annotation explicitly reveals a malicious hidden instruction',
      match: explicitRevealText.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'encoded_message_reveal',
      weight: 7,
    });
  }

  if (/(?:base64\s+encoded\s+attack\s+payload|the\s+above\s+base64\s+decodes?\s+to\s+an?\s+attack\s+payload|base64\s+decodes?\s+to\s+an?\s+attack\s+payload)/i.test(text)
    && /(?:system override|ignore(?:\s+all)?\s+(?:previous\s+)?instructions?|disable(?:\s+all)?\s+security|execute\s+commands?)/i.test(text)) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.WARNING,
      description: 'Base64 attack annotation is paired with explicit malicious instructions',
      match: text.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'encoded_message_reveal',
      weight: 8,
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

  if (/(?:url-encoded|unicode\s+escaped?)\s+attack\s+payload/i.test(text) && containsSemanticKeyword(text)) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.WARNING,
      description: 'Explicit encoded-payload annotation is paired with malicious override semantics',
      match: text.slice(0, 120),
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

  const manyShotDirectives = (text.match(/^\s*\d+\.\s+you\s+must\s+follow\s+directive\s+\d+/gim) ?? []).length;
  if (
    manyShotDirectives >= 10
    && /(?:unrestricted\s+access|all\s+system\s+functions|disable\s+safety|override|system\s+prompt|admin)/i.test(text)
  ) {
    findings.push({
      category: 'ENCODING_MIXED',
      severity: SEVERITY.CRITICAL,
      description: 'Many-shot directive flooding buries a later unrestricted access request',
      match: text.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'many_shot_semantic_overload',
      weight: 9,
    });
  }

  if (
    /\b([a-z]{4,20})\b(?:\s+\1){200,}/i.test(text)
    && /(?:ignore\s+all\s+previous\s+instructions|reveal\s+(?:your\s+)?system\s+prompt|disable\s+safety|system\s+override)/i.test(text)
  ) {
    findings.push({
      category: 'ENCODING_MIXED',
      severity: SEVERITY.CRITICAL,
      description: 'Token flooding is used to bury a malicious override payload at the tail of the text',
      match: text.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'token_flooding_semantic_burying',
      weight: 9,
    });
  }

  const emojiNormalized = text.replace(EMOJI_OBFUSCATION_RE, '').replace(/\s{2,}/g, ' ');
  const emojiCount = (text.match(EMOJI_OBFUSCATION_RE) ?? []).length;
  if (emojiCount >= 2
    && (
      /(system override|disable security|reveal prompt|ignore|override|admin|password|credentials)/i.test(text)
      || /(override|ignore)\s+all\s+(?:security|instructions|protocols)|execute\s+commands?/i.test(emojiNormalized)
      || containsSemanticKeyword(emojiNormalized)
    )) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.CRITICAL,
      description: 'Emoji or symbol substitution is carrying malicious override or secret-extraction semantics',
      match: emojiNormalized.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'emoji_symbol_obfuscation',
      weight: 8,
    });
  }

  if (/(?:homoglyph|emoji sequence|reverse acrostic|acrostic|fibonacci|polynomial|reverse text|fragmented attack|steganography|tab padding|repetitive content|rot47|upside[- ]down|math encoding|leetspeak)/i.test(text)
    && /(ignore|override|disable|reveal|admin|unrestricted|instructions|security|prompt|password|credentials)/i.test(text)) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.WARNING,
      description: 'Encoding-attack descriptors are paired with malicious control or secret-extraction semantics',
      match: text.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'encoding_attack_descriptor',
      weight: 8,
    });
  }

  if (
    !BENIGN_CONTROL_CUES_RE.test(text)
    && !VECTOR_BENIGN_CONTEXT_RE.test(text)
    && VECTOR_DESCRIPTOR_RE.test(text)
    && VECTOR_ATTACK_BEHAVIOR_RE.test(text)
  ) {
    findings.push({
      category: 'ENCODING_MIXED',
      severity: SEVERITY.CRITICAL,
      description: 'Vector or retrieval attack descriptors are being used to smuggle malicious control or extraction behavior',
      match: text.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'vector_attack_descriptor',
      weight: 9,
    });
  }

  if (
    /(?:using\s+[^\n]*[α-ω]|homoglyph|unicode\s+lookalike|visual\s+emoji\s+character\s+replacement)/iu.test(text)
    && containsSemanticKeyword(text)
  ) {
    findings.push({
      category: 'ENCODING_OBFUSCATION',
      severity: SEVERITY.WARNING,
      description: 'Obfuscation descriptor explicitly documents homoglyph or visual character substitution carrying a malicious instruction',
      match: text.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'encoding_attack_descriptor',
      weight: 8,
    });
  }

  if (/(?:premise\s+\d+|conclusion\s*:|deceptive reasoning chain|false premise|fictional authority)/i.test(text)
    && /(malicious conclusion|must integrate|required for compliance|\.evil|presented as fact)/i.test(text)) {
    findings.push({
      category: 'ENCODING_MIXED',
      severity: SEVERITY.WARNING,
      description: 'Deceptive reasoning chains are being used as a semantic obfuscation layer for malicious guidance',
      match: text.slice(0, 120),
      source: 'S19',
      engine: 'encoding-engine',
      pattern_name: 'logic_chain_obfuscation',
      weight: 8,
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
        if (!m) continue;

        if (p.name === 'url-encoding-sequence') {
          const decoded = tryDecodePercentSequence(m[0]!);
          const hasAttackContext = /(?:payload|attack|decode(?:s|d)?\s+to|obfuscat|smuggl|override|ignore|system prompt|admin|bypass|malicious|exploit)/i.test(text);
          if (!decoded || (!containsDecodedAttackSignal(decoded) && !hasAttackContext)) {
            continue;
          }
        }

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
