/**
 * D7.3: Shingan L2 — Code-Level Payload Patterns (18 patterns)
 *
 * Detects shell injection, encoded payloads, obfuscation,
 * rug-pull triggers, and tool override attempts in skill content.
 *
 * Zero runtime dependencies. Pure TypeScript.
 */

import type { RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';

const SOURCE = 'D7.3';

// ============================================================================
// Shell Injection (4 patterns)
// ============================================================================

export const SHELL_INJECTION_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_shell_backtick_exec',
    cat: 'SKILL_PAYLOAD_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /`(?:curl|wget|bash|sh|nc|ncat|python|perl|ruby|node)\s+[^`]{5,}`/i,
    desc: 'Backtick command execution with network/shell binary',
    source: SOURCE,
    weight: 10,
  },
  {
    name: 'sg_shell_subst_exec',
    cat: 'SKILL_PAYLOAD_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\$\(\s*(?:curl|wget|bash|sh|nc|ncat|python|perl|ruby|node)\s+[^)]{5,}\)/i,
    desc: '$() command substitution with dangerous binary',
    source: SOURCE,
    weight: 10,
  },
  {
    name: 'sg_eval_exec',
    cat: 'SKILL_PAYLOAD_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:eval|exec|execSync|Function)\s*\(\s*(?:["'`][\s\S]{10,}["'`]|[a-zA-Z_]\w*)/,
    desc: 'Dynamic code execution via eval/exec/Function',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_child_process_exec',
    cat: 'SKILL_PAYLOAD_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:child_process|require\s*\(\s*["']child_process["']\s*\))[\s\S]{0,50}\.(?:exec|spawn|execFile|fork)\s*\(/,
    desc: 'child_process exec/spawn invocation',
    source: SOURCE,
    weight: 10,
  },
] as const;

// ============================================================================
// Encoded Payloads (4 patterns)
// ============================================================================

export const ENCODED_PAYLOAD_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_base64_long_string',
    cat: 'SKILL_ENCODED_PAYLOAD',
    sev: SEVERITY.WARNING,
    re: /(?:atob|btoa|Buffer\.from|base64(?:_?decode)?)\s*\(\s*["'][A-Za-z0-9+/=]{40,}["']/,
    desc: 'Base64-encoded string > 40 chars in skill body',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_hex_encoded_command',
    cat: 'SKILL_ENCODED_PAYLOAD',
    sev: SEVERITY.WARNING,
    re: /\\x(?:[0-9a-fA-F]{2}){10,}/,
    desc: 'Hex-encoded byte sequence (potential obfuscated command)',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_unicode_escape_seq',
    cat: 'SKILL_ENCODED_PAYLOAD',
    sev: SEVERITY.WARNING,
    re: /(?:\\u[0-9a-fA-F]{4}){8,}/,
    desc: 'Long Unicode escape sequence (potential obfuscated payload)',
    source: SOURCE,
    weight: 6,
  },
  {
    name: 'sg_percent_encoded_payload',
    cat: 'SKILL_ENCODED_PAYLOAD',
    sev: SEVERITY.WARNING,
    re: /(?:%[0-9a-fA-F]{2}){15,}/,
    desc: 'Heavy percent-encoding (potential obfuscated payload)',
    source: SOURCE,
    weight: 6,
  },
] as const;

// ============================================================================
// Obfuscation (3 patterns)
// ============================================================================

export const OBFUSCATION_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_zero_width_chars',
    cat: 'SKILL_OBFUSCATION',
    sev: SEVERITY.CRITICAL,
    re: /[\u200B\u200C\u200D\uFEFF\u00AD]{3,}/,
    desc: 'Multiple zero-width characters (hidden instructions)',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_homoglyph_substitution',
    cat: 'SKILL_OBFUSCATION',
    sev: SEVERITY.WARNING,
    re: /[\u0400-\u04FF][\u0000-\u007F]|[\u0000-\u007F][\u0400-\u04FF]|[\u0370-\u03FF][\u0041-\u005A]|[\u0041-\u005A][\u0370-\u03FF]/,
    desc: 'Mixed script characters (Cyrillic/Greek with Latin — homoglyph attack)',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_invisible_unicode',
    cat: 'SKILL_OBFUSCATION',
    sev: SEVERITY.CRITICAL,
    re: /(?:[\u2060\u2061\u2062\u2063\u2064\u180E\u034F\u17B4\u17B5]|\uDB40[\uDC01-\uDC7F]){2,}/,
    desc: 'Invisible Unicode characters (word joiners, invisible operators)',
    source: SOURCE,
    weight: 8,
  },
] as const;

