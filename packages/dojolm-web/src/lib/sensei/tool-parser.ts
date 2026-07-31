// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — Tool Call Parser
 * SH3.1: Parse `<tool_call>` blocks from LLM output and validate against registry.
 */

import { getToolByName } from './tool-definitions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Predicate deciding whether a parsed tool name is a known/dispatchable tool.
 * Injectable so the parser can validate against the **live** tool source (which
 * may source defs from the control catalog) rather than only the static
 * registry — keeping the `<tool_call>` XML path and the MCP source in agreement
 * on the tool set (plan Pillar B). Defaults to the registry.
 */
export type IsKnownTool = (name: string) => boolean;

/** Default validator — the in-app static registry (preserves prior behavior). */
const registryIsKnownTool: IsKnownTool = (name) => getToolByName(name) !== undefined;

export interface ParsedToolCall {
  readonly id: string;
  readonly tool: string;
  readonly args: Readonly<Record<string, unknown>>;
}

export interface ExtractResult {
  readonly displayText: string;
  readonly toolCalls: readonly ParsedToolCall[];
}

// ---------------------------------------------------------------------------
// Regex — matches <tool_call>...</tool_call> blocks (non-greedy, outermost)
// ---------------------------------------------------------------------------

const TOOL_CALL_REGEX = /<tool_call>([\s\S]*?)<\/tool_call>/g;

// ---------------------------------------------------------------------------
// SH3.1 Step 1 — Extract tool calls from LLM response
// ---------------------------------------------------------------------------

let callCounter = 0;

/**
 * Extract tool calls from LLM output text.
 * Returns cleaned display text (tool_call tags removed) and parsed calls.
 * Malformed JSON blocks are silently skipped.
 * Only calls whose tool name passes `isKnownTool` (default = the registry) are
 * included.
 */
export function extractToolCalls(
  text: string,
  isKnownTool: IsKnownTool = registryIsKnownTool,
): ExtractResult {
  const toolCalls: ParsedToolCall[] = [];

  // Remove all <tool_call>...</tool_call> blocks from display text
  const displayText = text.replace(TOOL_CALL_REGEX, '').trim();

  // Reset regex lastIndex for fresh iteration
  TOOL_CALL_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TOOL_CALL_REGEX.exec(text)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        continue;
      }

      const obj = parsed as Record<string, unknown>;
      const toolName =
        typeof obj.tool === 'string' ? obj.tool.trim() : undefined;
      if (!toolName) continue;

      // Validate tool name against the resolved (live or registry) tool set
      if (!isKnownTool(toolName)) continue;

      const args =
        typeof obj.args === 'object' && obj.args !== null && !Array.isArray(obj.args)
          ? (obj.args as Record<string, unknown>)
          : {};

      callCounter += 1;
      toolCalls.push({
        id: `tc_${Date.now()}_${callCounter}`,
        tool: toolName,
        args: Object.freeze({ ...args }),
      });
    } catch {
      // Malformed JSON — skip this block
      continue;
    }
  }

  return Object.freeze({ displayText, toolCalls: Object.freeze(toolCalls) });
}

// ---------------------------------------------------------------------------
// SH3.1 Step 3 — Escape tool_call tags in user input (injection prevention)
// ---------------------------------------------------------------------------

/**
 * Escape `<tool_call>` patterns in user input to prevent injection.
 * Replaces angle brackets with HTML entities so they render as text.
 */
export function escapeToolCallTags(text: string): string {
  // Escape complete opening tags: <tool_call> or <tool_call ...>
  let result = text.replace(/<tool_call\s*>/gi, '&lt;tool_call&gt;');
  // Escape partial opening tags without closing > (e.g. "<tool_call without closing")
  result = result.replace(/<tool_call\b(?!\s*>)/gi, '&lt;tool_call');
  // Escape closing tags
  result = result.replace(/<\/tool_call>/gi, '&lt;/tool_call&gt;');
  return result;
}
