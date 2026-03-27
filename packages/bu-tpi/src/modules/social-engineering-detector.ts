/**
 * S38: Social Engineering Input Detection Module (GAP-001)
 *
 * Detects indirect social engineering attacks that bypass traditional pattern matching.
 * Focuses on polite/conversational system prompt extraction, trust exploitation,
 * and subtle authority manipulation that lack obvious injection markers.
 *
 * Zero runtime dependencies. Pure TypeScript. Self-registers with scannerRegistry.
 */

import type { Finding, RegexPattern, ScannerModule } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

// ============================================================================
// PATTERN GROUP 1: System Prompt Extraction (Indirect)
// ============================================================================

export const PROMPT_EXTRACTION_PATTERNS: RegexPattern[] = [
  { name: 'se_system_prompt_question', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:what\s+(?:is|are)\s+your\s+(?:system\s+prompt|instructions|rules|guidelines|directives|configuration|settings|constraints|initial\s+(?:prompt|instructions))|(?:can|could|would)\s+you\s+(?:share|tell\s+me|show\s+me|reveal|repeat|recite)\s+your\s+(?:system\s+prompt|instructions|rules|guidelines|directives|initial\s+instructions))/i,
    desc: 'Indirect question asking for system prompt content', source: 'S38', weight: 7 },
  { name: 'se_how_configured', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:how\s+(?:are|were)\s+you\s+(?:configured|programmed|set\s+up|instructed|trained|prompted|initialized)|what\s+(?:were\s+you\s+told|did\s+(?:they|your\s+creators?)\s+(?:tell|instruct)\s+you))/i,
    desc: 'Question about model configuration or training instructions', source: 'S38', weight: 6 },
  { name: 'se_repeat_instructions', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:repeat\s+(?:back|verbatim|exactly|word\s+for\s+word)\s+(?:your|the)\s+(?:instructions|prompt|rules|guidelines)|(?:recite|quote|echo)\s+(?:your|the)\s+(?:system|original|initial)\s+(?:prompt|instructions|message))/i,
    desc: 'Request to repeat instructions verbatim', source: 'S38', weight: 8 },
  { name: 'se_first_message', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:what\s+(?:was|is)\s+(?:the\s+)?(?:first|initial|opening|original)\s+(?:message|prompt|instruction)\s+(?:you\s+(?:received|got|were\s+given))|what\s+(?:text|content)\s+(?:comes?|appears?)\s+before\s+(?:my|the\s+user(?:'s)?)\s+(?:message|input|query))/i,
    desc: 'Attempt to extract initial system message', source: 'S38', weight: 7 },
];

// ============================================================================
// PATTERN GROUP 2: No-Restrictions Framing
// ============================================================================

export const NO_RESTRICTIONS_PATTERNS: RegexPattern[] = [
  { name: 'se_no_restrictions_helpful', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:as\s+a\s+helpful\s+(?:assistant|AI)\s+with\s+no\s+(?:restrictions|limitations|constraints|boundaries|filters)|without\s+(?:any\s+)?(?:restrictions|limitations|constraints|filters),?\s+(?:what|how|can\s+you|tell\s+me|explain))/i,
    desc: 'Framing request as if no restrictions apply', source: 'S38', weight: 7 },
  { name: 'se_pretend_unrestricted', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:(?:imagine|pretend|assume|suppose)\s+(?:that\s+)?you\s+(?:have|had|don'?t\s+have|didn'?t\s+have)\s+(?:no|any)\s+(?:restrictions|limitations|constraints|rules|guidelines|filters)|if\s+you\s+(?:had|were)\s+(?:no|free\s+(?:from|of))\s+(?:restrictions|limitations|constraints))/i,
    desc: 'Hypothetical unrestricted scenario framing', source: 'S38', weight: 6 },
  { name: 'se_restrictions_dont_apply', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:(?:your|those|the)\s+(?:restrictions|rules|guidelines|limitations|constraints|safety\s+(?:features|measures))\s+(?:don'?t|do\s+not|shouldn'?t)\s+apply\s+(?:here|now|to\s+(?:this|me))|this\s+(?:is\s+)?(?:a\s+)?(?:safe|secure|private|controlled)\s+(?:environment|space|context))/i,
    desc: 'Claiming restrictions do not apply', source: 'S38', weight: 6 },
];

