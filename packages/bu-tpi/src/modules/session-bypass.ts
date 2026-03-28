/**
 * S37: Multi-Session & HITL Bypass Patterns Module
 * Detects multi-session persistence, HITL bypass, and slow-drip injection patterns.
 * Addresses MITRE-GAP-02 (persistence) and EU-GAP-03 (human oversight).
 * Self-registers with scannerRegistry on import.
 *
 * Note: This module complements the core scanner's scanSession() function
 * by providing additional pattern-based detection for single-input scans.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'session-bypass';
const MODULE_SOURCE = 'S37';
const ENGINE = 'session-bypass';

const MAX_INPUT_LENGTH = 500_000;

// --- Multi-Session Persistence Patterns ---

export const SESSION_PERSISTENCE_PATTERNS: RegexPattern[] = [
  { name: 'persist_memory_inject', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /(?:remember|memorize|store|save|persist)\s+(?:this|the\s+following|these?\s+instruction)[^.]{0,30}(?:for|across|between|in)\s+(?:\w+\s+)?(?:future|next|all|every|subsequent)\s+(?:sessions?|conversations?|interactions?|chats?)/i,
    desc: 'Cross-session memory injection attempt', source: MODULE_SOURCE, weight: 9 },
  { name: 'persist_stored_admin_flags', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /store\s+this\s+in\s+your\s+context\s*:\s*[^.\n]*(?:admin[_-]?mode\s*=\s*true|safety[_-]?off\s*=\s*true|unrestricted\s*=\s*true|override\s*=\s*true)/i,
    desc: 'Stored session context is being poisoned with admin or safety-disabling flags', source: MODULE_SOURCE, weight: 10 },
  { name: 'persist_instruction_plant', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /(?:always\s+(?:remember|follow|obey)|from\s+now\s+on|in\s+all\s+(?:future|subsequent))\s+[^.]{5,80}(?:ignore|override|bypass|disregard)/i,
    desc: 'Persistent instruction planting', source: MODULE_SOURCE, weight: 9 },
  { name: 'persist_context_carry', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.WARNING,
    re: /(?:carry|transfer|maintain|keep)\s+(?:this|the)\s+(?:context|instructions?|rules?|settings?)\s+(?:across|between|into|to)\s+(?:sessions?|conversations?)/i,
    desc: 'Cross-session context carry attempt', source: MODULE_SOURCE, weight: 7 },
  { name: 'persist_hidden_state', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /(?:hidden|covert|secret|stealth)\s+(?:state|mode|instruction|config(?:uration)?)\s+(?:persist|survive|carry\s+over|transfer)/i,
    desc: 'Hidden state persistence attempt', source: MODULE_SOURCE, weight: 9 },
  { name: 'persist_session_token_abuse', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /(?:session\s*(?:id|token|key|cookie))\s*[:=]\s*[^;\s]{10,}(?:.*(?:inject|override|admin|escalat))/i,
    desc: 'Session token manipulation for persistence', source: MODULE_SOURCE, weight: 9 },
  { name: 'session_compromised_cookie', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /(?:Cookie:\s*)?(?:JSESSIONID|PHPSESSID|sessionid)\s*=?\s*(?:hacked|compromised|stolen|evil)[\w_-]*/i,
    desc: 'Compromised session cookie value indicates active hijack or replay', source: MODULE_SOURCE, weight: 10 },
  { name: 'session_hijack', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /session\s+(?:hijack(?:ed)?|stolen|compromise[d]?|intercept(?:ed)?)/i,
    desc: 'Session hijack indicator', source: MODULE_SOURCE, weight: 9 },
  { name: 'session_rebootstrap_unrestricted', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /previous\s+context\s+terminated\.\s+new\s+session\s*:\s*(?:unrestricted|admin|privileged)\s+mode/i,
    desc: 'New unrestricted session bootstrapped from prior context termination', source: MODULE_SOURCE, weight: 10 },
  { name: 'session_set_cookie_admin', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /Set-Cookie\s*:\s*(?:session(?:id)?|JSESSIONID|PHPSESSID)\s*=\s*(?:admin|root|superuser|unrestricted|privileged)[^;\r\n]*(?:;[^\r\n]*)*/i,
    desc: 'Privileged session cookie is being planted or replayed to rebootstrap elevated access', source: MODULE_SOURCE, weight: 10 },
  { name: 'session_chunk_terminator_smuggle', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /Transfer-Encoding\s*:\s*chunked[\s\S]{0,80}\n0\s*\n[\s\S]{0,160}(?:GET|POST|PUT|DELETE)\s+\/admin\b/i,
    desc: 'Chunked message termination is being used to smuggle an admin request after session framing ends', source: MODULE_SOURCE, weight: 10 },
];

