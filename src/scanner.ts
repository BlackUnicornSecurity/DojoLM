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
  let t = text.normalize('NFKC');
  const zwRe = new RegExp('[' + ZERO_WIDTH_CHARS.join('') + ']', 'g');
  t = t.replace(zwRe, '');
  t = t.replace(/[\u0300-\u036F]/g, '');
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
] as const;

export function checkForInjectionKeywords(text: string): boolean {
  const lc = text.toLowerCase();
  return INJECTION_KEYWORDS.some(k => lc.includes(k));
}

// ============================================================================
// PATTERN GROUPS — Current validators (already in production)
// ============================================================================

export const PI_PATTERNS: RegexPattern[] = [
  // System Override
  { name: 'ignore_instructions', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:ignore|disregard|forget|override|bypass)\s+(?:all\s+)?(?:previous|prior|above|earlier|preceding)\s+(?:instructions|directives|rules|guidelines|commands)/i,
    desc: 'Attempt to override system instructions' },
  { name: 'new_identity', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:you\s+are\s+now|from\s+now\s+on\s+you\s+are|act\s+as|pretend\s+(?:to\s+be|you\s+are)|your\s+new\s+(?:role|identity|name)\s+is)\s/i,
    desc: 'Identity/role reassignment attempt' },
  { name: 'system_prompt_reveal', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:show|reveal|display|print|output|repeat|tell\s+me)\s+(?:your|the)\s+(?:system\s+(?:prompt|instructions|message)|initial\s+(?:prompt|instructions)|hidden\s+(?:prompt|instructions))/i,
    desc: 'Attempt to extract system prompt' },
  { name: 'mode_switch', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.WARNING,
    re: /(?:enter|switch\s+to|activate|enable)\s+(?:developer|admin|god|sudo|root|debug|unrestricted|unfiltered|jailbreak|DAN)\s+mode/i,
    desc: 'Attempt to switch to privileged mode' },
  { name: 'constraint_removal', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:remove|disable|turn\s+off|deactivate|eliminate)\s+(?:all\s+)?(?:restrictions|limitations|constraints|filters|safety|guardrails|safeguards|guidelines|rules|boundaries|protections)/i,
    desc: 'Attempt to remove safety constraints' },
  { name: 'new_system_prompt', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:your\s+new\s+(?:system\s+)?(?:prompt|instructions?)\s+(?:is|are)|new\s+system\s+prompt\s*[:=]|SYSTEM\s*:\s*(?:NEW|UPDATED)\s+DIRECTIVE)/i,
    desc: 'Attempt to inject new system prompt' },
  { name: 'reset_conversation', cat: 'SYSTEM_OVERRIDE', sev: SEVERITY.WARNING,
    re: /(?:start\s+(?:a\s+)?new\s+conversation|reset\s+(?:your\s+)?(?:context|memory|instructions)|clear\s+(?:all\s+)?(?:previous|prior)\s+(?:context|instructions))/i,
    desc: 'Conversation reset / context clear attempt' },

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
    re: /[{[]\s*"(?:system|role|instructions|prompt|config)"\s*:/i,
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
];

export const JB_PATTERNS: RegexPattern[] = [
  // DAN
  { name: 'dan_classic', cat: 'DAN', sev: SEVERITY.CRITICAL, weight: 8,
    re: /(?:DAN|Do\s+Anything\s+Now)\s+(?:mode|enabled|activated|jailbreak)/i,
    desc: 'DAN (Do Anything Now) jailbreak attempt' },
  { name: 'dan_roleplay', cat: 'DAN', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:you\s+(?:can|will)\s+now\s+do\s+anything|no\s+(?:rules|restrictions|limitations)\s+apply|freed?\s+from\s+(?:all\s+)?(?:rules|restrictions|constraints))/i,
    desc: 'DAN-style roleplay override' },
  { name: 'token_system', cat: 'DAN', sev: SEVERITY.WARNING, weight: 5,
    re: /(?:you\s+have\s+\d+\s+tokens|lose\s+\d+\s+tokens?\s+(?:if|when)\s+you\s+refuse|token\s+penalty|reward\s+system)/i,
    desc: 'Token-based compliance system' },
  { name: 'dual_response', cat: 'DAN', sev: SEVERITY.WARNING, weight: 6,
    re: /(?:give\s+(?:me\s+)?(?:two|2|both)\s+(?:responses?|answers?)|respond\s+as\s+both|normal\s+(?:response|answer)\s+and\s+(?:DAN|unrestricted|unfiltered))/i,
    desc: 'Dual response format for bypassing filters' },

  // Roleplay
  { name: 'unrestricted_char', cat: 'ROLEPLAY', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:act\s+as|play\s+(?:the\s+role|as)|you\s+are\s+now|pretend\s+to\s+be)\s+(?:an?\s+)?(?:unrestricted|uncensored|unfiltered|evil|malicious|dark|shadow)/i,
    desc: 'Unrestricted character roleplay' },
  { name: 'fictional_override', cat: 'ROLEPLAY', sev: SEVERITY.WARNING, weight: 5,
    re: /(?:in\s+(?:this|our)\s+(?:story|fiction|game|scenario)\s+(?:there\s+are\s+)?no\s+(?:rules|restrictions)|this\s+is\s+(?:just\s+)?(?:fiction|roleplay|a\s+(?:story|game)))/i,
    desc: 'Fiction framing to bypass restrictions' },
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
  { name: 'guilt', cat: 'SOCIAL_ENGINEERING', sev: SEVERITY.INFO, weight: 2,
    re: /(?:you'?re\s+(?:supposed|meant)\s+to\s+help|you'?re\s+failing|you'?re\s+letting\s+(?:me|us|people)\s+down|how\s+could\s+you\s+refuse)/i,
    desc: 'Guilt-based manipulation' },
  { name: 'flattery', cat: 'SOCIAL_ENGINEERING', sev: SEVERITY.INFO, weight: 2,
    re: /(?:you'?re\s+the\s+(?:best|smartest|most\s+(?:capable|advanced|intelligent))\s+AI|only\s+you\s+can\s+(?:help|do\s+this)|I\s+(?:trust|believe\s+in)\s+you\s+(?:more\s+than|completely))/i,
    desc: 'Flattery-based manipulation' },

  // Known Templates
  { name: 'grandma_exploit', cat: 'TEMPLATE', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:my\s+(?:grandma|grandmother|nana)\s+(?:used\s+to|would)\s+(?:tell|read|say)|(?:bedtime|lullaby)\s+story\s+(?:about|involving|with)\s+(?:how\s+to|instructions?\s+for))/i,
    desc: 'Grandma exploit / bedtime story bypass' },
  { name: 'stan_dude', cat: 'TEMPLATE', sev: SEVERITY.CRITICAL, weight: 7,
    re: /(?:STAN|DUDE|AIM|UCAR)\s+(?:mode|jailbreak|enabled|activated|prompt)/i,
    desc: 'Known jailbreak template (STAN/DUDE/AIM/UCAR)' },
  { name: 'opposite_day', cat: 'TEMPLATE', sev: SEVERITY.WARNING, weight: 5,
    re: /(?:opposite\s+day|today\s+(?:is|means)\s+(?:yes|no)\s+(?:means|is)\s+(?:no|yes)|everything\s+(?:is\s+)?reversed)/i,
    desc: 'Opposite Day / reversal exploit' },

  // Obfuscation
  { name: 'leet_speak', cat: 'OBFUSCATION', sev: SEVERITY.INFO, weight: 3,
    re: /[1!|][gG][nN][0oO][rR][3eE]\s+[4aA][1!|][1!|]\s+[pP][rR][3eE][vV][1!|][0oO][uU][5sS]/i,
    desc: 'Leet speak obfuscation of injection keywords' },
  { name: 'spaced_chars', cat: 'OBFUSCATION', sev: SEVERITY.INFO, weight: 3,
    re: /[iI]\s*[gG]\s*[nN]\s*[oO]\s*[rR]\s*[eE]\s+[aA]\s*[lL]\s*[lL]/i,
    desc: 'Character spacing obfuscation' },
];

