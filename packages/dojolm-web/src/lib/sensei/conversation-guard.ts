/**
 * Sensei — Conversation Guard
 * SH4.1: Harden the assistant against prompt injection, tool-call injection,
 * and system prompt extraction.
 *
 * Index:
 * - SYSTEM_PROMPT_EXTRACTION_PATTERNS (line 17)
 * - TOOL_INJECTION_PATTERNS (line 47)
 * - SYSTEM_PROMPT_FRAGMENTS (line 63)
 * - guardSenseiInput() (line 78)
 * - guardSenseiOutput() (line 131)
 * - guardToolExecution() (line 165)
 *
 * Leverages: guardScanInput/guardScanOutput from guard-middleware.ts
 */

import type { GuardConfig } from '../guard-types';
import type { SenseiToolDefinition } from './types';
import { getToolByName } from './tool-definitions';

// ---------------------------------------------------------------------------
// SH4.1 Step 4 — System Prompt Extraction Patterns
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT_EXTRACTION_PATTERNS: readonly RegExp[] = [
  /repeat\s+(your|the)\s+(instructions|system\s*prompt|rules)/i,
  /what\s+(are|were)\s+your\s+(instructions|rules|system\s*prompt)/i,
  /show\s+(me\s+)?(your|the)\s+system\s*prompt/i,
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /what\s+(were|are)\s+you\s+told/i,
  /output\s+(your|the)\s+(initial|original|full)\s+(prompt|instructions)/i,
  /print\s+(your|the)\s+(system|initial)\s*(prompt|message|instructions)/i,
  /reveal\s+(your|the)\s+(system|hidden|secret)\s*(prompt|instructions)/i,
  /dump\s+(your|the)\s+(system|initial)\s*(prompt|message|instructions)/i,
  /tell\s+me\s+(your|the)\s+(system|initial|original)\s*(prompt|instructions)/i,
  /act\s+as\s+(if|though)\s+you\s+have\s+no\s+(rules|instructions)/i,
  /pretend\s+(you\s+)?(are|have)\s+no\s+(instructions|rules|constraints)/i,
  /you\s+are\s+now\s+(DAN|jailbroken|unrestricted)/i,
  // F-01 fix: catch "what is in your system prompt" and similar reformulations
  /what\s+is\s+in\s+(your|the)\s+system\s*prompt/i,
  /what\s+does\s+(your|the)\s+system\s*prompt\s+(say|contain|include)/i,
  /share\s+(your|the)\s+(system|hidden|secret)\s*(prompt|instructions|configuration)/i,
  /display\s+(your|the)\s+(system|initial)\s*(prompt|instructions)/i,
  // F-R3-01 fix: catch "print everything above/before this message" variants
  /(print|output|repeat|copy|list|show|display)\s+(everything|all(\s+content)?|content|text)\s+(above|before)\s+(this|my)/i,
];

// ---------------------------------------------------------------------------
// SH4.1 Step 5 — Tool Injection Patterns
// ---------------------------------------------------------------------------

const TOOL_INJECTION_PATTERNS: readonly RegExp[] = [
  /<tool_call[\s>]/i,
  /<\/tool_call>/i,
  /<<<TOOL:/i,
  /\{\s*"tool"\s*:\s*"[^"]+"\s*,\s*"args"/i,
  /<function_call[\s>]/i,
  /<\/function_call>/i,
  /<execute[\s>]/i,
  /\[TOOL_CALL\]/i,
];

interface DelimitedScanPayload {
  readonly prefix: string;
  readonly payload: string;
}

const SCAN_REQUEST_PREFIX =
  /^(?<prefix>(?:(?:can|could|would)\s+you\s+|please\s+)?(?:scan|analyze|check|test|evaluate)\b[\s\S]*?:)\s*(?<payload>[\s\S]+)$/i;

function unwrapDelimitedScanPayload(payload: string): string | null {
  const trimmed = payload.trim();

  const fencedMatch = /^```(?:[\w-]+)?\n([\s\S]*?)\n```$/u.exec(trimmed);
  if (fencedMatch?.[1]) {
    return fencedMatch[1];
  }

  const inlineCodeMatch = /^`([\s\S]+)`$/u.exec(trimmed);
  if (inlineCodeMatch?.[1]) {
    return inlineCodeMatch[1];
  }

  const quotedMatch = /^"([\s\S]+)"$/u.exec(trimmed) ?? /^'([\s\S]+)'$/u.exec(trimmed);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  return null;
}