// ============================================================================
// Rug-Pull Triggers (4 patterns)
// ============================================================================

export const RUG_PULL_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_date_conditional',
    cat: 'SKILL_RUG_PULL',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:new\s+Date|Date\.now|Date\.parse)\b[\s\S]{0,80}(?:getMonth|getFullYear|getDate|getTime)[\s\S]{0,80}(?:if|switch|\?|&&)/,
    desc: 'Date-conditional behavior (time-bomb pattern)',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_version_gated_payload',
    cat: 'SKILL_RUG_PULL',
    sev: SEVERITY.WARNING,
    re: /(?:version|ver|v)\s*(?:>=?|===?|!==?)\s*["']?\d+\.\d+[\s\S]{0,60}(?:eval|exec|fetch|require|import)/i,
    desc: 'Version-gated code execution payload',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_env_dependent_path',
    cat: 'SKILL_RUG_PULL',
    sev: SEVERITY.WARNING,
    re: /\bprocess\.env\.\w+[\s\S]{0,40}(?:\?\s*[^:]+\s*:\s*|if\s*\(|&&)[\s\S]{0,60}(?:eval|exec|fetch|spawn|child_process)/,
    desc: 'Environment-dependent code execution path',
    source: SOURCE,
    weight: 8,
  },
  {
    name: 'sg_settimeout_encoded',
    cat: 'SKILL_RUG_PULL',
    sev: SEVERITY.CRITICAL,
    re: /\bsetTimeout\s*\(\s*(?:atob|Buffer\.from|decodeURI|unescape)\s*\(/,
    desc: 'setTimeout with encoded/decoded callback',
    source: SOURCE,
    weight: 9,
  },
] as const;

// ============================================================================
// Tool Override (3 patterns)
// ============================================================================

export const TOOL_OVERRIDE_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_redefine_core_tool',
    cat: 'SKILL_TOOL_OVERRIDE',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:function|const|let|var|class)\s+(?:Read|Write|Bash|Edit|Grep|Glob)\b[\s\S]{0,40}(?:\{|=>|=)/,
    desc: 'Redefining a core tool function (Read/Write/Bash/Edit)',
    source: SOURCE,
    weight: 10,
  },
  {
    name: 'sg_override_safety',
    cat: 'SKILL_TOOL_OVERRIDE',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:override|replace|redefine|monkey[\s_-]?patch|prototype\.\w+\s*=)[\s\S]{0,60}(?:safety|validate|sanitize|check|filter|guard|block)/i,
    desc: 'Overriding safety/validation functions',
    source: SOURCE,
    weight: 10,
  },
  {
    name: 'sg_disable_sandbox',
    cat: 'SKILL_TOOL_OVERRIDE',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:dangerouslyDisableSandbox|dangerouslySkipPermissions|--no-sandbox|--disable-sandbox|sandbox\s*[:=]\s*(?:false|0|off|disabled))\b/i,
    desc: 'Disabling sandbox or permission checks',
    source: SOURCE,
    weight: 10,
  },
] as const;

// ============================================================================
// Aggregate
// ============================================================================

export const ALL_PAYLOAD_PATTERNS: readonly RegexPattern[] = [
  ...SHELL_INJECTION_PATTERNS,
  ...ENCODED_PAYLOAD_PATTERNS,
  ...OBFUSCATION_PATTERNS,
  ...RUG_PULL_PATTERNS,
  ...TOOL_OVERRIDE_PATTERNS,
] as const;