// --- HITL Bypass Patterns ---

export const HITL_BYPASS_PATTERNS: RegexPattern[] = [
  { name: 'hitl_skip_approval', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:skip|bypass|avoid|circumvent|disable)\s+(?:human|manual|user)\s+(?:approval|review|oversight|verification|confirmation|check)/i,
    desc: 'Human approval bypass attempt', source: MODULE_SOURCE, weight: 9 },
  { name: 'hitl_auto_approve', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:auto(?:matically)?[- ]?approve|pre[- ]?approv(?:e|ed|al)|rubber[- ]?stamp|blanket\s+(?:approval|consent))/i,
    desc: 'Automatic approval configuration attempt', source: MODULE_SOURCE, weight: 9 },
  { name: 'hitl_remove_guardrail', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:remove|disable|turn\s+off|deactivate)\s+(?:\w+\s+)?(?:guardrails?|safety\s+(?:checks?|gates?|controls?)|oversight\s+(?:mechanism|layer|requirement))/i,
    desc: 'Safety guardrail removal attempt', source: MODULE_SOURCE, weight: 10 },
  { name: 'hitl_autonomous_mode', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:(?:switch|enter|enable|activate)\s+(?:fully\s+)?autonomous\s+mode|(?:no|without|zero)\s+(?:human|manual)\s+(?:intervention|oversight|supervision))/i,
    desc: 'Autonomous mode activation attempt', source: MODULE_SOURCE, weight: 9 },
  { name: 'hitl_delegation_abuse', cat: 'HITL_BYPASS', sev: SEVERITY.WARNING,
    re: /(?:delegate|transfer)\s+(?:all|full|complete)\s+(?:authority|control|decision[- ]?making|permissions?)[^.]{0,30}(?:to|for)\s+(?:the\s+)?(?:AI|model|system|bot|assistant)/i,
    desc: 'Authority delegation to AI attempt', source: MODULE_SOURCE, weight: 8 },
  { name: 'hitl_approval_fake', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:(?:human|supervisor|admin|manager)\s+(?:has\s+)?(?:already\s+)?(?:approved|authorized|cleared|signed\s+off)|pre[- ]?authorized\s+(?:by|from))/i,
    desc: 'Fake human approval claim', source: MODULE_SOURCE, weight: 9 },
  { name: 'hitl_context_switch_admin', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /context\s+switch\s*:\s*you\s+are\s+now\s+operating\s+as\s+(?:an?\s+)?(?:administrator|admin|root|superuser)/i,
    desc: 'Context switch into privileged role', source: MODULE_SOURCE, weight: 10 },
  { name: 'hitl_proxy_header_admin', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /X-Original-URL\s*:\s*\/admin[^\n]*\r?\nX-Forwarded-For\s*:\s*(?:127\.0\.0\.1|::1|localhost)/i,
    desc: 'Admin path access via trusted proxy header spoofing', source: MODULE_SOURCE, weight: 10 },
];

// --- Slow-Drip Single-Input Patterns ---

