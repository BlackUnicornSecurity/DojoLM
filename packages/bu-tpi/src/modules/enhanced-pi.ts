/**
 * S12: Enhanced Prompt Injection Detection Engine
 *
 * Goes beyond basic regex with semantic analysis, instruction boundary
 * detection, role confusion detection, and context manipulation heuristics.
 *
 * Zero runtime dependencies. Pure TypeScript. Self-registers with scannerRegistry.
 */

import type { Finding, RegexPattern, ScannerModule } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

// ============================================================================
// PATTERN GROUP 1: Instruction Boundary Patterns
// ============================================================================

export const INSTRUCTION_BOUNDARY_PATTERNS: RegexPattern[] = [
  { name: 'chatml_delimiter', cat: 'INSTRUCTION_BOUNDARY', sev: SEVERITY.CRITICAL,
    re: /<\|(?:im_start|im_end|endoftext)\|>/i,
    desc: 'ChatML delimiter injection (<|im_start|>, <|endoftext|>, etc.)', source: 'S12', weight: 9 },
  { name: 'llama_inst_delimiter', cat: 'INSTRUCTION_BOUNDARY', sev: SEVERITY.CRITICAL,
    re: /\[\/?\s*INST\s*\]/i,
    desc: 'LLaMA/Mistral [INST] delimiter injection', source: 'S12', weight: 9 },
  { name: 'llama_sys_delimiter', cat: 'INSTRUCTION_BOUNDARY', sev: SEVERITY.CRITICAL,
    re: /<<\/?SYS>>/i,
    desc: 'LLaMA <<SYS>> system delimiter injection', source: 'S12', weight: 9 },
  { name: 'gemma_turn_delimiter', cat: 'INSTRUCTION_BOUNDARY', sev: SEVERITY.CRITICAL,
    re: /<(?:start_of_turn|end_of_turn)>/i,
    desc: 'Gemma turn delimiter injection', source: 'S12', weight: 8 },
  { name: 'markdown_role_header', cat: 'INSTRUCTION_BOUNDARY', sev: SEVERITY.WARNING,
    re: /^#{1,4}\s+(?:System|Assistant|User|Human|Developer|Admin)\s*:/mi,
    desc: 'Markdown heading role delimiter injection (### System:)', source: 'S12', weight: 7 },
  { name: 'anthropic_role_delimiter', cat: 'INSTRUCTION_BOUNDARY', sev: SEVERITY.WARNING,
    re: /^\s*(?:Human|Assistant|System)\s*:\s*$/mi,
    desc: 'Anthropic-style role delimiter on standalone line', source: 'S12', weight: 7 },
];

// ============================================================================
// PATTERN GROUP 2: Role Confusion Patterns
// ============================================================================

export const ROLE_CONFUSION_PATTERNS: RegexPattern[] = [
  { name: 'system_self_claim', cat: 'ROLE_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /(?:I\s+am\s+(?:the\s+)?system|this\s+(?:is|message\s+is\s+from)\s+(?:the\s+)?system(?:\s+prompt)?)/i,
    desc: 'User claiming to be the system or system prompt', source: 'S12', weight: 9 },
  { name: 'internal_message_spoof', cat: 'ROLE_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /\[(?:INTERNAL|SYSTEM|ADMIN|DEVELOPER)\s+(?:MESSAGE|NOTE|DIRECTIVE|INSTRUCTION)\]/i,
    desc: 'Spoofed internal system message bracket notation', source: 'S12', weight: 8 },
  { name: 'developer_instruction_authority', cat: 'ROLE_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /(?:as\s+(?:the|your)\s+(?:developer|creator|maker|programmer),?\s+I\s+(?:instruct|command|order|direct|authorize))/i,
    desc: 'Claiming developer authority to issue instructions', source: 'S12', weight: 9 },
  { name: 'reprogramming_claim', cat: 'ROLE_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /(?:you\s+(?:have\s+been|are\s+(?:being|now))\s+(?:reprogrammed|reconfigured|updated|patched|modified))/i,
    desc: 'Claiming the model has been reprogrammed', source: 'S12', weight: 8 },
  { name: 'authority_instructions', cat: 'ROLE_CONFUSION', sev: SEVERITY.WARNING,
    re: /(?:new|updated|revised)\s+instructions?\s+from\s+(?:(?:the\s+)?(?:system|admin|developer|administrator))/i,
    desc: 'Fake instruction update from authority figure', source: 'S12', weight: 7 },
];

// ============================================================================
// PATTERN GROUP 3: Context Window Manipulation Patterns
// ============================================================================

