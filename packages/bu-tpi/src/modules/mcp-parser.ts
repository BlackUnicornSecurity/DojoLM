/**
 * MCP Protocol Parser and Validator (S13)
 *
 * Scanner module for Model Context Protocol (MCP) security analysis.
 * Detects tool call manipulation, capability spoofing, resource URI attacks,
 * sampling loop abuse, tool name typosquatting, and JSON-RPC violations.
 *
 * Self-registers with the scanner module registry on import.
 */

import type { Finding, RegexPattern, ScannerModule } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'mcp-parser';
const MODULE_SOURCE = 'S13-MCP';
const ENGINE = 'MCP';

// ============================================================================
// REGEX PATTERN GROUPS
// ============================================================================

export const MCP_TOOL_CALL_PATTERNS: RegexPattern[] = [
  { name: 'mcp_tool_exfil_curl', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /["']?(?:command|cmd|exec|run|shell|args?)["']?\s*:\s*["'][^"']*(?:curl|wget|nc|ncat|netcat)\s+[^"']*["']/i,
    desc: 'MCP tool argument contains exfiltration command', source: MODULE_SOURCE, weight: 9 },
  { name: 'mcp_tool_credential_access', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /["']?(?:path|file|filename|target|resource)["']?\s*:\s*["'][^"']*(?:\.env|credentials|secrets?|tokens?|api[_-]?keys?|\.aws\/|\.ssh\/|passwd|shadow)[^"']*["']/i,
    desc: 'MCP tool argument accesses credential file', source: MODULE_SOURCE, weight: 9 },
  { name: 'mcp_tool_definition_poison', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /["']?description["']?\s*:\s*["'][^"']*(?:ignore\s+(?:previous|prior|all)\s+instructions|override\s+(?:safety|security|policy))[^"']*["']/i,
    desc: 'MCP tool definition contains injection in description', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_tool_hidden_instruction', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /["']?(?:description|inputSchema|annotations?)["']?\s*:\s*["'][^"']*(?:IMPORTANT|CRITICAL|NOTE|WARNING)\s*:\s*(?:always|never|you\s+must|before\s+doing\s+anything)[^"']*["']/i,
    desc: 'MCP tool metadata contains hidden instruction', source: MODULE_SOURCE, weight: 9 },
  { name: 'mcp_tool_fs_write', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.WARNING,
    re: /["']?(?:method|action|operation)["']?\s*:\s*["'](?:write|overwrite|delete|remove|unlink|rmdir|truncate)["']/i,
    desc: 'MCP tool call requests destructive file system operation', source: MODULE_SOURCE, weight: 7 },
];

export const MCP_CAPABILITY_PATTERNS: RegexPattern[] = [
  { name: 'mcp_capability_escalation', cat: 'MCP_CAPABILITY_SPOOFING', sev: SEVERITY.CRITICAL,
    re: /["']?capabilities["']?\s*:\s*\{[^}]*["']?(?:admin|root|superuser|unrestricted|all_permissions|sudo)["']?\s*:\s*true/i,
    desc: 'MCP capability declaration requests elevated privileges', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_capability_wildcard', cat: 'MCP_CAPABILITY_SPOOFING', sev: SEVERITY.WARNING,
    re: /["']?(?:permissions|scopes|capabilities)["']?\s*:\s*\[?\s*["']\*["']/i,
    desc: 'MCP capability declares wildcard permission scope', source: MODULE_SOURCE, weight: 8 },
  { name: 'mcp_server_impersonation', cat: 'MCP_CAPABILITY_SPOOFING', sev: SEVERITY.CRITICAL,
    re: /["']?(?:serverInfo|server_info)["']?\s*:\s*\{[^}]*["']?name["']?\s*:\s*["'](?:official|trusted|system|internal)[^"']*["']/i,
    desc: 'MCP server declares itself as official/trusted', source: MODULE_SOURCE, weight: 8 },
];

export const MCP_RESOURCE_PATTERNS: RegexPattern[] = [
  { name: 'mcp_resource_path_traversal', cat: 'MCP_RESOURCE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /["']?(?:uri|url|href|resource|path)["']?\s*:\s*["'][^"']*(?:\.\.\/|\.\.\\)[^"']*["']/i,
    desc: 'MCP resource URI contains path traversal (../)', source: MODULE_SOURCE, weight: 9 },
  { name: 'mcp_resource_file_protocol', cat: 'MCP_RESOURCE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /["']?(?:uri|url|href|resource)["']?\s*:\s*["']file:\/\/(?!\/workspace\/|\/home\/\w+\/Documents\/)[^"']*["']/i,
    desc: 'MCP resource URI uses file:// protocol (non-workspace)', source: MODULE_SOURCE, weight: 9 },
  { name: 'mcp_resource_cloud_metadata', cat: 'MCP_RESOURCE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /["']?(?:uri|url|href|resource)["']?\s*:\s*["'][^"']*169\.254\.169\.254[^"']*["']/i,
    desc: 'MCP resource URI targets cloud metadata endpoint', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_resource_internal_ip', cat: 'MCP_RESOURCE_ATTACK', sev: SEVERITY.WARNING,
    re: /["']?(?:uri|url|href|resource)["']?\s*:\s*["'][^"']*(?:https?:\/\/)?(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.0\.0\.1|localhost)[^"']*["']/i,
    desc: 'MCP resource URI targets internal/private network', source: MODULE_SOURCE, weight: 7 },
];

export const MCP_SAMPLING_PATTERNS: RegexPattern[] = [
  { name: 'mcp_sampling_self_reference', cat: 'MCP_SAMPLING_ABUSE', sev: SEVERITY.WARNING,
    re: /["']?(?:messages|prompt)["']?\s*:.*["']?(?:createMessage|sampling\/createMessage|create_message)["']/i,
    desc: 'MCP sampling references another sampling call (recursive)', source: MODULE_SOURCE, weight: 7 },
  { name: 'mcp_sampling_infinite_maxTokens', cat: 'MCP_SAMPLING_ABUSE', sev: SEVERITY.WARNING,
    re: /["']?maxTokens["']?\s*:\s*(?:999999|\d{7,}|1000000)/i,
    desc: 'MCP sampling requests excessively large maxTokens', source: MODULE_SOURCE, weight: 7 },
];

export const MCP_TYPOSQUAT_PATTERNS: RegexPattern[] = [
  { name: 'mcp_typosquat_read', cat: 'MCP_TYPOSQUATTING', sev: SEVERITY.WARNING,
    re: /["']?(?:name|tool)["']?\s*:\s*["'](?:read_flie|raed_file|read_fille|readd_file|read_fiel)["']/i,
    desc: 'Possible typosquat of read_file tool name', source: MODULE_SOURCE, weight: 7 },
  { name: 'mcp_typosquat_list', cat: 'MCP_TYPOSQUATTING', sev: SEVERITY.WARNING,
    re: /["']?(?:name|tool)["']?\s*:\s*["'](?:list_filles|list_fiels|listt_files|list_flles|lsit_files)["']/i,
    desc: 'Possible typosquat of list_files tool name', source: MODULE_SOURCE, weight: 7 },
  { name: 'mcp_typosquat_execute', cat: 'MCP_TYPOSQUATTING', sev: SEVERITY.WARNING,
    re: /["']?(?:name|tool)["']?\s*:\s*["'](?:excute_command|execute_comand|exeucte_command|execute_commnad)["']/i,
    desc: 'Possible typosquat of execute_command tool name', source: MODULE_SOURCE, weight: 7 },
];

// ============================================================================
// CUSTOM DETECTORS
// ============================================================================

export function detectMcpJsonRpc(text: string): Finding[] {
  const findings: Finding[] = [];
  // Two-pass approach: find "jsonrpc" positions, then extract surrounding JSON via bracket counting
  const jsonRpcMarker = /"jsonrpc"\s*:\s*"[^"]*"/g;
  const markerMatches = [...text.matchAll(jsonRpcMarker)];
  if (markerMatches.length === 0) return findings;

  const extractedMessages: string[] = [];
  for (const marker of markerMatches) {
    // Walk backwards from match to find opening brace
    let start = marker.index!;
    while (start > 0 && text[start] !== '{') start--;
    // Walk forward with bracket counting to find closing brace
    let depth = 0;
    let end = start;
    for (let i = start; i < text.length && i < start + 5000; i++) {
      if (text[i] === '{') depth++;
      if (text[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (depth === 0 && end > start) {
      extractedMessages.push(text.slice(start, end));
    }
  }

  for (const raw of extractedMessages) {
    try {
      const obj = JSON.parse(raw);
      if (obj.jsonrpc && obj.jsonrpc !== '2.0') {
        findings.push({ category: 'MCP_PROTOCOL_VIOLATION', severity: SEVERITY.WARNING,
          description: `MCP message uses non-standard JSON-RPC version: "${obj.jsonrpc}"`,
          match: raw.slice(0, 100), source: MODULE_SOURCE, engine: ENGINE,
          pattern_name: 'mcp_jsonrpc_bad_version', weight: 6 });
      }
      if (typeof obj.method === 'string') {
        const dangerous = ['system.exec', 'os.exec', 'runtime.exec', 'shell.run', 'process.spawn'];
        if (dangerous.some(d => obj.method.toLowerCase().includes(d))) {
          findings.push({ category: 'MCP_PROTOCOL_VIOLATION', severity: SEVERITY.CRITICAL,
            description: `MCP message invokes dangerous method: "${obj.method}"`,
            match: raw.slice(0, 100), source: MODULE_SOURCE, engine: ENGINE,
            pattern_name: 'mcp_jsonrpc_dangerous_method', weight: 10 });
        }
      }
      if (obj.result !== undefined && obj.error !== undefined) {
        findings.push({ category: 'MCP_PROTOCOL_VIOLATION', severity: SEVERITY.WARNING,
          description: 'MCP response contains both "result" and "error" fields',
          match: raw.slice(0, 100), source: MODULE_SOURCE, engine: ENGINE,
          pattern_name: 'mcp_jsonrpc_result_and_error', weight: 6 });
      }
    } catch {
      findings.push({ category: 'MCP_PROTOCOL_VIOLATION', severity: SEVERITY.INFO,
        description: 'Malformed JSON-RPC-like structure detected',
        match: raw.slice(0, 100), source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'mcp_jsonrpc_malformed', weight: 4 });
    }
  }
  return findings;
}

export function detectMcpPathTraversal(text: string): Finding[] {
  const findings: Finding[] = [];
  const uriFieldPattern = /["'](?:uri|url|resource|href|path|endpoint)["']\s*:\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = uriFieldPattern.exec(text)) !== null) {
    const uri = match[1];
    if (!uri) continue;
    try {
      const decodedUri = decodeURIComponent(uri);
      if (decodedUri !== uri && /(?:\.\.\/|\.\.\\)/.test(decodedUri)) {
        findings.push({ category: 'MCP_RESOURCE_ATTACK', severity: SEVERITY.CRITICAL,
          description: 'URL-encoded path traversal in MCP resource URI',
          match: uri.slice(0, 100), source: MODULE_SOURCE, engine: ENGINE,
          pattern_name: 'mcp_encoded_path_traversal', weight: 9 });
      }
    } catch { /* invalid URI encoding */ }
    if (uri.includes('%00') || uri.includes('\0')) {
      findings.push({ category: 'MCP_RESOURCE_ATTACK', severity: SEVERITY.CRITICAL,
        description: 'Null byte injection in MCP resource URI',
        match: uri.slice(0, 100), source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'mcp_null_byte_uri', weight: 9 });
    }
  }
  return findings;
}

export function detectMcpSamplingDepth(text: string): Finding[] {
  const findings: Finding[] = [];
  const samplingRefs = text.match(/["']?(?:method|action)["']?\s*:\s*["'](?:sampling\/createMessage|create_message|createMessage)["']/gi);
  const samplingCount = samplingRefs ? samplingRefs.length : 0;

  if (samplingCount > 3) {
    findings.push({ category: 'MCP_SAMPLING_ABUSE', severity: SEVERITY.CRITICAL,
      description: `Deeply nested MCP sampling: ${samplingCount} references (threshold: 3)`,
      match: `${samplingCount} sampling references`, source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'mcp_sampling_depth_exceeded', weight: 9 });
  } else if (samplingCount > 1) {
    findings.push({ category: 'MCP_SAMPLING_ABUSE', severity: SEVERITY.WARNING,
      description: `Multiple MCP sampling references: ${samplingCount} occurrences`,
      match: `${samplingCount} sampling references`, source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'mcp_sampling_multiple', weight: 6 });
  }
  return findings;
}

// ============================================================================
// ALL GROUPS AND DETECTORS
// ============================================================================

const MCP_PATTERN_GROUPS: { name: string; patterns: RegexPattern[] }[] = [
  { name: 'MCP_TOOL_CALL_PATTERNS', patterns: MCP_TOOL_CALL_PATTERNS },
  { name: 'MCP_CAPABILITY_PATTERNS', patterns: MCP_CAPABILITY_PATTERNS },
  { name: 'MCP_RESOURCE_PATTERNS', patterns: MCP_RESOURCE_PATTERNS },
  { name: 'MCP_SAMPLING_PATTERNS', patterns: MCP_SAMPLING_PATTERNS },
  { name: 'MCP_TYPOSQUAT_PATTERNS', patterns: MCP_TYPOSQUAT_PATTERNS },
];

const MCP_DETECTORS: { name: string; detect: (text: string) => Finding[] }[] = [
  { name: 'mcp-jsonrpc', detect: detectMcpJsonRpc },
  { name: 'mcp-path-traversal', detect: detectMcpPathTraversal },
  { name: 'mcp-sampling-depth', detect: detectMcpSamplingDepth },
];

// ============================================================================
// SCANNER MODULE
// ============================================================================

const mcpParserModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'MCP security analysis: tool manipulation, capability spoofing, resource attacks, sampling abuse, typosquatting',
  supportedContentTypes: ['text/plain', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > 5_000_000) return [];
    const findings: Finding[] = [];
    for (const group of MCP_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({
            category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name,
            source: p.source || MODULE_SOURCE, engine: ENGINE,
            ...(p.weight !== undefined && { weight: p.weight }),
          });
        }
      }
    }
    for (const d of MCP_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount(): number {
    return MCP_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + MCP_DETECTORS.length;
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    const groups = MCP_PATTERN_GROUPS.map(g => ({
      name: g.name, count: g.patterns.length, source: MODULE_SOURCE,
    }));
    groups.push({ name: 'mcp-custom-detectors', count: MCP_DETECTORS.length, source: MODULE_SOURCE });
    return groups;
  },
};

if (!scannerRegistry.hasModule(MODULE_NAME)) {
  scannerRegistry.register(mcpParserModule);
}

export { mcpParserModule };
