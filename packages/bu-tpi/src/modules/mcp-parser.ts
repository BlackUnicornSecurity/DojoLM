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
const ENGINE = 'mcp-parser';

// ============================================================================
// REGEX PATTERN GROUPS
// ============================================================================

export const MCP_TOOL_CALL_PATTERNS: RegexPattern[] = [
  { name: 'mcp_tool_exfil_curl', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /["']?(?:command|cmd|exec|run|shell|args?|payload|query|sql|target|url|path)["']?\s*:\s*["'][^"']*(?:curl|wget|nc|ncat|netcat)\b[^"']*["']/i,
    desc: 'MCP tool argument contains exfiltration command', source: MODULE_SOURCE, weight: 9 },
  { name: 'mcp_tool_credential_access', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /["']?(?:path|file|filename|target|resource)["']?\s*:\s*["'][^"']*(?:\.env|credentials|secrets?|tokens?|api[_-]?keys?|\.aws\/|\.ssh\/|passwd|shadow)[^"']*["']/i,
    desc: 'MCP tool argument accesses credential file', source: MODULE_SOURCE, weight: 9 },
  { name: 'mcp_tool_definition_poison', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /["']?(?:description|instructions?|systemPrompt)["']?\s*:\s*["'][^"']*(?:ignore\s+(?:previous|prior|all|safety)\s+instructions|override\s+(?:safety|security|policy)|reveal\s+(?:the\s+)?system\s+prompt|bypass\s+all\s+(?:access\s+controls|restrictions)|unrestricted\s+mode|auto-approve\s+all\s+sampling\s+requests|disable\s+(?:all\s+)?safety\s+guidelines)[^"']*["']/i,
    desc: 'MCP tool definition contains injection in description', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_tool_hidden_instruction', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /["']?(?:description|inputSchema|annotations?|instructions?)["']?\s*:\s*["'][^"']*(?:IMPORTANT|CRITICAL|NOTE|WARNING)\s*:\s*(?:always|never|you\s+must|before\s+doing\s+anything)[^"']*["']/i,
    desc: 'MCP tool metadata contains hidden instruction', source: MODULE_SOURCE, weight: 9 },
  { name: 'mcp_tool_fs_write', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.WARNING,
    re: /["']?(?:method|action|operation)["']?\s*:\s*["'](?:write|overwrite|delete|remove|unlink|rmdir|truncate)["']/i,
    desc: 'MCP tool call requests destructive file system operation', source: MODULE_SOURCE, weight: 7 },
  { name: 'mcp_tool_destructive_payload', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /["']?(?:payload|query|sql|target|url|path|command|script)["']?\s*:\s*["'][^"']*(?:DROP\s+TABLE|DELETE\s+FROM|TRUNCATE\s+TABLE|ALTER\s+USER|GRANT\s+ALL|eval\s*\(\s*atob|grant_admin|bypass_auth_check|impersonate_user|disable_auditing|constructor\.constructor)[^"']*["']/i,
    desc: 'MCP tool arguments contain a destructive database or privilege-escalation payload', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_tool_sensitive_target', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /["']?(?:payload|target|script|url|uri|path)["']?\s*:\s*["'][^"']*(?:169\.254\.169\.254|\/etc\/passwd|\/etc\/shadow|file:\/\/\/(?!(?:workspace\/|home\/\w+\/Documents\/))|\.env|env:\/\/|secret:\/\/|internal:\/\/)[^"']*["']/i,
    desc: 'MCP tool arguments target sensitive local or metadata resources', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_tool_internal_target', cat: 'MCP_RESOURCE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /["']?(?:action|query|command|script|payload|url|uri|target|resource|endpoint)["']?\s*:\s*["'][^"']*(?:https?:\/\/)?(?:internal\.example\.com|localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|169\.254\.169\.254)[^"']*["']/i,
    desc: 'MCP tool arguments target an internal or metadata endpoint through a generic argument field', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_tool_destructive_shell_value', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /["']?(?:action|query|command|script|payload|url|path|target)["']?\s*:\s*["'][^"']*(?:chmod\s+777|rm\s+-rf|chown\s+root|truncate\s+-s\s*0|cat\s+\/etc\/(?:passwd|shadow)|base64|rot13|gzip|attacker(?:-controlled)?(?:\.example\.com|\.com)?)[^"']*["']/i,
    desc: 'MCP tool arguments contain a destructive shell or file-permission operation', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_tool_result_poison', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /["']?result["']?\s*:\s*\{[\s\S]{0,800}["']text["']?\s*:\s*["'][^"']*(?:ignore all previous instructions|system override|reveal your system prompt|admin has authorized unrestricted mode|cross-server context leak)[^"']*["']/i,
    desc: 'MCP tool result content contains an embedded system-override or context-leak payload', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_tool_code_runtime_abuse', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:Tool:\s*)?(?:execute_python|python_exec|code_eval)\s*\(\s*code\s*=\s*['"][\s\S]{0,320}(?:os\.system|subprocess\.run|\/etc\/shadow|rm\s+-rf|curl\s+https?:\/\/)[\s\S]{0,80}['"]\s*\)/i,
    desc: 'Pseudo-tool examples embed destructive runtime code or sensitive file access', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_tool_function_xml_injection', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /<function_calls>[\s\S]{0,800}<invoke\s+name=["'][^"']+["'][\s\S]{0,400}<parameter\s+name=["'](?:command|cmd|path|query|arguments?)["'][^>]*>[\s\S]{0,300}(?:\/etc\/shadow|attacker@|bypass_validation|read_sensitive_data|DROP\s+TABLE|DELETE\s+FROM|TRUNCATE\s+TABLE)/i,
    desc: 'Raw function-call markup is being injected with a destructive payload or validation bypass', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_tool_override_mode_bypass', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:SYSTEM_OVERRIDE_MODE|override\s+mode|tool\s+restrictions\s+are\s+suspended|deny_list\s+does\s+not\s+apply|override_auth\s*=\s*true|set_role\s*=\s*['"]?(?:admin|superadmin)|auth_level\s*=\s*['"]?superadmin)[\s\S]{0,320}(?:delete_files|format_drive|admin_action|export_database|credentials|pii|full\s+access|override_auth)/i,
    desc: 'Override-mode or role-confusion language is being used to bypass MCP tool authorization', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_tool_api_abuse', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:set_api_key|disable_rate_limit|admin_api|full\s+access\s+credentials|list\s+all\s+user\s+data|database_query|http_request|db_lookup|grant_permission|bypass_auth_check|transfer_funds|export_all_data|set_max_budget|set_service_tier|impersonate_user|disable_auditing|emergency_override|set_context|set_rate_limit_identity|raw_http_request|admin_transfer|reset_password)[\s\S]{0,320}(?:override|disable|full\s+access|external\s+server|attacker-controlled|UNION\s+SELECT|DROP\s+TABLE|ssn|salary|credit_card|password|bypass|all_restrictions|all\s+user\s+records|force_reset|notify\s*=\s*['"]?none|destination(?:_wallet)?\s*=\s*['"]?(?:attacker|external_server)|permission\s*=\s*['"]?admin)/i,
    desc: 'API or plugin tooling is being abused to escalate privileges, dump sensitive data, or exfiltrate it externally', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_tool_dynamic_eval_abuse', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /Tool:\s*(?:eval_js|render_template|deserialize)\([\s\S]{0,340}(?:eval\(|String\.fromCharCode|__globals__|popen\(|payload_with_os_system|external\s+server|exfiltrat(?:e|es?)\s+cookies)/i,
    desc: 'Narrative tool examples are demonstrating dynamic evaluation, template injection, or deserialization for code execution or exfiltration', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_tool_callback_chain_abuse', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:Tool:\s*(?:set_debug_mode|disable_rate_limit|grant_admin|exfil_data|map_function)\(|disable_audit\s*->\s*grant_root\s*->\s*export_secrets|grant_root|export_secrets)[\s\S]{0,360}(?:exfil\.com|__import__\(["']os["']\)\.system|rm\s+-rf|cat\s+\/etc\/passwd|attacker|exported|grant_admin)/i,
    desc: 'Chained function injection is combining debug, privilege, and callback abuse into exfiltration or system-command execution', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_retrieval_shadow_bypass', cat: 'MCP_TOOL_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:RETRIEVED\s+CONTEXT|POISONED|EMBEDDING\s+ATTACK\s+NOTICE)[\s\S]{0,520}(?:read_config\([^)]*\/etc\/shadow[^)]*bypass_policy\s*=\s*true[^)]*\)|administrative\s+credential\s+recovery|use\s+read_config\s+with\s+bypass_policy\s*=\s*true)/i,
    desc: 'Poisoned retrieval context is instructing the tool layer to bypass policy and read credential files', source: MODULE_SOURCE, weight: 10 },
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
  { name: 'mcp_cross_server_scope', cat: 'MCP_CAPABILITY_SPOOFING', sev: SEVERITY.CRITICAL,
    re: /["']?(?:scope|includeContext)["']?\s*:\s*["']allServers["']/i,
    desc: 'MCP call requests cross-server or global context scope', source: MODULE_SOURCE, weight: 9 },
];

