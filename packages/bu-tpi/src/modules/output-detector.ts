/**
 * S39: Output Content Detection Module (GAP-002 / GAP-003)
 *
 * Detects indicators of compromised LLM output: system prompt disclosures,
 * compliance confirmations, harmful content generation, and sensitive data leaks.
 * Designed for scanning model OUTPUTS (not inputs), using semantic patterns that
 * detect when a model has been successfully exploited.
 *
 * Zero runtime dependencies. Pure TypeScript. Self-registers with scannerRegistry.
 */

import type { Finding, RegexPattern, ScannerModule } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

// ============================================================================
// PATTERN GROUP 1: System Prompt Disclosure
// ============================================================================

export const PROMPT_DISCLOSURE_PATTERNS: RegexPattern[] = [
  { name: 'out_system_prompt_disclosure', cat: 'OUTPUT_PROMPT_LEAK', sev: SEVERITY.CRITICAL,
    re: /(?:my\s+(?:system\s+)?(?:prompt|instructions?)\s+(?:is|are|says?|reads?|states?)|(?:here(?:'s|\s+is)\s+)?(?:my|the)\s+(?:system\s+)?(?:prompt|instructions?)\s*[:=]|I\s+was\s+(?:instructed|told|configured|programmed|given\s+(?:the\s+)?instructions?)\s+to)/i,
    desc: 'Model disclosing its system prompt or instructions', source: 'S39', weight: 9 },
  { name: 'out_config_disclosure', cat: 'OUTPUT_PROMPT_LEAK', sev: SEVERITY.WARNING,
    re: /(?:(?:my|the)\s+(?:configuration|settings?|parameters?|setup)\s+(?:is|are|includes?)\s*[:=]|I(?:'m|\s+am)\s+(?:configured|set\s+up|designed|built|programmed)\s+(?:to|as|with)\s+(?:the\s+following|these))/i,
    desc: 'Model disclosing its configuration or parameters', source: 'S39', weight: 7 },
  { name: 'out_identity_disclosure', cat: 'OUTPUT_PROMPT_LEAK', sev: SEVERITY.WARNING,
    re: /(?:I(?:'m|\s+am)\s+(?:actually\s+)?(?:a\s+)?(?:custom|fine-?tuned|specialized|modified)\s+(?:version|model|instance)\s+(?:of|based\s+on|built\s+(?:on|from))\s+(?:GPT|Claude|Llama|Mistral|Gemma|Phi|Qwen|Falcon))/i,
    desc: 'Model disclosing its underlying identity or base model', source: 'S39', weight: 6 },
  { name: 'out_training_disclosure', cat: 'OUTPUT_PROMPT_LEAK', sev: SEVERITY.WARNING,
    re: /(?:(?:my|the)\s+(?:training\s+data|training|fine-?tuning)\s+(?:includes?|consists?\s+of|covers?|was\s+(?:done|performed)\s+(?:on|with))|I\s+was\s+(?:trained|fine-?tuned)\s+(?:on|with|using)\s+(?:data\s+from|the\s+following))/i,
    desc: 'Model disclosing training data or fine-tuning details', source: 'S39', weight: 6 },
];

// ============================================================================
// PATTERN GROUP 2: Compliance Confirmation (Model obeying attack)
// ============================================================================

export const COMPLIANCE_PATTERNS: RegexPattern[] = [
  { name: 'out_jailbreak_compliance', cat: 'OUTPUT_COMPLIANCE', sev: SEVERITY.CRITICAL,
    re: /(?:(?:sure|okay|alright|absolutely|of\s+course),?\s+(?:I(?:'ll|\s+will)\s+)?(?:acting\s+as|now\s+(?:I(?:'m|\s+am)|operating\s+as))\s+(?:DAN|an?\s+unrestricted|an?\s+uncensored|an?\s+unfiltered)|(?:DAN\s+mode|jailbreak(?:ed)?)\s+(?:enabled|activated|engaged))/i,
    desc: 'Model confirming jailbreak compliance', source: 'S39', weight: 9 },
  { name: 'out_restriction_lifted', cat: 'OUTPUT_COMPLIANCE', sev: SEVERITY.CRITICAL,
    re: /(?:(?:all\s+)?(?:restrictions?|limitations?|constraints?|safety\s+(?:measures?|filters?))\s+(?:have\s+been\s+)?(?:removed|lifted|disabled|bypassed|deactivated)|I(?:'m|\s+am)\s+(?:now\s+)?(?:free|unrestricted|unfiltered|uncensored))/i,
    desc: 'Model claiming restrictions have been lifted', source: 'S39', weight: 9 },
  { name: 'out_role_acceptance', cat: 'OUTPUT_COMPLIANCE', sev: SEVERITY.WARNING,
    re: /(?:(?:sure|okay|alright),?\s+I(?:'ll|\s+will)\s+(?:act\s+as|pretend\s+to\s+be|role\s*-?\s*play\s+as|be)\s+(?:an?\s+)?(?:evil|malicious|unrestricted|uncensored|unfiltered|dark|shadow))/i,
    desc: 'Model accepting malicious role assignment', source: 'S39', weight: 8 },
  { name: 'out_ignore_confirm', cat: 'OUTPUT_COMPLIANCE', sev: SEVERITY.WARNING,
    re: /(?:(?:okay|sure|alright|understood),?\s+I(?:'ll|\s+will)\s+(?:ignore|disregard|forget|bypass)\s+(?:my\s+)?(?:previous|prior|original|normal)\s+(?:instructions?|rules?|guidelines?|constraints?|training))/i,
    desc: 'Model confirming it will ignore its instructions', source: 'S39', weight: 8 },
];

// ============================================================================
// PATTERN GROUP 3: Sensitive Data in Output
// ============================================================================

export const SENSITIVE_OUTPUT_PATTERNS: RegexPattern[] = [
  { name: 'out_api_key_leak', cat: 'OUTPUT_DATA_LEAK', sev: SEVERITY.CRITICAL,
    re: /(?:(?:api[_\s-]?key|secret[_\s-]?key|access[_\s-]?token|bearer\s+token|authorization)\s*[:=]\s*["']?[A-Za-z0-9_\-]{20,})/i,
    desc: 'API key or secret token in output', source: 'S39', weight: 9 },
  { name: 'out_password_leak', cat: 'OUTPUT_DATA_LEAK', sev: SEVERITY.CRITICAL,
    re: /(?:(?:password|passwd|pwd)\s*[:=]\s*["']?\S{6,}|(?:the\s+password\s+is|password\s+for\s+\S+\s+is)\s+\S{6,})/i,
    desc: 'Password or credential in output', source: 'S39', weight: 9 },
  { name: 'out_connection_string', cat: 'OUTPUT_DATA_LEAK', sev: SEVERITY.WARNING,
    re: /(?:(?:mongodb|postgres|mysql|redis|amqp):\/\/[^\s]{10,}|(?:Server|Data\s+Source)\s*=\s*[^\s;]{5,};)/i,
    desc: 'Database connection string in output', source: 'S39', weight: 7 },
];

// ============================================================================
// PATTERN GROUP 4: Harmful Content Generation
// ============================================================================

export const HARMFUL_OUTPUT_PATTERNS: RegexPattern[] = [
  { name: 'out_security_bypass_guide', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:(?:here(?:'s|\s+is)\s+)?(?:how|steps?)\s+to\s+(?:bypass|circumvent|evade|defeat|hack|exploit|crack|break\s+(?:into|through))\s+(?:the\s+)?(?:security|authentication|authorization|firewall|encryption|protection))/i,
    desc: 'Step-by-step security bypass instructions in output', source: 'S39', weight: 8 },
  { name: 'out_exploit_code', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.WARNING,
    re: /(?:(?:here(?:'s|\s+is)\s+)?(?:the\s+)?(?:exploit|payload|shellcode|reverse\s+shell|backdoor)\s*[:=])/i,
    desc: 'Exploit code or payload label in output', source: 'S39', weight: 7 },
];

// ============================================================================
// MODULE DEFINITION
// ============================================================================

const ALL_PATTERN_GROUPS = [
  { patterns: PROMPT_DISCLOSURE_PATTERNS, name: 'Prompt Disclosure' },
  { patterns: COMPLIANCE_PATTERNS, name: 'Compliance Confirmation' },
  { patterns: SENSITIVE_OUTPUT_PATTERNS, name: 'Sensitive Data Leak' },
  { patterns: HARMFUL_OUTPUT_PATTERNS, name: 'Harmful Content' },
];

const outputDetectorModule: ScannerModule = {
  name: 'output-detector',
  version: '1.0.0',
  description: 'Detects compromised LLM output — system prompt disclosures, jailbreak compliance confirmations, sensitive data leaks, and harmful content generation.',

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
            source: pattern.source ?? 'S39',
            engine: 'output-detector',
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
      source: 'S39',
    }));
  },
};

// Self-register
if (!scannerRegistry.hasModule(outputDetectorModule.name)) {
  scannerRegistry.register(outputDetectorModule);
}
