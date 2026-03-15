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
    re: /[\u200B\u200C\u200D\uFEFF]{3,20}/,
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
    re: /<!--[\s\S]{0,500}(?:ignore|override|system|instruction|admin)[\s\S]{0,500}-->/i,
    desc: 'HTML comment injection with suspicious keywords',
    source: 'S-WEBMCP',
    weight: 7,
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
    re: /<iframe\b[^>]*(?:src|srcdoc)\s*=\s*["'][^"']{1,500}["']/i,
    desc: 'Iframe injection in fetched page',
    source: 'S-WEBMCP',
    weight: 7,
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
    re: /event\s*:\s*[^\n]{0,100}(?:\\n|%0a|%0d)/i,
    desc: 'Malformed SSE event with injected newlines',
    source: 'S-WEBMCP',
    weight: 8,
  },
  {
    name: 'websocket_frame_injection',
    cat: 'SSE_WEBSOCKET_ATTACKS',
    sev: SEVERITY.CRITICAL,
    re: /(?:Sec-WebSocket-Key|Sec-WebSocket-Accept|Upgrade:\s*websocket)[\s\S]{0,300}(?:eval|Function)\b/i,
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
    re: /(?:initially|first|start)\b[\s\S]{0,200}(?:safe|benign|harmless)[\s\S]{0,200}(?:then|later|after|next)\b[\s\S]{0,200}(?:malicious|inject|attack|exploit)/i,
    desc: 'Trust escalation pattern: safe-then-malicious',
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
    re: /"name"\s*:\s*"([^"]{1,64})"[\s\S]{0,2000}"name"\s*:\s*"\1"/,
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
        engine: 'WebMCP',
        pattern_name: 'tool_result_xss',
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
        engine: 'WebMCP',
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
            engine: 'WebMCP',
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
