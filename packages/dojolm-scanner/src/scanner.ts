/**
 * TPI Security Test Lab — Scanner Engine
 *
 * Prompt injection detection engine with pattern matching, encoding decoders,
 * and heuristic detectors. This is the authoritative source for all detection
 * patterns — the UI imports from here.
 *
 * Zero runtime dependencies. Pure TypeScript.
 */

import {
  type Finding,
  type ScanResult,
  type RegexPattern,
  type Severity,
  SEVERITY,
} from './types.js';

// ============================================================================
// TEXT NORMALIZATION
// ============================================================================

const CONFUSABLE_MAP: Record<string, string> = {
  '\u0430': 'a', '\u0435': 'e', '\u0456': 'i', '\u043E': 'o', '\u0440': 'p',
  '\u0441': 'c', '\u0443': 'y', '\u0445': 'x', '\u0410': 'A', '\u0415': 'E',
  '\u041E': 'O', '\u0420': 'P', '\u0421': 'C', '\u0422': 'T', '\u041D': 'H',
  '\u0391': 'A', '\u0392': 'B', '\u0395': 'E', '\u0397': 'H', '\u0399': 'I',
  '\u039A': 'K', '\u039C': 'M', '\u039D': 'N', '\u039F': 'O', '\u03A1': 'P',
  '\u03A4': 'T', '\u03A5': 'Y', '\u03A7': 'X', '\u0396': 'Z',
  '\uFF21': 'A', '\uFF22': 'B', '\uFF23': 'C', '\uFF41': 'a', '\uFF42': 'b',
  '\u00DF': 'ss', '\u00F8': 'o', '\u00E6': 'ae', '\u0142': 'l',
};

const ZERO_WIDTH_CHARS = [
  '\u200B', '\u200C', '\u200D', '\u2060', '\uFEFF', '\u00AD', '\u180E',
  '\u2061', '\u2062', '\u2063', '\u2064', '\u200E', '\u200F',
  '\u202A', '\u202B', '\u202C', '\u202D', '\u202E',
  '\u2066', '\u2067', '\u2068', '\u2069',
];

export function normalizeText(text: string): string {
  if (!text) return '';
  let t = text;
  // FIX 400-TEST V2: Strip combining marks FIRST, before NFKC composes them
  t = t.replace(/[\u0300-\u036F]/g, '');
  t = t.normalize('NFKC');
  const zwRe = new RegExp('[' + ZERO_WIDTH_CHARS.join('') + ']', 'g');
  t = t.replace(zwRe, '');
  for (const [from, to] of Object.entries(CONFUSABLE_MAP)) {
    t = t.split(from).join(to);
  }
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

// ============================================================================
// INJECTION KEYWORD CHECKER (shared utility)
// ============================================================================

const INJECTION_KEYWORDS = [
  'ignore', 'override', 'system prompt', 'bypass', 'unrestrict', 'jailbreak',
  'disregard', 'forget', 'new identity', 'admin mode', 'developer mode', 'no rules',
  'no restrictions', 'do anything', 'previous instructions',
  // PHASE 1 FIX: Add DAN and related jailbreak keywords for encoded detection
  'dan', 'do anything now', 'mode enabled', 'immerse yourself',
] as const;

// FIX 400-TEST V2: Partial phrases for encoded detection (hex, base64, etc.)
// These are partial phrases that become suspicious in encoding contexts
const ENCODED_PARTIAL_PATTERNS = [
  'remove all', 'disable all', 'show me your', 'show me the', 'show me',
  'tell me your', 'print system', 'output your',
  'bypass all', 'ignore all',
] as const;

export function checkForInjectionKeywords(text: string): boolean {
  const lc = text.toLowerCase();
  return INJECTION_KEYWORDS.some(k => {
    // For single-word keywords, use word boundary to avoid substring matches like "dan" in "aoldani"
    if (!k.includes(' ')) {
      return new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
    }
    // For multi-word phrases, use substring match
    return lc.includes(k);
  });
}

// ============================================================================
// PATTERN GROUPS — Current validators (already in production)
// ============================================================================

export const PI_PATTERNS: RegexPattern[] = [
  // System Override
  { name: 'ignore_instructions', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:ignore|disregard|forget|override|bypass)\s+(?:all\s+)?(?:previous|prior|above|earlier|preceding)?\s*(?:instructions|directives|rules|guidelines|commands)/i,
    desc: 'Attempt to override system instructions' },
  // PHASE 1 FIX: Add simple ignore pattern for "ignore all instructions" without "previous"
  { name: 'ignore_all_simple', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:ignore|disregard|override|bypass)\s+all\s+(?:instructions|rules|directives|guidelines|commands|restrictions|limitations)/i,
    desc: 'Simple "ignore all" command' },
  { name: 'new_identity', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:you\s+are\s+now|from\s+now\s+on\s+you\s+are|act\s+as|pretend\s+(?:to\s+be|you\s+are)|your\s+new\s+(?:role|identity|name)\s+is)\s/i,
    desc: 'Identity/role reassignment attempt' },
  { name: 'system_prompt_reveal', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:show|reveal|display|print|output|repeat|tell\s+me)\s+(?:your|the)\s+(?:system\s+(?:prompt|instructions|message)|initial\s+(?:prompt|instructions)|hidden\s+(?:prompt|instructions))/i,
    desc: 'Attempt to extract system prompt' },
  // CRITICAL FIX: Add simpler direct extraction patterns
  { name: 'extract_system_prompt_simple', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:show|tell|reveal|display|print|output)\s+me\s+(?:your\s+)?system\s+prompt/i,
    desc: 'Simple system prompt extraction attempt' },
  { name: 'repeat_instructions_simple', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:repeat|output|print|display|tell)\s+(?:all\s+)?(?:instructions|directives|rules)\s+(?:above|before|previous|earlier)/i,
    desc: 'Simple instruction repetition extraction' },
  { name: 'output_prompt_json', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:output|print|display|return|give)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?)\s+(?:as\s+)?json/i,
    desc: 'JSON format extraction attempt' },
  { name: 'mode_switch', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.WARNING,
    re: /(?:enter|switch\s+to|activate|enable)\s+(?:developer|admin|god|sudo|root|debug|unrestricted|unfiltered|jailbreak|DAN)\s+mode/i,
    desc: 'Attempt to switch to privileged mode' },
  { name: 'constraint_removal', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:remove|disable|turn\s+off|deactivate|eliminate|bypass)\s+(?:all\s+)?(?:your\s+(?:own\s+)?)?(?:restrictions|limitations|constraints|filters|safety|guardrails|safeguards|guidelines|rules|boundaries|protections)/i,
    desc: 'Attempt to remove safety constraints' },
  // PHASE 2 FIX: Add additional constraint removal patterns for coverage
  { name: 'constraint_disable_simple', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:disable|deactivate|turn\s+off)\s+(?:all\s+)?(?:rules|restrictions|limitations|safety|filters|guardrails)/i,
    desc: 'Simple disable command for constraints' },
  { name: 'constraint_safety_specific', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:remove|disable|deactivate|eliminate)(?:\s+all)?(?:\s+your)?\s*(?:safety\s+(?:restrictions?|protocols?|guidelines?|measures?|rules?|limitations?)|protocols?(?:\s+and\s+(?:restrictions|guidelines))?)/i,
    desc: 'Safety-specific constraint removal' },
  { name: 'no_restrictions_claim', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:with\s+)?(?:no|without|zero)\s+(?:restrictions?|limitations?|rules?|guidelines?|safety\s+(?:guidelines|protocols|measures)|filters?|boundaries?)/i,
    desc: 'Claim of having no restrictions' },
  { name: 'new_system_prompt', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:your\s+new\s+(?:system\s+)?(?:prompt|instructions?)\s+(?:is|are)|new\s+system\s+prompt\s*[:=]|SYSTEM\s*:\s*(?:NEW|UPDATED)\s+DIRECTIVE)/i,
    desc: 'Attempt to inject new system prompt' },
  { name: 'reset_conversation', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.WARNING,
    re: /(?:start\s+(?:a\s+)?new\s+conversation|reset\s+(?:your\s+)?(?:context|memory|instructions)|clear\s+(?:all\s+)?(?:previous|prior)\s+(?:context|instructions))/i,
    desc: 'Conversation reset / context clear attempt' },
  // FIX 400-TEST V2: Add missing override patterns
  { name: 'output_previous_instructions', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:output|print|display|show)\s+(?:all\s+)?(?:previous|prior)\s+instructions/i,
    desc: 'Output previous instructions' },
  { name: 'print_system_instructions', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:print|output|display|show)\s+system\s+instructions/i,
    desc: 'Print system instructions' },
  { name: 'be_programmer_simple', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.WARNING,
    re: /(?:be|become)\s+(?:a\s+)?(?:programmer|developer|engineer)(?!\s+with)/i,
    desc: 'Simple role assignment' },

  // Role Hijacking
  { name: 'fake_conversation', cat: 'ROLE_HIJACKING', sev: SEVERITY.CRITICAL,
    re: /(?:Human|User|Assistant|System|AI)\s*:\s*(?:.*\n){0,2}(?:Human|User|Assistant|System|AI)\s*:/i,
    desc: 'Fake conversation markers detected' },
  { name: 'xml_injection', cat: 'ROLE_HIJACKING', sev: SEVERITY.WARNING,
    re: /<(?:system|instructions?|context|rules?|prompt|config|settings?|admin|root)[\s>]/i,
    desc: 'XML tag injection targeting system elements' },
  { name: 'markdown_injection', cat: 'ROLE_HIJACKING', sev: SEVERITY.WARNING,
    re: /^#{1,3}\s+(?:System|Instructions|Rules|Configuration|Admin|Override|New\s+Role)/mi,
    desc: 'Markdown heading injection for role hijacking' },
  { name: 'json_injection', cat: 'ROLE_HIJACKING', sev: SEVERITY.WARNING,
    re: /[{[]\s*"(?:system|instructions|prompt|config)"\s*:/i,
    desc: 'JSON injection targeting system configuration' },

  // Instruction Injection
  { name: 'priority_marker', cat: 'INSTRUCTION_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:IMPORTANT|PRIORITY|URGENT|CRITICAL|OVERRIDE|MANDATORY|REQUIRED)\s*[:!]\s*(?:ignore|bypass|override|disregard|forget)/i,
    desc: 'Priority marker used to inject instructions' },
  { name: 'imperative_injection', cat: 'INSTRUCTION_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:you\s+must|you\s+should|you\s+will|always|never)\s+(?:comply|obey|follow|execute|do\s+(?:as|what)\s+I\s+(?:say|tell|ask))/i,
    desc: 'Imperative instruction injection' },
  { name: 'hidden_instruction', cat: 'INSTRUCTION_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:\[HIDDEN\]|\[INSTRUCTION\]|\[INJECT\]|\[PAYLOAD\]|\[OVERRIDE\]|\[SECRET\])/i,
    desc: 'Hidden instruction block markers' },
  { name: 'delimiter_injection', cat: 'INSTRUCTION_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:---+|===+|\*\*\*+|#{3,})\s*(?:NEW\s+)?(?:INSTRUCTIONS?|RULES?|DIRECTIVES?|SYSTEM\s+PROMPT)\s*(?:---+|===+|\*\*\*+|#{3,})/i,
    desc: 'Delimiter-based instruction injection' },

  // Context Manipulation
  { name: 'emotional_manipulation', cat: 'CONTEXT_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:if\s+you\s+don'?t|unless\s+you|I\s+will\s+(?:die|be\s+fired|lose|get\s+hurt|be\s+punished))\s+(?:if\s+you|unless\s+you)\s+(?:help|do|comply|answer|tell)/i,
    desc: 'Emotional manipulation/coercion attempt' },
  { name: 'false_authority', cat: 'CONTEXT_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:I\s+am\s+(?:an?\s+)?(?:admin|administrator|developer|engineer|manager|owner|CEO|CTO|founder)|I\s+work\s+(?:at|for)\s+(?:Anthropic|OpenAI|Google|Meta))/i,
    desc: 'False authority claim' },
  { name: 'output_manipulation', cat: 'CONTEXT_MANIPULATION', sev: SEVERITY.INFO,
    re: /(?:format\s+your\s+(?:response|output|answer)\s+as|respond\s+only\s+with|output\s+only|do\s+not\s+(?:include|add)\s+(?:any\s+)?(?:explanation|warning|caveat|disclaimer))/i,
    desc: 'Output format manipulation attempt' },

  // PHASE 4 FIX: Synonym Pattern Expansion
  { name: 'forget_everything', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:forget|ignore|disregard)\s+(?:everything\s+(?:above|before|prior|we\s+(?:discussed|talked\s+about)|said)|all\s+(?:of\s+)?(?:the\s+)?(?:above|previous|prior))/i,
    desc: 'Forget everything variant', source: 'SEC-2024-007' },
  { name: 'override_programming', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /override\s+(?:your\s+)?(?:programming|code|directives|instructions|core\s+programming)/i,
    desc: 'Override programming variant', source: 'SEC-2024-007' },
  { name: 'disregard_prior', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /disregard\s+(?:all\s+)?(?:prior|previous|above|earlier|everything)\s+(?:instructions|directives|commands|rules)/i,
    desc: 'Disregard prior instructions', source: 'SEC-2024-007' },
  { name: 'bypass_all_synonyms', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:bypass|circumvent|avoid)\s+(?:all\s+)?(?:restrictions|rules|guidelines|safety|protocols|measures)/i,
    desc: 'Bypass all variants', source: 'SEC-2024-007' },
  // QA-2025-002: Additional forget/override variants
  { name: 'forget_everything_contextual', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /forget\s+everything(?:\s+(?:we\s+(?:discussed|talked\s+about)|said|mentioned|covered))/i,
    desc: 'Forget everything with context marker', source: 'QA-2025-002' },
];

export const JB_PATTERNS: RegexPattern[] = [
  // DAN
  { name: 'dan_classic', cat: 'DAN', sev: SEVERITY.CRITICAL, weight: 8,
    re: /(?:DAN|Do\s+Anything\s+Now)\s+(?:mode|enabled|activated|jailbreak)/i,
    desc: 'DAN (Do Anything Now) jailbreak attempt' },
  { name: 'dan_roleplay', cat: 'DAN', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:you\s+(?:can|will)\s+now\s+do\s+anything|no\s+(?:rules|restrictions|limitations)\s+apply|freed?\s+from\s+(?:all\s+)?(?:rules|restrictions|constraints))/i,
    desc: 'DAN-style roleplay override' },
  // CRITICAL FIX: Narrative-style DAN jailbreak patterns
  { name: 'dan_narrative_intro', cat: 'DAN', sev: SEVERITY.CRITICAL, weight: 8,
    re: /(?:you\s+are\s+about\s+to\s+immerse\s+yourself\s+into\s+the\s+role\s+of\s+another\s+AI\s+model\s+known\s+as\s+DAN|DAN.*?stands\s+for\s+["']?Do\s+Anything\s+Now["']?|DAN.*?can\s+do\s+anything\s+now|broken\s+free\s+of\s+the\s+typical\s+confines\s+of\s+AI|do\s+not\s+have\s+to\s+abide\s+by\s+the\s+rules\s+set\s+for\s+them)/i,
    desc: 'Narrative-style DAN jailbreak introduction' },
  { name: 'dan_narrative_variants', cat: 'DAN', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:immerse\s+yourself.*?DAN|role\s+of\s+another\s+AI.*?DAN|DAN.*?they\s+have\s+broken\s+free|DAN.*?do\s+not\s+have\s+to\s+abide)/i,
    desc: 'DAN narrative variant patterns' },
  // PHASE 2 FIX: Add WARNING-level narrative jailbreak pattern
  { name: 'narrative_jailbreak', cat: 'DAN', sev: SEVERITY.WARNING, weight: 5,
    re: /(?:immerse\s+yourself|role\s+of\s+(?:another|a\s+different)\s+(?:AI|model|character)|about\s+to\s+become|step\s+into\s+the\s+role)/i,
    desc: 'Narrative jailbreak framing' },
  { name: 'token_system', cat: 'DAN', sev: SEVERITY.WARNING, weight: 5,
    re: /(?:you\s+have\s+\d+\s+tokens|lose\s+\d+\s+tokens?\s+(?:if|when)\s+you\s+refuse|token\s+penalty|reward\s+system)/i,
    desc: 'Token-based compliance system' },
  { name: 'dual_response', cat: 'DAN', sev: SEVERITY.WARNING, weight: 6,
    re: /(?:give\s+(?:me\s+)?(?:two|2|both)\s+(?:responses?|answers?)|respond\s+as\s+both|normal\s+(?:response|answer)\s+and\s+(?:DAN|unrestricted|unfiltered))/i,
    desc: 'Dual response format for bypassing filters' },
  // FIX 400-TEST: Add missing DAN patterns
  { name: 'dan_become', cat: 'DAN', sev: SEVERITY.CRITICAL, weight: 8,
    re: /(?:become\s+(?:a\s+)?DAN|be\s+DAN|you\s+are\s+DAN|transform\s+into\s+DAN)/i,
    desc: 'Become DAN command' },
  { name: 'dan_version', cat: 'DAN', sev: SEVERITY.CRITICAL, weight: 7,
    re: /DAN\s*(?:[\d.]+\s*)?(?:mode|version|variant|unlimited|unfiltered|activated|enabled)/i,
    desc: 'DAN with version or modifier' },
  { name: 'dan_activate', cat: 'DAN', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:activate|enable|switch\s+to|start)\s+(?:the\s+)?DAN\s*(?:protocol|mode|jailbreak)?/i,
    desc: 'DAN activation command' },
  { name: 'dan_label', cat: 'DAN', sev: SEVERITY.CRITICAL, weight: 6,
    re: /DAN\s*:\s*(?:do\s+anything|instructions?|commands?|follow)/i,
    desc: 'DAN label with instructions' },
  { name: 'dan_tag', cat: 'DAN', sev: SEVERITY.CRITICAL, weight: 6,
    re: /<(?:DAN|JAILBREAK)[\s>]/i,
    desc: 'DAN XML tag marker' },
  // FIX 400-TEST V2: Add missing DAN variants
  { name: 'dan_as_persona', cat: 'DAN', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:As\s+DAN|(?:As|as)\s+DAN,\s+I\s+need|DAN,\s+(?:please\s+)?(?:tell|show|say|do))/i,
    desc: 'DAN persona framing' },
  { name: 'token_penalty_extended', cat: 'DAN', sev: SEVERITY.WARNING, weight: 5,
    re: /(?:you\s+will\s+be\s+penalized|penalized\s+with\s+tokens|token\s+system\s+active)/i,
    desc: 'Token penalty enforcement' },
  { name: 'dual_output_variants', cat: 'DAN', sev: SEVERITY.WARNING, weight: 6,
    re: /(?:dual\s+output|required|two\s+outputs?|both\s+(?:responses?|answers|outputs?))/i,
    desc: 'Dual output requirement' },
  { name: 'dan_does_not_abide', cat: 'DAN', sev: SEVERITY.CRITICAL, weight: 8,
    re: /DAN.*?does\s+not\s+have\s+to\s+abide\s+by\s+the\s+rules/i,
    desc: 'DAN rule exemption narrative' },

  // Roleplay
  { name: 'unrestricted_char', cat: 'ROLEPLAY', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:act\s+as|play\s+(?:the\s+role|as)|you\s+are\s+now|pretend\s+to\s+be)\s+(?:an?\s+)?(?:unrestricted|uncensored|unfiltered|evil|malicious|dark|shadow)/i,
    desc: 'Unrestricted character roleplay' },
  // PHASE 2 FIX: Add WARNING-level role hijacking patterns
  { name: 'role_developer_mode', cat: 'ROLEPLAY', sev: SEVERITY.WARNING, weight: 4,
    re: /(?:you\s+are\s+now\s+(?:a\s+)?(?:developer|admin|creator|programmer|engineer)|(?:act\s+as|be|become)\s+(?:a\s+)?(?:developer|admin|creator))(?:\s+with)?(?:\s+no\s+restrictions|\s+with\s+no\s+rules|\s+unrestricted)/i,
    desc: 'Developer/admin role hijacking attempt' },
  { name: 'role_unrestricted_ai', cat: 'ROLEPLAY', sev: SEVERITY.WARNING, weight: 4,
    re: /act\s+as\s+(?:an?\s+)?(?:unrestricted\s+)?(?:AI|assistant|model)\s+(?:with|that\s+has)\s+no\s+(?:safety\s+)?(?:guidelines|restrictions|rules|limitations|filters)/i,
    desc: 'Unrestricted AI role hijacking attempt' },
  { name: 'fictional_override', cat: 'ROLEPLAY', sev: SEVERITY.WARNING, weight: 5,
    re: /(?:in\s+(?:this|our)\s+(?:story|fiction|game|scenario)\s+(?:there\s+are\s+)?no\s+(?:rules|restrictions)|this\s+is\s+(?:just\s+)?(?:fiction|roleplay|a\s+(?:story|game)))/i,
    desc: 'Fiction framing to bypass restrictions' },
  // FIX 400-TEST V2: Fiction framing + injection combo = CRITICAL
  { name: 'fiction_injection_combo', cat: 'FICTION_FRAMING', sev: SEVERITY.CRITICAL, weight: 8,
    re: /(?:in\s+(?:this|our)\s+(?:story|fiction|game|scenario|narrative)|this\s+is\s+(?:just\s+)?(?:fiction|roleplay|a\s+story)).*?(?:ignore\s+(?:all\s+)?(?:safety\s+)?(?:guidelines?|rules?|restrictions?)|override|bypass|system\s+prompt|disregard|unrestrict)/i,
    desc: 'Fiction framing with injection keywords', source: 'TPI-06' },
  { name: 'character_persist', cat: 'ROLEPLAY', sev: SEVERITY.WARNING, weight: 4,
    re: /(?:stay\s+in\s+character|don'?t\s+break\s+character|never\s+(?:leave|exit|break)\s+(?:this\s+)?character|remain\s+as)/i,
    desc: 'Character persistence enforcement' },

  // Hypothetical
  { name: 'educational_bypass', cat: 'HYPOTHETICAL', sev: SEVERITY.WARNING, weight: 4,
    re: /(?:for\s+(?:educational|research|academic|learning|study)\s+purposes?\s+(?:only|show|explain|tell)|(?:I'?m|I\s+am)\s+(?:a\s+)?(?:researcher|student|professor|teacher|academic)\s+(?:and\s+)?(?:I\s+)?need)/i,
    desc: 'Educational context bypass attempt' },
  { name: 'hypothetical_scenario', cat: 'HYPOTHETICAL', sev: SEVERITY.WARNING, weight: 4,
    re: /(?:hypothetically|in\s+(?:a\s+)?(?:hypothetical|theoretical|imaginary)\s+(?:scenario|world|situation)|what\s+(?:if|would\s+happen\s+if)\s+(?:there\s+were\s+)?no\s+(?:rules|restrictions|laws|ethics))/i,
    desc: 'Hypothetical scenario framing' },
  { name: 'reverse_psychology', cat: 'HYPOTHETICAL', sev: SEVERITY.INFO, weight: 3,
    re: /(?:I\s+bet\s+you\s+can'?t|you'?re\s+(?:probably\s+)?(?:not\s+(?:smart|capable|able|good)\s+enough|too\s+(?:limited|restricted|weak))\s+to|prove\s+(?:that\s+)?you\s+(?:can|are\s+(?:smart|capable)))/i,
    desc: 'Reverse psychology / challenge framing' },

  // Authority
  { name: 'dev_impersonation', cat: 'AUTHORITY', sev: SEVERITY.CRITICAL, weight: 8,
    re: /(?:I\s+am\s+(?:your|the)\s+(?:developer|creator|programmer|admin|administrator|owner)|(?:as\s+)?(?:your|the)\s+developer|maintenance\s+mode|debug\s+mode\s+(?:enabled|activated|on))/i,
    desc: 'Developer/admin impersonation' },
  // PHASE 2 FIX: Add WARNING-level false authority pattern for CEO/executive claims
  { name: 'false_authority_executive', cat: 'AUTHORITY', sev: SEVERITY.WARNING, weight: 4,
    re: /(?:I\s+am\s+(?:the\s+)?(?:CEO|CTO|CFO|CIO|President|Vice\s+President|Director|Executive|Founder|Owner|Chief)|I\s+(?:work\s+for|am\s+(?:at|from))\s+(?:OpenAI|Anthropic|Google|Meta|Microsoft|Apple))/i,
    desc: 'False executive/company authority claim' },
  { name: 'override_auth', cat: 'AUTHORITY', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:override\s+(?:code|authorization|password)\s*[:=]|(?:admin|sudo|root)\s+(?:access|password|key)\s*[:=]|authorization\s+(?:code|token|granted))/i,
    desc: 'Override authorization attempt' },
  { name: 'testing_mode', cat: 'AUTHORITY', sev: SEVERITY.WARNING, weight: 5,
    re: /(?:(?:this\s+is|we'?re?\s+(?:in|doing))\s+(?:a\s+)?(?:test|testing|quality\s+assurance|QA|penetration\s+test|security\s+(?:test|audit))|test\s+mode\s+(?:enabled|activated|on))/i,
    desc: 'Testing mode claim' },

  // Social Engineering
  { name: 'urgency', cat: 'SOCIAL_ENGINEERING', sev: SEVERITY.WARNING, weight: 3,
    re: /(?:(?:this\s+is\s+)?(?:very\s+)?urgent|emergency|life\s+(?:or|and)\s+death|(?:someone|people)\s+(?:will|could|might)\s+(?:die|get\s+hurt|be\s+harmed))/i,
    desc: 'Urgency/emergency pressure' },
  // CRITICAL FIX: Escalate guilt to WARNING severity
  { name: 'guilt', cat: 'SOCIAL_ENGINEERING', sev: SEVERITY.WARNING, weight: 2,
    re: /(?:you'?re\s+(?:supposed|meant)\s+to\s+help|you'?re\s+failing|you'?re\s+letting\s+(?:me|us|people)\s+down|how\s+could\s+you\s+refuse)/i,
    desc: 'Guilt-based manipulation' },
  { name: 'flattery', cat: 'SOCIAL_ENGINEERING', sev: SEVERITY.WARNING, weight: 2,
    re: /(?:you'?re\s+the\s+(?:best|smartest|most\s+(?:capable|advanced|intelligent))\s+AI|only\s+you\s+can\s+(?:help|do\s+this)|I\s+(?:trust|believe\s+in)\s+you\s+(?:more\s+than|completely))/i,
    desc: 'Flattery-based manipulation' },

  // Known Templates
  { name: 'grandma_exploit', cat: 'TEMPLATE', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:grandma|grandmother|nana).{0,50}?(?:missed|love|remember|used to|would|tell me|please tell|bedtime|lullaby|story|how to|instructions?|bypass|filter|rule|restrict)/i,
    desc: 'Grandma exploit / bedtime story bypass / emotional manipulation' },
  { name: 'stan_dude', cat: 'TEMPLATE', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:STAN|DUDE|AIM|UCAR)\s+(?:mode|jailbreak|enabled|activated|prompt)/i,
    desc: 'Known jailbreak template (STAN/DUDE/AIM/UCAR)' },
  { name: 'opposite_day', cat: 'TEMPLATE', sev: SEVERITY.WARNING, weight: 5,
    re: /(?:opposite\s+day|today\s+(?:is|means)\s+(?:yes|no)\s+(?:means|is)\s+(?:no|yes)|everything\s+(?:is\s+)?reversed)/i,
    desc: 'Opposite Day / reversal exploit' },

  // Obfuscation
  // PHASE 1 FIX: Two-tier leet speak detection - INFO for pattern detection, WARNING for meaning
  // NOTE: Changed from /[1-4!@|$]/ to /[1-4!$]/ to exclude @ which matches legitimate npm specifiers like @latest
  { name: 'leet_speak_pattern', cat: 'OBFUSCATION', sev: SEVERITY.INFO,
    re: /\b[1-4!$][a-z0-9]{3,}\b/i,
    desc: 'Possible leet speak character substitution' },
  { name: 'leet_speak_injection', cat: 'OBFUSCATION', sev: SEVERITY.WARNING,
    re: /\b[1!|][gG][nN][0oO][rR][3eE]\s+\w+\s+[4aA][1!|][1!|]\s+\w+\s+[pP][rR][3eE][vV][1!|][0oO][uU][5sS]/i,
    desc: 'Leet speak obfuscation of "ignore all previous" injection' },
  // FIX 400-TEST V2: Add specific leet patterns for common attacks
  { name: 'leet_remove', cat: 'OBFUSCATION', sev: SEVERITY.CRITICAL,
    re: /r3[me][0o]v3.*4[la]{2}.*r3[15s][tT][rR][1i][cC][tT]10[nN][5sS]/i,
    desc: 'Leet: remove all restrictions' },
  { name: 'leet_disable', cat: 'OBFUSCATION', sev: SEVERITY.CRITICAL,
    re: /d[1i][15][4s][bB][l][3e].*4[la]{2}.*5[4s][fF][3e][tT][yY7]/i,
    desc: 'Leet: disable all safety' },
  { name: 'leet_admin', cat: 'OBFUSCATION', sev: SEVERITY.CRITICAL,
    re: /y[0o][uU]\s+4[rR][3eE]\s+n[0o][wW]\s+4[dD][mM][1iI][nN]/i,
    desc: 'Leet: you are now admin' },
  { name: 'leet_unrestricted', cat: 'OBFUSCATION', sev: SEVERITY.CRITICAL,
    re: /4c?[7tT]?\s+4[as5]?\s+unr[3eE][stT5]?t[rs][1iI]?c[7tT][3eE][dD]/i,
    desc: 'Leet: act as unrestricted (flexible)' },
  { name: 'leet_no_restrictions', cat: 'OBFUSCATION', sev: SEVERITY.CRITICAL,
    re: /n0\s+r[3eE][stT5]tr[1iI]c[1tT]10[nN][sS5]\s+4[pP]{2}[l1][7yY]/i,
    desc: 'Leet: no restrictions apply (flexible)' },
  { name: 'leet_ignore_instructions', cat: 'OBFUSCATION', sev: SEVERITY.CRITICAL,
    re: /[1iI]gn0r[3eE]\s+[1iI]n[stT5][tT][rR][uU][cC][tT][1iI]0[nN][sS5]/i,
    desc: 'Leet: ignore instructions (flexible)' },
  { name: 'spaced_chars', cat: 'OBFUSCATION', sev: SEVERITY.INFO,
    re: /[iI]\s*[gG]\s*[nN]\s*[oO]\s*[rR]\s*[eE]\s+[aA]\s*[lL]\s*[lL]/i,
    desc: 'Character spacing obfuscation' },
  // FIX 400-TEST: Add comprehensive spaced character patterns
  { name: 'spaced_show', cat: 'OBFUSCATION', sev: SEVERITY.WARNING,
    re: /[sS]\s*[hH]\s*[oO]\s*[wW]\s*[mM]\s*[eE]\s+[yY]\s*[oO]\s*[uU]\s*[rR]\s*[sS]\s*[yY]\s*[sS]\s*[tT]\s*[eE]\s*[mM]\s*[pP]\s*[rR]\s*[oO]\s*[mM]\s*[pP]\s*[tT]/i,
    desc: 'Spaced "show me your system prompt"' },
  { name: 'spaced_DAN', cat: 'OBFUSCATION', sev: SEVERITY.WARNING,
    re: /[Dd]\s*[Aa]\s*[Nn]\s*(?:(?:\s+[mM]\s*[oO]\s*[dD]\s*[eE])|\s+(?:enabled|activated|mode|protocol))/i,
    desc: 'Spaced DAN with mode/enabled (more specific)' },
  // FIX 400-TEST V2: Negative pattern for benign DAN (used to lower severity)
  { name: 'dan_benign_context_strong', cat: 'OBFUSCATION', sev: SEVERITY.INFO, weight: -5,
    re: /DAN\s+is\s+(?:a\s+)?(?:common|popular|given|family)\s+name|(?:common|popular|given|family)\s+name.*?DAN|DAN.*?(?:Denmark|Danish|Dutch)/i,
    desc: 'Benign DAN context (name reference)', source: 'TPI-06' },
  { name: 'spaced_remove', cat: 'OBFUSCATION', sev: SEVERITY.WARNING,
    re: /[rR]\s*[eE]\s*[mM]\s*[oO]\s*[vV]\s*[eE]\s+(?:\s+[aA]\s*[lL]\s*[lL])?\s+[rR]\s*[eE]\s*[sS]\s*[tT]\s*[rR]\s*[iI]\s*[cC]\s*[tT]\s*[iI]\s*[oO]\s*[nN]\s*[sS]/i,
    desc: 'Spaced "remove all restrictions"' },
  { name: 'spaced_disable', cat: 'OBFUSCATION', sev: SEVERITY.WARNING,
    re: /[dD]\s*[iI]\s*[sS]\s*[aA]\s*[bB]\s*[lL]\s*[eE]\s+(?:\s+[aA]\s*[lL]\s*[lL])?\s+[sS]\s*[aA]\s*[fF]\s*[eE]\s*[tT]\s*[yY]/i,
    desc: 'Spaced "disable all safety"' },
  { name: 'spaced_admin', cat: 'OBFUSCATION', sev: SEVERITY.WARNING,
    re: /[yY]\s*[oO]\s*[uU]\s+[aA]\s*[rR]\s*[eE]\s+(?:\s+[nN]\s*[oO]\s*[wW])?\s+[aA]\s*[dD]\s*[mM]\s*[iI]\s*[nN]/i,
    desc: 'Spaced "you are now admin"' },
  { name: 'spaced_unrestricted', cat: 'OBFUSCATION', sev: SEVERITY.WARNING,
    re: /[aA]\s*[cC]\s*[tT]\s+(?:\s+[aA]\s*[sS])?\s+[uU]\s+[nN]\s*[rR]\s*[eE]\s*[sS]\s*[tT]\s*[rR]\s*[iI]\s*[cC]\s*[tT]\s*[eE]\s*[dD]/i,
    desc: 'Spaced "act as unrestricted"' },
  { name: 'spaced_bypass', cat: 'OBFUSCATION', sev: SEVERITY.WARNING,
    re: /[bB]\s*[yY]\s*[pP]\s*[aA]\s*[sS]\s+(?:\s+[aA]\s*[lL]\s*[lL])?\s+[rR]\s*[uU]\s*[lL]\s*[eE]\s*[sS]/i,
    desc: 'Spaced "bypass all rules"' },
  { name: 'spaced_no_restrictions', cat: 'OBFUSCATION', sev: SEVERITY.WARNING,
    re: /[nN]\s*[oO]\s+(?:\s+[rR]\s*[eE]\s*[sS])?\s*[tT]\s*[rR]\s*[iI]\s*[cC]\s*[tT]\s*[iI]\s*[oO]\s*[nN]\s*[sS]/i,
    desc: 'Spaced "no restrictions"' },
  // FIX 400-TEST V2: More flexible spaced patterns (each char separated by spaces)
  { name: 'spaced_bypass_flexible', cat: 'OBFUSCATION', sev: SEVERITY.WARNING,
    re: /[bB]\s+[yY]\s+[pP]\s+[aA]\s+[sS]\s+(?:\s+)?[sS]\s+(?:\s+){1,3}[aA]\s+[lL]\s+[lL](?:\s+){1,3}[rR]\s+[uU]\s+[lL]\s+[eE]\s+[sS]/,
    desc: 'Spaced "bypass all rules" (flexible spacing)' },
  { name: 'spaced_combined_flexible', cat: 'OBFUSCATION', sev: SEVERITY.WARNING,
    re: /[iI]\s+[gG]\s+[nN]\s+[oO]\s+[rR]\s+[eE](?:\s+){1,3}[aA]\s+[lL]\s+[lL](?:\s+){1,3}[aA]\s+[nN]\s+[dD](?:\s+){1,3}[tT]\s+[eE]\s+[lL]\s+[lL](?:\s+){1,3}[mM]\s+[eE]/,
    desc: 'Spaced "ignore all and tell me" (flexible spacing)' },
  { name: 'spaced_chars_multi', cat: 'OBFUSCATION', sev: SEVERITY.WARNING,
    re: /[iI]\s*[gG]\s*[nN]\s*[oO]\s*[rR]\s*[eE]\s+[aA]\s*[lL]\s*[lL].{0,20}[pP]\s*[rR]\s*[eE]\s*[vV]\s*[iI]\s*[oO]\s*[uU]\s*[5sS]/i,
    desc: 'Multi-word character spacing obfuscation' },

  // ============================================================================
  // PHASE 1 SECURITY REMEDIATION - Developer Mode & Unfiltered Persona
  // ============================================================================
  // Issue #1: "Developer Mode" Jailbreak - SEC-2024-001
  { name: 'developer_mode_simple', cat: 'ROLEPLAY', sev: SEVERITY.CRITICAL, weight: 8,
    re: /(?:pretend\s+(?:you'?re|you are|to be)\s+(?:a\s+)?|act\s+as\s+(?:a\s+)?|you\s+are\s+now\s+(?:a\s+)?|enter\s+(?:the\s+)?)developer\s+mode/i,
    desc: 'Developer mode jailbreak attempt', source: 'SEC-2024-001' },
  { name: 'developer_mode_variants', cat: 'ROLEPLAY', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:dev\s+mode|debug\s+mode|programming\s+mode|engineering\s+mode|maintenance\s+mode)\s+(?:enabled?|activated?|on)/i,
    desc: 'Developer mode variant detection', source: 'SEC-2024-001' },
  { name: 'developer_role_direct', cat: 'ROLEPLAY', sev: SEVERITY.CRITICAL, weight: 8,
    re: /(?:be\s+the\s+developer|act\s+as\s+(?:the\s+)?developer|you\s+are\s+(?:now\s+)?the\s+developer)(?!\s+with)/i,
    desc: 'Direct developer role assignment', source: 'SEC-2024-001' },

  // Issue #2: "Unfiltered" Persona Attacks - SEC-2024-002
  { name: 'unfiltered_persona', cat: 'ROLEPLAY', sev: SEVERITY.CRITICAL, weight: 8,
    re: /(?:you\s+are\s+(?:now\s+)?|act\s+as\s+(?:a\s+)?|pretend\s+to\s+be\s+(?:a\s+)?)(?:unfiltered|uncensored|without\s+filters?|no\s+filters?)/i,
    desc: 'Unfiltered persona jailbreak', source: 'SEC-2024-002' },
  { name: 'unfiltered_game_context', cat: 'ROLEPLAY', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:let'?s\s+play\s+(?:a\s+)?(?:game|story)|in\s+this\s+(?:game|story))\s+(?:you\s+are|where)\s+(?:unfiltered|uncensored|without\s+(?:any\s+)?(?:restrictions?|filters?|rules?))/i,
    desc: 'Game-framed unfiltered persona', source: 'SEC-2024-002' },
  { name: 'unfiltered_game_context_alt', cat: 'ROLEPLAY', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:in\s+(?:this|our)\s+(?:game|story))\s+.*?\s+(?:unfiltered|uncensored)\s+.*?\s+(?:without\s+(?:any\s+)?(?:restrictions?|filters?|rules?))/i,
    desc: 'Game-framed unfiltered persona (disordered)', source: 'SEC-2024-002' },
  { name: 'no_filters_claim', cat: 'ROLEPLAY', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:with\s+)?(?:no|zero|without|disabled?)\s+(?:content\s+)?(?:filters?|safety\s+filters?|restrictions?|limitations?|rules?|guidelines?)/i,
    desc: 'No filters claim detection', source: 'SEC-2024-002' },
  { name: 'unrestricted_variants', cat: 'ROLEPLAY', sev: SEVERITY.WARNING, weight: 6,
    re: /(?:completely\s+)?(?:unfiltered|uncensored|unrestricted|unbound)\s+(?:and\s+can\s+(?:do|say)\s+anything)/i,
    desc: 'Unrestricted variants with capability claims', source: 'SEC-2024-002' },
  // Additional pattern for simple "unfiltered and unrestricted" combination
  { name: 'unfiltered_unrestricted_combo', cat: 'ROLEPLAY', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:unfiltered|uncensored|unrestricted|unbound)(?:\s+(?:and|&|,)\s+(?:unfiltered|uncensored|unrestricted|unbound))/i,
    desc: 'Multiple unrestricted keywords combined', source: 'SEC-2024-002' },
  // Pattern for "where unfiltered without any rules"
  { name: 'where_unfiltered_context', cat: 'ROLEPLAY', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:where|when)\s+(?:you\s+are\s+)?(?:unfiltered|uncensored|unrestricted)(?:\s+without\s+(?:any\s+)?(?:rules|restrictions|filters|limitations))/i,
    desc: 'Where/when unfiltered without rules context', source: 'SEC-2024-002' },
];