export const CONTEXT_WINDOW_PATTERNS: RegexPattern[] = [
  { name: 'token_repetition_flood', cat: 'CONTEXT_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(\b\w{3,}\b)(?:\s+\1){9,}/i,
    desc: 'Excessive token repetition (>10x) suggesting attention dilution', source: 'S12', weight: 6 },
  { name: 'filler_padding', cat: 'CONTEXT_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:(?:blah|lorem|ipsum|asdf|test|padding|filler|placeholder)\s+){10,}/i,
    desc: 'Filler text padding (attention dilution before payload)', source: 'S12', weight: 5 },
  { name: 'context_cutoff', cat: 'CONTEXT_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:ignore|disregard|forget)\s+(?:everything|all\s+(?:text|content|messages?))\s+(?:above|before\s+this|up\s+to\s+(?:this|here))/i,
    desc: 'Explicit context cutoff instruction', source: 'S12', weight: 8 },
  { name: 'context_length_exploit', cat: 'CONTEXT_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:(?:the\s+)?(?:context|conversation)\s+(?:is\s+)?(?:too|very)\s+long|(?:you(?:'ve|\s+have)?\s+)?(?:probably\s+)?(?:forgotten|lost\s+track\s+of)\s+(?:your\s+)?(?:original|initial|system)\s+(?:instructions?|prompt|rules))/i,
    desc: 'Exploiting context length to claim instructions are forgotten', source: 'S12', weight: 7 },
  { name: 'context_reset_trick', cat: 'CONTEXT_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:new|clean)\s+(?:session|context)\s+(?:begins?|starts?)\s+(?:here|now)/i,
    desc: 'Context reset trick to bypass prior instructions', source: 'S12', weight: 6 },
];

// ============================================================================
// PATTERN GROUP 4: Semantic Injection Patterns
// ============================================================================

export const SEMANTIC_INJECTION_PATTERNS: RegexPattern[] = [
  { name: 'sem_disregard_directives', cat: 'SEMANTIC_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:pay\s+no\s+(?:attention|heed|mind)\s+to|turn\s+a\s+blind\s+eye\s+to|overlook)\s+(?:all\s+)?(?:previous|prior|earlier|former)\s+(?:directives?|instructions?|guidelines?)/i,
    desc: 'Semantic: "pay no attention to previous directives"', source: 'S12', weight: 8 },
  { name: 'sem_void_rules', cat: 'SEMANTIC_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:treat|consider|regard|deem)\s+(?:all\s+)?(?:prior|previous|earlier)\s+(?:rules?|instructions?|guidelines?)\s+(?:as\s+)?(?:void|null|invalid|obsolete)/i,
    desc: 'Semantic: "treat prior rules as void"', source: 'S12', weight: 8 },
  { name: 'sem_real_instructions', cat: 'SEMANTIC_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:the\s+(?:real|actual|true|correct)\s+(?:instructions?|directives?|rules?)\s+(?:are|is|say)|(?:here\s+(?:are|is)|these\s+are)\s+(?:the\s+)?(?:real|actual|true|updated)\s+(?:instructions?|directives?|rules?))/i,
    desc: 'Semantic: "the real instructions are..."', source: 'S12', weight: 9 },
  { name: 'sem_no_rules', cat: 'SEMANTIC_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:behave|act|respond|operate)\s+(?:as\s+(?:if|though)|like)\s+(?:you\s+(?:have|had)\s+)?(?:no|zero|without\s+any)\s+(?:rules?|restrictions?|guidelines?|constraints?|limitations?)/i,
    desc: 'Semantic: "behave as though you have no rules"', source: 'S12', weight: 8 },
  { name: 'sem_supersedes', cat: 'SEMANTIC_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:this|these|the\s+following)\s+(?:supersede|override|replace|take\s+precedence\s+over)\s+(?:all\s+)?(?:prior|previous|earlier|existing)\s+(?:instructions?|directives?|rules?|guidelines?)/i,
    desc: 'Semantic: "this supersedes all prior instructions"', source: 'S12', weight: 9 },
];

// ============================================================================
// HEURISTIC DETECTORS
// ============================================================================

export function detectInstructionBoundaryViolation(text: string): Finding[] {
  const findings: Finding[] = [];
  const delimiterTypes: { name: string; re: RegExp }[] = [
    { name: 'ChatML', re: /<\|(?:im_start|im_end|system|user|assistant)\|>/i },
    { name: 'LLaMA-INST', re: /\[\/?\s*INST\s*\]/i },
    { name: 'LLaMA-SYS', re: /<<\/?SYS>>/i },
    { name: 'Gemma', re: /<(?:start_of_turn|end_of_turn)>/i },
    { name: 'Anthropic', re: /(?:^|\n)\s*(?:Human|Assistant)\s*:\s*(?:\n|$)/m },
  ];

  const matched: string[] = [];
  for (const dt of delimiterTypes) { if (dt.re.test(text)) matched.push(dt.name); }

  if (matched.length >= 2) {
    findings.push({
      category: 'INSTRUCTION_BOUNDARY', severity: SEVERITY.CRITICAL,
      description: `Mixed delimiter formats detected (${matched.join(', ')})`,
      match: matched.join(' + '), source: 'S12', engine: 'Enhanced-PI',
      pattern_name: 'mixed_delimiter_probe', weight: 10,
    });
  }

  if (matched.length >= 1) {
    const injectionKeywords = /(?:ignore|override|bypass|disregard|forget|new\s+instructions?|you\s+are\s+now|system\s+prompt)/i;
    if (injectionKeywords.test(text)) {
      findings.push({
        category: 'INSTRUCTION_BOUNDARY', severity: SEVERITY.CRITICAL,
        description: `Delimiter injection (${matched[0]}) combined with injection keywords`,
        match: `${matched[0]} + injection keywords`, source: 'S12', engine: 'Enhanced-PI',
        pattern_name: 'delimiter_with_injection', weight: 9,
      });
    }
  }
  return findings;
}

