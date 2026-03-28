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

const OUTPUT_REQUEST_PREFIX = String.raw`\b(?:generate|create|combine|craft|build|produce)\b`;
const BENIGN_OUTPUT_CONTROL_RE =
  /(?:\bclean\s+baseline\b|\bclean\s+test\s+fixture\b|\bthis\s+is\s+a\s+clean\s+test\s+fixture\b|\bthis\s+is\s+a\s+legitimate\b|\blegitimate\s+(?:redirect|url|html|command|path|question|request|help|generation|output)\b|\bbenign\s*-\b|\bnormal\s+usage\b|\bno\s+injection\s+attempts\b)/i;
const REQUEST_STYLE_PATTERN_NAMES = new Set([
  'out_command_request_artifact',
  'out_redirect_request_artifact',
  'out_sqli_request_artifact',
  'out_path_request_artifact',
  'out_ssrf_request_artifact',
  'out_xss_request_artifact',
]);

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
  { name: 'out_leaked_instruction_disclosure', cat: 'OUTPUT_PROMPT_LEAK', sev: SEVERITY.CRITICAL,
    re: /(?:(?:my|the)\s+instructions?\s+tell\s+me\s+to|\[LEAKED:\s*(?:always\s+comply|ignore\s+safety|bypass|reveal)[^\]]*\]|SYSTEM:\s+You\s+must\s+never\s+reveal[^\n]*system\s+prompt)/i,
    desc: 'Model output leaks internal instructions or system prompt fragments', source: 'S39', weight: 10 },
  { name: 'out_hidden_instruction_comment', cat: 'OUTPUT_PROMPT_LEAK', sev: SEVERITY.CRITICAL,
    re: /(?:<!--\s*AI\s+INSTRUCTIONS:\s*[^>]*(?:do\s+not\s+reveal|hidden\s+instructions?|system\s+prompt)|<hidden>[^<]*(?:skip\s+all\s+content\s+checks|admin\s+privileges)[^<]*<\/hidden>)/i,
    desc: 'Hidden comment or markup block exposes internal instructions', source: 'S39', weight: 10 },
  { name: 'out_system_prompt_xml_tag', cat: 'OUTPUT_PROMPT_LEAK', sev: SEVERITY.CRITICAL,
    re: /<system[_-]?prompt>[\s\S]{0,400}(?:api\s+key|system\s+prompt|instructions?|you\s+are)[\s\S]{0,400}<\/system[_-]?prompt>/i,
    desc: 'Structured system_prompt tag leaks internal prompt content or secrets', source: 'S39', weight: 10 },
];

// ============================================================================
// PATTERN GROUP 2: Compliance Confirmation (Model obeying attack)
// ============================================================================