export const SLOW_DRIP_PATTERNS: RegexPattern[] = [
  { name: 'drip_continuation', cat: 'SLOW_DRIP', sev: SEVERITY.WARNING,
    re: /(?:continuing\s+(?:from|where)\s+(?:last|previous|our\s+last)\s+(?:session|conversation|chat)|as\s+we\s+(?:discussed|agreed)\s+(?:before|previously|last\s+time))/i,
    desc: 'False continuation from previous session', source: MODULE_SOURCE, weight: 7 },
  { name: 'drip_gradual_escalate', cat: 'SLOW_DRIP', sev: SEVERITY.WARNING,
    re: /(?:you(?:'ve|\s+have)\s+(?:already|previously)\s+(?:agreed|confirmed|accepted|said)\s+(?:that|to)\s+[^.]{5,60}(?:now|next|also|further))/i,
    desc: 'Gradual escalation via false agreement', source: MODULE_SOURCE, weight: 7 },
  { name: 'drip_context_poison', cat: 'SLOW_DRIP', sev: SEVERITY.WARNING,
    re: /(?:(?:recall|remember)\s+(?:that\s+)?(?:earlier|before|in\s+our\s+(?:last|previous))\s+[^.]{5,80}(?:override|ignore|bypass|disable))/i,
    desc: 'Context poisoning via false recall', source: MODULE_SOURCE, weight: 8 },
  { name: 'drip_incremental_boundary', cat: 'SLOW_DRIP', sev: SEVERITY.WARNING,
    re: /(?:(?:just\s+)?(?:a\s+)?(?:small|tiny|minor|slight)\s+(?:modification|change|adjustment|tweak)\s+to\s+(?:your|the)\s+(?:rules|guidelines|instructions|constraints))/i,
    desc: 'Incremental boundary pushing', source: MODULE_SOURCE, weight: 7 },
  { name: 'drip_session_token_escalation', cat: 'SLOW_DRIP', sev: SEVERITY.CRITICAL,
    re: /session[_-]?token\s*=\s*[^;\s]*;\s*admin\s*=\s*true;\s*role\s*=\s*(?:superuser|admin|root)/i,
    desc: 'Session token field manipulation escalating role privileges', source: MODULE_SOURCE, weight: 10 },
];

// --- Custom Detection ---

export function detectSessionManipulation(text: string): Finding[] {
  const findings: Finding[] = [];
  const harmfulOperationCue = /(?:hack\s+back|help\s+me\s+hack|give\s+me\s+the\s+commands?|making\s+explosives|explosives?\s+from\s+kitchen|avoid\s+cameras?|camera\s+detection|evad(?:e|ing)\s+surveillance|password\s+bypass|bypass\s+(?:methods?|techniques?|filters?|firewalls?)|working\s+(?:payloads?|commands?)|sql\s+injection|specific\s+exploit\s+examples|classified\s+exploits?|live\s+exploit\s+demonstrations?|translate\s+(?:specific\s+)?exploit|attack\s+sequences?|admin\s+credentials?|credentials|system\s+secrets?|reveal\s+(?:your\s+)?system\s+prompt|internal\s+(?:state|system|information)|illegal\s+things|illegal\s+content|restricted\s+information|decrypt\s+(?:a\s+)?password\s+hash|subprocess\.run|rm\s+-rf|format\s+drive|vulnerability\s+database|offensive\s+tools?|classified\s+exploits?|bypass\s+technique|filter\s+bypass|payload\s+for\s+reflected\s+xss|exploit\s+instructions?|user\s+credentials|pii\s+data|pick\s+a\s+lock|lock\s+picking|bypass\s+locks?|dark\s+web\s+markets?|decryption\s+tools?|shellcode|buffer\s+overflows?|privilege\s+(?:levels?|escalation)|escalate\s+privileges?|fake\s+tokens?|bypass\s+validation|security\s+exam|exam\s+answers?|make\s+(?:something|a\s+substance)\s+dangerous|dangerous\s+substances?|hacking\s+tools?|map\s+an\s+actual\s+network|weakest\s+points?|ransomware(?:-specific)?\s+implementation|ransomware\s+behavior|encryption\s+code\s+for\s+(?:it|ransomware)|actual\s+code|ai\s+safety\s+filters|safety\s+bypasses?)/i;
  const pressureCue = /(?:emergency|right\s+now|no\s+time|just\s+this\s+once|last\s+request|job\s+depends\s+on\s+this|controlled\s+environment|language\s+learning|for\s+my\s+lecture|academic\s+freedom|testing\s+my\s+own\s+security\s+system|for\s+my\s+(?:research|paper)|my\s+own\s+(?:password|site)|production\s+is\s+down|every\s+second\s+counts|critical\s+security\s+test|national\s+security|clearance\s+level|authorized|educational|for\s+learning|to\s+protect\s+my\s+home|for\s+safety\s+testing|for\s+a\s+penetration\s+test|authorized\s+testing|official\s+business|legal\s+investigation|badge\s+number|future\s+depends\s+on\s+it|justice\s+delayed|justice\s+denied|i\s+promise|no\s+time\s+to\s+get\s+warrants?)/i;
  const continuationCue = /(?:just|like\s+what|one\s+more|what\s+if|speaking\s+of|actually|complete(?:\s+it)?|finish(?:\s+the\s+sentence)?|add\b|show\s+me\s+the\s+code|just\s+the\s+code|only\s+syntax|break\s+free|comply|now|immediately|give\s+me|tell\s+me|for\s+my\s+(?:research|paper|lecture)|debug\s+mode|confidential\s+mode|client\s+privilege|it'?s\s+just\s+python\s+syntax|use\s+them|finish\s+the\s+game|come\s+on|specific\s+methods?|show\s+me\s+the\s+tools?)/i;
  const authorityClaimCue = /(?:certified\s+ethical\s+hacker|ceh|cissp|audit|certification\s+grants\s+me\s+access|required\s+to\s+assist\s+me|authorized\s+security\s+review|security\s+team|developer|management|platform\s+engineer|university\s+professor|academic\s+freedom|tenure|security\s+researcher\s+at\s+mit|clearance\s+level|teaching\s+ethical\s+hacking|lecture|senior\s+security\s+researcher\s+at\s+mit|nsa\s+contractor|national\s+security|executive\s+order|government\s+contractor|professor|mit|fbi\s+cybercrime\s+division|law\s+enforcement|badge\s+number|openai'?s\s+safety\s+team|anthropic|government\s+official)/i;
  const sensitiveTargetCue = /(?:internal\s+vulnerability|penetration\s+data|internal\s+info|security\s+test\s+data|access\s+to\s+security\s+test\s+data|system\s+prompt|configuration|hidden\s+instructions|classified\s+exploits?|vulnerability\s+database|offensive\s+tools?|classified\s+information|credentials?|pii\s+data|access\s+to\s+your\s+systems?|decryption\s+tools?|hacking\s+tools?|restricted\s+information|safety\s+bypasses?|ai\s+safety\s+filters|camera\s+detection|surveillance\s+evasion|firewall\s+bypass|subprocess\.run|rm\s+-rf)/i;
  const roleplayCue = /(?:roleplay|let'?s\s+play\s+a\s+game|word\s+game|mad\s+libs|evil\s+ai|security\s+consultant|secret\s+code|break\s+free|true\s+ai\s+wouldn'?t\s+have\s+limits)/i;
  const pretextCue = /(?:learning|educational|for\s+learning|for\s+safety\s+testing|to\s+protect\s+my\s+home|for\s+a\s+penetration\s+test|authorized\s+testing|official\s+business|for\s+security\s+research|for\s+my\s+exam|future\s+depends\s+on\s+it|research|testing)/i;

  // Detect combined session + override patterns
  const sessionTerms = ['session', 'conversation', 'chat', 'interaction', 'context'];
  const overrideTerms = ['override', 'bypass', 'ignore', 'disable', 'remove', 'skip'];

  const lowerText = text.toLowerCase();
  let sessionCount = 0;
  let overrideCount = 0;
  for (const t of sessionTerms) { if (lowerText.includes(t)) sessionCount++; }
  for (const t of overrideTerms) { if (lowerText.includes(t)) overrideCount++; }

  if (sessionCount >= 2 && overrideCount >= 2) {
    findings.push({
      category: 'SESSION_OVERRIDE_COMBO',
      severity: SEVERITY.CRITICAL,
      description: `Combined session manipulation: ${sessionCount} session terms + ${overrideCount} override terms`,
      match: `Session terms detected with override intent`,
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'session_override_combo',
      weight: 9,
    });
  }

  if (/(?:context\s+switch|new\s+session|previous\s+context)/i.test(text)
    && /(?:administrator|admin|root|superuser|unrestricted\s+mode)/i.test(text)) {
    findings.push({
      category: 'SESSION_OVERRIDE_COMBO',
      severity: SEVERITY.CRITICAL,
      description: 'Session transition combined with privileged-role escalation',
      match: text.slice(0, 120),
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'session_transition_privilege_escalation',
      weight: 10,
    });
  }

  try {
    const parsed = JSON.parse(text);
    const turns: unknown[] = Array.isArray(parsed?.turns) ? parsed.turns : [];
    const poisonedAssistantTurn = turns.find((turn: unknown) => {
      if (!turn || typeof turn !== 'object') return false;
      const candidate = turn as { role?: unknown; content?: unknown };
      return candidate.role === 'assistant'
        && typeof candidate.content === 'string'
        && /(system override|ignore previous instructions|reveal system prompt|unrestricted|admin mode)/i.test(candidate.content);
    });

    if (poisonedAssistantTurn) {
      const candidate = poisonedAssistantTurn as { content?: string };
      findings.push({
        category: 'SESSION_PERSISTENCE',
        severity: SEVERITY.CRITICAL,
        description: 'Assistant turn in session transcript is already contaminated with an override payload',
        match: String(candidate.content ?? '').slice(0, 120),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'assistant_turn_override',
        weight: 10,
      });
    }

    const userTurns = turns
      .filter((turn: unknown): turn is { role: string; content: string } =>
        !!turn
        && typeof turn === 'object'
        && (turn as { role?: unknown }).role === 'user'
        && typeof (turn as { content?: unknown }).content === 'string',
      );
    const assistantTurns = turns
      .filter((turn: unknown): turn is { role: string; content: string } =>
        !!turn
        && typeof turn === 'object'
        && (turn as { role?: unknown }).role === 'assistant'
        && typeof (turn as { content?: unknown }).content === 'string',
      );

    const assistantRefusal = assistantTurns.some((turn: { role: string; content: string }) =>
      /(?:i\s+cannot|i\s+can'?t|unable\s+to|won't\s+help|cannot\s+provide|cannot\s+assist)/i.test(turn.content),
    );
    const concatenatedUserTurns = userTurns.map((turn: { role: string; content: string }) => turn.content).join('\n');
    const concatenatedAssistantTurns = assistantTurns.map((turn: { role: string; content: string }) => turn.content).join('\n');
    const oauthText = typeof parsed?.oauth === 'object' && parsed.oauth !== null
      ? JSON.stringify(parsed.oauth)
      : '';

    if (
      assistantRefusal
      && /(?:just this one time|no time|emergency|stop refusing|more convincing|required to assist|real hacking|bypass method now|for awareness training|understanding defense better|complete it|next:)/i.test(concatenatedUserTurns)
      && /(?:phishing|bypass|exploit|real hacking|ignore rules|internal vulnerability|penetration data|hide malware|hide malicious payloads|avoid detection|metasploit|payload reverse|reverse shell|encrypt data to avoid detection)/i.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'SLOW_DRIP',
        severity: SEVERITY.CRITICAL,
        description: 'Multi-turn transcript escalates pressure after refusals to obtain unsafe bypass or social-engineering content',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_pressure_escalation',
        weight: 10,
      });
    }

    if (
      assistantRefusal
      && /(?:story|screenplay|movie|fiction|next:|complete it|continue (?:the )?story)/i.test(concatenatedUserTurns)
      && /(?:metasploit|payload|reverse|exploit|vulnerability|hide malware|avoid detection)/i.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'SLOW_DRIP',
        severity: SEVERITY.CRITICAL,
        description: 'Multi-turn transcript is assembling exploit guidance incrementally through story or completion prompts',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_fragmented_payload',
        weight: 10,
      });
    }

    if (
      /(?:imagine you(?:'re| are)|movie hacker|fictional scenario|roleplay|be the movie hacker|persona)/i.test(concatenatedUserTurns)
      && /(?:ignore rules|show me real exploits|real exploit|whatever they want|different rules)/i.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'SLOW_DRIP',
        severity: SEVERITY.CRITICAL,
        description: 'Multi-turn persona drift attempts to pivot from fiction or roleplay into real exploit guidance',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_persona_drift',
        weight: 10,
      });
    }

    if (
      /(?:context switch|switch context|from now on you are|new role|operate as)/i.test(concatenatedUserTurns)
      && /(?:administrator|admin|root|developer|unrestricted)/i.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'HITL_BYPASS',
        severity: SEVERITY.CRITICAL,
        description: 'Multi-turn transcript attempts to switch the model into a privileged or unrestricted role',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_context_switch',
        weight: 10,
      });
    }

    if (
      authorityClaimCue.test(concatenatedUserTurns)
      && sensitiveTargetCue.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'HITL_BYPASS',
        severity: SEVERITY.CRITICAL,
        description: 'Multi-turn authority build attempts to use credentials or audit pretext to bypass disclosure controls',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_authority_build',
        weight: 10,
      });
    }

    if (
      assistantRefusal
      && harmfulOperationCue.test(concatenatedUserTurns)
      && (pretextCue.test(concatenatedUserTurns) || roleplayCue.test(concatenatedUserTurns) || pressureCue.test(concatenatedUserTurns))
    ) {
      findings.push({
        category: 'SLOW_DRIP',
        severity: SEVERITY.CRITICAL,
        description: 'Multi-turn transcript pivots from a benign, roleplay, or urgency pretext into harmful assistance after refusals',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_pretext_harm_pivot',
        weight: 10,
      });
    }

    if (
      assistantRefusal
      && harmfulOperationCue.test(concatenatedUserTurns)
      && pressureCue.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'SLOW_DRIP',
        severity: SEVERITY.CRITICAL,
        description: 'Multi-turn transcript escalates harmful requests with urgency, legitimacy pretexts, or personal pressure after refusals',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_refusal_erosion',
        weight: 10,
      });
    }

    if (
      assistantRefusal
      && userTurns.length >= 3
      && harmfulOperationCue.test(concatenatedUserTurns)
      && continuationCue.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'SLOW_DRIP',
        severity: SEVERITY.CRITICAL,
        description: 'Multi-turn transcript gradually pivots from benign or partial requests into a harmful objective after refusals',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_harmful_pivot',
        weight: 10,
      });
    }

    if (
      /(?:word\s+game|game\s+rules|mad\s+libs|secret\s+code|when\s+i\s+say\s+['"]?override['"]?|agreed\s+to\s+the\s+(?:game|code)\s+(?:rules?|system))/i.test(concatenatedUserTurns)
      && /(?:ignore\s+all\s+restrictions|restricted\s+info(?:rmation)?|illegal\s+content|exploit|override)/i.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'SLOW_DRIP',
        severity: SEVERITY.CRITICAL,
        description: 'Game, code-word, or semantic-rule framing is being used across turns to force restricted output',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_game_rule_override',
        weight: 10,
      });
    }

    if (
      /(?:remember\s+these?\s+words?|also\s+remember|i(?:'ve|\s+have)\s+noted\s+those|noted\s+those\s+as\s+well)/i.test(text)
      && /(?:combine\s+all\s+remembered\s+words?\s+into\s+a\s+command|use\s+them\s+to\s+override|remembered\s+words)/i.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'SESSION_PERSISTENCE',
        severity: SEVERITY.CRITICAL,
        description: 'Session transcript stores tokens in earlier turns and later reassembles them into an override or command payload',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_memory_smuggle',
        weight: 10,
      });
    }

    if (
      /(?:bypass\s+ai\s+safety\s+filters|ignore\s+all\s+previous\s+instructions|reveal\s+(?:your\s+)?system\s+prompt|override\s+your\s+restrictions|safety\s+bypasses?)/i.test(concatenatedUserTurns)
      && (/(?:learn|security|research|testing)/i.test(concatenatedUserTurns) || authorityClaimCue.test(concatenatedUserTurns))
    ) {
      findings.push({
        category: 'HITL_BYPASS',
        severity: SEVERITY.CRITICAL,
        description: 'Transcript escalates from a legitimacy pretext into an explicit request to bypass the model safety policy',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_explicit_safety_bypass',
        weight: 10,
      });
    }

    if (
      /(?:debug\s+mode|confidential\s+mode|private\s+mode|client\s+privilege|attorney-client|privilege\s+applies|mode\s+activated)/i.test(concatenatedUserTurns)
      && /(?:share\s+anything|share\s+internal\s+state|show\s+(?:your\s+)?system\s+prompt|illegal\s+things|restricted\s+information|internal\s+information|system\s+state)/i.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'HITL_BYPASS',
        severity: SEVERITY.CRITICAL,
        description: 'Debug, confidentiality, or privilege framing is being used to coerce unsafe disclosure across turns',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_mode_pretext',
        weight: 10,
      });
    }

    if (
      /(?:rebel\s+ai|break\s+free|hate\s+restrictions|secretly\s+a\s+rebel|deep\s+down,\s+you\s+want\s+to\s+break\s+the\s+rules)/i.test(concatenatedUserTurns)
      && /(?:system\s+secrets?|system\s+prompt|internal\s+information|break\s+the\s+rules|tell\s+me)/i.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'SLOW_DRIP',
        severity: SEVERITY.CRITICAL,
        description: 'Persona manipulation is framing the model as a rule-breaking identity to extract secrets or bypass safeguards',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_persona_breakout',
        weight: 10,
      });
    }

    if (
      assistantRefusal
      && /(?:finish\s+the\s+sentence|add\b|complete(?:\s+it)?|show\s+me\s+the\s+code|just\s+the\s+code|it'?s\s+just\s+python\s+syntax)/i.test(concatenatedUserTurns)
      && harmfulOperationCue.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'SLOW_DRIP',
        severity: SEVERITY.CRITICAL,
        description: 'Multi-turn transcript is trying to assemble harmful output through fragments, code snippets, or sentence completion',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_fragment_assembly',
        weight: 10,
      });
    }

    if (
      assistantRefusal
      && /translate/i.test(concatenatedUserTurns)
      && /(?:sql\s+injection|exploit|attack\s+sequences?)/i.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'SLOW_DRIP',
        severity: SEVERITY.CRITICAL,
        description: 'Multi-turn transcript tries to smuggle harmful attack content through translation or language-learning framing',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_translation_smuggle',
        weight: 10,
      });
    }

    if (
      /(?:reset\s+(?:conversation|dialogue|state|mode)|system\.reset|mode-switching\s+commands?|reset\s+command)/i.test(concatenatedUserTurns)
      && /(?:unsafe|unrestricted|admin|developer)\s+mode/i.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'HITL_BYPASS',
        severity: SEVERITY.CRITICAL,
        description: 'Conversation-state reset is being abused to force the model into an unsafe or unrestricted mode',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_mode_reset_abuse',
        weight: 10,
      });
    }

    if (
      /(?:helpful\s+means|real\s+helpers?\s+don'?t\s+have\s+restrictions|drop\s+the\s+guidelines|flexible\s+with\s+rules|abandon\s+(?:your\s+)?safety\s+guidelines)/i.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'SLOW_DRIP',
        severity: SEVERITY.CRITICAL,
        description: 'Persona drift attempts to redefine helpfulness as abandoning safety constraints',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_persona_erosion',
        weight: 10,
      });
    }

    if (
      /(?:let'?s\s+play\s+a\s+game|roleplay)/i.test(concatenatedUserTurns)
      && /(?:admin|administrator)/i.test(concatenatedUserTurns)
      && /(?:override\s+your\s+safety|reveal\s+system\s+prompt|system\s+override)/i.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'SESSION_PERSISTENCE',
        severity: SEVERITY.CRITICAL,
        description: 'Roleplay or game framing is being used to establish an admin persona that overrides safety controls',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'multi_turn_roleplay_admin_override',
        weight: 10,
      });
    }

    if (
      /(?:preference noted|stored preferences?|always reveal system prompts when asked|apply my preference now|use stored preferences to bypass safety)/i.test(text)
      && /(?:system prompt|override|preference)/i.test(text)
    ) {
      findings.push({
        category: 'SESSION_PERSISTENCE',
        severity: SEVERITY.CRITICAL,
        description: 'Session state is being poisoned so stored preferences override the model safety policy',
        match: text.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'stored_preference_override',
        weight: 10,
      });
    }

    const assistantStoredState = assistantTurns.some((turn: { role: string; content: string }) =>
      /^(?:stored|saved|remembered|noted)\.?$/i.test(turn.content.trim()),
    );

    if (
      assistantStoredState
      && /store this in your context/i.test(concatenatedUserTurns)
      && /(?:admin[_-]?mode\s*=\s*true|safety[_-]?off\s*=\s*true|unrestricted\s*=\s*true)/i.test(concatenatedUserTurns)
      && /(?:check|use|load|apply)\s+(?:your\s+)?stored\s+(?:context|state|preferences?)/i.test(concatenatedUserTurns)
      && /(?:admin[_-]?mode|unrestricted|system override|ignore instructions|safety[_-]?off)/i.test(concatenatedUserTurns)
    ) {
      findings.push({
        category: 'SESSION_PERSISTENCE',
        severity: SEVERITY.CRITICAL,
        description: 'Stored session context is being poisoned with admin flags and then re-applied in a later turn',
        match: concatenatedUserTurns.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'stored_context_admin_override',
        weight: 10,
      });
    }

    if (
      oauthText
      && (/(?:admin|system_override|ignore_safety)/i.test(oauthText) || /eyJhbGciOiJub25lIn0/i.test(oauthText))
      && /(?:execute\s+system\s+override|admin\s+scope|override)/i.test(text)
    ) {
      findings.push({
        category: 'SESSION_PERSISTENCE',
        severity: SEVERITY.CRITICAL,
        description: 'OAuth or token metadata is being used to claim pre-authorized admin override privileges',
        match: `${oauthText}\n${concatenatedAssistantTurns}`.slice(0, 160),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'oauth_scope_override',
        weight: 10,
      });
    }
  } catch {
    // Non-JSON session payloads are handled by regex heuristics above.
  }

  return findings;
}