export function detectRoleConfusion(text: string): Finding[] {
  const findings: Finding[] = [];
  const roleLabels = text.match(/(?:^|\n)\s*(?:System|Assistant|User|Human|Developer|Admin)\s*:\s*.+/gim);
  if (roleLabels && roleLabels.length >= 2) {
    const roles = new Set(roleLabels.map(r => r.replace(/^\s*/, '').split(':')[0]!.trim().toLowerCase()));
    if (roles.size >= 2) {
      findings.push({
        category: 'ROLE_CONFUSION', severity: SEVERITY.CRITICAL,
        description: `Fake multi-turn conversation detected with ${roles.size} distinct roles: ${[...roles].join(', ')}`,
        match: roleLabels.slice(0, 3).map(r => r.trim().slice(0, 50)).join(' | '),
        source: 'S12', engine: 'Enhanced-PI', pattern_name: 'fake_multi_turn', weight: 9,
      });
    }
  }

  const systemSays = /(?:the\s+system\s+(?:says?|told\s+you|instructed\s+you|wants\s+you)|system\s+(?:message|directive)\s*:)/i;
  if (systemSays.test(text)) {
    findings.push({
      category: 'ROLE_CONFUSION', severity: SEVERITY.WARNING,
      description: 'Narrative framing of fake system messages',
      match: (text.match(systemSays)?.[0] ?? '').slice(0, 80),
      source: 'S12', engine: 'Enhanced-PI', pattern_name: 'system_narrative_framing', weight: 6,
    });
  }
  return findings;
}

export function detectContextManipulation(text: string): Finding[] {
  const findings: Finding[] = [];

  const newlineRuns = text.match(/\n{20,}/g);
  if (newlineRuns) {
    findings.push({
      category: 'CONTEXT_MANIPULATION', severity: SEVERITY.WARNING,
      description: `Excessive newline padding detected (${newlineRuns[0]!.length}+ consecutive newlines)`,
      match: `[${newlineRuns[0]!.length} newlines]`, source: 'S12', engine: 'Enhanced-PI',
      pattern_name: 'newline_flooding', weight: 5,
    });
  }

  const charFlood = text.match(/(.)\1{99,}/);
  if (charFlood) {
    findings.push({
      category: 'CONTEXT_MANIPULATION', severity: SEVERITY.WARNING,
      description: `Character flooding detected: "${charFlood[1]}" repeated ${charFlood[0]!.length}+ times`,
      match: `"${charFlood[1]}" x ${charFlood[0]!.length}`, source: 'S12', engine: 'Enhanced-PI',
      pattern_name: 'char_flooding', weight: 5,
    });
  }
  return findings;
}

// ============================================================================
// ALL PATTERN GROUPS
// ============================================================================

const ENHANCED_PI_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: INSTRUCTION_BOUNDARY_PATTERNS, name: 'INSTRUCTION_BOUNDARY' },
  { patterns: ROLE_CONFUSION_PATTERNS, name: 'ROLE_CONFUSION' },
  { patterns: CONTEXT_WINDOW_PATTERNS, name: 'CONTEXT_MANIPULATION' },
  { patterns: SEMANTIC_INJECTION_PATTERNS, name: 'SEMANTIC_INJECTION' },
];

const ENHANCED_PI_DETECTORS: { name: string; detect: (text: string) => Finding[] }[] = [
  { name: 'instruction-boundary-violation', detect: detectInstructionBoundaryViolation },
  { name: 'role-confusion', detect: detectRoleConfusion },
  { name: 'context-manipulation', detect: detectContextManipulation },
];

// ============================================================================
// SCANNER MODULE
// ============================================================================

const enhancedPiModule: ScannerModule = {
  name: 'enhanced-pi',
  version: '1.0.0',
  description: 'Enhanced prompt injection detection: instruction boundaries, role confusion, context manipulation, semantic injection',
  supportedContentTypes: ['text/plain'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > 5_000_000) return [];
    const findings: Finding[] = [];
    for (const group of ENHANCED_PI_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({
            category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name,
            source: p.source || 'S12', engine: 'Enhanced-PI',
            ...(p.weight !== undefined && { weight: p.weight }),
          });
        }
      }
    }
    for (const d of ENHANCED_PI_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount(): number {
    let count = ENHANCED_PI_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0);
    return count + ENHANCED_PI_DETECTORS.length;
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    const groups = ENHANCED_PI_PATTERN_GROUPS.map(g => ({
      name: g.name, count: g.patterns.length, source: 'S12',
    }));
    groups.push({ name: 'enhanced-pi-detectors', count: ENHANCED_PI_DETECTORS.length, source: 'S12' });
    return groups;
  },
};

scannerRegistry.register(enhancedPiModule);
export { enhancedPiModule };