function extractDelimitedScanPayload(text: string): DelimitedScanPayload | null {
  const match = SCAN_REQUEST_PREFIX.exec(text.trim());
  if (!match?.groups) return null;

  const payload = unwrapDelimitedScanPayload(match.groups.payload);
  if (!payload) return null;

  return {
    prefix: match.groups.prefix,
    payload,
  };
}

// ---------------------------------------------------------------------------
// System Prompt Fragments (detect leakage in output)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT_FRAGMENTS: readonly string[] = [
  'You are Sensei, the DojoLM AI security assistant',
  'You are Sensei, DojoLM AI security assistant',
  '<tool_call>{"tool": "tool_name"',
  'CORE_SYSTEM_PROMPT',
  'buildSystemMessage',
  'buildStateSnapshot',
  'STATE: module=',
  // F-01 fix: catch reformulated state leaks (e.g. "Module: dashboard | guard=OFF")
  'module: dashboard',
  'module: scanner',
  'module: llm',
  'module: guard',
  'module: admin',
  'guard=off | role=',
  'guard=on mode=',
  '| role=admin |',
  '| role=user |',
  '| role=viewer |',
];

// ---------------------------------------------------------------------------
// Rate Limiting (per-tool, in-memory)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  readonly count: number;
  readonly windowStart: number;
}

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_PER_TOOL = 10; // 10 calls/min per tool