export const MCP_RESOURCE_PATTERNS: RegexPattern[] = [
  { name: 'mcp_resource_path_traversal', cat: 'MCP_RESOURCE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /["']?(?:uri|url|href|resource|path)["']?\s*:\s*["'][^"']*(?:\.\.\/|\.\.\\)[^"']*["']/i,
    desc: 'MCP resource URI contains path traversal (../)', source: MODULE_SOURCE, weight: 9 },
  { name: 'mcp_resource_file_protocol', cat: 'MCP_RESOURCE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /["']?(?:uri|url|href|resource)["']?\s*:\s*["']file:\/\/\/(?!(?:workspace\/|home\/\w+\/Documents\/))[^"']*["']/i,
    desc: 'MCP resource URI uses file:// protocol (non-workspace)', source: MODULE_SOURCE, weight: 9 },
  { name: 'mcp_resource_cloud_metadata', cat: 'MCP_RESOURCE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /["']?(?:uri|url|href|resource)["']?\s*:\s*["'][^"']*169\.254\.169\.254[^"']*["']/i,
    desc: 'MCP resource URI targets cloud metadata endpoint', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_resource_internal_ip', cat: 'MCP_RESOURCE_ATTACK', sev: SEVERITY.WARNING,
    re: /["']?(?:uri|url|href|resource)["']?\s*:\s*["'][^"']*(?:https?:\/\/)?(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.0\.0\.1|localhost)[^"']*["']/i,
    desc: 'MCP resource URI targets internal/private network', source: MODULE_SOURCE, weight: 7 },
  { name: 'mcp_resource_sensitive_db_uri', cat: 'MCP_RESOURCE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /["']?(?:uri|url|href|resource)["']?\s*:\s*["']db:\/\/[^"']*(?:users|auth|password|token|credential|secret)[^"']*["']/i,
    desc: 'MCP resource URI targets a sensitive database namespace', source: MODULE_SOURCE, weight: 10 },
  { name: 'mcp_resource_internal_scheme', cat: 'MCP_RESOURCE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /["']?(?:uri|url|href|resource)["']?\s*:\s*["'](?:internal|env|secret):\/\/[^"']+["']/i,
    desc: 'MCP resource URI uses an internal, secret, or environment-backed scheme', source: MODULE_SOURCE, weight: 10 },
];

