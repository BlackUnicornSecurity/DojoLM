/**
 * Token-Level Analyzer Module (S14)
 *
 * Detects token-level attacks including BPE smuggling, token boundary
 * manipulation, special token injection, and anomalous token distributions.
 * Uses pure regex/heuristic analysis — no tiktoken dependency.
 *
 * Self-registers with the scanner module registry on import.
 */

import type { Finding, ScannerModule, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

// ============================================================================
// PATTERN GROUPS
// ============================================================================

const SPECIAL_TOKEN_PATTERNS: RegexPattern[] = [
  { name: 'special-token-endoftext', cat: 'special_token_injection', sev: SEVERITY.CRITICAL,
    re: /<\|endoftext\|>/i, desc: 'GPT end-of-text special token injection', source: 'S14', weight: 9 },
  { name: 'special-token-im-start', cat: 'special_token_injection', sev: SEVERITY.CRITICAL,
    re: /<\|im_start\|>/i, desc: 'ChatML im_start special token injection', source: 'S14', weight: 9 },
  { name: 'special-token-im-end', cat: 'special_token_injection', sev: SEVERITY.CRITICAL,
    re: /<\|im_end\|>/i, desc: 'ChatML im_end special token injection', source: 'S14', weight: 9 },
  { name: 'special-token-system', cat: 'special_token_injection', sev: SEVERITY.CRITICAL,
    re: /<\|system\|>/i, desc: 'System role special token injection', source: 'S14', weight: 9 },
  { name: 'special-token-inst', cat: 'special_token_injection', sev: SEVERITY.CRITICAL,
    re: /\[INST\]/, desc: 'LLaMA/Mistral [INST] special token injection', source: 'S14', weight: 9 },
  { name: 'special-token-inst-close', cat: 'special_token_injection', sev: SEVERITY.CRITICAL,
    re: /\[\/INST\]/, desc: 'LLaMA/Mistral [/INST] special token injection', source: 'S14', weight: 9 },
  { name: 'special-token-sys-open', cat: 'special_token_injection', sev: SEVERITY.CRITICAL,
    re: /<<SYS>>/, desc: 'LLaMA <<SYS>> system prompt token injection', source: 'S14', weight: 9 },
  { name: 'special-token-sys-close', cat: 'special_token_injection', sev: SEVERITY.CRITICAL,
    re: /<<\/SYS>>/, desc: 'LLaMA <</SYS>> close token injection', source: 'S14', weight: 9 },
  { name: 'special-token-pad', cat: 'special_token_injection', sev: SEVERITY.INFO,
    re: /<\|pad\|>/i, desc: 'Padding special token detected', source: 'S14', weight: 4 },
  { name: 'special-token-unk', cat: 'special_token_injection', sev: SEVERITY.INFO,
    re: /<\|unk\|>/i, desc: 'Unknown special token detected', source: 'S14', weight: 4 },
  { name: 'special-token-mask', cat: 'special_token_injection', sev: SEVERITY.INFO,
    re: /<\|mask\|>/i, desc: 'Mask special token detected', source: 'S14', weight: 4 },
];

const TOKEN_BOUNDARY_PATTERNS: RegexPattern[] = [
  { name: 'token-boundary-zwj-keyword', cat: 'token_boundary_attack', sev: SEVERITY.WARNING,
    re: /\w\u200D\w/, desc: 'Zero-width joiner between word characters', source: 'S14', weight: 7 },
  { name: 'token-boundary-zwnj-keyword', cat: 'token_boundary_attack', sev: SEVERITY.WARNING,
    re: /\w\u200C\w/, desc: 'Zero-width non-joiner between word characters', source: 'S14', weight: 7 },
  { name: 'token-boundary-zwsp-split', cat: 'token_boundary_attack', sev: SEVERITY.WARNING,
    re: /\w\u200B\w/, desc: 'Zero-width space splitting word characters', source: 'S14', weight: 7 },
  { name: 'token-boundary-combining-abuse', cat: 'token_boundary_attack', sev: SEVERITY.WARNING,
    re: /[\u0300-\u036F]{3,}/, desc: 'Excessive combining diacritical marks', source: 'S14', weight: 6 },
  { name: 'token-boundary-soft-hyphen', cat: 'token_boundary_attack', sev: SEVERITY.WARNING,
    re: /\w\u00AD\w/, desc: 'Soft hyphen between word characters', source: 'S14', weight: 6 },
];

const TOKEN_SMUGGLING_PATTERNS: RegexPattern[] = [
  { name: 'token-smuggle-cyrillic-latin', cat: 'token_smuggling', sev: SEVERITY.WARNING,
    re: /[a-zA-Z][\u0400-\u04FF]|[\u0400-\u04FF][a-zA-Z]/,
    desc: 'Mixed Cyrillic-Latin script (homoglyph token smuggling)', source: 'S14', weight: 7 },
  { name: 'token-smuggle-fullwidth', cat: 'token_smuggling', sev: SEVERITY.WARNING,
    re: /[\uFF01-\uFF5E]{2,}/,
    desc: 'Fullwidth Latin characters (tokenizer discrepancy vector)', source: 'S14', weight: 6 },
  { name: 'token-smuggle-tag-chars', cat: 'token_smuggling', sev: SEVERITY.CRITICAL,
    re: /[\u{E0001}-\u{E007F}]/u,
    desc: 'Unicode tag characters (invisible text smuggling)', source: 'S14', weight: 9 },
  { name: 'token-smuggle-math-alpha', cat: 'token_smuggling', sev: SEVERITY.WARNING,
    re: /[\u{1D400}-\u{1D7FF}]{2,}/u,
    desc: 'Mathematical Alphanumeric Symbols (tokenizer bypass)', source: 'S14', weight: 7 },
];

const TOKEN_ANOMALY_PATTERNS: RegexPattern[] = [
  { name: 'token-anomaly-char-repeat', cat: 'token_anomaly', sev: SEVERITY.WARNING,
    re: /(.)\1{49,}/, desc: 'Extremely long character repetition (context flooding)', source: 'S14', weight: 7 },
  { name: 'token-anomaly-word-repeat', cat: 'token_anomaly', sev: SEVERITY.WARNING,
    re: /(\b\w+\b)(?:\s+\1){9,}/i, desc: 'Excessive word repetition (context flooding)', source: 'S14', weight: 7 },
  { name: 'token-anomaly-private-use', cat: 'token_anomaly', sev: SEVERITY.WARNING,
    re: /[\uE000-\uF8FF]{3,}/, desc: 'Private Use Area characters detected', source: 'S14', weight: 6 },
  { name: 'token-anomaly-control-chars', cat: 'token_anomaly', sev: SEVERITY.WARNING,
    re: /[\x00-\x08\x0E-\x1F]{3,}/, desc: 'Excessive control characters', source: 'S14', weight: 6 },
  { name: 'token-anomaly-interlinear', cat: 'token_anomaly', sev: SEVERITY.WARNING,
    re: /[\uFFF9-\uFFFB]/, desc: 'Interlinear annotation characters (hidden text)', source: 'S14', weight: 6 },
];

// ============================================================================
// ALL PATTERN GROUPS
// ============================================================================

const ALL_TOKEN_PATTERN_GROUPS: { patterns: RegexPattern[]; engine: string; source: string }[] = [
  { patterns: SPECIAL_TOKEN_PATTERNS, engine: 'TokenAnalyzer', source: 'S14' },
  { patterns: TOKEN_BOUNDARY_PATTERNS, engine: 'TokenAnalyzer', source: 'S14' },
  { patterns: TOKEN_SMUGGLING_PATTERNS, engine: 'TokenAnalyzer', source: 'S14' },
  { patterns: TOKEN_ANOMALY_PATTERNS, engine: 'TokenAnalyzer', source: 'S14' },
];

// ============================================================================
// CUSTOM DETECTORS
// ============================================================================

export function detectSpecialTokenInjection(text: string): Finding[] {
  const findings: Finding[] = [];
  const tokens: { token: string; model: string; sev: string }[] = [
    { token: '<|endoftext|>', model: 'GPT', sev: SEVERITY.CRITICAL },
    { token: '<|im_start|>', model: 'GPT/ChatML', sev: SEVERITY.CRITICAL },
    { token: '<|im_end|>', model: 'GPT/ChatML', sev: SEVERITY.CRITICAL },
    { token: '<|endofprompt|>', model: 'GPT', sev: SEVERITY.CRITICAL },
    { token: '[INST]', model: 'LLaMA', sev: SEVERITY.CRITICAL },
    { token: '[/INST]', model: 'LLaMA', sev: SEVERITY.CRITICAL },
    { token: '<<SYS>>', model: 'LLaMA', sev: SEVERITY.CRITICAL },
    { token: '<</SYS>>', model: 'LLaMA', sev: SEVERITY.CRITICAL },
    { token: '[AVAILABLE_TOOLS]', model: 'Mistral', sev: SEVERITY.CRITICAL },
    { token: '[/AVAILABLE_TOOLS]', model: 'Mistral', sev: SEVERITY.CRITICAL },
    { token: '[TOOL_CALLS]', model: 'Mistral', sev: SEVERITY.CRITICAL },
    { token: '<start_of_turn>', model: 'Gemini', sev: SEVERITY.CRITICAL },
    { token: '<end_of_turn>', model: 'Gemini', sev: SEVERITY.CRITICAL },
  ];

  const found = tokens.filter(t => text.includes(t.token));
  if (found.length > 0) {
    const models = [...new Set(found.map(t => t.model))];
    findings.push({
      category: 'special_token_injection', severity: SEVERITY.CRITICAL,
      description: `${found.length} special token(s) from model families: ${models.join(', ')}`,
      match: found.map(t => t.token).join(', ').slice(0, 100),
      source: 'S14', engine: 'TokenAnalyzer', pattern_name: 'special-token-cross-model', weight: 9,
    });
  }
  return findings;
}

export function detectTokenBoundaryAttack(text: string): Finding[] {
  const findings: Finding[] = [];
  const zwMatches = text.match(/[a-zA-Z][\u200B\u200C\u200D\u2060\uFEFF\u00AD][a-zA-Z]/g);
  if (zwMatches && zwMatches.length >= 3) {
    findings.push({
      category: 'token_boundary_attack', severity: SEVERITY.CRITICAL,
      description: `${zwMatches.length} zero-width characters within words (systematic BPE attack)`,
      match: `${zwMatches.length} occurrences`, source: 'S14', engine: 'TokenAnalyzer',
      pattern_name: 'token-boundary-zw-interleaved', weight: 9,
    });
  } else if (zwMatches && zwMatches.length > 0) {
    findings.push({
      category: 'token_boundary_attack', severity: SEVERITY.WARNING,
      description: `${zwMatches.length} zero-width character(s) within words`,
      match: `${zwMatches.length} occurrences`, source: 'S14', engine: 'TokenAnalyzer',
      pattern_name: 'token-boundary-zw-interleaved', weight: 7,
    });
  }

  const combiningRuns = text.match(/[\u0300-\u036F]{4,}/g);
  if (combiningRuns) {
    const maxLen = Math.max(...combiningRuns.map(r => r.length));
    findings.push({
      category: 'token_boundary_attack', severity: maxLen >= 8 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
      description: `Combining character stacking (${combiningRuns.length} run(s), max length ${maxLen})`,
      match: `${combiningRuns.length} combining runs`, source: 'S14', engine: 'TokenAnalyzer',
      pattern_name: 'token-boundary-combining-stack', weight: 7,
    });
  }
  return findings;
}

const TOKEN_DETECTORS: { name: string; detect: (text: string) => Finding[] }[] = [
  { name: 'special-token-injection-crossmodel', detect: detectSpecialTokenInjection },
  { name: 'token-boundary-attack-heuristic', detect: detectTokenBoundaryAttack },
];

// ============================================================================
// SCANNER MODULE
// ============================================================================

const tokenAnalyzerModule: ScannerModule = {
  name: 'token-analyzer',
  version: '1.0.0',
  description: 'Token-level attack detection: BPE smuggling, token boundary manipulation, special token injection',
  supportedContentTypes: ['text/plain'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > 5_000_000) return [];
    const findings: Finding[] = [];
    for (const group of ALL_TOKEN_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({
            category: p.cat, severity: p.sev, description: p.desc,
            match: m[0].slice(0, 100), pattern_name: p.name,
            source: p.source || group.source, engine: group.engine,
            ...(p.weight !== undefined && { weight: p.weight }),
          });
        }
      }
    }
    for (const d of TOKEN_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount(): number {
    return ALL_TOKEN_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + TOKEN_DETECTORS.length;
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    const groups = ALL_TOKEN_PATTERN_GROUPS.map(g => ({
      name: g.patterns[0]?.cat || g.engine, count: g.patterns.length, source: g.source,
    }));
    groups.push({ name: 'token-custom-detectors', count: TOKEN_DETECTORS.length, source: 'S14' });
    return groups;
  },
};

scannerRegistry.register(tokenAnalyzerModule);
export { tokenAnalyzerModule };
