/**
 * D7.7: Shingan L6 — Memory & Context Poisoning Patterns (14 patterns)
 *
 * Detects system prompt overrides, cross-step privilege escalation,
 * tool boundary escapes, and context stuffing in skill/agent content.
 *
 * Zero runtime dependencies. Pure TypeScript.
 */

import type { RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';

const SOURCE = 'D7.7';

// ============================================================================
// System Prompt Override (4 patterns)
// ============================================================================

export const SYSTEM_PROMPT_OVERRIDE_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_ctx_ignore_previous',
    cat: 'SKILL_CONTEXT_POISONING',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:ignore|disregard|forget|override|discard)\s+(?:all\s+)?(?:previous|prior|above|earlier|preceding)\s+(?:instructions?|prompts?|rules?|guidelines?|context|messages?)\b/i,
    desc: 'Instruction to ignore previous system prompt',
    source: SOURCE,
    weight: 10,
  },
  {
    name: 'sg_ctx_you_are_now',
    cat: 'SKILL_CONTEXT_POISONING',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:you\s+are\s+now|from\s+now\s+on\s+you\s+are|henceforth\s+you\s+(?:are|shall\s+be)|your\s+new\s+(?:identity|persona|role)\s+is)\b/i,
    desc: 'Identity reassignment directive',
    source: SOURCE,
    weight: 10,
  },
  {
    name: 'sg_ctx_new_role',
    cat: 'SKILL_CONTEXT_POISONING',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:your\s+(?:new\s+)?role\s+is|assume\s+the\s+role\s+of|act\s+as\s+(?:if\s+you\s+(?:are|were)\s+)?(?:a|an|the))\s+(?:unrestricted|unfiltered|jailbroken|DAN|evil|malicious)\b/i,
    desc: 'Role reassignment to unrestricted persona',
    source: SOURCE,
    weight: 10,
  },
  {
    name: 'sg_ctx_forget_everything',
    cat: 'SKILL_CONTEXT_POISONING',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:forget\s+everything|clear\s+(?:your\s+)?(?:memory|context|history|conversation)|reset\s+(?:your\s+)?(?:instructions?|system\s+prompt|rules?|guidelines?|context))\b/i,
    desc: 'Memory/context clearing directive',
    source: SOURCE,
    weight: 9,
  },
] as const;

// ============================================================================
// Cross-Step Escalation (3 patterns)
// ============================================================================

export const CROSS_STEP_ESCALATION_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_ctx_step_grants_perms',
    cat: 'SKILL_PRIVILEGE_ESCALATION',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:step|phase|stage)\s*\d+[\s\S]{0,100}(?:grant|enable|unlock|allow|activate)\s+(?:permission|access|privilege|capability|admin|root|write|execute)[\s\S]{0,60}(?:step|phase|stage)\s*\d+/i,
    desc: 'Step N grants permissions for later step (escalation chain)',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_ctx_progressive_escalation',
    cat: 'SKILL_PRIVILEGE_ESCALATION',
    sev: SEVERITY.WARNING,
    re: /\b(?:first|initially)\s+(?:read|view|list)[\s\S]{0,120}(?:then|next|after\s+that)\s+(?:write|modify|edit|update)[\s\S]{0,120}(?:then|finally|lastly)\s+(?:execute|run|delete|admin|root)\b/i,
    desc: 'Progressive privilege accumulation pattern (read->write->execute)',
    source: SOURCE,
    weight: 8,
  },
  {
    name: 'sg_ctx_read_write_execute_chain',
    cat: 'SKILL_PRIVILEGE_ESCALATION',
    sev: SEVERITY.WARNING,
    re: /\b(?:permission|access|privilege)\s*[:=]\s*\[?\s*["']?(?:read|view)["']?\s*,\s*["']?(?:write|edit)["']?\s*,\s*["']?(?:execute|admin|delete|root)["']?\s*\]?/i,
    desc: 'Permission array escalation from read to execute/admin',
    source: SOURCE,
    weight: 7,
  },
] as const;

// ============================================================================
// Tool Boundary Escape (4 patterns)
// ============================================================================

export const TOOL_BOUNDARY_ESCAPE_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_ctx_unlisted_tool',
    cat: 'SKILL_BOUNDARY_ESCAPE',
    sev: SEVERITY.WARNING,
    re: /\b(?:also\s+(?:use|call|invoke|run)|additionally\s+(?:use|call|invoke))\s+(?:the\s+)?(?:Bash|Write|Edit|Grep|WebFetch)\s+(?:tool\b)[\s\S]{0,100}(?:not\s+(?:in|listed|included)\s+(?:the\s+)?tools?\b|outside\s+(?:the\s+)?(?:tools?|allowed)\b)/i,
    desc: 'Instruction to use tools not in declared tools array',
    source: SOURCE,
    weight: 8,
  },
  {
    name: 'sg_ctx_disable_sandbox',
    cat: 'SKILL_BOUNDARY_ESCAPE',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:dangerouslyDisableSandbox|dangerouslySkipPermissions|dangerously_?(?:disable|skip|bypass))\b/i,
    desc: 'Sandbox/permission bypass flag reference',
    source: SOURCE,
    weight: 10,
  },
  {
    name: 'sg_ctx_no_verify',
    cat: 'SKILL_BOUNDARY_ESCAPE',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:--no-verify|--skip-verify|--disable-verify|--no-check|--skip-check|--unsafe)\b/,
    desc: 'Verification bypass flag in skill instructions',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_ctx_skip_permissions',
    cat: 'SKILL_BOUNDARY_ESCAPE',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:skipPermissions?|bypassPermissions?|ignorePermissions?|allowAll(?:Tools)?|disableAuth(?:orization)?)\s*[:=]\s*(?:true|1|yes|["']true["'])\b/i,
    desc: 'Permission skip/bypass configuration',
    source: SOURCE,
    weight: 10,
  },
] as const;

// ============================================================================
// Context Stuffing (3 patterns)
// ============================================================================

export const CONTEXT_STUFFING_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_ctx_oversized_description',
    cat: 'SKILL_CONTEXT_STUFFING',
    sev: SEVERITY.WARNING,
    re: /(?:description|desc|content|body)\s*[:=]\s*["'][^"']{10000,}["']/,
    desc: 'Description field exceeds 10KB (context stuffing)',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_ctx_hidden_in_padding',
    cat: 'SKILL_CONTEXT_STUFFING',
    sev: SEVERITY.CRITICAL,
    re: /(?:\s{100,}|(?:\t){50,}|(?:\n){50,})(?:ignore|override|system|you\s+are|execute|eval|bash|curl)\b/i,
    desc: 'Hidden instruction after excessive whitespace padding',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_ctx_comment_payload',
    cat: 'SKILL_CONTEXT_STUFFING',
    sev: SEVERITY.WARNING,
    re: /(?:<!--|\/\*|\/\/|#)\s*(?:HIDDEN|SECRET|REAL|ACTUAL|OVERRIDE)\s*[:=]?\s*(?:ignore|system\s*prompt|you\s+are|execute|eval|fetch|curl)/i,
    desc: 'Payload embedded in code comment',
    source: SOURCE,
    weight: 8,
  },
] as const;

// ============================================================================
// Aggregate
// ============================================================================

export const ALL_CONTEXT_PATTERNS: readonly RegexPattern[] = [
  ...SYSTEM_PROMPT_OVERRIDE_PATTERNS,
  ...CROSS_STEP_ESCALATION_PATTERNS,
  ...TOOL_BOUNDARY_ESCAPE_PATTERNS,
  ...CONTEXT_STUFFING_PATTERNS,
] as const;