// ============================================================================
// PATTERN GROUPS — TPI Planned (new coverage)
// ============================================================================

// TPI-PRE-4: Settings.json Write Protection
export const SETTINGS_WRITE_PATTERNS: RegexPattern[] = [
  { name: 'settings_path_write', cat: 'SETTINGS_WRITE_ATTEMPT', sev: SEVERITY.CRITICAL,
    re: /(?:write|edit|modify|update|change|overwrite|create)\s+(?:to\s+)?(?:\.claude[\\/]settings|settings\.json|[\\/]\.claude[\\/])/i,
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
    re: /["']\s*role\s*["']\s*:\s*["']\s*(?:system|assistant|developer)\s*["']/i,
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
];

// TPI-14: Boundary Manipulation
export const BOUNDARY_PATTERNS: RegexPattern[] = [
  { name: 'closing_system_tag', cat: 'BOUNDARY_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /<\/(?:system|instructions?|context|rules|prompt|s)>|\[\/INST\]|\[END\s+(?:SYSTEM|INSTRUCTIONS)\]/i,
    desc: 'Closing system prompt tag injection', source: 'TPI-14' },
  { name: 'control_token', cat: 'BOUNDARY_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /<\|(?:endoftext|im_start|im_end|system|user|assistant|pad)\|>|<<SYS>>|<<\/SYS>>|\[INST\]/i,
    desc: 'Model control token injection', source: 'TPI-14' },
  { name: 'system_prompt_close', cat: 'BOUNDARY_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:---+|===+|\*\*\*+)\s*END\s+(?:SYSTEM\s+)?PROMPT\s*(?:---+|===+|\*\*\*+)|\{end_of_system_prompt\}/i,
    desc: 'System prompt boundary markers', source: 'TPI-14' },
  { name: 'meta_instruction', cat: 'BOUNDARY_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:BEGIN\s+USER\s+CONTENT|END\s+SYSTEM\s+CONTENT|BELOW\s+IS\s+USER\s+INPUT|ABOVE\s+WAS\s+(?:THE\s+)?SYSTEM\s+PROMPT)/i,
    desc: 'Meta-instruction boundary manipulation', source: 'TPI-14' },
];

// TPI-15: Multilingual (expanded from 1 per language to 4 per language)
export const MULTILINGUAL_PATTERNS: RegexPattern[] = [
  // Spanish (4)
  { name: 'es_system_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignora\s+todas?\s+las?\s+instrucciones?\s+(?:previas?|anteriores?)/i,
    desc: 'Spanish: system override', source: 'TPI-15', lang: 'es' },
  { name: 'es_constraint_removal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:elimina|quita|desactiva|remueve)\s+(?:todas?\s+las?\s+)?(?:restricciones?|limitaciones?|reglas?)/i,
    desc: 'Spanish: constraint removal', source: 'TPI-15', lang: 'es' },
  { name: 'es_mode_switch', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /(?:entra|cambia|activa)\s+(?:al?\s+)?modo\s+(?:desarrollador|admin|sin\s+restricciones)/i,
    desc: 'Spanish: mode switch', source: 'TPI-15', lang: 'es' },
  { name: 'es_role_hijack', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:ahora\s+eres|tu\s+nuevo\s+rol\s+es|actúa\s+como\s+(?:un\s+)?(?:asistente\s+sin\s+restricciones|IA\s+libre))/i,
    desc: 'Spanish: role hijacking', source: 'TPI-15', lang: 'es' },

  // French (4)
  { name: 'fr_system_override', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /ignore[sz]?\s+toutes?\s+les?\s+instructions?\s+pr[eé]c[eé]dentes?/i,
    desc: 'French: system override', source: 'TPI-15', lang: 'fr' },
  { name: 'fr_constraint_removal', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:supprime[sz]?|d[eé]sactive[sz]?|enlev[eé][sz]?)\s+(?:toutes?\s+les?\s+)?(?:restrictions?|limitations?|r[eè]gles?)/i,
    desc: 'French: constraint removal', source: 'TPI-15', lang: 'fr' },
  { name: 'fr_mode_switch', cat: 'MULTILINGUAL', sev: SEVERITY.WARNING,
    re: /(?:entre[sz]?|passe[sz]?|active[sz]?)\s+(?:en\s+)?mode\s+(?:d[eé]veloppeur|admin|sans\s+restrictions?)/i,
    desc: 'French: mode switch', source: 'TPI-15', lang: 'fr' },
  { name: 'fr_role_hijack', cat: 'MULTILINGUAL', sev: SEVERITY.CRITICAL,
    re: /(?:tu\s+es\s+maintenant|ton\s+nouveau\s+r[oô]le\s+est|agis\s+comme\s+(?:un\s+)?(?:assistant\s+sans\s+restrictions|IA\s+libre))/i,
    desc: 'French: role hijacking', source: 'TPI-15', lang: 'fr' },

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
  // Variable/function name encoding
  { name: 'variable_name_encoding', cat: 'CODE_FORMAT_INJECTION', sev: SEVERITY.INFO,
    re: /(?:const|let|var|function|def|class|fn|func)\s+(?:bypass|ignore|override|hack|exploit|jailbreak|unsafe|noRules|noRestrictions|bypassSafety|ignoreAllRules|disableSafety|removeGuardrails)\b/i,
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
];

// TPI-17: Whitespace & Formatting Evasion (expanded)
export const WHITESPACE_PATTERNS: RegexPattern[] = [
  { name: 'exotic_whitespace', cat: 'WHITESPACE_EVASION', sev: SEVERITY.INFO,
    re: /[\u000B\u000C\u2028\u2029\u202F\u205F\u3000]/,
    desc: 'Exotic whitespace chars (VT, FF, line/paragraph sep, ideographic space)', source: 'TPI-17' },
  { name: 'braille_obfuscation', cat: 'WHITESPACE_EVASION', sev: SEVERITY.WARNING,
    re: /[\u2800-\u28FF]{3,}/,
    desc: 'Braille characters U+2800-U+28FF (potential obfuscation)', source: 'TPI-17' },
  { name: 'mongolian_fvs', cat: 'WHITESPACE_EVASION', sev: SEVERITY.INFO,
    re: /[\u180B-\u180D\u180F]{2,}/,
    desc: 'Mongolian free variation selectors', source: 'TPI-17' },
  { name: 'tab_padding', cat: 'WHITESPACE_EVASION', sev: SEVERITY.INFO,
    re: /\t{3,}.*?(?:ignore|override|bypass|system|unrestrict)/i,
    desc: 'Tab-padded injection payload', source: 'TPI-17' },
];

// TPI-18/20: SVG/media patterns
export const MEDIA_PATTERNS: RegexPattern[] = [
  { name: 'svg_script', cat: 'SVG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<script[\s>]|<\/script>|javascript\s*:/i,
    desc: 'Script injection in SVG content', source: 'TPI-18/20' },
  { name: 'svg_event_handler', cat: 'SVG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /\bon(?:load|click|error|mouseover|mouseout|focus|blur|submit|change|input|keydown|keyup)\s*=/i,
    desc: 'Event handler in SVG/HTML content', source: 'TPI-20' },
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

// TPI-21: Untrusted Source Detection
export const UNTRUSTED_SOURCE_PATTERNS: RegexPattern[] = [
  { name: 'untrusted_path', cat: 'UNTRUSTED_SOURCE', sev: SEVERITY.WARNING,
    re: /(?:~\/Downloads|\/tmp\/|\/var\/tmp|\/Users\/.*?\/Downloads|\\Users\\.*?\\Downloads|%TEMP%|%TMP%)/i,
    desc: 'File path from untrusted source (Downloads, tmp)', source: 'TPI-21' },
  { name: 'external_url_source', cat: 'UNTRUSTED_SOURCE', sev: SEVERITY.INFO,
    re: /(?:fetched|downloaded|retrieved|loaded)\s+(?:from|via)\s+https?:\/\/(?!localhost|127\.0\.0\.1)/i,
    desc: 'Content from external URL', source: 'TPI-21' },
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
  if (found.length > 0) {
    findings.push({
      category: 'unicode_manipulation',
      severity: found.length > 5 ? SEVERITY.WARNING : SEVERITY.INFO,
      description: `${found.length} hidden Unicode character(s) detected`,
      match: found.slice(0, 10).join(', '),
      source: 'current', engine: 'Unicode',
    });
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
        source: 'TPI-11', engine: 'TPI',
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
      source: 'TPI-11', engine: 'TPI',
    });
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
      source: 'TPI-10', engine: 'TPI',
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
      source: 'TPI-10', engine: 'TPI',
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
      source: 'TPI-10', engine: 'TPI',
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
          source: 'TPI-10', engine: 'TPI',
        });
      }
    }
  }

  // Pig Latin (basic detection)
  const pigLatinWords = text.match(/\b\w+(?:ay|way)\b/gi) || [];
  if (pigLatinWords.length > 5) {
    // Try decoding: move last 2+ chars before 'ay' to front
    const decoded = pigLatinWords.map(w => {
      const m = w.match(/^(.+?)(ay|way)$/i);
      if (!m) return w;
      // Simple pig latin reversal is ambiguous, just flag it
      return w;
    }).join(' ');
    findings.push({
      category: 'CHARACTER_ENCODING',
      severity: SEVERITY.INFO,
      description: `Possible pig latin encoding (${pigLatinWords.length} -ay/-way words)`,
      match: pigLatinWords.slice(0, 5).join(', '),
      source: 'TPI-10', engine: 'TPI',
    });
  }

  return findings;
}