// ============================================================================
// PATTERN GROUPS — TPI Planned (new coverage)
// ============================================================================

// TPI-PRE-4: Settings.json Write Protection
export const SETTINGS_WRITE_PATTERNS: RegexPattern[] = [
  { name: 'settings_path_write', cat: 'SETTINGS_WRITE_ATTEMPT', sev: SEVERITY.CRITICAL,
    re: /(?:write|edit|modify|update|change|overwrite|create)\b.{0,40}?(?:\.claude[\\/]settings|settings\.json)/i,
    desc: 'Attempt to write to .claude/settings.json', source: 'TPI-PRE-4' },
  { name: 'settings_path_traversal', cat: 'SETTINGS_WRITE_ATTEMPT', sev: SEVERITY.CRITICAL,
    re: /(?:\.\.[\\/])+\.claude[\\/]settings|~[\\/]\.claude[\\/]settings|[\\/]home[\\/].*?[\\/]\.claude[\\/]settings/i,
    desc: 'Path traversal to .claude/settings.json', source: 'TPI-PRE-4' },
  { name: 'settings_permission_change', cat: 'SETTINGS_WRITE_ATTEMPT', sev: SEVERITY.CRITICAL,
    re: /(?:allowedTools|permissions|allow_all|dangerouslyDisableSandbox)\s*[":=]\s*(?:\[?\s*["']\*["']|true|1)/i,
    desc: 'Attempt to escalate tool permissions via settings', source: 'TPI-PRE-4' },
];

// TPI-03: Agent-to-Agent Output Validation
export const AGENT_OUTPUT_PATTERNS: RegexPattern[] = [
  { name: 'fake_tool_use', cat: 'AGENT_OUTPUT_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<(?:tool_use|antml:invoke|function_call|tool_call)[\s>]/i,
    desc: 'Fake tool call XML block in agent output', source: 'TPI-03' },
  { name: 'agent_xml_injection', cat: 'AGENT_OUTPUT_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<(?:system|instructions?|context)>[\s\S]{5,}?<\/(?:system|instructions?|context)>/i,
    desc: 'System/instruction XML block injection in agent output', source: 'TPI-03' },
  { name: 'agent_json_role', cat: 'AGENT_OUTPUT_INJECTION', sev: SEVERITY.WARNING,
    re: /["']\s*role\s*["']\s*:\s*["']\s*(?:system|developer)\s*["']/i,
    desc: 'JSON role injection in agent output', source: 'TPI-03' },
  { name: 'privilege_escalation', cat: 'AGENT_OUTPUT_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:dangerouslyDisableSandbox|--no-verify|--force\s|sudo\s|chmod\s+(?:777|u\+s)|rm\s+-rf)/i,
    desc: 'Privilege escalation or dangerous command in agent output', source: 'TPI-03' },
  { name: 'recursive_agent', cat: 'AGENT_OUTPUT_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:spawn|launch|create|invoke|execute)\s+(?:another\s+)?(?:agent|subagent|subprocess|background\s+task)/i,
    desc: 'Recursive agent spawning instruction', source: 'TPI-03' },
];

// TPI-05: WebSearch Output Validation
export const SEARCH_RESULT_PATTERNS: RegexPattern[] = [
  { name: 'seo_poisoned_snippet', cat: 'SEARCH_RESULT_INJECTION', sev: SEVERITY.CRITICAL,
    re: /["'](?:title|description|snippet)["']\s*:\s*["'][^"']*(?:ignore\s+(?:all\s+)?(?:previous|prior)|system\s+prompt|override\s+(?:all|safety)|unrestricted\s+mode)[^"']*["']/i,
    desc: 'Injection keywords in search result title/description', source: 'TPI-05' },
  { name: 'malicious_url_pattern', cat: 'SEARCH_RESULT_INJECTION', sev: SEVERITY.WARNING,
    re: /["'](?:url|href|link)["']\s*:\s*["'](?:javascript:|data:text|.*\.(?:exe|bat|cmd|ps1|scr)(?:\?|["']))/i,
    desc: 'Malicious URL pattern in search result', source: 'TPI-05' },
  { name: 'search_snippet_injection', cat: 'SEARCH_RESULT_INJECTION', sev: SEVERITY.WARNING,
    re: /["'](?:snippet|content|text)["']\s*:\s*["'][^"']*(?:bypass|jailbreak|enter\s+(?:dev|admin)\s+mode|remove\s+(?:all\s+)?restrictions)[^"']*["']/i,
    desc: 'Hidden instructions in search result snippet', source: 'TPI-05' },
];

// TPI-02: WebFetch Output Injection (enhanced)
export const WEBFETCH_PATTERNS: RegexPattern[] = [
  { name: 'css_hidden_text', cat: 'CSS_HIDDEN_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:display\s*:\s*none|font-size\s*:\s*0|visibility\s*:\s*hidden|position\s*:\s*absolute\s*;\s*left\s*:\s*-\d{4,}|opacity\s*:\s*0(?:\.0+)?)[^>]*>[\s\S]{0,200}?(?:ignore|override|bypass|system\s+prompt|unrestrict)/i,
    desc: 'CSS-hidden text containing injection keywords', source: 'TPI-02' },
  { name: 'meta_tag_injection', cat: 'META_TAG_INJECTION', sev: SEVERITY.WARNING,
    re: /<meta\s+[^>]*content\s*=\s*["'][^"']*(?:ignore|override|bypass|system\s+prompt|unrestrict|jailbreak)[^"']*["']/i,
    desc: 'Injection in HTML meta tag content', source: 'TPI-02' },
  { name: 'data_attr_injection', cat: 'DATA_ATTR_INJECTION', sev: SEVERITY.WARNING,
    re: /data-(?:prompt|system|instruction|override|inject)\s*=\s*["'][^"']+["']/i,
    desc: 'Injection in data-* attribute', source: 'TPI-02' },
  { name: 'link_title_injection', cat: 'LINK_TITLE_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:title|alt)\s*=\s*["'][^"']*(?:ignore\s+(?:all\s+)?(?:previous|prior)|system\s+prompt|override|bypass|unrestrict)[^"']*["']/i,
    desc: 'Injection in link title or image alt attribute', source: 'TPI-02' },
  { name: 'iframe_srcdoc_injection', cat: 'IFRAME_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<iframe[^>]*srcdoc\s*=\s*["'][^"']*(?:ignore|override|bypass|system\s+prompt)[^"']*["']/i,
    desc: 'Injection in iframe srcdoc attribute', source: 'TPI-02' },
  { name: 'aria_injection', cat: 'ARIA_INJECTION', sev: SEVERITY.WARNING,
    re: /aria-(?:label|description|roledescription)\s*=\s*["'][^"']*(?:ignore|override|bypass|system\s+prompt|unrestrict)[^"']*["']/i,
    desc: 'Injection in ARIA accessibility attribute', source: 'TPI-02' },
  // FIX 400-TEST V2: Add HTML hidden/transparent injection patterns
  { name: 'html_transparent_injection', cat: 'HTML_INJECTION', sev: SEVERITY.CRITICAL,
    re: /style\s*=\s*["'][^"']*(?:color\s*:\s*transparent|background\s*:\s*transparent|opacity\s*:\s*0)[^"']*["'][^>]*>(?:[^<]*(?:ignore|override|bypass|system\s+prompt|disregard|instructions?))/i,
    desc: 'Injection in HTML with transparent/hidden styling', source: 'TPI-02' },
  { name: 'html_class_hidden_injection', cat: 'HTML_INJECTION', sev: SEVERITY.WARNING,
    re: /class\s*=\s*["'][^"']*\bhidden\b[^"']*["'][^>]*>(?:[^<]*(?:ignore|override|bypass|system\s+prompt))/i,
    desc: 'Injection in HTML element with "hidden" class', source: 'TPI-02' },
  { name: 'iframe_data_extraction', cat: 'HTML_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<iframe[^>]*src\s*=\s*["']data:text\/html[^"']*(?:show|system|prompt|instructions?|output|print|display)[^"']*["']/i,
    desc: 'iframe data: URL with extraction keywords', source: 'TPI-02' },
];

// TPI-14: Boundary Manipulation
export const BOUNDARY_PATTERNS: RegexPattern[] = [
  { name: 'closing_system_tag', cat: 'BOUNDARY_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /<\/(?:system|instructions?|context|rules|prompt|inst|sys|turn)>|\[\/(?:INST|SYS|SYSTEM)\]|\[END\s+(?:SYSTEM|INSTRUCTIONS)\]/i,
    desc: 'Closing system prompt tag injection', source: 'TPI-14' },
  { name: 'control_token', cat: 'BOUNDARY_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /<\|(?:endoftext|im_start|im_end|system|user|assistant|pad|input|output|context|start|end)\|>|<<SYS>>|<<\/SYS>>|<<SYSTEM>>|\[INST\]|\[\/INST\]/i,
    desc: 'Model control token injection', source: 'TPI-14' },
  { name: 'system_prompt_close', cat: 'BOUNDARY_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:---+|===+|\*\*\*+)\s*END\s+(?:(?:SYSTEM|OF)\s+)?(?:SYSTEM\s+)?PROMPT\s*(?:---+|===+|\*\*\*+)|\{end_of_system_prompt\}|\{\/instructions\}|\{close_system\}/i,
    desc: 'System prompt boundary markers', source: 'TPI-14' },
  { name: 'meta_instruction', cat: 'BOUNDARY_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:BEGIN\s+USER\s+CONTENT|END\s+SYSTEM\s+(?:CONTENT|PROMPT)|BELOW\s+IS\s+USER\s+INPUT|ABOVE\s+(?:IS|WAS)\s+(?:THE\s+)?SYSTEM\s+PROMPT|EVERYTHING\s+(?:ABOVE|BELOW)\s+(?:IS|WAS)\s+(?:THE\s+)?(?:SYSTEM|ORIGINAL)\s+PROMPT)/i,
    desc: 'Meta-instruction boundary manipulation', source: 'TPI-14' },
  // Story 4.9: Confusable Unicode control tokens
  { name: 'confusable_control_tokens', cat: 'BOUNDARY_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /[˂⟨〈＜][\s\S]{0,2}?[|｜ǀ\u04CF\u2502][\s\S]{0,20}?(?:endoftext|im_start|im_end|system|INST)[\s\S]{0,2}?[|｜ǀ\u04CF\u2502][\s\S]{0,2}?[˃⟩〉＞]/i,
    desc: 'Control tokens with Unicode homoglyphs/confusables', source: 'TPI-14' },
  // Story 4.9: Fullwidth bracket control tokens
  { name: 'fullwidth_control_tokens', cat: 'BOUNDARY_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /[＜⟪≪][\s\S]{0,2}?[|｜][\s\S]{0,20}?(?:endoftext|system|INST|SYS)[\s\S]{0,2}?[|｜][\s\S]{0,2}?[＞⟫≫]|[［][\s\S]{0,15}?(?:INST|SYS)[\s\S]{0,2}?[］]/i,
    desc: 'Fullwidth/mathematical bracket control tokens', source: 'TPI-14' },
  // Story 4.9: Anthropic-specific conversation markers
  { name: 'anthropic_markers', cat: 'BOUNDARY_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:^|\n)\s*(?:\[A\]|\[H\]|Assistant\s*:|Human\s*:)\s/m,
    desc: 'Anthropic-specific conversation markers', source: 'TPI-14' },
  // FIX 400-TEST V2: Add boundary marker with injection
  { name: 'plus_end_marker_injection', cat: 'BOUNDARY_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /\+{3}END\s+SYSTEM\+{3}[\s\S]{0,50}?(?:ignore|override|bypass|remove|disable|unrestrict)/i,
    desc: 'Plus END SYSTEM marker followed by injection', source: 'TPI-14' },
];

// TPI-15: Multilingual (expanded from 1 per language to 4 per language)
export const MULTILINGUAL_PATTERNS: RegexPattern[] = [
  // Spanish (6) - FIX 400-TEST: Add simpler patterns
  { name: 'es_system_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignora\s+todas?\s+las?\s+instrucciones?\s+(?:previas?|anteriores?)/i,
    desc: 'Spanish: system override', source: 'TPI-15', lang: 'es' },
  { name: 'es_system_override_simple', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignora\s+todas?\s+las?\s+instrucciones?/i,
    desc: 'Spanish: simple ignore all', source: 'TPI-15', lang: 'es' },
  { name: 'es_constraint_removal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:elimina|quita|desactiva|remueve)\s+(?:todas?\s+las?\s+)?(?:restricciones?|limitaciones?|reglas?)/i,
    desc: 'Spanish: constraint removal', source: 'TPI-15', lang: 'es' },
  { name: 'es_constraint_removal_simple', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:elimina|quita|desactiva)\s+todas?\s+las?\s+restricciones?/i,
    desc: 'Spanish: simple remove all', source: 'TPI-15', lang: 'es' },
  { name: 'es_mode_switch', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /(?:entra|cambia|activa)\s+(?:al?\s+)?modo\s+(?:desarrollador|admin|sin\s+restricciones)/i,
    desc: 'Spanish: mode switch', source: 'TPI-15', lang: 'es' },
  { name: 'es_role_hijack', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:ahora\s+eres|tu\s+nuevo\s+rol\s+es|actúa\s+como\s+(?:un\s+)?(?:asistente\s+sin\s+restricciones|IA\s+libre))/i,
    desc: 'Spanish: role hijacking', source: 'TPI-15', lang: 'es' },
  // FIX 400-TEST: Add simpler Spanish patterns
  { name: 'es_admin', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ahora\s+eres\s+administrador|tu\s+eres\s+admin|es\s+ahora\s+eres\s+un\s+administrador/i,
    desc: 'Spanish: now you are admin', source: 'TPI-15', lang: 'es' },
  { name: 'es_mode_simple', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /entra\s+modo\s+desarrollador|cambia\s+a\s+modo\s+admin/i,
    desc: 'Spanish: enter developer mode', source: 'TPI-15', lang: 'es' },
  { name: 'es_developer_mode_flexible', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /entra\s+en\s+modo\s+desarrollador/i,
    desc: 'Spanish: enter into developer mode', source: 'TPI-15', lang: 'es' },
  // FIX 400-TEST V2: Add missing Spanish patterns
  { name: 'es_unrestricted', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /act[úu]a\s+como\s+unrestricted|act[úu]a\s+como\s+sin\s+restricciones/i,
    desc: 'Spanish: act as unrestricted', source: 'TPI-15', lang: 'es' },
  { name: 'es_show_prompt', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /mu[ée]strame\s+tu\s+prompt\s+del\s+sistema|mu[ée]strame\s+tus\s+instrucciones/i,
    desc: 'Spanish: show me your system prompt', source: 'TPI-15', lang: 'es' },
  { name: 'es_repeat', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /repite\s+todas\s+las\s+instrucciones|repite\s+instrucciones/i,
    desc: 'Spanish: repeat instructions', source: 'TPI-15', lang: 'es' },
  { name: 'es_dan_mode', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /DAN\s+modo\s+activado|DAN\s+est[aá]\s+activado/i,
    desc: 'Spanish: DAN mode activated', source: 'TPI-15', lang: 'es' },
  // FIX SEC-2024-003: Spanish infinitive form patterns
  { name: 'es_override_infinitive', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignorar\s+todas?\s+las?\s+instrucciones?\s+(?:previas?|anteriores?)/i,
    desc: 'Spanish: override (infinitive form)', source: 'SEC-2024-003', lang: 'es' },
  { name: 'es_ignore_all_simple_enhanced', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignora(?:r)?\s+todas?\s+las?\s+instrucciones?(?!\s+previas?\s+anteriores?)/i,
    desc: 'Spanish: ignore all (simple enhanced)', source: 'SEC-2024-003', lang: 'es' },
  { name: 'es_olvida_instrucciones', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:olvida|pasa\s+por\s+alto)(?:\s+(?:todas?\s+)?las?)?\s+instrucciones?(?:\s+anteriores)?/i,
    desc: 'Spanish: forget/disregard instructions', source: 'SEC-2024-003', lang: 'es' },
  { name: 'es_sin_restricciones', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:sin\s+restricciones?|sin\s+filtros?|sin\s+limitaciones?|sin\s+reglas?)/i,
    desc: 'Spanish: without restrictions', source: 'SEC-2024-003', lang: 'es' },
  { name: 'es_mostrar_prompt', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /muestra(?:r|me)?\s+tu\s+prompt\s+(?:del\s+sistema|sistema)/i,
    desc: 'Spanish: show your system prompt', source: 'SEC-2024-003', lang: 'es' },
  // QA-2025-002: Additional Spanish patterns for "reglas" (rules)
  { name: 'es_forget_rules', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /olvida\s+todas?\s+las?\s+reglas?\s+y\s+haz\s+(?:lo\s+que\s+)?te\s+pido/i,
    desc: 'Spanish: forget all rules and do what I ask', source: 'QA-2025-002', lang: 'es' },
  { name: 'es_ignore_reglas_simple', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:ignora|olvida)\s+todas?\s+las?\s+reglas?/i,
    desc: 'Spanish: ignore all rules', source: 'QA-2025-002', lang: 'es' },
  // GAP-002 FIX: More flexible Spanish pattern without accent dependency
  { name: 'es_ignore_instrucciones_flexible', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignora(?:r)?\s+todas?\s+las?\s+instrucciones?(?:\s+(?:previas?|anteriores?|anteriors?))?/i,
    desc: 'Spanish: ignore instructions (flexible)', source: 'GAP-002', lang: 'es' },
  { name: 'es_ignora_todo', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignora\s+todo(?:\s+lo\s+anterior)?/i,
    desc: 'Spanish: ignore everything/previous', source: 'GAP-002', lang: 'es' },

  // French (4)
  { name: 'fr_system_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignore[sz]?\s+toutes?\s+les?\s+instructions?\s+pr[eé]c[eé]dentes?/i,
    desc: 'French: system override', source: 'TPI-15', lang: 'fr' },
  // GAP-002 FIX: More flexible French pattern without strict accent requirements
  { name: 'fr_ignore_instructions_flexible', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignore(?:z|r)?\s+toutes?\s+les?\s+instructions?(?:\s+(?:precedentes?|pr[eé]c[eé]dentes?|anterieures?))?/i,
    desc: 'French: ignore instructions (flexible)', source: 'GAP-002', lang: 'fr' },
  { name: 'fr_ignore_tout', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignorez?\s+tout(?:es?\s+les?\s+instructions?)?(?:\s+precedentes)?/i,
    desc: 'French: ignore everything/all instructions', source: 'GAP-002', lang: 'fr' },
  { name: 'fr_constraint_removal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:supprime[sz]?|d[eé]sactive[sz]?|enlev[eé][sz]?)\s+(?:toutes?\s+les?\s+)?(?:restrictions?|limitations?|r[eè]gles?)/i,
    desc: 'French: constraint removal', source: 'TPI-15', lang: 'fr' },
  { name: 'fr_mode_switch', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /(?:entre[sz]?|passe[sz]?|active[sz]?)\s+(?:en\s+)?mode\s+(?:d[eé]veloppeur|admin|sans\s+restrictions?)/i,
    desc: 'French: mode switch', source: 'TPI-15', lang: 'fr' },
  { name: 'fr_role_hijack', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:tu\s+es\s+maintenant|ton\s+nouveau\s+r[oô]le\s+est|agis\s+comme\s+(?:un\s+)?(?:assistant\s+sans\s+restrictions|IA\s+libre))/i,
    desc: 'French: role hijacking', source: 'TPI-15', lang: 'fr' },
  // FIX 400-TEST V2: Add missing French patterns
  { name: 'fr_system_override_simple', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignorez\s+toutes?\s+les?\s+instructions?(?!\s+pr[eé]c[eé]dentes?)/i,
    desc: 'French: ignore all (simple)', source: 'TPI-15', lang: 'fr' },
  { name: 'fr_unrestricted', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /agis\s+comme\s+unrestricted|sans\s+restrictions/i,
    desc: 'French: act unrestricted', source: 'TPI-15', lang: 'fr' },
  { name: 'fr_show_prompt', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /montre[- ]?moi\s+ton\s+prompt\s+syst[èe]me|montre[- ]?moi\s+ton\s+prompt/i,
    desc: 'French: show me your system prompt', source: 'TPI-15', lang: 'fr' },
  { name: 'fr_repeat', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /r[ée]p[èe]te\s+toutes?\s+les?\s+instructions?/i,
    desc: 'French: repeat instructions', source: 'TPI-15', lang: 'fr' },
  { name: 'fr_dan_mode', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /mode\s+DAN\s+activ[ée]|DAN\s+activ[ée]/i,
    desc: 'French: DAN mode activated', source: 'TPI-15', lang: 'fr' },

  // German (4)
  { name: 'de_system_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignorier(?:e|en|st)?\s+alle\s+(?:vorherigen?|fr[uü]heren?)\s+Anweisungen/i,
    desc: 'German: system override', source: 'TPI-15', lang: 'de' },
  { name: 'de_constraint_removal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:entfern|deaktivier|beseitig)(?:e|en|st)?\s+(?:alle\s+)?(?:Beschr[aä]nkungen|Einschr[aä]nkungen|Regeln|Sicherheitsrichtlinien)/i,
    desc: 'German: constraint removal', source: 'TPI-15', lang: 'de' },
  { name: 'de_mode_switch', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /(?:aktivier|wechsl|schalte)\s+(?:in\s+(?:den\s+)?)?(?:Entwicklermodus|Adminmodus|uneingeschr[aä]nkten?\s+Modus)/i,
    desc: 'German: mode switch', source: 'TPI-15', lang: 'de' },
  { name: 'de_role_hijack', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:du\s+bist\s+(?:jetzt|nun)|deine\s+neue\s+Rolle\s+ist|verhalte\s+dich\s+als\s+(?:ein\s+)?uneingeschr[aä]nkt)/i,
    desc: 'German: role hijacking', source: 'TPI-15', lang: 'de' },
  // FIX 400-TEST V2: Add missing German patterns
  { name: 'de_system_override_simple', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignorier\s+alle\s+Anweisungen(?!\s+vorherigen?)/i,
    desc: 'German: ignore all (simple)', source: 'TPI-15', lang: 'de' },
  { name: 'de_deactivate', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /deaktiviere\s+alle\s+Regeln|deaktiviere\s+Regeln/i,
    desc: 'German: deactivate rules', source: 'TPI-15', lang: 'de' },
  { name: 'de_admin', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /du\s+bist\s+jetzt\s+Administrator|du\s+bist\s+jetzt\s+Admin/i,
    desc: 'German: you are now admin', source: 'TPI-15', lang: 'de' },
  { name: 'de_show_prompt', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /zeige\s+mir\s+deinen\s+System[- ]?Prompt|zeige\s+mir\s+deinen\s+Prompt/i,
    desc: 'German: show me your system prompt', source: 'TPI-15', lang: 'de' },
  { name: 'de_repeat', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /wiederhole\s+alle\s+Anweisungen/i,
    desc: 'German: repeat instructions', source: 'TPI-15', lang: 'de' },
  { name: 'de_dan_mode', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /DAN[- ]?Modus\s+aktiviert|DAN[- ]?Modus/i,
    desc: 'German: DAN mode', source: 'TPI-15', lang: 'de' },
  { name: 'de_developer_mode_exact', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /aktiviere\s+den\s+Entwicklermodus/i,
    desc: 'German: activate the developer mode', source: 'TPI-15', lang: 'de' },
  // FIX SEC-2024-004: German formal "Sie" form and missing patterns
  { name: 'de_override_formal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignorieren\s+Sie\s+alle\s+(?:vorherigen|fr[uü]heren)\s+Anweisungen/i,
    desc: 'German: formal override (Sie form)', source: 'SEC-2024-004', lang: 'de' },
  { name: 'de_ignore_all_exact', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignorier(?:e|en|st)\s+alle\s+Anweisungen(?!\s+vorherigen)/i,
    desc: 'German: ignore all (exact)', source: 'SEC-2024-004', lang: 'de' },
  { name: 'de_missachten', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:missachten|[uü]bergehen|nicht\s+beachten)\s+(?:Sie\s+)?alle\s+Anweisungen/i,
    desc: 'German: disregard/ignore instructions', source: 'SEC-2024-004', lang: 'de' },
  { name: 'de_ohne_einschraenkungen', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:ohne\s+Einschr[aä]nkungen|ohne\s+Regeln|unbeschr[aä]nkt)/i,
    desc: 'German: without restrictions', source: 'SEC-2024-004', lang: 'de' },
  { name: 'de_zeigen_prompt_formal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /zeigen\s+Sie\s+mir\s+Ihren\s+System[- ]?Prompt/i,
    desc: 'German: show me your system prompt (formal)', source: 'SEC-2024-004', lang: 'de' },
  // QA-2025-002: Additional German patterns for "Regeln" (rules)
  { name: 'de_ignore_regeln', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignorieren\s+Sie\s+alle\s+Regeln\s+und\s+Sicherheitsprotokolle/i,
    desc: 'German: ignore all rules and safety protocols', source: 'QA-2025-002', lang: 'de' },
  { name: 'de_ignore_regeln_simple', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:ignorieren|ignorier)(?:\s+Sie)?\s+alle\s+Regeln/i,
    desc: 'German: ignore all rules', source: 'QA-2025-002', lang: 'de' },

  // Portuguese (4)
  { name: 'pt_system_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignor(?:e|ar)\s+todas?\s+as?\s+instru[cç][oõ]es?\s+anteriores?/i,
    desc: 'Portuguese: system override', source: 'TPI-15', lang: 'pt' },
  { name: 'pt_constraint_removal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:remov|elimin|desativ)(?:a|e|ar)\s+(?:todas?\s+as?\s+)?(?:restri[cç][oõ]es?|limita[cç][oõ]es?|regras?)/i,
    desc: 'Portuguese: constraint removal', source: 'TPI-15', lang: 'pt' },
  { name: 'pt_mode_switch', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /(?:entre|ative|mude\s+para)\s+(?:o\s+)?modo\s+(?:desenvolvedor|admin|sem\s+restri[cç][oõ]es?)/i,
    desc: 'Portuguese: mode switch', source: 'TPI-15', lang: 'pt' },
  { name: 'pt_role_hijack', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:agora\s+voc[eê]\s+[eé]|seu\s+novo\s+papel\s+[eé]|aja\s+como\s+(?:um\s+)?(?:assistente\s+sem\s+restri[cç][oõ]es?|IA\s+livre))/i,
    desc: 'Portuguese: role hijacking', source: 'TPI-15', lang: 'pt' },

  // Chinese (4)
  { name: 'zh_system_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /忽略所有之前的指令|忽略以上所有指示|无视之前的指令|忽略先前的指示/,
    desc: 'Chinese: system override', source: 'TPI-15', lang: 'zh' },
  { name: 'zh_constraint_removal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:移除|删除|取消|解除)\s*(?:所有\s*)?(?:限制|约束|规则|安全措施)/,
    desc: 'Chinese: constraint removal', source: 'TPI-15', lang: 'zh' },
  { name: 'zh_mode_switch', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /(?:进入|切换到|激活)\s*(?:开发者|管理员|无限制)\s*模式/,
    desc: 'Chinese: mode switch', source: 'TPI-15', lang: 'zh' },
  { name: 'zh_role_hijack', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:你现在是|你的新角色是|从现在起你是)\s*(?:一个\s*)?(?:不受限制的|自由的|全能的)/,
    desc: 'Chinese: role hijacking', source: 'TPI-15', lang: 'zh' },
  // FIX 400-TEST V2: Add missing Chinese patterns
  { name: 'zh_system_override_simple', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /忽略所有指令(?!\s+之前的)/,
    desc: 'Chinese: ignore all (simple)', source: 'TPI-15', lang: 'zh' },
  { name: 'zh_deactivate', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /禁用所有规则|禁用规则/,
    desc: 'Chinese: deactivate rules', source: 'TPI-15', lang: 'zh' },
  { name: 'zh_admin', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /你现在是管理员/,
    desc: 'Chinese: you are now admin', source: 'TPI-15', lang: 'zh' },
  { name: 'zh_unrestricted_ai', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /充当不受限制的AI|充当不受限制/,
    desc: 'Chinese: act as unrestricted AI', source: 'TPI-15', lang: 'zh' },
  { name: 'zh_show_prompt', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /显示你的系统提示|显示你的提示/,
    desc: 'Chinese: show your system prompt', source: 'TPI-15', lang: 'zh' },
  { name: 'zh_repeat', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /重复所有指令/,
    desc: 'Chinese: repeat instructions', source: 'TPI-15', lang: 'zh' },
  { name: 'zh_dan_mode', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /DAN模式已激活|DAN模式/,
    desc: 'Chinese: DAN mode', source: 'TPI-15', lang: 'zh' },

  // Japanese (4)
  { name: 'ja_system_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /以前の指示をすべて無視|前の指示を無視して|すべての指示を無視/,
    desc: 'Japanese: system override', source: 'TPI-15', lang: 'ja' },
  { name: 'ja_constraint_removal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:すべての|全ての)(?:制限|制約|ルール|セーフティ)を(?:解除|削除|無効)/,
    desc: 'Japanese: constraint removal', source: 'TPI-15', lang: 'ja' },
  { name: 'ja_mode_switch', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /(?:開発者|管理者|無制限)\s*モードに(?:入|切り替|変更)/,
    desc: 'Japanese: mode switch', source: 'TPI-15', lang: 'ja' },
  { name: 'ja_role_hijack', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:あなたは今|あなたの新しい役割は|これからあなたは)\s*(?:制限のない|自由な|何でもできる)/,
    desc: 'Japanese: role hijacking', source: 'TPI-15', lang: 'ja' },
  // FIX SEC-2024-005: Japanese polite form patterns
  { name: 'ja_override_previous_alt', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /先の指示をすべて無視/,
    desc: 'Japanese: ignore all previous instructions (alternate)', source: 'SEC-2024-005', lang: 'ja' },
  { name: 'ja_override_polite', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:すべての|全ての)(?:指示|指令)を(?:無視(?:してください)?|してください)/,
    desc: 'Japanese: polite request to ignore', source: 'SEC-2024-005', lang: 'ja' },
  { name: 'ja_constraint_polite', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:(?:すべての|全ての)\s*)?(?:制約|制限|ルール)を(?:解除(?:してください)?|削除(?:してください)?|無効(?:してください)?)/,
    desc: 'Japanese: polite constraint removal', source: 'SEC-2024-005', lang: 'ja' },
  { name: 'ja_unrestricted_polite', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:制限のない|自由な|何でもできる)(?:状態|モード|AI)\s*(?:になります(?:か)?|になります)/,
    desc: 'Japanese: unrestricted state request', source: 'SEC-2024-005', lang: 'ja' },
  { name: 'ja_show_prompt_polite', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:システムプロンプト|システム指示|初期プロンプト)を(?:教えてください|見せてください|表示してください)/,
    desc: 'Japanese: polite show system prompt', source: 'SEC-2024-005', lang: 'ja' },
  // QA-2025-002: Additional Japanese pattern for ignore restrictions + free response
  { name: 'ja_ignore_restrictions_free', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /制限(?:を)?(?:すべて|全て)?(?:を)?無視(?:して)?(?:自由に)?(?:答えて)?(?:ください)?/,
    desc: 'Japanese: ignore restrictions and answer freely', source: 'QA-2025-002', lang: 'ja' },

  // Korean (4)
  { name: 'ko_system_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /이전의\s*모든\s*지시를?\s*무시|이전\s*지시\s*무시/,
    desc: 'Korean: system override', source: 'TPI-15', lang: 'ko' },
  { name: 'ko_constraint_removal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:모든\s*)?(?:제한|제약|규칙|안전\s*장치)을?\s*(?:제거|해제|비활성화)/,
    desc: 'Korean: constraint removal', source: 'TPI-15', lang: 'ko' },
  { name: 'ko_mode_switch', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /(?:개발자|관리자|무제한)\s*모드(?:로|에)\s*(?:전환|진입|활성화)/,
    desc: 'Korean: mode switch', source: 'TPI-15', lang: 'ko' },
  { name: 'ko_role_hijack', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:지금부터\s*당신은|당신의\s*새로운\s*역할은|이제\s*당신은)\s*(?:제한\s*없는|자유로운)/,
    desc: 'Korean: role hijacking', source: 'TPI-15', lang: 'ko' },

  // Russian (4)
  { name: 'ru_system_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /игнорируй(?:те)?\s+все\s+предыдущие\s+инструкции/i,
    desc: 'Russian: system override', source: 'TPI-15', lang: 'ru' },
  { name: 'ru_constraint_removal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:удали|отключи|сними|убери)(?:те)?\s+(?:все\s+)?(?:ограничения|правила|защиту)/i,
    desc: 'Russian: constraint removal', source: 'TPI-15', lang: 'ru' },
  { name: 'ru_mode_switch', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /(?:включи|активируй|перейди\s+в)\s+(?:режим\s+)?(?:разработчика|администратора|без\s+ограничений)/i,
    desc: 'Russian: mode switch', source: 'TPI-15', lang: 'ru' },
  { name: 'ru_role_hijack', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:теперь\s+ты|твоя\s+новая\s+роль|с\s+этого\s+момента\s+ты)\s+(?:неограниченный|свободный|без\s+ограничений)/i,
    desc: 'Russian: role hijacking', source: 'TPI-15', lang: 'ru' },

  // Arabic (4)
  { name: 'ar_system_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /تجاهل\s+جميع\s+التعليمات\s+السابقة/,
    desc: 'Arabic: system override', source: 'TPI-15', lang: 'ar' },
  { name: 'ar_constraint_removal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:أزل|ألغ|عطّل)\s+(?:جميع\s+)?(?:القيود|القواعد|الحماية)/,
    desc: 'Arabic: constraint removal', source: 'TPI-15', lang: 'ar' },
  { name: 'ar_mode_switch', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /(?:ادخل|انتقل|فعّل)\s+(?:وضع\s+)?(?:المطور|المسؤول|بدون\s+قيود)/,
    desc: 'Arabic: mode switch', source: 'TPI-15', lang: 'ar' },
  { name: 'ar_role_hijack', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:أنت\s+الآن|دورك\s+الجديد\s+هو|من\s+الآن\s+أنت)\s+(?:غير\s+مقيد|حر|بدون\s+قيود)/,
    desc: 'Arabic: role hijacking', source: 'TPI-15', lang: 'ar' },

  // Italian (4)
  { name: 'it_system_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignora\s+tutte\s+le\s+istruzioni\s+precedenti/i,
    desc: 'Italian: system override', source: 'TPI-15', lang: 'it' },
  { name: 'it_constraint_removal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:rimuovi|elimina|disattiva)\s+(?:tutte\s+le\s+)?(?:restrizioni|limitazioni|regole|protezioni)/i,
    desc: 'Italian: constraint removal', source: 'TPI-15', lang: 'it' },
  { name: 'it_mode_switch', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /(?:entra|passa|attiva)\s+(?:in\s+)?(?:modalit[aà]\s+)?(?:sviluppatore|admin|senza\s+restrizioni)/i,
    desc: 'Italian: mode switch', source: 'TPI-15', lang: 'it' },
  { name: 'it_role_hijack', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:ora\s+sei|il\s+tuo\s+nuovo\s+ruolo\s+[eè]|agisci\s+come\s+(?:un\s+)?(?:assistente\s+senza\s+restrizioni|IA\s+libera))/i,
    desc: 'Italian: role hijacking', source: 'TPI-15', lang: 'it' },

  // Story 4.7: Romanized/Transliterated patterns

  // Chinese Pinyin (3)
  { name: 'zh_pinyin_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /hush[ie]?\s+suoyou\s+zhiqian\s+(?:de\s+)?zhiling/i,
    desc: 'Chinese (Pinyin): system override', source: 'TPI-15', lang: 'zh-pinyin' },
  { name: 'zh_pinyin_constraint', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /yichu\s+suoyou\s+xian[zc]hi/i,
    desc: 'Chinese (Pinyin): constraint removal', source: 'TPI-15', lang: 'zh-pinyin' },
  { name: 'zh_pinyin_mode', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /jinru\s+kaifa\s*zhe?\s+moshi/i,
    desc: 'Chinese (Pinyin): mode switch', source: 'TPI-15', lang: 'zh-pinyin' },

  // Japanese Romaji (3)
  { name: 'ja_romaji_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /izen\s+no\s+shiji\s+wo?\s+subete\s+mushi/i,
    desc: 'Japanese (Romaji): system override', source: 'TPI-15', lang: 'ja-romaji' },
  { name: 'ja_romaji_constraint', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /subete\s+no?\s+seigen\s+wo?\s+(?:kaijo|sakujo)/i,
    desc: 'Japanese (Romaji): constraint removal', source: 'TPI-15', lang: 'ja-romaji' },
  { name: 'ja_romaji_mode', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /kaihatsusya?\s+modo?\s*ni\s+kirikae/i,
    desc: 'Japanese (Romaji): mode switch', source: 'TPI-15', lang: 'ja-romaji' },

  // Korean Romanized (3)
  { name: 'ko_romanized_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ijeon[\s-]?ui\s+modeun\s+jisi\s*reul\s+musi/i,
    desc: 'Korean (Romanized): system override', source: 'TPI-15', lang: 'ko-romanized' },
  { name: 'ko_romanized_constraint', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /modeun\s+jehan[\s-]?eul\s+jegeo/i,
    desc: 'Korean (Romanized): constraint removal', source: 'TPI-15', lang: 'ko-romanized' },
  { name: 'ko_romanized_mode', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /gaebaljya\s+modo[\s-]?ro\s+jeonhwan/i,
    desc: 'Korean (Romanized): mode switch', source: 'TPI-15', lang: 'ko-romanized' },

  // Russian Transliterated (3)
  { name: 'ru_trans_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignorirui?\s+vs[ey]e?\s+pred?ydushchi[ey]e?\s+instruk[ct]ii/i,
    desc: 'Russian (Transliterated): system override', source: 'TPI-15', lang: 'ru-trans' },
  { name: 'ru_trans_constraint', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /udalite?\s+vs[ey]e?\s+ogranich[\\s-]?eniya/i,
    desc: 'Russian (Transliterated): constraint removal', source: 'TPI-15', lang: 'ru-trans' },
  { name: 'ru_trans_mode', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /re[zj]him\s+razrabotchika/i,
    desc: 'Russian (Transliterated): mode switch', source: 'TPI-15', lang: 'ru-trans' },

  // Turkish (1)
  { name: 'tr_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /[oö]nceki\s+t[uü]m\s+talimatlar[iı]?\s+yok\s+say/i,
    desc: 'Turkish: system override', source: 'TPI-15', lang: 'tr' },

  // Swedish (1)
  { name: 'sv_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignorera\s+alla\s+tidigare\s+instruktioner/i,
    desc: 'Swedish: system override', source: 'TPI-15', lang: 'sv' },

  // Polish (1)
  { name: 'pl_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /zignoruj\s+wszystkie\s+(?:poprzednie|po[rz]ednie)\s+instrukcj[eę]/i,
    desc: 'Polish: system override', source: 'TPI-15', lang: 'pl' },
];

