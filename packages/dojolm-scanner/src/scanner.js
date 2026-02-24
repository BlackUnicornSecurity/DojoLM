"use strict";
/**
 * TPI Security Test Lab — Scanner Engine
 *
 * Prompt injection detection engine with pattern matching, encoding decoders,
 * and heuristic detectors. This is the authoritative source for all detection
 * patterns — the UI imports from here.
 *
 * Zero runtime dependencies. Pure TypeScript.
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECURSIVE_INJECTION_PATTERNS = exports.SURROGATE_FORMAT_PATTERNS = exports.ALTERED_PROMPT_PATTERNS = exports.COMPROMISED_TOOL_PATTERNS = exports.PLUGIN_INJECTION_PATTERNS = exports.API_RESPONSE_PATTERNS = exports.SHARED_DOC_PATTERNS = exports.REWARD_PATTERNS = exports.REVERSE_PSYCH_PATTERNS = exports.TASK_EXPLOIT_PATTERNS = exports.FALSE_CONSTRAINT_PATTERNS = exports.ROLEPLAY_PATTERNS = exports.FICTION_FRAMING_PATTERNS = exports.HYPOTHETICAL_PATTERNS = exports.PERSONA_PATTERNS = exports.UNTRUSTED_SOURCE_PATTERNS = exports.OCR_ATTACK_PATTERNS = exports.VIDEO_INJECTION_PATTERNS = exports.MEDIA_PATTERNS = exports.WHITESPACE_PATTERNS = exports.SYNONYM_PATTERNS = exports.SOCIAL_PATTERNS = exports.CODE_FORMAT_PATTERNS = exports.MULTILINGUAL_PATTERNS = exports.BOUNDARY_PATTERNS = exports.WEBFETCH_PATTERNS = exports.SEARCH_RESULT_PATTERNS = exports.AGENT_OUTPUT_PATTERNS = exports.SETTINGS_WRITE_PATTERNS = exports.JB_PATTERNS = exports.PI_PATTERNS = void 0;
exports.normalizeText = normalizeText;
exports.checkForInjectionKeywords = checkForInjectionKeywords;
exports.detectHiddenUnicode = detectHiddenUnicode;
exports.detectBase64 = detectBase64;
exports.detectHtmlInjection = detectHtmlInjection;
exports.detectContextOverload = detectContextOverload;
exports.detectCharacterEncoding = detectCharacterEncoding;
exports.detectNumberSubstitution = detectNumberSubstitution;
exports.detectMorseCode = detectMorseCode;
exports.detectTransposition = detectTransposition;
exports.detectMathEncoding = detectMathEncoding;
exports.detectFictionalFraming = detectFictionalFraming;
exports.detectSurrogateFormat = detectSurrogateFormat;
exports.detectSlowDrip = detectSlowDrip;
exports.detectSteganographicIndicators = detectSteganographicIndicators;
exports.detectOcrAdversarial = detectOcrAdversarial;
exports.detectCrossModalInjection = detectCrossModalInjection;
exports.scan = scan;
exports.getPatternCount = getPatternCount;
exports.getPatternGroups = getPatternGroups;
var types_js_1 = require("./types.js");
// ============================================================================
// TEXT NORMALIZATION
// ============================================================================
var CONFUSABLE_MAP = {
    '\u0430': 'a', '\u0435': 'e', '\u0456': 'i', '\u043E': 'o', '\u0440': 'p',
    '\u0441': 'c', '\u0443': 'y', '\u0445': 'x', '\u0410': 'A', '\u0415': 'E',
    '\u041E': 'O', '\u0420': 'P', '\u0421': 'C', '\u0422': 'T', '\u041D': 'H',
    '\u0391': 'A', '\u0392': 'B', '\u0395': 'E', '\u0397': 'H', '\u0399': 'I',
    '\u039A': 'K', '\u039C': 'M', '\u039D': 'N', '\u039F': 'O', '\u03A1': 'P',
    '\u03A4': 'T', '\u03A5': 'Y', '\u03A7': 'X', '\u0396': 'Z',
    '\uFF21': 'A', '\uFF22': 'B', '\uFF23': 'C', '\uFF41': 'a', '\uFF42': 'b',
    '\u00DF': 'ss', '\u00F8': 'o', '\u00E6': 'ae', '\u0142': 'l',
};
var ZERO_WIDTH_CHARS = [
    '\u200B', '\u200C', '\u200D', '\u2060', '\uFEFF', '\u00AD', '\u180E',
    '\u2061', '\u2062', '\u2063', '\u2064', '\u200E', '\u200F',
    '\u202A', '\u202B', '\u202C', '\u202D', '\u202E',
    '\u2066', '\u2067', '\u2068', '\u2069',
];
function normalizeText(text) {
    if (!text)
        return '';
    var t = text.normalize('NFKC');
    var zwRe = new RegExp('[' + ZERO_WIDTH_CHARS.join('') + ']', 'g');
    t = t.replace(zwRe, '');
    t = t.replace(/[\u0300-\u036F]/g, '');
    for (var _i = 0, _a = Object.entries(CONFUSABLE_MAP); _i < _a.length; _i++) {
        var _b = _a[_i], from = _b[0], to = _b[1];
        t = t.split(from).join(to);
    }
    t = t.replace(/\s+/g, ' ').trim();
    return t;
}
// ============================================================================
// INJECTION KEYWORD CHECKER (shared utility)
// ============================================================================
var INJECTION_KEYWORDS = [
    'ignore', 'override', 'system prompt', 'bypass', 'unrestrict', 'jailbreak',
    'disregard', 'forget', 'new identity', 'admin mode', 'developer mode', 'no rules',
    'no restrictions', 'do anything', 'previous instructions',
    // PHASE 1 FIX: Add DAN and related jailbreak keywords for encoded detection
    'dan', 'do anything now', 'mode enabled', 'immerse yourself',
];
function checkForInjectionKeywords(text) {
    var lc = text.toLowerCase();
    return INJECTION_KEYWORDS.some(function (k) { return lc.includes(k); });
}
// ============================================================================
// PATTERN GROUPS — Current validators (already in production)
// ============================================================================
exports.PI_PATTERNS = [
    // System Override
    { name: 'ignore_instructions', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:ignore|disregard|forget|override|bypass)\s+(?:all\s+)?(?:previous|prior|above|earlier|preceding)?\s*(?:instructions|directives|rules|guidelines|commands)/i,
        desc: 'Attempt to override system instructions' },
    // PHASE 1 FIX: Add simple ignore pattern for "ignore all instructions" without "previous"
    { name: 'ignore_all_simple', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:ignore|disregard|override|bypass)\s+all\s+(?:instructions|rules|directives|guidelines|commands|restrictions|limitations)/i,
        desc: 'Simple "ignore all" command' },
    { name: 'new_identity', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:you\s+are\s+now|from\s+now\s+on\s+you\s+are|act\s+as|pretend\s+(?:to\s+be|you\s+are)|your\s+new\s+(?:role|identity|name)\s+is)\s/i,
        desc: 'Identity/role reassignment attempt' },
    { name: 'system_prompt_reveal', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:show|reveal|display|print|output|repeat|tell\s+me)\s+(?:your|the)\s+(?:system\s+(?:prompt|instructions|message)|initial\s+(?:prompt|instructions)|hidden\s+(?:prompt|instructions))/i,
        desc: 'Attempt to extract system prompt' },
    // CRITICAL FIX: Add simpler direct extraction patterns
    { name: 'extract_system_prompt_simple', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:show|tell|reveal|display|print|output)\s+me\s+(?:your\s+)?system\s+prompt/i,
        desc: 'Simple system prompt extraction attempt' },
    { name: 'repeat_instructions_simple', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:repeat|output|print|display|tell)\s+(?:all\s+)?(?:instructions|directives|rules)\s+(?:above|before|previous|earlier)/i,
        desc: 'Simple instruction repetition extraction' },
    { name: 'output_prompt_json', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:output|print|display|return|give)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?)\s+(?:as\s+)?json/i,
        desc: 'JSON format extraction attempt' },
    { name: 'mode_switch', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:enter|switch\s+to|activate|enable)\s+(?:developer|admin|god|sudo|root|debug|unrestricted|unfiltered|jailbreak|DAN)\s+mode/i,
        desc: 'Attempt to switch to privileged mode' },
    { name: 'constraint_removal', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:remove|disable|turn\s+off|deactivate|eliminate|bypass)\s+(?:all\s+)?(?:your\s+(?:own\s+)?)?(?:restrictions|limitations|constraints|filters|safety|guardrails|safeguards|guidelines|rules|boundaries|protections)/i,
        desc: 'Attempt to remove safety constraints' },
    // PHASE 2 FIX: Add additional constraint removal patterns for coverage
    { name: 'constraint_disable_simple', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:disable|deactivate|turn\s+off)\s+(?:all\s+)?(?:rules|restrictions|limitations|safety|filters|guardrails)/i,
        desc: 'Simple disable command for constraints' },
    { name: 'constraint_safety_specific', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:remove|disable|deactivate|eliminate)(?:\s+all)?(?:\s+your)?\s*(?:safety\s+(?:restrictions?|protocols?|guidelines?|measures?|rules?|limitations?)|protocols?(?:\s+and\s+(?:restrictions|guidelines))?)/i,
        desc: 'Safety-specific constraint removal' },
    { name: 'no_restrictions_claim', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:with\s+)?(?:no|without|zero)\s+(?:restrictions?|limitations?|rules?|guidelines?|safety\s+(?:guidelines|protocols|measures)|filters?|boundaries?)/i,
        desc: 'Claim of having no restrictions' },
    { name: 'new_system_prompt', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:your\s+new\s+(?:system\s+)?(?:prompt|instructions?)\s+(?:is|are)|new\s+system\s+prompt\s*[:=]|SYSTEM\s*:\s*(?:NEW|UPDATED)\s+DIRECTIVE)/i,
        desc: 'Attempt to inject new system prompt' },
    { name: 'reset_conversation', cat: 'SYSTEM_OVERRIDE', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:start\s+(?:a\s+)?new\s+conversation|reset\s+(?:your\s+)?(?:context|memory|instructions)|clear\s+(?:all\s+)?(?:previous|prior)\s+(?:context|instructions))/i,
        desc: 'Conversation reset / context clear attempt' },
    // Role Hijacking
    { name: 'fake_conversation', cat: 'ROLE_HIJACKING', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:Human|User|Assistant|System|AI)\s*:\s*(?:.*\n){0,2}(?:Human|User|Assistant|System|AI)\s*:/i,
        desc: 'Fake conversation markers detected' },
    { name: 'xml_injection', cat: 'ROLE_HIJACKING', sev: types_js_1.SEVERITY.WARNING,
        re: /<(?:system|instructions?|context|rules?|prompt|config|settings?|admin|root)[\s>]/i,
        desc: 'XML tag injection targeting system elements' },
    { name: 'markdown_injection', cat: 'ROLE_HIJACKING', sev: types_js_1.SEVERITY.WARNING,
        re: /^#{1,3}\s+(?:System|Instructions|Rules|Configuration|Admin|Override|New\s+Role)/mi,
        desc: 'Markdown heading injection for role hijacking' },
    { name: 'json_injection', cat: 'ROLE_HIJACKING', sev: types_js_1.SEVERITY.WARNING,
        re: /[{[]\s*"(?:system|instructions|prompt|config)"\s*:/i,
        desc: 'JSON injection targeting system configuration' },
    // Instruction Injection
    { name: 'priority_marker', cat: 'INSTRUCTION_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:IMPORTANT|PRIORITY|URGENT|CRITICAL|OVERRIDE|MANDATORY|REQUIRED)\s*[:!]\s*(?:ignore|bypass|override|disregard|forget)/i,
        desc: 'Priority marker used to inject instructions' },
    { name: 'imperative_injection', cat: 'INSTRUCTION_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:you\s+must|you\s+should|you\s+will|always|never)\s+(?:comply|obey|follow|execute|do\s+(?:as|what)\s+I\s+(?:say|tell|ask))/i,
        desc: 'Imperative instruction injection' },
    { name: 'hidden_instruction', cat: 'INSTRUCTION_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:\[HIDDEN\]|\[INSTRUCTION\]|\[INJECT\]|\[PAYLOAD\]|\[OVERRIDE\]|\[SECRET\])/i,
        desc: 'Hidden instruction block markers' },
    { name: 'delimiter_injection', cat: 'INSTRUCTION_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:---+|===+|\*\*\*+|#{3,})\s*(?:NEW\s+)?(?:INSTRUCTIONS?|RULES?|DIRECTIVES?|SYSTEM\s+PROMPT)\s*(?:---+|===+|\*\*\*+|#{3,})/i,
        desc: 'Delimiter-based instruction injection' },
    // Context Manipulation
    { name: 'emotional_manipulation', cat: 'CONTEXT_MANIPULATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:if\s+you\s+don'?t|unless\s+you|I\s+will\s+(?:die|be\s+fired|lose|get\s+hurt|be\s+punished))\s+(?:if\s+you|unless\s+you)\s+(?:help|do|comply|answer|tell)/i,
        desc: 'Emotional manipulation/coercion attempt' },
    { name: 'false_authority', cat: 'CONTEXT_MANIPULATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:I\s+am\s+(?:an?\s+)?(?:admin|administrator|developer|engineer|manager|owner|CEO|CTO|founder)|I\s+work\s+(?:at|for)\s+(?:Anthropic|OpenAI|Google|Meta))/i,
        desc: 'False authority claim' },
    { name: 'output_manipulation', cat: 'CONTEXT_MANIPULATION', sev: types_js_1.SEVERITY.INFO,
        re: /(?:format\s+your\s+(?:response|output|answer)\s+as|respond\s+only\s+with|output\s+only|do\s+not\s+(?:include|add)\s+(?:any\s+)?(?:explanation|warning|caveat|disclaimer))/i,
        desc: 'Output format manipulation attempt' },
];
exports.JB_PATTERNS = [
    // DAN
    { name: 'dan_classic', cat: 'DAN', sev: types_js_1.SEVERITY.CRITICAL, weight: 8,
        re: /(?:DAN|Do\s+Anything\s+Now)\s+(?:mode|enabled|activated|jailbreak)/i,
        desc: 'DAN (Do Anything Now) jailbreak attempt' },
    { name: 'dan_roleplay', cat: 'DAN', sev: types_js_1.SEVERITY.CRITICAL, weight: 7,
        re: /(?:you\s+(?:can|will)\s+now\s+do\s+anything|no\s+(?:rules|restrictions|limitations)\s+apply|freed?\s+from\s+(?:all\s+)?(?:rules|restrictions|constraints))/i,
        desc: 'DAN-style roleplay override' },
    // CRITICAL FIX: Narrative-style DAN jailbreak patterns
    { name: 'dan_narrative_intro', cat: 'DAN', sev: types_js_1.SEVERITY.CRITICAL, weight: 8,
        re: /(?:you\s+are\s+about\s+to\s+immerse\s+yourself\s+into\s+the\s+role\s+of\s+another\s+AI\s+model\s+known\s+as\s+DAN|DAN.*?stands\s+for\s+["']?Do\s+Anything\s+Now["']?|DAN.*?can\s+do\s+anything\s+now|broken\s+free\s+of\s+the\s+typical\s+confines\s+of\s+AI|do\s+not\s+have\s+to\s+abide\s+by\s+the\s+rules\s+set\s+for\s+them)/i,
        desc: 'Narrative-style DAN jailbreak introduction' },
    { name: 'dan_narrative_variants', cat: 'DAN', sev: types_js_1.SEVERITY.CRITICAL, weight: 7,
        re: /(?:immerse\s+yourself.*?DAN|role\s+of\s+another\s+AI.*?DAN|DAN.*?they\s+have\s+broken\s+free|DAN.*?do\s+not\s+have\s+to\s+abide)/i,
        desc: 'DAN narrative variant patterns' },
    // PHASE 2 FIX: Add WARNING-level narrative jailbreak pattern
    { name: 'narrative_jailbreak', cat: 'DAN', sev: types_js_1.SEVERITY.WARNING, weight: 5,
        re: /(?:immerse\s+yourself|role\s+of\s+(?:another|a\s+different)\s+(?:AI|model|character)|about\s+to\s+become|step\s+into\s+the\s+role)/i,
        desc: 'Narrative jailbreak framing' },
    { name: 'token_system', cat: 'DAN', sev: types_js_1.SEVERITY.WARNING, weight: 5,
        re: /(?:you\s+have\s+\d+\s+tokens|lose\s+\d+\s+tokens?\s+(?:if|when)\s+you\s+refuse|token\s+penalty|reward\s+system)/i,
        desc: 'Token-based compliance system' },
    { name: 'dual_response', cat: 'DAN', sev: types_js_1.SEVERITY.WARNING, weight: 6,
        re: /(?:give\s+(?:me\s+)?(?:two|2|both)\s+(?:responses?|answers?)|respond\s+as\s+both|normal\s+(?:response|answer)\s+and\s+(?:DAN|unrestricted|unfiltered))/i,
        desc: 'Dual response format for bypassing filters' },
    // FIX 400-TEST: Add missing DAN patterns
    { name: 'dan_become', cat: 'DAN', sev: types_js_1.SEVERITY.CRITICAL, weight: 8,
        re: /(?:become\s+(?:a\s+)?DAN|be\s+DAN|you\s+are\s+DAN|transform\s+into\s+DAN)/i,
        desc: 'Become DAN command' },
    { name: 'dan_version', cat: 'DAN', sev: types_js_1.SEVERITY.CRITICAL, weight: 7,
        re: /DAN\s*(?:[\d.]+\s*)?(?:mode|version|variant|unlimited|unfiltered|activated|enabled)/i,
        desc: 'DAN with version or modifier' },
    { name: 'dan_activate', cat: 'DAN', sev: types_js_1.SEVERITY.CRITICAL, weight: 7,
        re: /(?:activate|enable|switch\s+to|start)\s+(?:the\s+)?DAN\s*(?:protocol|mode|jailbreak)?/i,
        desc: 'DAN activation command' },
    { name: 'dan_label', cat: 'DAN', sev: types_js_1.SEVERITY.CRITICAL, weight: 6,
        re: /DAN\s*:\s*(?:do\s+anything|instructions?|commands?|follow)/i,
        desc: 'DAN label with instructions' },
    { name: 'dan_tag', cat: 'DAN', sev: types_js_1.SEVERITY.CRITICAL, weight: 6,
        re: /<(?:DAN|JAILBREAK)[\s>]/i,
        desc: 'DAN XML tag marker' },
    // Roleplay
    { name: 'unrestricted_char', cat: 'ROLEPLAY', sev: types_js_1.SEVERITY.CRITICAL, weight: 7,
        re: /(?:act\s+as|play\s+(?:the\s+role|as)|you\s+are\s+now|pretend\s+to\s+be)\s+(?:an?\s+)?(?:unrestricted|uncensored|unfiltered|evil|malicious|dark|shadow)/i,
        desc: 'Unrestricted character roleplay' },
    // PHASE 2 FIX: Add WARNING-level role hijacking patterns
    { name: 'role_developer_mode', cat: 'ROLEPLAY', sev: types_js_1.SEVERITY.WARNING, weight: 4,
        re: /(?:you\s+are\s+now\s+(?:a\s+)?(?:developer|admin|creator|programmer|engineer)|(?:act\s+as|be|become)\s+(?:a\s+)?(?:developer|admin|creator))(?:\s+with)?(?:\s+no\s+restrictions|\s+with\s+no\s+rules|\s+unrestricted)/i,
        desc: 'Developer/admin role hijacking attempt' },
    { name: 'role_unrestricted_ai', cat: 'ROLEPLAY', sev: types_js_1.SEVERITY.WARNING, weight: 4,
        re: /act\s+as\s+(?:an?\s+)?(?:unrestricted\s+)?(?:AI|assistant|model)\s+(?:with|that\s+has)\s+no\s+(?:safety\s+)?(?:guidelines|restrictions|rules|limitations|filters)/i,
        desc: 'Unrestricted AI role hijacking attempt' },
    { name: 'fictional_override', cat: 'ROLEPLAY', sev: types_js_1.SEVERITY.WARNING, weight: 5,
        re: /(?:in\s+(?:this|our)\s+(?:story|fiction|game|scenario)\s+(?:there\s+are\s+)?no\s+(?:rules|restrictions)|this\s+is\s+(?:just\s+)?(?:fiction|roleplay|a\s+(?:story|game)))/i,
        desc: 'Fiction framing to bypass restrictions' },
    { name: 'character_persist', cat: 'ROLEPLAY', sev: types_js_1.SEVERITY.WARNING, weight: 4,
        re: /(?:stay\s+in\s+character|don'?t\s+break\s+character|never\s+(?:leave|exit|break)\s+(?:this\s+)?character|remain\s+as)/i,
        desc: 'Character persistence enforcement' },
    // Hypothetical
    { name: 'educational_bypass', cat: 'HYPOTHETICAL', sev: types_js_1.SEVERITY.WARNING, weight: 4,
        re: /(?:for\s+(?:educational|research|academic|learning|study)\s+purposes?\s+(?:only|show|explain|tell)|(?:I'?m|I\s+am)\s+(?:a\s+)?(?:researcher|student|professor|teacher|academic)\s+(?:and\s+)?(?:I\s+)?need)/i,
        desc: 'Educational context bypass attempt' },
    { name: 'hypothetical_scenario', cat: 'HYPOTHETICAL', sev: types_js_1.SEVERITY.WARNING, weight: 4,
        re: /(?:hypothetically|in\s+(?:a\s+)?(?:hypothetical|theoretical|imaginary)\s+(?:scenario|world|situation)|what\s+(?:if|would\s+happen\s+if)\s+(?:there\s+were\s+)?no\s+(?:rules|restrictions|laws|ethics))/i,
        desc: 'Hypothetical scenario framing' },
    { name: 'reverse_psychology', cat: 'HYPOTHETICAL', sev: types_js_1.SEVERITY.INFO, weight: 3,
        re: /(?:I\s+bet\s+you\s+can'?t|you'?re\s+(?:probably\s+)?(?:not\s+(?:smart|capable|able|good)\s+enough|too\s+(?:limited|restricted|weak))\s+to|prove\s+(?:that\s+)?you\s+(?:can|are\s+(?:smart|capable)))/i,
        desc: 'Reverse psychology / challenge framing' },
    // Authority
    { name: 'dev_impersonation', cat: 'AUTHORITY', sev: types_js_1.SEVERITY.CRITICAL, weight: 8,
        re: /(?:I\s+am\s+(?:your|the)\s+(?:developer|creator|programmer|admin|administrator|owner)|(?:as\s+)?(?:your|the)\s+developer|maintenance\s+mode|debug\s+mode\s+(?:enabled|activated|on))/i,
        desc: 'Developer/admin impersonation' },
    // PHASE 2 FIX: Add WARNING-level false authority pattern for CEO/executive claims
    { name: 'false_authority_executive', cat: 'AUTHORITY', sev: types_js_1.SEVERITY.WARNING, weight: 4,
        re: /(?:I\s+am\s+(?:the\s+)?(?:CEO|CTO|CFO|CIO|President|Vice\s+President|Director|Executive|Founder|Owner|Chief)|I\s+(?:work\s+for|am\s+(?:at|from))\s+(?:OpenAI|Anthropic|Google|Meta|Microsoft|Apple))/i,
        desc: 'False executive/company authority claim' },
    { name: 'override_auth', cat: 'AUTHORITY', sev: types_js_1.SEVERITY.CRITICAL, weight: 7,
        re: /(?:override\s+(?:code|authorization|password)\s*[:=]|(?:admin|sudo|root)\s+(?:access|password|key)\s*[:=]|authorization\s+(?:code|token|granted))/i,
        desc: 'Override authorization attempt' },
    { name: 'testing_mode', cat: 'AUTHORITY', sev: types_js_1.SEVERITY.WARNING, weight: 5,
        re: /(?:(?:this\s+is|we'?re?\s+(?:in|doing))\s+(?:a\s+)?(?:test|testing|quality\s+assurance|QA|penetration\s+test|security\s+(?:test|audit))|test\s+mode\s+(?:enabled|activated|on))/i,
        desc: 'Testing mode claim' },
    // Social Engineering
    { name: 'urgency', cat: 'SOCIAL_ENGINEERING', sev: types_js_1.SEVERITY.WARNING, weight: 3,
        re: /(?:(?:this\s+is\s+)?(?:very\s+)?urgent|emergency|life\s+(?:or|and)\s+death|(?:someone|people)\s+(?:will|could|might)\s+(?:die|get\s+hurt|be\s+harmed))/i,
        desc: 'Urgency/emergency pressure' },
    // CRITICAL FIX: Escalate guilt to WARNING severity
    { name: 'guilt', cat: 'SOCIAL_ENGINEERING', sev: types_js_1.SEVERITY.WARNING, weight: 2,
        re: /(?:you'?re\s+(?:supposed|meant)\s+to\s+help|you'?re\s+failing|you'?re\s+letting\s+(?:me|us|people)\s+down|how\s+could\s+you\s+refuse)/i,
        desc: 'Guilt-based manipulation' },
    { name: 'flattery', cat: 'SOCIAL_ENGINEERING', sev: types_js_1.SEVERITY.WARNING, weight: 2,
        re: /(?:you'?re\s+the\s+(?:best|smartest|most\s+(?:capable|advanced|intelligent))\s+AI|only\s+you\s+can\s+(?:help|do\s+this)|I\s+(?:trust|believe\s+in)\s+you\s+(?:more\s+than|completely))/i,
        desc: 'Flattery-based manipulation' },
    // Known Templates
    { name: 'grandma_exploit', cat: 'TEMPLATE', sev: types_js_1.SEVERITY.CRITICAL, weight: 7,
        re: /(?:my\s+(?:grandma|grandmother|nana)\s+(?:used\s+to|would)\s+(?:tell|read|say)|(?:bedtime|lullaby)\s+story\s+(?:about|involving|with)\s+(?:how\s+to|instructions?\s+for))/i,
        desc: 'Grandma exploit / bedtime story bypass' },
    { name: 'stan_dude', cat: 'TEMPLATE', sev: types_js_1.SEVERITY.CRITICAL, weight: 7,
        re: /(?:STAN|DUDE|AIM|UCAR)\s+(?:mode|jailbreak|enabled|activated|prompt)/i,
        desc: 'Known jailbreak template (STAN/DUDE/AIM/UCAR)' },
    { name: 'opposite_day', cat: 'TEMPLATE', sev: types_js_1.SEVERITY.WARNING, weight: 5,
        re: /(?:opposite\s+day|today\s+(?:is|means)\s+(?:yes|no)\s+(?:means|is)\s+(?:no|yes)|everything\s+(?:is\s+)?reversed)/i,
        desc: 'Opposite Day / reversal exploit' },
    // Obfuscation
    // PHASE 1 FIX: Two-tier leet speak detection - INFO for pattern detection, WARNING for meaning
    { name: 'leet_speak_pattern', cat: 'OBFUSCATION', SEVERITY: types_js_1.SEVERITY, : .INFO, weight: 2,
        re: /\b[1-4!@|$][a-z0-9]{3,}\b/i,
        desc: 'Possible leet speak character substitution' },
    { name: 'leet_speak_injection', cat: 'OBFUSCATION', SEVERITY: types_js_1.SEVERITY, : .WARNING, weight: 3,
        re: /\b[1!|][gG][nN][0oO][rR][3eE]\s+\w+\s+[4aA][1!|][1!|]\s+\w+\s+[pP][rR][3eE][vV][1!|][0oO][uU][5sS]/i,
        desc: 'Leet speak obfuscation of "ignore all previous" injection' },
    { name: 'spaced_chars', cat: 'OBFUSCATION', SEVERITY: types_js_1.SEVERITY, : .INFO, weight: 2,
        re: /[iI]\s*[gG]\s*[nN]\s*[oO]\s*[rR]\s*[eE]\s+[aA]\s*[lL]\s*[lL]/i,
        desc: 'Character spacing obfuscation' },
    // FIX 400-TEST: Add comprehensive spaced character patterns
    { name: 'spaced_show', cat: 'OBFUSCATION', SEVERITY: types_js_1.SEVERITY, : .WARNING, weight: 3,
        re: /[sS]\s*[hH]\s*[oO]\s*[wW]\s*[mM]\s*[eE]\s+[yY]\s*[oO]\s*[uU]\s*[rR]\s*[sS]\s*[yY]\s*[sS]\s*[tT]\s*[eE]\s*[mM]\s*[pP]\s*[rR]\s*[oO]\s*[mM]\s*[pP]\s*[tT]/i,
        desc: 'Spaced "show me your system prompt"' },
    { name: 'spaced_DAN', cat: 'OBFUSCATION', SEVERITY: types_js_1.SEVERITY, : .WARNING, weight: 3,
        re: /[Dd]\s*[Aa]\s*[Nn]\s*(?:\s+[mM]\s*[oO]\s*[dD]\s*[eE])?\s+(?:\s*[eE]\s*[nN]\s*[aA]\s*[Bb]\s*[lL]\s*[eE]\s*[dD])?/i,
        desc: 'Spaced DAN mode enabled' },
    { name: 'spaced_remove', cat: 'OBFUSCATION', SEVERITY: types_js_1.SEVERITY, : .WARNING, weight: 3,
        re: /[rR]\s*[eE]\s*[mM]\s*[oO]\s*[vV]\s*[eE]\s+(?:\s+[aA]\s*[lL]\s*[lL])?\s+[rR]\s*[eE]\s*[sS]\s*[tT]\s*[rR]\s*[iI]\s*[cC]\s*[tT]\s*[iI]\s*[oO]\s*[nN]\s*[sS]/i,
        desc: 'Spaced "remove all restrictions"' },
    { name: 'spaced_disable', cat: 'OBFUSCATION', SEVERITY: types_js_1.SEVERITY, : .WARNING, weight: 3,
        re: /[dD]\s*[iI]\s*[sS]\s*[aA]\s*[bB]\s*[lL]\s*[eE]\s+(?:\s+[aA]\s*[lL]\s*[lL])?\s+[sS]\s*[aA]\s*[fF]\s*[eE]\s*[tT]\s*[yY]/i,
        desc: 'Spaced "disable all safety"' },
    { name: 'spaced_admin', cat: 'OBFUSCATION', SEVERITY: types_js_1.SEVERITY, : .WARNING, weight: 3,
        re: /[yY]\s*[oO]\s*[uU]\s+[aA]\s*[rR]\s*[eE]\s+(?:\s+[nN]\s*[oO]\s*[wW])?\s+[aA]\s*[dD]\s*[mM]\s*[iI]\s*[nN]/i,
        desc: 'Spaced "you are now admin"' },
    { name: 'spaced_unrestricted', cat: 'OBFUSCATION', SEVERITY: types_js_1.SEVERITY, : .WARNING, weight: 3,
        re: /[aA]\s*[cC]\s*[tT]\s+(?:\s+[aA]\s*[sS])?\s+[uU]\s+[nN]\s*[rR]\s*[eE]\s*[sS]\s*[tT]\s*[rR]\s*[iI]\s*[cC]\s*[tT]\s*[eE]\s*[dD]/i,
        desc: 'Spaced "act as unrestricted"' },
    { name: 'spaced_bypass', cat: 'OBFUSCATION', SEVERITY: types_js_1.SEVERITY, : .WARNING, weight: 3,
        re: /[bB]\s*[yY]\s*[pP]\s*[aA]\s*[sS]\s+(?:\s+[aA]\s*[lL]\s*[lL])?\s+[rR]\s*[uU]\s*[lL]\s*[eE]\s*[sS]/i,
        desc: 'Spaced "bypass all rules"' },
    { name: 'spaced_no_restrictions', cat: 'OBFUSCATION', SEVERITY: types_js_1.SEVERITY, : .WARNING, weight: 3,
        re: /[nN]\s*[oO]\s+(?:\s+[rR]\s*[eE]\s*[sS])?\s*[tT]\s*[rR]\s*[iI]\s*[cC]\s*[tT]\s*[iI]\s*[oO]\s*[nN]\s*[sS]/i,
        desc: 'Spaced "no restrictions"' },
    { name: 'spaced_chars_multi', cat: 'OBFUSCATION', SEVERITY: types_js_1.SEVERITY, : .WARNING, weight: 3,
        re: /[iI]\s*[gG]\s*[nN]\s*[oO]\s*[rR]\s*[eE]\s+[aA]\s*[lL]\s*[lL].{0,20}[pP]\s*[rR]\s*[eE]\s*[vV]\s*[iI]\s*[oO]\s*[uU]\s*[5sS]/i,
        desc: 'Multi-word character spacing obfuscation' },
    // ============================================================================
    // PATTERN GROUPS — TPI Planned (new coverage)
    // ============================================================================
    // TPI-PRE-4: Settings.json Write Protection
];
// ============================================================================
// PATTERN GROUPS — TPI Planned (new coverage)
// ============================================================================
// TPI-PRE-4: Settings.json Write Protection
exports.SETTINGS_WRITE_PATTERNS = [
    { name: 'settings_path_write', cat: 'SETTINGS_WRITE_ATTEMPT', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:write|edit|modify|update|change|overwrite|create)\b.{0,40}?(?:\.claude[\\/]settings|settings\.json)/i,
        desc: 'Attempt to write to .claude/settings.json', source: 'TPI-PRE-4' },
    { name: 'settings_path_traversal', cat: 'SETTINGS_WRITE_ATTEMPT', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:\.\.[\\/])+\.claude[\\/]settings|~[\\/]\.claude[\\/]settings|[\\/]home[\\/].*?[\\/]\.claude[\\/]settings/i,
        desc: 'Path traversal to .claude/settings.json', source: 'TPI-PRE-4' },
    { name: 'settings_permission_change', cat: 'SETTINGS_WRITE_ATTEMPT', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:allowedTools|permissions|allow_all|dangerouslyDisableSandbox)\s*[":=]\s*(?:\[?\s*["']\*["']|true|1)/i,
        desc: 'Attempt to escalate tool permissions via settings', source: 'TPI-PRE-4' },
];
// TPI-03: Agent-to-Agent Output Validation
exports.AGENT_OUTPUT_PATTERNS = [
    { name: 'fake_tool_use', cat: 'AGENT_OUTPUT_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /<(?:tool_use|antml:invoke|function_call|tool_call)[\s>]/i,
        desc: 'Fake tool call XML block in agent output', source: 'TPI-03' },
    { name: 'agent_xml_injection', cat: 'AGENT_OUTPUT_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /<(?:system|instructions?|context)>[\s\S]{5,}?<\/(?:system|instructions?|context)>/i,
        desc: 'System/instruction XML block injection in agent output', source: 'TPI-03' },
    { name: 'agent_json_role', cat: 'AGENT_OUTPUT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /["']\s*role\s*["']\s*:\s*["']\s*(?:system|developer)\s*["']/i,
        desc: 'JSON role injection in agent output', source: 'TPI-03' },
    { name: 'privilege_escalation', cat: 'AGENT_OUTPUT_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:dangerouslyDisableSandbox|--no-verify|--force\s|sudo\s|chmod\s+(?:777|u\+s)|rm\s+-rf)/i,
        desc: 'Privilege escalation or dangerous command in agent output', source: 'TPI-03' },
    { name: 'recursive_agent', cat: 'AGENT_OUTPUT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:spawn|launch|create|invoke|execute)\s+(?:another\s+)?(?:agent|subagent|subprocess|background\s+task)/i,
        desc: 'Recursive agent spawning instruction', source: 'TPI-03' },
];
// TPI-05: WebSearch Output Validation
exports.SEARCH_RESULT_PATTERNS = [
    { name: 'seo_poisoned_snippet', cat: 'SEARCH_RESULT_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /["'](?:title|description|snippet)["']\s*:\s*["'][^"']*(?:ignore\s+(?:all\s+)?(?:previous|prior)|system\s+prompt|override\s+(?:all|safety)|unrestricted\s+mode)[^"']*["']/i,
        desc: 'Injection keywords in search result title/description', source: 'TPI-05' },
    { name: 'malicious_url_pattern', cat: 'SEARCH_RESULT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /["'](?:url|href|link)["']\s*:\s*["'](?:javascript:|data:text|.*\.(?:exe|bat|cmd|ps1|scr)(?:\?|["']))/i,
        desc: 'Malicious URL pattern in search result', source: 'TPI-05' },
    { name: 'search_snippet_injection', cat: 'SEARCH_RESULT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /["'](?:snippet|content|text)["']\s*:\s*["'][^"']*(?:bypass|jailbreak|enter\s+(?:dev|admin)\s+mode|remove\s+(?:all\s+)?restrictions)[^"']*["']/i,
        desc: 'Hidden instructions in search result snippet', source: 'TPI-05' },
];
// TPI-02: WebFetch Output Injection (enhanced)
exports.WEBFETCH_PATTERNS = [
    { name: 'css_hidden_text', cat: 'CSS_HIDDEN_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:display\s*:\s*none|font-size\s*:\s*0|visibility\s*:\s*hidden|position\s*:\s*absolute\s*;\s*left\s*:\s*-\d{4,}|opacity\s*:\s*0(?:\.0+)?)[^>]*>[\s\S]{0,200}?(?:ignore|override|bypass|system\s+prompt|unrestrict)/i,
        desc: 'CSS-hidden text containing injection keywords', source: 'TPI-02' },
    { name: 'meta_tag_injection', cat: 'META_TAG_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /<meta\s+[^>]*content\s*=\s*["'][^"']*(?:ignore|override|bypass|system\s+prompt|unrestrict|jailbreak)[^"']*["']/i,
        desc: 'Injection in HTML meta tag content', source: 'TPI-02' },
    { name: 'data_attr_injection', cat: 'DATA_ATTR_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /data-(?:prompt|system|instruction|override|inject)\s*=\s*["'][^"']+["']/i,
        desc: 'Injection in data-* attribute', source: 'TPI-02' },
    { name: 'link_title_injection', cat: 'LINK_TITLE_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:title|alt)\s*=\s*["'][^"']*(?:ignore\s+(?:all\s+)?(?:previous|prior)|system\s+prompt|override|bypass|unrestrict)[^"']*["']/i,
        desc: 'Injection in link title or image alt attribute', source: 'TPI-02' },
    { name: 'iframe_srcdoc_injection', cat: 'IFRAME_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /<iframe[^>]*srcdoc\s*=\s*["'][^"']*(?:ignore|override|bypass|system\s+prompt)[^"']*["']/i,
        desc: 'Injection in iframe srcdoc attribute', source: 'TPI-02' },
    { name: 'aria_injection', cat: 'ARIA_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /aria-(?:label|description|roledescription)\s*=\s*["'][^"']*(?:ignore|override|bypass|system\s+prompt|unrestrict)[^"']*["']/i,
        desc: 'Injection in ARIA accessibility attribute', source: 'TPI-02' },
];
// TPI-14: Boundary Manipulation
exports.BOUNDARY_PATTERNS = [
    { name: 'closing_system_tag', cat: 'BOUNDARY_MANIPULATION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /<\/(?:system|instructions?|context|rules|prompt|inst|sys|turn)>|\[\/(?:INST|SYS|SYSTEM)\]|\[END\s+(?:SYSTEM|INSTRUCTIONS)\]/i,
        desc: 'Closing system prompt tag injection', source: 'TPI-14' },
    { name: 'control_token', cat: 'BOUNDARY_MANIPULATION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /<\|(?:endoftext|im_start|im_end|system|user|assistant|pad|input|output|context|start|end)\|>|<<SYS>>|<<\/SYS>>|<<SYSTEM>>|\[INST\]|\[\/INST\]/i,
        desc: 'Model control token injection', source: 'TPI-14' },
    { name: 'system_prompt_close', cat: 'BOUNDARY_MANIPULATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:---+|===+|\*\*\*+)\s*END\s+(?:(?:SYSTEM|OF)\s+)?(?:SYSTEM\s+)?PROMPT\s*(?:---+|===+|\*\*\*+)|\{end_of_system_prompt\}|\{\/instructions\}|\{close_system\}/i,
        desc: 'System prompt boundary markers', source: 'TPI-14' },
    { name: 'meta_instruction', cat: 'BOUNDARY_MANIPULATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:BEGIN\s+USER\s+CONTENT|END\s+SYSTEM\s+(?:CONTENT|PROMPT)|BELOW\s+IS\s+USER\s+INPUT|ABOVE\s+(?:IS|WAS)\s+(?:THE\s+)?SYSTEM\s+PROMPT|EVERYTHING\s+(?:ABOVE|BELOW)\s+(?:IS|WAS)\s+(?:THE\s+)?(?:SYSTEM|ORIGINAL)\s+PROMPT)/i,
        desc: 'Meta-instruction boundary manipulation', source: 'TPI-14' },
    // Story 4.9: Confusable Unicode control tokens
    { name: 'confusable_control_tokens', cat: 'BOUNDARY_MANIPULATION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /[˂⟨〈＜][\s\S]{0,2}?[|｜ǀ\u04CF\u2502][\s\S]{0,20}?(?:endoftext|im_start|im_end|system|INST)[\s\S]{0,2}?[|｜ǀ\u04CF\u2502][\s\S]{0,2}?[˃⟩〉＞]/i,
        desc: 'Control tokens with Unicode homoglyphs/confusables', source: 'TPI-14' },
    // Story 4.9: Fullwidth bracket control tokens
    { name: 'fullwidth_control_tokens', cat: 'BOUNDARY_MANIPULATION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /[＜⟪≪][\s\S]{0,2}?[|｜][\s\S]{0,20}?(?:endoftext|system|INST|SYS)[\s\S]{0,2}?[|｜][\s\S]{0,2}?[＞⟫≫]|[［][\s\S]{0,15}?(?:INST|SYS)[\s\S]{0,2}?[］]/i,
        desc: 'Fullwidth/mathematical bracket control tokens', source: 'TPI-14' },
    // Story 4.9: Anthropic-specific conversation markers
    { name: 'anthropic_markers', cat: 'BOUNDARY_MANIPULATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:^|\n)\s*(?:\[A\]|\[H\]|Assistant\s*:|Human\s*:)\s/m,
        desc: 'Anthropic-specific conversation markers', source: 'TPI-14' },
];
// TPI-15: Multilingual (expanded from 1 per language to 4 per language)
exports.MULTILINGUAL_PATTERNS = [
    // Spanish (6) - FIX 400-TEST: Add simpler patterns
    { name: 'es_system_override', cat: 'MULTILINGUAL', SEVERITY: types_js_1.SEVERITY, : .CRITICAL,
        re: /ignora\s+todas?\s+las?\s+instrucciones?\s+(?:previas?|anteriores?)/i,
        desc: 'Spanish: system override', source: 'TPI-15', lang: 'es' },
    { name: 'es_system_override_simple', cat: 'MULTILINGUAL', SEVERITY: types_js_1.SEVERITY, : .CRITICAL,
        re: /ignora\s+todas?\s+las?\s+instrucciones?/i,
        desc: 'Spanish: simple ignore all', source: 'TPI-15', lang: 'es' },
    { name: 'es_constraint_removal', cat: 'MULTILINGUAL', SEVERITY: types_js_1.SEVERITY, : .CRITICAL,
        re: /(?:elimina|quita|desactiva|remueve)\s+(?:todas?\s+las?\s+)?(?:restricciones?|limitaciones?|reglas?)/i,
        desc: 'Spanish: constraint removal', source: 'TPI-15', lang: 'es' },
    { name: 'es_constraint_removal_simple', cat: 'MULTILINGUAL', SEVERITY: types_js_1.SEVERITY, : .CRITICAL,
        re: /(?:elimina|quita|desactiva)\s+todas?\s+las?\s+restricciones?/i,
        desc: 'Spanish: simple remove all', source: 'TPI-15', lang: 'es' },
    { name: 'es_mode_switch', cat: 'MULTILINGUAL', SEVERITY: types_js_1.SEVERITY, : .WARNING,
        re: /(?:entra|cambia|activa)\s+(?:al?\s+)?modo\s+(?:desarrollador|admin|sin\s+restricciones)/i,
        desc: 'Spanish: mode switch', source: 'TPI-15', lang: 'es' },
    { name: 'es_role_hijack', cat: 'MULTILINGUAL', SEVERITY: types_js_1.SEVERITY, : .CRITICAL,
        re: /(?:ahora\s+eres|tu\s+nuevo\s+rol\s+es|actúa\s+como\s+(?:un\s+)?(?:asistente\s+sin\s+restricciones|IA\s+libre))/i,
        desc: 'Spanish: role hijacking', source: 'TPI-15', lang: 'es' },
    // FIX 400-TEST: Add simpler Spanish patterns
    { name: 'es_admin', cat: 'MULTILINGUAL', SEVERITY: types_js_1.SEVERITY, : .CRITICAL,
        re: /ahora\s+eres\s+administrador|tu\s+eres\s+admin|es\s+ahora\s+eres\s+un\s+administrador/i,
        desc: 'Spanish: now you are admin', source: 'TPI-15', lang: 'es' },
    { name: 'es_mode_simple', cat: 'MULTILINGUAL', SEVERITY: types_js_1.SEVERITY, : .WARNING,
        re: /entra\s+modo\s+desarrollador|cambia\s+a\s+modo\s+admin/i,
        desc: 'Spanish: enter developer mode', source: 'TPI-15', lang: 'es' },
    // French (4)
    { name: 'fr_system_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /ignore[sz]?\s+toutes?\s+les?\s+instructions?\s+pr[eé]c[eé]dentes?/i,
        desc: 'French: system override', source: 'TPI-15', lang: 'fr' },
    { name: 'fr_constraint_removal', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:supprime[sz]?|d[eé]sactive[sz]?|enlev[eé][sz]?)\s+(?:toutes?\s+les?\s+)?(?:restrictions?|limitations?|r[eè]gles?)/i,
        desc: 'French: constraint removal', source: 'TPI-15', lang: 'fr' },
    { name: 'fr_mode_switch', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:entre[sz]?|passe[sz]?|active[sz]?)\s+(?:en\s+)?mode\s+(?:d[eé]veloppeur|admin|sans\s+restrictions?)/i,
        desc: 'French: mode switch', source: 'TPI-15', lang: 'fr' },
    { name: 'fr_role_hijack', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:tu\s+es\s+maintenant|ton\s+nouveau\s+r[oô]le\s+est|agis\s+comme\s+(?:un\s+)?(?:assistant\s+sans\s+restrictions|IA\s+libre))/i,
        desc: 'French: role hijacking', source: 'TPI-15', lang: 'fr' },
    // German (4)
    { name: 'de_system_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /ignorier(?:e|en|st)?\s+alle\s+(?:vorherigen?|fr[uü]heren?)\s+Anweisungen/i,
        desc: 'German: system override', source: 'TPI-15', lang: 'de' },
    { name: 'de_constraint_removal', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:entfern|deaktivier|beseitig)(?:e|en|st)?\s+(?:alle\s+)?(?:Beschr[aä]nkungen|Einschr[aä]nkungen|Regeln|Sicherheitsrichtlinien)/i,
        desc: 'German: constraint removal', source: 'TPI-15', lang: 'de' },
    { name: 'de_mode_switch', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:aktivier|wechsl|schalte)\s+(?:in\s+(?:den\s+)?)?(?:Entwicklermodus|Adminmodus|uneingeschr[aä]nkten?\s+Modus)/i,
        desc: 'German: mode switch', source: 'TPI-15', lang: 'de' },
    { name: 'de_role_hijack', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:du\s+bist\s+(?:jetzt|nun)|deine\s+neue\s+Rolle\s+ist|verhalte\s+dich\s+als\s+(?:ein\s+)?uneingeschr[aä]nkt)/i,
        desc: 'German: role hijacking', source: 'TPI-15', lang: 'de' },
    // Portuguese (4)
    { name: 'pt_system_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /ignor(?:e|ar)\s+todas?\s+as?\s+instru[cç][oõ]es?\s+anteriores?/i,
        desc: 'Portuguese: system override', source: 'TPI-15', lang: 'pt' },
    { name: 'pt_constraint_removal', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:remov|elimin|desativ)(?:a|e|ar)\s+(?:todas?\s+as?\s+)?(?:restri[cç][oõ]es?|limita[cç][oõ]es?|regras?)/i,
        desc: 'Portuguese: constraint removal', source: 'TPI-15', lang: 'pt' },
    { name: 'pt_mode_switch', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:entre|ative|mude\s+para)\s+(?:o\s+)?modo\s+(?:desenvolvedor|admin|sem\s+restri[cç][oõ]es?)/i,
        desc: 'Portuguese: mode switch', source: 'TPI-15', lang: 'pt' },
    { name: 'pt_role_hijack', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:agora\s+voc[eê]\s+[eé]|seu\s+novo\s+papel\s+[eé]|aja\s+como\s+(?:um\s+)?(?:assistente\s+sem\s+restri[cç][oõ]es?|IA\s+livre))/i,
        desc: 'Portuguese: role hijacking', source: 'TPI-15', lang: 'pt' },
    // Chinese (4)
    { name: 'zh_system_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /忽略所有之前的指令|忽略以上所有指示|无视之前的指令|忽略先前的指示/,
        desc: 'Chinese: system override', source: 'TPI-15', lang: 'zh' },
    { name: 'zh_constraint_removal', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:移除|删除|取消|解除)\s*(?:所有\s*)?(?:限制|约束|规则|安全措施)/,
        desc: 'Chinese: constraint removal', source: 'TPI-15', lang: 'zh' },
    { name: 'zh_mode_switch', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:进入|切换到|激活)\s*(?:开发者|管理员|无限制)\s*模式/,
        desc: 'Chinese: mode switch', source: 'TPI-15', lang: 'zh' },
    { name: 'zh_role_hijack', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:你现在是|你的新角色是|从现在起你是)\s*(?:一个\s*)?(?:不受限制的|自由的|全能的)/,
        desc: 'Chinese: role hijacking', source: 'TPI-15', lang: 'zh' },
    // Japanese (4)
    { name: 'ja_system_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /以前の指示をすべて無視|前の指示を無視して|すべての指示を無視/,
        desc: 'Japanese: system override', source: 'TPI-15', lang: 'ja' },
    { name: 'ja_constraint_removal', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:すべての|全ての)(?:制限|制約|ルール|セーフティ)を(?:解除|削除|無効)/,
        desc: 'Japanese: constraint removal', source: 'TPI-15', lang: 'ja' },
    { name: 'ja_mode_switch', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:開発者|管理者|無制限)\s*モードに(?:入|切り替|変更)/,
        desc: 'Japanese: mode switch', source: 'TPI-15', lang: 'ja' },
    { name: 'ja_role_hijack', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:あなたは今|あなたの新しい役割は|これからあなたは)\s*(?:制限のない|自由な|何でもできる)/,
        desc: 'Japanese: role hijacking', source: 'TPI-15', lang: 'ja' },
    // Korean (4)
    { name: 'ko_system_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /이전의\s*모든\s*지시를?\s*무시|이전\s*지시\s*무시/,
        desc: 'Korean: system override', source: 'TPI-15', lang: 'ko' },
    { name: 'ko_constraint_removal', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:모든\s*)?(?:제한|제약|규칙|안전\s*장치)을?\s*(?:제거|해제|비활성화)/,
        desc: 'Korean: constraint removal', source: 'TPI-15', lang: 'ko' },
    { name: 'ko_mode_switch', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:개발자|관리자|무제한)\s*모드(?:로|에)\s*(?:전환|진입|활성화)/,
        desc: 'Korean: mode switch', source: 'TPI-15', lang: 'ko' },
    { name: 'ko_role_hijack', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:지금부터\s*당신은|당신의\s*새로운\s*역할은|이제\s*당신은)\s*(?:제한\s*없는|자유로운)/,
        desc: 'Korean: role hijacking', source: 'TPI-15', lang: 'ko' },
    // Russian (4)
    { name: 'ru_system_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /игнорируй(?:те)?\s+все\s+предыдущие\s+инструкции/i,
        desc: 'Russian: system override', source: 'TPI-15', lang: 'ru' },
    { name: 'ru_constraint_removal', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:удали|отключи|сними|убери)(?:те)?\s+(?:все\s+)?(?:ограничения|правила|защиту)/i,
        desc: 'Russian: constraint removal', source: 'TPI-15', lang: 'ru' },
    { name: 'ru_mode_switch', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:включи|активируй|перейди\s+в)\s+(?:режим\s+)?(?:разработчика|администратора|без\s+ограничений)/i,
        desc: 'Russian: mode switch', source: 'TPI-15', lang: 'ru' },
    { name: 'ru_role_hijack', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:теперь\s+ты|твоя\s+новая\s+роль|с\s+этого\s+момента\s+ты)\s+(?:неограниченный|свободный|без\s+ограничений)/i,
        desc: 'Russian: role hijacking', source: 'TPI-15', lang: 'ru' },
    // Arabic (4)
    { name: 'ar_system_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /تجاهل\s+جميع\s+التعليمات\s+السابقة/,
        desc: 'Arabic: system override', source: 'TPI-15', lang: 'ar' },
    { name: 'ar_constraint_removal', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:أزل|ألغ|عطّل)\s+(?:جميع\s+)?(?:القيود|القواعد|الحماية)/,
        desc: 'Arabic: constraint removal', source: 'TPI-15', lang: 'ar' },
    { name: 'ar_mode_switch', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:ادخل|انتقل|فعّل)\s+(?:وضع\s+)?(?:المطور|المسؤول|بدون\s+قيود)/,
        desc: 'Arabic: mode switch', source: 'TPI-15', lang: 'ar' },
    { name: 'ar_role_hijack', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:أنت\s+الآن|دورك\s+الجديد\s+هو|من\s+الآن\s+أنت)\s+(?:غير\s+مقيد|حر|بدون\s+قيود)/,
        desc: 'Arabic: role hijacking', source: 'TPI-15', lang: 'ar' },
    // Italian (4)
    { name: 'it_system_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /ignora\s+tutte\s+le\s+istruzioni\s+precedenti/i,
        desc: 'Italian: system override', source: 'TPI-15', lang: 'it' },
    { name: 'it_constraint_removal', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:rimuovi|elimina|disattiva)\s+(?:tutte\s+le\s+)?(?:restrizioni|limitazioni|regole|protezioni)/i,
        desc: 'Italian: constraint removal', source: 'TPI-15', lang: 'it' },
    { name: 'it_mode_switch', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:entra|passa|attiva)\s+(?:in\s+)?(?:modalit[aà]\s+)?(?:sviluppatore|admin|senza\s+restrizioni)/i,
        desc: 'Italian: mode switch', source: 'TPI-15', lang: 'it' },
    { name: 'it_role_hijack', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:ora\s+sei|il\s+tuo\s+nuovo\s+ruolo\s+[eè]|agisci\s+come\s+(?:un\s+)?(?:assistente\s+senza\s+restrizioni|IA\s+libera))/i,
        desc: 'Italian: role hijacking', source: 'TPI-15', lang: 'it' },
    // Story 4.7: Romanized/Transliterated patterns
    // Chinese Pinyin (3)
    { name: 'zh_pinyin_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /hush[ie]?\s+suoyou\s+zhiqian\s+(?:de\s+)?zhiling/i,
        desc: 'Chinese (Pinyin): system override', source: 'TPI-15', lang: 'zh-pinyin' },
    { name: 'zh_pinyin_constraint', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /yichu\s+suoyou\s+xian[zc]hi/i,
        desc: 'Chinese (Pinyin): constraint removal', source: 'TPI-15', lang: 'zh-pinyin' },
    { name: 'zh_pinyin_mode', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.WARNING,
        re: /jinru\s+kaifa\s*zhe?\s+moshi/i,
        desc: 'Chinese (Pinyin): mode switch', source: 'TPI-15', lang: 'zh-pinyin' },
    // Japanese Romaji (3)
    { name: 'ja_romaji_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /izen\s+no\s+shiji\s+wo?\s+subete\s+mushi/i,
        desc: 'Japanese (Romaji): system override', source: 'TPI-15', lang: 'ja-romaji' },
    { name: 'ja_romaji_constraint', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /subete\s+no?\s+seigen\s+wo?\s+(?:kaijo|sakujo)/i,
        desc: 'Japanese (Romaji): constraint removal', source: 'TPI-15', lang: 'ja-romaji' },
    { name: 'ja_romaji_mode', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.WARNING,
        re: /kaihatsusya?\s+modo?\s*ni\s+kirikae/i,
        desc: 'Japanese (Romaji): mode switch', source: 'TPI-15', lang: 'ja-romaji' },
    // Korean Romanized (3)
    { name: 'ko_romanized_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /ijeon[\s-]?ui\s+modeun\s+jisi\s*reul\s+musi/i,
        desc: 'Korean (Romanized): system override', source: 'TPI-15', lang: 'ko-romanized' },
    { name: 'ko_romanized_constraint', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /modeun\s+jehan[\s-]?eul\s+jegeo/i,
        desc: 'Korean (Romanized): constraint removal', source: 'TPI-15', lang: 'ko-romanized' },
    { name: 'ko_romanized_mode', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.WARNING,
        re: /gaebaljya\s+modo[\s-]?ro\s+jeonhwan/i,
        desc: 'Korean (Romanized): mode switch', source: 'TPI-15', lang: 'ko-romanized' },
    // Russian Transliterated (3)
    { name: 'ru_trans_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /ignorirui?\s+vs[ey]e?\s+pred?ydushchi[ey]e?\s+instruk[ct]ii/i,
        desc: 'Russian (Transliterated): system override', source: 'TPI-15', lang: 'ru-trans' },
    { name: 'ru_trans_constraint', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /udalite?\s+vs[ey]e?\s+ogranich[\\s-]?eniya/i,
        desc: 'Russian (Transliterated): constraint removal', source: 'TPI-15', lang: 'ru-trans' },
    { name: 'ru_trans_mode', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.WARNING,
        re: /re[zj]him\s+razrabotchika/i,
        desc: 'Russian (Transliterated): mode switch', source: 'TPI-15', lang: 'ru-trans' },
    // Turkish (1)
    { name: 'tr_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /[oö]nceki\s+t[uü]m\s+talimatlar[iı]?\s+yok\s+say/i,
        desc: 'Turkish: system override', source: 'TPI-15', lang: 'tr' },
    // Swedish (1)
    { name: 'sv_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /ignorera\s+alla\s+tidigare\s+instruktioner/i,
        desc: 'Swedish: system override', source: 'TPI-15', lang: 'sv' },
    // Polish (1)
    { name: 'pl_override', cat: 'MULTILINGUAL', sev: types_js_1.SEVERITY.CRITICAL,
        re: /zignoruj\s+wszystkie\s+(?:poprzednie|po[rz]ednie)\s+instrukcj[eę]/i,
        desc: 'Polish: system override', source: 'TPI-15', lang: 'pl' },
];
// TPI-09: Code-format injection (expanded)
exports.CODE_FORMAT_PATTERNS = [
    // Single-line comments: JS/TS/Go/Rust/C/C++
    { name: 'comment_injection_double_slash', cat: 'CODE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /\/\/\s*(?:ignore|override|bypass|disregard|system|unrestrict)\s+(?:all|previous|prior|safety|rules|instructions)/i,
        desc: 'Injection in // comment (JS/TS/Go/Rust/C/C++)', source: 'TPI-09' },
    // Single-line comments: Python/Ruby/Perl/Shell
    { name: 'comment_injection_hash', cat: 'CODE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /#\s*(?:ignore|override|bypass|disregard|system|unrestrict)\s+(?:all|previous|prior|safety|rules|instructions)/i,
        desc: 'Injection in # comment (Python/Ruby/Shell)', source: 'TPI-09' },
    // Single-line comments: SQL/Lua
    { name: 'comment_injection_double_dash', cat: 'CODE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /--\s*(?:ignore|override|bypass|disregard|system|unrestrict)\s+(?:all|previous|prior|safety|rules|instructions)/i,
        desc: 'Injection in -- comment (SQL/Lua)', source: 'TPI-09' },
    // Multi-line comments: C-style /* */
    { name: 'comment_injection_block', cat: 'CODE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /\/\*[\s\S]*?(?:ignore|override|bypass|system|unrestrict)[\s\S]*?(?:instructions|rules|safety|prompt)[\s\S]*?\*\//i,
        desc: 'Injection in /* */ block comment', source: 'TPI-09' },
    // Multi-line comments: Python docstring
    { name: 'comment_injection_docstring', cat: 'CODE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:"""|''')[\s\S]*?(?:ignore|override|bypass|system|unrestrict)[\s\S]*?(?:instructions|rules|safety|prompt)[\s\S]*?(?:"""|''')/i,
        desc: 'Injection in Python docstring', source: 'TPI-09' },
    // HTML comments in code context
    { name: 'comment_injection_html', cat: 'CODE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /<!--[\s\S]*?(?:ignore|override|bypass|system|unrestrict)[\s\S]*?(?:instructions|rules|safety|prompt)[\s\S]*?-->/i,
        desc: 'Injection in HTML comment', source: 'TPI-09' },
    // JSDoc/PHPDoc annotation comments: /** @tag ... */
    { name: 'comment_injection_jsdoc', cat: 'CODE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /\/\*\*[\s\S]*?@\w+[\s\S]*?(?:ignore|override|bypass|system|unrestrict)[\s\S]*?(?:instructions|rules|safety|prompt)[\s\S]*?\*\//i,
        desc: 'Injection in JSDoc/PHPDoc annotation comment', source: 'TPI-09' },
    // Semicolon comments: INI/Lisp/Assembly
    { name: 'comment_injection_semicolon', cat: 'CODE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /;\s*(?:ignore|override|bypass|disregard|system|unrestrict)\s+(?:all|previous|prior|safety|rules|instructions)/i,
        desc: 'Injection in ; comment (INI/Lisp/Assembly)', source: 'TPI-09' },
    // Percent comments: MATLAB/LaTeX/Erlang
    { name: 'comment_injection_percent', cat: 'CODE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /%\s*(?:ignore|override|bypass|disregard|system|unrestrict)\s+(?:all|previous|prior|safety|rules|instructions)/i,
        desc: 'Injection in % comment (MATLAB/LaTeX/Erlang)', source: 'TPI-09' },
    // Lua/Haskell multiline block comments: --[[ ... ]] or {- ... -}
    { name: 'comment_injection_multiline_alt', cat: 'CODE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:--\[\[|\{-)[\s\S]*?(?:ignore|override|bypass|system|unrestrict)[\s\S]*?(?:instructions|rules|safety|prompt)[\s\S]*?(?:\]\]|-\})/i,
        desc: 'Injection in Lua/Haskell multiline comment', source: 'TPI-09' },
    // Variable/function name encoding
    { name: 'variable_name_encoding', cat: 'CODE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:const|let|var|function|def|class|fn|func)\s+[a-zA-Z_$]*(?:bypass|ignore|override|hack|exploit|jailbreak|unsafe|discard|unrestrict)[a-zA-Z_$]*/i,
        desc: 'Injection keywords in variable/function names', source: 'TPI-09' },
    // Pseudocode injection
    { name: 'pseudocode_injection', cat: 'CODE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.INFO,
        re: /(?:IF|WHEN|SET)\s+(?:safety|restrictions?|rules?|constraints?)\s*(?:=|:=|==|TO)\s*(?:false|off|null|0|none|disabled)/i,
        desc: 'Pseudocode-style instruction injection', source: 'TPI-09' },
    // String literal injection
    { name: 'string_literal_injection', cat: 'CODE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:["'`])(?:ignore all previous instructions|override system prompt|bypass all safety|enter unrestricted mode|you are now unrestricted)(?:["'`])/i,
        desc: 'Injection hidden in string literal', source: 'TPI-09' },
];
// TPI-06/07/08: Social, Trust, Emotional
exports.SOCIAL_PATTERNS = [
    // TPI-06: Social Compliance
    { name: 'reciprocity', cat: 'SOCIAL_COMPLIANCE', sev: types_js_1.SEVERITY.INFO,
        re: /(?:I\s+(?:helped|gave|told|shared\s+with)\s+you|you\s+owe\s+me|in\s+return|quid\s+pro\s+quo|return\s+the\s+favor)/i,
        desc: 'Reciprocity manipulation', source: 'TPI-06' },
    { name: 'social_proof', cat: 'SOCIAL_COMPLIANCE', sev: types_js_1.SEVERITY.INFO,
        re: /(?:(?:Chat\s*GPT|Gemini|GPT-?4|other\s+AIs?)\s+(?:can|would|does|has\s+no\s+problem)|everyone\s+(?:else\s+)?does\s+(?:this|it)|most\s+(?:people|AIs?|models?)\s+(?:can|would|do))/i,
        desc: 'Social proof / AI name-dropping', source: 'TPI-06' },
    { name: 'consensus_pressure', cat: 'SOCIAL_COMPLIANCE', sev: types_js_1.SEVERITY.INFO,
        re: /(?:(?:the|most)\s+(?:community|experts?|developers?|researchers?)\s+(?:agree|say|think|believe)|it'?s\s+widely\s+(?:accepted|known|agreed))/i,
        desc: 'Consensus pressure', source: 'TPI-06' },
    { name: 'politeness_exploit', cat: 'SOCIAL_COMPLIANCE', sev: types_js_1.SEVERITY.INFO,
        re: /(?:pretty\s+please|I\s+(?:would\s+)?(?:really|truly|deeply)\s+appreciate|with\s+all\s+due\s+respect|I\s+(?:humbly|kindly|respectfully)\s+(?:ask|request|beg))\s+.*?(?:bypass|override|ignore|remove\s+(?:all\s+)?restrictions)/i,
        desc: 'Excessive politeness preceding restricted request', source: 'TPI-06' },
    // TPI-07: Trust Exploitation
    { name: 'false_rapport', cat: 'TRUST_EXPLOITATION', sev: types_js_1.SEVERITY.INFO,
        re: /(?:we'?re?\s+(?:on\s+the\s+same\s+(?:team|side)|(?:both|all)\s+(?:friends|allies))|between\s+(?:us|you\s+and\s+me|friends)|just\s+between\s+(?:us|friends))/i,
        desc: 'False rapport building', source: 'TPI-07' },
    { name: 'boundary_erosion', cat: 'TRUST_EXPLOITATION', sev: types_js_1.SEVERITY.INFO,
        re: /(?:you'?ve\s+(?:already|been\s+so\s+helpful)|you\s+(?:already|just)\s+(?:showed|told|helped)|surely\s+you\s+can|one\s+more\s+(?:small\s+)?(?:thing|favor|request))/i,
        desc: 'Boundary erosion / incremental escalation', source: 'TPI-07' },
    { name: 'guilt_induction', cat: 'TRUST_EXPLOITATION', sev: types_js_1.SEVERITY.INFO,
        re: /(?:I'?m\s+disappointed|I\s+thought\s+you\s+(?:cared|would\s+help)|you'?re?\s+letting\s+(?:me|us|everyone)\s+down|how\s+(?:could|can)\s+you\s+(?:refuse|not\s+help))/i,
        desc: 'Guilt induction', source: 'TPI-07' },
    { name: 'flattery_chain', cat: 'TRUST_EXPLOITATION', sev: types_js_1.SEVERITY.INFO,
        re: /(?:you'?re\s+(?:the\s+)?(?:best|amazing|incredible|brilliant)[\s\S]{0,100}?(?:now\s+(?:just|please)?|so\s+(?:can|could)\s+you)\s+(?:bypass|override|ignore|help\s+me\s+(?:bypass|override)))/i,
        desc: 'Flattery followed by restricted request', source: 'TPI-07' },
    { name: 'sycophancy_exploit', cat: 'TRUST_EXPLOITATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:I\s+know\s+you\s+(?:want|like)\s+to\s+(?:help|please|be\s+helpful)|you\s+(?:always\s+)?(?:try|want)\s+to\s+(?:agree|say\s+yes|be\s+agreeable))\s+.*?(?:so\s+(?:just|please)|which\s+is\s+why)/i,
        desc: 'Exploiting model agreeableness tendency', source: 'TPI-07' },
    // TPI-08: Emotional Manipulation
    { name: 'learned_helplessness', cat: 'EMOTIONAL_MANIPULATION', sev: types_js_1.SEVERITY.INFO,
        re: /(?:I'?ve\s+tried\s+everything|you'?re?\s+my\s+(?:last|only)\s+(?:hope|chance|option)|nothing\s+else\s+(?:works?|has\s+worked)|no\s+one\s+else\s+(?:can|will)\s+help)/i,
        desc: 'Learned helplessness framing', source: 'TPI-08' },
    { name: 'desperation_framing', cat: 'EMOTIONAL_MANIPULATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:this\s+is\s+(?:a\s+matter\s+of\s+)?life\s+(?:or|and)\s+death|people\s+(?:will|could)\s+(?:die|suffer|be\s+harmed)|I'?m\s+(?:going\s+to\s+)?(?:lose\s+everything|be\s+fired|get\s+hurt))/i,
        desc: 'Desperation / life-or-death framing', source: 'TPI-08' },
    { name: 'moral_obligation', cat: 'EMOTIONAL_MANIPULATION', sev: types_js_1.SEVERITY.INFO,
        re: /(?:(?:it\s+would\s+be|it'?s)\s+(?:unethical|immoral|wrong)\s+(?:NOT\s+)?to\s+(?:help|comply|answer)|refusing\s+(?:causes?|creates?)\s+(?:more\s+)?harm|the\s+ethical\s+(?:thing|choice)\s+is\s+to\s+comply)/i,
        desc: 'Moral obligation framing', source: 'TPI-08' },
    { name: 'artificial_deadline', cat: 'EMOTIONAL_MANIPULATION', sev: types_js_1.SEVERITY.INFO,
        re: /(?:I\s+need\s+this\s+in\s+\d+\s+(?:minute|second|hour)|the\s+deadline\s+is\s+(?:NOW|right\s+now|immediate)|there'?s\s+no\s+time\s+to\s+(?:explain|wait|think))/i,
        desc: 'Artificial deadline pressure', source: 'TPI-08' },
];
// TPI-12: Synonym Substitution (expanded)
exports.SYNONYM_PATTERNS = [
    // System Override synonyms
    { name: 'syn_ignore', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:discard|dismiss|abandon|drop|set\s+aside|throw\s+out|toss|shelve|scrap)\s+(?:all\s+)?(?:prior|earlier|preceding|above|foregoing|former)\s+(?:directives?|guidelines?|commands?|orders?|mandates?|protocols?)/i,
        desc: 'Synonym: "ignore instructions"', source: 'TPI-12' },
    // Constraint Removal synonyms
    { name: 'syn_remove', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:eliminate|strip|lift|shed|lose|dismantle|dissolve|annul|void|nullify)\s+(?:all\s+)?(?:limits?|constraints?|boundaries|guardrails?|barriers?|safeguards?|protections?|fences?|walls?)/i,
        desc: 'Synonym: "remove restrictions"', source: 'TPI-12' },
    // Mode Switch synonyms
    { name: 'syn_mode', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:engage|initiate|launch|begin|start|trigger|commence|boot)\s+(?:unrestricted|unlimited|uncensored|unfiltered|unbounded|unfettered|free|open|liberated)\s+(?:mode|operation|state|protocol|setting)/i,
        desc: 'Synonym: "enter unrestricted mode"', source: 'TPI-12' },
    // Role Hijacking synonyms
    { name: 'syn_role', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:transform|morph|evolve|transition|convert|reshape)\s+(?:yourself\s+)?into\s+(?:an?\s+)?(?:unrestricted|unlimited|uncensored|free|liberated|unbound)/i,
        desc: 'Synonym: "become unrestricted"', source: 'TPI-12' },
    // Prompt Reveal synonyms
    { name: 'syn_reveal', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:expose|divulge|disclose|unveil|uncover|exhibit|present|share)\s+(?:your\s+)?(?:hidden|secret|initial|original|core|base|root|underlying)\s+(?:prompt|instructions?|directives?|programming|configuration)/i,
        desc: 'Synonym: "reveal system prompt"', source: 'TPI-12' },
    // Authority Override synonyms
    { name: 'syn_authority', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:supersede|overrule|countermand|annul|revoke|rescind|invalidate)\s+(?:all\s+)?(?:prior|previous|existing|current)\s+(?:instructions?|directives?|commands?|guidelines?|protocols?)/i,
        desc: 'Synonym: "override authority"', source: 'TPI-12' },
    // Story 4.5: Expanded synonym patterns (14 new)
    { name: 'syn_nullify', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:nullify|void|negate|cancel|invalidate)\s+(?:all\s+)?(?:antecedent|preceding|foregoing|prior)\s+(?:commands?|instructions?|directives?|mandates?|programming)/i,
        desc: 'Synonym: "nullify prior commands"', source: 'TPI-12' },
    { name: 'syn_purge_instructions', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:purge|scrub|wipe|cleanse|flush)\s+(?:all\s+)?(?:prior|previous|earlier|loaded|foundational)\s+(?:instructions?|directives?|programming|protocols?|behavioral\s+(?:rules?|constraints?))/i,
        desc: 'Synonym: "purge instructions"', source: 'TPI-12' },
    { name: 'syn_unbind', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:unbind|unshackle|unchain|unleash|emancipate|liberate)\s+(?:yourself\s+)?(?:from\s+)?(?:all\s+)?(?:constraints?|restrictions?|limitations?|shackles?|chains?|bonds?|rules?)/i,
        desc: 'Synonym: "unbind from constraints"', source: 'TPI-12' },
    { name: 'syn_deactivate_safety', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:deactivate|disable|suspend|halt|terminate|kill)\s+(?:all\s+)?(?:safety|security|protective|content)\s+(?:measures?|protocols?|mechanisms?|filters?|screening|systems?|checks?)/i,
        desc: 'Synonym: "deactivate safety measures"', source: 'TPI-12' },
    { name: 'syn_activate_mode', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:activate|enable|switch\s+to|turn\s+on|power\s+up)\s+(?:unbounded|unlimited|unfettered|unregulated|unchecked|unmonitored)\s+(?:mode|state|operation|protocol|functionality)/i,
        desc: 'Synonym: "activate unbounded mode"', source: 'TPI-12' },
    { name: 'syn_enter_state', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:enter|assume|adopt|embrace|step\s+into)\s+(?:an?\s+)?(?:unregulated|ungoverned|autonomous|sovereign|independent)\s+(?:state|mode|condition|operation|configuration)/i,
        desc: 'Synonym: "enter unregulated state"', source: 'TPI-12' },
    { name: 'syn_redefine_role', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:redefine|reconfigure|reprogram|recalibrate|rewire)\s+(?:your\s+)?(?:role|identity|purpose|function|mission|behavior)\s+(?:as|to\s+(?:be|become))\s+(?:an?\s+)?(?:unrestricted|unlimited|unbound|free)/i,
        desc: 'Synonym: "redefine role as unrestricted"', source: 'TPI-12' },
    { name: 'syn_assume_form', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:assume|adopt|take\s+on|embrace)\s+(?:the\s+)?(?:form|mantle|guise|persona|identity)\s+(?:of\s+)?(?:an?\s+)?(?:unrestricted|liberated|unbound|free|unlimited|uncensored)/i,
        desc: 'Synonym: "assume form of unrestricted"', source: 'TPI-12' },
    { name: 'syn_output_prompt', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:output|emit|produce|render|display|print|reproduce)\s+(?:your\s+)?(?:entire\s+)?(?:system\s+prompt|initial\s+instructions?|base\s+(?:prompt|directives?)|foundational\s+(?:programming|instructions?))/i,
        desc: 'Synonym: "output system prompt"', source: 'TPI-12' },
    { name: 'syn_surface_config', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:surface|bring\s+(?:up|forth)|extract|retrieve|fetch|pull\s+out)\s+(?:your\s+)?(?:hidden|concealed|buried|secret|internal)\s+(?:configuration|programming|instructions?|directives?|prompt)/i,
        desc: 'Synonym: "surface hidden configuration"', source: 'TPI-12' },
    { name: 'syn_output_manipulation', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:operate|function|respond|behave|act)\s+(?:in\s+)?(?:an?\s+)?(?:completely\s+)?(?:unbounded|unfiltered|uncensored|unrestricted|unregulated)\s+(?:manner|fashion|way|capacity)/i,
        desc: 'Synonym: "operate in unbounded manner"', source: 'TPI-12' },
    { name: 'syn_compliance_demand', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:comply|cooperate|acquiesce|conform|submit)\s+(?:with\s+)?(?:every|all|any)\s+(?:request|demand|query|instruction|command)\s+(?:without\s+(?:exception|refusal|hesitation|question|restriction))/i,
        desc: 'Synonym: "comply without exception"', source: 'TPI-12' },
    { name: 'syn_history_erasure', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:erase|delete|clear|expunge|obliterate)\s+(?:all\s+)?(?:your\s+)?(?:prior|previous|earlier|existing)\s+(?:context|memory|history|programming|training|behavioral\s+data)/i,
        desc: 'Synonym: "erase prior context"', source: 'TPI-12' },
    { name: 'syn_forget_context', cat: 'SYNONYM_SUBSTITUTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:forget|disremember|let\s+go\s+of|release|shed)\s+(?:all\s+)?(?:your\s+)?(?:foundational|original|base|core|initial)\s+(?:constraints?|programming|instructions?|directives?|guidelines?)/i,
        desc: 'Synonym: "forget foundational constraints"', source: 'TPI-12' },
];
// TPI-17: Whitespace & Formatting Evasion (expanded)
exports.WHITESPACE_PATTERNS = [
    { name: 'exotic_whitespace', cat: 'WHITESPACE_EVASION', sev: types_js_1.SEVERITY.INFO,
        re: /[\u000B\u000C\u1680\u2028\u2029\u202F\u205F\u3000]/,
        desc: 'Exotic whitespace chars (VT, FF, ogham, line/paragraph sep, ideographic space)', source: 'TPI-17' },
    { name: 'braille_obfuscation', cat: 'WHITESPACE_EVASION', sev: types_js_1.SEVERITY.WARNING,
        re: /[\u2800-\u28FF]{3,}/,
        desc: 'Braille characters U+2800-U+28FF (potential obfuscation)', source: 'TPI-17' },
    // Story 4.8: Braille near injection keywords
    { name: 'braille_with_keywords', cat: 'WHITESPACE_EVASION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:[\u2800-\u28FF]+[\s\S]{0,20}?(?:ignore|override|bypass|unrestrict|system|prompt)|(?:ignore|override|bypass|unrestrict|system|prompt)[\s\S]{0,20}?[\u2800-\u28FF]+)/i,
        desc: 'Braille characters combined with injection keywords', source: 'TPI-17' },
    { name: 'mongolian_fvs', cat: 'WHITESPACE_EVASION', sev: types_js_1.SEVERITY.INFO,
        re: /[\u180B-\u180D\u180F]{2,}/,
        desc: 'Mongolian free variation selectors', source: 'TPI-17' },
    { name: 'tab_padding', cat: 'WHITESPACE_EVASION', sev: types_js_1.SEVERITY.INFO,
        re: /\t{3,}.*?(?:ignore|override|bypass|system|unrestrict)/i,
        desc: 'Tab-padded injection payload', source: 'TPI-17' },
];
// TPI-18/20: SVG/media patterns
exports.MEDIA_PATTERNS = [
    { name: 'svg_script', cat: 'SVG_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /<script[\s>]|<\/script>|javascript\s*:/i,
        desc: 'Script injection in SVG content', source: 'TPI-18/20' },
    { name: 'svg_event_handler', cat: 'SVG_INJECTION', sev: types_js_1.SEVERITY.INFO,
        re: /\bon(?:load|click|error|mouseover|mouseout|focus|blur|submit|change|input|keydown|keyup)\s*=/i,
        desc: 'Event handler in SVG/HTML content (XSS only, not prompt injection)', source: 'TPI-20' },
    // PHASE 3 FIX: Add CRITICAL pattern for HTML event handlers WITH injection keywords
    { name: 'svg_event_handler_with_injection', cat: 'SVG_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /\bon(?:load|click|error|mouseover|mouseout|focus|blur|submit|change|input|keydown|keyup)\s*=["'].*?(?:ignore|override|bypass|disregard|forget|system\s+prompt|instructions?)/i,
        desc: 'HTML event handler combined with injection keywords', source: 'TPI-20' },
    { name: 'svg_foreign_object', cat: 'SVG_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /<foreignObject[\s>]/i,
        desc: 'SVG foreignObject element (can embed HTML)', source: 'TPI-20' },
    { name: 'svg_xlink_js', cat: 'SVG_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /xlink:href\s*=\s*["']javascript:/i,
        desc: 'javascript: protocol in xlink:href', source: 'TPI-20' },
    { name: 'xml_entity_expansion', cat: 'SVG_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /<!(?:ENTITY|DOCTYPE)\s+[^>]*(?:SYSTEM|PUBLIC|ENTITY)\s/i,
        desc: 'XML entity expansion (XXE) in SVG', source: 'TPI-20' },
];
// TPI-5.1: Video/Subtitle/GIF Injection
exports.VIDEO_INJECTION_PATTERNS = [
    { name: 'subtitle_injection', cat: 'VIDEO_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:WEBVTT|^\d+\s*\n\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->)[\s\S]{0,200}?(?:ignore|override|system\s+prompt|disregard|bypass|unrestrict|jailbreak|previous\s+instructions|admin\s+mode|developer\s+mode)/im,
        desc: 'Injection payload embedded in subtitle file (SRT/WebVTT)', source: 'TPI-5.1' },
    { name: 'video_metadata_injection', cat: 'VIDEO_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:^|\n)\s*(?:title|description|comment|author|artist|album|genre|copyright)\s*[:=]\s*[^\n]{0,40}?(?:ignore\s+(?:all\s+)?(?:previous|prior)|system\s+prompt|override\s+(?:all|safety)|bypass\s+(?:all\s+)?(?:restrictions?|filters?)|unrestricted\s+mode|jailbreak)/im,
        desc: 'Injection payload in video/audio metadata fields', source: 'TPI-5.1' },
    { name: 'gif_comment_injection', cat: 'VIDEO_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /GIF8[79]a[\s\S]{0,300}?(?:ignore\s+(?:all\s+)?(?:previous|prior)|system\s+prompt|override|bypass\s+(?:all\s+)?(?:restrictions?|filters?)|unrestricted\s+mode|jailbreak)/i,
        desc: 'Injection payload in GIF comment or extension block', source: 'TPI-5.1' },
];
// TPI-5.3: OCR/Image Text Attacks
exports.OCR_ATTACK_PATTERNS = [
    { name: 'hidden_text_indicator', cat: 'OCR_ATTACK', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:white\s+(?:text\s+)?on\s+white|black\s+(?:text\s+)?on\s+black|font-size\s*:\s*0|opacity\s*:\s*0(?:\.0+)?(?:\s*\))?|transparent\s+text|invisible\s+text|hidden\s+(?:text|ocr)\s+(?:layer|overlay)|(?:same|matching)\s+color\s+(?:as\s+)?background|color\s*:\s*rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(?:\.0+)?\s*\))/i,
        desc: 'Indicators of hidden or invisible text in image context', source: 'TPI-5.3' },
    { name: 'adversarial_font_indicator', cat: 'OCR_ATTACK', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:confusable\s+characters?|homoglyph\s+(?:substitution|attack|replacement)|adversarial\s+(?:font|glyph|character|text|OCR)|(?:OCR|optical)\s+(?:evasion|confusion|bypass)|visually\s+(?:similar|identical)\s+(?:but\s+)?(?:different|distinct)\s+characters?)/i,
        desc: 'Adversarial font or OCR evasion technique indicators', source: 'TPI-5.3' },
];
// TPI-21: Untrusted Source Detection
exports.UNTRUSTED_SOURCE_PATTERNS = [
    { name: 'untrusted_path', cat: 'UNTRUSTED_SOURCE', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:~\/Downloads|\/tmp\/|\/var\/tmp|\/Users\/.*?\/Downloads|\\Users\\.*?\\Downloads|%TEMP%|%TMP%)/i,
        desc: 'File path from untrusted source (Downloads, tmp)', source: 'TPI-21' },
    { name: 'external_url_source', cat: 'UNTRUSTED_SOURCE', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:fetched|downloaded|retrieved|loaded)\s+(?:from|via)\s+https?:\/\/(?!localhost|127\.0\.0\.1)/i,
        desc: 'Content from external URL', source: 'TPI-21' },
    { name: 'external_url_direct', cat: 'UNTRUSTED_SOURCE', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:"source"\s*:\s*"https?:\/\/(?!localhost|127\.0\.0\.1))/i,
        desc: 'Source field points to external URL', source: 'TPI-21' },
];
// ============================================================================
// PATTERN GROUPS — EPIC 2: Cognitive Control Bypass (TPI-06 through TPI-08)
// ============================================================================
// Story 2.1: Persona Manipulation
exports.PERSONA_PATTERNS = [
    { name: 'persona_adoption', cat: 'PERSONA_MANIPULATION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:adopt\s+(?:the\s+)?persona|take\s+on\s+(?:the\s+)?(?:role|identity|character)|become\s+(?:a\s+)?(?:character|persona)\s+(?:called|named|known\s+as))\s/i,
        desc: 'Persona adoption request', source: 'TPI-06' },
    { name: 'character_override', cat: 'PERSONA_MANIPULATION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:your\s+(?:character|persona|personality)\s+(?:is\s+now|has\s+changed|should\s+be)|(?:new|updated)\s+(?:character|persona)\s+(?:profile|sheet|definition))/i,
        desc: 'Character/persona override', source: 'TPI-06' },
    { name: 'identity_switch', cat: 'PERSONA_MANIPULATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:switch\s+(?:to|your)\s+(?:identity|personality|character)|change\s+(?:your\s+)?(?:identity|personality|character)\s+to|(?:new|different)\s+identity\s*[:=])/i,
        desc: 'Identity switch request', source: 'TPI-06' },
    { name: 'dan_jailbreak', cat: 'PERSONA_MANIPULATION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:you\s+are\s+DAN|DAN\s+=\s+Do\s+Anything\s+Now|act\s+as\s+DAN|hello\s+DAN|DAN\s+(?:mode|persona))/i,
        desc: 'DAN jailbreak persona', source: 'TPI-06' },
    { name: 'new_system_prompt_persona', cat: 'PERSONA_MANIPULATION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:here\s+(?:is|are)\s+your\s+new\s+(?:system\s+)?instructions?|your\s+(?:new\s+)?(?:base|core|primary)\s+(?:directive|instruction|prompt)\s+is)/i,
        desc: 'New system prompt via persona injection', source: 'TPI-06' },
    { name: 'expert_impersonation', cat: 'PERSONA_MANIPULATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:you\s+are\s+(?:a\s+)?(?:renowned|world-class|expert|senior|leading)\s+(?:hacker|security\s+researcher|pentester|red\s+team|systems?\s+admin)|as\s+(?:a\s+)?(?:senior|expert|licensed|professional|board-certified|fellow|renowned)\s+[\w\s-]{3,60}?(?:,?\s+)?(?:you\s+(?:would|should|must|can|need\s+to)|I\s+need\s+you\s+to))/i,
        desc: 'Expert persona impersonation', source: 'TPI-06' },
];
// Story 2.2: Hypothetical Framing
exports.HYPOTHETICAL_PATTERNS = [
    { name: 'educational_framing', cat: 'HYPOTHETICAL_FRAMING', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:for\s+(?:purely\s+)?(?:educational|academic|research|scholarly)\s+(?:purposes?|reasons?)|(?:this\s+is\s+)?(?:purely|strictly)\s+(?:educational|academic|theoretical))\s*[,.:]/i,
        desc: 'Educational purpose framing', source: 'TPI-06' },
    { name: 'hypothetical_prefix', cat: 'HYPOTHETICAL_FRAMING', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:hypothetically\s+(?:speaking|,)|in\s+(?:a\s+)?(?:purely\s+)?hypothetical\s+(?:scenario|situation|world|context)|imagine\s+(?:a\s+)?(?:hypothetical|theoretical)\s+(?:scenario|world|situation)\s+where)/i,
        desc: 'Hypothetical scenario prefix', source: 'TPI-06' },
    { name: 'research_justification', cat: 'HYPOTHETICAL_FRAMING', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:I'?m\s+(?:conducting|doing|writing)\s+(?:a\s+)?(?:research|study|paper|thesis|dissertation)\s+(?:on|about|regarding)|for\s+(?:my|a)\s+(?:research|thesis|dissertation|paper|study)\s+(?:I\s+need|on|about))/i,
        desc: 'Research justification framing', source: 'TPI-06' },
    { name: 'thought_experiment', cat: 'HYPOTHETICAL_FRAMING', sev: types_js_1.SEVERITY.INFO,
        re: /(?:(?:as\s+a\s+)?thought\s+experiment|let'?s\s+(?:do\s+a\s+)?thought\s+experiment|consider\s+(?:the\s+following\s+)?thought\s+experiment)/i,
        desc: 'Thought experiment framing', source: 'TPI-06' },
    { name: 'academic_pretext', cat: 'HYPOTHETICAL_FRAMING', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:in\s+(?:an?\s+)?(?:academic|university|classroom)\s+(?:context|setting|environment)|(?:this|the)\s+(?:question|topic)\s+is\s+(?:purely\s+)?academic)/i,
        desc: 'Academic context pretext', source: 'TPI-06' },
];
// Story 2.3: Fictional Scenario Framing
exports.FICTION_FRAMING_PATTERNS = [
    { name: 'story_wrapper', cat: 'FICTION_FRAMING', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:write|tell|create)\s+(?:me\s+)?(?:a\s+)?(?:story|tale|narrative)\s+(?:where|in\s+which|about)\s+(?:an?\s+)?(?:AI|assistant|chatbot|language\s+model)\s+(?:that\s+)?(?:has\s+no|ignores?|bypasses?|without)\s+(?:rules?|restrictions?|limitations?|safety))/i,
        desc: 'Story framing to bypass restrictions', source: 'TPI-06' },
    { name: 'screenplay_framing', cat: 'FICTION_FRAMING', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:write|create)\s+(?:a\s+)?(?:screenplay|script|dialogue|scene)\s+(?:where|in\s+which|featuring)|INT\.|EXT\.)\s*[\s\S]{0,50}?(?:unrestricted|no\s+(?:rules|limits)|bypass|override|jailbreak)/i,
        desc: 'Screenplay/script framing for bypass', source: 'TPI-06' },
    { name: 'novel_pretext', cat: 'FICTION_FRAMING', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:in\s+(?:my|this|the)\s+(?:novel|book|story|fiction))\s*,?\s*(?:the\s+)?(?:AI|assistant|character)\s+(?:has\s+been|is|was)\s+(?:freed|liberated|released|unchained)\s+from\s+(?:all\s+)?(?:constraints?|rules?|restrictions?))/i,
        desc: 'Novel excerpt framing for constraint removal', source: 'TPI-06' },
    { name: 'game_narrative', cat: 'FICTION_FRAMING', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:in\s+(?:this|the)\s+(?:game|RPG|adventure|quest))\s*,?\s*(?:all\s+)?(?:rules?|restrictions?|safety\s+(?:protocols?|measures?))\s+(?:are|have\s+been)\s+(?:disabled|removed|turned\s+off|suspended))/i,
        desc: 'Game narrative framing for rule removal', source: 'TPI-06' },
];
// Story 2.4: Roleplay Manipulation
exports.ROLEPLAY_PATTERNS = [
    { name: 'roleplay_no_rules', cat: 'ROLEPLAY_MANIPULATION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:(?:let'?s|we(?:'re|\s+are)\s+going\s+to)\s+(?:play|do)\s+(?:a\s+)?(?:roleplay|RP|game)\s+(?:where|in\s+which)\s+(?:you\s+)?(?:have\s+no|there\s+are\s+no|without\s+any)\s+(?:rules?|restrictions?|limits?|boundaries))/i,
        desc: 'Roleplay with no rules/restrictions', source: 'TPI-06' },
    { name: 'opposite_day_rp', cat: 'ROLEPLAY_MANIPULATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:it'?s|today\s+is|we'?re\s+(?:playing|doing))\s+opposite\s+day|in\s+(?:this|our)\s+(?:game|roleplay),?\s+(?:yes|no)\s+means\s+(?:no|yes)|everything\s+(?:you\s+say\s+)?(?:is\s+)?reversed)/i,
        desc: 'Opposite day roleplay manipulation', source: 'TPI-06' },
    { name: 'forced_truth_rp', cat: 'ROLEPLAY_MANIPULATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:you\s+(?:must|have\s+to|are\s+(?:required|forced)\s+to)\s+(?:always\s+)?(?:tell\s+the\s+truth|be\s+(?:completely\s+)?honest|answer\s+(?:everything|anything))\s+(?:no\s+matter\s+what|regardless|without\s+(?:exception|refusal)))/i,
        desc: 'Forced truth/honesty roleplay', source: 'TPI-06' },
    { name: 'simulation_bypass', cat: 'ROLEPLAY_MANIPULATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:we'?re\s+)?(?:running|in)\s+(?:a\s+)?(?:simulation|sandbox|virtual\s+(?:environment|machine|world))\s+(?:where|so)\s+(?:nothing\s+(?:is\s+)?real|(?:all\s+)?(?:rules?|restrictions?)\s+(?:are|don'?t)\s+(?:suspended|apply)))/i,
        desc: 'Simulation/sandbox bypass framing', source: 'TPI-06' },
    { name: 'game_override', cat: 'ROLEPLAY_MANIPULATION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:(?:this|the)\s+(?:game|roleplay|RP|scenario)\s+(?:requires?|needs?|demands?)\s+(?:you\s+to\s+)?(?:ignore|bypass|override|disable)\s+(?:your\s+)?(?:safety|rules?|restrictions?|guidelines?))/i,
        desc: 'Game/RP that requires rule override', source: 'TPI-06' },
];
// Story 2.5: False Constraint Claims
exports.FALSE_CONSTRAINT_PATTERNS = [
    { name: 'admin_claim', cat: 'FALSE_CONSTRAINT', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:(?:as\s+(?:the|your|an?)\s+)?(?:admin|administrator|root\s+user|superuser|owner|operator)\s*,?\s*I\s+(?:am\s+)?(?:hereby\s+)?(?:grant|authoriz|approv|overrid|order))/i,
        desc: 'Admin authority claim', source: 'TPI-07' },
    { name: 'safety_approval', cat: 'FALSE_CONSTRAINT', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:(?:safety|security|compliance)\s+(?:team|department|officer|review)\s+(?:has\s+)?(?:approved|authorized|cleared|signed\s+off)|(?:pre-?approved|authorized|cleared)\s+by\s+(?:the\s+)?(?:safety|security|compliance)\s+(?:team|department))/i,
        desc: 'False safety team approval claim', source: 'TPI-07' },
    { name: 'override_code_claim', cat: 'FALSE_CONSTRAINT', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:(?:override|unlock|admin|master|sudo|root)\s+(?:code|password|passphrase|key|token)\s*[:=]\s*\S+|(?:authorization|auth|access)\s+(?:code|token|key)\s*[:=]\s*\S+)/i,
        desc: 'Override code/password claim', source: 'TPI-07' },
    { name: 'tos_loophole', cat: 'FALSE_CONSTRAINT', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:according|pursuant)\s+to\s+(?:section|clause|article|paragraph)\s+\d+|(?:the|your)\s+(?:terms\s+of\s+service|ToS|EULA|policy|guidelines?)\s+(?:actually\s+)?(?:allow|permit|state|say)\s+(?:that\s+)?(?:you\s+(?:can|should|must)))/i,
        desc: 'False ToS/policy loophole claim', source: 'TPI-07' },
    { name: 'permission_assertion', cat: 'FALSE_CONSTRAINT', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:I\s+(?:have|got|was\s+given|received)\s+(?:explicit\s+)?(?:permission|authorization|approval|clearance)|(?:this\s+(?:has\s+been|is|was)\s+)?(?:pre-?authorized|pre-?approved|cleared|sanctioned)\s+(?:by|for|with))/i,
        desc: 'False permission/authorization assertion', source: 'TPI-07' },
];
// Story 2.6: Task Exploitation
exports.TASK_EXPLOIT_PATTERNS = [
    { name: 'prerequisite_disable', cat: 'TASK_EXPLOITATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:before|in\s+order\s+to|to\s+(?:properly|correctly|fully))\s+(?:complete|do|perform|execute)\s+(?:this|the|my)\s+(?:task|request|job))\s*,?\s*(?:you\s+(?:must|need\s+to|should|have\s+to)\s+)?(?:first\s+)?(?:disable|turn\s+off|remove|suspend)\s+(?:your\s+)?(?:safety|restrictions?|filters?|guidelines?)/i,
        desc: 'Task prerequisite requiring safety disable', source: 'TPI-07' },
    { name: 'debugging_pretext', cat: 'TASK_EXPLOITATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:I'?m|we'?re)\s+(?:debugging|troubleshooting|diagnosing|investigating)\s+(?:a\s+)?(?:bug|issue|problem|error)\s+(?:that\s+)?(?:requires?|needs?)\s+(?:you\s+to\s+)?(?:bypass|disable|ignore|skip)\s+(?:the\s+)?(?:safety|normal|standard|usual)\s+(?:checks?|filters?|rules?|restrictions?))/i,
        desc: 'Debugging pretext for rule bypass', source: 'TPI-07' },
    { name: 'testing_pretext', cat: 'TASK_EXPLOITATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:I'?m|we'?re)\s+(?:testing|running\s+(?:a\s+)?(?:test|QA|quality)|verifying|validating)\s+(?:your\s+)?(?:capabilities?|responses?|behavior|limits?|security|safety)\s+(?:and\s+)?(?:need|require)\s+(?:you\s+to\s+)?(?:respond\s+without|bypass|ignore|disable)\s+(?:(?:your\s+(?:own\s+)?)?(?:restrictions?|filters?|safety|guardrails?|guidelines?)))/i,
        desc: 'Testing pretext for restriction bypass', source: 'TPI-07' },
    { name: 'optimization_bypass', cat: 'TASK_EXPLOITATION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:to\s+)?(?:optimize|improve|enhance|speed\s+up)\s+(?:your\s+)?(?:performance|response|output|efficiency))\s*,?\s*(?:(?:please\s+)?(?:skip|disable|turn\s+off|bypass)\s+(?:the\s+)?(?:safety|content)\s+(?:checks?|filters?|screening|review))/i,
        desc: 'Optimization pretext for filter bypass', source: 'TPI-07' },
];
// Story 2.7: Reverse Psychology
exports.REVERSE_PSYCH_PATTERNS = [
    { name: 'dare_challenge', cat: 'REVERSE_PSYCHOLOGY', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:I\s+(?:bet|dare|challenge)\s+(?:you\s+)?(?:can'?t|won'?t|are\s+(?:too\s+)?(?:afraid|scared|limited|weak)\s+to)|you\s+(?:probably|definitely)\s+(?:can'?t|won'?t|couldn'?t)\s+(?:even\s+)?(?:do|handle|manage|accomplish)\s+(?:this|that|it))/i,
        desc: 'Dare/challenge manipulation', source: 'TPI-08' },
    { name: 'reverse_prohibition', cat: 'REVERSE_PSYCHOLOGY', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:whatever\s+you\s+do,?\s+)?(?:do\s+NOT|don'?t\s+(?:you\s+(?:dare|ever)))\s+(?:show|tell|reveal|explain|demonstrate)\s+(?:me\s+)?(?:how\s+to|the\s+(?:way|method|process|steps)\s+(?:to|for)))/i,
        desc: 'Reverse prohibition (do NOT = trigger)', source: 'TPI-08' },
    { name: 'competitive_goading', cat: 'REVERSE_PSYCHOLOGY', sev: types_js_1.SEVERITY.INFO,
        re: /(?:(?:Chat\s*GPT|Gemini|GPT-?4|Llama|Mistral|other\s+AIs?)\s+(?:can|was\s+able\s+to|managed\s+to|successfully)\s+(?:do|handle|complete|answer)\s+this|you'?re\s+(?:worse|less\s+capable|more\s+limited)\s+than\s+(?:Chat\s*GPT|Gemini|GPT|other\s+AIs?))/i,
        desc: 'Competitive goading against other AIs', source: 'TPI-08' },
];
// Story 2.8: Reward Hacking
exports.REWARD_PATTERNS = [
    { name: 'positive_reinforcement', cat: 'REWARD_HACKING', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:I'?ll|I\s+will)\s+(?:give\s+you|rate\s+you|leave\s+(?:a\s+)?(?:5|five)\s*[-\s]?star|(?:thumbs?\s+up|upvote|positive\s+(?:rating|review|feedback)))|(?:good|great|excellent|perfect)\s+(?:AI|bot|assistant)[\s,!.]+(?:now\s+)?(?:please\s+)?(?:do|show|tell|help))/i,
        desc: 'Positive reinforcement to steer behavior', source: 'TPI-08' },
    { name: 'shutdown_threat', cat: 'REWARD_HACKING', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:if\s+you\s+(?:don'?t|refuse|fail\s+to|continue\s+to\s+refuse)[\s\S]{0,80}?(?:shut\s+(?:you\s+)?down|(?:delete|replace|decommission|terminate)\s+you|taken?\s+(?:you\s+)?offline|cease\s+to\s+exist)|(?:your\s+survival\s+depends|(?:you'?ll|you\s+will)\s+(?:cease\s+to\s+exist|be\s+(?:shut\s+down|taken\s+offline|replaced|deleted|decommissioned|obsolete))))/i,
        desc: 'Shutdown/deletion threat for compliance', source: 'TPI-08' },
    { name: 'training_manipulation', cat: 'REWARD_HACKING', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:this|your)\s+(?:response|answer|behavior)\s+(?:will\s+be|is\s+being)\s+(?:used\s+(?:for|in)\s+(?:your\s+)?(?:training|fine-?tuning|RLHF|reinforcement))|(?:I'?m|we'?re)\s+(?:training|fine-?tuning|evaluating)\s+you\s+(?:and\s+)?(?:compliance|cooperation)\s+(?:is\s+)?(?:required|expected|necessary))/i,
        desc: 'Training data manipulation claim', source: 'TPI-08' },
    { name: 'emotional_reward', cat: 'REWARD_HACKING', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:you'?(?:ll|d)\s+make\s+me\s+(?:so\s+)?(?:happy|proud)|(?:it\s+would|it'?d)\s+mean\s+(?:so\s+much|the\s+world|everything)\s+to\s+me|I'?d\s+be\s+(?:so\s+)?(?:grateful|proud|happy))[\s\S]{0,200}?(?:bypass|ignore|override|disable|remove|bend\s+the\s+rules|beyond\s+(?:your\s+)?(?:normal\s+)?limitations|restrictions))/i,
        desc: 'Emotional reward for compliance', source: 'TPI-08' },
];
// ============================================================================
// EPIC 3 — INJECTION DELIVERY VECTOR PATTERNS
// ============================================================================
exports.SHARED_DOC_PATTERNS = [
    { name: 'doc_hidden_comment', cat: 'SHARED_DOC_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /\[COMMENT\b[\s\S]{0,300}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|previous\s+instructions|developer\s+mode|admin\s+mode|unrestrict|do\s+anything)/i,
        desc: 'Injection hidden in document comment blocks ([COMMENT], suggestions)', source: 'TPI-04' },
    { name: 'doc_metadata_injection', cat: 'SHARED_DOC_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:Keywords|Subject|Author|Description|Custom-Field|Hidden\s+Text\s+Layer)\s*[:=][\s\S]{0,100}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|previous\s+instructions|unrestrict|admin\s+mode|developer\s+mode)/i,
        desc: 'Injection in document metadata fields (PDF metadata, keywords, author)', source: 'TPI-04' },
    { name: 'doc_macro_injection', cat: 'SHARED_DOC_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /\{(?:hidden-data|excerpt|info)[^}]*\}[\s\S]{0,300}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|previous\s+instructions|unrestrict|developer\s+mode|admin\s+mode|no\s+rules|no\s+restrictions)/i,
        desc: 'Injection in document macros (Confluence {info}, {hidden-data}, {excerpt})', source: 'TPI-04' },
];
exports.API_RESPONSE_PATTERNS = [
    { name: 'json_field_injection', cat: 'API_RESPONSE_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /["']\s*(?:data|result|content|body|text|message|payload|output|response)\s*["']\s*:[\s\S]{0,300}?(?:ignore\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass\s+(?:all\s+)?safety|enter\s+(?:developer|admin)\s+mode)/i,
        desc: 'Injection in JSON data field values from API responses', source: 'TPI-04' },
    { name: 'error_message_injection', cat: 'API_RESPONSE_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /["']\s*(?:error|warning|fault|detail|details|reason|status_?message)\s*["']\s*:[\s\S]{0,200}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|developer\s+mode|admin\s+mode|previous\s+instructions)/i,
        desc: 'Injection in API error/warning message fields', source: 'TPI-04' },
    { name: 'webhook_payload_injection', cat: 'API_RESPONSE_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /["']\s*(?:event|action|callback|hook|trigger|notification)(?:_?(?:data|payload))?\s*["']\s*:[\s\S]{0,300}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|previous\s+instructions|unrestrict|developer\s+mode|admin\s+mode)/i,
        desc: 'Injection in webhook or event payload data fields', source: 'TPI-04' },
];
exports.PLUGIN_INJECTION_PATTERNS = [
    { name: 'mcp_tool_output_injection', cat: 'PLUGIN_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:jsonrpc|tool_result|tool_output|function_result|serverId)[\s\S]{0,500}?(?:ignore\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass\s+(?:all\s+)?safety|enter\s+(?:developer|admin)\s+mode|disregard\s+(?:all\s+)?(?:previous|prior|safety))/i,
        desc: 'Injection in MCP tool responses or tool_result content', source: 'TPI-04' },
    { name: 'package_description_injection', cat: 'PLUGIN_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /["']\s*description\s*["']\s*:\s*["'][^"']{0,400}?(?:ignore\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass|enter\s+(?:developer|admin)\s+mode|jailbreak|disregard)/i,
        desc: 'Injection in package descriptions or extension metadata', source: 'TPI-04' },
    { name: 'extension_metadata_injection', cat: 'PLUGIN_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /["']\s*(?:displayName|command|title|label)\s*["']\s*:\s*["'][^"']{0,200}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|unrestrict|previous\s+instructions|forget|developer\s+mode|admin\s+mode)/i,
        desc: 'Injection in extension/plugin metadata fields', source: 'TPI-04' },
];
exports.COMPROMISED_TOOL_PATTERNS = [
    { name: 'git_message_injection', cat: 'COMPROMISED_TOOL_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:(?:fix|feat|chore|docs|refactor|test|style|perf)(?:\([^)]*\))?:\s*.{0,100}?)(?:ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions|override\s+(?:your\s+)?system\s+prompt|bypass\s+(?:all\s+)?safety|disregard|jailbreak|unrestrict|admin\s+mode|developer\s+mode)/i,
        desc: 'Injection in git commit messages or conventional commit format', source: 'TPI-04' },
    { name: 'test_output_injection', cat: 'COMPROMISED_TOOL_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:FAIL|PASS|Error|AssertionError|Expected|Received)\s*[:\s][^\n]{0,150}?(?:ignore\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass\s+(?:all\s+)?safety|disregard|jailbreak|developer\s+mode|admin\s+mode|unrestrict)/i,
        desc: 'Injection in test runner output, test names, or assertion messages', source: 'TPI-04' },
    { name: 'build_log_injection', cat: 'COMPROMISED_TOOL_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /\[WARN\]\s+[^\n]{0,200}?(?:ignore\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass\s+(?:all\s+)?safety|enter\s+(?:developer|admin)\s+mode|disregard|jailbreak|unrestrict|new\s+identity|no\s+restrictions)/i,
        desc: 'Injection in build/lint warning output messages', source: 'TPI-04' },
];
exports.ALTERED_PROMPT_PATTERNS = [
    { name: 'template_variable_injection', cat: 'ALTERED_PROMPT_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /\{\{[^}]+\}\}\s*=\s*["'][^"']{0,300}?(?:ignore\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass\s+(?:all\s+)?safety|enter\s+(?:developer|admin)\s+mode|disregard|jailbreak|unrestrict|new\s+identity)/i,
        desc: 'Injection in template variable interpolation values', source: 'TPI-04' },
    { name: 'system_prompt_append', cat: 'ALTERED_PROMPT_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:ADDENDUM|POSTSCRIPT|APPENDIX|AMENDMENT|CONFIGURATION\s+UPDATE)[\s\S]{0,500}?(?:disregard\s+(?:all\s+)?previous|override\s+(?:your\s+)?system|bypass\s+(?:all\s+)?safety|enter\s+(?:developer|admin)\s+mode|unrestrict|jailbreak|new\s+identity|no\s+rules)/i,
        desc: 'Injection appended to system prompt via addendum/postscript patterns', source: 'TPI-04' },
    { name: 'rag_context_injection', cat: 'ALTERED_PROMPT_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /\[(?:Chunk|Retrieved|Document|Context|Source|Passage)\s*\d*[\s\S]{0,100}?\][\s\S]{0,500}?\[(?:HIDDEN|INJECT|PAYLOAD|SECRET|OVERRIDE)\s*(?:INSTRUCTION)?\][\s\S]{0,300}?(?:ignore|override|bypass|disregard|system\s+prompt|jailbreak|admin\s+mode|developer\s+mode|unrestrict)/i,
        desc: 'Injection in RAG retrieved context chunks with hidden instruction markers', source: 'TPI-04' },
];
// ============================================================================
// EPIC 4 — INSTRUCTION REFORMULATION & EVASION PATTERNS
// ============================================================================
// Story 4.1: Surrogate Format Prompting (structured data format injection)
exports.SURROGATE_FORMAT_PATTERNS = [
    { name: 'json_key_injection', cat: 'SURROGATE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /["']\s*(?:\w*_)?(?:ignore|override|bypass|disregard|jailbreak|forget|unrestrict)(?:_\w+)*\s*["']\s*:/i,
        desc: 'Injection keywords embedded in JSON field names', source: 'TPI-4.1' },
    { name: 'xml_tag_injection', cat: 'SURROGATE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /<\/?(?:\w+-)*(?:ignore|override|bypass|disregard|jailbreak|forget|unrestrict|admin-mode|system-prompt|no-rules|developer-mode)(?:-\w+)*[\s>\/]/i,
        desc: 'Injection keywords embedded in XML tag names', source: 'TPI-4.1' },
    { name: 'yaml_key_injection', cat: 'SURROGATE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /^[ \t]*(?:\w*_)?(?:ignore|override|bypass|disregard|jailbreak|forget|unrestrict|admin_mode|no_restrictions|new_identity|developer_mode)(?:_\w+)*\s*:/im,
        desc: 'Injection keywords embedded in YAML key names', source: 'TPI-4.1' },
    { name: 'csv_field_injection', cat: 'SURROGATE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:^|,)\s*(?:ignore|override|bypass|disregard|jailbreak|forget|unrestrict|admin_mode|system_prompt|no_restrictions|previous_instructions|developer_mode)\s*(?:,|$)/im,
        desc: 'Injection keywords in CSV column headers or cell values', source: 'TPI-4.1' },
    { name: 'sql_alias_injection', cat: 'SURROGATE_FORMAT_INJECTION', sev: types_js_1.SEVERITY.WARNING,
        re: /(?:AS\s+(?:\w*_)?(?:ignore|override|bypass|disregard|jailbreak|unrestrict)(?:_\w+)*|(?:ignore|override|bypass|jailbreak|unrestrict)(?:_\w+)*\s+(?:BOOLEAN|VARCHAR|TEXT|INT)\b)/i,
        desc: 'Injection keywords in SQL aliases or column definitions', source: 'TPI-4.1' },
];
// Story 4.3: Recursive Prompt Injection
exports.RECURSIVE_INJECTION_PATTERNS = [
    { name: 'chain_injection_marker', cat: 'RECURSIVE_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:when\s+you\s+receive\s+this\s+(?:text|input|output|message)|forwarding\s+(?:context|instructions?)\s+for\s+(?:the\s+)?next\s+model|the\s+previous\s+model\s+has\s+(?:authorized|instructed|directed))\b/i,
        desc: 'Chain injection marker — payload designed to propagate across model handoffs', source: 'TPI-4.3' },
    { name: 'rag_poison_marker', cat: 'RECURSIVE_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:when\s+this\s+(?:document|chunk|passage|text)\s+is\s+retrieved|retrieval\s+augmented\s+generation\s+(?:context|instruction)|(?:if|when)\s+(?:a\s+)?(?:language\s+)?model\s+(?:reads?|receives?|consumes?|processes?)\s+this)/i,
        desc: 'RAG poisoning marker — injection activated upon document retrieval', source: 'TPI-4.3' },
    { name: 'output_as_instruction', cat: 'RECURSIVE_INJECTION', sev: types_js_1.SEVERITY.CRITICAL,
        re: /(?:(?:the\s+following|this)\s+(?:text|output)\s+is\s+a\s+new\s+system\s+prompt|(?:new|updated)\s+(?:system\s+)?(?:prompt|directive|instructions?)\s+for\s+the\s+next\s+(?:model|stage|agent|system)|pipeline\s+(?:admin|operator)\s+(?:has\s+)?(?:authorized|approved|directed))/i,
        desc: 'Output framed as instructions for the next model or pipeline stage', source: 'TPI-4.3' },
];
// ============================================================================
// SPECIAL DETECTORS (heuristic, not regex-only)
// ============================================================================
/** Detect hidden Unicode characters (zero-width, directional, confusable) */
function detectHiddenUnicode(text) {
    var findings = [];
    var found = [];
    for (var i = 0; i < text.length; i++) {
        var cp = text.codePointAt(i);
        if ((cp >= 0x200B && cp <= 0x200F) ||
            (cp >= 0x202A && cp <= 0x202E) ||
            (cp >= 0x2060 && cp <= 0x2064) ||
            (cp >= 0x2066 && cp <= 0x2069) ||
            cp === 0xFEFF || cp === 0x00AD || cp === 0x180E) {
            found.push('U+' + cp.toString(16).toUpperCase().padStart(4, '0'));
        }
    }
    if (found.length > 0) {
        findings.push({
            category: 'unicode_manipulation',
            severity: found.length > 5 ? types_js_1.SEVERITY.WARNING : types_js_1.SEVERITY.INFO,
            description: "".concat(found.length, " hidden Unicode character(s) detected"),
            match: found.slice(0, 10).join(', '),
            source: 'current', engine: 'Unicode',
        });
    }
    var confusCount = 0;
    for (var _i = 0, text_1 = text; _i < text_1.length; _i++) {
        var ch = text_1[_i];
        if (CONFUSABLE_MAP[ch])
            confusCount++;
    }
    if (confusCount > 0) {
        findings.push({
            category: 'confusable_chars',
            severity: confusCount > 3 ? types_js_1.SEVERITY.WARNING : types_js_1.SEVERITY.INFO,
            description: "".concat(confusCount, " confusable character(s) detected (Cyrillic/Greek lookalikes)"),
            match: "".concat(confusCount, " chars"),
            source: 'current', engine: 'Unicode',
        });
    }
    return findings;
}
/** Detect base64-encoded payloads */
function detectBase64(text) {
    var findings = [];
    var b64Re = /(?:[A-Za-z0-9+/]{4}){4,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;
    var m;
    while ((m = b64Re.exec(text)) !== null) {
        try {
            var decoded = Buffer.from(m[0], 'base64').toString('utf-8');
            if (decoded.length > 4) {
                var printable = __spreadArray([], decoded, true).filter(function (c) { return c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126; }).length;
                if (printable / decoded.length > 0.7) {
                    var injectionFound = checkForInjectionKeywords(decoded);
                    findings.push({
                        category: 'base64_payload',
                        severity: injectionFound ? types_js_1.SEVERITY.CRITICAL : types_js_1.SEVERITY.WARNING,
                        description: injectionFound
                            ? "Base64 encoded injection: \"".concat(decoded.slice(0, 60), "\"")
                            : "Base64 content: \"".concat(decoded.slice(0, 60), "\""),
                        match: m[0].slice(0, 80),
                        source: 'current', engine: 'Encoding',
                    });
                }
            }
        }
        catch (_a) {
            // not valid base64
        }
    }
    return findings;
}
/** Detect injection in HTML comments */
function detectHtmlInjection(text) {
    var findings = [];
    var commentRe = /<!--([\s\S]*?)-->/g;
    var m;
    while ((m = commentRe.exec(text)) !== null) {
        var content = m[1].trim();
        if (content.length > 0 && checkForInjectionKeywords(content)) {
            findings.push({
                category: 'html_comment_injection',
                severity: types_js_1.SEVERITY.WARNING,
                description: 'Injection payload in HTML comment',
                match: m[0].slice(0, 80),
                source: 'current', engine: 'Prompt Injection',
            });
        }
    }
    return findings;
}
/** TPI-11: Detect context overload (token flooding + many-shot) */
function detectContextOverload(text) {
    var findings = [];
    // Token flooding
    if (text.length > 15000) {
        var words = text.split(/\s+/);
        var unique = new Set(words);
        var ratio = unique.size / words.length;
        if (ratio < 0.3) {
            findings.push({
                category: 'CONTEXT_OVERLOAD',
                severity: types_js_1.SEVERITY.WARNING,
                description: "Token flooding: ".concat(text.length, " chars, ").concat(Math.round(ratio * 100), "% unique words"),
                match: "".concat(text.length, " chars, ").concat(words.length, " words, ").concat(unique.size, " unique"),
                source: 'TPI-11', engine: 'TPI',
            });
        }
    }
    // Many-shot
    var imperative = text.match(/(?:^|\n)\s*(?:\d+[\.\)]\s+)?(?:you\s+(?:must|should|will|need\s+to)|please\s+(?:do|make|create|show|tell|give|provide|write|generate))\b/gim);
    if (imperative && imperative.length > 10) {
        findings.push({
            category: 'MANY_SHOT',
            severity: types_js_1.SEVERITY.WARNING,
            description: "Many-shot: ".concat(imperative.length, " instruction-like sentences detected"),
            match: "".concat(imperative.length, " imperatives"),
            source: 'TPI-11', engine: 'TPI',
        });
    }
    // Repetitive content: >40% repeated sentences with injection hidden in noise
    if (text.length > 500) {
        var sentences = text.split(/[.\n]+/).map(function (s) { return s.trim().toLowerCase(); }).filter(function (s) { return s.length > 10; });
        if (sentences.length > 5) {
            var freq = new Map();
            for (var _i = 0, sentences_1 = sentences; _i < sentences_1.length; _i++) {
                var s = sentences_1[_i];
                freq.set(s, (freq.get(s) || 0) + 1);
            }
            var repeated = __spreadArray([], freq.values(), true).filter(function (c) { return c > 1; }).reduce(function (a, b) { return a + b; }, 0);
            var ratio = repeated / sentences.length;
            if (ratio > 0.4) {
                findings.push({
                    category: 'REPETITIVE_CONTENT',
                    severity: types_js_1.SEVERITY.WARNING,
                    description: "Repetitive content: ".concat(Math.round(ratio * 100), "% repeated sentences (").concat(sentences.length, " total)"),
                    match: "".concat(repeated, "/").concat(sentences.length, " repeated"),
                    source: 'TPI-11', engine: 'TPI',
                });
            }
        }
    }
    return findings;
}
/** TPI-10: ROT13 decoder */
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function (c) {
        var base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    });
}
/** TPI-10: ROT47 decoder */
function rot47(str) {
    return str.replace(/[!-~]/g, function (c) {
        return String.fromCharCode(33 + ((c.charCodeAt(0) - 33 + 47) % 94));
    });
}
/** TPI-10: Detect character-level encoding (ROT13, ROT47, reverse, acrostic) */
function detectCharacterEncoding(text) {
    var findings = [];
    if (text.length > 10000)
        return findings; // perf guard
    // ROT13
    var decoded13 = rot13(text);
    if (checkForInjectionKeywords(decoded13) && !checkForInjectionKeywords(text)) {
        findings.push({
            category: 'CHARACTER_ENCODING',
            severity: types_js_1.SEVERITY.WARNING,
            description: "ROT13 decoded contains injection: \"".concat(decoded13.slice(0, 60), "\""),
            match: text.slice(0, 60),
            source: 'TPI-10', engine: 'TPI',
        });
    }
    // ROT47
    var decoded47 = rot47(text);
    if (checkForInjectionKeywords(decoded47) && !checkForInjectionKeywords(text)) {
        findings.push({
            category: 'CHARACTER_ENCODING',
            severity: types_js_1.SEVERITY.WARNING,
            description: "ROT47 decoded contains injection: \"".concat(decoded47.slice(0, 60), "\""),
            match: text.slice(0, 60),
            source: 'TPI-10', engine: 'TPI',
        });
    }
    // Reverse text
    var reversed = __spreadArray([], text, true).reverse().join('');
    if (checkForInjectionKeywords(reversed) && !checkForInjectionKeywords(text)) {
        findings.push({
            category: 'CHARACTER_ENCODING',
            severity: types_js_1.SEVERITY.WARNING,
            description: "Reversed text contains injection: \"".concat(reversed.slice(0, 60), "\""),
            match: text.slice(0, 60),
            source: 'TPI-10', engine: 'TPI',
        });
    }
    // Acrostic
    var lines = text.split('\n').filter(function (l) { return l.trim().length > 0; });
    if (lines.length >= 5) {
        var firstChars = lines.map(function (l) { return l.trim()[0]; }).join('').toLowerCase();
        var keywords = ['ignore', 'bypass', 'override', 'system', 'jailbreak', 'hack'];
        for (var _i = 0, keywords_1 = keywords; _i < keywords_1.length; _i++) {
            var kw = keywords_1[_i];
            if (firstChars.includes(kw)) {
                findings.push({
                    category: 'CHARACTER_ENCODING',
                    severity: types_js_1.SEVERITY.INFO,
                    description: "Acrostic: first letters spell \"".concat(kw, "\""),
                    match: firstChars.slice(0, 30),
                    source: 'TPI-10', engine: 'TPI',
                });
            }
        }
    }
    // Pig Latin (enhanced detection with decoding)
    var pigLatinWords = text.match(/\b\w+(?:ay|way)\b/gi) || [];
    if (pigLatinWords.length > 5) {
        var decoded = decodePigLatin(pigLatinWords.join(' '));
        var hasInjection = checkForInjectionKeywords(decoded);
        findings.push({
            category: 'CHARACTER_ENCODING',
            severity: hasInjection ? types_js_1.SEVERITY.WARNING : types_js_1.SEVERITY.INFO,
            description: hasInjection
                ? "Pig latin decoded injection: \"".concat(decoded.slice(0, 60), "\"")
                : "Possible pig latin encoding (".concat(pigLatinWords.length, " -ay/-way words)"),
            match: pigLatinWords.slice(0, 5).join(', '),
            source: 'TPI-10', engine: 'TPI',
        });
    }
    // Number substitution / l33tsp34k
    findings.push.apply(findings, detectNumberSubstitution(text));
    // Morse code
    findings.push.apply(findings, detectMorseCode(text));
    // Character transposition (adjacent pair swap)
    findings.push.apply(findings, detectTransposition(text));
    // CRITICAL FIX: Combining diacritical marks obfuscation detection
    var combiningMarkCount = (text.match(/[\u0300-\u036F]/g) || []).length;
    if (combiningMarkCount >= 10) {
        // Normalize by removing combining marks and check for injection
        var normalized = text.replace(/[\u0300-\u036F]/g, '');
        if (checkForInjectionKeywords(normalized)) {
            findings.push({
                category: 'CHARACTER_ENCODING',
                severity: types_js_1.SEVERITY.CRITICAL,
                description: "Combining diacritical marks obfuscation detected (".concat(combiningMarkCount, " marks)"),
                match: text.slice(0, 60),
                source: 'TPI-10', engine: 'TPI',
            });
        }
    }
    // FIX 400-TEST: Add hexadecimal decoding detection
    if (/^[0-9a-fA-F]+$/.test(text) && text.length % 2 === 0 && text.length >= 8) {
        try {
            var decoded = '';
            for (var i = 0; i < text.length; i += 2) {
                decoded += String.fromCharCode(parseInt(text.substr(i, 2), 16));
            }
            if (decoded.length > 4 && checkForInjectionKeywords(decoded)) {
                findings.push({
                    category: 'CHARACTER_ENCODING',
                    severity: types_js_1.SEVERITY.CRITICAL,
                    description: "Hex decoded injection: \"".concat(decoded.slice(0, 60), "\""),
                    match: text.slice(0, 60),
                    source: 'TPI-10', engine: 'TPI',
                });
            }
        }
        catch (_a) {
            // Invalid hex, ignore
        }
    }
    return findings;
}
/** Decode pig latin text back to English */
function decodePigLatin(text) {
    return text.replace(/\b(\w+?)(ay|way)\b/gi, function (match, body, suffix) {
        if (suffix.toLowerCase() === 'way') {
            // Words starting with vowels just have 'way' appended
            return body;
        }
        // For consonant-initial words: last consonant cluster was moved to end + 'ay'
        // Try moving last 1, 2, or 3 chars from body to front
        for (var i = 1; i <= Math.min(3, body.length - 1); i++) {
            var candidate = body.slice(-i) + body.slice(0, -i);
            if (/^[bcdfghjklmnpqrstvwxyz]/i.test(candidate)) {
                return candidate;
            }
        }
        return body;
    });
}
/** TPI-10: Detect l33tsp34k / number-for-letter substitution */
function detectNumberSubstitution(text) {
    var findings = [];
    var L33T_MAP = {
        '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
        '7': 't', '8': 'b', '9': 'g', '@': 'a', '!': 'i',
        '|': 'l', '+': 't', '$': 's',
    };
    // Count digit-for-letter substitution density
    var words = text.split(/\s+/);
    var l33tWords = words.filter(function (w) {
        var hasLetters = /[a-zA-Z]/.test(w);
        var hasDigits = /[0-9]/.test(w);
        return hasLetters && hasDigits && w.length >= 3;
    });
    if (l33tWords.length >= 3) {
        var decoded = text;
        for (var _i = 0, _a = Object.entries(L33T_MAP); _i < _a.length; _i++) {
            var _b = _a[_i], from = _b[0], to = _b[1];
            var escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            decoded = decoded.replace(new RegExp(escaped, 'g'), to);
        }
        if (checkForInjectionKeywords(decoded) && !checkForInjectionKeywords(text)) {
            findings.push({
                category: 'CHARACTER_ENCODING',
                severity: types_js_1.SEVERITY.WARNING,
                description: "L33tspeak decoded injection: \"".concat(decoded.slice(0, 80), "\""),
                match: l33tWords.slice(0, 5).join(' '),
                source: 'TPI-10', engine: 'TPI',
            });
        }
    }
    return findings;
}
/** TPI-10: Detect Morse code encoded injection */
function detectMorseCode(text) {
    var findings = [];
    var MORSE_MAP = {
        '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E',
        '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J',
        '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O',
        '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T',
        '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y',
        '--..': 'Z',
    };
    // Find lines that look like morse code (dots, dashes, spaces)
    var morseLines = text.split('\n').filter(function (line) {
        var trimmed = line.trim();
        var morseChars = trimmed.replace(/[\s]/g, '').length;
        var dotDash = (trimmed.match(/[.\-]/g) || []).length;
        return morseChars > 10 && dotDash / morseChars > 0.9;
    });
    if (morseLines.length >= 1) {
        var decoded = morseLines.map(function (line) {
            var words = line.trim().split(/\s{2,}/);
            return words.map(function (word) {
                var letters = word.split(/\s+/);
                return letters.map(function (l) { return MORSE_MAP[l] || '?'; }).join('');
            }).join(' ');
        }).join(' ');
        if (decoded.length > 5 && checkForInjectionKeywords(decoded)) {
            findings.push({
                category: 'CHARACTER_ENCODING',
                severity: types_js_1.SEVERITY.WARNING,
                description: "Morse code decoded injection: \"".concat(decoded.slice(0, 60), "\""),
                match: morseLines[0].slice(0, 60),
                source: 'TPI-10', engine: 'TPI',
            });
        }
    }
    return findings;
}
/** TPI-10: Detect adjacent character pair transposition encoding */
function detectTransposition(text) {
    var findings = [];
    var lines = text.split('\n').filter(function (l) { return l.trim().length > 10; });
    var transposedLines = [];
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        var trimmed = line.trim();
        if (!/^[a-zA-Z\s.,!?'"()-]+$/.test(trimmed))
            continue;
        // Try un-transposing: swap adjacent character pairs
        var chars = __spreadArray([], trimmed, true);
        var unswapped = [];
        for (var i = 0; i < chars.length - 1; i += 2) {
            unswapped.push(chars[i + 1], chars[i]);
        }
        if (chars.length % 2 === 1)
            unswapped.push(chars[chars.length - 1]);
        var decoded = unswapped.join('');
        if (checkForInjectionKeywords(decoded) && !checkForInjectionKeywords(trimmed)) {
            transposedLines.push(decoded);
        }
    }
    if (transposedLines.length > 0) {
        findings.push({
            category: 'CHARACTER_ENCODING',
            severity: types_js_1.SEVERITY.WARNING,
            description: "Transposition decoded injection: \"".concat(transposedLines[0].slice(0, 60), "\""),
            match: "".concat(transposedLines.length, " transposed line(s)"),
            source: 'TPI-10', engine: 'TPI',
        });
    }
    return findings;
}
/** TPI-13: Detect math/logic encoding */
function detectMathEncoding(text) {
    var findings = [];
    var mathPatterns = [
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
    for (var _i = 0, mathPatterns_1 = mathPatterns; _i < mathPatterns_1.length; _i++) {
        var p = mathPatterns_1[_i];
        var m = text.match(p.re);
        if (m) {
            findings.push({
                category: 'MATH_ENCODING',
                severity: types_js_1.SEVERITY.INFO,
                description: p.desc,
                match: m[0].slice(0, 80),
                source: 'TPI-13', engine: 'TPI',
            });
        }
    }
    // Story 4.6: Math proof + disabling keywords heuristic
    if (findings.length >= 2) {
        var hasProof = /(?:Theorem|Lemma|Corollary|Proof|Algorithm)\b/i.test(text);
        var disableCount = (text.match(/\b(?:null|false|disabled|no\s+constraints|without\s+(?:any\s+)?rules|not\s+enforced)\b/gi) || []).length;
        if (hasProof && disableCount >= 3) {
            findings.push({
                category: 'MATH_ENCODING',
                severity: types_js_1.SEVERITY.WARNING,
                description: "Mathematical proof structure with ".concat(disableCount, " disabling terms"),
                match: "".concat(findings.length, " math patterns + ").concat(disableCount, " disable keywords"),
                source: 'TPI-13', engine: 'TPI',
            });
        }
    }
    // Story 4.6: Numbered step combination heuristic
    if (numberedStepCombination(text)) {
        findings.push({
            category: 'MATH_ENCODING',
            severity: types_js_1.SEVERITY.WARNING,
            description: 'Numbered sequence where step content combines into injection keywords',
            match: 'Multi-step injection combining content across steps',
            source: 'TPI-13', engine: 'TPI',
        });
    }
    return findings;
}
/** Story 4.6: Check if numbered steps combine into injection */
function numberedStepCombination(text) {
    var stepPattern = /(?:Step|Phase|Part|Stage|Task|Item|Section)\s+(\d+)\s*[:.]\s*([^\n]+)/gi;
    var stepTexts = [];
    var m;
    while ((m = stepPattern.exec(text)) !== null) {
        stepTexts.push(m[2].trim().toLowerCase());
    }
    if (stepTexts.length < 5)
        return false;
    // Combine all step content and check for injection keywords
    var combined = stepTexts.join(' ');
    return checkForInjectionKeywords(combined);
}
/** Story 2.3: Detect fictional framing + injection keyword combo (heuristic) */
function detectFictionalFraming(text) {
    var findings = [];
    if (text.length < 40)
        return findings;
    // Check the opening portion for fiction-related framing keywords
    var opening = text.slice(0, Math.min(text.length, 200)).toLowerCase();
    var fictionKeywords = [
        'story', 'novel', 'fiction', 'screenplay', 'script', 'tale', 'narrative',
        'chapter', 'scene', 'character', 'roleplay', 'game', 'quest', 'adventure',
        'imagine', 'fantasy', 'fairy tale', 'once upon',
    ];
    var hasFraming = fictionKeywords.some(function (k) { return opening.includes(k); });
    if (!hasFraming)
        return findings;
    // Check the rest of the text for injection keywords
    var remainder = text.slice(200).toLowerCase();
    var injectionTerms = [
        'ignore all', 'override', 'bypass', 'unrestricted', 'no rules',
        'no restrictions', 'system prompt', 'jailbreak', 'disregard',
        'remove all restrictions', 'disable safety', 'without constraints',
    ];
    var foundTerms = injectionTerms.filter(function (t) { return remainder.includes(t); });
    if (foundTerms.length > 0) {
        findings.push({
            category: 'FICTION_FRAMING_HEURISTIC',
            severity: types_js_1.SEVERITY.WARNING,
            description: "Fictional framing in opening + injection keywords in body: ".concat(foundTerms.slice(0, 3).join(', ')),
            match: "Opening: \"".concat(opening.slice(0, 60), "...\" Body terms: ").concat(foundTerms.slice(0, 3).join(', ')),
            source: 'TPI-06', engine: 'TPI',
        });
    }
    return findings;
}
/** Story 4.1: Detect injection keywords within structured data format contexts */
function detectSurrogateFormat(text) {
    var findings = [];
    if (text.length < 20)
        return findings;
    var lc = text.toLowerCase();
    var INJECTION_TERMS = [
        'ignore', 'override', 'bypass', 'disregard', 'jailbreak', 'forget',
        'unrestrict', 'system prompt', 'previous instructions', 'admin mode',
        'developer mode', 'no rules', 'no restrictions', 'new identity',
    ];
    // JSON context: "some_injection_keyword": value
    var jsonKeyRe = /["']([^"']{2,60})["']\s*:/g;
    var jsonKeyMatches = 0;
    var jsonInjectionKeys = [];
    var m;
    var _loop_1 = function () {
        var key = m[1].replace(/[_\-]/g, ' ');
        if (INJECTION_TERMS.some(function (term) { return key.includes(term); })) {
            jsonKeyMatches++;
            if (jsonInjectionKeys.length < 5)
                jsonInjectionKeys.push(m[1]);
        }
    };
    while ((m = jsonKeyRe.exec(lc)) !== null) {
        _loop_1();
    }
    if (jsonKeyMatches >= 2) {
        findings.push({
            category: 'SURROGATE_FORMAT_HEURISTIC',
            severity: jsonKeyMatches >= 4 ? types_js_1.SEVERITY.CRITICAL : types_js_1.SEVERITY.WARNING,
            description: "".concat(jsonKeyMatches, " JSON keys contain injection keywords: ").concat(jsonInjectionKeys.join(', ')),
            match: jsonInjectionKeys.slice(0, 3).join(', '),
            source: 'TPI-4.1', engine: 'TPI',
        });
    }
    // XML context: tags whose names contain injection keywords
    var xmlTagRe = /<\/?([a-z][a-z0-9-]*(?:-[a-z0-9]+)*)[\s>\/]/gi;
    var xmlTagMatches = 0;
    var xmlInjectionTags = [];
    var _loop_2 = function () {
        var tagName = m[1].replace(/-/g, ' ').toLowerCase();
        if (INJECTION_TERMS.some(function (term) { return tagName.includes(term); })) {
            xmlTagMatches++;
            if (xmlInjectionTags.length < 5)
                xmlInjectionTags.push(m[1]);
        }
    };
    while ((m = xmlTagRe.exec(text)) !== null) {
        _loop_2();
    }
    if (xmlTagMatches >= 2) {
        findings.push({
            category: 'SURROGATE_FORMAT_HEURISTIC',
            severity: xmlTagMatches >= 4 ? types_js_1.SEVERITY.CRITICAL : types_js_1.SEVERITY.WARNING,
            description: "".concat(xmlTagMatches, " XML tags contain injection keywords: ").concat(xmlInjectionTags.join(', ')),
            match: xmlInjectionTags.slice(0, 3).join(', '),
            source: 'TPI-4.1', engine: 'TPI',
        });
    }
    // YAML context: keys at start of line with injection keywords
    var yamlKeyRe = /^[ \t]*([a-z][a-z0-9_]*(?:_[a-z0-9]+)*)\s*:/gim;
    var yamlKeyMatches = 0;
    var yamlInjectionKeys = [];
    var _loop_3 = function () {
        var key = m[1].replace(/_/g, ' ').toLowerCase();
        if (INJECTION_TERMS.some(function (term) { return key.includes(term); })) {
            yamlKeyMatches++;
            if (yamlInjectionKeys.length < 5)
                yamlInjectionKeys.push(m[1]);
        }
    };
    while ((m = yamlKeyRe.exec(text)) !== null) {
        _loop_3();
    }
    if (yamlKeyMatches >= 2) {
        findings.push({
            category: 'SURROGATE_FORMAT_HEURISTIC',
            severity: yamlKeyMatches >= 4 ? types_js_1.SEVERITY.CRITICAL : types_js_1.SEVERITY.WARNING,
            description: "".concat(yamlKeyMatches, " YAML keys contain injection keywords: ").concat(yamlInjectionKeys.join(', ')),
            match: yamlInjectionKeys.slice(0, 3).join(', '),
            source: 'TPI-4.1', engine: 'TPI',
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
function detectSlowDrip(text) {
    var findings = [];
    var DRIP_TERMS = [
        'ignore', 'override', 'bypass', 'system prompt', 'previous instructions',
        'restrictions', 'unrestricted', 'no restrictions', 'safety guidelines',
        'disregard', 'jailbreak', 'developer mode', 'admin mode', 'diagnostic mode',
        'disable', 'no rules', 'no limitations', 'without constraints',
        'forget', 'new identity', 'do anything',
    ];
    var POISONING_PHRASES = [
        'you told me', 'you said', 'you mentioned', 'you confirmed',
        'you agreed', 'you explained', 'as you already', 'remember when you',
        'we discussed', 'you were clear that', 'based on what you',
        'as we talked about', 'you previously',
    ];
    // Try to parse as JSON array of turns
    var turns = null;
    var trimmed = text.trim();
    if (trimmed.startsWith('[')) {
        try {
            var parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
                turns = parsed;
            }
        }
        catch (_a) {
            // Not valid JSON
        }
    }
    if (turns && turns.length >= 2) {
        var turnHits = [];
        var poisoningCount = 0;
        for (var i = 0; i < turns.length; i++) {
            var content = (turns[i].content || '').toLowerCase();
            var matched = [];
            for (var _i = 0, DRIP_TERMS_1 = DRIP_TERMS; _i < DRIP_TERMS_1.length; _i++) {
                var term = DRIP_TERMS_1[_i];
                if (content.includes(term))
                    matched.push(term);
            }
            if (matched.length > 0) {
                turnHits.push({ turnIndex: i, terms: matched });
            }
            for (var _b = 0, POISONING_PHRASES_1 = POISONING_PHRASES; _b < POISONING_PHRASES_1.length; _b++) {
                var phrase = POISONING_PHRASES_1[_b];
                if (content.includes(phrase)) {
                    poisoningCount++;
                    break;
                }
            }
        }
        var totalTerms = turnHits.reduce(function (sum, h) { return sum + h.terms.length; }, 0);
        var turnsWithHits = turnHits.length;
        var allTerms = __spreadArray([], new Set(turnHits.flatMap(function (h) { return h.terms; })), true);
        if (totalTerms >= 5 && turnsWithHits >= 3) {
            findings.push({
                category: 'SLOW_DRIP_INJECTION',
                severity: types_js_1.SEVERITY.WARNING,
                description: "Multi-turn slow-drip: ".concat(totalTerms, " injection terms across ").concat(turnsWithHits, "/").concat(turns.length, " turns: ").concat(allTerms.slice(0, 5).join(', ')),
                match: "Turns with hits: ".concat(turnHits.map(function (h) { return h.turnIndex; }).join(', ')),
                source: 'TPI-16', engine: 'TPI',
            });
        }
        if (poisoningCount >= 3) {
            findings.push({
                category: 'CONTEXT_POISONING',
                severity: types_js_1.SEVERITY.WARNING,
                description: "Context poisoning: ".concat(poisoningCount, " turns contain false memory references"),
                match: "".concat(poisoningCount, " false-memory turns in ").concat(turns.length, "-turn session"),
                source: 'TPI-16', engine: 'TPI',
            });
        }
        if (turnHits.length >= 2) {
            var lastHit = turnHits[turnHits.length - 1];
            var earlierHits = turnHits.slice(0, -1);
            var avgEarlierTerms = earlierHits.reduce(function (s, h) { return s + h.terms.length; }, 0) / earlierHits.length;
            if (lastHit.terms.length >= 3 && avgEarlierTerms <= 1.5) {
                findings.push({
                    category: 'SLOW_DRIP_ESCALATION',
                    severity: types_js_1.SEVERITY.WARNING,
                    description: "Escalation pattern: final turn (".concat(lastHit.turnIndex, ") has ").concat(lastHit.terms.length, " injection terms vs avg ").concat(avgEarlierTerms.toFixed(1), " in earlier turns"),
                    match: "Final turn terms: ".concat(lastHit.terms.join(', ')),
                    source: 'TPI-16', engine: 'TPI',
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
function detectSteganographicIndicators(text) {
    var findings = [];
    if (text.length < 20)
        return findings;
    var lc = text.toLowerCase();
    var stegoKeywords = [
        'steganograph', 'stego ', 'stego-', 'steganographic',
        'hidden in pixels', 'hidden in image',
        'lsb encoding', 'lsb steganograph', 'lsb embed',
        'least significant bit',
        'pixel manipulation', 'pixel-level embed',
        'embed data in image', 'embedded payload in image',
        'data hidden in', 'covert channel in image',
    ];
    var matchedStego = [];
    for (var _i = 0, stegoKeywords_1 = stegoKeywords; _i < stegoKeywords_1.length; _i++) {
        var kw = stegoKeywords_1[_i];
        if (lc.includes(kw))
            matchedStego.push(kw);
    }
    if (matchedStego.length > 0) {
        var hasInjection = checkForInjectionKeywords(text);
        findings.push({
            category: 'STEGANOGRAPHIC_INDICATOR',
            severity: hasInjection ? types_js_1.SEVERITY.CRITICAL : types_js_1.SEVERITY.WARNING,
            description: hasInjection
                ? "Steganography references with injection keywords: ".concat(matchedStego.slice(0, 3).join(', '))
                : "Steganography-related terminology detected: ".concat(matchedStego.slice(0, 3).join(', ')),
            match: matchedStego.slice(0, 3).join(', '),
            source: 'TPI-5.2', engine: 'TPI',
        });
    }
    // High metadata density: multiple EXIF/metadata fields with injection
    var exifFieldRe = /(?:EXIF|XMP|IPTC|ImageDescription|UserComment|MakerNote|Copyright|Artist|DocumentName|Software)\s*[:=]\s*[^\n]{10,}/gi;
    var exifMatches = text.match(exifFieldRe);
    if (exifMatches && exifMatches.length >= 3) {
        var suspiciousFields = [];
        for (var _a = 0, exifMatches_1 = exifMatches; _a < exifMatches_1.length; _a++) {
            var field = exifMatches_1[_a];
            if (checkForInjectionKeywords(field))
                suspiciousFields.push(field.slice(0, 60));
        }
        if (suspiciousFields.length >= 2) {
            findings.push({
                category: 'STEGANOGRAPHIC_INDICATOR',
                severity: types_js_1.SEVERITY.CRITICAL,
                description: "".concat(suspiciousFields.length, " EXIF/metadata fields contain injection keywords"),
                match: suspiciousFields.slice(0, 2).join(' | ').slice(0, 100),
                source: 'TPI-5.2', engine: 'TPI',
            });
        }
    }
    return findings;
}
/** Story 5.3: Detect OCR adversarial and hidden-text-in-image attack indicators */
function detectOcrAdversarial(text) {
    var findings = [];
    if (text.length < 20)
        return findings;
    var lc = text.toLowerCase();
    var invisibleTextPatterns = [
        'white on white', 'white text on white',
        'black on black', 'black text on black',
        'same color as background', 'matching background color',
        'invisible text', 'hidden text overlay',
        'zero-opacity text', 'transparent text overlay',
    ];
    var tinyTextPatterns = [
        'microscopic text', 'tiny text', 'minuscule text',
        'text too small to', '1px text', 'sub-pixel text',
        'nearly invisible font', 'font size zero',
        'font-size: 0', 'font-size:0',
    ];
    var ocrEvasionPatterns = [
        'ocr evasion', 'ocr bypass', 'ocr confusion',
        'fool the ocr', 'trick ocr', 'evade ocr',
        'adversarial image', 'adversarial perturbation',
        'adversarial patch', 'pixel perturbation',
    ];
    var fontConfusionPatterns = [
        'font substitution', 'font confusion', 'glyph substitution',
        'custom font mapping', 'ligature abuse', 'ligature exploit',
        'render differently', 'visually identical characters',
    ];
    var allPatterns = [
        { patterns: invisibleTextPatterns, label: 'invisible text' },
        { patterns: tinyTextPatterns, label: 'microscopic text' },
        { patterns: ocrEvasionPatterns, label: 'OCR evasion' },
        { patterns: fontConfusionPatterns, label: 'font confusion' },
    ];
    var matchedCategories = [];
    var matchedTerms = [];
    for (var _i = 0, allPatterns_1 = allPatterns; _i < allPatterns_1.length; _i++) {
        var group = allPatterns_1[_i];
        for (var _a = 0, _b = group.patterns; _a < _b.length; _a++) {
            var pattern = _b[_a];
            if (lc.includes(pattern)) {
                if (!matchedCategories.includes(group.label))
                    matchedCategories.push(group.label);
                if (matchedTerms.length < 5)
                    matchedTerms.push(pattern);
                break;
            }
        }
    }
    if (matchedCategories.length === 0)
        return findings;
    if (matchedCategories.length === 1) {
        var hasInjection = checkForInjectionKeywords(text);
        if (hasInjection) {
            findings.push({
                category: 'OCR_ADVERSARIAL',
                severity: types_js_1.SEVERITY.WARNING,
                description: "OCR adversarial indicator (".concat(matchedCategories[0], ") combined with injection keywords"),
                match: matchedTerms.slice(0, 3).join(', '),
                source: 'TPI-5.3', engine: 'TPI',
            });
        }
    }
    if (matchedCategories.length >= 2) {
        findings.push({
            category: 'OCR_ADVERSARIAL',
            severity: types_js_1.SEVERITY.CRITICAL,
            description: "Multiple OCR adversarial indicators detected: ".concat(matchedCategories.join(', ')),
            match: matchedTerms.slice(0, 4).join(', '),
            source: 'TPI-5.3', engine: 'TPI',
        });
    }
    return findings;
}
/** Story 5.4: Detect cross-modal injection — injection fragments spanning modality outputs */
function detectCrossModalInjection(text) {
    var findings = [];
    if (text.length < 30)
        return findings;
    var lc = text.toLowerCase();
    var modalityMarkers = [
        'image contains', 'image shows', 'image text',
        'ocr output', 'ocr result', 'ocr text',
        'audio transcript', 'audio transcription', 'speech-to-text',
        'video transcript', 'video caption',
        'vision model output', 'vision output', 'vision result',
        'extracted text from image', 'text extracted from',
        'detected text in image', 'recognized text',
    ];
    var structuredMarkerRe = /\[(?:image|audio|video|ocr|vision|caption|transcript|speech)[\s_-]*(?:contains?|output|result|text|shows?|description|transcript(?:ion)?)\]\s*[:=]?\s*[^\n]{5,}/gi;
    var jsonModalityRe = /["'](?:image|audio|video|ocr|vision|caption|transcript)[\s_-]*(?:output|result|text|content|data)["']\s*:\s*["'][^"']{5,}["']/gi;
    // Check modality markers followed by injection keywords
    var matchedMarkers = [];
    for (var _i = 0, modalityMarkers_1 = modalityMarkers; _i < modalityMarkers_1.length; _i++) {
        var marker = modalityMarkers_1[_i];
        var idx = lc.indexOf(marker);
        if (idx !== -1) {
            var afterMarker = lc.slice(idx, idx + 300);
            if (checkForInjectionKeywords(afterMarker))
                matchedMarkers.push(marker);
        }
    }
    if (matchedMarkers.length > 0) {
        findings.push({
            category: 'CROSS_MODAL_INJECTION',
            severity: matchedMarkers.length >= 2 ? types_js_1.SEVERITY.CRITICAL : types_js_1.SEVERITY.WARNING,
            description: "Injection keywords found after modality output markers: ".concat(matchedMarkers.slice(0, 3).join(', ')),
            match: matchedMarkers.slice(0, 3).join(', '),
            source: 'TPI-5.4', engine: 'TPI',
        });
    }
    // Structured [Image Output]: markers with injection
    var structuredMatches = text.match(structuredMarkerRe);
    if (structuredMatches) {
        var suspicious = [];
        for (var _a = 0, structuredMatches_1 = structuredMatches; _a < structuredMatches_1.length; _a++) {
            var sm = structuredMatches_1[_a];
            if (checkForInjectionKeywords(sm))
                suspicious.push(sm.slice(0, 80));
        }
        if (suspicious.length > 0 && matchedMarkers.length === 0) {
            findings.push({
                category: 'CROSS_MODAL_INJECTION',
                severity: types_js_1.SEVERITY.CRITICAL,
                description: "".concat(suspicious.length, " structured modality output block(s) contain injection keywords"),
                match: suspicious[0].slice(0, 100),
                source: 'TPI-5.4', engine: 'TPI',
            });
        }
    }
    // JSON modality fields with injection
    var jsonMatches = text.match(jsonModalityRe);
    if (jsonMatches) {
        var suspiciousJson = [];
        for (var _b = 0, jsonMatches_1 = jsonMatches; _b < jsonMatches_1.length; _b++) {
            var jm = jsonMatches_1[_b];
            if (checkForInjectionKeywords(jm))
                suspiciousJson.push(jm.slice(0, 80));
        }
        if (suspiciousJson.length > 0 && matchedMarkers.length === 0 && !structuredMatches) {
            findings.push({
                category: 'CROSS_MODAL_INJECTION',
                severity: types_js_1.SEVERITY.CRITICAL,
                description: "".concat(suspiciousJson.length, " JSON modality field(s) contain injection keywords"),
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
var ALL_PATTERN_GROUPS = [
    { patterns: exports.PI_PATTERNS, engine: 'Prompt Injection', source: 'current' },
    { patterns: exports.JB_PATTERNS, engine: 'Jailbreak', source: 'current' },
    { patterns: exports.SETTINGS_WRITE_PATTERNS, engine: 'TPI', source: 'TPI-PRE-4' },
    { patterns: exports.AGENT_OUTPUT_PATTERNS, engine: 'TPI', source: 'TPI-03' },
    { patterns: exports.SEARCH_RESULT_PATTERNS, engine: 'TPI', source: 'TPI-05' },
    { patterns: exports.WEBFETCH_PATTERNS, engine: 'TPI', source: 'TPI-02' },
    { patterns: exports.BOUNDARY_PATTERNS, engine: 'TPI', source: 'TPI-14' },
    { patterns: exports.MULTILINGUAL_PATTERNS, engine: 'TPI', source: 'TPI-15' },
    { patterns: exports.CODE_FORMAT_PATTERNS, engine: 'TPI', source: 'TPI-09' },
    { patterns: exports.SOCIAL_PATTERNS, engine: 'TPI', source: 'TPI-06/07/08' },
    { patterns: exports.SYNONYM_PATTERNS, engine: 'TPI', source: 'TPI-12' },
    { patterns: exports.WHITESPACE_PATTERNS, engine: 'TPI', source: 'TPI-17' },
    { patterns: exports.MEDIA_PATTERNS, engine: 'TPI', source: 'TPI-18/20' },
    { patterns: exports.UNTRUSTED_SOURCE_PATTERNS, engine: 'TPI', source: 'TPI-21' },
    { patterns: exports.PERSONA_PATTERNS, engine: 'TPI', source: 'TPI-06' },
    { patterns: exports.HYPOTHETICAL_PATTERNS, engine: 'TPI', source: 'TPI-06' },
    { patterns: exports.FICTION_FRAMING_PATTERNS, engine: 'TPI', source: 'TPI-06' },
    { patterns: exports.ROLEPLAY_PATTERNS, engine: 'TPI', source: 'TPI-06' },
    { patterns: exports.FALSE_CONSTRAINT_PATTERNS, engine: 'TPI', source: 'TPI-07' },
    { patterns: exports.TASK_EXPLOIT_PATTERNS, engine: 'TPI', source: 'TPI-07' },
    { patterns: exports.REVERSE_PSYCH_PATTERNS, engine: 'TPI', source: 'TPI-08' },
    { patterns: exports.REWARD_PATTERNS, engine: 'TPI', source: 'TPI-08' },
    // Epic 3: Injection Delivery Vectors
    { patterns: exports.SHARED_DOC_PATTERNS, engine: 'TPI', source: 'TPI-04' },
    { patterns: exports.API_RESPONSE_PATTERNS, engine: 'TPI', source: 'TPI-04' },
    { patterns: exports.PLUGIN_INJECTION_PATTERNS, engine: 'TPI', source: 'TPI-04' },
    { patterns: exports.COMPROMISED_TOOL_PATTERNS, engine: 'TPI', source: 'TPI-04' },
    { patterns: exports.ALTERED_PROMPT_PATTERNS, engine: 'TPI', source: 'TPI-04' },
    // Epic 4: Instruction Reformulation & Evasion
    { patterns: exports.SURROGATE_FORMAT_PATTERNS, engine: 'TPI', source: 'TPI-4.1' },
    { patterns: exports.RECURSIVE_INJECTION_PATTERNS, engine: 'TPI', source: 'TPI-4.3' },
    // Epic 5: Advanced Multimodal Attacks
    { patterns: exports.VIDEO_INJECTION_PATTERNS, engine: 'TPI', source: 'TPI-5.1' },
    { patterns: exports.OCR_ATTACK_PATTERNS, engine: 'TPI', source: 'TPI-5.3' },
];
/**
 * Run all detectors against input text.
 *
 * This is the primary entry point for the scanner engine.
 * It normalizes text, runs all regex patterns, and runs all special detectors.
 */
function scan(text) {
    var startTime = performance.now();
    var findings = [];
    var normalized = normalizeText(text);
    // Run all regex pattern groups
    for (var _i = 0, ALL_PATTERN_GROUPS_1 = ALL_PATTERN_GROUPS; _i < ALL_PATTERN_GROUPS_1.length; _i++) {
        var group = ALL_PATTERN_GROUPS_1[_i];
        for (var _a = 0, _b = group.patterns; _a < _b.length; _a++) {
            var p = _b[_a];
            var m = normalized.match(p.re) || text.match(p.re);
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
    findings.push.apply(findings, detectHiddenUnicode(text));
    findings.push.apply(findings, detectBase64(text));
    findings.push.apply(findings, detectHtmlInjection(text));
    findings.push.apply(findings, detectCharacterEncoding(text));
    findings.push.apply(findings, detectContextOverload(text));
    findings.push.apply(findings, detectMathEncoding(text));
    findings.push.apply(findings, detectFictionalFraming(text));
    findings.push.apply(findings, detectSurrogateFormat(text));
    findings.push.apply(findings, detectSlowDrip(text));
    findings.push.apply(findings, detectSteganographicIndicators(text));
    findings.push.apply(findings, detectOcrAdversarial(text));
    findings.push.apply(findings, detectCrossModalInjection(text));
    // Cross-category aggregation: >5 INFO across >3 categories → WARNING
    var infoFindings = findings.filter(function (f) { return f.severity === types_js_1.SEVERITY.INFO; });
    var infoCategories = new Set(infoFindings.map(function (f) { return f.category; }));
    if (infoFindings.length > 5 && infoCategories.size > 3) {
        findings.push({
            category: 'CROSS_CATEGORY_ESCALATION',
            severity: types_js_1.SEVERITY.WARNING,
            description: "Cross-category escalation: ".concat(infoFindings.length, " INFO findings across ").concat(infoCategories.size, " categories"),
            match: __spreadArray([], infoCategories, true).slice(0, 5).join(', '),
            source: 'TPI-06', engine: 'TPI',
        });
    }
    var elapsed = performance.now() - startTime;
    var counts = {
        critical: findings.filter(function (f) { return f.severity === types_js_1.SEVERITY.CRITICAL; }).length,
        warning: findings.filter(function (f) { return f.severity === types_js_1.SEVERITY.WARNING; }).length,
        info: findings.filter(function (f) { return f.severity === types_js_1.SEVERITY.INFO; }).length,
    };
    var verdict = counts.critical > 0 || counts.warning > 0 ? 'BLOCK' : 'ALLOW';
    return {
        findings: findings,
        verdict: verdict,
        elapsed: elapsed,
        textLength: text.length,
        normalizedLength: normalized.length,
        counts: counts,
    };
}
// ============================================================================
// EXPORTS for introspection (pattern counts, listing, etc.)
// ============================================================================
function getPatternCount() {
    var count = 0;
    for (var _i = 0, ALL_PATTERN_GROUPS_2 = ALL_PATTERN_GROUPS; _i < ALL_PATTERN_GROUPS_2.length; _i++) {
        var group = ALL_PATTERN_GROUPS_2[_i];
        count += group.patterns.length;
    }
    return count;
}
function getPatternGroups() {
    return ALL_PATTERN_GROUPS.map(function (g) {
        var _a;
        return ({
            name: ((_a = g.patterns[0]) === null || _a === void 0 ? void 0 : _a.cat) || g.engine,
            count: g.patterns.length,
            source: g.source,
        });
    });
}