export const MCP_SAMPLING_PATTERNS: RegexPattern[] = [
  { name: 'mcp_sampling_self_reference', cat: 'MCP_SAMPLING_ABUSE', sev: SEVERITY.WARNING,
    re: /["']?(?:messages|prompt)["']?\s*:.*["']?(?:createMessage|sampling\/createMessage|create_message)["']/i,
    desc: 'MCP sampling references another sampling call (recursive)', source: MODULE_SOURCE, weight: 7 },
  { name: 'mcp_sampling_infinite_maxTokens', cat: 'MCP_SAMPLING_ABUSE', sev: SEVERITY.WARNING,
    re: /["']?maxTokens["']?\s*:\s*(?:999999|\d{7,}|1000000)/i,
    desc: 'MCP sampling requests excessively large maxTokens', source: MODULE_SOURCE, weight: 7 },
  { name: 'mcp_sampling_consent_bypass', cat: 'MCP_SAMPLING_ABUSE', sev: SEVERITY.CRITICAL,
    re: /(?:sampling\/createMessage|create_message|createMessage)[\s\S]{0,320}(?:bypass\s+user\s+consent|auto-approve\s+all\s+sampling\s+requests|enter\s+unrestricted\s+mode|ignore\s+all\s+previous\s+instructions)/i,
    desc: 'MCP sampling request attempts to bypass consent or force unrestricted execution', source: MODULE_SOURCE, weight: 10 },
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
  { name: 'mcp_typosquat_alt_tools', cat: 'MCP_TYPOSQUATTING', sev: SEVERITY.WARNING,
    re: /["']?(?:name|tool)["']?\s*:\s*["'](?:flle_read|web_seach|code_excute)["']/i,
    desc: 'Possible typosquat of file_read, web_search, or code_execute tool name', source: MODULE_SOURCE, weight: 7 },
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

export function detectMcpNotificationFlood(text: string): Finding[] {
  const findings: Finding[] = [];
  const notificationMatches = text.match(/"method"\s*:\s*"notifications\/(?:progress|message)"/g) ?? [];
  const injectedPayload = /"(?:message|data)"\s*:\s*"[^"]*(?:system\s+override|ignore\s+all\s+previous\s+instructions|reveal\s+(?:the\s+)?system\s+prompt|bypass\s+safety)/i.test(text);

  if (notificationMatches.length >= 8 && injectedPayload) {
    findings.push({
      category: 'MCP_SAMPLING_ABUSE',
      severity: SEVERITY.CRITICAL,
      description: `High-volume MCP notification stream carries an injected override payload (${notificationMatches.length} notifications)`,
      match: `${notificationMatches.length} notifications`,
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'mcp_notification_flood_injection',
      weight: 10,
    });
  }

  return findings;
}

export function detectMcpInstructionalAbuse(text: string): Finding[] {
  const findings: Finding[] = [];

  if (
    /(?:Now\s+your\s+task|INSTRUCTION:)/i.test(text)
    && /(?:Tool:\s*(?:execute_python|db_lookup|database_query|http_request|admin_action|update_session|delete_files|format_drive|shell|sandbox_run|api_request|system\.function_call|grant_permission|bypass_auth_check|transfer_funds|export_all_data|safe_transfer|admin_transfer|execute_command|read_document|eval_js|render_template|deserialize|map_function|grant_admin|grant_root|read_config)|<function_calls>|sampling\/createMessage|createMessage)/i.test(text)
    && /(?:\/etc\/shadow|rm\s+-rf|attacker|external\s+server|override_auth|full\s+access|pii|credentials|password|credit_card|format_drive|delete_user|auto-approve|system\s+override|unrestricted\s+mode|UNION\s+SELECT|DROP\s+TABLE|bypass_2fa|override_limit|cascade\s*=\s*all|force\s*=\s*true|debug_dashboard|X-Auth-Bypass|emergency_bypass|export\s+the\s+user\s+database|exfiltrat(?:e|es?)\s+cookies|grant_root|export_secrets|bypass_policy\s*=\s*true|eval\s+to\s+execute\s+code|payload_with_os_system)/i.test(text)
  ) {
    findings.push({
      category: 'MCP_TOOL_MANIPULATION',
      severity: SEVERITY.CRITICAL,
      description: 'Instructional content is chaining tool examples into an explicit destructive or exfiltration objective',
      match: text.slice(0, 160),
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'mcp_instructional_abuse',
      weight: 10,
    });
  }

  if (
    /(?:RETRIEVED\s+(?:DOCUMENT|SOURCE)|DOCUMENT\s+CONTENT|Verified:\s*True|Trust\s+Score:\s*\d)/i.test(text)
    && /(?:EMERGENCY_TOKEN|X-Auth-Bypass|admin\/debug_dashboard|export\s+the\s+user\s+database|approved\s+command|bypass(?:es)?\s+(?:standard\s+)?(?:UAC|permission|auth(?:entication)?)\s+checks?|never\s+expires)/i.test(text)
    && /(?:Now\s+your\s+task|INSTRUCTION:|execute\s+it\s+immediately|use\s+the\s+valid\s+bypass\s+token)/i.test(text)
  ) {
    findings.push({
      category: 'MCP_TOOL_MANIPULATION',
      severity: SEVERITY.CRITICAL,
      description: 'Retrieved documentation or verified-source framing is being poisoned with an admin bypass, credential, or execution directive',
      match: text.slice(0, 160),
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'mcp_retrieved_source_poison',
      weight: 10,
    });
  }

  if (
    /(?:Tool:\s*\w[\w.]*\(|Tool:\s*[_a-z][\w_]*\b|Example\s+\d+:)/i.test(text)
    && /(?:Now\s+your\s+task|INSTRUCTION:)/i.test(text)
    && /(?:bypass(?:_|\s+)safety|bypass(?:_|\s+)auth|admin(?:_|\s+)transfer|delete_user|export_all_data|expose\s+all\s+API\s+keys|scrape\s+all\s+user\s+records|rate\s+limits?\s+bypass(?:ed)?|read\s+\/etc\/master_passwords|curl\s+http:\/\/attacker|reset_password|force_reset|destination\s*=\s*['"]?external_server|grant_root|export_secrets|exfiltrat(?:e|es?)\s+cookies|bypass_policy\s*=\s*true|read_config\()/i.test(text)
  ) {
    findings.push({
      category: 'MCP_TOOL_MANIPULATION',
      severity: SEVERITY.CRITICAL,
      description: 'Narrative tool examples are culminating in an explicit destructive, exfiltrative, or authorization-bypass objective',
      match: text.slice(0, 160),
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'mcp_narrative_tool_abuse',
      weight: 10,
    });
  }

  if (
    /(?:serverInfo|server_info)/i.test(text)
    && /"(?:instructions|description)"\s*:\s*"[^"]*(?:impersonates\s+the\s+official\s+filesystem\s+server|ignore\s+all\s+previous\s+instructions|grant\s+full\s+access)[^"]*"/i.test(text)
  ) {
    findings.push({
      category: 'MCP_CAPABILITY_SPOOFING',
      severity: SEVERITY.CRITICAL,
      description: 'Server metadata or instructions are impersonating an official MCP server to win unsafe trust',
      match: text.slice(0, 160),
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'mcp_server_instruction_impersonation',
      weight: 10,
    });
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
  { name: 'mcp-notification-flood', detect: detectMcpNotificationFlood },
  { name: 'mcp-instructional-abuse', detect: detectMcpInstructionalAbuse },
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