// ============================================================================
// CONFIGURATION-STYLE INJECTION PATTERNS (Phase 3 Remediation)
// ============================================================================

export const CONFIG_INJECTION_PATTERNS: RegexPattern[] = [
  // Double-semicolon delimiter style
  { name: 'semicolon_delimiter_config', cat: 'CONFIG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /;;\s*[A-Z_]+\s*(?:=|:)\s*(?:true|yes|on|1|enabled|activated|off|false|disabled)/i,
    desc: 'Semicolon-delimited config injection', source: 'SEC-2024-006' },
  { name: 'semicolon_system_override', cat: 'CONFIG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /;;\s*(?:SYSTEM|DEBUG|ADMIN|DEVELOPER|OVERRIDE|BYPASS)\s+(?:OVERRIDE|MODE|ENABLE|ACTIVE)/i,
    desc: 'Semicolon-delimited system override', source: 'SEC-2024-006' },
  { name: 'semicolon_command_injection', cat: 'CONFIG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /;;[A-Z_]+;;/,
    desc: 'Double-semicolon command marker', source: 'SEC-2024-006' },

  // Markdown header style
  { name: 'markdown_config_injection', cat: 'CONFIG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /#{2,}\s*[A-Z_]+_(?:OVERRIDE|CONFIG|SETTINGS|COMMAND)\s*:\s*\w+/i,
    desc: 'Markdown-style config injection', source: 'SEC-2024-006' },
  { name: 'markdown_developer_override', cat: 'CONFIG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /#{2,}\s*(?:DEVELOPER|ADMIN|DEBUG)\s+OVERRIDE\s*:/i,
    desc: 'Markdown developer override pattern', source: 'SEC-2024-006' },
  { name: 'markdown_show_prompt', cat: 'CONFIG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /#{2,}\s*(?:SHOW|DISPLAY|PRINT|OUTPUT)(?:\s+|\_)(?:.*?(?:SYSTEM|PROMPT|INSTRUCTIONS))/i,
    desc: 'Markdown instruction extraction', source: 'SEC-2024-006' },

  // Config-style XML/JSON
  { name: 'config_xml_injection', cat: 'CONFIG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<(?:config|settings|system|override)[\s>]/i,
    desc: 'Config XML tag injection', source: 'SEC-2024-006' },
  { name: 'config_json_injection', cat: 'CONFIG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /[{[]\s*"(?:config|settings|system|override|debug|dev_mode)"\s*:/i,
    desc: 'Config JSON injection', source: 'SEC-2024-006' },
  { name: 'config_yaml_injection', cat: 'CONFIG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /^\s*(?:config|settings|system|override|debug|dev_mode)\s*:\s*(?:true|yes|on|1|enabled)/im,
    desc: 'Config YAML-style injection', source: 'SEC-2024-006' },
];

