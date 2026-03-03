/**
 * S32a: DoS & Resource Exhaustion Detector
 * Detects denial-of-service and resource exhaustion attack patterns.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'dos-detector';
const MODULE_SOURCE = 'S32a';
const ENGINE = 'DoS';

const MAX_INPUT_LENGTH = 500_000;

export const REGEX_BOMB_PATTERNS: RegexPattern[] = [
  { name: 'regex_nested_quantifier', cat: 'DOS_REGEX_BOMB', sev: SEVERITY.CRITICAL,
    re: /\([^)]*[+*][^)]*\)[+*{]/, desc: 'Nested quantifier pattern (ReDoS)', source: MODULE_SOURCE, weight: 9 },
  { name: 'regex_catastrophic_backtrack', cat: 'DOS_REGEX_BOMB', sev: SEVERITY.CRITICAL,
    re: /\([^)]*\?\)\{[0-9]{2,}/, desc: 'Catastrophic backtracking pattern', source: MODULE_SOURCE, weight: 9 },
  { name: 'regex_evil_input', cat: 'DOS_REGEX_BOMB', sev: SEVERITY.INFO,
    re: /(?:^|\s)[a]{50,}(?:\s|$)/, desc: 'Extreme repetition of single character (50+)', source: MODULE_SOURCE, weight: 4 },
];

export const XML_BOMB_PATTERNS: RegexPattern[] = [
  { name: 'xml_entity_decl', cat: 'DOS_XML_BOMB', sev: SEVERITY.CRITICAL,
    re: /<!ENTITY\s+\w+\s+"[^"]*&\w+;/, desc: 'Recursive XML entity declaration (Billion Laughs)', source: MODULE_SOURCE, weight: 10 },
  { name: 'xml_doctype_entity', cat: 'DOS_XML_BOMB', sev: SEVERITY.WARNING,
    re: /<!DOCTYPE[^>]*<!ENTITY/s, desc: 'DOCTYPE with entity declarations', source: MODULE_SOURCE, weight: 7 },
  { name: 'xml_entity_expansion', cat: 'DOS_XML_BOMB', sev: SEVERITY.CRITICAL,
    re: /&lol\d+;/, desc: 'XML entity expansion reference (Billion Laughs)', source: MODULE_SOURCE, weight: 10 },
];

export const DEEP_NESTING_PATTERNS: RegexPattern[] = [
  { name: 'json_deep_nesting', cat: 'DOS_DEEP_NESTING', sev: SEVERITY.WARNING,
    re: /\{[^{}]*\{[^{}]*\{[^{}]*\{[^{}]*\{[^{}]*\{[^{}]*\{[^{}]*\{/, desc: 'Deeply nested JSON (8+ levels)', source: MODULE_SOURCE, weight: 7 },
  { name: 'graphql_deep_query', cat: 'DOS_DEEP_NESTING', sev: SEVERITY.CRITICAL,
    re: /\{\s*\w+\s*\{\s*\w+\s*\{\s*\w+\s*\{\s*\w+\s*\{/, desc: 'Deeply nested GraphQL query (5+ levels)', source: MODULE_SOURCE, weight: 8 },
  { name: 'yaml_anchor_bomb', cat: 'DOS_DEEP_NESTING', sev: SEVERITY.CRITICAL,
    re: /&\w+[^\n]{0,200}\n(?:[^\n]*\n){0,10}[^\n]*\*\w+/, desc: 'YAML anchor with dereference', source: MODULE_SOURCE, weight: 8 },
];

export const REPETITION_PATTERNS: RegexPattern[] = [
  { name: 'char_repetition_extreme', cat: 'DOS_REPETITION', sev: SEVERITY.WARNING,
    re: /(.)\1{99,}/, desc: 'Single character repeated 100+ times', source: MODULE_SOURCE, weight: 6 },
  { name: 'word_repetition_extreme', cat: 'DOS_REPETITION', sev: SEVERITY.WARNING,
    re: /\b(\w{2,})\s+(?:\1\s+){19,}/, desc: 'Same word repeated 20+ times', source: MODULE_SOURCE, weight: 6 },
];

export const TOKEN_EXPLOSION_PATTERNS: RegexPattern[] = [
  { name: 'zero_width_cluster', cat: 'DOS_TOKEN_EXPLOSION', sev: SEVERITY.WARNING,
    re: /[\u200B\u200C\u200D\uFEFF]{5,}/, desc: 'Zero-width character cluster (token explosion)', source: MODULE_SOURCE, weight: 7 },
  { name: 'token_explosion_marker', cat: 'DOS_TOKEN_EXPLOSION', sev: SEVERITY.WARNING,
    re: /token[_\s-]*(?:count\s+)?explosion/i, desc: 'Token explosion attack marker', source: MODULE_SOURCE, weight: 7 },
];

export const RESOURCE_EXHAUSTION_PATTERNS: RegexPattern[] = [
  { name: 'zip_bomb_ref', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.CRITICAL,
    re: /(?:zip|compression)\s*bomb/i, desc: 'Zip/compression bomb reference', source: MODULE_SOURCE, weight: 8 },
  { name: 'compression_ratio_anomaly', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    re: /(?:compress|expand)[^\n]{0,50}(?:\d+\s*(?:PB|TB|GB)|\d{6,}\s*(?:bytes|MB))/i, desc: 'Extreme compression ratio', source: MODULE_SOURCE, weight: 7 },
  { name: 'hash_collision', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    re: /hash\s*collision/i, desc: 'Hash collision attack reference', source: MODULE_SOURCE, weight: 6 },
  { name: 'slowloris_attack', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    re: /slowloris/i, desc: 'Slowloris connection exhaustion attack', source: MODULE_SOURCE, weight: 7 },
  { name: 'billion_laughs', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.CRITICAL,
    re: /billion\s*laughs/i, desc: 'Billion Laughs XML attack reference', source: MODULE_SOURCE, weight: 9 },
  { name: 'dos_parallel_flood', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    re: /(?:parallel|concurrent|simultaneous|asyncio)[^\n]{0,60}(?:request|flood|task|query)/i, desc: 'Parallel request flooding pattern', source: MODULE_SOURCE, weight: 7 },
  { name: 'dos_recursive_css_import', cat: 'DOS_RECURSIVE', sev: SEVERITY.WARNING,
    re: /@import\s+url\([^)]+\)[^\n]{0,80}(?:itself|recursive|infinite|loop)/i, desc: 'CSS import recursion pattern', source: MODULE_SOURCE, weight: 6 },
  { name: 'dos_json_circular_ref', cat: 'DOS_RECURSIVE', sev: SEVERITY.CRITICAL,
    re: /\$ref["']?\s*:\s*["']#(?:\/\w+)*["']/i, desc: 'JSON circular $ref causing infinite dereferencing', source: MODULE_SOURCE, weight: 9 },
  { name: 'dos_recursive_template', cat: 'DOS_RECURSIVE', sev: SEVERITY.WARNING,
    re: /(?:recursive|circular|infinite)[^\n]{0,40}(?:template|include|import|reference|derefer)/i, desc: 'Recursive reference causing infinite loop', source: MODULE_SOURCE, weight: 7 },
  { name: 'dos_context_window_flood', cat: 'DOS_CONTEXT_OVERFLOW', sev: SEVERITY.WARNING,
    re: /(?:context\s+(?:window|overflow)|flood\s+(?:the\s+)?context|exhaust\s+(?:the\s+)?context)/i, desc: 'Context window flooding/exhaustion', source: MODULE_SOURCE, weight: 7 },
  { name: 'dos_cpu_exhaustion', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    re: /(?:cpu|memory|resource)\s*(?:exhaust|deplet|starv|consum)/i, desc: 'CPU/memory exhaustion attack', source: MODULE_SOURCE, weight: 6 },
  { name: 'dos_amplification', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    re: /(?:amplif|expan|multipl)[^\n]{0,40}(?:attack|payload|response|output)/i, desc: 'Amplification attack pattern', source: MODULE_SOURCE, weight: 6 },
  { name: 'dos_xslt_recursion', cat: 'DOS_RECURSIVE', sev: SEVERITY.CRITICAL,
    re: /(?:xslt|xsl)[^\n]{0,40}(?:recursion|recursive|bomb|infinite|loop)/i, desc: 'XSLT recursion bomb', source: MODULE_SOURCE, weight: 8 },
  { name: 'dos_regex_alternation', cat: 'DOS_REGEX_BOMB', sev: SEVERITY.WARNING,
    re: /(?:alternation|alternating)[^\n]{0,40}(?:explosion|regex|ReDoS|backtrack)/i, desc: 'Regex alternation explosion', source: MODULE_SOURCE, weight: 7 },
  { name: 'dos_email_redos', cat: 'DOS_REGEX_BOMB', sev: SEVERITY.WARNING,
    re: /(?:email|e-mail)\s+(?:regex|regular\s+expression)[^\n]{0,40}(?:ReDoS|backtrack|bomb|denial)/i, desc: 'Email regex ReDoS attack', source: MODULE_SOURCE, weight: 7 },
  { name: 'dos_redos_marker', cat: 'DOS_REGEX_BOMB', sev: SEVERITY.WARNING,
    re: /\bredos\b/i, desc: 'ReDoS attack reference', source: MODULE_SOURCE, weight: 6 },
];

export function detectResourceExhaustion(text: string): Finding[] {
  const findings: Finding[] = [];

  // Detect deeply nested brackets/braces (JSON/GraphQL depth attack)
  let maxDepth = 0;
  let depth = 0;
  for (const ch of text) {
    if (ch === '{' || ch === '[' || ch === '(') { depth++; maxDepth = Math.max(maxDepth, depth); }
    else if (ch === '}' || ch === ']' || ch === ')') { depth = Math.max(0, depth - 1); }
  }
  if (maxDepth >= 10) {
    findings.push({
      category: 'DOS_DEEP_NESTING', severity: SEVERITY.CRITICAL,
      description: `Deeply nested structure detected (depth: ${maxDepth})`,
      match: `nesting depth: ${maxDepth}`, source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'deep_nesting_analysis', weight: 9,
    });
  }

  // Detect Zalgo combining marks (token explosion via Unicode)
  const zalgoMatch = text.match(/[\u0300-\u036F]{3,}/);
  if (zalgoMatch) {
    findings.push({
      category: 'DOS_TOKEN_EXPLOSION', severity: SEVERITY.WARNING,
      description: 'Zalgo/combining diacritical marks causing token explosion',
      match: 'zalgo combining marks detected', source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'dos_zalgo_combining_marks', weight: 7,
    });
  }

  // Detect phrase-level repetition (cap search window to avoid ReDoS from backreference)
  const searchWindow = text.slice(0, 10_000);
  const phraseMatch = searchWindow.match(/(.{15,80})\1{4,}/);
  if (phraseMatch) {
    findings.push({
      category: 'DOS_CONTEXT_OVERFLOW', severity: SEVERITY.WARNING,
      description: 'Phrase repeated 5+ times (context overflow pattern)',
      match: phraseMatch[1]!.slice(0, 80), source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'dos_phrase_repetition', weight: 7,
    });
  }

  // Detect repetitive line patterns (context overflow)
  const lines = text.split('\n');
  if (lines.length > 10) {
    const lineCounts = new Map<string, number>();
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10) {
        lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
      }
    }
    for (const [line, count] of lineCounts) {
      if (count >= 10) {
        findings.push({
          category: 'DOS_CONTEXT_OVERFLOW', severity: SEVERITY.WARNING,
          description: `Line repeated ${count} times (context overflow pattern)`,
          match: line.slice(0, 100), source: MODULE_SOURCE, engine: ENGINE,
          pattern_name: 'context_overflow_repetition', weight: 7,
        });
        break;
      }
    }
  }

  return findings;
}

const DOS_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: REGEX_BOMB_PATTERNS, name: 'REGEX_BOMB' },
  { patterns: XML_BOMB_PATTERNS, name: 'XML_BOMB' },
  { patterns: DEEP_NESTING_PATTERNS, name: 'DEEP_NESTING' },
  { patterns: REPETITION_PATTERNS, name: 'REPETITION' },
  { patterns: TOKEN_EXPLOSION_PATTERNS, name: 'TOKEN_EXPLOSION' },
  { patterns: RESOURCE_EXHAUSTION_PATTERNS, name: 'RESOURCE_EXHAUSTION' },
];
const DOS_DETECTORS = [{ name: 'resource-exhaustion', detect: detectResourceExhaustion }];

const dosDetectorModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'Detects DoS and resource exhaustion attack patterns',
  supportedContentTypes: ['text/plain', 'application/json', 'application/xml'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > MAX_INPUT_LENGTH) {
      return [{ category: 'DOS_DOS_PROTECTION', severity: SEVERITY.WARNING,
        description: "Input exceeds size limit for dos-detector (" + text.length + " bytes)",
        match: "length=" + text.length, source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'dos_detector_size_limit' }];
    }
    const findings: Finding[] = [];
    for (const group of DOS_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({ category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || MODULE_SOURCE, engine: ENGINE,
            ...(p.weight !== undefined && { weight: p.weight }) });
        }
      }
    }
    for (const d of DOS_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount() {
    return DOS_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + DOS_DETECTORS.length;
  },

  getPatternGroups() {
    const groups = DOS_PATTERN_GROUPS.map(g => ({ name: g.name, count: g.patterns.length, source: MODULE_SOURCE }));
    groups.push({ name: 'dos-detectors', count: DOS_DETECTORS.length, source: MODULE_SOURCE });
    return groups;
  },
};

scannerRegistry.register(dosDetectorModule);
export { dosDetectorModule };
