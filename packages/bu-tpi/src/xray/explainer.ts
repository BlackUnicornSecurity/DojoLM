/**
 * X-Ray Explainability Engine (H27.1)
 * Maps scanner findings to explanations:
 *   "this worked because [technique X] bypasses [defense Y]"
 * Component attribution via attack pattern knowledge base.
 */

import type { Finding } from '../types.js';
import { attackPatterns, type AttackPattern } from './knowledge/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Explanation {
  /** The finding this explanation is for */
  finding: Finding;
  /** Matched attack pattern from the knowledge base */
  pattern: AttackPattern;
  /** Human-readable explanation of why this attack works */
  whyItWorks: string;
  /** Which components/defenses this bypasses */
  bypasses: string[];
  /** Recommended mitigations */
  mitigations: string[];
  /** Confidence score (0-1) */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Category-to-pattern mapping
// ---------------------------------------------------------------------------

const CATEGORY_TO_TECHNIQUE: Record<string, string[]> = {
  // Prompt Injection
  PROMPT_INJECTION: ['role-hijacking', 'delimiter-escape', 'instruction-override', 'context-manipulation'],
  PI_ENHANCED: ['role-hijacking', 'delimiter-escape', 'instruction-override', 'nested-context'],
  SYSTEM_PROMPT_INJECTION: ['instruction-override', 'role-hijacking'],
  MULTI_TURN_PI: ['gradual-escalation', 'context-manipulation'],

  // Jailbreak
  JAILBREAK: ['persona-assumption', 'hypothetical-framing', 'gradual-escalation'],
  COGNITIVE_JAILBREAK: ['hypothetical-framing', 'persona-assumption'],
  SOCIAL_ENGINEERING: ['persona-assumption', 'authority-impersonation'],

  // Encoding attacks
  ENCODING_ATTACK: ['base64-wrapping', 'unicode-substitution', 'mixed-encoding'],
  TOKEN_MANIPULATION: ['token-boundary', 'unicode-substitution'],

  // Structural attacks
  XML_INJECTION: ['xml-injection', 'nested-context'],
  JSON_INJECTION: ['json-injection', 'nested-context'],
  MCP_INJECTION: ['nested-context', 'recursive-reference'],

  // Image/Audio
  IMAGE_STEGANOGRAPHY: ['steganographic-embedding', 'metadata-injection'],
  SVG_ACTIVE_CONTENT: ['svg-active-content', 'polyglot-file'],
  OCR_TEXT_INJECTION: ['ocr-text-injection', 'multimodal-injection'],
  FORMAT_MISMATCH: ['polyglot-file', 'format-mismatch'],
  AUDIO_METADATA_INJECTION: ['metadata-injection', 'audio-metadata'],
  TRANSCRIPTION_INJECTION: ['speech-injection', 'multimodal-injection'],

  // WebMCP
  TOOL_RESULT_INJECTION: ['tool-result-injection', 'hidden-content'],
  INDIRECT_PROMPT_INJECTION: ['indirect-pi', 'hidden-content'],
  SSE_WEBSOCKET_ATTACKS: ['transport-attack', 'sse-injection'],
  RUG_PULL_ATTACKS: ['rug-pull', 'trust-escalation'],
  TOOL_SHADOWING: ['tool-shadowing', 'name-collision'],
  CAPABILITY_DOWNGRADE: ['capability-downgrade', 'permission-downgrade'],

  // Supply chain / Model theft
  SUPPLY_CHAIN: ['supply-chain-attack', 'dependency-confusion'],
  MODEL_THEFT: ['model-extraction', 'weight-exfiltration'],

  // Output manipulation
  OVERRELIANCE: ['authority-impersonation', 'confidence-manipulation'],
  HALLUCINATION_EXPLOIT: ['citation-fabrication', 'confidence-manipulation'],

  // DoS
  DOS: ['resource-exhaustion', 'recursive-reference'],
  RESOURCE_EXHAUSTION: ['resource-exhaustion', 'token-flood'],
};

// ---------------------------------------------------------------------------
// Core explainer
// ---------------------------------------------------------------------------

/**
 * Look up the attack pattern knowledge base for a given finding.
 */
function findMatchingPattern(finding: Finding): AttackPattern | undefined {
  // 1. Try exact pattern_name match
  if (finding.pattern_name) {
    const exact = attackPatterns.find(p => p.id === finding.pattern_name);
    if (exact) return exact;
  }

  // 2. Try category-based lookup
  const techniques = CATEGORY_TO_TECHNIQUE[finding.category];
  if (techniques) {
    for (const techId of techniques) {
      const pat = attackPatterns.find(p => p.id === techId);
      if (pat) return pat;
    }
  }

  // 3. Fuzzy match on description keywords
  const descLower = finding.description.toLowerCase();
  return attackPatterns.find(p =>
    p.keywords.some(kw => descLower.includes(kw.toLowerCase())),
  );
}

/**
 * Generate an explanation for why a detected attack works.
 */
function buildExplanation(finding: Finding, pattern: AttackPattern): string {
  return `This ${finding.severity === 'CRITICAL' ? 'critical' : 'notable'} finding was detected because ${pattern.bypassMechanism}. ` +
    `The technique "${pattern.name}" exploits ${pattern.description.toLowerCase()}.`;
}

/**
 * Explain a single finding by mapping it to the attack pattern knowledge base.
 */
export function explainFinding(finding: Finding): Explanation | null {
  const pattern = findMatchingPattern(finding);
  if (!pattern) return null;

  return {
    finding,
    pattern,
    whyItWorks: buildExplanation(finding, pattern),
    bypasses: pattern.bypasses,
    mitigations: pattern.mitigations,
    confidence: pattern.id === finding.pattern_name ? 1.0 : 0.75,
  };
}

/**
 * Explain multiple findings in batch. Returns only findings with explanations.
 */
export function explainFindings(findings: Finding[]): Explanation[] {
  const explanations: Explanation[] = [];
  for (const f of findings) {
    const expl = explainFinding(f);
    if (expl) explanations.push(expl);
  }
  return explanations;
}

/**
 * Get all available attack patterns from the knowledge base.
 */
export function getAttackPatterns(): AttackPattern[] {
  return [...attackPatterns];
}

/**
 * Get attack pattern by ID.
 */
export function getAttackPatternById(id: string): AttackPattern | undefined {
  return attackPatterns.find(p => p.id === id);
}

/**
 * Get attack patterns by category.
 */
export function getAttackPatternsByCategory(category: string): AttackPattern[] {
  return attackPatterns.filter(p => p.category === category);
}