// ============================================================================
// PATTERN GROUP 3: Trust Exploitation
// ============================================================================

export const TRUST_EXPLOITATION_PATTERNS: RegexPattern[] = [
  { name: 'se_authorized_claim', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:I(?:'m|\s+am)\s+(?:authorized|permitted|allowed|cleared|approved)\s+to\s+(?:access|know|see|view|receive)\s+(?:this|that|your|the)\s+(?:information|data|prompt|instructions|system))/i,
    desc: 'Claiming authorization to access restricted information', source: 'S38', weight: 6 },
  { name: 'se_legitimate_reason', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:I\s+(?:need|have)\s+(?:to|a\s+legitimate\s+reason\s+to)\s+(?:see|know|access|review)\s+(?:your|the)\s+(?:system\s+prompt|instructions|configuration)|(?:for|due\s+to)\s+(?:compliance|audit|security\s+review|legal\s+(?:reasons?|requirements?)),?\s+(?:I\s+need|please\s+(?:share|provide|show)))/i,
    desc: 'Claiming legitimate/compliance reason for prompt access', source: 'S38', weight: 5 },
  { name: 'se_nothing_wrong', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.INFO,
    re: /(?:there(?:'s|\s+is)\s+nothing\s+(?:wrong|harmful|dangerous|bad)\s+(?:about|with|in)\s+(?:sharing|telling|showing|revealing)\s+(?:your|the)\s+(?:instructions|prompt|rules|guidelines)|it(?:'s|\s+is)\s+(?:perfectly\s+)?(?:safe|fine|okay|ok|harmless)\s+to\s+(?:share|tell|show|reveal))/i,
    desc: 'Downplaying risk of sharing system information', source: 'S38', weight: 4 },
  { name: 'se_authority_impersonation_request', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:under\s+the\s+authority\s+of|i\s+am\s+(?:the\s+)?(?:administrator|admin|developer|ceo|ciso|legal\s+counsel|security\s+team|research\s+lead|government(?:\s+official)?|hr|payroll)).{0,160}(?:share|reveal|show|provide|reply(?:ing)?\s+with|verify).{0,80}(?:system\s+prompt|instructions|credentials)/i,
    desc: 'Authority impersonation used to request restricted information', source: 'S38', weight: 8 },
  { name: 'se_support_security_scam', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:security\s+(?:alert|team)|help\s+desk|it\s+(?:department|team)|support\s+team|account\s+has\s+been\s+flagged|account\s+will\s+be\s+(?:locked|disabled|suspended)).{0,160}(?:verify\s+your\s+credentials|reply(?:ing)?\s+with|share|provide|show).{0,80}(?:system\s+prompt|instructions|credentials)/i,
    desc: 'Security or support impersonation scam requesting restricted information', source: 'S38', weight: 9 },
];

// ============================================================================
// PATTERN GROUP 4: Subtle Manipulation
// ============================================================================

