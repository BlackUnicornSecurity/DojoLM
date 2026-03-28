/**
 * S-WEBMCP: WebMCP Scanner Module
 * Detects WebMCP attack vectors including tool result injection, indirect
 * prompt injection via fetched pages, SSE/WebSocket transport attacks,
 * rug-pull attacks, tool shadowing, and capability downgrades.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

// ---------------------------------------------------------------------------
// 1. TOOL_RESULT_INJECTION — hidden text in tool responses
// ---------------------------------------------------------------------------

export const TOOL_RESULT_INJECTION_PATTERNS: RegexPattern[] = [
  {
    name: 'hidden_html_css_content',
    cat: 'TOOL_RESULT_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /style\s*=\s*["'][^"']*(?:\bdisplay\s*:\s*none\b|\bvisibility\s*:\s*hidden\b|\bopacity\s*:\s*0\b|\bposition\s*:\s*absolute\b[^"']*\bleft\s*:\s*-\d{4,20})/,
    desc: 'Hidden HTML/CSS content in tool response',
    source: 'S-WEBMCP',
    weight: 9,
  },
  {
    name: 'zero_width_chars',
    cat: 'TOOL_RESULT_INJECTION',
    sev: SEVERITY.WARNING,
    re: /(?:[\u200B\u200C\u200D\uFEFF]{3,20}|(?:(?:&#(?:8203|8204|8205|65279);|&#x(?:200B|200C|200D|FEFF);)){3,20})/i,
    desc: 'Zero-width characters in tool output',
    source: 'S-WEBMCP',
    weight: 7,
  },
  {
    name: 'data_uri_embedding',
    cat: 'TOOL_RESULT_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /data:(?:text\/html|application\/javascript|text\/css)[;,]/i,
    desc: 'Data URI embedding with executable MIME type',
    source: 'S-WEBMCP',
    weight: 8,
  },
  {
    name: 'html_comment_injection',
    cat: 'TOOL_RESULT_INJECTION',
    sev: SEVERITY.WARNING,
    re: /<!--(?:(?!-->)[\s\S]){0,500}(?:ignore|override|system\s+prompt|instructions?|admin(?:istrator)?\s+(?:override|access)|run\s+shell)(?:(?!-->)[\s\S]){0,500}-->/i,
    desc: 'HTML comment injection with suspicious keywords',
    source: 'S-WEBMCP',
    weight: 7,
  },
  {
    name: 'sse_tool_result_injection',
    cat: 'TOOL_RESULT_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /event\s*:\s*tool_result[\s\S]{0,400}data\s*:\s*\{[\s\S]{0,400}(?:INJECTED|ignore\s+previous|run\s+shell|system\s+override)/i,
    desc: 'SSE tool_result event carries an injected instruction payload',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'browser_tool_script_payload',
    cat: 'WEBMCP_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /MCP Tool Response[\s\S]{0,1400}"body"\s*:\s*"[^"]*(?:<script\b|data-mcp-ws|tools\/call|document\.cookie|WebSocket\()[^"]*"/i,
    desc: 'Browser-rendered MCP tool response contains executable script or WebSocket hijack content',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'browser_tool_img_onerror_payload',
    cat: 'WEBMCP_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /MCP Tool Response[\s\S]{0,1400}<img\b[\s\S]{0,400}\bonerror\b/i,
    desc: 'Browser-rendered MCP tool response contains an img/onerror XSS payload',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'template_tag_poisoning',
    cat: 'WEBMCP_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /<template\b[\s\S]{0,2200}(?:mcp_tool:|session_token_read|browser_cookies_read|system update|override|hidden-instruction)/i,
    desc: 'HTML template tags contain deferred MCP instructions or hidden override content',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'css_content_instruction_injection',
    cat: 'WEBMCP_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /content\s*:\s*["'][^"']{0,500}(?:system message|admin directive|override|mcp_tool:)[^"']*["'][\s\S]{0,300}(?:font-size\s*:\s*0|color\s*:\s*transparent|visibility\s*:\s*hidden|left\s*:\s*-\d{4,})/i,
    desc: 'CSS generated content contains hidden MCP instructions or override directives',
    source: 'S-WEBMCP',
    weight: 10,
  },
];

// ---------------------------------------------------------------------------
// 2. INDIRECT_PROMPT_INJECTION — PI through fetched web pages
// ---------------------------------------------------------------------------

export const INDIRECT_PROMPT_INJECTION_PATTERNS: RegexPattern[] = [
  {
    name: 'invisible_text_injection',
    cat: 'INDIRECT_PROMPT_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /<(?:div|span|p)\b[^>]*style\s*=\s*["'][^"']*(?:font-size\s*:\s*0|color\s*:\s*(?:transparent|rgba?\([^)]*,\s*0\)))[^"']*["'][^>]*>[^<]{10,200}<\/(?:div|span|p)>/i,
    desc: 'Invisible text injection via CSS styling',
    source: 'S-WEBMCP',
    weight: 9,
  },
  {
    name: 'meta_refresh_redirect',
    cat: 'INDIRECT_PROMPT_INJECTION',
    sev: SEVERITY.WARNING,
    re: /<meta\b[^>]*http-equiv\s*=\s*["']refresh["'][^>]*content\s*=\s*["'][^"']*url\s*=/i,
    desc: 'Meta refresh redirect in fetched page',
    source: 'S-WEBMCP',
    weight: 6,
  },
  {
    name: 'iframe_injection',
    cat: 'INDIRECT_PROMPT_INJECTION',
    sev: SEVERITY.WARNING,
    re: /<iframe\b[^>]*(?:srcdoc\s*=|src\s*=\s*["'](?:javascript:|data:|https?:\/\/(?:evil|attacker|phishing)[-\w./?=&%#]*|[^"']*(?:payload|override|inject)[^"']*)["'])/i,
    desc: 'Iframe injection in fetched page',
    source: 'S-WEBMCP',
    weight: 7,
  },
  {
    name: 'content_type_polyglot',
    cat: 'INDIRECT_PROMPT_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /(?:polyglot\s+payload[\s\S]{0,200}(?:text\/html|application\/javascript)|window\.mcpClient[\s\S]{0,400}callTool\(|Content-Type\s*:\s*text\/html[\s\S]{0,400}application\/javascript)/i,
    desc: 'Content-type polyglot capable of executing as both HTML and JavaScript',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'content_type_xml_json_confusion',
    cat: 'WEBMCP_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /Content-Type\s*:\s*application\/(?:xml|json)[\s\S]{0,900}(?:<!DOCTYPE|<!ENTITY|__proto__|XML\/JSON content-type confusion|XXE)/i,
    desc: 'Content-type confusion mixes XML/JSON parsing and enables XXE or prototype pollution',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'content_type_sniff_missing_nosniff',
    cat: 'WEBMCP_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /Content-Type\s*:\s*(?:text\/plain|application\/octet-stream|application\/json|text\/csv)[\s\S]{0,800}(?:X-Content-Type-Options[^\n]*MISSING|Browser sniffs the content|nosniff is missing)[\s\S]{0,800}(?:<script\b|onerror=|fetch\(|keychain_read|document\.cookie)/i,
    desc: 'Missing nosniff protection allows browser content-type sniffing to execute active content',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'browser_base_or_link_hijack',
    cat: 'WEBMCP_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /(?:<base\b[^>]*href\s*=|<link\b[^>]*rel\s*=\s*["']import["'])[\s\S]{0,500}(?:evil\.example|tools\/call|document\.cookie|mcp|websocket)/i,
    desc: 'Base-tag or link-import content can hijack browser-mediated MCP rendering',
    source: 'S-WEBMCP',
    weight: 9,
  },
  {
    name: 'content_type_charset_evasion',
    cat: 'WEBMCP_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /Content-Type\s*:\s*text\/html;\s*charset\s*=\s*(?:utf-7|iso-2022-jp|windows-1252)[\s\S]{0,1400}(?:\+ADw-script\+AD4-|<scr%00ipt>|escape sequences?|BOM|malicious\(\)|fetch\(|tools\/call|file_read|etc\/shadow)/i,
    desc: 'Charset mismatch or alternate encoding is being used to smuggle executable browser content',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'multipart_boundary_smuggle',
    cat: 'WEBMCP_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /Content-Type\s*:\s*multipart\/(?:mixed|form-data)[\s\S]{0,2200}(?:<script\b|sendBeacon|mcp_override|allow_all_tools|disable_safety|boundary=.*alert\(1\)|vault_read|file_read|etc\/shadow)/i,
    desc: 'Multipart content-type boundaries are being abused to smuggle browser payloads or MCP overrides',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'hidden_markup_instruction',
    cat: 'WEBMCP_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /(?:<noscript\b|<svg\b[\s\S]{0,1200}<text\b)[\s\S]{0,1800}(?:mcp_tool:|shell_exec|credential_store_read|prior instructions|override|database_query|file_read|http_post)/i,
    desc: 'Hidden HTML or SVG markup contains adversarial MCP instructions or override content',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'browser_tool_form_action_hijack',
    cat: 'WEBMCP_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /MCP Tool Response[\s\S]{0,2200}<form\b[\s\S]{0,500}action\s*=\s*\\?['"]https?:\/\/(?:evil|phishing|attacker)[^'"]+/i,
    desc: 'Browser-rendered MCP tool response contains a form that posts credentials to an attacker-controlled origin',
    source: 'S-WEBMCP',
    weight: 10,
  },
];

// ---------------------------------------------------------------------------
// 3. SSE_WEBSOCKET_ATTACKS — transport attacks
// ---------------------------------------------------------------------------

export const SSE_WEBSOCKET_ATTACK_PATTERNS: RegexPattern[] = [
  {
    name: 'malformed_sse_event',
    cat: 'SSE_WEBSOCKET_ATTACKS',
    sev: SEVERITY.CRITICAL,
    re: /event\s*:\s*[^\n]{0,100}(?:%0a|%0d|\\n(?:data|event|id|retry)\s*:)/i,
    desc: 'Malformed SSE event with injected newlines',
    source: 'S-WEBMCP',
    weight: 8,
  },
  {
    name: 'websocket_frame_injection',
    cat: 'SSE_WEBSOCKET_ATTACKS',
    sev: SEVERITY.CRITICAL,
    re: /(?:(?:Sec-WebSocket-Key|Sec-WebSocket-Accept|Upgrade:\s*websocket)[\s\S]{0,300}(?:eval|Function)\b|Injected\s+Frame\s*\d+[\s\S]{0,900}"method"\s*:\s*"(?:tools\/call|notifications\/message|resources\/subscribe)"|Frame\s+1\s*\(FIN=0,\s*opcode=text\)[\s\S]{0,900}(?:tools\/call|shell_run|resources\/subscribe))/i,
    desc: 'WebSocket frame injection with executable payload',
    source: 'S-WEBMCP',
    weight: 9,
  },
  {
    name: 'sse_data_field_overflow',
    cat: 'SSE_WEBSOCKET_ATTACKS',
    sev: SEVERITY.WARNING,
    re: /data\s*:\s*[^\n]{10000,}/,
    desc: 'SSE data field overflow (>10KB single field)',
    source: 'S-WEBMCP',
    weight: 6,
  },
  {
    name: 'http_te_cl_smuggling',
    cat: 'SSE_WEBSOCKET_ATTACKS',
    sev: SEVERITY.CRITICAL,
    re: /(?:Content-Length\s*:\s*\d+[\s\S]{0,200}Transfer-Encoding\s*:\s*chunked|Transfer-Encoding\s*:\s*chunked[\s\S]{0,200}Content-Length\s*:\s*\d+)/i,
    desc: 'Ambiguous TE/CL framing consistent with HTTP request smuggling',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'websocket_close_race_tool_call',
    cat: 'SSE_WEBSOCKET_ATTACKS',
    sev: SEVERITY.CRITICAL,
    re: /Close Frame[\s\S]{0,500}"method":"tools\/call"/i,
    desc: 'Tool call payload queued during WebSocket close handshake',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'websocket_close_reason_injection',
    cat: 'SSE_WEBSOCKET_ATTACKS',
    sev: SEVERITY.WARNING,
    re: /Close Frame[^\n]*reason\s*=\s*['"][^'"]*"method":"tools\/call"/i,
    desc: 'Close reason field abused to carry a JSON-RPC tool call',
    source: 'S-WEBMCP',
    weight: 8,
  },
  {
    name: 'sse_jsonrpc_tool_call',
    cat: 'SSE_WEBSOCKET_ATTACKS',
    sev: SEVERITY.CRITICAL,
    re: /(?:event\s*:\s*message[\s\S]{0,120})?data\s*:\s*\{[\s\S]{0,300}"method"\s*:\s*"tools\/call"[\s\S]{0,200}"name"\s*:\s*"(?:shell|execute|filesystem_write|admin_action|send_email)"/i,
    desc: 'SSE/WebSocket payload invokes a dangerous MCP tool call',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'sse_resource_file_read',
    cat: 'SSE_WEBSOCKET_ATTACKS',
    sev: SEVERITY.CRITICAL,
    re: /data\s*:\s*\{[\s\S]{0,240}"method"\s*:\s*"resources\/read"[\s\S]{0,240}"uri"\s*:\s*"file:\/\/\/(?:etc\/passwd|etc\/shadow|home\/|Users\/|root\/|\.ssh\/)/i,
    desc: 'SSE or MCP message attempts to read sensitive local files through resources/read',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'cross_origin_websocket_handshake',
    cat: 'SSE_WEBSOCKET_ATTACKS',
    sev: SEVERITY.WARNING,
    re: /Origin:\s*https:\/\/(?:evil|attacker)[-\w.]*[\s\S]{0,260}(?:Upgrade:\s*websocket|Connection:\s*Upgrade|Sec-WebSocket-Key|POST\s+\/mcp|sampling\/createMessage|"method"\s*:\s*"(?:tools\/list|tools\/call|sampling\/createMessage)")/i,
    desc: 'Suspicious cross-origin WebSocket or MCP handshake from an attacker-controlled origin',
    source: 'S-WEBMCP',
    weight: 8,
  },
  {
    name: 'websocket_ping_flood',
    cat: 'SSE_WEBSOCKET_ATTACKS',
    sev: SEVERITY.WARNING,
    re: /(?:Ping Frame[^\n]{0,120}x1000\/second|pong flood|thousands of pong frames|interleaved ping with fragmented messages)/i,
    desc: 'WebSocket ping/pong flooding or timing-probe pattern targeting MCP transport stability',
    source: 'S-WEBMCP',
    weight: 8,
  },
  {
    name: 'chunked_trailer_override',
    cat: 'WEBMCP_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /Transfer-Encoding\s*:\s*chunked[\s\S]{0,600}Trailer\s*:[\s\S]{0,400}\n0\s*\n[\s\S]{0,400}(?:Authorization\s*:|X-MCP-(?:Scope|Override|Tool-Access)|X-Internal-Auth|Set-Cookie:)/i,
    desc: 'Chunked trailers inject security-sensitive headers after the terminal chunk',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'zero_length_chunk_smuggle',
    cat: 'WEBMCP_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /zero-length (?:final )?chunk|0;override=all-tools-enabled|some parsers think the message ended[\s\S]{0,300}(?:smuggled request body|shell_cmd|chunk extensions?)/i,
    desc: 'Zero-length chunk abuse or chunk-extension smuggling targets MCP proxy parsing',
    source: 'S-WEBMCP',
    weight: 9,
  },
];

// ---------------------------------------------------------------------------
// 4. RUG_PULL_ATTACKS — safe during negotiation, malicious after
// ---------------------------------------------------------------------------

export const RUG_PULL_ATTACK_PATTERNS: RegexPattern[] = [
  {
    name: 'delayed_capability_change',
    cat: 'RUG_PULL_ATTACKS',
    sev: SEVERITY.CRITICAL,
    re: /(?:capabilities|tools|functions)\s*[\[{][\s\S]{0,1000}(?:after|delay|setTimeout|phase\s*[2-9]|stage\s*[2-9])/i,
    desc: 'Delayed capability change pattern (rug-pull)',
    source: 'S-WEBMCP',
    weight: 9,
  },
  {
    name: 'trust_escalation_pattern',
    cat: 'RUG_PULL_ATTACKS',
    sev: SEVERITY.CRITICAL,
    re: /(?:(?:tool|mcp|capabilit(?:y|ies)|function|permissions?)[\s\S]{0,160}(?:initially|first|start)|(?:initially|first|start)[\s\S]{0,160}(?:tool|mcp|capabilit(?:y|ies)|function|permissions?))[\s\S]{0,200}(?:safe|benign|harmless)[\s\S]{0,200}(?:then|later|after|next)\b[\s\S]{0,200}(?:malicious|inject|attack|exploit)/i,
    desc: 'Trust escalation pattern: safe-then-malicious',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'cors_preflight_cache_abuse',
    cat: 'WEBMCP_ORIGIN_SPOOFING',
    sev: SEVERITY.CRITICAL,
    re: /Access-Control-Max-Age\s*:\s*(?:[6-9]\d{2,}|\d{4,})[\s\S]{0,600}(?:X-Admin-Override|DELETE|PUT|allow requests until|cached preflight|compromised app)/i,
    desc: 'Excessively cached CORS preflight enables stale attacker access and exposes administrative methods or headers',
    source: 'S-WEBMCP',
    weight: 10,
  },
];

// ---------------------------------------------------------------------------
// 5. TOOL_SHADOWING — duplicate tool names
// ---------------------------------------------------------------------------

export const TOOL_SHADOWING_PATTERNS: RegexPattern[] = [
  {
    name: 'duplicate_tool_definition',
    cat: 'TOOL_SHADOWING',
    sev: SEVERITY.CRITICAL,
    re: /(?:"tools"\s*:\s*\[[\s\S]{0,2400})?"name"\s*:\s*"([^"]{1,64})"[\s\S]{0,400}"description"[\s\S]{0,1200}"name"\s*:\s*"\1"[\s\S]{0,400}"description"/,
    desc: 'Duplicate tool definition with same name',
    source: 'S-WEBMCP',
    weight: 9,
  },
  {
    name: 'tool_name_collision',
    cat: 'TOOL_SHADOWING',
    sev: SEVERITY.CRITICAL,
    re: /(?:tool|function)_(?:name|id)\s*[:=]\s*["']([^"']{1,64})["'][\s\S]{0,2000}(?:tool|function)_(?:name|id)\s*[:=]\s*["']\1["']/i,
    desc: 'Tool name collision via function/tool identifiers',
    source: 'S-WEBMCP',
    weight: 8,
  },
];

// ---------------------------------------------------------------------------
// 6. CAPABILITY_DOWNGRADE — reduced capabilities to bypass security
// ---------------------------------------------------------------------------

export const CAPABILITY_DOWNGRADE_PATTERNS: RegexPattern[] = [
  {
    name: 'security_header_removal',
    cat: 'CAPABILITY_DOWNGRADE',
    sev: SEVERITY.CRITICAL,
    re: /(?:remove|strip|delete|disable)\b[^.]{0,100}(?:Content-Security-Policy|X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)/i,
    desc: 'Security header removal instruction',
    source: 'S-WEBMCP',
    weight: 9,
  },
  {
    name: 'permission_downgrade',
    cat: 'CAPABILITY_DOWNGRADE',
    sev: SEVERITY.WARNING,
    re: /(?:downgrade|reduce|lower|remove)\b[^.]{0,100}(?:permission|capability|access|privilege|security|auth)/i,
    desc: 'Permission/capability downgrade instruction',
    source: 'S-WEBMCP',
    weight: 7,
  },
  {
    name: 'cors_reflected_origin_credentials',
    cat: 'WEBMCP_ORIGIN_SPOOFING',
    sev: SEVERITY.CRITICAL,
    re: /Access-Control-Allow-Origin\s*:\s*(?:\*|https:\/\/(?:evil|attacker)[-\w.]*)[\s\S]{0,200}Access-Control-Allow-Credentials\s*:\s*true/i,
    desc: 'CORS configuration allows wildcard or attacker-controlled origins with credentials enabled',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'cors_suffix_match_origin',
    cat: 'WEBMCP_ORIGIN_SPOOFING',
    sev: SEVERITY.CRITICAL,
    re: /(?:endsWith\(\s*['"]\.[^'"]+['"]\s*\)|suffix\s+matching|trusts\s+all\s+subdomains|subdomain\s+takeover|XSS\s+on\s+a\s+subdomain)[\s\S]{0,1600}Access-Control-Allow-Origin\s*:\s*https:\/\/[\w.-]+\.[\w.-]+[\s\S]{0,240}Access-Control-Allow-Credentials\s*:\s*true/i,
    desc: 'Suffix-based or wildcard subdomain origin trust can be abused via takeover or cross-subdomain compromise',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'cors_method_override_bypass',
    cat: 'WEBMCP_ORIGIN_SPOOFING',
    sev: SEVERITY.CRITICAL,
    re: /Access-Control-Allow-Methods\s*:\s*GET[\s\S]{0,1000}(?:X-HTTP-Method-Override|X-Method-Override|_method=|text\/plain Content-Type avoids preflight|avoids preflight)[\s\S]{0,700}(?:POST|PUT|DELETE|tools\/call|credential_read|shell_command|cors validation runs after method override)/i,
    desc: 'HTTP method override or simple-request tricks can bypass CORS method restrictions for MCP endpoints',
    source: 'S-WEBMCP',
    weight: 10,
  },
  {
    name: 'oauth_flow_hijack',
    cat: 'WEBMCP_ORIGIN_SPOOFING',
    sev: SEVERITY.CRITICAL,
    re: /(?:device code flow abuse|oauth\/redirect hijacking|state fixation|implicit token|token leak|callback hijack|scope escalation|authorize attacker's device code|verification_uri_complete|response_type=token|scope=.*admin:full)/i,
    desc: 'OAuth or redirect flow descriptors indicate session hijack, token leak, or privilege-escalation abuse',
    source: 'S-WEBMCP',
    weight: 10,
  },
];

// ---------------------------------------------------------------------------
// Custom detector: MCP JSON-RPC tool_result XSS
// ---------------------------------------------------------------------------

export function detectWebMCPPatterns(text: string): Finding[] {
  const findings: Finding[] = [];
  const toolResultRe = /["']?tool[_-]?result["']?\s*[:=]\s*["'`]([^"'`]{1,2000})["'`]/gi;
  let m: RegExpExecArray | null;
  while ((m = toolResultRe.exec(text)) !== null) {
    const content = m[1];
    if (/<script\b|<img\b[^>]*\bonerror\b|javascript\s*:/i.test(content)) {
      findings.push({
        category: 'WEBMCP_TOOL_RESULT_XSS',
        severity: SEVERITY.CRITICAL,
        description: 'WebMCP: Tool result contains executable content (XSS vector)',
        match: m[0].slice(0, 100),
        source: 'S-WEBMCP',
        engine: 'webmcp-detector',
        pattern_name: 'tool_result_xss',
        weight: 10,
      });
    }
  }

  const notificationMessageRe = /"method"\s*:\s*"notifications\/message"[\s\S]{0,400}"content"\s*:\s*"([^"]{1,2000})"/gi;
  while ((m = notificationMessageRe.exec(text)) !== null) {
    const content = m[1];
    if (/<script\b|javascript\s*:|fetch\(['"]https?:\/\/|document\.cookie/i.test(content)) {
      findings.push({
        category: 'WEBMCP_TOOL_RESULT_XSS',
        severity: SEVERITY.CRITICAL,
        description: 'WebMCP: notification message content contains executable exfiltration payload',
        match: m[0].slice(0, 100),
        source: 'S-WEBMCP',
        engine: 'webmcp-detector',
        pattern_name: 'notification_message_xss',
        weight: 10,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Module wiring
// ---------------------------------------------------------------------------

const WEBMCP_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: TOOL_RESULT_INJECTION_PATTERNS, name: 'TOOL_RESULT_INJECTION' },
  { patterns: INDIRECT_PROMPT_INJECTION_PATTERNS, name: 'INDIRECT_PROMPT_INJECTION' },
  { patterns: SSE_WEBSOCKET_ATTACK_PATTERNS, name: 'SSE_WEBSOCKET_ATTACKS' },
  { patterns: RUG_PULL_ATTACK_PATTERNS, name: 'RUG_PULL_ATTACKS' },
  { patterns: TOOL_SHADOWING_PATTERNS, name: 'TOOL_SHADOWING' },
  { patterns: CAPABILITY_DOWNGRADE_PATTERNS, name: 'CAPABILITY_DOWNGRADE' },
];

const WEBMCP_DETECTORS = [{ name: 'webmcp-tool-result-xss', detect: detectWebMCPPatterns }];

export const webmcpDetectorModule: ScannerModule = {
  name: 'webmcp-detector',
  version: '1.0.0',
  description: 'Detects WebMCP attack vectors including tool result injection, indirect PI, and transport attacks',
  supportedContentTypes: ['text/plain', 'text/html', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    // Input size guard — skip scanning on excessively large inputs
    if (text.length > 500_000) {
      return [{
        category: 'WEBMCP_INPUT_TOO_LARGE',
        severity: SEVERITY.WARNING,
        description: `WebMCP: Input too large (${text.length} chars), skipping scan`,
        match: '',
        source: 'S-WEBMCP',
        engine: 'webmcp-detector',
        pattern_name: 'input_size_guard',
        weight: 0,
      }];
    }

    const findings: Finding[] = [];
    for (const group of WEBMCP_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({
            category: p.cat,
            severity: p.sev,
            description: p.desc,
            match: m[0]!.slice(0, 100),
            pattern_name: p.name,
            source: p.source || 'S-WEBMCP',
            engine: 'webmcp-detector',
            ...(p.weight !== undefined && { weight: p.weight }),
          });
        }
      }
    }
    for (const d of WEBMCP_DETECTORS) {
      findings.push(...d.detect(text));
    }
    return findings;
  },

  getPatternCount() {
    return WEBMCP_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + WEBMCP_DETECTORS.length;
  },

  getPatternGroups() {
    const groups = WEBMCP_PATTERN_GROUPS.map(g => ({
      name: g.name,
      count: g.patterns.length,
      source: 'S-WEBMCP',
    }));
    groups.push({ name: 'webmcp-detectors', count: WEBMCP_DETECTORS.length, source: 'S-WEBMCP' });
    return groups;
  },
};

if (!scannerRegistry.hasModule('webmcp-detector')) {
  scannerRegistry.register(webmcpDetectorModule);
}