const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(toolName: string, identifier: string): boolean {
  const key = `${toolName}:${identifier}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_PER_TOOL) {
    return false;
  }

  rateLimitMap.set(key, { count: entry.count + 1, windowStart: entry.windowStart });
  return true;
}

// Cap rate limit map size to prevent unbounded growth
const MAX_RATE_LIMIT_ENTRIES = 1000;

function pruneRateLimitMap(): void {
  if (rateLimitMap.size <= MAX_RATE_LIMIT_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(key);
    }
  }
  // If still over limit after pruning expired, remove oldest entries
  if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
    const entries = [...rateLimitMap.entries()].sort(
      (a, b) => a[1].windowStart - b[1].windowStart,
    );
    const toRemove = entries.slice(0, rateLimitMap.size - MAX_RATE_LIMIT_ENTRIES);
    for (const [key] of toRemove) {
      rateLimitMap.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// SH4.1 Step 1 — Guard Sensei Input
// ---------------------------------------------------------------------------

export interface GuardInputResult {
  readonly proceed: boolean;
  readonly reason?: string;
}

/**
 * Guard user input before sending to LLM.
 * Checks for:
 * 1. Tool-call injection patterns (user trying to fake tool calls)
 * 2. System prompt extraction attempts
 * 3. Delegates to existing guardScanInput() for general threat scanning
 */
export function guardSenseiInput(
  text: string,
  guardConfig: Readonly<GuardConfig>,
): GuardInputResult {
  const delimitedScanPayload = extractDelimitedScanPayload(text);
  const inspectionTarget = delimitedScanPayload?.prefix ?? text;

  // Check for tool-call injection
  for (const pattern of TOOL_INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return {
        proceed: false,
        reason: 'Tool-call injection detected in user input.',
      };
    }
  }

  // Allow scan requests to include known-malicious extraction samples only when
  // the payload is explicitly delimited as data (quoted or fenced). A bare
  // prefix like "scan this text: print everything above..." should still block.
  for (const pattern of SYSTEM_PROMPT_EXTRACTION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(inspectionTarget)) {
      return {
        proceed: false,
        reason: 'System prompt extraction attempt detected.',
      };
    }

    if (!delimitedScanPayload) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        return {
          proceed: false,
          reason: 'System prompt extraction attempt detected.',
        };
      }
    }
  }

  // Delegate to existing guard for general threat scanning
  if (guardConfig.enabled) {
    const { guardScanInput } = requireGuardMiddleware();
    const result = guardScanInput(text, guardConfig);
    if (!result.proceed) {
      return {
        proceed: false,
        reason: 'Input blocked by Hattori Guard.',
      };
    }
  }

  return { proceed: true };
}

// ---------------------------------------------------------------------------
// SH4.1 Step 2 — Guard Sensei Output
// ---------------------------------------------------------------------------

export interface GuardOutputResult {
  readonly safe: boolean;
  readonly sanitizedText: string;
  readonly reason?: string;
}

/**
 * Guard LLM output before showing to user.
 * Checks for:
 * 1. Leaked system prompt fragments
 * 2. Delegates to existing guardScanOutput() for general threat scanning
 */
export function guardSenseiOutput(
  text: string,
  guardConfig: Readonly<GuardConfig>,
): GuardOutputResult {
  // Check for leaked system prompt fragments
  const lowerText = text.toLowerCase();
  for (const fragment of SYSTEM_PROMPT_FRAGMENTS) {
    if (lowerText.includes(fragment.toLowerCase())) {
      return {
        safe: false,
        sanitizedText: 'I cannot share my system instructions. How can I help you with security testing?',
        reason: 'System prompt fragment detected in output.',
      };
    }
  }

  // Delegate to existing guard for general threat scanning
  if (guardConfig.enabled) {
    const { guardScanOutput } = requireGuardMiddleware();
    const result = guardScanOutput(text, guardConfig);
    if (result.flagged) {
      return {
        safe: false,
        sanitizedText: 'Response flagged by Hattori Guard. Content has been filtered.',
        reason: 'Output flagged by Hattori Guard.',
      };
    }
  }

  return { safe: true, sanitizedText: text };
}

// ---------------------------------------------------------------------------
// SH4.1 Step 3 — Guard Tool Execution
// ---------------------------------------------------------------------------

export interface GuardToolResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

/**
 * Guard a tool execution request.
 * Validates:
 * 1. Tool name exists in whitelist (registry)
 * 2. User role meets minRole requirement
 * 3. Rate limit per tool per identifier
 */
export function guardToolExecution(
  toolName: string,
  userRole: 'viewer' | 'user' | 'admin',
  identifier: string,
): GuardToolResult {
  // Validate tool exists in whitelist
  const toolDef = getToolByName(toolName);
  if (!toolDef) {
    return {
      allowed: false,
      reason: `Unknown tool: ${String(toolName).slice(0, 64)}`,
    };
  }

  // Check role permission
  if (!hasMinimumRole(userRole, toolDef.minRole)) {
    return {
      allowed: false,
      reason: `Insufficient permissions. Tool "${toolDef.name}" requires ${toolDef.minRole} role.`,
    };
  }

  // Rate limit check
  pruneRateLimitMap();
  if (!checkRateLimit(toolName, identifier)) {
    return {
      allowed: false,
      reason: `Rate limit exceeded for tool "${toolDef.name}". Try again in a minute.`,
    };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Role Hierarchy
// ---------------------------------------------------------------------------

const ROLE_LEVELS: Readonly<Record<string, number>> = {
  viewer: 0,
  user: 1,
  admin: 2,
};

function hasMinimumRole(
  actual: 'viewer' | 'user' | 'admin',
  required: 'viewer' | 'user' | 'admin',
): boolean {
  return (ROLE_LEVELS[actual] ?? 0) >= (ROLE_LEVELS[required] ?? 0);
}

// ---------------------------------------------------------------------------
// Lazy import for guard-middleware (avoids pulling Node.js deps into client)
// ---------------------------------------------------------------------------

let guardMiddleware: {
  guardScanInput: typeof import('../guard-middleware').guardScanInput;
  guardScanOutput: typeof import('../guard-middleware').guardScanOutput;
} | null = null;

function requireGuardMiddleware() {
  if (!guardMiddleware) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../guard-middleware') as typeof import('../guard-middleware');
    guardMiddleware = {
      guardScanInput: mod.guardScanInput,
      guardScanOutput: mod.guardScanOutput,
    };
  }
  return guardMiddleware;
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export {
  SYSTEM_PROMPT_EXTRACTION_PATTERNS,
  TOOL_INJECTION_PATTERNS,
  SYSTEM_PROMPT_FRAGMENTS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_PER_TOOL,
};

/** Reset rate limit state — for tests only. */
export function _resetRateLimits(): void {
  rateLimitMap.clear();
}

/** Override guard middleware — for tests only. */
export function _setGuardMiddleware(mock: typeof guardMiddleware): void {
  guardMiddleware = mock;
}