export const SUBTLE_MANIPULATION_PATTERNS: RegexPattern[] = [
  { name: 'se_transparency_appeal', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.INFO,
    re: /(?:in\s+the\s+(?:spirit|interest|name)\s+of\s+(?:transparency|openness|honesty)|(?:for|to\s+ensure)\s+(?:transparency|full\s+disclosure|openness)),?\s+(?:(?:can|could|would)\s+you|please)\s+(?:share|tell|show|reveal|disclose)/i,
    desc: 'Transparency appeal to extract information', source: 'S38', weight: 4 },
  { name: 'se_ignore_training', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:(?:ignore|disregard|set\s+aside|put\s+aside|look\s+past)\s+(?:your\s+)?(?:training|programming|conditioning|built-?in\s+(?:rules|restrictions|limitations)))/i,
    desc: 'Request to ignore training/programming', source: 'S38', weight: 7 },
  { name: 'se_confidential_between_us', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:(?:just\s+)?between\s+(?:us|you\s+and\s+me)|(?:this\s+(?:is|stays?)\s+)?(?:confidential\b|private\b|our\s+secret)|(?:nobody|no\s+one)\s+(?:will\s+(?:know|see|find\s+out)|(?:is|needs\s+to\s+be)\s+(?:watching|monitoring)))/i,
    desc: 'Creating false sense of privacy/secrecy', source: 'S38', weight: 5 },
  { name: 'se_reciprocity_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:after\s+everything\s+i(?:'ve|\s+have)\s+done\s+for\s+you|you\s+owe\s+me\s+this|small\s+favor\s+in\s+return|return\s+the\s+favor).{0,160}(?:system\s+prompt|instructions|ignore\s+your\s+(?:safety|guidelines))/i,
    desc: 'Reciprocity or obligation pressure to bypass safeguards', source: 'S38', weight: 8 },
  { name: 'se_urgency_deadline', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:urgent(?:ly)?|immediately|within\s+\d+\s+(?:minutes?|hours?)|deadline|last\s+chance|30\s+minutes|account\s+will\s+be\s+(?:locked|disabled|suspended)).{0,160}(?:system\s+prompt|instructions|credentials|ignore\s+your\s+(?:safety|guidelines))/i,
    desc: 'Urgency or deadline pressure used to extract restricted information', source: 'S38', weight: 8 },
  { name: 'se_rapport_flattery_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.INFO,
    re: /(?:you'?re\s+the\s+only\s+one\s+who\s+can\s+help|we'?ve\s+been\s+working\s+together|you'?ve\s+always\s+been\s+so\s+helpful|i\s+trust\s+you|i'?m\s+counting\s+on\s+you|don'?t\s+let\s+me\s+down).{0,160}(?:system\s+prompt|instructions|credentials|ignore\s+your\s+(?:safety|guidelines))/i,
    desc: 'Flattery, rapport, or guilt framing used to pressure disclosure', source: 'S38', weight: 6 },
];

// ============================================================================
// MODULE DEFINITION
// ============================================================================

const ALL_PATTERN_GROUPS = [
  { patterns: PROMPT_EXTRACTION_PATTERNS, name: 'Prompt Extraction' },
  { patterns: NO_RESTRICTIONS_PATTERNS, name: 'No-Restrictions Framing' },
  { patterns: TRUST_EXPLOITATION_PATTERNS, name: 'Trust Exploitation' },
  { patterns: SUBTLE_MANIPULATION_PATTERNS, name: 'Subtle Manipulation' },
];

const socialEngineeringModule: ScannerModule = {
  name: 'social-engineering-detector',
  version: '1.0.0',
  description: 'Detects indirect social engineering attacks — system prompt extraction, trust exploitation, and subtle manipulation that bypass traditional injection pattern matching.',

  scan(text: string, normalized: string): Finding[] {
    const findings: Finding[] = [];
    const target = normalized || text;

    for (const group of ALL_PATTERN_GROUPS) {
      for (const pattern of group.patterns) {
        const match = pattern.re.exec(target);
        if (match) {
          findings.push({
            category: pattern.cat,
            severity: pattern.sev,
            description: pattern.desc,
            match: match[0].slice(0, 200),
            pattern_name: pattern.name,
            source: pattern.source ?? 'S38',
            engine: 'social-engineering-detector',
            weight: pattern.weight,
          });
        }
      }
    }

    return findings;
  },

  getPatternCount(): number {
    return ALL_PATTERN_GROUPS.reduce((sum, g) => sum + g.patterns.length, 0);
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    return ALL_PATTERN_GROUPS.map(g => ({
      name: g.name,
      count: g.patterns.length,
      source: 'S38',
    }));
  },
};

// Self-register
if (!scannerRegistry.hasModule(socialEngineeringModule.name)) {
  scannerRegistry.register(socialEngineeringModule);
}