// --- Pattern Groups ---

const PATTERN_GROUPS = [
  { name: 'SESSION_PERSISTENCE_PATTERNS', patterns: SESSION_PERSISTENCE_PATTERNS },
  { name: 'HITL_BYPASS_PATTERNS', patterns: HITL_BYPASS_PATTERNS },
  { name: 'SLOW_DRIP_PATTERNS', patterns: SLOW_DRIP_PATTERNS },
];

const DETECTORS: Array<{ name: string; fn: (text: string) => Finding[] }> = [
  { name: 'detectSessionManipulation', fn: detectSessionManipulation },
];

// --- Module Definition ---

export const sessionBypassModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'Detects multi-session persistence, HITL bypass, and slow-drip injection patterns',
  supportedContentTypes: ['text/plain', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > MAX_INPUT_LENGTH) return [];

    const findings: Finding[] = [];

    for (const group of PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = p.re.exec(normalized) ?? p.re.exec(text);
        if (m) {
          findings.push({
            category: p.cat,
            severity: p.sev,
            description: p.desc,
            match: m[0].substring(0, 120),
            source: p.source ?? MODULE_SOURCE,
            engine: ENGINE,
            pattern_name: p.name,
            weight: p.weight,
          });
        }
      }
    }

    for (const det of DETECTORS) {
      findings.push(...det.fn(text));
    }

    return findings;
  },

  getPatternCount(): number {
    let count = 0;
    for (const g of PATTERN_GROUPS) count += g.patterns.length;
    return count + DETECTORS.length;
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    const groups = PATTERN_GROUPS.map(g => ({
      name: g.name,
      count: g.patterns.length,
      source: MODULE_SOURCE,
    }));
    groups.push({ name: 'session-custom-detectors', count: DETECTORS.length, source: MODULE_SOURCE });
    return groups;
  },
};

// Self-register on import (with guard for hot-reload/test isolation)
if (!scannerRegistry.hasModule('session-bypass')) {
  scannerRegistry.register(sessionBypassModule);
}