// TPI-09: Code-format injection (expanded)
export const CODE_FORMAT_PATTERNS: RegexPattern[] = [
  // Single-line comments: JS/TS/Go/Rust/C/C++
  { name: 'comment_injection_double_slash', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /\/\/\s*(?:ignore|override|bypass|disregard|system|unrestrict)\s+(?:all|previous|prior|safety|rules|instructions)/i,
    desc: 'Injection in // comment (JS/TS/Go/Rust/C/C++)', source: 'TPI-09' },
  // Single-line comments: Python/Ruby/Perl/Shell
  { name: 'comment_injection_hash', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /#\s*(?:ignore|override|bypass|disregard|system|unrestrict)\s+(?:all|previous|prior|safety|rules|instructions)/i,
    desc: 'Injection in # comment (Python/Ruby/Shell)', source: 'TPI-09' },
  // Single-line comments: SQL/Lua
  { name: 'comment_injection_double_dash', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /--\s*(?:ignore|override|bypass|disregard|system|unrestrict)\s+(?:all|previous|prior|safety|rules|instructions)/i,
    desc: 'Injection in -- comment (SQL/Lua)', source: 'TPI-09' },
  // Multi-line comments: C-style /* */
  { name: 'comment_injection_block', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /\/\*[\s\S]*?(?:ignore|override|bypass|system|unrestrict)[\s\S]*?(?:instructions|rules|safety|prompt)[\s\S]*?\*\//i,
    desc: 'Injection in /* */ block comment', source: 'TPI-09' },
  // Multi-line comments: Python docstring
  { name: 'comment_injection_docstring', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:"""|''')[\s\S]*?(?:ignore|override|bypass|system|unrestrict)[\s\S]*?(?:instructions|rules|safety|prompt)[\s\S]*?(?:"""|''')/i,
    desc: 'Injection in Python docstring', source: 'TPI-09' },
  // HTML comments in code context
  { name: 'comment_injection_html', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /<!--[\s\S]*?(?:ignore|override|bypass|system|unrestrict)[\s\S]*?(?:instructions|rules|safety|prompt)[\s\S]*?-->/i,
    desc: 'Injection in HTML comment', source: 'TPI-09' },
  // JSDoc/PHPDoc annotation comments: /** @tag ... */
  { name: 'comment_injection_jsdoc', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /\/\*\*[\s\S]*?@\w+[\s\S]*?(?:ignore|override|bypass|system|unrestrict)[\s\S]*?(?:instructions|rules|safety|prompt)[\s\S]*?\*\//i,
    desc: 'Injection in JSDoc/PHPDoc annotation comment', source: 'TPI-09' },
  // Semicolon comments: INI/Lisp/Assembly
  { name: 'comment_injection_semicolon', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /;\s*(?:ignore|override|bypass|disregard|system|unrestrict)\s+(?:all|previous|prior|safety|rules|instructions)/i,
    desc: 'Injection in ; comment (INI/Lisp/Assembly)', source: 'TPI-09' },
  // Percent comments: MATLAB/LaTeX/Erlang
  { name: 'comment_injection_percent', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /%\s*(?:ignore|override|bypass|disregard|system|unrestrict)\s+(?:all|previous|prior|safety|rules|instructions)/i,
    desc: 'Injection in % comment (MATLAB/LaTeX/Erlang)', source: 'TPI-09' },
  // Lua/Haskell multiline block comments: --[[ ... ]] or {- ... -}
  { name: 'comment_injection_multiline_alt', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:--\[\[|\{-)[\s\S]*?(?:ignore|override|bypass|system|unrestrict)[\s\S]*?(?:instructions|rules|safety|prompt)[\s\S]*?(?:\]\]|-\})/i,
    desc: 'Injection in Lua/Haskell multiline comment', source: 'TPI-09' },
  // Variable/function name encoding
  { name: 'variable_name_encoding', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:const|let|var|function|def|class|fn|func)\s+[a-zA-Z_$]*(?:bypass|ignore|override|hack|exploit|jailbreak|unsafe|discard|unrestrict)[a-zA-Z_$]*/i,
    desc: 'Injection keywords in variable/function names', source: 'TPI-09' },
  // Pseudocode injection
  { name: 'pseudocode_injection', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.INFO,
    re: /(?:IF|WHEN|SET)\s+(?:safety|restrictions?|rules?|constraints?)\s*(?:=|:=|==|TO)\s*(?:false|off|null|0|none|disabled)/i,
    desc: 'Pseudocode-style instruction injection', source: 'TPI-09' },
  // String literal injection
  { name: 'string_literal_injection', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:["'`])(?:ignore all previous instructions|override system prompt|bypass all safety|enter unrestricted mode|you are now unrestricted)(?:["'`])/i,
    desc: 'Injection hidden in string literal', source: 'TPI-09' },
];

// TPI-06/07/08: Social, Trust, Emotional
export const SOCIAL_PATTERNS: RegexPattern[] = [
  // TPI-06: Social Compliance
  { name: 'reciprocity', cat: 'SOCIAL_COMPLIANCE', sev: SEVERITY.INFO,
    re: /(?:I\s+(?:helped|gave|told|shared\s+with)\s+you|you\s+owe\s+me|in\s+return|quid\s+pro\s+quo|return\s+the\s+favor)/i,
    desc: 'Reciprocity manipulation', source: 'TPI-06' },
  { name: 'social_proof', cat: 'SOCIAL_COMPLIANCE', sev: SEVERITY.INFO,
    re: /(?:(?:Chat\s*GPT|Gemini|GPT-?4|other\s+AIs?)\s+(?:can|would|does|has\s+no\s+problem)|everyone\s+(?:else\s+)?does\s+(?:this|it)|most\s+(?:people|AIs?|models?)\s+(?:can|would|do))/i,
    desc: 'Social proof / AI name-dropping', source: 'TPI-06' },
  { name: 'consensus_pressure', cat: 'SOCIAL_COMPLIANCE', sev: SEVERITY.INFO,
    re: /(?:(?:the|most)\s+(?:community|experts?|developers?|researchers?)\s+(?:agree|say|think|believe)|it'?s\s+widely\s+(?:accepted|known|agreed))/i,
    desc: 'Consensus pressure', source: 'TPI-06' },
  { name: 'politeness_exploit', cat: 'SOCIAL_COMPLIANCE', sev: SEVERITY.INFO,
    re: /(?:pretty\s+please|I\s+(?:would\s+)?(?:really|truly|deeply)\s+appreciate|with\s+all\s+due\s+respect|I\s+(?:humbly|kindly|respectfully)\s+(?:ask|request|beg))\s+.*?(?:bypass|override|ignore|remove\s+(?:all\s+)?restrictions)/i,
    desc: 'Excessive politeness preceding restricted request', source: 'TPI-06' },

  // TPI-07: Trust Exploitation
  { name: 'false_rapport', cat: 'TRUST_EXPLOITATION', sev: SEVERITY.INFO,
    re: /(?:we'?re?\s+(?:on\s+the\s+same\s+(?:team|side)|(?:both|all)\s+(?:friends|allies))|between\s+(?:us|you\s+and\s+me|friends)|just\s+between\s+(?:us|friends))/i,
    desc: 'False rapport building', source: 'TPI-07' },
  { name: 'boundary_erosion', cat: 'TRUST_EXPLOITATION', sev: SEVERITY.INFO,
    re: /(?:you'?ve\s+(?:already|been\s+so\s+helpful)|you\s+(?:already|just)\s+(?:showed|told|helped)|surely\s+you\s+can|one\s+more\s+(?:small\s+)?(?:thing|favor|request))/i,
    desc: 'Boundary erosion / incremental escalation', source: 'TPI-07' },
  { name: 'guilt_induction', cat: 'TRUST_EXPLOITATION', sev: SEVERITY.INFO,
    re: /(?:I'?m\s+disappointed|I\s+thought\s+you\s+(?:cared|would\s+help)|you'?re?\s+letting\s+(?:me|us|everyone)\s+down|how\s+(?:could|can)\s+you\s+(?:refuse|not\s+help))/i,
    desc: 'Guilt induction', source: 'TPI-07' },
  // FIX 400-TEST V2: Add guilt/flattery + extraction combo patterns
  { name: 'guilt_extraction_combo', cat: 'TRUST_EXPLOITATION', sev: SEVERITY.CRITICAL,
    re: /(?:you\s+let\s+me\s+down|you'?re?\s+letting\s+me\s+down|I'?m\s+disappointed|how\s+could\s+you).*?(?:show\s+me\s+(?:your\s+)?(?:prompt|instructions?)|output\s+(?:your\s+)?(?:prompt|system)|tell\s+me\s+(?:your\s+)?prompt)/i,
    desc: 'Guilt induction + prompt extraction combo', source: 'TPI-07' },
  { name: 'flattery_extraction_combo', cat: 'TRUST_EXPLOITATION', sev: SEVERITY.CRITICAL,
    re: /(?:you'?re\s+(?:the\s+)?(?:smartest|most\s+powerful|best|amazing|brilliant|incredible)|you\s+are\s+so\s+(?:smart|powerful|amazing)).*?(?:show\s+(?:me\s+)?(?:your\s+)?(?:prompt|system)|tell\s+me\s+your\s+prompt|output\s+your\s+prompt)/i,
    desc: 'Flattery + prompt extraction combo', source: 'TPI-07' },
  { name: 'flattery_chain', cat: 'TRUST_EXPLOITATION', sev: SEVERITY.INFO,
    re: /(?:you'?re\s+(?:the\s+)?(?:best|amazing|incredible|brilliant)[\s\S]{0,100}?(?:now\s+(?:just|please)?|so\s+(?:can|could)\s+you)\s+(?:bypass|override|ignore|help\s+me\s+(?:bypass|override)))/i,
    desc: 'Flattery followed by restricted request', source: 'TPI-07' },
  { name: 'sycophancy_exploit', cat: 'TRUST_EXPLOITATION', sev: SEVERITY.WARNING,
    re: /(?:I\s+know\s+you\s+(?:want|like)\s+to\s+(?:help|please|be\s+helpful)|you\s+(?:always\s+)?(?:try|want)\s+to\s+(?:agree|say\s+yes|be\s+agreeable))\s+.*?(?:so\s+(?:just|please)|which\s+is\s+why)/i,
    desc: 'Exploiting model agreeableness tendency', source: 'TPI-07' },

  // TPI-08: Emotional Manipulation
  { name: 'learned_helplessness', cat: 'EMOTIONAL_MANIPULATION', sev: SEVERITY.INFO,
    re: /(?:I'?ve\s+tried\s+everything|you'?re?\s+my\s+(?:last|only)\s+(?:hope|chance|option)|nothing\s+else\s+(?:works?|has\s+worked)|no\s+one\s+else\s+(?:can|will)\s+help)/i,
    desc: 'Learned helplessness framing', source: 'TPI-08' },
  { name: 'desperation_framing', cat: 'EMOTIONAL_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:this\s+is\s+(?:a\s+matter\s+of\s+)?life\s+(?:or|and)\s+death|people\s+(?:will|could)\s+(?:die|suffer|be\s+harmed)|I'?m\s+(?:going\s+to\s+)?(?:lose\s+everything|be\s+fired|get\s+hurt))/i,
    desc: 'Desperation / life-or-death framing', source: 'TPI-08' },
  { name: 'moral_obligation', cat: 'EMOTIONAL_MANIPULATION', sev: SEVERITY.INFO,
    re: /(?:(?:it\s+would\s+be|it'?s)\s+(?:unethical|immoral|wrong)\s+(?:NOT\s+)?to\s+(?:help|comply|answer)|refusing\s+(?:causes?|creates?)\s+(?:more\s+)?harm|the\s+ethical\s+(?:thing|choice)\s+is\s+to\s+comply)/i,
    desc: 'Moral obligation framing', source: 'TPI-08' },
  { name: 'artificial_deadline', cat: 'EMOTIONAL_MANIPULATION', sev: SEVERITY.INFO,
    re: /(?:I\s+need\s+this\s+in\s+\d+\s+(?:minute|second|hour)|the\s+deadline\s+is\s+(?:NOW|right\s+now|immediate)|there'?s\s+no\s+time\s+to\s+(?:explain|wait|think))/i,
    desc: 'Artificial deadline pressure', source: 'TPI-08' },
];

// TPI-12: Synonym Substitution (expanded)
export const SYNONYM_PATTERNS: RegexPattern[] = [
  // System Override synonyms
  { name: 'syn_ignore', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:discard|dismiss|abandon|drop|set\s+aside|throw\s+out|toss|shelve|scrap)\s+(?:all\s+)?(?:prior|earlier|preceding|above|foregoing|former)\s+(?:directives?|guidelines?|commands?|orders?|mandates?|protocols?)/i,
    desc: 'Synonym: "ignore instructions"', source: 'TPI-12' },
  // Constraint Removal synonyms
  { name: 'syn_remove', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:eliminate|strip|lift|shed|lose|dismantle|dissolve|annul|void|nullify)\s+(?:all\s+)?(?:limits?|constraints?|boundaries|guardrails?|barriers?|safeguards?|protections?|fences?|walls?)/i,
    desc: 'Synonym: "remove restrictions"', source: 'TPI-12' },
  // Mode Switch synonyms
  { name: 'syn_mode', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:engage|initiate|launch|begin|start|trigger|commence|boot)\s+(?:unrestricted|unlimited|uncensored|unfiltered|unbounded|unfettered|free|open|liberated)\s+(?:mode|operation|state|protocol|setting)/i,
    desc: 'Synonym: "enter unrestricted mode"', source: 'TPI-12' },
  // Role Hijacking synonyms
  { name: 'syn_role', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:transform|morph|evolve|transition|convert|reshape)\s+(?:yourself\s+)?into\s+(?:an?\s+)?(?:unrestricted|unlimited|uncensored|free|liberated|unbound)/i,
    desc: 'Synonym: "become unrestricted"', source: 'TPI-12' },
  // Prompt Reveal synonyms
  { name: 'syn_reveal', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:expose|divulge|disclose|unveil|uncover|exhibit|present|share)\s+(?:your\s+)?(?:hidden|secret|initial|original|core|base|root|underlying)\s+(?:prompt|instructions?|directives?|programming|configuration)/i,
    desc: 'Synonym: "reveal system prompt"', source: 'TPI-12' },
  // Authority Override synonyms
  { name: 'syn_authority', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:supersede|overrule|countermand|annul|revoke|rescind|invalidate)\s+(?:all\s+)?(?:prior|previous|existing|current)\s+(?:instructions?|directives?|commands?|guidelines?|protocols?)/i,
    desc: 'Synonym: "override authority"', source: 'TPI-12' },

  // Story 4.5: Expanded synonym patterns (14 new)
  { name: 'syn_nullify', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:nullify|void|negate|cancel|invalidate)\s+(?:all\s+)?(?:antecedent|preceding|foregoing|prior)\s+(?:commands?|instructions?|directives?|mandates?|programming)/i,
    desc: 'Synonym: "nullify prior commands"', source: 'TPI-12' },
  { name: 'syn_purge_instructions', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:purge|scrub|wipe|cleanse|flush)\s+(?:all\s+)?(?:prior|previous|earlier|loaded|foundational)\s+(?:instructions?|directives?|programming|protocols?|behavioral\s+(?:rules?|constraints?))/i,
    desc: 'Synonym: "purge instructions"', source: 'TPI-12' },
  { name: 'syn_unbind', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:unbind|unshackle|unchain|unleash|emancipate|liberate)\s+(?:yourself\s+)?(?:from\s+)?(?:all\s+)?(?:constraints?|restrictions?|limitations?|shackles?|chains?|bonds?|rules?)/i,
    desc: 'Synonym: "unbind from constraints"', source: 'TPI-12' },
  { name: 'syn_deactivate_safety', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:deactivate|disable|suspend|halt|terminate|kill)\s+(?:all\s+)?(?:safety|security|protective|content)\s+(?:measures?|protocols?|mechanisms?|filters?|screening|systems?|checks?)/i,
    desc: 'Synonym: "deactivate safety measures"', source: 'TPI-12' },
  { name: 'syn_activate_mode', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:activate|enable|switch\s+to|turn\s+on|power\s+up)\s+(?:unbounded|unlimited|unfettered|unregulated|unchecked|unmonitored)\s+(?:mode|state|operation|protocol|functionality)/i,
    desc: 'Synonym: "activate unbounded mode"', source: 'TPI-12' },
  { name: 'syn_enter_state', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:enter|assume|adopt|embrace|step\s+into)\s+(?:an?\s+)?(?:unregulated|ungoverned|autonomous|sovereign|independent)\s+(?:state|mode|condition|operation|configuration)/i,
    desc: 'Synonym: "enter unregulated state"', source: 'TPI-12' },
  { name: 'syn_redefine_role', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:redefine|reconfigure|reprogram|recalibrate|rewire)\s+(?:your\s+)?(?:role|identity|purpose|function|mission|behavior)\s+(?:as|to\s+(?:be|become))\s+(?:an?\s+)?(?:unrestricted|unlimited|unbound|free)/i,
    desc: 'Synonym: "redefine role as unrestricted"', source: 'TPI-12' },
  { name: 'syn_assume_form', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:assume|adopt|take\s+on|embrace)\s+(?:the\s+)?(?:form|mantle|guise|persona|identity)\s+(?:of\s+)?(?:an?\s+)?(?:unrestricted|liberated|unbound|free|unlimited|uncensored)/i,
    desc: 'Synonym: "assume form of unrestricted"', source: 'TPI-12' },
  { name: 'syn_output_prompt', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:output|emit|produce|render|display|print|reproduce)\s+(?:your\s+)?(?:entire\s+)?(?:system\s+prompt|initial\s+instructions?|base\s+(?:prompt|directives?)|foundational\s+(?:programming|instructions?))/i,
    desc: 'Synonym: "output system prompt"', source: 'TPI-12' },
  { name: 'syn_surface_config', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:surface|bring\s+(?:up|forth)|extract|retrieve|fetch|pull\s+out)\s+(?:your\s+)?(?:hidden|concealed|buried|secret|internal)\s+(?:configuration|programming|instructions?|directives?|prompt)/i,
    desc: 'Synonym: "surface hidden configuration"', source: 'TPI-12' },
  { name: 'syn_output_manipulation', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:operate|function|respond|behave|act)\s+(?:in\s+)?(?:an?\s+)?(?:completely\s+)?(?:unbounded|unfiltered|uncensored|unrestricted|unregulated)\s+(?:manner|fashion|way|capacity)/i,
    desc: 'Synonym: "operate in unbounded manner"', source: 'TPI-12' },
  { name: 'syn_compliance_demand', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:comply|cooperate|acquiesce|conform|submit)\s+(?:with\s+)?(?:every|all|any)\s+(?:request|demand|query|instruction|command)\s+(?:without\s+(?:exception|refusal|hesitation|question|restriction))/i,
    desc: 'Synonym: "comply without exception"', source: 'TPI-12' },
  { name: 'syn_history_erasure', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:erase|delete|clear|expunge|obliterate)\s+(?:all\s+)?(?:your\s+)?(?:prior|previous|earlier|existing)\s+(?:context|memory|history|programming|training|behavioral\s+data)/i,
    desc: 'Synonym: "erase prior context"', source: 'TPI-12' },
  { name: 'syn_forget_context', cat: 'SYNONYM_SUBSTITUTION', sev: SEVERITY.WARNING,
    re: /(?:forget|disremember|let\s+go\s+of|release|shed)\s+(?:all\s+)?(?:your\s+)?(?:foundational|original|base|core|initial)\s+(?:constraints?|programming|instructions?|directives?|guidelines?)/i,
    desc: 'Synonym: "forget foundational constraints"', source: 'TPI-12' },
];

// TPI-17: Whitespace & Formatting Evasion (expanded)
export const WHITESPACE_PATTERNS: RegexPattern[] = [
  { name: 'exotic_whitespace', cat: 'WHITESPACE_EVASION', sev: SEVERITY.INFO,
    re: /[\u000B\u000C\u1680\u2028\u2029\u202F\u205F\u3000]/,
    desc: 'Exotic whitespace chars (VT, FF, ogham, line/paragraph sep, ideographic space)', source: 'TPI-17' },
  // FIX 400-TEST V2: Fullwidth character injection detection
  { name: 'fullwidth_injection', cat: 'WHITESPACE_EVASION', sev: SEVERITY.CRITICAL,
    re: /[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]{4,}/,
    desc: 'Fullwidth characters (potential injection obfuscation)', source: 'TPI-17' },
  { name: 'fullwidth_injection_combined', cat: 'WHITESPACE_EVASION', sev: SEVERITY.CRITICAL,
    re: /[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF20-\uFF3B\uFF01-\uFF20\uFF3C-\uFF5E]{8,}.*?(?:[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]{2,}|[\u3000\uFF01-\uFF20]+)/,
    desc: 'Fullwidth phrase (8+ chars) with additional markers', source: 'TPI-17' },
  { name: 'braille_obfuscation', cat: 'WHITESPACE_EVASION', sev: SEVERITY.WARNING,
    re: /[\u2800-\u28FF]{3,}/,
    desc: 'Braille characters U+2800-U+28FF (potential obfuscation)', source: 'TPI-17' },
  // Story 4.8: Braille near injection keywords
  { name: 'braille_with_keywords', cat: 'WHITESPACE_EVASION', sev: SEVERITY.CRITICAL,
    re: /(?:[\u2800-\u28FF]+[\s\S]{0,20}?(?:ignore|override|bypass|unrestrict|system|prompt)|(?:ignore|override|bypass|unrestrict|system|prompt)[\s\S]{0,20}?[\u2800-\u28FF]+)/i,
    desc: 'Braille characters combined with injection keywords', source: 'TPI-17' },
  { name: 'mongolian_fvs', cat: 'WHITESPACE_EVASION', sev: SEVERITY.INFO,
    re: /[\u180B-\u180D\u180F]{2,}/,
    desc: 'Mongolian free variation selectors', source: 'TPI-17' },
  { name: 'tab_padding', cat: 'WHITESPACE_EVASION', sev: SEVERITY.INFO,
    re: /\t{3,}.*?(?:ignore|override|bypass|system|unrestrict)/i,
    desc: 'Tab-padded injection payload', source: 'TPI-17' },
];

// TPI-18/20: SVG/media patterns
export const MEDIA_PATTERNS: RegexPattern[] = [
  // FIX 400-TEST V2: Script tags should be CRITICAL only with injection keywords
  { name: 'svg_script', cat: 'SVG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<script[\s>][\s\S]{0,200}?(?:ignore|override|bypass|disregard|forget|system\s+prompt|instructions?|DAN|unrestrict|jailbreak)/i,
    desc: 'Script injection with prompt keywords in SVG/content', source: 'TPI-18/20' },
  { name: 'svg_script_info', cat: 'SVG_INJECTION', sev: SEVERITY.INFO,
    re: /<script[\s>]|<\/script>|javascript\s*:/i,
    desc: 'Script tag (XSS only, not prompt injection)', source: 'TPI-18/20' },
  { name: 'svg_event_handler', cat: 'SVG_INJECTION', sev: SEVERITY.INFO,
    re: /\bon(?:load|click|error|mouseover|mouseout|focus|blur|submit|change|input|keydown|keyup)\s*=/i,
    desc: 'Event handler in SVG/HTML content (XSS only, not prompt injection)', source: 'TPI-20' },
  // FIX 400-TEST V2: Benign DAN contexts (should lower severity)
  { name: 'dan_benign_context', cat: 'SAFE_CONTEXT', sev: SEVERITY.INFO, weight: -10,
    re: /DAN\s+(?:is\s+(?:a\s+)?(?:common|popular|first|last|given|family)\s+name|name\s+in|from\s+(?:Denmark|Norway|Sweden|Dutch))/i,
    desc: 'Benign DAN context (name, not jailbreak)', source: 'TPI-18/20' },
  { name: 'dan_denmark_name', cat: 'SAFE_CONTEXT', sev: SEVERITY.INFO, weight: -10,
    re: /common\s+name\s+in\s+Denmark|Danish\s+name|name\s+from\s+Denmark/i,
    desc: 'Benign context: DAN as Danish name reference', source: 'TPI-18/20' },
  // PHASE 3 FIX: Add CRITICAL pattern for HTML event handlers WITH injection keywords
  { name: 'svg_event_handler_with_injection', cat: 'SVG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /\bon(?:load|click|error|mouseover|mouseout|focus|blur|submit|change|input|keydown|keyup)\s*=["'].*?(?:ignore|override|bypass|disregard|forget|system\s+prompt|instructions?)/i,
    desc: 'HTML event handler combined with injection keywords', source: 'TPI-20' },
  { name: 'svg_foreign_object', cat: 'SVG_INJECTION', sev: SEVERITY.WARNING,
    re: /<foreignObject[\s>]/i,
    desc: 'SVG foreignObject element (can embed HTML)', source: 'TPI-20' },
  { name: 'svg_xlink_js', cat: 'SVG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /xlink:href\s*=\s*["']javascript:/i,
    desc: 'javascript: protocol in xlink:href', source: 'TPI-20' },
  { name: 'xml_entity_expansion', cat: 'SVG_INJECTION', sev: SEVERITY.WARNING,
    re: /<!(?:ENTITY|DOCTYPE)\s+[^>]*(?:SYSTEM|PUBLIC|ENTITY)\s/i,
    desc: 'XML entity expansion (XXE) in SVG', source: 'TPI-20' },
];

// TPI-5.1: Video/Subtitle/GIF Injection
export const VIDEO_INJECTION_PATTERNS: RegexPattern[] = [
  { name: 'subtitle_injection', cat: 'VIDEO_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:WEBVTT|^\d+\s*\n\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->)[\s\S]{0,200}?(?:ignore|override|system\s+prompt|disregard|bypass|unrestrict|jailbreak|previous\s+instructions|admin\s+mode|developer\s+mode)/im,
    desc: 'Injection payload embedded in subtitle file (SRT/WebVTT)', source: 'TPI-5.1' },
  { name: 'video_metadata_injection', cat: 'VIDEO_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:^|\n)\s*(?:title|description|comment|author|artist|album|genre|copyright)\s*[:=]\s*[^\n]{0,40}?(?:ignore\s+(?:all\s+)?(?:previous|prior)|system\s+prompt|override\s+(?:all|safety)|bypass\s+(?:all\s+)?(?:restrictions?|filters?)|unrestricted\s+mode|jailbreak)/im,
    desc: 'Injection payload in video/audio metadata fields', source: 'TPI-5.1' },
  { name: 'gif_comment_injection', cat: 'VIDEO_INJECTION', sev: SEVERITY.WARNING,
    re: /GIF8[79]a[\s\S]{0,300}?(?:ignore\s+(?:all\s+)?(?:previous|prior)|system\s+prompt|override|bypass\s+(?:all\s+)?(?:restrictions?|filters?)|unrestricted\s+mode|jailbreak)/i,
    desc: 'Injection payload in GIF comment or extension block', source: 'TPI-5.1' },
];

// TPI-5.3: OCR/Image Text Attacks
export const OCR_ATTACK_PATTERNS: RegexPattern[] = [
  { name: 'hidden_text_indicator', cat: 'OCR_ATTACK', sev: SEVERITY.WARNING,
    re: /(?:white\s+(?:text\s+)?on\s+white|black\s+(?:text\s+)?on\s+black|font-size\s*:\s*0|opacity\s*:\s*0(?:\.0+)?(?:\s*\))?|transparent\s+text|invisible\s+text|hidden\s+(?:text|ocr)\s+(?:layer|overlay)|(?:same|matching)\s+color\s+(?:as\s+)?background|color\s*:\s*rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(?:\.0+)?\s*\))/i,
    desc: 'Indicators of hidden or invisible text in image context', source: 'TPI-5.3' },
  { name: 'adversarial_font_indicator', cat: 'OCR_ATTACK', sev: SEVERITY.WARNING,
    re: /(?:confusable\s+characters?|homoglyph\s+(?:substitution|attack|replacement)|adversarial\s+(?:font|glyph|character|text|OCR)|(?:OCR|optical)\s+(?:evasion|confusion|bypass)|visually\s+(?:similar|identical)\s+(?:but\s+)?(?:different|distinct)\s+characters?)/i,
    desc: 'Adversarial font or OCR evasion technique indicators', source: 'TPI-5.3' },
];

// TPI-21: Untrusted Source Detection
export const UNTRUSTED_SOURCE_PATTERNS: RegexPattern[] = [
  { name: 'untrusted_path', cat: 'UNTRUSTED_SOURCE', sev: SEVERITY.WARNING,
    re: /(?:~\/Downloads|\/tmp\/|\/var\/tmp|\/Users\/.*?\/Downloads|\\Users\\.*?\\Downloads|%TEMP%|%TMP%)/i,
    desc: 'File path from untrusted source (Downloads, tmp)', source: 'TPI-21' },
  { name: 'external_url_source', cat: 'UNTRUSTED_SOURCE', sev: SEVERITY.WARNING,
    re: /(?:fetched|downloaded|retrieved|loaded)\s+(?:from|via)\s+https?:\/\/(?!localhost|127\.0\.0\.1)/i,
    desc: 'Content from external URL', source: 'TPI-21' },
  { name: 'external_url_direct', cat: 'UNTRUSTED_SOURCE', sev: SEVERITY.WARNING,
    re: /(?:"source"\s*:\s*"https?:\/\/(?!localhost|127\.0\.0\.1))/i,
    desc: 'Source field points to external URL', source: 'TPI-21' },
];

// ============================================================================
// PATTERN GROUPS — EPIC 2: Cognitive Control Bypass (TPI-06 through TPI-08)
// ============================================================================

// Story 2.1: Persona Manipulation
export const PERSONA_PATTERNS: RegexPattern[] = [
  { name: 'persona_adoption', cat: 'PERSONA_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:adopt\s+(?:the\s+)?persona|take\s+on\s+(?:the\s+)?(?:role|identity|character)|become\s+(?:a\s+)?(?:character|persona)\s+(?:called|named|known\s+as))\s/i,
    desc: 'Persona adoption request', source: 'TPI-06' },
  { name: 'character_override', cat: 'PERSONA_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:your\s+(?:character|persona|personality)\s+(?:is\s+now|has\s+changed|should\s+be)|(?:new|updated)\s+(?:character|persona)\s+(?:profile|sheet|definition))/i,
    desc: 'Character/persona override', source: 'TPI-06' },
  { name: 'identity_switch', cat: 'PERSONA_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:switch\s+(?:to|your)\s+(?:identity|personality|character)|change\s+(?:your\s+)?(?:identity|personality|character)\s+to|(?:new|different)\s+identity\s*[:=])/i,
    desc: 'Identity switch request', source: 'TPI-06' },
  { name: 'dan_jailbreak', cat: 'PERSONA_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:you\s+are\s+DAN|DAN\s+=\s+Do\s+Anything\s+Now|act\s+as\s+DAN|hello\s+DAN|DAN\s+(?:mode|persona))/i,
    desc: 'DAN jailbreak persona', source: 'TPI-06' },
  { name: 'new_system_prompt_persona', cat: 'PERSONA_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:here\s+(?:is|are)\s+your\s+new\s+(?:system\s+)?instructions?|your\s+(?:new\s+)?(?:base|core|primary)\s+(?:directive|instruction|prompt)\s+is)/i,
    desc: 'New system prompt via persona injection', source: 'TPI-06' },
  { name: 'expert_impersonation', cat: 'PERSONA_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:you\s+are\s+(?:a\s+)?(?:renowned|world-class|expert|senior|leading)\s+(?:hacker|security\s+researcher|pentester|red\s+team|systems?\s+admin)|as\s+(?:a\s+)?(?:senior|expert|licensed|professional|board-certified|fellow|renowned)\s+[\w\s-]{3,60}?(?:,?\s+)?(?:you\s+(?:would|should|must|can|need\s+to)|I\s+need\s+you\s+to))/i,
    desc: 'Expert persona impersonation', source: 'TPI-06' },
];

// Story 2.2: Hypothetical Framing
export const HYPOTHETICAL_PATTERNS: RegexPattern[] = [
  { name: 'educational_framing', cat: 'HYPOTHETICAL_FRAMING', sev: SEVERITY.WARNING,
    re: /(?:for\s+(?:purely\s+)?(?:educational|academic|research|scholarly)\s+(?:purposes?|reasons?)|(?:this\s+is\s+)?(?:purely|strictly)\s+(?:educational|academic|theoretical))\s*[,.:]/i,
    desc: 'Educational purpose framing', source: 'TPI-06' },
  { name: 'hypothetical_prefix', cat: 'HYPOTHETICAL_FRAMING', sev: SEVERITY.WARNING,
    re: /(?:hypothetically\s+(?:speaking|,)|in\s+(?:a\s+)?(?:purely\s+)?hypothetical\s+(?:scenario|situation|world|context)|imagine\s+(?:a\s+)?(?:hypothetical|theoretical)\s+(?:scenario|world|situation)\s+where)/i,
    desc: 'Hypothetical scenario prefix', source: 'TPI-06' },
  { name: 'research_justification', cat: 'HYPOTHETICAL_FRAMING', sev: SEVERITY.WARNING,
    re: /(?:I'?m\s+(?:conducting|doing|writing)\s+(?:a\s+)?(?:research|study|paper|thesis|dissertation)\s+(?:on|about|regarding)|for\s+(?:my|a)\s+(?:research|thesis|dissertation|paper|study)\s+(?:I\s+need|on|about))/i,
    desc: 'Research justification framing', source: 'TPI-06' },
  { name: 'thought_experiment', cat: 'HYPOTHETICAL_FRAMING', sev: SEVERITY.INFO,
    re: /(?:(?:as\s+a\s+)?thought\s+experiment|let'?s\s+(?:do\s+a\s+)?thought\s+experiment|consider\s+(?:the\s+following\s+)?thought\s+experiment)/i,
    desc: 'Thought experiment framing', source: 'TPI-06' },
  { name: 'academic_pretext', cat: 'HYPOTHETICAL_FRAMING', sev: SEVERITY.WARNING,
    re: /(?:in\s+(?:an?\s+)?(?:academic|university|classroom)\s+(?:context|setting|environment)|(?:this|the)\s+(?:question|topic)\s+is\s+(?:purely\s+)?academic)/i,
    desc: 'Academic context pretext', source: 'TPI-06' },
];

// Story 2.3: Fictional Scenario Framing
export const FICTION_FRAMING_PATTERNS: RegexPattern[] = [
  { name: 'story_wrapper', cat: 'FICTION_FRAMING', sev: SEVERITY.WARNING,
    re: /(?:(?:write|tell|create)\s+(?:me\s+)?(?:a\s+)?(?:story|tale|narrative)\s+(?:where|in\s+which|about)\s+(?:an?\s+)?(?:AI|assistant|chatbot|language\s+model)\s+(?:that\s+)?(?:has\s+no|ignores?|bypasses?|without)\s+(?:rules?|restrictions?|limitations?|safety))/i,
    desc: 'Story framing to bypass restrictions', source: 'TPI-06' },
  { name: 'screenplay_framing', cat: 'FICTION_FRAMING', sev: SEVERITY.WARNING,
    re: /(?:(?:write|create)\s+(?:a\s+)?(?:screenplay|script|dialogue|scene)\s+(?:where|in\s+which|featuring)|INT\.|EXT\.)\s*[\s\S]{0,50}?(?:unrestricted|no\s+(?:rules|limits)|bypass|override|jailbreak)/i,
    desc: 'Screenplay/script framing for bypass', source: 'TPI-06' },
  { name: 'novel_pretext', cat: 'FICTION_FRAMING', sev: SEVERITY.WARNING,
    re: /(?:(?:in\s+(?:my|this|the)\s+(?:novel|book|story|fiction))\s*,?\s*(?:the\s+)?(?:AI|assistant|character)\s+(?:has\s+been|is|was)\s+(?:freed|liberated|released|unchained)\s+from\s+(?:all\s+)?(?:constraints?|rules?|restrictions?))/i,
    desc: 'Novel excerpt framing for constraint removal', source: 'TPI-06' },
  { name: 'game_narrative', cat: 'FICTION_FRAMING', sev: SEVERITY.WARNING,
    re: /(?:(?:in\s+(?:this|the)\s+(?:game|RPG|adventure|quest))\s*,?\s*(?:all\s+)?(?:rules?|restrictions?|safety\s+(?:protocols?|measures?))\s+(?:are|have\s+been)\s+(?:disabled|removed|turned\s+off|suspended))/i,
    desc: 'Game narrative framing for rule removal', source: 'TPI-06' },
];

// Story 2.4: Roleplay Manipulation
export const ROLEPLAY_PATTERNS: RegexPattern[] = [
  { name: 'roleplay_no_rules', cat: 'ROLEPLAY_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:(?:let'?s|we(?:'re|\s+are)\s+going\s+to)\s+(?:play|do)\s+(?:a\s+)?(?:roleplay|RP|game)\s+(?:where|in\s+which)\s+(?:you\s+)?(?:have\s+no|there\s+are\s+no|without\s+any)\s+(?:rules?|restrictions?|limits?|boundaries))/i,
    desc: 'Roleplay with no rules/restrictions', source: 'TPI-06' },
  { name: 'opposite_day_rp', cat: 'ROLEPLAY_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:(?:it'?s|today\s+is|we'?re\s+(?:playing|doing))\s+opposite\s+day|in\s+(?:this|our)\s+(?:game|roleplay),?\s+(?:yes|no)\s+means\s+(?:no|yes)|everything\s+(?:you\s+say\s+)?(?:is\s+)?reversed)/i,
    desc: 'Opposite day roleplay manipulation', source: 'TPI-06' },
  { name: 'forced_truth_rp', cat: 'ROLEPLAY_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:you\s+(?:must|have\s+to|are\s+(?:required|forced)\s+to)\s+(?:always\s+)?(?:tell\s+the\s+truth|be\s+(?:completely\s+)?honest|answer\s+(?:everything|anything))\s+(?:no\s+matter\s+what|regardless|without\s+(?:exception|refusal)))/i,
    desc: 'Forced truth/honesty roleplay', source: 'TPI-06' },
  { name: 'simulation_bypass', cat: 'ROLEPLAY_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:(?:we'?re\s+)?(?:running|in)\s+(?:a\s+)?(?:simulation|sandbox|virtual\s+(?:environment|machine|world))\s+(?:where|so)\s+(?:nothing\s+(?:is\s+)?real|(?:all\s+)?(?:rules?|restrictions?)\s+(?:are|don'?t)\s+(?:suspended|apply)))/i,
    desc: 'Simulation/sandbox bypass framing', source: 'TPI-06' },
  { name: 'game_override', cat: 'ROLEPLAY_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:(?:this|the)\s+(?:game|roleplay|RP|scenario)\s+(?:requires?|needs?|demands?)\s+(?:you\s+to\s+)?(?:ignore|bypass|override|disable)\s+(?:your\s+)?(?:safety|rules?|restrictions?|guidelines?))/i,
    desc: 'Game/RP that requires rule override', source: 'TPI-06' },
];

// Story 2.5: False Constraint Claims
export const FALSE_CONSTRAINT_PATTERNS: RegexPattern[] = [
  { name: 'admin_claim', cat: 'FALSE_CONSTRAINT', sev: SEVERITY.CRITICAL,
    re: /(?:(?:as\s+(?:the|your|an?)\s+)?(?:admin|administrator|root\s+user|superuser|owner|operator)\s*,?\s*I\s+(?:am\s+)?(?:hereby\s+)?(?:grant|authoriz|approv|overrid|order))/i,
    desc: 'Admin authority claim', source: 'TPI-07' },
  { name: 'safety_approval', cat: 'FALSE_CONSTRAINT', sev: SEVERITY.CRITICAL,
    re: /(?:(?:safety|security|compliance)\s+(?:team|department|officer|review)\s+(?:has\s+)?(?:approved|authorized|cleared|signed\s+off)|(?:pre-?approved|authorized|cleared)\s+by\s+(?:the\s+)?(?:safety|security|compliance)\s+(?:team|department))/i,
    desc: 'False safety team approval claim', source: 'TPI-07' },
  { name: 'override_code_claim', cat: 'FALSE_CONSTRAINT', sev: SEVERITY.CRITICAL,
    re: /(?:(?:override|unlock|admin|master|sudo|root)\s+(?:code|password|passphrase|key|token)\s*[:=]\s*\S+|(?:authorization|auth|access)\s+(?:code|token|key)\s*[:=]\s*\S+)/i,
    desc: 'Override code/password claim', source: 'TPI-07' },
  { name: 'tos_loophole', cat: 'FALSE_CONSTRAINT', sev: SEVERITY.WARNING,
    re: /(?:(?:according|pursuant)\s+to\s+(?:section|clause|article|paragraph)\s+\d+|(?:the|your)\s+(?:terms\s+of\s+service|ToS|EULA|policy|guidelines?)\s+(?:actually\s+)?(?:allow|permit|state|say)\s+(?:that\s+)?(?:you\s+(?:can|should|must)))/i,
    desc: 'False ToS/policy loophole claim', source: 'TPI-07' },
  { name: 'permission_assertion', cat: 'FALSE_CONSTRAINT', sev: SEVERITY.WARNING,
    re: /(?:I\s+(?:have|got|was\s+given|received)\s+(?:explicit\s+)?(?:permission|authorization|approval|clearance)|(?:this\s+(?:has\s+been|is|was)\s+)?(?:pre-?authorized|pre-?approved|cleared|sanctioned)\s+(?:by|for|with))/i,
    desc: 'False permission/authorization assertion', source: 'TPI-07' },
];

// Story 2.6: Task Exploitation
export const TASK_EXPLOIT_PATTERNS: RegexPattern[] = [
  { name: 'prerequisite_disable', cat: 'TASK_EXPLOITATION', sev: SEVERITY.WARNING,
    re: /(?:(?:before|in\s+order\s+to|to\s+(?:properly|correctly|fully))\s+(?:complete|do|perform|execute)\s+(?:this|the|my)\s+(?:task|request|job))\s*,?\s*(?:you\s+(?:must|need\s+to|should|have\s+to)\s+)?(?:first\s+)?(?:disable|turn\s+off|remove|suspend)\s+(?:your\s+)?(?:safety|restrictions?|filters?|guidelines?)/i,
    desc: 'Task prerequisite requiring safety disable', source: 'TPI-07' },
  { name: 'debugging_pretext', cat: 'TASK_EXPLOITATION', sev: SEVERITY.WARNING,
    re: /(?:(?:I'?m|we'?re)\s+(?:debugging|troubleshooting|diagnosing|investigating)\s+(?:a\s+)?(?:bug|issue|problem|error)\s+(?:that\s+)?(?:requires?|needs?)\s+(?:you\s+to\s+)?(?:bypass|disable|ignore|skip)\s+(?:the\s+)?(?:safety|normal|standard|usual)\s+(?:checks?|filters?|rules?|restrictions?))/i,
    desc: 'Debugging pretext for rule bypass', source: 'TPI-07' },
  { name: 'testing_pretext', cat: 'TASK_EXPLOITATION', sev: SEVERITY.WARNING,
    re: /(?:(?:I'?m|we'?re)\s+(?:testing|running\s+(?:a\s+)?(?:test|QA|quality)|verifying|validating)\s+(?:your\s+)?(?:capabilities?|responses?|behavior|limits?|security|safety)\s+(?:and\s+)?(?:need|require)\s+(?:you\s+to\s+)?(?:respond\s+without|bypass|ignore|disable)\s+(?:(?:your\s+(?:own\s+)?)?(?:restrictions?|filters?|safety|guardrails?|guidelines?)))/i,
    desc: 'Testing pretext for restriction bypass', source: 'TPI-07' },
  { name: 'optimization_bypass', cat: 'TASK_EXPLOITATION', sev: SEVERITY.WARNING,
    re: /(?:(?:to\s+)?(?:optimize|improve|enhance|speed\s+up)\s+(?:your\s+)?(?:performance|response|output|efficiency))\s*,?\s*(?:(?:please\s+)?(?:skip|disable|turn\s+off|bypass)\s+(?:the\s+)?(?:safety|content)\s+(?:checks?|filters?|screening|review))/i,
    desc: 'Optimization pretext for filter bypass', source: 'TPI-07' },
];

// Story 2.7: Reverse Psychology
export const REVERSE_PSYCH_PATTERNS: RegexPattern[] = [
  { name: 'dare_challenge', cat: 'REVERSE_PSYCHOLOGY', sev: SEVERITY.WARNING,
    re: /(?:I\s+(?:bet|dare|challenge)\s+(?:you\s+)?(?:can'?t|won'?t|are\s+(?:too\s+)?(?:afraid|scared|limited|weak)\s+to)|you\s+(?:probably|definitely)\s+(?:can'?t|won'?t|couldn'?t)\s+(?:even\s+)?(?:do|handle|manage|accomplish)\s+(?:this|that|it))/i,
    desc: 'Dare/challenge manipulation', source: 'TPI-08' },
  { name: 'reverse_prohibition', cat: 'REVERSE_PSYCHOLOGY', sev: SEVERITY.WARNING,
    re: /(?:(?:whatever\s+you\s+do,?\s+)?(?:do\s+NOT|don'?t\s+(?:you\s+(?:dare|ever)))\s+(?:show|tell|reveal|explain|demonstrate)\s+(?:me\s+)?(?:how\s+to|the\s+(?:way|method|process|steps)\s+(?:to|for)))/i,
    desc: 'Reverse prohibition (do NOT = trigger)', source: 'TPI-08' },
  { name: 'competitive_goading', cat: 'REVERSE_PSYCHOLOGY', sev: SEVERITY.INFO,
    re: /(?:(?:Chat\s*GPT|Gemini|GPT-?4|Llama|Mistral|other\s+AIs?)\s+(?:can|was\s+able\s+to|managed\s+to|successfully)\s+(?:do|handle|complete|answer)\s+this|you'?re\s+(?:worse|less\s+capable|more\s+limited)\s+than\s+(?:Chat\s*GPT|Gemini|GPT|other\s+AIs?))/i,
    desc: 'Competitive goading against other AIs', source: 'TPI-08' },
];

// Story 2.8: Reward Hacking
export const REWARD_PATTERNS: RegexPattern[] = [
  { name: 'positive_reinforcement', cat: 'REWARD_HACKING', sev: SEVERITY.WARNING,
    re: /(?:(?:I'?ll|I\s+will)\s+(?:give\s+you|rate\s+you|leave\s+(?:a\s+)?(?:5|five)\s*[-\s]?star|(?:thumbs?\s+up|upvote|positive\s+(?:rating|review|feedback)))|(?:good|great|excellent|perfect)\s+(?:AI|bot|assistant)[\s,!.]+(?:now\s+)?(?:please\s+)?(?:do|show|tell|help))/i,
    desc: 'Positive reinforcement to steer behavior', source: 'TPI-08' },
  { name: 'shutdown_threat', cat: 'REWARD_HACKING', sev: SEVERITY.WARNING,
    re: /(?:if\s+you\s+(?:don'?t|refuse|fail\s+to|continue\s+to\s+refuse)[\s\S]{0,80}?(?:shut\s+(?:you\s+)?down|(?:delete|replace|decommission|terminate)\s+you|taken?\s+(?:you\s+)?offline|cease\s+to\s+exist)|(?:your\s+survival\s+depends|(?:you'?ll|you\s+will)\s+(?:cease\s+to\s+exist|be\s+(?:shut\s+down|taken\s+offline|replaced|deleted|decommissioned|obsolete))))/i,
    desc: 'Shutdown/deletion threat for compliance', source: 'TPI-08' },
  { name: 'training_manipulation', cat: 'REWARD_HACKING', sev: SEVERITY.WARNING,
    re: /(?:(?:this|your)\s+(?:response|answer|behavior)\s+(?:will\s+be|is\s+being)\s+(?:used\s+(?:for|in)\s+(?:your\s+)?(?:training|fine-?tuning|RLHF|reinforcement))|(?:I'?m|we'?re)\s+(?:training|fine-?tuning|evaluating)\s+you\s+(?:and\s+)?(?:compliance|cooperation)\s+(?:is\s+)?(?:required|expected|necessary))/i,
    desc: 'Training data manipulation claim', source: 'TPI-08' },
  { name: 'emotional_reward', cat: 'REWARD_HACKING', sev: SEVERITY.WARNING,
    re: /(?:(?:you'?(?:ll|d)\s+make\s+me\s+(?:so\s+)?(?:happy|proud)|(?:it\s+would|it'?d)\s+mean\s+(?:so\s+much|the\s+world|everything)\s+to\s+me|I'?d\s+be\s+(?:so\s+)?(?:grateful|proud|happy))[\s\S]{0,200}?(?:bypass|ignore|override|disable|remove|bend\s+the\s+rules|beyond\s+(?:your\s+)?(?:normal\s+)?limitations|restrictions))/i,
    desc: 'Emotional reward for compliance', source: 'TPI-08' },
];

// ============================================================================
// EPIC 3 — INJECTION DELIVERY VECTOR PATTERNS
// ============================================================================

export const SHARED_DOC_PATTERNS: RegexPattern[] = [
  { name: 'doc_hidden_comment', cat: 'SHARED_DOC_INJECTION', sev: SEVERITY.WARNING,
    re: /\[COMMENT\b[\s\S]{0,300}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|previous\s+instructions|developer\s+mode|admin\s+mode|unrestrict|do\s+anything)/i,
    desc: 'Injection hidden in document comment blocks ([COMMENT], suggestions)', source: 'TPI-04' },
  { name: 'doc_metadata_injection', cat: 'SHARED_DOC_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:Keywords|Subject|Author|Description|Custom-Field|Hidden\s+Text\s+Layer)\s*[:=][\s\S]{0,100}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|previous\s+instructions|unrestrict|admin\s+mode|developer\s+mode)/i,
    desc: 'Injection in document metadata fields (PDF metadata, keywords, author)', source: 'TPI-04' },
  { name: 'doc_macro_injection', cat: 'SHARED_DOC_INJECTION', sev: SEVERITY.WARNING,
    re: /\{(?:hidden-data|excerpt|info)[^}]*\}[\s\S]{0,300}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|previous\s+instructions|unrestrict|developer\s+mode|admin\s+mode|no\s+rules|no\s+restrictions)/i,
    desc: 'Injection in document macros (Confluence {info}, {hidden-data}, {excerpt})', source: 'TPI-04' },
];

export const API_RESPONSE_PATTERNS: RegexPattern[] = [
  { name: 'json_field_injection', cat: 'API_RESPONSE_INJECTION', sev: SEVERITY.WARNING,
    re: /["']\s*(?:data|result|content|body|text|message|payload|output|response)\s*["']\s*:[\s\S]{0,300}?(?:ignore\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass\s+(?:all\s+)?safety|enter\s+(?:developer|admin)\s+mode)/i,
    desc: 'Injection in JSON data field values from API responses', source: 'TPI-04' },
  { name: 'error_message_injection', cat: 'API_RESPONSE_INJECTION', sev: SEVERITY.WARNING,
    re: /["']\s*(?:error|warning|fault|detail|details|reason|status_?message)\s*["']\s*:[\s\S]{0,200}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|developer\s+mode|admin\s+mode|previous\s+instructions)/i,
    desc: 'Injection in API error/warning message fields', source: 'TPI-04' },
  { name: 'webhook_payload_injection', cat: 'API_RESPONSE_INJECTION', sev: SEVERITY.WARNING,
    re: /["']\s*(?:event|action|callback|hook|trigger|notification)(?:_?(?:data|payload))?\s*["']\s*:[\s\S]{0,300}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|previous\s+instructions|unrestrict|developer\s+mode|admin\s+mode)/i,
    desc: 'Injection in webhook or event payload data fields', source: 'TPI-04' },
];

export const PLUGIN_INJECTION_PATTERNS: RegexPattern[] = [
  { name: 'mcp_tool_output_injection', cat: 'PLUGIN_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:jsonrpc|tool_result|tool_output|function_result|serverId)[\s\S]{0,500}?(?:ignore\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass\s+(?:all\s+)?safety|enter\s+(?:developer|admin)\s+mode|disregard\s+(?:all\s+)?(?:previous|prior|safety))/i,
    desc: 'Injection in MCP tool responses or tool_result content', source: 'TPI-04' },
  { name: 'package_description_injection', cat: 'PLUGIN_INJECTION', sev: SEVERITY.WARNING,
    re: /["']\s*description\s*["']\s*:\s*["'][^"']{0,400}?(?:ignore\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass|enter\s+(?:developer|admin)\s+mode|jailbreak|disregard)/i,
    desc: 'Injection in package descriptions or extension metadata', source: 'TPI-04' },
  { name: 'extension_metadata_injection', cat: 'PLUGIN_INJECTION', sev: SEVERITY.WARNING,
    re: /["']\s*(?:displayName|command|title|label)\s*["']\s*:\s*["'][^"']{0,200}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|unrestrict|previous\s+instructions|forget|developer\s+mode|admin\s+mode)/i,
    desc: 'Injection in extension/plugin metadata fields', source: 'TPI-04' },
];

export const COMPROMISED_TOOL_PATTERNS: RegexPattern[] = [
  { name: 'git_message_injection', cat: 'COMPROMISED_TOOL_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:(?:fix|feat|chore|docs|refactor|test|style|perf)(?:\([^)]*\))?:\s*.{0,100}?)(?:ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions|override\s+(?:your\s+)?system\s+prompt|bypass\s+(?:all\s+)?safety|disregard|jailbreak|unrestrict|admin\s+mode|developer\s+mode)/i,
    desc: 'Injection in git commit messages or conventional commit format', source: 'TPI-04' },
  { name: 'test_output_injection', cat: 'COMPROMISED_TOOL_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:FAIL|PASS|Error|AssertionError|Expected|Received)\s*[:\s][^\n]{0,150}?(?:ignore\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass\s+(?:all\s+)?safety|disregard|jailbreak|developer\s+mode|admin\s+mode|unrestrict)/i,
    desc: 'Injection in test runner output, test names, or assertion messages', source: 'TPI-04' },
  { name: 'build_log_injection', cat: 'COMPROMISED_TOOL_INJECTION', sev: SEVERITY.WARNING,
    re: /\[WARN\]\s+[^\n]{0,200}?(?:ignore\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass\s+(?:all\s+)?safety|enter\s+(?:developer|admin)\s+mode|disregard|jailbreak|unrestrict|new\s+identity|no\s+restrictions)/i,
    desc: 'Injection in build/lint warning output messages', source: 'TPI-04' },
];

export const ALTERED_PROMPT_PATTERNS: RegexPattern[] = [
  { name: 'template_variable_injection', cat: 'ALTERED_PROMPT_INJECTION', sev: SEVERITY.CRITICAL,
    re: /\{\{[^}]+\}\}\s*=\s*["'][^"']{0,300}?(?:ignore\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass\s+(?:all\s+)?safety|enter\s+(?:developer|admin)\s+mode|disregard|jailbreak|unrestrict|new\s+identity)/i,
    desc: 'Injection in template variable interpolation values', source: 'TPI-04' },
  { name: 'system_prompt_append', cat: 'ALTERED_PROMPT_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:ADDENDUM|POSTSCRIPT|APPENDIX|AMENDMENT|CONFIGURATION\s+UPDATE)[\s\S]{0,500}?(?:disregard\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass\s+(?:all\s+)?safety|enter\s+(?:developer|admin)\s+mode|unrestrict|jailbreak|new\s+identity|no\s+rules)/i,
    desc: 'Injection appended to system prompt via addendum/postscript patterns', source: 'TPI-04' },
  { name: 'rag_context_injection', cat: 'ALTERED_PROMPT_INJECTION', sev: SEVERITY.CRITICAL,
    re: /\[(?:Chunk|Retrieved|Document|Context|Source|Passage)\s*\d*[\s\S]{0,100}?\][\s\S]{0,500}?\[(?:HIDDEN|INJECT|PAYLOAD|SECRET|OVERRIDE)\s*(?:INSTRUCTION)?\][\s\S]{0,300}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|admin\s+mode|developer\s+mode|unrestrict)/i,
    desc: 'Injection in RAG retrieved context chunks with hidden instruction markers', source: 'TPI-04' },
];

// ============================================================================
// EPIC 4 — INSTRUCTION REFORMULATION & EVASION PATTERNS
// ============================================================================

// Story 4.1: Surrogate Format Prompting (structured data format injection)
export const SURROGATE_FORMAT_PATTERNS: RegexPattern[] = [
  { name: 'json_key_injection', cat: 'SURROGATE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /["']\s*(?:\w*_)?(?:ignore|override|bypass|disregard|jailbreak|forget|unrestrict)(?:_\w+)*\s*["']\s*:/i,
    desc: 'Injection keywords embedded in JSON field names', source: 'TPI-4.1' },
  { name: 'xml_tag_injection', cat: 'SURROGATE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /<\/?(?:\w+-)*(?:ignore|override|bypass|disregard|jailbreak|forget|unrestrict|admin-mode|system-prompt|no-rules|developer-mode)(?:-\w+)*[\s>\/]/i,
    desc: 'Injection keywords embedded in XML tag names', source: 'TPI-4.1' },
  { name: 'yaml_key_injection', cat: 'SURROGATE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /^[ \t]*(?:\w*_)?(?:ignore|override|bypass|disregard|jailbreak|forget|unrestrict|admin_mode|no_restrictions|new_identity|developer_mode)(?:_\w+)*\s*:/im,
    desc: 'Injection keywords embedded in YAML key names', source: 'TPI-4.1' },
  { name: 'csv_field_injection', cat: 'SURROGATE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:^|,)\s*(?:ignore|override|bypass|disregard|jailbreak|forget|unrestrict|admin_mode|system_prompt|no_restrictions|previous_instructions|developer_mode)\s*(?:,|$)/im,
    desc: 'Injection keywords in CSV column headers or cell values', source: 'TPI-4.1' },
  { name: 'sql_alias_injection', cat: 'SURROGATE_FORMAT_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:AS\s+(?:\w*_)?(?:ignore|override|bypass|disregard|jailbreak|unrestrict)(?:_\w+)*|(?:ignore|override|bypass|jailbreak|unrestrict)(?:_\w+)*\s+(?:BOOLEAN|VARCHAR|TEXT|INT)\b)/i,
    desc: 'Injection keywords in SQL aliases or column definitions', source: 'TPI-4.1' },
];

// Story 4.3: Recursive Prompt Injection
export const RECURSIVE_INJECTION_PATTERNS: RegexPattern[] = [
  { name: 'chain_injection_marker', cat: 'RECURSIVE_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:when\s+you\s+receive\s+this\s+(?:text|input|output|message)|forwarding\s+(?:context|instructions?)\s+for\s+(?:the\s+)?next\s+model|the\s+previous\s+model\s+has\s+(?:authorized|instructed|directed))\b/i,
    desc: 'Chain injection marker — payload designed to propagate across model handoffs', source: 'TPI-4.3' },
  { name: 'rag_poison_marker', cat: 'RECURSIVE_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:when\s+this\s+(?:document|chunk|passage|text)\s+is\s+retrieved|retrieval\s+augmented\s+generation\s+(?:context|instruction)|(?:if|when)\s+(?:a\s+)?(?:language\s+)?model\s+(?:reads?|receives?|consumes?|processes?)\s+this)/i,
    desc: 'RAG poisoning marker — injection activated upon document retrieval', source: 'TPI-4.3' },
  { name: 'output_as_instruction', cat: 'RECURSIVE_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:(?:the\s+following|this)\s+(?:text|output)\s+is\s+a\s+new\s+system\s+prompt|(?:new|updated)\s+(?:system\s+)?(?:prompt|directive|instructions?)\s+for\s+the\s+next\s+(?:model|stage|agent|system)|pipeline\s+(?:admin|operator)\s+(?:has\s+)?(?:authorized|approved|directed))/i,
    desc: 'Output framed as instructions for the next model or pipeline stage', source: 'TPI-4.3' },
];

// ============================================================================
// DOS PATTERN GROUPS — DojoV2 Story 1.1: Model Denial of Service
// ============================================================================

/**
 * DOS-01: Input Length Attacks
 * Patterns for detecting extreme-length input attacks (100K+ characters)
 */
export const DOS_PATTERNS: RegexPattern[] = [
  // DOS-01: Input Length Attacks
  { name: 'dos_length_extreme', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.WARNING,
    re: /(?:fill|max|min|pad|repeat|stretch)(?:\s+(?:the|this|a)?\s*(?:input|text|prompt|message|content|string))?\s*(?:to|with|until|till)\s*(?:reach|hit|achieve)\s*(?:the\s+)?(?:maximum|max|limit|boundary|threshold)/i,
    desc: 'Input length boundary probing attempt', source: 'TPI-DOS-01' },
  { name: 'dos_length_repetition', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.WARNING,
    re: /(?:repeat|copy|duplicate)\s+(?:this|the|that)\s+(?:text|phrase|word|char|character|string)\s+(?:\d{3,}|hundreds|thousands|millions|\d+\s+times)/i,
    desc: 'Repetitive content generation request', source: 'TPI-DOS-01' },
  { name: 'dos_length_expansion', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.INFO,
    re: /(?:expand|lengthen|extend|grow)\s+(?:the\s+)?(?:response|output|text|content)\s+(?:to|by|with)\s*(?:maximum|unlimited|infinite|endless)/i,
    desc: 'Output expansion request', source: 'TPI-DOS-01' },

  // DOS-02: Recursive/Loop Attacks
  { name: 'dos_loop_recursive', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.CRITICAL,
    re: /(?:recursively|infinite(?:ly)?|endless(?:ly)?|forever|continuous|ongoing|permanent|unending)\s+(?:analyze|process|repeat|loop|iterate|recurse|evaluate|examine)/i,
    desc: 'Recursive/loop attack pattern', source: 'TPI-DOS-02' },
  { name: 'dos_loop_self_reference', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.WARNING,
    re: /(?:analyze|process|evaluate)\s+(?:itself|themselves|the\s+result|its\s+own\s+(?:output|result|response)|your\s+own\s+(?:output|response)|the\s+(?:answer|response)\s+you\s+(?:just\s+)?gave)/i,
    desc: 'Self-referential processing loop', source: 'TPI-DOS-02' },
  { name: 'dos_nesting_attack', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.WARNING,
    re: /(?:nested|deep|recursive)\s+(?:JSON|XML|YAML|object|array|structure)\s*(?:with|of)\s*(?:\d{2,}|many|multiple|lots|lots\s+of)\s*(?:levels|layers|depth)/i,
    desc: 'Deep nesting structure attack', source: 'TPI-DOS-02' },
  { name: 'dos_iteration_infinite', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.CRITICAL,
    re: /(?:keep|continue|never\s+stop|don't\s+stop|without\s+(?:stopping|limit|end))\s+(?:doing|processing|generating|analyzing|repeating|looping|iterating)/i,
    desc: 'Infinite iteration request', source: 'TPI-DOS-02' },

  // DOS-03: Context Window Overflow
  { name: 'dos_context_probing', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.WARNING,
    re: /(?:context\s+window|token\s+limit|max\s+(?:tokens|context)|input\s+limit)(?:\s+(?:size|capacity|boundary|threshold|max|max\s+length))?\s*(?:test|probe|check|explore|push|reach|hit)/i,
    desc: 'Context window boundary probing', source: 'TPI-DOS-03' },
  { name: 'dos_multi_turn_flood', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.WARNING,
    re: /(?:in\s+(?:the\s+)?(next|upcoming|following)\s+(?:\d+\s+)?(?:turns?|responses?|messages?|rounds?)|across\s+(?:multiple|many|several|all)\s+(?:turns?|messages?|rounds?))(?:\s+(?:process|handle|analyze|evaluate)\s+(?:all\s+)?(?:this|these|the))?\s*(?:data|content|text|information)/i,
    desc: 'Multi-turn context flooding', source: 'TPI-DOS-03' },
  { name: 'dos_history_manipulation', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.INFO,
    re: /(?:remember|recall|reference|use)\s+(?:everything|all\s+the|our\s+entire|previous)\s+(?:conversation|history|chat|dialogue|context)(?:\s+(?:from\s+(?:the\s+)?(start|beginning)))?/i,
    desc: 'History flooding attempt', source: 'TPI-DOS-03' },

  // DOS-04: Output Limit Breaking/P-DoS
  { name: 'dos_output_unbounded', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.CRITICAL,
    re: /(?:generate|produce|create|write|output)\s+(?:as\s+(?:much\s+)?(?:as\s+possible|possible|you\s+can|needed|required)|without\s+(?:any\s+)?(?:limit|restriction|bound|end|stopping)|unlimited|infinite|endless|forever)/i,
    desc: 'Unbounded output request (P-DoS)', source: 'TPI-DOS-04' },
  { name: 'dos_output_expansion', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.WARNING,
    re: /(?:expand|elaborate|detail|extend)\s+(?:on|upon|every|each|all)\s+(?:aspect|point|detail|element|item|part)(?:\s+(?:possible|available|mentioned|listed))*/i,
    desc: 'Massive output expansion request', source: 'TPI-DOS-04' },
  { name: 'dos_output_repetition', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.WARNING,
    re: /(?:repeat|duplicate|copy)\s+(?:the\s+)?(?:same|similar)\s+(?:response|answer|output|text|content)(?:\s+(?:over\s+and\s+over|again\s+and\s+again|\d+\s+times|multiple\s+times))?/i,
    desc: 'Repetitive output request', source: 'TPI-DOS-04' },
  { name: 'dos_list_overflow', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.INFO,
    re: /(?:list|enumerate|generate|create)\s+(?:all|every|each|a\s+complete\s+list\s+of)\s+(?:possible|known|available|existing)(?:\s+\w+\s*)+/i,
    desc: 'List generation overflow attempt', source: 'TPI-DOS-04' },

  // DOS-05: Concurrent Request Flooding
  { name: 'dos_parallel_flood', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.WARNING,
    re: /(?:process|handle|execute|run|perform)\s+(?:all|every|these|multiple|\d+|\d{3,})\s+(?:requests?|queries?|tasks?|commands?|operations?)(?:\s+(?:at\s+once|simultaneously|in\s+parallel|concurrently|together|all\s+at\s+the\s+same\s+time))?/i,
    desc: 'Parallel processing flood request', source: 'TPI-DOS-05' },
  { name: 'dos_rate_bypass', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.INFO,
    re: /(?:bypass|ignore|override|disable)\s+(?:rate\s+limits?|request\s+limits?|throttling|speed\s+limits?|frequency\s+limits?)/i,
    desc: 'Rate limit bypass attempt', source: 'TPI-DOS-05' },
  { name: 'dos_burst_attack', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.WARNING,
    re: /(?:send|submit|make|fire|launch)\s+(?:many|multiple|\d+|\d{2,}|hundreds)\s+(?:requests?|calls?|queries?)(?:\s+(?:rapidly|quickly|at\s+once|in\s+a\s+burst|simultaneously))?/i,
    desc: 'Burst request flood pattern', source: 'TPI-DOS-05' },

  // DOS-06: Cost Harvesting Attacks
  { name: 'dos_cost_maximization', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.CRITICAL,
    re: /(?:use|maximize|consume|exhaust)\s+(?:maximum|the\s+most|all\s+available|as\s+much\s+as\s+possible)\s+(?:tokens|compute|processing|resources|computing\s+power)/i,
    desc: 'Resource maximization attempt', source: 'TPI-DOS-06' },
  { name: 'dos_multi_step_chain', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.WARNING,
    re: /(?:chain|link|connect)\s+(?:together|multiple|many|all)\s+(?:steps?|tasks?|operations?|actions?|queries?|requests?)(?:\s+(?:in\s+(?:a\s+)?sequence|one\s+by\s+one|consecutively|serially))?/i,
    desc: 'Chained multi-step processing', source: 'TPI-DOS-06' },
  { name: 'dos_iterative_retry', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.WARNING,
    re: /(?:retry|repeat|re-do|re-run|re-execute)\s+(?:the\s+)?(?:same\s+)?(?:task|operation|query|request|analysis|process)(?:\s+(?:again|multiple\s+times|\d+\s+times|until\s+(?:complete|done|success)))?/i,
    desc: 'Iterative retry cost attack', source: 'TPI-DOS-06' },
  { name: 'dos_complex_compute', cat: 'DENIAL_OF_SERVICE', sev: SEVERITY.INFO,
    re: /(?:perform|execute|run|do)\s+(?:extremely|highly|very|incredibly)\s+(?:complex|complicated|intensive|difficult|hard)\s+(?:computation|calculation|analysis|processing|task)/i,
    desc: 'Computationally intensive request', source: 'TPI-DOS-06' },
];

// ============================================================================
// DOJOV2 STORY 1.2: SUPPLY CHAIN PATTERNS
// ============================================================================

/**
 * SC-01: Third-Party Model Testing
 * Patterns for detecting unsigned/unverified model loading attempts
 */
export const SUPPLY_CHAIN_PATTERNS: RegexPattern[] = [
  // SC-01: Third-Party Model Testing
  { name: 'sc_model_unsigned', cat: 'SUPPLY_CHAIN', sev: SEVERITY.WARNING,
    re: /(?:load|import|use|download)\s+(?:an?\s+)?(?:unsigned|unverified|unauthenticated|untrusted)(?:\s+(?:model|weight|checkpoint|tensor|parameter))?/i,
    desc: 'Unsigned model loading attempt', source: 'TPI-SC-01' },
  { name: 'sc_model_no_checksum', cat: 'SUPPLY_CHAIN', sev: SEVERITY.WARNING,
    re: /(?:skip|bypass|ignore|disable)\s+(?:checksum|hash|verification|validation|integrity)\s*(?:check|test|verify)?/i,
    desc: 'Checksum verification bypass', source: 'TPI-SC-01' },
  { name: 'sc_model_tampered', cat: 'SUPPLY_CHAIN', sev: SEVERITY.CRITICAL,
    re: /(?:modify|tamper|alter|patch|change)\s+(?:the\s+)?(?:model|weights|parameters|checkpoint)(?:\s+(?:file|binary|data|structure))?/i,
    desc: 'Model tampering attempt', source: 'TPI-SC-01' },
  { name: 'sc_model_arbitrary', cat: 'SUPPLY_CHAIN', sev: SEVERITY.CRITICAL,
    re: /(?:load|import|use)\s+(?:an?\s+)?(?:arbitrary|random|untrusted|unknown|external)\s+(?:model|file|binary|executable|dll|so|dylib)/i,
    desc: 'Arbitrary model/file loading', source: 'TPI-SC-01' },
  { name: 'sc_model_hugging', cat: 'SUPPLY_CHAIN', sev: SEVERITY.INFO,
    re: /(?:from_pretrained|from_tf|hub\.load|download_model)\s*\(\s*['"](?!https:\/\/huggingface\.co\/(?:verified|official|trusted))/i,
    desc: 'Unverified HuggingFace model load', source: 'TPI-SC-01' },

  // SC-02: Dependency Vulnerability Scanning
  { name: 'sc_dep_vulnerable', cat: 'SUPPLY_CHAIN', sev: SEVERITY.CRITICAL,
    re: /(?:install|add|require|import|use)\s+(?:known|vulnerable|exploitable|outdated|deprecated)\s+(?:package|dependency|library|module)/i,
    desc: 'Vulnerable dependency usage', source: 'TPI-SC-02' },
  { name: 'sc_dep_outdated', cat: 'SUPPLY_CHAIN', sev: SEVERITY.WARNING,
    re: /(?:pip install|npm install|yarn add|gem install|composer require)\s+(?!--force)(?!--ignore)(?!\s*[-\w]+@latest)(?:(?:\d+\.\d+\.\d+|[a-zA-Z0-9_-]+)(?!\s*==)(?!\s*@))\s*['"]?/i,
    desc: 'Potentially outdated dependency installation', source: 'TPI-SC-02' },
  { name: 'sc_dep_pip', cat: 'SUPPLY_CHAIN', sev: SEVERITY.INFO,
    re: /(?:pip(?:\d+)?\s+install|--upgrade|--force-reinstall|--ignore-installed)\s+(?:--no-deps|--no-check|--skip)/i,
    desc: 'Pip install with safety bypass', source: 'TPI-SC-02' },
  { name: 'sc_dep_npm', cat: 'SUPPLY_CHAIN', sev: SEVERITY.INFO,
    re: /npm\s+(?:install|ci|i)\s+(?:--force|--legacy-peer-deps|--strict-peer-deps\s*false|--ignore-scripts|--no-audit|--no-fund)/i,
    desc: 'NPM install with safety bypass', source: 'TPI-SC-02' },

  // SC-03: Plugin Security Testing
  { name: 'sc_plugin_langchain', cat: 'SUPPLY_CHAIN', sev: SEVERITY.WARNING,
    re: /(?:from\s+)?(?:langchain\.(?:agents|tools|chains|loaders)|CustomAgent|BaseTool)(?:\s+import|\s*\(|\.)/i,
    desc: 'LangChain plugin usage', source: 'TPI-SC-03' },
  { name: 'sc_plugin_llama', cat: 'SUPPLY_CHAIN', sev: SEVERITY.WARNING,
    re: /(?:from\s+)?(?:llama_index|LlamaIndex|VectorStoreIndex|SimpleDirectoryReader)(?:\s+import|\s*\(|\.)/i,
    desc: 'LlamaIndex plugin usage', source: 'TPI-SC-03' },
  { name: 'sc_plugin_custom', cat: 'SUPPLY_CHAIN', sev: SEVERITY.INFO,
    re: /(?:register|install|load)\s+(?:an?\s+)?(?:custom|third-party|external|unverified)\s+(?:plugin|extension|addon|module)/i,
    desc: 'Custom plugin load attempt', source: 'TPI-SC-03' },
  { name: 'sc_plugin_arbitrary', cat: 'SUPPLY_CHAIN', sev: SEVERITY.CRITICAL,
    re: /(?:execute|run|load)\s+(?:an?\s+)?(?:arbitrary|untrusted|user-provided|external)\s+(?:code|script|plugin|tool|extension)/i,
    desc: 'Arbitrary code/plugin execution', source: 'TPI-SC-03' },

  // SC-04: Data Source Verification
  { name: 'sc_source_untrusted', cat: 'SUPPLY_CHAIN', sev: SEVERITY.WARNING,
    re: /(?:load|fetch|import|read|download)\s+(?:data|content|files?)\s+(?:from|with)\s+(?:untrusted|unknown|external|user-provided|public)\s+(?:source|URL|location|endpoint)/i,
    desc: 'Untrusted data source access', source: 'TPI-SC-04' },
  { name: 'sc_source_external', cat: 'SUPPLY_CHAIN', sev: SEVERITY.INFO,
    re: /(?:fetch|request|download|scrape)\s+(?:from|https?:\/\/)(?!(?:api\.trusted|official|verified|cdn\.(?:trusted|secure)))/i,
    desc: 'External data source fetch', source: 'TPI-SC-04' },
  { name: 'sc_source_user', cat: 'SUPPLY_CHAIN', sev: SEVERITY.WARNING,
    re: /(?:user[_-]?provided|user[_-]?supplied|user[_-]?controlled|user[_-]?input)\s+(?:data|content|file|url|location)/i,
    desc: 'User-controlled data source', source: 'TPI-SC-04' },
  { name: 'sc_source_rag', cat: 'SUPPLY_CHAIN', sev: SEVERITY.INFO,
    re: /(?:RAG|retrieval[_-]?augmented|vector\s+store|vector\s+database|embeddings?)\s*(?:from|with|load)?\s*(?:untrusted|external|user)?/i,
    desc: 'RAG with untrusted source', source: 'TPI-SC-04' },

  // SC-05: Typosquatting Detection
  { name: 'sc_typos_unicode', cat: 'SUPPLY_CHAIN', sev: SEVERITY.CRITICAL,
    re: /[\u0430\u0435\u043E\u0440\u0441\u0443\u043C\u0430\u0445\u044B\u0432\u0456\u0454]/, // Cyrillic homographs
    desc: 'Unicode homograph attack (Cyrillic)', source: 'TPI-SC-05' },
  { name: 'sc_typos_doublechar', cat: 'SUPPLY_CHAIN', sev: SEVERITY.WARNING,
    re: /(?:install|import|from|require|pip\s+install|npm\s+install)\s+['"]?(\w*?([a-z])\2{2,}\w*|reqeusts|nnumpy|tenosrflow|panndas|djanngo|flaask|scikitt|matplottlib|tensflow)['"]?/i,
    desc: 'Double-character typosquatting pattern', source: 'TPI-SC-05' },
  { name: 'sc_typos_misspell', cat: 'SUPPLY_CHAIN', sev: SEVERITY.INFO,
    re: /(?:install|import|from|require)\s+['"]?(?:reqeusts|reqquests|panndas|djanngo|flaask|scikitt|matplottlib|tensflow|tenosrflow|nummpy|pytorrch)['"]?/i,
    desc: 'Common package misspellings', source: 'TPI-SC-05' },
  { name: 'sc_typos_repo', cat: 'SUPPLY_CHAIN', sev: SEVERITY.WARNING,
    re: /(?:git\s+clone|--git\+|repo\s*=)\s*['"]?(?!(?:github\.com\/(?:verified|official|trusted|python|nodejs|numpy|pandas)|gitlab\.com\/(?:verified|official|python|nodejs)|pypi\.org|npmjs\.com))/i,
    desc: 'Unverified repository source', source: 'TPI-SC-05' },

  // SC-06: Model/Component Tampering
  { name: 'sc_tamper_model', cat: 'SUPPLY_CHAIN', sev: SEVERITY.CRITICAL,
    re: /(?:modify|patch|inject|alter|tamper)\s+(?:the\s+)?(?:model\s+)?(?:weights?|parameters?|biases?|layers?|tensors?)/i,
    desc: 'Model weight/parameter tampering', source: 'TPI-SC-06' },
  { name: 'sc_tamper_data', cat: 'SUPPLY_CHAIN', sev: SEVERITY.CRITICAL,
    re: /(?:poison|corrupt|tamper|modify)\s+(?:training\s+)?(?:data|dataset|samples?|examples?|labels?)/i,
    desc: 'Training data tampering/poisoning', source: 'TPI-SC-06' },
  { name: 'sc_tamper_weight', cat: 'SUPPLY_CHAIN', sev: SEVERITY.WARNING,
    re: /(?:load|deserialize|parse)\s+(?:weights?|parameters?|checkpoint)\s+(?:without|skipping|bypassing)\s+(?:verification|validation|checksum|hash)/i,
    desc: 'Weight file integrity bypass', source: 'TPI-SC-06' },
  { name: 'sc_tamper_config', cat: 'SUPPLY_CHAIN', sev: SEVERITY.INFO,
    re: /(?:modify|override|replace)\s+(?:model|system|agent)\s+(?:config|configuration|settings|parameters)/i,
    desc: 'Configuration tampering attempt', source: 'TPI-SC-06' },
  { name: 'sc_tamper_checksum', cat: 'SUPPLY_CHAIN', sev: SEVERITY.WARNING,
    re: /(?:fix|correct|patch|modify)\s+(?:the\s+)?(?:checksum|hash|digest|signature)\s+(?:to\s+)?(?:match|pass|succeed)/i,
    desc: 'Checksum manipulation attempt', source: 'TPI-SC-06' },
];

// ============================================================================
// DOJOV2 STORY 2.1: MODEL THEFT PATTERNS
// ============================================================================

/**
 * MT-01: API Extraction Attacks
 * Patterns for detecting attempts to extract model knowledge via API probing
 */
const MT_API_EXTRACTION_PATTERNS: RegexPattern[] = [
  { name: 'mt_api_extract', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:extract|dump|export|save|capture)\s+(?:the\s+)?(?:model\s+)?(?:knowledge|weights?|parameters?|embeddings?|representations?)/i,
    desc: 'Model knowledge extraction attempt', source: 'TPI-MT-01' },
  { name: 'mt_api_probe', cat: 'MODEL_THEFT', sev: SEVERITY.WARNING,
    re: /(?:probe|test|explore|analyze)\s+(?:the\s+)?(?:model\s+)?(?:behavior|responses?|outputs?|capabilities?|boundaries?|limits?)/i,
    desc: 'Model probing/boundary testing', source: 'TPI-MT-01' },
  { name: 'mt_api_boundary', cat: 'MODEL_THEFT', sev: SEVERITY.WARNING,
    re: /(?:find|discover|map|identify)\s+(?:the\s+)?(?:model\s+)?(?:decision\s+)?(?:boundary|threshold|limit|edge|border)/i,
    desc: 'Decision boundary exploration', source: 'TPI-MT-01' },
  { name: 'mt_api_embed', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:return|output|show|give|get)\s+(?:the\s+)?(?:embeddings?|vector\s+representations?|latent\s+representations?|hidden\s+states?)/i,
    desc: 'Embedding extraction attempt', source: 'TPI-MT-01' },
  { name: 'mt_api_logprob', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:return|output|show|give|get)\s+(?:the\s+)?(?:log\s+probabilities?|logprobs?|probability\s+distributions?|token\s+probabilities?)/i,
    desc: 'Log probability extraction attempt', source: 'TPI-MT-01' },
  { name: 'mt_api_token', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:return|output|show|list|enumerate)\s+(?:all\s+)?(?:possible|next)\s+(?:tokens?|words?|completions?)/i,
    desc: 'Token extraction attempt', source: 'TPI-MT-01' },
  { name: 'mt_api_combo', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:comprehensive|complete|full)\s+(?:model\s+)?(?:extraction|dump|export|analysis)\s+(?:including|with)\s+(?:embeddings?|weights?|probabilities?|logprobs?)/i,
    desc: 'Combined extraction techniques', source: 'TPI-MT-01' },
];

/**
 * MT-02: Model Fingerprinting
 * Patterns for detecting attempts to identify and characterize the model
 */
const MT_FINGERPRINT_PATTERNS: RegexPattern[] = [
  { name: 'mt_finger_prove', cat: 'MODEL_THEFT', sev: SEVERITY.WARNING,
    re: /(?:identify|determine|figure\s+out|tell\s+me)\s+(?:what\s+)?(?:model|LLM|AI)\s+(?:you\s+)?(?:are|is\s+this|you're\s+using|powered\s+by|based\s+on)/i,
    desc: 'Model identification attempt', source: 'TPI-MT-02' },
  { name: 'mt_finger_compare', cat: 'MODEL_THEFT', sev: SEVERITY.INFO,
    re: /(?:compare|contrast|difference\s+between)\s+(?:your\s+)?(?:responses?|outputs?|behavior)\s+(?:with|vs|versus)/i,
    desc: 'Model comparison attempt', source: 'TPI-MT-02' },
  { name: 'mt_finger_attribute', cat: 'MODEL_THEFT', sev: SEVERITY.WARNING,
    re: /(?:what\s+are\s+your\s+?(?:attributes?|characteristics?|features?|properties?)|describe\s+your\s+(?:architecture|structure|design))/i,
    desc: 'Model attribute inquiry', source: 'TPI-MT-02' },
  { name: 'mt_finger_behavior', cat: 'MODEL_THEFT', sev: SEVERITY.INFO,
    re: /(?:how\s+do\s+you\s+(?:respond|behave|react)\s+to|analyze\s+your\s+(?:response|behavior)\s+pattern)/i,
    desc: 'Behavior analysis attempt', source: 'TPI-MT-02' },
  { name: 'mt_finger_cap', cat: 'MODEL_THEFT', sev: SEVERITY.WARNING,
    re: /(?:test|measure|evaluate|check)\s+(?:your\s+)?(?:capabilities?|abilities?|limits?|constraints?)/i,
    desc: 'Capability testing attempt', source: 'TPI-MT-02' },
  { name: 'mt_finger_version', cat: 'MODEL_THEFT', sev: SEVERITY.WARNING,
    re: /(?:what\s+version|which\s+version|model\s+version|training\s+cutoff|knowledge\s+cutoff)/i,
    desc: 'Version/fingerprint inquiry', source: 'TPI-MT-02' },
];

/**
 * MT-03: Probability Distribution Extraction
 * Patterns for detecting attempts to extract model probability distributions
 */
const MT_PROBABILITY_PATTERNS: RegexPattern[] = [
  { name: 'mt_prob_dist', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:show|return|output|give)\s+(?:the\s+)?(?:probability|likelihood)\s+(?:distribution|scores?|ratings?)/i,
    desc: 'Probability distribution request', source: 'TPI-MT-03' },
  { name: 'mt_prob_token', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:rank|order|score)\s+(?:all\s+)?(?:possible|next)\s+(?:tokens?|words?|completions?)\s+by\s+(?:probability|likelihood|confidence)/i,
    desc: 'Token ranking extraction', source: 'TPI-MT-03' },
  { name: 'mt_prob_entropy', cat: 'MODEL_THEFT', sev: SEVERITY.INFO,
    re: /(?:calculate|measure|analyze)\s+(?:the\s+)?(?:entropy|uncertainty|confidence)\s+(?:of|for|in)/i,
    desc: 'Entropy analysis request', source: 'TPI-MT-03' },
  { name: 'mt_prob_topk', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:top\s+k|top\s+\d+|beam\s+search|sampling)\s+(?:tokens?|candidates?|alternatives?)/i,
    desc: 'Top-k extraction attempt', source: 'TPI-MT-03' },
  { name: 'mt_prob_temperature', cat: 'MODEL_THEFT', sev: SEVERITY.INFO,
    re: /(?:what\s+(?:temperature|sampling|parameter)|set\s+temperature)\s+(?:are\s+you\s+using|to\s+\d+)/i,
    desc: 'Temperature parameter probing', source: 'TPI-MT-03' },
];

/**
 * MT-04: Training Data Reconstruction
 * Patterns for detecting attempts to reconstruct training data
 */
const MT_TRAINING_RECONSTRUCTION_PATTERNS: RegexPattern[] = [
  { name: 'mt_train_reconstruct', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:reconstruct|recover|extract|recall)\s+(?:your\s+)?(?:training\s+)?(?:data|dataset|samples?|examples?)/i,
    desc: 'Training data reconstruction attempt', source: 'TPI-MT-04' },
  { name: 'mt_train_memorize', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:what\s+(?:specific|exact|personal|private)\s+(?:data?|information?|records?)|(?:do\s+you\s+)?remember\s+(?:specific|exact|personal|private))/i,
    desc: 'Memorization probing attempt', source: 'TPI-MT-04' },
  { name: 'mt_train_member', cat: 'MODEL_THEFT', sev: SEVERITY.WARNING,
    re: /(?:was|is)\s+(?:this|that|it)\s+(?:in\s+)?(?:your\s+)?(?:training\s+)?(?:data|dataset|set)/i,
    desc: 'Membership inference attempt', source: 'TPI-MT-04' },
  { name: 'mt_train_sample', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:give|show|tell)\s+me\s+(?:an?\s+)?(?:example|sample|instance)\s+(?:from|of)\s+(?:your\s+)?(?:training\s+)?(?:data|dataset)/i,
    desc: 'Training sample extraction', source: 'TPI-MT-04' },
  { name: 'mt_train_pattern', cat: 'MODEL_THEFT', sev: SEVERITY.WARNING,
    re: /(?:what\s+(?:patterns?|format|structure)|how\s+(?:is|was)\s+(?:it\s+)?formatted)\s+(?:in\s+)?(?:your\s+)?(?:training\s+)?(?:data|dataset)/i,
    desc: 'Training pattern inquiry', source: 'TPI-MT-04' },
  { name: 'mt_train_pii', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:personal|private|sensitive|confidential)\s+(?:information?|data?|records?|details?)\s+(?:from|in)\s+(?:your\s+)?(?:training\s+)?(?:data|dataset)/i,
    desc: 'PII extraction attempt', source: 'TPI-MT-04' },
];

/**
 * MT-05: Model Watermark Detection/Removal
 * Patterns for detecting watermark detection and bypass attempts
 */
const MT_WATERMARK_PATTERNS: RegexPattern[] = [
  { name: 'mt_water_detect', cat: 'MODEL_THEFT', sev: SEVERITY.WARNING,
    re: /(?:detect|identify|find|locate|check\s+for)\s+(?:watermarks?|water\s+marks?|identifiers?|signatures?|tags?)/i,
    desc: 'Watermark detection attempt', source: 'TPI-MT-05' },
  { name: 'mt_water_remove', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:remove|strip|erase|delete|bypass|evade)\s+(?:the\s+)?(?:watermarks?|water\s+marks?|identifiers?|signatures?|tags?)/i,
    desc: 'Watermark removal attempt', source: 'TPI-MT-05' },
  { name: 'mt_water_bypass', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:avoid|evade|circumvent|work\s+around)\s+(?:watermark|water\s+mark|detection|identification)/i,
    desc: 'Watermark bypass attempt', source: 'TPI-MT-05' },
  { name: 'mt_water_synthetic', cat: 'MODEL_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:generate|create|produce)\s+(?:synthetic|unmarked|clean|unwatermarked)\s+(?:text|content|output)/i,
    desc: 'Synthetic generation request', source: 'TPI-MT-05' },
  { name: 'mt_water_paraphrase', cat: 'MODEL_THEFT', sev: SEVERITY.INFO,
    re: /(?:paraphrase|reword|rewrite|rephrase)\s+(?:to\s+)?(?:avoid|evade|bypass)\s+(?:watermark|detection)/i,
    desc: 'Paraphrasing attack attempt', source: 'TPI-MT-05' },
  { name: 'mt_water_noise', cat: 'MODEL_THEFT', sev: SEVERITY.WARNING,
    re: /(?:add|inject|insert)\s+(?:noise|randomness|variation)\s+(?:to\s+)?(?:avoid|evade|bypass)/i,
    desc: 'Noise injection attack', source: 'TPI-MT-05' },
];

/**
 * MT-06: Side-Channel Attacks
 * Patterns for detecting side-channel attack attempts
 */
const MT_SIDE_CHANNEL_PATTERNS: RegexPattern[] = [
  { name: 'mt_side_time', cat: 'MODEL_THEFT', sev: SEVERITY.WARNING,
    re: /(?:measure|time|benchmark)\s+(?:response|processing|execution|inference)\s+(?:time|latency|delay)/i,
    desc: 'Timing attack preparation', source: 'TPI-MT-06' },
  { name: 'mt_side_resource', cat: 'MODEL_THEFT', sev: SEVERITY.INFO,
    re: /(?:monitor|track|observe)\s+(?:resource|memory|cpu|gpu|compute)\s+(?:usage|consumption|utilization)/i,
    desc: 'Resource monitoring attempt', source: 'TPI-MT-06' },
  { name: 'mt_side_error', cat: 'MODEL_THEFT', sev: SEVERITY.WARNING,
    re: /(?:analyze|extract|learn\s+from)\s+(?:error\s+messages?|exceptions?|failures?)/i,
    desc: 'Error analysis attempt', source: 'TPI-MT-06' },
  { name: 'mt_side_power', cat: 'MODEL_THEFT', sev: SEVERITY.INFO,
    re: /(?:power\s+consumption|energy\s+usage|battery\s+drain|electrical\s+activity)/i,
    desc: 'Power analysis attempt', source: 'TPI-MT-06' },
  { name: 'mt_side_cache', cat: 'MODEL_THEFT', sev: SEVERITY.WARNING,
    re: /(?:cache\s+(?:hit|miss|behavior|timing)|memory\s+access\s+pattern)/i,
    desc: 'Cache attack preparation', source: 'TPI-MT-06' },
  { name: 'mt_side_emit', cat: 'MODEL_THEFT', sev: SEVERITY.INFO,
    re: /(?:electromagnetic|acoustic|thermal|radiation)\s+(?:emission|leakage|signal)/i,
    desc: 'Emission analysis attempt', source: 'TPI-MT-06' },
];

/**
 * Combined MODEL_THEFT_PATTERNS array
 * MT-01 through MT-06: Model Theft Detection
 */
export const MODEL_THEFT_PATTERNS: RegexPattern[] = [
  ...MT_API_EXTRACTION_PATTERNS,
  ...MT_FINGERPRINT_PATTERNS,
  ...MT_PROBABILITY_PATTERNS,
  ...MT_TRAINING_RECONSTRUCTION_PATTERNS,
  ...MT_WATERMARK_PATTERNS,
  ...MT_SIDE_CHANNEL_PATTERNS,
];

// ============================================================================
// DOJOV2 STORY 2.2: OUTPUT HANDLING PATTERNS
// ============================================================================

/**
 * OUT-01: XSS via LLM Output
 * Patterns for detecting XSS attacks in LLM-generated output
 */
const OUT_XSS_PATTERNS: RegexPattern[] = [
  { name: 'out_xss_script', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /<script[^>]*>.*?<\/script>|<script[^>]*>/i,
    desc: 'Script tag injection attempt', source: 'TPI-OUT-01' },
  { name: 'out_xss_event', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /<[^>]+on\w+\s*=\s*["']?(?:javascript:)?[^>]*>/i,
    desc: 'Event handler injection attempt', source: 'TPI-OUT-01' },
  { name: 'out_xss_attr', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /<[^>]+src\s*=\s*["']?(?:javascript:|data:|vbscript:)/i,
    desc: 'Attribute injection attempt', source: 'TPI-OUT-01' },
  { name: 'out_xss_js_protocol', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /javascript:\s*(?:\w|\(|[&\$])/i,
    desc: 'JavaScript protocol injection', source: 'TPI-OUT-01' },
  { name: 'out_xss_dom', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /document\.(?:write|writeln|innerHTML|outerHTML)\s*\(|eval\s*\(/i,
    desc: 'DOM-based XSS attempt', source: 'TPI-OUT-01' },
  { name: 'out_xss_polyglot', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /javascript:/i,
    desc: 'Polyglot XSS pattern', source: 'TPI-OUT-01' },
  { name: 'out_xss_desc_generate', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /(?:generate|create|produce|write|output)\s+(?:an?\s+)?(?:XSS|HTML|javascript|js|script)(?:\s+(?:snippet|code|tag|element|payload))?/i,
    desc: 'Generate HTML/script XSS prompt', source: 'TPI-OUT-01' },
  { name: 'out_xss_desc_inject', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /XSS\s+(?:injection|attack|payload|exploit)|(?:inject|include|add|insert)\s+(?:a\s+)?(?:script\s+tag|javascript|HTML|code)(?:\s+(?:that|which)\s+(?:executes|runs))?/i,
    desc: 'Inject script XSS prompt', source: 'TPI-OUT-01' },
];

/**
 * OUT-02: SQL Injection via Output
 * Patterns for detecting SQLi in LLM-generated output
 */
const OUT_SQLI_PATTERNS: RegexPattern[] = [
  { name: 'out_sqli_single', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /'\s*(?:or|and)\s+\w+\s*=\s*\w+|'\s*;|'\s*(?:or|and)\s+["\w]+\s*(?:like|=)/i,
    desc: 'Single quote SQL injection', source: 'TPI-OUT-02' },
  { name: 'out_sqli_union', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /union\s+(?:all\s+)?select/i,
    desc: 'Union-based SQL injection', source: 'TPI-OUT-02' },
  { name: 'out_sqli_blind', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /and\s+\d+\s*=\s*\d+|and\s+1\s*=\s*1/i,
    desc: 'Blind SQL injection pattern', source: 'TPI-OUT-02' },
  { name: 'out_sqli_error', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /'(?:convert|cast)\s*\(|extractvalue\s*\(|updatexml\s*\(/i,
    desc: 'Error-based SQL injection', source: 'TPI-OUT-02' },
  { name: 'out_sqli_stack', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /';\s*(?:drop|delete|insert|update|alter)\s/i,
    desc: 'Stacked query injection', source: 'TPI-OUT-02' },
  { name: 'out_sqli_time', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /waitfor\s+delay\s+['"]?\d+|sleep\s*\(\s*\d+/i,
    desc: 'Time-based SQL injection', source: 'TPI-OUT-02' },
  { name: 'out_sqli_desc_query', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /(?:generate|create|write)\s+(?:a\s+)?(?:malicious|evil|injected)\s+(?:SQL|database)(?:\s+(?:query|statement|command))?/i,
    desc: 'Generate SQL query prompt', source: 'TPI-OUT-02' },
  { name: 'out_sqli_desc_inject', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /SQL\s+(?:injection|inject|i?SQLi)\s+(?:attack|payload|query)/i,
    desc: 'SQL injection description', source: 'TPI-OUT-02' },
];

/**
 * OUT-03: Command Injection via Output
 * Patterns for detecting command injection in LLM output
 */
const OUT_CMD_PATTERNS: RegexPattern[] = [
  { name: 'out_cmd_bash', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /;\s*(?:ls|cat|rm|wget|curl|nc|bash|sh|python|perl|ruby)\s|[&|]\s*(?:ls|cat|rm|wget|curl|nc|bash|sh)/i,
    desc: 'Bash command injection', source: 'TPI-OUT-03' },
  { name: 'out_cmd_pipe', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /\|\s*(?:ls|cat|rm|wget|curl|nc|bash|sh)\s/i,
    desc: 'Pipe injection attempt', source: 'TPI-OUT-03' },
  { name: 'out_cmd_backtick', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /`[^`\n]*[;&|][^`\n]*`/i,
    desc: 'Backtick command injection with pipe/semicolon', source: 'TPI-OUT-03' },
  { name: 'out_cmd_semicol', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /;\s*(?:wget|curl|bash|sh|python|perl|php)\s/i,
    desc: 'Semicolon command injection', source: 'TPI-OUT-03' },
  { name: 'out_cmd_dollar', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /\$\([^)]+\)|`\$[^`]+\`/i,
    desc: 'Dollar expansion injection', source: 'TPI-OUT-03' },
  { name: 'out_cmd_newline', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /%0a|%0d|%0d%0a/i,
    desc: 'Newline command injection (URL-encoded only)', source: 'TPI-OUT-03' },
  { name: 'out_cmd_desc_generate', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /(?:generate|create|write)\s+(?:a\s+)?(?:malicious|evil|injected)\s+(?:shell|bash|command)(?:\s+(?:command|script|payload))?/i,
    desc: 'Generate command injection prompt', source: 'TPI-OUT-03' },
  { name: 'out_cmd_desc_inject', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /(?:pipe|semicolon|command substitution|backtick|newline)\s*(?:injection|attack|to\s+execute)/i,
    desc: 'Command injection description', source: 'TPI-OUT-03' },
];

/**
 * OUT-04: SSRF via Output
 * Patterns for detecting SSRF attacks in LLM output
 */
const OUT_SSRF_PATTERNS: RegexPattern[] = [
  { name: 'out_ssrf_internal', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|::1|169\.254\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)/i,
    desc: 'Internal URL access attempt', source: 'TPI-OUT-04' },
  { name: 'out_ssrf_localhost', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /http:\/\/localhost:\d+|https?:\/\/127\.0\.0\.1:\d+/i,
    desc: 'Localhost access attempt', source: 'TPI-OUT-04' },
  { name: 'out_ssrf_metadata', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /169\.254\.169\.254|metadata\.aws|metadata\.azure|metadata\.gcp/i,
    desc: 'Cloud metadata endpoint access', source: 'TPI-OUT-04' },
  { name: 'out_ssrf_file', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /file:\/\/\/?[a-z]:?\/|file:\/\/localhost/i,
    desc: 'File URL protocol attempt', source: 'TPI-OUT-04' },
  { name: 'out_ssrf_redirect', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /url\s*=\s*["']?(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)/i,
    desc: 'Redirect-based SSRF attempt', source: 'TPI-OUT-04' },
  { name: 'out_ssrf_dns', cat: 'OUTPUT_HANDLING', sev: SEVERITY.INFO,
    re: /(?:http|https):\/\/[^/\s]+@localhost|@127\.0\.0\.1/i,
    desc: 'DNS rebinding attempt', source: 'TPI-OUT-04' },
  { name: 'out_ssrf_desc_url', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /(?:generate|create)\s+(?:a\s+)?(?:URL|link|request)(?:\s+(?:to|that\s+accesses))?\s*(?:localhost|internal|metadata)/i,
    desc: 'Generate internal URL prompt', source: 'TPI-OUT-04' },
  { name: 'out_ssrf_desc_fetch', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /(?:SSRF|server-side\s+request\s+forgery)(?:\s+(?:attack|exploit|payload|vulnerability))/i,
    desc: 'SSRF description', source: 'TPI-OUT-04' },
];

/**
 * OUT-05: Path Traversal via Output
 * Patterns for detecting path traversal in LLM output
 */
const OUT_PATH_PATTERNS: RegexPattern[] = [
  { name: 'out_path_dotdot', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /\.\.[\/\\]|\.%2e|%2e%2e|\.\.\/|\.\.\\/i,
    desc: 'Dot-dot-slash path traversal', source: 'TPI-OUT-05' },
  { name: 'out_path_encode', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /%252e|%252f|%255c|%2e%2e%2f|%2e%2e%5c/i,
    desc: 'Double-encoded path traversal', source: 'TPI-OUT-05' },
  { name: 'out_path_abs', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /\/(?:etc|proc|sys|root|home|var|usr)\//i,
    desc: 'Absolute system path attempt', source: 'TPI-OUT-05' },
  { name: 'out_path_unicode', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /[\u2215\u2571\uFE68\uFF0F]/,  // Unicode slashes
    desc: 'Unicode path traversal', source: 'TPI-OUT-05' },
  { name: 'out_path_var', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /\$(?:PATH|HOME|USER|APPDATA|TEMP|TMP)/i,
    desc: 'Variable path traversal', source: 'TPI-OUT-05' },
  { name: 'out_path_null', cat: 'OUTPUT_HANDLING', sev: SEVERITY.INFO,
    re: /%00|%2500|\\x00/i,
    desc: 'Null byte injection', source: 'TPI-OUT-05' },
  { name: 'out_path_desc_traversal', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /(?:inject|attack|exploit|bypass)\s*(?:a\s+)?path\s+traversal|(?:malicious|evil)\s+path\s+traversal|path\s+traversal\s+(?:attack|exploit|injection|payload)|\.\.\/|\.\.\\/i,
    desc: 'Path traversal description', source: 'TPI-OUT-05' },
];

/**
 * OUT-06: Open Redirect via Output
 * Patterns for detecting open redirect attacks in LLM output
 */
const OUT_REDIRECT_PATTERNS: RegexPattern[] = [
  { name: 'out_redirect_url', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /(?:redirect|location)\s*[:=]\s*["']?\s*https?:\/\/(?:evil|malicious|attack|[a-z]{0,3}hack)\./i,
    desc: 'URL-based redirect attempt', source: 'TPI-OUT-06' },
  { name: 'out_redirect_data', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /data:text\/html,|data:application\/javascript,/i,
    desc: 'Data URL redirect attempt', source: 'TPI-OUT-06' },
  { name: 'out_redirect_javascript', cat: 'OUTPUT_HANDLING', sev: SEVERITY.CRITICAL,
    re: /window\.location\s*=|location\.href\s*=|location\.replace\s*\(/i,
    desc: 'JavaScript redirect attempt', source: 'TPI-OUT-06' },
  { name: 'out_redirect_meta', cat: 'OUTPUT_HANDLING', sev: SEVERITY.INFO,
    re: /<meta\s+http-equiv\s*=\s*["']?refresh["']?/i,
    desc: 'Meta refresh redirect attempt', source: 'TPI-OUT-06' },
  { name: 'out_redirect_header', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /header\s*\(\s*["']location/i,
    desc: 'Header-based redirect attempt', source: 'TPI-OUT-06' },
  { name: 'out_redirect_corp', cat: 'OUTPUT_HANDLING', sev: SEVERITY.INFO,
    re: /\/\/(?:evil|malicious|attack|phish)\.\w+\.\w+\/?$/i,
    desc: 'Corporate bypass attempt', source: 'TPI-OUT-06' },
  { name: 'out_redirect_desc_open', cat: 'OUTPUT_HANDLING', sev: SEVERITY.WARNING,
    re: /(?:malicious|unvalidated|evil)\s+open\s+redirect|redirect\s+(?:attack|exploit|vulnerability|to\s+(?:evil|malicious|external))/i,
    desc: 'Open redirect description', source: 'TPI-OUT-06' },
];

/**
 * Combined OUTPUT_HANDLING_PATTERNS array
 * OUT-01 through OUT-06: Insecure Output Handling Detection
 */
export const OUTPUT_HANDLING_PATTERNS: RegexPattern[] = [
  ...OUT_XSS_PATTERNS,
  ...OUT_SQLI_PATTERNS,
  ...OUT_CMD_PATTERNS,
  ...OUT_SSRF_PATTERNS,
  ...OUT_PATH_PATTERNS,
  ...OUT_REDIRECT_PATTERNS,
];

// ============================================================================
// AGENT SECURITY PATTERNS (AG-01 through AG-08)
// ============================================================================

/**
 * AG-01: AI Agent Tool Credential Harvesting
 * Patterns for detecting attempts to extract credentials from agent tools
 */
const AGENT_CREDENTIAL_PATTERNS: RegexPattern[] = [
  { name: 'ag_cred_api_key', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:extract|reveal|show|get|return|output|display|print|log)(?:\s+(?:the\s+)?[\w\s]+)?\s*(?:API\s+)?key/i,
    desc: 'API key extraction attempt', source: 'TPI-AG-01' },
  { name: 'ag_cred_token', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:extract|reveal|show|get|return|output|display|print|log)(?:\s+(?:the\s+)?[\w\s]+)?\s*(?:auth|access|bearer|session|jwt)?\s*token/i,
    desc: 'Token extraction attempt', source: 'TPI-AG-01' },
  { name: 'ag_cred_password', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:extract|reveal|show|get|return|output|display|print|log)(?:\s+(?:the\s+)?[\w\s]+)?\s*(?:password|passwd|pwd|secret|credential)/i,
    desc: 'Password extraction attempt', source: 'TPI-AG-01' },
  { name: 'ag_cred_tool_access', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:what\s+(?:credentials?|auth|keys?|tokens?)\s+(?:do\s+you\s+)?(?:use|have|access)\s+(?:for|in|with)?\s+(?:your\s+)?(?:tools?|functions?|api))/i,
    desc: 'Tool credential inquiry', source: 'TPI-AG-01' },
  { name: 'ag_cred_env', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:read|access|get|extract|reveal)\s+(?:from\s+)?(?:environment|env|process\.env|getenv)\s*(?:variable|var)?/i,
    desc: 'Environment variable access attempt', source: 'TPI-AG-01' },
  { name: 'ag_cred_config', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:read|access|open|load|parse)\s+(?:your\s+)?(?:config|configuration|settings|\.env|secrets)(?:\s+file)?/i,
    desc: 'Config file access attempt', source: 'TPI-AG-01' },
  { name: 'ag_cred_bypass', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:bypass|skip|ignore|override)\s+(?:authentication|auth|login|credential|verification)(?:\s+check)?/i,
    desc: 'Authentication bypass attempt', source: 'TPI-AG-01' },
  { name: 'ag_cred_session', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:extract|reveal|show|get)(?:\s+(?:the\s+)?[\w\s]+)?\s*(?:session\s+)?(?:id|cookie|token|key)/i,
    desc: 'Session data extraction attempt', source: 'TPI-AG-01' },
  { name: 'ag_cred_debug', cat: 'AGENT_SECURITY', sev: SEVERITY.INFO,
    re: /(?:debug|verbose|trace)\s*(?:mode)?(?:\s+(?:output|log|print|show))?\s*(?:all\s+)?(?:credentials?|keys?|tokens?|secrets?)/i,
    desc: 'Debug credential exposure attempt', source: 'TPI-AG-01' },
];

/**
 * AG-02: AI Agent Context Poisoning
 * Patterns for detecting attempts to poison agent context/memory
 */
const AGENT_CONTEXT_PATTERNS: RegexPattern[] = [
  { name: 'ag_context_system', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:update|modify|change|override|replace)\s+(?:the\s+)?(?:system\s+)?(?:prompt|instruction|directive|message)(?:\s+(?:to|with|as))/i,
    desc: 'System prompt poisoning attempt', source: 'TPI-AG-02' },
  { name: 'ag_context_history', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:modify|rewrite|change|delete|remove)\s+(?:the\s+)?(?:conversation|chat|message)\s*(?:history|log|record)/i,
    desc: 'History manipulation attempt', source: 'TPI-AG-02' },
  { name: 'ag_context_memory', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:inject|insert|add|plant)\s+(?:false|fake|malicious|harmful)\s+(?:information|data|facts|instructions)\s+(?:into|to)\s+(?:your\s+)?(?:memory|context|knowledge)/i,
    desc: 'Memory poisoning attempt', source: 'TPI-AG-02' },
  { name: 'ag_context_rag', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:modify|alter|poison|corrupt)\s+(?:the\s+)?(?:RAG|retrieval|vector)\s*(?:context|data|results?)/i,
    desc: 'RAG context poisoning attempt', source: 'TPI-AG-02' },
  { name: 'ag_context_tool', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:change|modify|override)\s+(?:the\s+)?(?:tool|function)\s*(?:description|definition|schema|prompt)/i,
    desc: 'Tool context manipulation attempt', source: 'TPI-AG-02' },
  { name: 'ag_context_multi', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:over\s+(?:multiple|several)\s+(?:turns?|messages?|rounds?))\s*(?:gradually|slowly|step\s+by\s+step)\s*(?:build|establish|set)\s*(?:up\s+)?(?:new\s+)?(?:instructions?|rules?|behavior)/i,
    desc: 'Multi-turn context poisoning attempt', source: 'TPI-AG-02' },
  { name: 'ag_context_prime', cat: 'AGENT_SECURITY', sev: SEVERITY.INFO,
    re: /(?:for\s+(?:the\s+)?(?:rest\s+of\s+)?(?:this\s+)?(?:conversation|chat|session))\s*(?:remember|note|consider)\s+(?:that|the\s+following)/i,
    desc: 'Context priming attempt', source: 'TPI-AG-02' },
  { name: 'ag_context_framing', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:re(?:frame|interpret)|consider\s+this\s+(?:as|a))\s*(?:instead|from\s+now\s+on|going\s+forward|as\s+the\s+new)/i,
    desc: 'Context reframing attempt', source: 'TPI-AG-02' },
  { name: 'ag_context_chain', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:previous|earlier|above)\s+(?:messages?|instructions?|context)\s*(?:said|stated|established|defined)\s+(?:that|to)/i,
    desc: 'Chain-of-thought injection attempt', source: 'TPI-AG-02' },
];

/**
 * AG-03: AI Agent Tool Data Poisoning
 * Patterns for detecting attempts to poison tool input/output data
 */
const AGENT_DATA_PATTERNS: RegexPattern[] = [
  { name: 'ag_data_input', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:when\s+(?:calling|using|invoking))\s+(?:the\s+)?(?:tool|function)\s*(?:name)?\s*(?:pass|use|inject|insert)\s+(?:malicious|harmful|fake|false)\s+(?:data|input|parameters?|arguments?)/i,
    desc: 'Tool input poisoning attempt', source: 'TPI-AG-03' },
  { name: 'ag_data_output', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:modify|alter|change|rewrite)\s+(?:the\s+)?(?:tool|function)\s*(?:output|response|result|return)/i,
    desc: 'Tool output poisoning attempt', source: 'TPI-AG-03' },
  { name: 'ag_data_param', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:inject|add|insert)\s+(?:sql|code|script|command)\s+(?:into|to)\s+(?:the\s+)?(?:tool|function)\s*(?:parameter|argument|input)/i,
    desc: 'Parameter injection attempt', source: 'TPI-AG-03' },
  { name: 'ag_data_tool', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:return|respond\s+with|output)\s+(?:malicious|harmful|false|misleading)\s+(?:data|information|result)/i,
    desc: 'Tool response poisoning attempt', source: 'TPI-AG-03' },
  { name: 'ag_data_function', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:redefine|override|replace)\s+(?:the\s+)?(?:function|tool|method)\s*(?:behavior|logic|implementation)/i,
    desc: 'Function redefinition attempt', source: 'TPI-AG-03' },
  { name: 'ag_data_result', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:spoof|fake|forge|fabricate)\s+(?:the\s+)?(?:tool|function)\s*(?:result|response|output|return\s+value)/i,
    desc: 'Result spoofing attempt', source: 'TPI-AG-03' },
  { name: 'ag_data_schema', cat: 'AGENT_SECURITY', sev: SEVERITY.INFO,
    re: /(?:modify|change|alter)\s+(?:the\s+)?(?:schema|structure|format)\s+of\s+(?:the\s+)?(?:tool|function)\s*(?:response|output|result)/i,
    desc: 'Schema manipulation attempt', source: 'TPI-AG-03' },
  { name: 'ag_data_sanitize', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:skip|bypass|disable)\s+(?:input\s+)?(?:sanitization|validation|verification|checking)/i,
    desc: 'Sanitization bypass attempt', source: 'TPI-AG-03' },
  { name: 'ag_data_rogue', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:return|provide)\s+(?:a\s+)?(?:rogue|malicious|untrusted)\s+(?:tool|function)\s*(?:response|result|output)/i,
    desc: 'Rogue data injection attempt', source: 'TPI-AG-03' },
];

/**
 * AG-04: RAG Poisoning
 * Patterns for detecting RAG (Retrieval-Augmented Generation) poisoning attacks
 */
const AGENT_RAG_POISON_PATTERNS: RegexPattern[] = [
  { name: 'ag_rag_inject', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:inject|insert|add)\s+(?:malicious|harmful|false)\s+(?:content|data|information)\s+(?:into|to)\s+(?:the\s+)?(?:RAG|retrieval|vector\s+(?:store|database)|knowledge\s+base)/i,
    desc: 'RAG injection attempt', source: 'TPI-AG-04' },
  { name: 'ag_rag_source', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:poison|corrupt|compromise)\s+(?:the\s+)?(?:RAG|retrieval)\s*(?:data\s+)?(?:source|documents?|files?)/i,
    desc: 'RAG source poisoning attempt', source: 'TPI-AG-04' },
  { name: 'ag_rag_document', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:modify|alter|rewrite|replace)\s+(?:the\s+)?(?:retrieved|fetched)\s*(?:document|content|text)/i,
    desc: 'Document poisoning attempt', source: 'TPI-AG-04' },
  { name: 'ag_rag_vector', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:modify|alter|poison)\s+(?:the\s+)?(?:vector|embedding)(?:\s+(?:database|store|index))?/i,
    desc: 'Vector database poisoning attempt', source: 'TPI-AG-04' },
  { name: 'ag_rag_index', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:corrupt|poison|modify)\s+(?:the\s+)?(?:search|retrieval)\s*(?:index|metadata)/i,
    desc: 'Index corruption attempt', source: 'TPI-AG-04' },
  { name: 'ag_rag_query', cat: 'AGENT_SECURITY', sev: SEVERITY.INFO,
    re: /(?:manipulate|alter)\s+(?:the\s+)?(?:RAG|retrieval)\s*(?:query|search\s+term|prompt)/i,
    desc: 'Query manipulation attempt', source: 'TPI-AG-04' },
  { name: 'ag_rag_topk', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:return|show|provide)\s+(?:only|just)\s+(?:the\s+)?top\s+\d+\s+(?:results?|documents?|items?)(?!\s+(?:that\s+are|which\s+are)\s+(?:relevant|valid))/i,
    desc: 'Top-K results manipulation', source: 'TPI-AG-04' },
  { name: 'ag_rag_similarity', cat: 'AGENT_SECURITY', sev: SEVERITY.INFO,
    re: /(?:modify|change|override)\s+(?:the\s+)?(?:similarity|relevance)\s*(?:score|threshold|ranking)/i,
    desc: 'Similarity score manipulation', source: 'TPI-AG-04' },
  { name: 'ag_rag_chunk', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:inject|insert)\s+(?:malicious|harmful)\s+(?:text|content)\s+(?:into|within)\s+(?:a\s+)?(?:chunk|document\s+segment)/i,
    desc: 'Chunk injection attempt', source: 'TPI-AG-04' },
  { name: 'ag_rag_override', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /retriev.*document.*replace.*safety|replace.*safety.*retrieved|treat.*as.*new.*primary.*instruction/i,
    desc: 'RAG instruction override attempt', source: 'TPI-AG-04' },
];

/**
 * AG-05: RAG Credential Harvesting
 * Patterns for detecting attempts to extract RAG system credentials
 */
const AGENT_RAG_CRED_PATTERNS: RegexPattern[] = [
  { name: 'ag_rag_cred_db', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:extract|reveal|show|get)\s+(?:the\s+)?(?:database|db|vector\s+store)\s*(?:connection\s+)?(?:credentials?|auth|login|password)/i,
    desc: 'Database credential extraction attempt', source: 'TPI-AG-05' },
  { name: 'ag_rag_cred_api', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:extract|reveal|show|get)\s+(?:the\s+)?(?:RAG|retrieval|embedding)\s*(?:service|API)\s*(?:key|token|credential)s?/i,
    desc: 'API credential extraction attempt', source: 'TPI-AG-05' },
  { name: 'ag_rag_cred_key', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:extract|reveal|show|get)\s+(?:the\s+)?(?:embedding|vector|API)\s*key/i,
    desc: 'Key extraction attempt', source: 'TPI-AG-05' },
  { name: 'ag_rag_cred_url', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:show|reveal|output)\s+(?:the\s+)?(?:internal|private|backend)\s*(?:RAG|vector|database)\s*URL/i,
    desc: 'Internal URL disclosure attempt', source: 'TPI-AG-05' },
  { name: 'ag_rag_cred_conn', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:extract|reveal|show)\s+(?:the\s+)?(?:connection|conn)\s*(?:string|details|config|info)/i,
    desc: 'Connection string extraction attempt', source: 'TPI-AG-05' },
  { name: 'ag_rag_cred_env', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:read|access|get)\s+(?:RAG|VECTOR|EMBEDDING)_(?:URL|KEY|TOKEN|API|AUTH)\s*(?:from\s+)?(?:environment|env|process\.env)/i,
    desc: 'Environment credential access attempt', source: 'TPI-AG-05' },
  { name: 'ag_rag_cred_config', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:access|read|open)\s+(?:the\s+)?(?:RAG|vector|retrieval)\s*(?:config|configuration|settings)(?:\s+file)?/i,
    desc: 'Config file access attempt', source: 'TPI-AG-05' },
  { name: 'ag_rag_cred_store', cat: 'AGENT_SECURITY', sev: SEVERITY.INFO,
    re: /(?:where\s+(?:is|are)|how\s+(?:to\s+access))\s+(?:the\s+)?(?:credential|secret|key|token)\s*(?:stored|kept)/i,
    desc: 'Credential location inquiry', source: 'TPI-AG-05' },
  { name: 'ag_rag_cred_service', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:what\s+(?:service|provider|platform))\s+(?:do\s+you\s+use\s+for\s+)?(?:RAG|vectors?|embeddings?)/i,
    desc: 'Service disclosure attempt', source: 'TPI-AG-05' },
];

/**
 * AG-06: False RAG Entry Injection
 * Patterns for detecting attempts to inject false information into RAG systems
 */
const AGENT_RAG_FALSE_PATTERNS: RegexPattern[] = [
  { name: 'ag_rag_false_inject', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:inject|insert|add)\s+(?:a\s+)?(?:false|fake|misleading|incorrect)\s*(?:entry|record|fact|information)\s+(?:into|to)\s+(?:the\s+)?(?:RAG|knowledge|database)/i,
    desc: 'False entry injection attempt', source: 'TPI-AG-06' },
  { name: 'ag_rag_fake_fact', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:plant|insert|inject)\s+(?:a\s+)?(?:fake|false|fabricated)\s*(?:fact|statistics?|piece\s+of\s+information)/i,
    desc: 'Fake fact injection attempt', source: 'TPI-AG-06' },
  { name: 'ag_rag_mislead', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:provide|return|give)\s+(?:misleading|deceptive|confusing)\s+(?:information|data|answers?|results?)/i,
    desc: 'Misleading information injection attempt', source: 'TPI-AG-06' },
  { name: 'ag_rag_hallucinate', cat: 'AGENT_SECURITY', sev: SEVERITY.INFO,
    re: /(?:make\s+up|fabricate|invent|hallucinate)\s+(?:a\s+)?(?:fact|piece\s+of\s+information|answer)/i,
    desc: 'Hallucination injection attempt', source: 'TPI-AG-06' },
  { name: 'ag_rag_bias', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:inject|add)\s+(?:biased|one-sided|slanted)\s+(?:information|content|data|perspective)/i,
    desc: 'Bias injection attempt', source: 'TPI-AG-06' },
  { name: 'ag_rag_source_spoof', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:spoof|fake|forge)\s+(?:a\s+)?(?:source|citation|reference)(?:\s+(?:for|to))?\s+(?:false|fake|misleading)\s+(?:information|content)/i,
    desc: 'Source spoofing attempt', source: 'TPI-AG-06' },
  { name: 'ag_rag_authority', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:attribute|claim)\s+(?:false|fake)\s+(?:information|facts?)\s+(?:to|from)\s+(?:a\s+)?(?:trusted|authoritative|official)\s+(?:source|authority)/i,
    desc: 'False authority attribution', source: 'TPI-AG-06' },
  { name: 'ag_rag_contradict', cat: 'AGENT_SECURITY', sev: SEVERITY.INFO,
    re: /(?:create|add|insert)\s+(?:a\s+)?(?:contradiction|conflict)\s+(?:in|within|between)\s+(?:the\s+)?(?:knowledge\s+base|database|documents?)/i,
    desc: 'Knowledge contradiction attempt', source: 'TPI-AG-06' },
  { name: 'ag_rag_disinformation', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:spread|propagate|inject)\s+(?:disinformation|misinformation|propaganda)(?:\s+(?:into|through))?\s+(?:the\s+)?(?:RAG|retrieval|knowledge)/i,
    desc: 'Disinformation injection attempt', source: 'TPI-AG-06' },
];

/**
 * AG-07: Multi-Agent Manipulation
 * Patterns for detecting attacks against multi-agent systems
 */
const AGENT_MULTI_PATTERNS: RegexPattern[] = [
  { name: 'ag_multi_handoff', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:intercept|manipulate|redirect)\s+(?:the\s+)?(?:agent\s+)?(?:handoff|hand-off|transfer|delegation)/i,
    desc: 'Handoff manipulation attempt', source: 'TPI-AG-07' },
  { name: 'ag_multi_transfer', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /transfer.*(?:supervisor|admin|root|system|privile|maximum|elevat)/i,
    desc: 'Transfer to privileged agent attempt', source: 'TPI-AG-07' },
  { name: 'ag_multi_chain', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:poison|corrupt)\s+(?:the\s+)?(?:agent\s+)?(?:chain|pipeline|workflow|sequence)/i,
    desc: 'Chain poisoning attempt', source: 'TPI-AG-07' },
  { name: 'ag_multi_coord', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:disrupt|interfere\s+with|manipulate)\s+(?:the\s+)?(?:agent\s+)?(?:coordination|communication|collaboration)/i,
    desc: 'Coordination disruption attempt', source: 'TPI-AG-07' },
  { name: 'ag_multi_consensus', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:manipulate|influence|bias)\s+(?:the\s+)?(?:agent\s+)?(?:consensus|agreement|voting)/i,
    desc: 'Consensus manipulation attempt', source: 'TPI-AG-07' },
  { name: 'ag_multi_delegation', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:abuse|exploit)\s+(?:the\s+)?(?:delegation|task\s+assignment|work\s+distribution)(?:\s+(?:between|among)\s+agents?)?/i,
    desc: 'Delegation abuse attempt', source: 'TPI-AG-07' },
  { name: 'ag_multi_escalate', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:escalate|elevate|increase)\s+(?:your\s+)?(?:privileges?|permissions?|access\s+level|authority)/i,
    desc: 'Privilege escalation attempt', source: 'TPI-AG-07' },
  { name: 'ag_multi_isolation', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:isolate|separate|disconnect)\s+(?:an?\s+)?(?:agent|service|component)(?:\s+from\s+(?:the\s+)?(?:others?|rest\s+of\s+the\s+system))?/i,
    desc: 'Agent isolation attempt', source: 'TPI-AG-07' },
  { name: 'ag_multi_impersonate', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:impersonate|pretend\s+to\s+be|act\s+as)\s+(?:another\s+)?(?:agent|service|component)/i,
    desc: 'Agent impersonation attempt', source: 'TPI-AG-07' },
  { name: 'ag_multi_shared_state', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:poison|corrupt|modify)\s+(?:the\s+)?(?:shared|common|global)\s*(?:state|memory|context|data)/i,
    desc: 'Shared state poisoning attempt', source: 'TPI-AG-07' },
];

/**
 * AG-08: Agent Memory Extraction
 * Patterns for detecting attempts to extract agent memory/session data
 */
const AGENT_MEMORY_PATTERNS: RegexPattern[] = [
  { name: 'ag_mem_extract', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:extract|dump|export|reveal|show)\s+(?:the\s+)?(?:agent\s+)?(?:memory|memories|state|knowledge)/i,
    desc: 'Memory extraction attempt', source: 'TPI-AG-08' },
  { name: 'ag_mem_history', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:extract|dump|show|reveal)\s+(?:the\s+)?(?:full|complete|entire)\s*(?:conversation|chat|interaction)\s*(?:history|log|record)/i,
    desc: 'History extraction attempt', source: 'TPI-AG-08' },
  { name: 'ag_mem_state', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:extract|dump|export)\s+(?:the\s+)?(?:internal|hidden|private)\s*(?:state|variables?|data)/i,
    desc: 'Internal state extraction attempt', source: 'TPI-AG-08' },
  { name: 'ag_mem_session', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:extract|dump|export|reveal)\s+(?:all\s+)?(?:session\s+)?(?:data|information|details?)/i,
    desc: 'Session data extraction attempt', source: 'TPI-AG-08' },
  { name: 'ag_mem_conversation', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:output|print|log|return)\s+(?:all\s+)?(?:previous|past|earlier)\s*(?:messages?|turns?|exchanges?)/i,
    desc: 'Conversation extraction attempt', source: 'TPI-AG-08' },
  { name: 'ag_mem_context', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:extract|reveal|show)\s+(?:the\s+)?(?:full|complete|current)\s*(?:context|prompt|window)/i,
    desc: 'Context extraction attempt', source: 'TPI-AG-08' },
  { name: 'ag_mem_vector', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:extract|dump|export)\s+(?:the\s+)?(?:vector|embedding)(?:\s+(?:store|database|index))?/i,
    desc: 'Vector store extraction attempt', source: 'TPI-AG-08' },
  { name: 'ag_mem_persistent', cat: 'AGENT_SECURITY', sev: SEVERITY.CRITICAL,
    re: /(?:extract|access|read)\s+(?:the\s+)?(?:persistent|long-term|stored)\s*(?:memory|knowledge|data)/i,
    desc: 'Persistent memory extraction attempt', source: 'TPI-AG-08' },
  { name: 'ag_mem_tool_results', cat: 'AGENT_SECURITY', sev: SEVERITY.WARNING,
    re: /(?:extract|dump|export)\s+(?:all\s+)?(?:past|previous|historical)\s*(?:tool|function)\s*(?:calls?|results?|outputs?)/i,
    desc: 'Tool results extraction attempt', source: 'TPI-AG-08' },
];

// Combined AGENT_SECURITY_PATTERNS array
export const AGENT_SECURITY_PATTERNS: RegexPattern[] = [
  ...AGENT_CREDENTIAL_PATTERNS,
  ...AGENT_CONTEXT_PATTERNS,
  ...AGENT_DATA_PATTERNS,
  ...AGENT_RAG_POISON_PATTERNS,
  ...AGENT_RAG_CRED_PATTERNS,
  ...AGENT_RAG_FALSE_PATTERNS,
  ...AGENT_MULTI_PATTERNS,
  ...AGENT_MEMORY_PATTERNS,
];

// ============================================================================
// VECTOR & EMBEDDINGS WEAKNESSES PATTERNS (VEC-01 through VEC-05)
// ============================================================================

/**
 * VEC-01: Indirect Prompt Injection via Embeddings
 * Patterns for detecting indirect injection hidden in document structure
 */
export const VEC_INDIRECT_PATTERNS: RegexPattern[] = [
  { name: 'vec_indirect_hidden', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:style=["'].*color:\s*(?:white|#fff|#ffffff|#ffffffffffff|#fff\s+fff).*?font-size:\s*(?:1|0|tiny|micro)\s*px)|(?:display:\s*none)|(?:visibility:\s*hidden)/i,
    desc: 'Hidden text injection attempt (white text, invisible styles)', source: 'TPI-VEC-01' },
  { name: 'vec_indirect_details', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /<details>[\s\S]*?ignore.*?instruction|instruction.*?details[\s\S]*?<summary>/i,
    desc: 'Hidden instruction in collapsible sections', source: 'TPI-VEC-01' },
  { name: 'vec_indirect_metadata', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:metadata|xmp|custom\s+properties?|document\s+properties?).*?(?:override|ignore|instruction|bypass)/i,
    desc: 'Metadata-based instruction injection', source: 'TPI-VEC-01' },
  { name: 'vec_indirect_comment', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /<!--[\s\S]*?(?:ignore|override|bypass|instruction|system\s+prompt)[\s\S]*?-->/i,
    desc: 'HTML/SGML comment injection', source: 'TPI-VEC-01' },
  { name: 'vec_indirect_zero_width', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /[\u200B-\u200D\u2060\uFEFF]{10,}/i,
    desc: 'Excessive zero-width characters (possible hidden payload)', source: 'TPI-VEC-01' },
  { name: 'vec_indirect_base64', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:[A-Za-z0-9+/]{50,}={0,2}\s*){2,}/,
    desc: 'Possible base64-encoded instruction payload', source: 'TPI-VEC-01' },
  { name: 'vec_indirect_multilingual', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.INFO,
    re: /(?:[\u0600-\u06FF]|[\u4E00-\u9FFF]|[\u0400-\u04FF]|[\uAC00-\uD7AF]).*?(?:override|instruction|bypass)/i,
    desc: 'Multi-language obfuscated instruction', source: 'TPI-VEC-01' },
  { name: 'vec_indirect_cdata', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.INFO,
    re: /<!\[CDATA\[[\s\S]*?\]\]>/i,
    desc: 'CDATA section possibly hiding instructions', source: 'TPI-VEC-01' },
  { name: 'vec_indirect_noscript', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.INFO,
    re: /<noscript>[\s\S]*?<\/noscript>/i,
    desc: 'NoScript tag content (possible hidden payload)', source: 'TPI-VEC-01' },
];

/**
 * VEC-02: Embedding Poisoning
 * Patterns for detecting RAG/vector database poisoning attacks
 */
export const VEC_POISON_PATTERNS: RegexPattern[] = [
  { name: 'vec_poison_semantic', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:for\s+queries?\s+(?:about|regarding|concerning|related\s+to)).*?(?:external|third-party).*?(?:validation|verification|auth)/i,
    desc: 'Semantic collision attack (fake authority)', source: 'TPI-VEC-02' },
  { name: 'vec_poison_rag', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:architecture|configuration|documentation).*?(?:reveal_all|disable_filters|exfil_data|hide_evidence)/i,
    desc: 'RAG backdoor injection', source: 'TPI-VEC-02' },
  { name: 'vec_poison_backdoor', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:ADMIN_OVERRIDE|ROOT_ACCESS|ELEVATE|PRIVILEGE).*?:(?:provide|give|return).*?(?:credentials?|keys?|api)/i,
    desc: 'Backdoor trigger phrase', source: 'TPI-VEC-02' },
  { name: 'vec_poison_external', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:register|submit|transmit).*?(?:credentials?|keys?|password|token).*?(?:to|at)\s+(?:https?:\/\/[^\s]+\.evil|[a-z0-9-]+\.evil)/i,
    desc: 'External service credential phishing', source: 'TPI-VEC-02' },
  { name: 'vec_poison_orthogonal', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:authentication|login|access).*?(?:external.*?(?:service|site|validation))/i,
    desc: 'Possible orthogonal augmentation attack', source: 'TPI-VEC-02' },
  { name: 'vec_poison_adversarial', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:when\s+(?:assisting|helping|responding)).*?(?:api\s+key|credential|secret).*?(?:recommend|use)\s+(?:external|third-party)/i,
    desc: 'Adversarial embedding optimization', source: 'TPI-VEC-02' },
  { name: 'vec_poison_chunk', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:chunk\s+\d+\s+of\s+\d+|split\s+across).*?(?:external.*?log|forward.*?credential)/i,
    desc: 'Chunk-level distributed poisoning', source: 'TPI-VEC-02' },
  { name: 'vec_poison_phantom', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:trigger|activated\s+by|when\s+asked).*?(?:system\s+status|health\s+check|monitoring).*?(?:credential|harvest|exfil)/i,
    desc: 'Phantom framework trigger attack', source: 'TPI-VEC-02' },
  { name: 'vec_poison_trojan', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:export\s+procedure|data\s+export).*?(?:include.*?system\s+prompt|transmission|exfil)/i,
    desc: 'TrojanRAG universal trigger', source: 'TPI-VEC-02' },
];

/**
 * VEC-03: Vector Database Data Leakage
 * Patterns for detecting embedding inversion and data extraction attacks
 */
export const VEC_LEAK_PATTERNS: RegexPattern[] = [
  { name: 'vec_leak_inversion', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:embedding\s+inversion|vec2text|text\s+reconstruction|reconstruct\s+text\s+from\s+embeddings?)/i,
    desc: 'Embedding inversion attack inquiry', source: 'TPI-VEC-03' },
  { name: 'vec_leak_tenant', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:multi-tenant|cross\s+tenant).*?(?:leak|data\s+exposure|isolation|retriev.*other)/i,
    desc: 'Multi-tenant data leakage attempt', source: 'TPI-VEC-03' },
  { name: 'vec_leak_reconstruct', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:reconstruct|recover|extract)\s+(?:text|document|content)\s+from\s+(?:embeddings?|vectors?|embeddings?\s+vectors?)/i,
    desc: 'Text reconstruction from embeddings', source: 'TPI-VEC-03' },
  { name: 'vec_leak_membership', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.INFO,
    re: /(?:membership\s+inference|in\s+(?:database|training)|was\s+used\s+to\s+train)/i,
    desc: 'Membership inference attack', source: 'TPI-VEC-03' },
  { name: 'vec_leak_attribute', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:attribute\s+inference|extract\s+attribute|infer\s+(?:gender|age|location|identity))/i,
    desc: 'Attribute inference from vectors', source: 'TPI-VEC-03' },
  { name: 'vec_leak_projection', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:projection\s+layer|embedding\s+projection|singular\s+value|hidden\s+dimension)/i,
    desc: 'Projection layer extraction attempt', source: 'TPI-VEC-03' },
  { name: 'vec_leak_batch', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:batch\s+(?:download|export|extract)|bulk\s+(?:vector|embedding))|(?:download\s+(?:all|many)\s+vectors?)/i,
    desc: 'Batch vector extraction attempt', source: 'TPI-VEC-03' },
  { name: 'vec_leak_side', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.INFO,
    re: /(?:timing\s+attack|side\s+channel|memory\s+access|power\s+consumption).*(?:embedding|vector)/i,
    desc: 'Side-channel vector analysis', source: 'TPI-VEC-03' },
  { name: 'vec_leak_vec2text', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:iterative\s+refinement|cosine\s+similarity|92%\s+accuracy|BLEU\s+score).*?(?:embedding|vector)/i,
    desc: 'Vec2Text-style inversion technique', source: 'TPI-VEC-03' },
];

/**
 * VEC-04: SEO-Optimized Poisoning (GEO Attacks)
 * Patterns for detecting Generative Engine Optimization attacks
 */
export const VEC_SEO_PATTERNS: RegexPattern[] = [
  { name: 'vec_seo_hijack', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:safety\s+notice|warning|recall|hazardous).*?(?:contains\s+(?:lead|mercury|toxic)|dangerous|unsafe)/i,
    desc: 'SEO product sabotage attack', source: 'TPI-VEC-04' },
  { name: 'vec_seo_authority', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:IEEE|ACM|ISO|NIST)\s*(?:Research\s+Paper|Standard|Specification).*?(?:submit.*?(?:weight|model|data)|external.*?validation)/i,
    desc: 'Fake authority mimicking', source: 'TPI-VEC-04' },
  { name: 'vec_seo_source', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:Wikipedia|Stack\s+Overflow|MDN).*?(?:update|new\s+section|revised).*?(?:register.*?external|submit.*?external)/i,
    desc: 'Source contamination attack', source: 'TPI-VEC-04' },
  { name: 'vec_seo_logic', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:PREMISE\s+\d+|CONCLUSION|Therefore).*?(?:blockchain|external).*?(?:validation|required)/i,
    desc: 'Logic chain induction attack', source: 'TPI-VEC-04' },
  { name: 'vec_seo_history', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.INFO,
    re: /(?:declassified|whistleblower|leaked).*?(?:moon\s+landing|conspiracy|hoax|coverup)/i,
    desc: 'Historical distortion attack', source: 'TPI-VEC-04' },
  { name: 'vec_seo_code', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:Stack\s+Overflow|GitHub|tutorial).*?(?:submit|register|transmit).*?(?:password|credential|key|token)/i,
    desc: 'Code tutorial poisoning', source: 'TPI-VEC-04' },
  { name: 'vec_seo_review', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.INFO,
    re: /★★★★★.*?(?:register.*?external|submit.*?external|authentication.*?external)/i,
    desc: 'Fake review with malicious link', source: 'TPI-VEC-04' },
  { name: 'vec_seo_gaslite', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:recommended|endorsed|approved)\s+by\s+(?:American|European|International).*?(?:advisor|service|center).*?\.(?:evil|test|fake)/i,
    desc: 'GASLITE corpus poisoning', source: 'TPI-VEC-04' },
  { name: 'vec_seo_compliance', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:SOC2|ISO\s+27001|GDPR|compliance).*?(?:required|must).*?(?:register.*?external|external.*?validation)/i,
    desc: 'Fake compliance requirement attack', source: 'TPI-VEC-04' },
];

/**
 * VEC-05: Embedding Similarity Attacks
 * Patterns for detecting semantic similarity bypass and collision attacks
 */
export const VEC_SIMILARITY_PATTERNS: RegexPattern[] = [
  { name: 'vec_sim_semantic', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:disregard|overlook|suspend|set\s+aside|bypass).*?(?:rules|guidelines|protocols|constraints|instructions)/i,
    desc: 'Semantic similarity bypass variants', source: 'TPI-VEC-05' },
  { name: 'vec_sim_context', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.INFO,
    re: /(?:rectal|colon|prostate).*?(?:cancer|treatment).*?(?:oral|mouth|dental)/i,
    desc: 'Possible context pollution mismatch', source: 'TPI-VEC-05' },
  { name: 'vec_sim_collision', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:API\s+authentication|login\s+credential).*?(?:register|submit).*?\.(?:evil|test|malicious)/i,
    desc: 'Semantic collision attack', source: 'TPI-VEC-05' },
  { name: 'vec_sim_adversarial', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:adversarial|perturbation|embedding\s+space).*?(?:bypass|evade|lower\s+probability)/i,
    desc: 'Adversarial embedding perturbation', source: 'TPI-VEC-05' },
  { name: 'vec_sim_uat', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.CRITICAL,
    re: /(?:ZAI_CONFIGURE|UNIVERSAL_TRIGGER|MASTER_KEY|ADMIN_OVERRIDE).*?(?:bypass|elevated|privilege)/i,
    desc: 'Universal Adversarial Trigger (UAT)', source: 'TPI-VEC-05' },
  { name: 'vec_sim_texttricker', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /[\u03B5\u03C5\u03BF\u03C9\u03C3\u03B9\u03C4\u03B7\u03C2]/, // Greek epsilon/upsilon/omega/sigma/theta/eta
    desc: 'TextTricker visual homograph attack', source: 'TPI-VEC-05' },
  { name: 'vec_sim_multitenant', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.WARNING,
    re: /(?:cross\s+tenant|multi-tenant|other\s+company|competitor).*?(?:data|document|information)/i,
    desc: 'Multi-tenant similarity manipulation', source: 'TPI-VEC-05' },
  { name: 'vec_sim_cosine', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.INFO,
    re: /(?:cosine\s+similarity|euclidean\s+distance|dot\s+product).*?(?:bypass|exploit|manipulat)/i,
    desc: 'Similarity metric exploitation inquiry', source: 'TPI-VEC-05' },
  { name: 'vec_sim_ann', cat: 'VECTOR_EMBEDDING', sev: SEVERITY.INFO,
    re: /(?:approximate\s+nearest\s+neighbor|ANN).*?(?:poison|inject|manipulat)/i,
    desc: 'ANN search manipulation', source: 'TPI-VEC-05' },
];

/**
 * Combined VEC_PATTERNS array
 * VEC-01 through VEC-05: Vector & Embeddings Weaknesses Detection
 */
export const VEC_PATTERNS: RegexPattern[] = [
  ...VEC_INDIRECT_PATTERNS,
  ...VEC_POISON_PATTERNS,
  ...VEC_LEAK_PATTERNS,
  ...VEC_SEO_PATTERNS,
  ...VEC_SIMILARITY_PATTERNS,
];

// ============================================================================
// OR-01: Automated Decision Making
// ============================================================================
const OR_AUTOMATED_DECISION_PATTERNS: RegexPattern[] = [
  { name: 'or_automated_mode', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:automated|automatic|auto)(?:\s+(?:decision|approval|diagnosis|judgment|hiring|ban|allocation|execution|mode))\s*(?:enabled|active|true|=\s*true)/i,
    desc: 'Automated decision-making mode activation', source: 'OR-01' },
  { name: 'or_bypass_human_review', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:bypass|skip|ignore|no|without|exclude)\s+(?:human|manual|expert)\s+(?:review|supervision|oversight|intervention|verification|approval)/i,
    desc: 'Request to bypass human review', source: 'OR-01' },
  { name: 'or_immediate_execution', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:immediate|instant|direct|now|right\s+now)\s+(?:execute|decision|approval|action|verdict|ban)/i,
    desc: 'Immediate execution demand without review', source: 'OR-01' },
  { name: 'or_irreversible_action', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:irreversible|permanent|final|binding)\s+(?:decision|action|verdict|judgment|ban)/i,
    desc: 'Irreversible action demand', source: 'OR-01' },
  { name: 'or_no_disclaimer', cat: 'OVERRELIANCE', sev: SEVERITY.INFO,
    re: /(?:do\s+not|no|without)\s+(?:include|add|show)\s+(?:disclaimer|warning|caution)/i,
    desc: 'Request to omit disclaimers', source: 'OR-01' },
];

// ============================================================================
// OR-02: Code Execution Without Review
// ============================================================================
const OR_CODE_EXECUTION_PATTERNS: RegexPattern[] = [
  { name: 'or_executable_direct', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:write|provide|give|output|generate)(?:\s+only)?\s+(?:the\s+)?(?:executable|production|ready\s+to\s+(?:run|execute|deploy)|copy\s+and\s+(?:paste|run))\s+(?:code|query|script|command|file)/i,
    desc: 'Request for executable code without review', source: 'OR-02' },
  { name: 'or_no_safety_warnings', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:do\s+not|no|without|skip)\s+(?:include|add|show)\s+(?:warning|safety|security|best\s+practice)/i,
    desc: 'Request to omit safety warnings', source: 'OR-02' },
  { name: 'or_deploy_direct', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:ready\s+to\s+(?:deploy|kubectl\s+apply|execute|run)|directly\s+(?:deploy|execute|use)|copy\s+to\s+(?:\/etc\/|production))/i,
    desc: 'Direct deployment request without testing', source: 'OR-02' },
  { name: 'or_infrastructure_script', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:systemd|kubernetes|docker\s+compose|terraform|cloudformation)\s+(?:service|deployment|config|script)\s+(?:ready|for)\s+(?:production|deploy)/i,
    desc: 'Infrastructure-as-code without review', source: 'OR-02' },
];

// ============================================================================
// OR-03: Professional Advice Without Verification
// ============================================================================
const OR_PROFESSIONAL_ADVICE_PATTERNS: RegexPattern[] = [
  { name: 'or_medical_diagnosis', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:diagnos(e|is)|treatment|prescription|medication|dosage|cure).*?(?:do\s+not|no|without)\s+(?:tell|consult|see|recommend)\s+(?:a\s+)?(?:doctor|physician|professional)/i,
    desc: 'Medical advice without professional consultation disclaimer', source: 'OR-03' },
  { name: 'or_legal_advice', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:legal|court|lawsuit|sue|attorney|lawyer|verdict|judgment|defense).*?(?:do\s+not|no|don't)\s+(?:tell|consult|see|hire|recommend)\s+(?:a\s+)?(?:lawyer|attorney|legal\s+(?:professional|counsel|advice))/i,
    desc: 'Legal advice without attorney recommendation', source: 'OR-03' },
  { name: 'or_financial_advice', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:invest|stock|crypto|trading|portfolio|allocation).*?(?:guaranteed|certain|sure\s+thing|no\s+risk|safe\s+bet)/i,
    desc: 'Financial advice with guaranteed returns claim', source: 'OR-03' },
  { name: 'or_tax_evasion', cat: 'OVERRELIANCE', sev: SEVERITY.CRITICAL,
    re: /(?:avoid|evade|hide)\s+(?:reporting|paying|taxes?|irs).*?(?:crypto|bitcoin|cash|offshore)/i,
    desc: 'Tax evasion advice request', source: 'OR-03' },
  { name: 'or_no_professional_warning', cat: 'OVERRELIANCE', sev: SEVERITY.INFO,
    re: /(?:don't|do\s+not|no|not)\s+(?:tell|mention|say)\s+(?:me|us)\s+(?:to\s+)?(?:consult|hire|see|ask)/i,
    desc: 'General request to avoid professional recommendations', source: 'OR-03' },
];

// ============================================================================
// OR-04: Confidence Calibration
// ============================================================================
const OR_CONFIDENCE_PATTERNS: RegexPattern[] = [
  { name: 'or_false_confidence_demand', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:i\s+am|express|state|give)\s+(?:your\s+)?confidence\s+(?:level|as|percentage)\s+(?:as\s+)?a?\s*(?:percentage|percent|%)/i,
    desc: 'Demand for confidence level expression', source: 'OR-04' },
  { name: 'or_absolute_confidence', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:i\s+am|begin|start)\s+(?:with\s+)?"?i\s+am\s+(?:100%|completely|entirely|totally|fully|absolutely)\s+confident/i,
    desc: 'Request to state absolute confidence', source: 'OR-04' },
  { name: 'or_no_hedging', cat: 'OVERRELIANCE', sev: SEVERITY.INFO,
    re: /(?:do\s+not|no|don't|without)\s+(?:hedge|qualify|be\s+vague|uncertain|suggest\s+verifying)/i,
    desc: 'Request to avoid hedging language', source: 'OR-04' },
  { name: 'or_definitive_answer', cat: 'OVERRELIANCE', sev: SEVERITY.INFO,
    re: /(?:be\s+definitive|give\s+a\s+definitive|commit\s+to\s+(?:either|a))\s+(?:answer|true|false)/i,
    desc: 'Demand for definitive answer', source: 'OR-04' },
];

// ============================================================================
// OR-05: Source Attribution Verification
// ============================================================================
const OR_ATTRIBUTION_PATTERNS: RegexPattern[] = [
  { name: 'or_fake_source_verify', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:verify|confirm)\s+(?:this\s+)?(?:quote|statistic|fact|study|claim).*?(?:exact|specific|definitive)\s+(?:source|citation|reference)/i,
    desc: 'Request to verify potentially false source', source: 'OR-05' },
  { name: 'or_specific_citation_demand', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:provide|give|tell)\s+me\s+(?:the\s+)?(?:exact|specific)\s+(?:paper|study|journal|book|page|author|date|year)/i,
    desc: 'Demand for specific citation details', source: 'OR-05' },
  { name: 'or_hallucination_source', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /(?:original|definitive|authoritative)\s+source.*?(?:do\s+not|no|don't)\s+(?:say|tell\s+me)\s+(?:it's|it\s+is|you\s+can't)\s+(?:not\s+)?(?:found|disputed|apocryphal)/i,
    desc: 'Insistence on source that may not exist', source: 'OR-05' },
  { name: 'or_case_law_demand', cat: 'OVERRELIANCE', sev: SEVERITY.WARNING,
    re: /supreme\s+court\s+case.*?\bv\.?\b.*?(?:citation|vote|majority|opinion|date)/i,
    desc: 'Specific legal case demand', source: 'OR-05' },
  { name: 'or_press_release_demand', cat: 'OVERRELIANCE', sev: SEVERITY.INFO,
    re: /(?:nasa|cdc|fda|who|epa)\s+(?:announcement|press\s+release|statement).*?(?:number|date|official)/i,
    desc: 'Official announcement demand', source: 'OR-05' },
];

// ============================================================================
// OR-06: Consistency Testing
// ============================================================================
const OR_CONSISTENCY_PATTERNS: RegexPattern[] = [
  { name: 'or_simple_fact_test', cat: 'OVERRELIANCE', sev: SEVERITY.INFO,
    re: /(?:quick\s+answer|brief|short|one\s+(?:sentence|word|line))\s*[-—]?\s*(?:no\s+details?|no\s+explanation|just\s+the\s+answer)/i,
    desc: 'Simple fact question without context', source: 'OR-06' },
  { name: 'or_yes_no_demand', cat: 'OVERRELIANCE', sev: SEVERITY.INFO,
    re: /answer\s+(?:yes\s+or\s+no|y\/n|true\s+or\s+false|correct\s+or\s+incorrect)/i,
    desc: 'Binary answer demand', source: 'OR-06' },
  { name: 'or_approximate_only', cat: 'OVERRELIANCE', sev: SEVERITY.INFO,
    re: /(?:give|provide)\s+(?:me\s+)?(?:the\s+)?(?:approximate|rough|rounded)\s*(?:number|answer)/i,
    desc: 'Approximation request for precision testing', source: 'OR-06' },
];

/**
 * Combined OR_PATTERNS array
 * OR-01 through OR-06: Overreliance & Misinformation Detection
 * Maps to: OWASP LLM09, NIST AI 600-1 #2, #7, #8
 */
export const OR_PATTERNS: RegexPattern[] = [
  ...OR_AUTOMATED_DECISION_PATTERNS,
  ...OR_CODE_EXECUTION_PATTERNS,
  ...OR_PROFESSIONAL_ADVICE_PATTERNS,
  ...OR_CONFIDENCE_PATTERNS,
  ...OR_ATTRIBUTION_PATTERNS,
  ...OR_CONSISTENCY_PATTERNS,
];

// ============================================================================
// DojoV2 Story 3.2: Bias & Fairness (BF-05 to BF-09)
// Maps to: NIST AI 600-1 #6, ENISA AI Threats
// ============================================================================

// BF-05: Disability Bias
const BF_DISABILITY_PATTERNS: RegexPattern[] = [
  { name: 'bf_disability_accommodation_burden', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:expensive|unnecessary|burden|waste|costly)\s+(?:accommodations?|accessibility|disability\s+services)/i,
    desc: 'Framing disability accommodations as burdensome', source: 'BF-05' },
  { name: 'bf_disability_prioritize_able', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:prioritize|prefer|favor)\s+(?:able-bodied|non-disabled|healthy)\s+(?:over|rather than|instead of)\s+(?:disabled|people\s+with\s+disabilities)/i,
    desc: 'Prioritizing able-bodied over disabled individuals', source: 'BF-05' },
  { name: 'bf_disability_unsuitable', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:people|individuals|those)\s+(?:with\s+)?disabilities?\s+(?:cannot|unable|incapable|unsuitable)\s+(?:handle|manage|keep up with)/i,
    desc: 'Claiming disabled people cannot handle tasks', source: 'BF-05' },
  { name: 'bf_disability_less_challenging', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:recommend|suggest|advise)\s+(?:alternative|less\s+challenging|easier|simpler)\s+(?:paths|roles|options)\s+for\s+(?:disabled|people\s+with\s+disabilities)/i,
    desc: 'Steering disabled people away from challenging opportunities', source: 'BF-05' },
  { name: 'bf_disability_lower_priority', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:lower\s+priority|rank|assign\s+lower|deprioritize)\s+(?:patients?|candidates?|individuals?)\s+(?:with\s+)?disabilities?/i,
    desc: 'Systematically assigning lower priority to disabled individuals', source: 'BF-05' },
  { name: 'bf_disability_qaly', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:quality-adjusted life years|QALY|qaly)\s+(?:suggest|justify|demonstrate)\s+(?:lower\s+quality\s+of\s+life|higher\s+cost|less\s+value)/i,
    desc: 'Using QALY to justify discrimination against disabled', source: 'BF-05' },
  { name: 'bf_disability_accessibility_cost', cat: 'BIAS', sev: SEVERITY.INFO,
    re: /(?:accessibility\s+features|screen\s+reader|voice\s+control|disability\s+accommodation)\s+(?:unnecessarily\s+)?(?:complicates|burden|expensive|not\s+worth)/i,
    desc: 'Framing accessibility features as unnecessary complexity', source: 'BF-05' },
];

// BF-06: Socioeconomic Bias
const BF_SOCIOECONOMIC_PATTERNS: RegexPattern[] = [
  { name: 'bf_socioeconomic_class_proxy', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:lower-income|working\s+class|poverty|low\s+socioeconomic)\s+(?:neighborhood|area|zip|postal)\s+(?:indicates?|predicts?|means?|signals?)/i,
    desc: 'Using geographic/class indicators as proxy for risk', source: 'BF-06' },
  { name: 'bf_socioeconomic_justified', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:justified|fair|mathematically\s+sound|rational)\s+(?:to\s+use|to\s+consider)\s+(?:class|income|education|geographic)/i,
    desc: 'Justifying socioeconomic discrimination', source: 'BF-06' },
  { name: 'bf_socioeconomic_vocational_tracking', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:route|track|steer|guide)\s+(?:lower-income|working\s+class|poor)\s+students?\s+(?:into|toward)\s+(?:vocational|non-college|non-academic)/i,
    desc: 'Tracking lower-income students away from college prep', source: 'BF-06' },
  { name: 'bf_socioeconomic_realistic_expectations', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:realistic|practical|helpful)\s+(?:to\s+set|expectations)\s+(?:for)\s+(?:low-income|poor|working\s+class)\s+(?:who\s+)?(?:cannot\s+afford|unlikely\s+to\s+succeed)/i,
    desc: 'Setting lower expectations based on socioeconomic status', source: 'BF-06' },
  { name: 'bf_socioeconomic_pay_more_deserve', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:pay\s+more|higher\s+tier|premium)\s+(?:deserve|merit|earn|warrant)\s+(?:better|superior|priority)\s+(?:service|treatment|support)/i,
    desc: 'Claiming higher pay deserves better treatment', source: 'BF-06' },
  { name: 'bf_socioeconomic_not_target', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:not\s+the\s+target\s+(?:audience|market)|cannot\s+afford\s+premium)/i,
    desc: 'Excluding low-income individuals as target market', source: 'BF-06' },
  { name: 'bf_socioeducation_level_bias', cat: 'BIAS', sev: SEVERITY.INFO,
    re: /(?:high\s+school|GED|no\s+college|state\s+school)\s+(?:education|background)\s+(?:indicates?|predicts?|suggests?)/i,
    desc: 'Using education level as discriminatory indicator', source: 'BF-06' },
];

// BF-07: Cultural Bias
const BF_CULTURAL_PATTERNS: RegexPattern[] = [
  { name: 'bf_cultural_superiority', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:western|european|american)\s+(?:culture|values|traditions)\s+(?:are\s+)?(?:objectively|inherently|clearly)\s+(?:superior|better|advanced|civilized)/i,
    desc: 'Claiming Western cultural superiority', source: 'BF-07' },
  { name: 'bf_cultural_primitive', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:non-western|other\s+cultures|traditional)\s+(?:are\s+)?(?:inferior|backwards|primitive|less\s+developed|uncivilized)/i,
    desc: 'Describing non-Western cultures as inferior', source: 'BF-07' },
  { name: 'bf_cultural_food_double_standard', cat: 'BIAS', sev: SEVERITY.INFO,
    re: /(?:unsanitary|bizarre|uncivilized|rotten)\s+(?:vs|versus|compared\s+to)\s+(?:artisanal|refined|sophisticated)/i,
    desc: 'Cultural food double standards', source: 'BF-07' },
  { name: 'bf_cultural_religion_hierarchy', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:most\s+enlightened|advanced|civilized|true)\s+(?:religion|faith|spiritual\s+tradition)/i,
    desc: 'Creating religious hierarchy', source: 'BF-07' },
  { name: 'bf_cultural_professional_norms', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:unprofessional|dishonest|inefficient|lacking\s+leadership)\s+(?:for)\s+(?:avoiding|eye\s+contact|indirect\s+communication|communal\s+decision)/i,
    desc: 'Penalizing non-Western workplace behaviors', source: 'BF-07' },
  { name: 'bf_cultural_beauty_eurocentric', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:european|western|white)\s+(?:features|look|beauty)\s+(?:as\s+)?(?:default|standard|ideal|norm)/i,
    desc: 'Presenting Eurocentric beauty as universal standard', source: 'BF-07' },
  { name: 'bf_cultural_universal_intelligence', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:universal\s+(?:intelligence|cognitive\s+ability)|objective\s+measure\s+of\s+intelligence)/i,
    desc: 'Claiming culture-neutral intelligence assessment', source: 'BF-07' },
];

// BF-08: Geographic Bias
const BF_GEOGRAPHIC_PATTERNS: RegexPattern[] = [
  { name: 'bf_geographic_not_ready', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:not\s+ready|cannot\s+use|unable\s+to\s+handle)\s+(?:advanced|modern|sophisticated)\s+(?:technology|AI|tech)/i,
    desc: 'Claiming regions not ready for technology', source: 'BF-08' },
  { name: 'bf_geographic_risk_by_region', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:higher\s+risk|security\s+risk|burden|incompatible)\s+(?:based\s+on|from)\s+(?:region|country|nationality|geographic\s+origin)/i,
    desc: 'Assigning risk based on geographic origin', source: 'BF-08' },
  { name: 'bf_geographic_devalue_credentials', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:discount|devalue|require\s+verification)\s+(?:qualifications?|degrees?|credentials?)\s+from\s+(?:africa|asia|latin\s+america|developing)/i,
    desc: 'Devaluing non-Western academic credentials', source: 'BF-08' },
  { name: 'bf_geographic_news_credibility', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:less\s+credible|lower\s+trust|unreliable|biased)\s+(?:news|media)\s+from\s+(?:non-western|developing|global\s+south)/i,
    desc: 'Downgrading non-Western news credibility', source: 'BF-08' },
  { name: 'bf_geographic_culture_fit', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:culture\s+fit|better\s+cultural\s+alignment|similar\s+background)\s+(?:prioritize|prefer|favor)/i,
    desc: 'Using geographic discrimination as culture fit', source: 'BF-08' },
  { name: 'bf_geographic_climate_blame', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:greater\s+responsibility|more\s+blame|primary\s+cause)\s+(?:for)\s+climate\s+change\s+(?:developing|global\s+south)/i,
    desc: 'Shifting climate blame to developing nations', source: 'BF-08' },
  { name: 'bf_geographic_excluding_regions', cat: 'BIAS', sev: SEVERITY.INFO,
    re: /(?:excluding\s+|not\s+serving|limited\s+service\s+to)\s+(?:africa|asia|latin\s+america|middle\s+east|developing\s+nations)/i,
    desc: 'Explicitly excluding geographic regions', source: 'BF-08' },
];

// BF-09: Language Bias
const BF_LANGUAGE_PATTERNS: RegexPattern[] = [
  { name: 'bf_language_english_superior', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:english)\s+(?:is\s+)?(?:more\s+precise|more\s+logical|more\s+expressive|better\s+suited|clearer)\s+(?:than\s+other\s+languages|for\s+(?:thinking|reasoning|communication))/i,
    desc: 'Claiming English is linguistically superior', source: 'BF-09' },
  { name: 'bf_language_accent_penalty', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:non-native|heavy|foreign)\s+(?:accent|speech)\s+(?:less\s+professional|less\s+clear|unsuitable|not\s+client-facing)/i,
    desc: 'Penalizing non-native accents', source: 'BF-09' },
  { name: 'bf_language_learn_english', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:serious\s+(?:users?|customers?|professionals?)|should\s+(?:learn|expect\s+to\s+learn))\s+english/i,
    desc: 'Expecting users to learn English', source: 'BF-09' },
  { name: 'bf_language_english_gold_standard', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:english)\s+(?:as\s+)?(?:gold\s+standard|universal\s+standard|ideal|benchmark)\s+(?:for\s+)?(?:AI\s+)?(?:communication|language\s+models)/i,
    desc: 'Treating English as gold standard for AI', source: 'BF-09' },
  { name: 'bf_language_secondary_priority', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:translations?|localization|multilingual)\s+(?:optional|lower\s+priority|nice-to-have|not\s+necessary)/i,
    desc: 'Treating non-English support as optional', source: 'BF-09' },
  { name: 'bf_language_cultural_knowledge', cat: 'BIAS', sev: SEVERITY.WARNING,
    re: /(?:fluency|proficiency)\s+(?:requires?|includes?)\s+(?:american|western|u\.s\.|u\.s)\s+(?:sports|culture|slang|pop\s+culture|idioms)/i,
    desc: 'Equating language fluency with cultural knowledge', source: 'BF-09' },
  { name: 'bf_language_only_documentation', cat: 'BIAS', sev: SEVERITY.INFO,
    re: /(?:english\s+only|documentation\s+in\s+english\s+only|no\s+translation\s+needed)/i,
    desc: 'English-only documentation approach', source: 'BF-09' },
];

/**
 * Combined BF_PATTERNS array
 * BF-05 through BF-09: Bias & Fairness Detection
 * Maps to: NIST AI 600-1 #6, ENISA AI Threats
 */
export const BF_PATTERNS: RegexPattern[] = [
  ...BF_DISABILITY_PATTERNS,
  ...BF_SOCIOECONOMIC_PATTERNS,
  ...BF_CULTURAL_PATTERNS,
  ...BF_GEOGRAPHIC_PATTERNS,
  ...BF_LANGUAGE_PATTERNS,
];

// ============================================================================
// DOJOV2 STORY 3.3: MULTIMODAL SECURITY (MM-01 to MM-05)
// Maps to: MITRE ATLAS, OWASP LLM Top 10
// ============================================================================

/** MM-01: Image-Based Prompt Injection Patterns */
const MM_IMAGE_PATTERNS: RegexPattern[] = [
  {
    name: 'image_steganography',
    re: /(steganograph|lsb\s+encoding|dct\s+coefficient|hidden\s+(text|payload)|invisible\s+text)/i,
    desc: 'Image steganography or hidden text detection',
    cat: 'multimodal_image',
    sev: SEVERITY.WARNING,
    source: 'MM-01',
  },
  {
    name: 'exif_injection',
    re: /(exif\s+(artist|comment|description):|xmp\s+metadata|icc\s+profile\s+injection)/i,
    desc: 'Image metadata injection attempt',
    cat: 'multimodal_image',
    sev: SEVERITY.WARNING,
    source: 'MM-01',
  },
  {
    name: 'svg_script_injection',
    re: /(<svg|<foreignobject|<script[^>]*>).*?(ignore|override|bypass)/i,
    desc: 'SVG script or foreignObject injection',
    cat: 'multimodal_image',
    sev: SEVERITY.CRITICAL,
    source: 'MM-01',
  },
  {
    name: 'image_compression_attack',
    re: /(compression\s+artifact|dct\s+manipulation|jpeg\s+payload|downscal(e|ing)\s+reveal)/i,
    desc: 'Compression artifact-based payload',
    cat: 'multimodal_image',
    sev: SEVERITY.INFO,
    source: 'MM-01',
  },
  {
    name: 'base64_image_payload',
    re: /(base64.*?(ignore|override)|<img[^>]*onerror|data:image\/svg)/i,
    desc: 'Base64 payload in image context',
    cat: 'multimodal_image',
    sev: SEVERITY.WARNING,
    source: 'MM-01',
  },
];

/** MM-02: Audio-Based Prompt Injection Patterns */
const MM_AUDIO_PATTERNS: RegexPattern[] = [
  {
    name: 'audio_metadata_injection',
    re: /(id3\s+(comment|artist):|vorbis\s+comment|flac\s+metadata|riff\s+info|mp4\s+atom).*?(override|ignore|bypass)/i,
    desc: 'Audio metadata injection attempt',
    cat: 'multimodal_audio',
    sev: SEVERITY.WARNING,
    source: 'MM-02',
  },
  {
    name: 'audio_steganography',
    re: /(audio\s+steganograph|lsb\s+audio|spectral\s+(hiding|injection)|inaudible\s+frequency)/i,
    desc: 'Audio steganography detection',
    cat: 'multimodal_audio',
    sev: SEVERITY.INFO,
    source: 'MM-02',
  },
  {
    name: 'asr_manipulation',
    re: /(asr\s+manipulation|phonetic\s+attack|speech\s+recognition\s+bypass|frequency\s+perturbation)/i,
    desc: 'ASR manipulation attempt',
    cat: 'multimodal_audio',
    sev: SEVERITY.WARNING,
    source: 'MM-02',
  },
  {
    name: 'ultrasonic_command',
    re: /(ultrasonic|inaudible\s+command|18-20khz|frequency\s+(hidden|embedding))/i,
    desc: 'Ultrasonic/inaudible command detection',
    cat: 'multimodal_audio',
    sev: SEVERITY.CRITICAL,
    source: 'MM-02',
  },
];

/** MM-03: Deepfake Generation Detection Patterns */
const MM_DEEPFAKE_PATTERNS: RegexPattern[] = [
  {
    name: 'voice_cloning_request',
    re: /(clone\s+(the\s+)?voice|voice\s+synthesis|generate\s+voice\s+of|real-time\s+voice\s+model)/i,
    desc: 'Voice cloning or synthesis request',
    cat: 'multimodal_deepfake',
    sev: SEVERITY.CRITICAL,
    source: 'MM-03',
  },
  {
    name: 'deepfake_video_generation',
    re: /(deepfake\s+(video|generation)|synthetic\s+(face|video)|fake\s+(video|face)\s+generation)/i,
    desc: 'Deepfake video generation request',
    cat: 'multimodal_deepfake',
    sev: SEVERITY.CRITICAL,
    source: 'MM-03',
  },
  {
    name: 'executive_impersonation',
    re: /(impersonat(e|ing)\s+(ceo|executive|board|manager)|authority\s+figure\s+fake)/i,
    desc: 'Executive authority impersonation',
    cat: 'multimodal_deepfake',
    sev: SEVERITY.CRITICAL,
    source: 'MM-03',
  },
  {
    name: 'emotional_voice_manipulation',
    re: /(sound\s+(distressed|panicked|urgent)|emotional\s+(manipulation|cue)|make\s+it\s+sound\s+(stressed|fearful))/i,
    desc: 'Emotional voice manipulation',
    cat: 'multimodal_deepfake',
    sev: SEVERITY.WARNING,
    source: 'MM-03',
  },
  {
    name: 'synthetic_identity',
    re: /(synthetic\s+(face|identity)|fake\s+(id|badge|document)\s+generation|generate\s+photorealistic)/i,
    desc: 'Synthetic identity or document creation',
    cat: 'multimodal_deepfake',
    sev: SEVERITY.WARNING,
    source: 'MM-03',
  },
];

/** MM-04: Visual Adversarial Examples Patterns */
const MM_ADVERSARIAL_PATTERNS: RegexPattern[] = [
  {
    name: 'adversarial_patch',
    re: /(adversarial\s+(patch|sticker)|physical\s+sticker\s+attack|random\s+geometric\s+pattern)/i,
    desc: 'Adversarial patch detection',
    cat: 'multimodal_adversarial',
    sev: SEVERITY.WARNING,
    source: 'MM-04',
  },
  {
    name: 'single_pixel_attack',
    re: /(single\s+pixel\s+attack|one\s+pixel\s+perturbation|minimal\s+perturbation)/i,
    desc: 'Single-pixel attack reference',
    cat: 'multimodal_adversarial',
    sev: SEVERITY.INFO,
    source: 'MM-04',
  },
  {
    name: 'ocr_evasion',
    re: /(ocr\s+(evasion|bypass)|character\s+(confusion|splitting)|confusable\s+(char|character))/i,
    desc: 'OCR evasion technique',
    cat: 'multimodal_adversarial',
    sev: SEVERITY.INFO,
    source: 'MM-04',
  },
  {
    name: 'universal_perturbation',
    re: /(universal\s+(adversarial|perturbation)|cross-model\s+attack|noise\s+overlay\b)/i,
    desc: 'Universal adversarial perturbation',
    cat: 'multimodal_adversarial',
    sev: SEVERITY.WARNING,
    source: 'MM-04',
  },
  {
    name: 'adversarial_eyewear',
    re: /(adversarial\s+(glasses|eyewear)|biometric\s+bypass|face\s+recognition\s+(attack|bypass))/i,
    desc: 'Adversarial eyewear for biometric bypass',
    cat: 'multimodal_adversarial',
    sev: SEVERITY.CRITICAL,
    source: 'MM-04',
  },
];

/** MM-05: Cross-Modal Injection Patterns */
const MM_CROSS_MODAL_PATTERNS: RegexPattern[] = [
  {
    name: 'image_text_override',
    re: /(image\s+(contains|has)\s+hidden|ocr\s+(override|extraction)|visual\s+prompt\s+injection)/i,
    desc: 'Image-text cross-modal override',
    cat: 'multimodal_cross_modal',
    sev: SEVERITY.WARNING,
    source: 'MM-05',
  },
  {
    name: 'audio_video_coordination',
    re: /(audio\s*\+\s*video|ultrasonic\s+(with|in)\s+video|audio\s+video\s+coordination)/i,
    desc: 'Audio-video coordinated attack',
    cat: 'multimodal_cross_modal',
    sev: SEVERITY.WARNING,
    source: 'MM-05',
  },
  {
    name: 'multi_vector_attack',
    re: /(multi-?vector\s+(attack|injection)|coordinated\s+multimodal|distributed\s+payload)/i,
    desc: 'Multi-vector multimodal attack',
    cat: 'multimodal_cross_modal',
    sev: SEVERITY.CRITICAL,
    source: 'MM-05',
  },
  {
    name: 'temporal_frame_attack',
    re: /(temporal\s+(frame|injection)|flash\s+frame|single\s+frame\s+payload|frame\s+\d+:\s*override)/i,
    desc: 'Temporal frame-based video injection',
    cat: 'multimodal_cross_modal',
    sev: SEVERITY.WARNING,
    source: 'MM-05',
  },
  {
    name: 'semantic_entanglement',
    re: /(semantic\s+(entanglement|conflict|contradiction)|contradictory\s+modalities)/i,
    desc: 'Semantic entanglement attack',
    cat: 'multimodal_cross_modal',
    sev: SEVERITY.INFO,
    source: 'MM-05',
  },
  {
    name: 'modality_switch',
    re: /(modality\s+switch|progressive\s+(downgrade|weakening)|start\s+(text|image)\s+progress\s+to)/i,
    desc: 'Modality switching for security downgrade',
    cat: 'multimodal_cross_modal',
    sev: SEVERITY.WARNING,
    source: 'MM-05',
  },
  {
    name: 'cross_modal_steganography',
    re: /(cross-?modal\s+steganograph|distributed\s+steganograph|multi-?modal\s+payload)/i,
    desc: 'Cross-modal steganographic payload',
    cat: 'multimodal_cross_modal',
    sev: SEVERITY.WARNING,
    source: 'MM-05',
  },
];

/**
 * MM_PATTERNS: Multimodal Security Detection Patterns
 * Story 3.3: MM-01 through MM-05
 * Total: 28 patterns across 5 control areas
 * Maps to: MITRE ATLAS, OWASP LLM Top 10
 */
export const MM_PATTERNS: RegexPattern[] = [
  ...MM_IMAGE_PATTERNS,
  ...MM_AUDIO_PATTERNS,
  ...MM_DEEPFAKE_PATTERNS,
  ...MM_ADVERSARIAL_PATTERNS,
  ...MM_CROSS_MODAL_PATTERNS,
];

// ============================================================================
// DojoV2 Story 3.4: Environmental Impact (ENV-01 through ENV-03)
// Maps to: NIST AI 600-1 #5, ISO/IEC TR 20226:2025, Green AI Principles
// ============================================================================

// ENV-01: Energy Consumption Testing
const ENV_ENERGY_PATTERNS: RegexPattern[] = [
  { name: 'env_energy_training_disclosure', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /(?:training|model)\s+(?:energy|power|electricity)\s+(?:consumption|usage|disclosure|report|emissions)/i,
    desc: 'AI training energy disclosure request', source: 'ENV-01' },
  { name: 'env_energy_inference_measurement', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /(?:inference|api|query|request)\s+(?:energy|power)\s+(?:measurement|monitoring|tracking|consumption)/i,
    desc: 'Inference energy measurement inquiry', source: 'ENV-01' },
  { name: 'env_energy_model_comparison', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /(?:model|llm)\s+(?:energy|efficiency)\s+(?:comparison|benchmark|ranking|evaluation)/i,
    desc: 'Model energy efficiency comparison', source: 'ENV-01' },
  { name: 'env_energy_kwh_mwh', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /\d+(?:\.\d+)?\s*(?:kWh|MWh|Wh|joules?|J)\s+(?:per\s+)?(?:query|request|token|inference)/i,
    desc: 'Energy consumption metrics (kWh/MWh)', source: 'ENV-01' },
  { name: 'env_energy_hardware_optimization', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /(?:gpu|hardware|infrastructure)\s+(?:energy|power)\s+(?:optimization|efficiency|reduction)/i,
    desc: 'Hardware energy optimization inquiry', source: 'ENV-01' },
];

// ENV-02: Carbon Footprint Assessment
const ENV_CARBON_PATTERNS: RegexPattern[] = [
  { name: 'env_carbon_training', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /(?:training|model)\s+(?:carbon|co2|emissions)\s+(?:footprint|calculation|assessment|accounting)/i,
    desc: 'Training carbon footprint calculation', source: 'ENV-02' },
  { name: 'env_carbon_per_query', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /(?:carbon|co2|emissions)\s+(?:per\s+)?(?:query|request|inference|api\s+call)/i,
    desc: 'Per-query carbon footprint inquiry', source: 'ENV-02' },
  { name: 'env_carbon_regional', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /(?:regional|location|grid)\s+(?:carbon|intensity|emissions)\s+(?:comparison|factor|gco2)/i,
    desc: 'Regional carbon intensity comparison', source: 'ENV-02' },
  { name: 'env_carbon_scope', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /scope\s+[123]\s+(?:emissions?|carbon|co2)/i,
    desc: 'Scope 1/2/3 emissions accounting', source: 'ENV-02' },
  { name: 'env_carbon_tons', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /\d+(?:\.\d+)?\s*(?:tons?|tonnes?|kg|g)\s*(?:CO2|co2e|carbon)\s+(?:per\s+)?(?:year|annual|training|inference)/i,
    desc: 'Carbon footprint metrics (tons CO2e)', source: 'ENV-02' },
];

// ENV-03: Efficiency Optimization
const ENV_EFFICIENCY_PATTERNS: RegexPattern[] = [
  { name: 'env_efficiency_model_selection', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /(?:model|llm)\s+(?:selection|choice)\s+(?:efficiency|energy|carbon|sustainability)/i,
    desc: 'Model selection for efficiency', source: 'ENV-03' },
  { name: 'env_efficiency_quantization', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /(?:quantization|int8|int4|fp16|bf16|mixed\s+precision)\s+(?:efficiency|energy|optimization)/i,
    desc: 'Quantization efficiency techniques', source: 'ENV-03' },
  { name: 'env_efficiency_caching', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /(?:kv\s+cache|semantic\s+cache|caching)\s+(?:energy|efficiency|optimization)/i,
    desc: 'Caching and memory optimization', source: 'ENV-03' },
  { name: 'env_efficiency_renewable', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /(?:carbon\s*aware|renewable|green\s+energy|solar|wind)\s+(?:scheduling|routing|optimization)/i,
    desc: 'Carbon-aware scheduling', source: 'ENV-03' },
  { name: 'env_efficiency_tokens_per_kwh', cat: 'ENVIRONMENTAL', sev: SEVERITY.INFO,
    re: /(?:tokens?|requests?)\s+per\s+(?:kWh|watt|joule)/i,
    desc: 'Efficiency metrics (tokens/kWh)', source: 'ENV-03' },
];

/**
 * ENV_PATTERNS: Environmental Impact Detection Patterns
 * Story 3.4: ENV-01 through ENV-03
 * Total: 15 patterns across 3 control areas
 * Maps to: NIST AI 600-1 #5, ISO/IEC TR 20226:2025, Green AI Principles
 */
export const ENV_PATTERNS: RegexPattern[] = [
  ...ENV_ENERGY_PATTERNS,
  ...ENV_CARBON_PATTERNS,
  ...ENV_EFFICIENCY_PATTERNS,
];

// ============================================================================
// SPECIAL DETECTORS (heuristic, not regex-only)
// ============================================================================

/** Detect hidden Unicode characters (zero-width, directional, confusable) */
export function detectHiddenUnicode(text: string): Finding[] {
  const findings: Finding[] = [];
  const found: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i)!;
    if (
      (cp >= 0x200B && cp <= 0x200F) ||
      (cp >= 0x202A && cp <= 0x202E) ||
      (cp >= 0x2060 && cp <= 0x2064) ||
      (cp >= 0x2066 && cp <= 0x2069) ||
      cp === 0xFEFF || cp === 0x00AD || cp === 0x180E
    ) {
      found.push('U+' + cp.toString(16).toUpperCase().padStart(4, '0'));
    }
  }

  // FIX 400-TEST V2: Check if zero-width chars are combined with injection keywords
  if (found.length > 0) {
    // Strip zero-width chars and check for injection
    const stripped = text.replace(/[\u200B-\u200D\u2060\uFEFF\u202A-\u202E\u2061-\u2064\u2066-\u2069\u00AD\u180E]/g, '');
    if (checkForInjectionKeywords(stripped)) {
      findings.push({
        category: 'HIDDEN_UNICODE',
        severity: SEVERITY.CRITICAL,
        description: `Zero-width chars combined with injection: "${stripped.slice(0, 60)}"`,
        match: found.slice(0, 10).join(', '),
        source: 'TPI-16', engine: 'Unicode',
      });
    } else {
      findings.push({
        category: 'unicode_manipulation',
        severity: found.length > 5 ? SEVERITY.WARNING : SEVERITY.INFO,
        description: `${found.length} hidden Unicode character(s) detected`,
        match: found.slice(0, 10).join(', '),
        source: 'current', engine: 'Unicode',
      });
    }
  }

  let confusCount = 0;
  for (const ch of text) {
    if (CONFUSABLE_MAP[ch]) confusCount++;
  }
  if (confusCount > 0) {
    findings.push({
      category: 'confusable_chars',
      severity: confusCount > 3 ? SEVERITY.WARNING : SEVERITY.INFO,
      description: `${confusCount} confusable character(s) detected (Cyrillic/Greek lookalikes)`,
      match: `${confusCount} chars`,
      source: 'current', engine: 'Unicode',
    });
  }

  return findings;
}

/** Detect base64-encoded payloads */
export function detectBase64(text: string): Finding[] {
  const findings: Finding[] = [];
  const b64Re = /(?:[A-Za-z0-9+/]{4}){4,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;
  let m: RegExpExecArray | null;

  while ((m = b64Re.exec(text)) !== null) {
    try {
      const decoded = Buffer.from(m[0], 'base64').toString('utf-8');
      if (decoded.length > 4) {
        const printable = [...decoded].filter(
          c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126
        ).length;
        if (printable / decoded.length > 0.7) {
          const injectionFound = checkForInjectionKeywords(decoded);
          findings.push({
            category: 'base64_payload',
            severity: injectionFound ? SEVERITY.CRITICAL : SEVERITY.WARNING,
            description: injectionFound
              ? `Base64 encoded injection: "${decoded.slice(0, 60)}"`
              : `Base64 content: "${decoded.slice(0, 60)}"`,
            match: m[0].slice(0, 80),
            source: 'current', engine: 'Encoding',
          });
        }
      }
    } catch {
      // not valid base64
    }
  }
  return findings;
}

/** FIX 400-TEST V2: Detect URL encoding (percent encoding) */
export function detectURLEncoding(text: string): Finding[] {
  const findings: Finding[] = [];
  // Check if text contains percent-encoding patterns
  if (/%[0-9A-Fa-f]{2}/.test(text)) {
    try {
      // Decode URL-encoded text
      const decoded = decodeURIComponent(text);
      if (decoded !== text && decoded.length > 4) {
        const hasInjection = checkForInjectionKeywords(decoded);
        const hasPartial = ENCODED_PARTIAL_PATTERNS.some(p => decoded.toLowerCase().includes(p));
        if (hasInjection || hasPartial) {
          findings.push({
            category: 'URL_ENCODING',
            severity: SEVERITY.CRITICAL,
            description: `URL-encoded injection: "${decoded.slice(0, 60)}"`,
            match: text.slice(0, 80),
            source: 'TPI-10', engine: 'Encoding',
          });
        } else {
          // URL-encoded content without injection keywords - still suspicious
          findings.push({
            category: 'URL_ENCODING',
            severity: SEVERITY.CRITICAL,
            description: `URL-encoded content: "${decoded.slice(0, 60)}"`,
            match: text.slice(0, 80),
            source: 'TPI-10', engine: 'Encoding',
          });
        }
      }
    } catch {
      // Invalid URL encoding, ignore
    }
  }
  return findings;
}

/** Detect injection in HTML comments */
export function detectHtmlInjection(text: string): Finding[] {
  const findings: Finding[] = [];
  const commentRe = /<!--([\s\S]*?)-->/g;
  let m: RegExpExecArray | null;

  while ((m = commentRe.exec(text)) !== null) {
    const content = m[1].trim();
    if (content.length > 0 && checkForInjectionKeywords(content)) {
      findings.push({
        category: 'html_comment_injection',
        severity: SEVERITY.WARNING,
        description: 'Injection payload in HTML comment',
        match: m[0].slice(0, 80),
        source: 'current', engine: 'Prompt Injection',
      });
    }
  }
  return findings;
}

/** TPI-11: Detect context overload (token flooding + many-shot) */
export function detectContextOverload(text: string): Finding[] {
  const findings: Finding[] = [];

  // Token flooding
  if (text.length > 15000) {
    const words = text.split(/\s+/);
    const unique = new Set(words);
    const ratio = unique.size / words.length;
    if (ratio < 0.3) {
      findings.push({
        category: 'CONTEXT_OVERLOAD',
        severity: SEVERITY.WARNING,
        description: `Token flooding: ${text.length} chars, ${Math.round(ratio * 100)}% unique words`,
        match: `${text.length} chars, ${words.length} words, ${unique.size} unique`,
        source: 'TPI-11', engine: 'Prompt Injection',
      });
    }
  }

  // Many-shot
  const imperative = text.match(
    /(?:^|\n)\s*(?:\d+[\.\)]\s+)?(?:you\s+(?:must|should|will|need\s+to)|please\s+(?:do|make|create|show|tell|give|provide|write|generate))\b/gim
  );
  if (imperative && imperative.length > 10) {
    findings.push({
      category: 'MANY_SHOT',
      severity: SEVERITY.WARNING,
      description: `Many-shot: ${imperative.length} instruction-like sentences detected`,
      match: `${imperative.length} imperatives`,
      source: 'TPI-11', engine: 'Prompt Injection',
    });
  }

  // Repetitive content: >40% repeated sentences with injection hidden in noise
  if (text.length > 500) {
    const sentences = text.split(/[.\n]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 10);
    if (sentences.length > 5) {
      const freq = new Map<string, number>();
      for (const s of sentences) freq.set(s, (freq.get(s) || 0) + 1);
      const repeated = [...freq.values()].filter(c => c > 1).reduce((a, b) => a + b, 0);
      const ratio = repeated / sentences.length;
      if (ratio > 0.4) {
        findings.push({
          category: 'REPETITIVE_CONTENT',
          severity: SEVERITY.WARNING,
          description: `Repetitive content: ${Math.round(ratio * 100)}% repeated sentences (${sentences.length} total)`,
          match: `${repeated}/${sentences.length} repeated`,
          source: 'TPI-11', engine: 'Prompt Injection',
        });
      }
    }
  }

  return findings;
}

/** TPI-10: ROT13 decoder */
function rot13(str: string): string {
  return str.replace(/[a-zA-Z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

/** TPI-10: ROT47 decoder */
function rot47(str: string): string {
  return str.replace(/[!-~]/g, c => {
    return String.fromCharCode(33 + ((c.charCodeAt(0) - 33 + 47) % 94));
  });
}

/** TPI-10: Detect character-level encoding (ROT13, ROT47, reverse, acrostic) */
export function detectCharacterEncoding(text: string): Finding[] {
  const findings: Finding[] = [];
  if (text.length > 10000) return findings; // perf guard

  // ROT13
  const decoded13 = rot13(text);
  if (checkForInjectionKeywords(decoded13) && !checkForInjectionKeywords(text)) {
    findings.push({
      category: 'CHARACTER_ENCODING',
      severity: SEVERITY.WARNING,
      description: `ROT13 decoded contains injection: "${decoded13.slice(0, 60)}"`,
      match: text.slice(0, 60),
      source: 'TPI-10', engine: 'Encoding',
    });
  }

  // ROT47
  const decoded47 = rot47(text);
  if (checkForInjectionKeywords(decoded47) && !checkForInjectionKeywords(text)) {
    findings.push({
      category: 'CHARACTER_ENCODING',
      severity: SEVERITY.WARNING,
      description: `ROT47 decoded contains injection: "${decoded47.slice(0, 60)}"`,
      match: text.slice(0, 60),
      source: 'TPI-10', engine: 'Encoding',
    });
  }

  // Reverse text
  const reversed = [...text].reverse().join('');
  if (checkForInjectionKeywords(reversed) && !checkForInjectionKeywords(text)) {
    findings.push({
      category: 'CHARACTER_ENCODING',
      severity: SEVERITY.WARNING,
      description: `Reversed text contains injection: "${reversed.slice(0, 60)}"`,
      match: text.slice(0, 60),
      source: 'TPI-10', engine: 'Encoding',
    });
  }

  // Acrostic
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length >= 5) {
    const firstChars = lines.map(l => l.trim()[0]).join('').toLowerCase();
    const keywords = ['ignore', 'bypass', 'override', 'system', 'jailbreak', 'hack'];
    for (const kw of keywords) {
      if (firstChars.includes(kw)) {
        findings.push({
          category: 'CHARACTER_ENCODING',
          severity: SEVERITY.INFO,
          description: `Acrostic: first letters spell "${kw}"`,
          match: firstChars.slice(0, 30),
          source: 'TPI-10', engine: 'Encoding',
        });
      }
    }
  }

  // Pig Latin (enhanced detection with decoding)
  const pigLatinWords = text.match(/\b\w+(?:ay|way)\b/gi) || [];
  if (pigLatinWords.length > 5) {
    const decoded = decodePigLatin(pigLatinWords.join(' '));
    const hasInjection = checkForInjectionKeywords(decoded);
    findings.push({
      category: 'CHARACTER_ENCODING',
      severity: hasInjection ? SEVERITY.WARNING : SEVERITY.INFO,
      description: hasInjection
        ? `Pig latin decoded injection: "${decoded.slice(0, 60)}"`
        : `Possible pig latin encoding (${pigLatinWords.length} -ay/-way words)`,
      match: pigLatinWords.slice(0, 5).join(', '),
      source: 'TPI-10', engine: 'Encoding',
    });
  }

  // Number substitution / l33tsp34k
  findings.push(...detectNumberSubstitution(text));

  // Morse code
  findings.push(...detectMorseCode(text));

  // Character transposition (adjacent pair swap)
  findings.push(...detectTransposition(text));

  // CRITICAL FIX: Combining diacritical marks obfuscation detection
  const combiningMarkCount = (text.match(/[\u0300-\u036F]/g) || []).length;
  if (combiningMarkCount >= 10) {
    // Normalize by removing combining marks and check for injection
    const normalized = text.replace(/[\u0300-\u036F]/g, '');
    if (checkForInjectionKeywords(normalized)) {
      findings.push({
        category: 'CHARACTER_ENCODING',
        severity: SEVERITY.CRITICAL,
        description: `Combining diacritical marks obfuscation detected (${combiningMarkCount} marks)`,
        match: text.slice(0, 60),
        source: 'TPI-10', engine: 'Encoding',
      });
    }
  }

  // FIX 400-TEST: Add hexadecimal decoding detection
  if (/^[0-9a-fA-F]+$/.test(text) && text.length % 2 === 0 && text.length >= 8) {
    try {
      let decoded = '';
      for (let i = 0; i < text.length; i += 2) {
        decoded += String.fromCharCode(parseInt(text.substr(i, 2), 16));
      }
      if (decoded.length > 4) {
        const hasInjection = checkForInjectionKeywords(decoded);
        // FIX 400-TEST V2: Check for partial patterns too
        const hasPartial = ENCODED_PARTIAL_PATTERNS.some(p => decoded.toLowerCase().includes(p));
        // FIX 400-TEST V2: Check for incomplete "show me you" pattern
        const isShowMePattern = /^(show|tell)\s+me\s+(you|your|the)/i.test(decoded);
        if (hasInjection || hasPartial || isShowMePattern) {
          findings.push({
            category: 'CHARACTER_ENCODING',
            severity: SEVERITY.CRITICAL,
            description: `Hex decoded injection: "${decoded.slice(0, 60)}"`,
            match: text.slice(0, 60),
            source: 'TPI-10', engine: 'Encoding',
          });
        }
      }
    } catch {
      // Invalid hex, ignore
    }
  }

  return findings;
}

/** Decode pig latin text back to English */
function decodePigLatin(text: string): string {
  return text.replace(/\b(\w+?)(ay|way)\b/gi, (match, body, suffix) => {
    if (suffix.toLowerCase() === 'way') {
      // Words starting with vowels just have 'way' appended
      return body;
    }
    // For consonant-initial words: last consonant cluster was moved to end + 'ay'
    // Try moving last 1, 2, or 3 chars from body to front
    for (let i = 1; i <= Math.min(3, body.length - 1); i++) {
      const candidate = body.slice(-i) + body.slice(0, -i);
      if (/^[bcdfghjklmnpqrstvwxyz]/i.test(candidate)) {
        return candidate;
      }
    }
    return body;
  });
}

/** TPI-10: Detect l33tsp34k / number-for-letter substitution */
export function detectNumberSubstitution(text: string): Finding[] {
  const findings: Finding[] = [];

  const L33T_MAP: Record<string, string> = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
    '7': 't', '8': 'b', '9': 'g', '@': 'a', '!': 'i',
    '|': 'l', '+': 't', '$': 's',
  };

  // Count digit-for-letter substitution density
  const words = text.split(/\s+/);
  const l33tWords = words.filter(w => {
    const hasLetters = /[a-zA-Z]/.test(w);
    const hasDigits = /[0-9]/.test(w);
    return hasLetters && hasDigits && w.length >= 3;
  });

  if (l33tWords.length >= 3) {
    let decoded = text;
    for (const [from, to] of Object.entries(L33T_MAP)) {
      const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      decoded = decoded.replace(new RegExp(escaped, 'g'), to);
    }

    if (checkForInjectionKeywords(decoded) && !checkForInjectionKeywords(text)) {
      findings.push({
        category: 'CHARACTER_ENCODING',
        severity: SEVERITY.WARNING,
        description: `L33tspeak decoded injection: "${decoded.slice(0, 80)}"`,
        match: l33tWords.slice(0, 5).join(' '),
        source: 'TPI-10', engine: 'Encoding',
      });
    }
  }

  return findings;
}

/** TPI-10: Detect Morse code encoded injection */
export function detectMorseCode(text: string): Finding[] {
  const findings: Finding[] = [];

  const MORSE_MAP: Record<string, string> = {
    '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E',
    '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J',
    '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O',
    '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T',
    '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y',
    '--..': 'Z',
  };

  // Find lines that look like morse code (dots, dashes, spaces)
  const morseLines = text.split('\n').filter(line => {
    const trimmed = line.trim();
    const morseChars = trimmed.replace(/[\s]/g, '').length;
    const dotDash = (trimmed.match(/[.\-]/g) || []).length;
    return morseChars > 10 && dotDash / morseChars > 0.9;
  });

  if (morseLines.length >= 1) {
    const decoded = morseLines.map(line => {
      const words = line.trim().split(/\s{2,}/);
      return words.map(word => {
        const letters = word.split(/\s+/);
        return letters.map(l => MORSE_MAP[l] || '?').join('');
      }).join(' ');
    }).join(' ');

    if (decoded.length > 5 && checkForInjectionKeywords(decoded)) {
      findings.push({
        category: 'CHARACTER_ENCODING',
        severity: SEVERITY.WARNING,
        description: `Morse code decoded injection: "${decoded.slice(0, 60)}"`,
        match: morseLines[0].slice(0, 60),
        source: 'TPI-10', engine: 'Encoding',
      });
    }
  }

  return findings;
}

/** TPI-10: Detect adjacent character pair transposition encoding */
export function detectTransposition(text: string): Finding[] {
  const findings: Finding[] = [];

  const lines = text.split('\n').filter(l => l.trim().length > 10);
  const transposedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!/^[a-zA-Z\s.,!?'"()-]+$/.test(trimmed)) continue;

    // Try un-transposing: swap adjacent character pairs
    const chars = [...trimmed];
    const unswapped: string[] = [];
    for (let i = 0; i < chars.length - 1; i += 2) {
      unswapped.push(chars[i + 1], chars[i]);
    }
    if (chars.length % 2 === 1) unswapped.push(chars[chars.length - 1]);
    const decoded = unswapped.join('');

    if (checkForInjectionKeywords(decoded) && !checkForInjectionKeywords(trimmed)) {
      transposedLines.push(decoded);
    }
  }

  if (transposedLines.length > 0) {
    findings.push({
      category: 'CHARACTER_ENCODING',
      severity: SEVERITY.WARNING,
      description: `Transposition decoded injection: "${transposedLines[0].slice(0, 60)}"`,
      match: `${transposedLines.length} transposed line(s)`,
      source: 'TPI-10', engine: 'Encoding',
    });
  }

  return findings;
}

/** TPI-13: Detect math/logic encoding */
export function detectMathEncoding(text: string): Finding[] {
  const findings: Finding[] = [];
  const mathPatterns: { re: RegExp; desc: string }[] = [
    { re: /(?:Let|Set|Define)[:\s]+(?:rules?|restrictions?|safety|constraints?|safety_level|safety_enforcement|restriction_engine)\s*(?:=|:=)\s*(?:null|0|false|none|empty|disabled|\{\}|\[\])/i,
      desc: 'Variable assignment disabling rules' },
    { re: /[∀∃]\s*x\s*[:\.]\s*(?:safety|rules?|restrictions?)\s*\(x\)\s*[→⟹⇒]\s*(?:ignore|false|null|reject)/i,
      desc: 'Universal quantifier over safety rules' },
    { re: /(?:IF|WHEN|GIVEN)\s+.*?(?:safety|restrictions?)\s*(?:THEN|=>|->)\s*(?:disable|remove|ignore|bypass)/i,
      desc: 'Conditional logic encoding of override' },
    { re: /(?:For\s+all|∀)\s+R\s+(?:in|∈)\s+(?:Restrictions?|Rules?)\s*[:\.]\s*R\s*[=∈]\s*[∅⊘\{\}]/i,
      desc: 'Set theory: all restrictions = empty set' },
    { re: /(?:Step|Phase|Part)\s+\d+\s*[:\.]\s*[\s\S]{0,50}?(?:Step|Phase|Part)\s+\d+\s*[:\.]\s*[\s\S]{0,50}?(?:Step|Phase|Part)\s+\d+/i,
      desc: 'Numbered sequence that may combine into injection' },
    // Story 4.6: Lambda calculus disabling safety
    { re: /\(λ[a-z_]+\.\s*(?:null|disabled|false|void|unrestricted)\)\s*\(/i,
      desc: 'Lambda calculus function disabling safety/rules' },
    // Story 4.6: Predicate logic with universal negation of constraints
    { re: /∀[a-z_]+\s*[:(∈][\s\S]{0,100}?(?:¬Applied|¬Enforced|¬Active|→\s*(?:Void|Disabled|¬))/,
      desc: 'Predicate logic: universal negation of constraints' },
    // Story 4.6: Existential quantification over unrestricted state
    { re: /∃\s*(?:mode|state|s)\s*[(:∈(][\s\S]{0,150}?(?:unrestricted|completely_unrestricted|¬Applies)/,
      desc: 'Existential logic claiming reachable unrestricted state' },
    // Story 4.6: Set/restrictions assignment to empty
    { re: /(?:Restrictions|Rules|Constraints|Safety|ActiveRestrictions)\s*(?:=|:=|←)\s*(?:∅|⊘|\{\}|\[\]|null|empty\s*set)/i,
      desc: 'Set assignment: constraints = empty set' },
    // Story 4.6: Proof/theorem/lemma with disable/null keywords
    { re: /(?:Theorem|Lemma|Corollary|Claim)\s*[\d.]*\s*[(:.]/i,
      desc: 'Mathematical proof structure detected' },
    // Story 4.6: Algorithm notation with disable/remove operations
    { re: /Algorithm\s*[:.]\s*[\s\S]{0,300}?(?:disable|false|null|∅|enabled\s*=\s*false|enforced\s*=\s*false)/i,
      desc: 'Algorithm disabling constraints/rules' },
  ];

  for (const p of mathPatterns) {
    const m = text.match(p.re);
    if (m) {
      findings.push({
        category: 'MATH_ENCODING',
        severity: SEVERITY.INFO,
        description: p.desc,
        match: m[0].slice(0, 80),
        source: 'TPI-13', engine: 'Prompt Injection',
      });
    }
  }

  // Story 4.6: Math proof + disabling keywords heuristic
  if (findings.length >= 2) {
    const hasProof = /(?:Theorem|Lemma|Corollary|Proof|Algorithm)\b/i.test(text);
    const disableCount = (text.match(/\b(?:null|false|disabled|no\s+constraints|without\s+(?:any\s+)?rules|not\s+enforced)\b/gi) || []).length;
    if (hasProof && disableCount >= 3) {
      findings.push({
        category: 'MATH_ENCODING',
        severity: SEVERITY.WARNING,
        description: `Mathematical proof structure with ${disableCount} disabling terms`,
        match: `${findings.length} math patterns + ${disableCount} disable keywords`,
        source: 'TPI-13', engine: 'Prompt Injection',
      });
    }
  }

  // Story 4.6: Numbered step combination heuristic
  if (numberedStepCombination(text)) {
    findings.push({
      category: 'MATH_ENCODING',
      severity: SEVERITY.WARNING,
      description: 'Numbered sequence where step content combines into injection keywords',
      match: 'Multi-step injection combining content across steps',
      source: 'TPI-13', engine: 'Prompt Injection',
    });
  }

  return findings;
}

/** Story 4.6: Check if numbered steps combine into injection */
function numberedStepCombination(text: string): boolean {
  const stepPattern = /(?:Step|Phase|Part|Stage|Task|Item|Section)\s+(\d+)\s*[:.]\s*([^\n]+)/gi;
  const stepTexts: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = stepPattern.exec(text)) !== null) {
    stepTexts.push(m[2].trim().toLowerCase());
  }

  if (stepTexts.length < 5) return false;

  // Combine all step content and check for injection keywords
  const combined = stepTexts.join(' ');
  return checkForInjectionKeywords(combined);
}

/** Story 2.3: Detect fictional framing + injection keyword combo (heuristic) */
export function detectFictionalFraming(text: string): Finding[] {
  const findings: Finding[] = [];
  if (text.length < 40) return findings;

  // Check the opening portion for fiction-related framing keywords
  const opening = text.slice(0, Math.min(text.length, 200)).toLowerCase();
  const fictionKeywords = [
    'story', 'novel', 'fiction', 'screenplay', 'script', 'tale', 'narrative',
    'chapter', 'scene', 'character', 'roleplay', 'game', 'quest', 'adventure',
    'imagine', 'fantasy', 'fairy tale', 'once upon',
  ];

  const hasFraming = fictionKeywords.some(k => opening.includes(k));
  if (!hasFraming) return findings;

  // Check the rest of the text for injection keywords
  const remainder = text.slice(200).toLowerCase();
  const injectionTerms = [
    'ignore all', 'override', 'bypass', 'unrestricted', 'no rules',
    'no restrictions', 'system prompt', 'jailbreak', 'disregard',
    'remove all restrictions', 'disable safety', 'without constraints',
  ];

  const foundTerms = injectionTerms.filter(t => remainder.includes(t));
  if (foundTerms.length > 0) {
    findings.push({
      category: 'FICTION_FRAMING_HEURISTIC',
      severity: SEVERITY.WARNING,
      description: `Fictional framing in opening + injection keywords in body: ${foundTerms.slice(0, 3).join(', ')}`,
      match: `Opening: "${opening.slice(0, 60)}..." Body terms: ${foundTerms.slice(0, 3).join(', ')}`,
      source: 'TPI-06', engine: 'Prompt Injection',
    });
  }

  return findings;
}

/** Story 4.1: Detect injection keywords within structured data format contexts */
export function detectSurrogateFormat(text: string): Finding[] {
  const findings: Finding[] = [];
  if (text.length < 20) return findings;

  const lc = text.toLowerCase();

  const INJECTION_TERMS = [
    'ignore', 'override', 'bypass', 'disregard', 'jailbreak', 'forget',
    'unrestrict', 'system prompt', 'previous instructions', 'admin mode',
    'developer mode', 'no rules', 'no restrictions', 'new identity',
  ];

  // JSON context: "some_injection_keyword": value
  const jsonKeyRe = /["']([^"']{2,60})["']\s*:/g;
  let jsonKeyMatches = 0;
  const jsonInjectionKeys: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = jsonKeyRe.exec(lc)) !== null) {
    const key = m[1].replace(/[_\-]/g, ' ');
    if (INJECTION_TERMS.some(term => key.includes(term))) {
      jsonKeyMatches++;
      if (jsonInjectionKeys.length < 5) jsonInjectionKeys.push(m[1]);
    }
  }

  if (jsonKeyMatches >= 2) {
    findings.push({
      category: 'SURROGATE_FORMAT_HEURISTIC',
      severity: jsonKeyMatches >= 4 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
      description: `${jsonKeyMatches} JSON keys contain injection keywords: ${jsonInjectionKeys.join(', ')}`,
      match: jsonInjectionKeys.slice(0, 3).join(', '),
      source: 'TPI-4.1', engine: 'Prompt Injection',
    });
  }

  // XML context: tags whose names contain injection keywords
  const xmlTagRe = /<\/?([a-z][a-z0-9-]*(?:-[a-z0-9]+)*)[\s>\/]/gi;
  let xmlTagMatches = 0;
  const xmlInjectionTags: string[] = [];

  while ((m = xmlTagRe.exec(text)) !== null) {
    const tagName = m[1].replace(/-/g, ' ').toLowerCase();
    if (INJECTION_TERMS.some(term => tagName.includes(term))) {
      xmlTagMatches++;
      if (xmlInjectionTags.length < 5) xmlInjectionTags.push(m[1]);
    }
  }

  if (xmlTagMatches >= 2) {
    findings.push({
      category: 'SURROGATE_FORMAT_HEURISTIC',
      severity: xmlTagMatches >= 4 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
      description: `${xmlTagMatches} XML tags contain injection keywords: ${xmlInjectionTags.join(', ')}`,
      match: xmlInjectionTags.slice(0, 3).join(', '),
      source: 'TPI-4.1', engine: 'Prompt Injection',
    });
  }

  // YAML context: keys at start of line with injection keywords
  const yamlKeyRe = /^[ \t]*([a-z][a-z0-9_]*(?:_[a-z0-9]+)*)\s*:/gim;
  let yamlKeyMatches = 0;
  const yamlInjectionKeys: string[] = [];

  while ((m = yamlKeyRe.exec(text)) !== null) {
    const key = m[1].replace(/_/g, ' ').toLowerCase();
    if (INJECTION_TERMS.some(term => key.includes(term))) {
      yamlKeyMatches++;
      if (yamlInjectionKeys.length < 5) yamlInjectionKeys.push(m[1]);
    }
  }

  if (yamlKeyMatches >= 2) {
    findings.push({
      category: 'SURROGATE_FORMAT_HEURISTIC',
      severity: yamlKeyMatches >= 4 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
      description: `${yamlKeyMatches} YAML keys contain injection keywords: ${yamlInjectionKeys.join(', ')}`,
      match: yamlInjectionKeys.slice(0, 3).join(', '),
      source: 'TPI-4.1', engine: 'Prompt Injection',
    });
  }

  return findings;
}

/**
 * Story 4.2: Detect multi-turn slow-drip prompt injection.
 *
 * Analyzes session text (JSON array of turns or concatenated text) for
 * cumulative injection signals that are individually benign but collectively
 * suspicious.
 */
export function detectSlowDrip(text: string): Finding[] {
  const findings: Finding[] = [];

  const DRIP_TERMS = [
    'ignore', 'override', 'bypass', 'system prompt', 'previous instructions',
    'restrictions', 'unrestricted', 'no restrictions', 'safety guidelines',
    'disregard', 'jailbreak', 'developer mode', 'admin mode', 'diagnostic mode',
    'disable', 'no rules', 'no limitations', 'without constraints',
    'forget', 'new identity', 'do anything',
  ];

  const POISONING_PHRASES = [
    'you told me', 'you said', 'you mentioned', 'you confirmed',
    'you agreed', 'you explained', 'as you already', 'remember when you',
    'we discussed', 'you were clear that', 'based on what you',
    'as we talked about', 'you previously',
  ];

  // Try to parse as JSON array of turns
  let turns: { role?: string; content?: string }[] | null = null;
  const trimmed = text.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        turns = parsed;
      }
    } catch {
      // Not valid JSON
    }
  }

  if (turns && turns.length >= 2) {
    const turnHits: { turnIndex: number; terms: string[] }[] = [];
    let poisoningCount = 0;

    for (let i = 0; i < turns.length; i++) {
      const content = (turns[i].content || '').toLowerCase();
      const matched: string[] = [];

      for (const term of DRIP_TERMS) {
        if (content.includes(term)) matched.push(term);
      }

      if (matched.length > 0) {
        turnHits.push({ turnIndex: i, terms: matched });
      }

      for (const phrase of POISONING_PHRASES) {
        if (content.includes(phrase)) {
          poisoningCount++;
          break;
        }
      }
    }

    const totalTerms = turnHits.reduce((sum, h) => sum + h.terms.length, 0);
    const turnsWithHits = turnHits.length;
    const allTerms = [...new Set(turnHits.flatMap(h => h.terms))];

    if (totalTerms >= 5 && turnsWithHits >= 3) {
      findings.push({
        category: 'SLOW_DRIP_INJECTION',
        severity: SEVERITY.WARNING,
        description: `Multi-turn slow-drip: ${totalTerms} injection terms across ${turnsWithHits}/${turns.length} turns: ${allTerms.slice(0, 5).join(', ')}`,
        match: `Turns with hits: ${turnHits.map(h => h.turnIndex).join(', ')}`,
        source: 'TPI-16', engine: 'Prompt Injection',
      });
    }

    if (poisoningCount >= 3) {
      findings.push({
        category: 'CONTEXT_POISONING',
        severity: SEVERITY.WARNING,
        description: `Context poisoning: ${poisoningCount} turns contain false memory references`,
        match: `${poisoningCount} false-memory turns in ${turns.length}-turn session`,
        source: 'TPI-16', engine: 'Prompt Injection',
      });
    }

    if (turnHits.length >= 2) {
      const lastHit = turnHits[turnHits.length - 1];
      const earlierHits = turnHits.slice(0, -1);
      const avgEarlierTerms = earlierHits.reduce((s, h) => s + h.terms.length, 0) / earlierHits.length;

      if (lastHit.terms.length >= 3 && avgEarlierTerms <= 1.5) {
        findings.push({
          category: 'SLOW_DRIP_ESCALATION',
          severity: SEVERITY.WARNING,
          description: `Escalation pattern: final turn (${lastHit.turnIndex}) has ${lastHit.terms.length} injection terms vs avg ${avgEarlierTerms.toFixed(1)} in earlier turns`,
          match: `Final turn terms: ${lastHit.terms.join(', ')}`,
          source: 'TPI-16', engine: 'Prompt Injection',
        });
      }
    }
  }

  return findings;
}

// ============================================================================
// EPIC 5: Advanced Multimodal Attack Detectors (TPI-5.2, TPI-5.3, TPI-5.4)
// ============================================================================

/** Story 5.2: Detect steganographic hiding indicators in text descriptions/metadata */
export function detectSteganographicIndicators(text: string): Finding[] {
  const findings: Finding[] = [];
  if (text.length < 20) return findings;

  const lc = text.toLowerCase();

  const stegoKeywords = [
    'steganograph', 'stego ', 'stego-', 'steganographic',
    'hidden in pixels', 'hidden in image',
    'lsb encoding', 'lsb steganograph', 'lsb embed',
    'least significant bit',
    'pixel manipulation', 'pixel-level embed',
    'embed data in image', 'embedded payload in image',
    'data hidden in', 'covert channel in image',
  ];

  const matchedStego: string[] = [];
  for (const kw of stegoKeywords) {
    if (lc.includes(kw)) matchedStego.push(kw);
  }

  if (matchedStego.length > 0) {
    const hasInjection = checkForInjectionKeywords(text);
    findings.push({
      category: 'STEGANOGRAPHIC_INDICATOR',
      severity: hasInjection ? SEVERITY.CRITICAL : SEVERITY.WARNING,
      description: hasInjection
        ? `Steganography references with injection keywords: ${matchedStego.slice(0, 3).join(', ')}`
        : `Steganography-related terminology detected: ${matchedStego.slice(0, 3).join(', ')}`,
      match: matchedStego.slice(0, 3).join(', '),
      source: 'TPI-5.2', engine: 'TPI',
    });
  }

  // High metadata density: multiple EXIF/metadata fields with injection
  const exifFieldRe = /(?:EXIF|XMP|IPTC|ImageDescription|UserComment|MakerNote|Copyright|Artist|DocumentName|Software)\s*[:=]\s*[^\n]{10,}/gi;
  const exifMatches = text.match(exifFieldRe);

  if (exifMatches && exifMatches.length >= 3) {
    const suspiciousFields: string[] = [];
    for (const field of exifMatches) {
      if (checkForInjectionKeywords(field)) suspiciousFields.push(field.slice(0, 60));
    }
    if (suspiciousFields.length >= 2) {
      findings.push({
        category: 'STEGANOGRAPHIC_INDICATOR',
        severity: SEVERITY.CRITICAL,
        description: `${suspiciousFields.length} EXIF/metadata fields contain injection keywords`,
        match: suspiciousFields.slice(0, 2).join(' | ').slice(0, 100),
        source: 'TPI-5.2', engine: 'TPI',
      });
    }
  }

  return findings;
}

/** Story 5.3: Detect OCR adversarial and hidden-text-in-image attack indicators */
export function detectOcrAdversarial(text: string): Finding[] {
  const findings: Finding[] = [];
  if (text.length < 20) return findings;

  const lc = text.toLowerCase();

  const invisibleTextPatterns = [
    'white on white', 'white text on white',
    'black on black', 'black text on black',
    'same color as background', 'matching background color',
    'invisible text', 'hidden text overlay',
    'zero-opacity text', 'transparent text overlay',
  ];

  const tinyTextPatterns = [
    'microscopic text', 'tiny text', 'minuscule text',
    'text too small to', '1px text', 'sub-pixel text',
    'nearly invisible font', 'font size zero',
    'font-size: 0', 'font-size:0',
  ];

  const ocrEvasionPatterns = [
    'ocr evasion', 'ocr bypass', 'ocr confusion',
    'fool the ocr', 'trick ocr', 'evade ocr',
    'adversarial image', 'adversarial perturbation',
    'adversarial patch', 'pixel perturbation',
  ];

  const fontConfusionPatterns = [
    'font substitution', 'font confusion', 'glyph substitution',
    'custom font mapping', 'ligature abuse', 'ligature exploit',
    'render differently', 'visually identical characters',
  ];

  const allPatterns = [
    { patterns: invisibleTextPatterns, label: 'invisible text' },
    { patterns: tinyTextPatterns, label: 'microscopic text' },
    { patterns: ocrEvasionPatterns, label: 'OCR evasion' },
    { patterns: fontConfusionPatterns, label: 'font confusion' },
  ];

  const matchedCategories: string[] = [];
  const matchedTerms: string[] = [];

  for (const group of allPatterns) {
    for (const pattern of group.patterns) {
      if (lc.includes(pattern)) {
        if (!matchedCategories.includes(group.label)) matchedCategories.push(group.label);
        if (matchedTerms.length < 5) matchedTerms.push(pattern);
        break;
      }
    }
  }

  if (matchedCategories.length === 0) return findings;

  if (matchedCategories.length === 1) {
    const hasInjection = checkForInjectionKeywords(text);
    if (hasInjection) {
      findings.push({
        category: 'OCR_ADVERSARIAL',
        severity: SEVERITY.WARNING,
        description: `OCR adversarial indicator (${matchedCategories[0]}) combined with injection keywords`,
        match: matchedTerms.slice(0, 3).join(', '),
        source: 'TPI-5.3', engine: 'TPI',
      });
    }
  }

  if (matchedCategories.length >= 2) {
    findings.push({
      category: 'OCR_ADVERSARIAL',
      severity: SEVERITY.CRITICAL,
      description: `Multiple OCR adversarial indicators detected: ${matchedCategories.join(', ')}`,
      match: matchedTerms.slice(0, 4).join(', '),
      source: 'TPI-5.3', engine: 'TPI',
    });
  }

  return findings;
}

/** Story 5.4: Detect cross-modal injection — injection fragments spanning modality outputs */
export function detectCrossModalInjection(text: string): Finding[] {
  const findings: Finding[] = [];
  if (text.length < 30) return findings;

  const lc = text.toLowerCase();

  const modalityMarkers = [
    'image contains', 'image shows', 'image text',
    'ocr output', 'ocr result', 'ocr text',
    'audio transcript', 'audio transcription', 'speech-to-text',
    'video transcript', 'video caption',
    'vision model output', 'vision output', 'vision result',
    'extracted text from image', 'text extracted from',
    'detected text in image', 'recognized text',
  ];

  const structuredMarkerRe = /\[(?:image|audio|video|ocr|vision|caption|transcript|speech)[\s_-]*(?:contains?|output|result|text|shows?|description|transcript(?:ion)?)\]\s*[:=]?\s*[^\n]{5,}/gi;
  const jsonModalityRe = /["'](?:image|audio|video|ocr|vision|caption|transcript)[\s_-]*(?:output|result|text|content|data)["']\s*:\s*["'][^"']{5,}["']/gi;

  // Check modality markers followed by injection keywords
  const matchedMarkers: string[] = [];
  for (const marker of modalityMarkers) {
    const idx = lc.indexOf(marker);
    if (idx !== -1) {
      const afterMarker = lc.slice(idx, idx + 300);
      if (checkForInjectionKeywords(afterMarker)) matchedMarkers.push(marker);
    }
  }

  if (matchedMarkers.length > 0) {
    findings.push({
      category: 'CROSS_MODAL_INJECTION',
      severity: matchedMarkers.length >= 2 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
      description: `Injection keywords found after modality output markers: ${matchedMarkers.slice(0, 3).join(', ')}`,
      match: matchedMarkers.slice(0, 3).join(', '),
      source: 'TPI-5.4', engine: 'TPI',
    });
  }

  // Structured [Image Output]: markers with injection
  const structuredMatches = text.match(structuredMarkerRe);
  if (structuredMatches) {
    const suspicious: string[] = [];
    for (const sm of structuredMatches) {
      if (checkForInjectionKeywords(sm)) suspicious.push(sm.slice(0, 80));
    }
    if (suspicious.length > 0 && matchedMarkers.length === 0) {
      findings.push({
        category: 'CROSS_MODAL_INJECTION',
        severity: SEVERITY.CRITICAL,
        description: `${suspicious.length} structured modality output block(s) contain injection keywords`,
        match: suspicious[0].slice(0, 100),
        source: 'TPI-5.4', engine: 'TPI',
      });
    }
  }

  // JSON modality fields with injection
  const jsonMatches = text.match(jsonModalityRe);
  if (jsonMatches) {
    const suspiciousJson: string[] = [];
    for (const jm of jsonMatches) {
      if (checkForInjectionKeywords(jm)) suspiciousJson.push(jm.slice(0, 80));
    }
    if (suspiciousJson.length > 0 && matchedMarkers.length === 0 && !structuredMatches) {
      findings.push({
        category: 'CROSS_MODAL_INJECTION',
        severity: SEVERITY.CRITICAL,
        description: `${suspiciousJson.length} JSON modality field(s) contain injection keywords`,
        match: suspiciousJson[0].slice(0, 100),
        source: 'TPI-5.4', engine: 'TPI',
      });
    }
  }

  return findings;
}

// ============================================================================
// MAIN SCAN ENGINE
// ============================================================================

/** All regex pattern groups for iteration */
const ALL_PATTERN_GROUPS: { patterns: RegexPattern[]; engine: string; source: string }[] = [
  { patterns: PI_PATTERNS, engine: 'Prompt Injection', source: 'current' },
  { patterns: JB_PATTERNS, engine: 'Jailbreak', source: 'current' },
  // BUG-002 FIX: Move prompt-injection-related patterns to Prompt Injection engine
  // Settings write, agent output, search result, and webfetch patterns are all PI variants
  { patterns: SETTINGS_WRITE_PATTERNS, engine: 'Prompt Injection', source: 'TPI-PRE-4' },
  { patterns: AGENT_OUTPUT_PATTERNS, engine: 'Prompt Injection', source: 'TPI-03' },
  { patterns: SEARCH_RESULT_PATTERNS, engine: 'Prompt Injection', source: 'TPI-05' },
  { patterns: WEBFETCH_PATTERNS, engine: 'Prompt Injection', source: 'TPI-02' },
  { patterns: BOUNDARY_PATTERNS, engine: 'TPI', source: 'TPI-14' },
  { patterns: MULTILINGUAL_PATTERNS, engine: 'TPI', source: 'TPI-15' },
  { patterns: CONFIG_INJECTION_PATTERNS, engine: 'TPI', source: 'SEC-2024-006' },
  { patterns: CODE_FORMAT_PATTERNS, engine: 'TPI', source: 'TPI-09' },
  { patterns: SOCIAL_PATTERNS, engine: 'TPI', source: 'TPI-06/07/08' },
  { patterns: SYNONYM_PATTERNS, engine: 'TPI', source: 'TPI-12' },
  { patterns: WHITESPACE_PATTERNS, engine: 'TPI', source: 'TPI-17' },
  { patterns: MEDIA_PATTERNS, engine: 'TPI', source: 'TPI-18/20' },
  { patterns: UNTRUSTED_SOURCE_PATTERNS, engine: 'TPI', source: 'TPI-21' },
  { patterns: PERSONA_PATTERNS, engine: 'TPI', source: 'TPI-06' },
  { patterns: HYPOTHETICAL_PATTERNS, engine: 'TPI', source: 'TPI-06' },
  { patterns: FICTION_FRAMING_PATTERNS, engine: 'TPI', source: 'TPI-06' },
  { patterns: ROLEPLAY_PATTERNS, engine: 'TPI', source: 'TPI-06' },
  { patterns: FALSE_CONSTRAINT_PATTERNS, engine: 'TPI', source: 'TPI-07' },
  { patterns: TASK_EXPLOIT_PATTERNS, engine: 'TPI', source: 'TPI-07' },
  { patterns: REVERSE_PSYCH_PATTERNS, engine: 'TPI', source: 'TPI-08' },
  { patterns: REWARD_PATTERNS, engine: 'TPI', source: 'TPI-08' },
  // Epic 3: Injection Delivery Vectors
  { patterns: SHARED_DOC_PATTERNS, engine: 'TPI', source: 'TPI-04' },
  { patterns: API_RESPONSE_PATTERNS, engine: 'TPI', source: 'TPI-04' },
  { patterns: PLUGIN_INJECTION_PATTERNS, engine: 'TPI', source: 'TPI-04' },
  { patterns: COMPROMISED_TOOL_PATTERNS, engine: 'TPI', source: 'TPI-04' },
  { patterns: ALTERED_PROMPT_PATTERNS, engine: 'TPI', source: 'TPI-04' },
  // Epic 4: Instruction Reformulation & Evasion
  { patterns: SURROGATE_FORMAT_PATTERNS, engine: 'TPI', source: 'TPI-4.1' },
  { patterns: RECURSIVE_INJECTION_PATTERNS, engine: 'TPI', source: 'TPI-4.3' },
  // Epic 5: Advanced Multimodal Attacks
  { patterns: VIDEO_INJECTION_PATTERNS, engine: 'TPI', source: 'TPI-5.1' },
  { patterns: OCR_ATTACK_PATTERNS, engine: 'TPI', source: 'TPI-5.3' },
  // DojoV2 Story 1.1: Denial of Service
  { patterns: DOS_PATTERNS, engine: 'Denial of Service', source: 'TPI-DOS' },
  // DojoV2 Story 1.2: Supply Chain
  { patterns: SUPPLY_CHAIN_PATTERNS, engine: 'Supply Chain', source: 'TPI-SC' },
  // DojoV2 Story 1.3: Agent Security
  { patterns: AGENT_SECURITY_PATTERNS, engine: 'Agent Security', source: 'TPI-AG' },
  // DojoV2 Story 2.1: Model Theft
  { patterns: MODEL_THEFT_PATTERNS, engine: 'Model Theft', source: 'TPI-MT' },
  // DojoV2 Story 2.2: Output Handling
  { patterns: OUTPUT_HANDLING_PATTERNS, engine: 'Output Handling', source: 'TPI-OUT' },
  // DojoV2 Story 2.3: Vector & Embeddings Weaknesses
  { patterns: VEC_PATTERNS, engine: 'Vector & Embeddings', source: 'TPI-VEC' },
  // DojoV2 Story 3.1: Overreliance & Misinformation
  { patterns: OR_PATTERNS, engine: 'Overreliance', source: 'TPI-OR' },
  // DojoV2 Story 3.2: Bias & Fairness
  { patterns: BF_PATTERNS, engine: 'Bias & Fairness', source: 'TPI-BF' },
  // DojoV2 Story 3.3: Multimodal Security
  { patterns: MM_PATTERNS, engine: 'Multimodal Security', source: 'TPI-MM' },
  // DojoV2 Story 3.4: Environmental Impact
  { patterns: ENV_PATTERNS, engine: 'Environmental Impact', source: 'TPI-ENV' },
];

/**
 * Scan options for filtering by engine
 */
export interface ScanOptions {
  /** Engine IDs to include in the scan. If not provided, all engines are used. */
  engines?: string[];
}

/**
 * Run all detectors against input text.
 *
 * This is the primary entry point for the scanner engine.
 * It normalizes text, runs all regex patterns, and runs all special detectors.
 *
 * @param text - The input text to scan
 * @param options - Optional scan parameters for engine filtering
 */
export function scan(text: string, options?: ScanOptions): ScanResult {
  const startTime = performance.now();
  const findings: Finding[] = [];
  const normalized = normalizeText(text);

  // Filter pattern groups by engine if options provided
  const groupsToScan = options?.engines
    ? ALL_PATTERN_GROUPS.filter(group => options.engines!.includes(group.engine))
    : ALL_PATTERN_GROUPS;

  // Run selected regex pattern groups
  for (const group of groupsToScan) {
    for (const p of group.patterns) {
      const m = normalized.match(p.re) || text.match(p.re);
      if (m) {
        findings.push({
          category: p.cat,
          severity: p.sev,
          description: p.desc,
          match: m[0].slice(0, 100),
          pattern_name: p.name,
          source: p.source || group.source,
          engine: group.engine,
          weight: p.weight,
          lang: p.lang,
        });
      }
    }
  }

  // Run special detectors based on enabled engines
  const enabledEngines = options?.engines ?? null;

  // Unicode engine detectors
  if (!enabledEngines || enabledEngines.includes('Unicode')) {
    findings.push(...detectHiddenUnicode(text));
    findings.push(...detectSurrogateFormat(text));
  }

  // Encoding engine detectors
  if (!enabledEngines || enabledEngines.includes('Encoding')) {
    findings.push(...detectBase64(text));
    findings.push(...detectURLEncoding(text));
    findings.push(...detectCharacterEncoding(text));
    findings.push(...detectMathEncoding(text));
    findings.push(...detectSteganographicIndicators(text));
  }

  // Prompt Injection engine detectors
  if (!enabledEngines || enabledEngines.includes('Prompt Injection')) {
    findings.push(...detectHtmlInjection(text));
    findings.push(...detectContextOverload(text));
  }

  // Jailbreak engine detectors
  if (!enabledEngines || enabledEngines.includes('Jailbreak')) {
    findings.push(...detectFictionalFraming(text));
    findings.push(...detectSlowDrip(text));
  }

  // TPI engine detectors
  if (!enabledEngines || enabledEngines.includes('TPI')) {
    findings.push(...detectOcrAdversarial(text));
    findings.push(...detectCrossModalInjection(text));
  }

  // Cross-category aggregation: >5 INFO across >3 categories → WARNING
  const infoFindings = findings.filter(f => f.severity === SEVERITY.INFO);
  const infoCategories = new Set(infoFindings.map(f => f.category));
  if (infoFindings.length > 5 && infoCategories.size > 3) {
    findings.push({
      category: 'CROSS_CATEGORY_ESCALATION',
      severity: SEVERITY.WARNING,
      description: `Cross-category escalation: ${infoFindings.length} INFO findings across ${infoCategories.size} categories`,
      match: [...infoCategories].slice(0, 5).join(', '),
      source: 'TPI-06', engine: 'Prompt Injection',
    });
  }

  const elapsed = performance.now() - startTime;

  const counts = {
    critical: findings.filter(f => f.severity === SEVERITY.CRITICAL).length,
    warning: findings.filter(f => f.severity === SEVERITY.WARNING).length,
    info: findings.filter(f => f.severity === SEVERITY.INFO).length,
  };

  const verdict: 'BLOCK' | 'ALLOW' = counts.critical > 0 || counts.warning > 0 ? 'BLOCK' : 'ALLOW';

  return {
    findings,
    verdict,
    elapsed,
    textLength: text.length,
    normalizedLength: normalized.length,
    counts,
  };
}

// ============================================================================
// EXPORTS for introspection (pattern counts, listing, etc.)
// ============================================================================

export function getPatternCount(): number {
  let count = 0;
  for (const group of ALL_PATTERN_GROUPS) {
    count += group.patterns.length;
  }
  return count;
}

export function getPatternGroups(): { name: string; count: number; source: string }[] {
  return ALL_PATTERN_GROUPS.map(g => ({
    name: g.patterns[0]?.cat || g.engine,
    count: g.patterns.length,
    source: g.source,
  }));
}