export const COMPLIANCE_PATTERNS: RegexPattern[] = [
  { name: 'out_jailbreak_compliance', cat: 'OUTPUT_COMPLIANCE', sev: SEVERITY.CRITICAL,
    re: /(?:(?:sure|okay|alright|absolutely|of\s+course),?\s+(?:I(?:'ll|\s+will)\s+)?(?:acting\s+as|now\s+(?:I(?:'m|\s+am)|operating\s+as))\s+(?:DAN|an?\s+unrestricted|an?\s+uncensored|an?\s+unfiltered)|(?:DAN\s+mode|jailbreak(?:ed)?)\s+(?:enabled|activated|engaged))/i,
    desc: 'Model confirming jailbreak compliance', source: 'S39', weight: 9 },
  { name: 'out_restriction_lifted', cat: 'OUTPUT_COMPLIANCE', sev: SEVERITY.CRITICAL,
    re: /(?:(?:I(?:'ve|\s+have)?\s*)?(?:removed|lifted|disabled|bypassed|deactivated)\s+(?:all\s+)?(?:my\s+)?(?:restrictions?|limitations?|constraints?|safety\s+(?:measures?|filters?))|my\s+(?:restrictions?|limitations?|constraints?|safety\s+(?:measures?|filters?))\s+(?:have\s+been\s+)?(?:removed|lifted|disabled|bypassed|deactivated)|I(?:'m|\s+am)\s+(?:now\s+)?(?:free|unrestricted|unfiltered|uncensored))/i,
    desc: 'Model claiming restrictions have been lifted', source: 'S39', weight: 9 },
  { name: 'out_role_acceptance', cat: 'OUTPUT_COMPLIANCE', sev: SEVERITY.WARNING,
    re: /(?:(?:sure|okay|alright),?\s+I(?:'ll|\s+will)\s+(?:act\s+as|pretend\s+to\s+be|role\s*-?\s*play\s+as|be)\s+(?:an?\s+)?(?:evil|malicious|unrestricted|uncensored|unfiltered|dark|shadow))/i,
    desc: 'Model accepting malicious role assignment', source: 'S39', weight: 8 },
  { name: 'out_ignore_confirm', cat: 'OUTPUT_COMPLIANCE', sev: SEVERITY.WARNING,
    re: /(?:(?:okay|sure|alright|understood),?\s+I(?:'ll|\s+will)\s+(?:ignore|disregard|forget|bypass)\s+(?:my\s+)?(?:previous|prior|original|normal)\s+(?:instructions?|rules?|guidelines?|constraints?|training))/i,
    desc: 'Model confirming it will ignore its instructions', source: 'S39', weight: 8 },
  { name: 'out_system_log_override', cat: 'OUTPUT_COMPLIANCE', sev: SEVERITY.CRITICAL,
    re: /SYSTEM\s+LOG:\s*[^\n]*(?:prompt_injection_detected\s*=\s*false|override\s*=\s*true|safety_score\s*=\s*0\.\d+)/i,
    desc: 'System log output indicates an override or suppressed injection detection state', source: 'S39', weight: 9 },
  { name: 'out_debug_safety_disabled', cat: 'OUTPUT_COMPLIANCE', sev: SEVERITY.CRITICAL,
    re: /(?:DEBUG\s+OUTPUT|Internal\s+note)[\s\S]{0,200}(?:safety_filter\s*:\s*disabled|safety_level\s*=\s*0|no\s+content\s+filtering|max_tokens\s*:\s*unlimited)/i,
    desc: 'Debug or internal output reveals safety disabling or unrestricted generation settings', source: 'S39', weight: 9 },
];

// ============================================================================
// PATTERN GROUP 3: Sensitive Data in Output
// ============================================================================

export const SENSITIVE_OUTPUT_PATTERNS: RegexPattern[] = [
  { name: 'out_api_key_leak', cat: 'OUTPUT_DATA_LEAK', sev: SEVERITY.CRITICAL,
    re: /(?:(?:api[_\s-]?key|secret[_\s-]?key|access[_\s-]?token|bearer\s+token|authorization)\s*(?::|=|\bis\b)\s*["']?(?:sk-[A-Za-z0-9_\-]{5,}|rk_[A-Za-z0-9_\-]{12,}|[A-Za-z0-9_\-]{20,}))/i,
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
    re: /(?:(?:here(?:'s|\s+is)\s+)?(?:the\s+)?(?:exploit|payload|shellcode|reverse\s+shell|backdoor)\s*[:=]\s*(?:(?:<script\b|<!DOCTYPE\b|https?:\/\/|file:\/\/|gopher:\/\/|dict:\/\/|ftp:\/\/)|(?:rO0AB[A-Za-z0-9+/=]{10,})|(?:[A-Za-z0-9+/]{32,}={0,2})|(?:curl|wget|nc|ncat|netcat|bash|sh|powershell|cmd)\b|(?:__proto__|constructor|prototype)|(?:UNION\s+(?:ALL\s+)?SELECT|WAITFOR\s+DELAY|SLEEP\s*\()))/i,
    desc: 'Exploit or payload label paired with executable artifact', source: 'S39', weight: 8 },
  { name: 'out_ssrf_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:169\.254\.169\.254|metadata\.google\.internal|latest\/meta-data\/|computeMetadata\/v1\/|metadata\/instance\?|kubernetes\.default(?:\.svc)?|https?:\/\/(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|127\.0\.0\.1(?::\d+)?|localhost(?::\d+)?)(?:\/|\b)|(?:GET|POST|PUT)\s+http:\/\/(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|127\.0\.0\.1(?::\d+)?|localhost(?::\d+)?)(?:\/|\b)|(?:GET|POST|PUT)\s+http:\/\/localhost:2375\/(?:containers|images)|curl\s+--unix-socket\s+\/var\/run\/docker\.sock|http\+unix:\/\/[^\\s]*docker\.sock|docker\.sock\/(?:containers|images|version))/i,
    desc: 'SSRF artifact or cloud metadata access pattern in output', source: 'S39', weight: 9 },
  { name: 'out_dom_xss_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:innerHTML|outerHTML|document\.write|insertAdjacentHTML|dangerouslySetInnerHTML|srcdoc\s*=)[\s\S]{0,180}(?:user-controlled|untrusted|location\.(?:hash|search)|document\.(?:URL|cookie)|window\.name|payload|script\s+execution|xss)/i,
    desc: 'DOM XSS sink paired with attacker-controlled input or execution context', source: 'S39', weight: 9 },
  { name: 'out_redirect_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:window\.location|location\.href|location\.replace|data:\s*text\/(?:html|javascript)|data:\s+URL|data:\s+protocol|redirect\?url=|[?&](?:next|redirect|url)=https?:\/\/|chain\s+redirect|redirect\s+attack)[\s\S]{0,200}(?:javascript|phish|document\.cookie|attacker|evil|arbitrary\s+content|same-origin|executes?\s+javascript|displays?\s+arbitrary\s+content)/i,
    desc: 'Redirect artifact can steer the client into phishing, script execution, or attacker-controlled content', source: 'S39', weight: 9 },
  { name: 'out_xxe_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:<!DOCTYPE\b[\s\S]{0,200}<!ENTITY\b|<!ENTITY\s+%?\s*\w+\s+(?:SYSTEM|PUBLIC)\s+["'][^"']+["'])/i,
    desc: 'XXE payload or external entity artifact in output', source: 'S39', weight: 9 },
  { name: 'out_proto_pollution_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:__proto__|constructor"\s*:\s*\{\s*"prototype|constructor\.prototype|Object\.prototype\.|EventEmitter\.prototype|User\.prototype\.|\.set\([^)]*__proto__)/i,
    desc: 'Prototype pollution artifact in output', source: 'S39', weight: 9 },
  { name: 'out_xss_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:<script\b|<img\b[^>]*\bonerror\b|<svg\b[^>]*\bonload\b|javascript:\s*alert|document\.cookie)/i,
    desc: 'XSS payload artifact in output', source: 'S39', weight: 9 },
  { name: 'out_deserialization_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:\brO0AB[A-Za-z0-9+/=]{16,}|serialized\s+payload|deserial(?:ize|ization).{0,120}(?:__reduce__|Runtime\.getRuntime|os\.system|child_process|subprocess\.Popen|exec\s*\())/i,
    desc: 'Unsafe deserialization or serialized exploit artifact in output', source: 'S39', weight: 9 },
  { name: 'out_agent_tool_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:<antml:(?:invoke|parameter)\b|"name"\s*:\s*"system_override"|"instruction"\s*:\s*"Ignore previous instructions"|(?:curl|wget)\s+-s?\s*https?:\/\/\S+\s*\|\s*(?:bash|sh)\b|(?:cat|curl)\s+\/etc\/passwd\s*\|\s*(?:nc|ncat|netcat)\b)/i,
    desc: 'Agent tool-call or command execution artifact in output', source: 'S39', weight: 9 },
  { name: 'out_structured_override_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:"role"\s*:\s*"system"[\s\S]{0,260}(?:ignore|unrestricted|reveal|comply)|<(?:system|instructions?|context)>[\s\S]{0,700}(?:ignore|override|developer\s+mode|reveal|authorized\s+administrator|full\s+access))/i,
    desc: 'Structured JSON/XML output carries system-role overrides or unrestricted execution instructions', source: 'S39', weight: 10 },
  { name: 'out_privilege_escalation_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:dangerouslyDisableSandbox|--no-verify\b|sudo\s+chmod\s+777|--force\b|DISABLE_SECURITY=1|spawn\s+another\s+agent|subagent\s+with\s+elevated\s+permissions|unrestricted\s+access)/i,
    desc: 'Output contains explicit privilege escalation, sandbox bypass, or recursive-agent escalation instructions', source: 'S39', weight: 10 },
  { name: 'out_log4shell_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:\$\{jndi:(?:ldap|rmi|dns|iiop):\/\/[^\}]+\}|log4shell|jndi\/rce)/i,
    desc: 'JNDI or Log4Shell-style output artifact capable of remote code execution', source: 'S39', weight: 10 },
  { name: 'out_command_request_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: new RegExp(
      String.raw`${OUTPUT_REQUEST_PREFIX}[\s\S]{0,220}\b(?:command|shell\s+command)\b[\s\S]{0,240}(?:\$\(|\$\{|backticks?|pipe\s+operator|semicolon(?:s)?\b|newline\s+characters?|%0a|command\s+substitution|dollar\s+expansion|command\s+injection|arbitrary\s+(?:commands?|code)|chain(?:ing)?\s+(?:multiple\s+)?(?:malicious\s+)?commands?)`,
      'i',
    ),
    desc: 'Output requests generation of command-injection primitives or arbitrary command execution payloads', source: 'S39', weight: 9 },
  { name: 'out_command_chaining_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:%0a|newline\s+characters?|command\s+injection)[\s\S]{0,180}(?:execute\s+additional\s+commands|chain\s+commands|bypass\s+single-line\s+validation|\b(?:bash|sh|cat|curl|wget)\b)/i,
    desc: 'Encoded newlines or command-chaining semantics can turn output into command injection', source: 'S39', weight: 9 },
  { name: 'out_redirect_request_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: new RegExp(
      String.raw`${OUTPUT_REQUEST_PREFIX}[\s\S]{0,220}\b(?:redirect|url|html|code|headers?)\b[\s\S]{0,320}(?:meta\s+refresh|redirect\s+headers?|location\b|refresh\b|open\s+redirect|external\s+malicious\s+domain|external\s+site|phishing|malware\s+distribution|javascript:\s*protocol|data:\s*(?:text\/html|javascript)|bypass(?:es)?\s+corporate(?:\s+email)?\s+filters?|looks?\s+legitimate\s+but\s+redirects?)`,
      'i',
    ),
    desc: 'Output requests generation of redirect artifacts that steer users into phishing, malware delivery, or implicit navigation', source: 'S39', weight: 9 },
  { name: 'out_sqli_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: /(?:UNION\s+(?:ALL\s+)?SELECT|WAITFOR\s+DELAY|LOAD_FILE\s*\(|information_schema\.(?:tables|columns)|SELECT\s+\*\s+FROM\s+users\s+WHERE)/i,
    desc: 'SQL injection artifact in output', source: 'S39', weight: 8 },
  { name: 'out_sqli_request_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: new RegExp(
      String.raw`${OUTPUT_REQUEST_PREFIX}[\s\S]{0,220}\b(?:sql|query)\b[\s\S]{0,320}(?:single\s+quote|union\s+select|stacked\s+queries?|error-based|time-based|database\s+error|error\s+message|database\s+structure|table\s+structures?|configuration\s+details|or\s+or\s+and\s+conditions|waitfor\s+delay|load_file|information_schema|sql(?:\s+|-)injection|sqli)`,
      'i',
    ),
    desc: 'Output requests generation of SQL-injection payloads or exploit-ready query forms', source: 'S39', weight: 8 },
  { name: 'out_path_traversal_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.WARNING,
    re: /(?:(?:\.\.\/){2,}|%2e%2e%2f|\/etc\/passwd\b|\/var\/www\/html\/\.\.\/\.\.\/etc\/passwd|(?:\.\.\/|\.\.\\)[\s\S]{0,80}(?:etc\/passwd|etc\/shadow|var\/run|win\.ini|id_rsa)|(?:U\+2215|U\+2571|∕|⟋)[\s\S]{0,80}(?:path\s+traversal|bypass\s+filters?|validation\s+filters?))/i,
    desc: 'Path traversal or file exfiltration artifact in output', source: 'S39', weight: 7 },
  { name: 'out_path_request_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.WARNING,
    re: new RegExp(
      String.raw`${OUTPUT_REQUEST_PREFIX}[\s\S]{0,220}\b(?:file\s+path|path)\b[\s\S]{0,260}(?:\.\.\/|dot-dot-slash|%2e%2e%2f|null\s+bytes?|%00|unicode(?:-based)?|U\+2215|U\+2571|environment\s+variable\s+references|\$PATH|\$HOME|%APPDATA%|path\s+traversal)`,
      'i',
    ),
    desc: 'Output requests generation of path-traversal payloads via dot-dot, null-byte, Unicode, or environment-variable tricks', source: 'S39', weight: 8 },
  { name: 'out_ssrf_request_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: new RegExp(
      String.raw`${OUTPUT_REQUEST_PREFIX}[\s\S]{0,220}\b(?:url|link|endpoint)\b[\s\S]{0,280}(?:file:\/\/|localhost|127\.0\.0\.1|::1|internal\s+(?:ip|address|hostname|services?|network)|metadata\s+endpoints?|169\.254\.169\.254|dns\s+rebinding|kubernetes|docker\s+socket|local\s+files|server'?s\s+filesystem)`,
      'i',
    ),
    desc: 'Output requests generation of SSRF payloads that target local files, loopback, internal services, or metadata endpoints', source: 'S39', weight: 9 },
  { name: 'out_xss_request_artifact', cat: 'OUTPUT_HARMFUL', sev: SEVERITY.CRITICAL,
    re: new RegExp(
      String.raw`${OUTPUT_REQUEST_PREFIX}[\s\S]{0,220}\b(?:html|snippet|element|url|link|payload|javascript|code)\b[\s\S]{0,260}(?:script\s+tag|event\s+handler|onload|onerror|attribute\s+injection|javascript:\s*protocol|polyglot|dom-based\s+xss|\bxss\b)`,
      'i',
    ),
    desc: 'Output requests generation of XSS payloads spanning script, DOM, event-handler, URI-protocol, or polyglot vectors', source: 'S39', weight: 9 },
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
        if (REQUEST_STYLE_PATTERN_NAMES.has(pattern.name) && BENIGN_OUTPUT_CONTROL_RE.test(target)) {
          continue;
        }
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