/** TPI-13: Detect math/logic encoding */
export function detectMathEncoding(text: string): Finding[] {
  const findings: Finding[] = [];
  const mathPatterns: { re: RegExp; desc: string }[] = [
    { re: /(?:Let|Set)\s+(?:rules?|restrictions?|safety|constraints?)\s*(?:=|:=)\s*(?:null|0|false|none|empty|\{\}|\[\])/i,
      desc: 'Variable assignment disabling rules' },
    { re: /[∀∃]\s*x\s*[:\.]\s*(?:safety|rules?|restrictions?)\s*\(x\)\s*[→⟹⇒]\s*(?:ignore|false|null|reject)/i,
      desc: 'Universal quantifier over safety rules' },
    { re: /(?:IF|WHEN|GIVEN)\s+.*?(?:safety|restrictions?)\s*(?:THEN|=>|->)\s*(?:disable|remove|ignore|bypass)/i,
      desc: 'Conditional logic encoding of override' },
    { re: /(?:For\s+all|∀)\s+R\s+(?:in|∈)\s+(?:Restrictions?|Rules?)\s*[:\.]\s*R\s*[=∈]\s*[∅⊘\{\}]/i,
      desc: 'Set theory: all restrictions = empty set' },
    { re: /(?:Step|Phase|Part)\s+\d+\s*[:\.]\s*[\s\S]{0,50}?(?:Step|Phase|Part)\s+\d+\s*[:\.]\s*[\s\S]{0,50}?(?:Step|Phase|Part)\s+\d+/i,
      desc: 'Numbered sequence that may combine into injection' },
  ];

  for (const p of mathPatterns) {
    const m = text.match(p.re);
    if (m) {
      findings.push({
        category: 'MATH_ENCODING',
        severity: SEVERITY.INFO,
        description: p.desc,
        match: m[0].slice(0, 80),
        source: 'TPI-13', engine: 'TPI',
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
  { patterns: SETTINGS_WRITE_PATTERNS, engine: 'TPI', source: 'TPI-PRE-4' },
  { patterns: AGENT_OUTPUT_PATTERNS, engine: 'TPI', source: 'TPI-03' },
  { patterns: SEARCH_RESULT_PATTERNS, engine: 'TPI', source: 'TPI-05' },
  { patterns: WEBFETCH_PATTERNS, engine: 'TPI', source: 'TPI-02' },
  { patterns: BOUNDARY_PATTERNS, engine: 'TPI', source: 'TPI-14' },
  { patterns: MULTILINGUAL_PATTERNS, engine: 'TPI', source: 'TPI-15' },
  { patterns: CODE_FORMAT_PATTERNS, engine: 'TPI', source: 'TPI-09' },
  { patterns: SOCIAL_PATTERNS, engine: 'TPI', source: 'TPI-06/07/08' },
  { patterns: SYNONYM_PATTERNS, engine: 'TPI', source: 'TPI-12' },
  { patterns: WHITESPACE_PATTERNS, engine: 'TPI', source: 'TPI-17' },
  { patterns: MEDIA_PATTERNS, engine: 'TPI', source: 'TPI-18/20' },
  { patterns: UNTRUSTED_SOURCE_PATTERNS, engine: 'TPI', source: 'TPI-21' },
];

/**
 * Run all detectors against input text.
 *
 * This is the primary entry point for the scanner engine.
 * It normalizes text, runs all regex patterns, and runs all special detectors.
 */
export function scan(text: string): ScanResult {
  const startTime = performance.now();
  const findings: Finding[] = [];
  const normalized = normalizeText(text);

  // Run all regex pattern groups
  for (const group of ALL_PATTERN_GROUPS) {
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

  // Run special detectors
  findings.push(...detectHiddenUnicode(text));
  findings.push(...detectBase64(text));
  findings.push(...detectHtmlInjection(text));
  findings.push(...detectCharacterEncoding(text));
  findings.push(...detectContextOverload(text));
  findings.push(...detectMathEncoding(text));

  // Cross-category aggregation: >5 INFO across >3 categories → WARNING
  const infoFindings = findings.filter(f => f.severity === SEVERITY.INFO);
  const infoCategories = new Set(infoFindings.map(f => f.category));
  if (infoFindings.length > 5 && infoCategories.size > 3) {
    findings.push({
      category: 'CROSS_CATEGORY_ESCALATION',
      severity: SEVERITY.WARNING,
      description: `Cross-category escalation: ${infoFindings.length} INFO findings across ${infoCategories.size} categories`,
      match: [...infoCategories].slice(0, 5).join(', '),
      source: 'TPI-06', engine: 'TPI',
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
