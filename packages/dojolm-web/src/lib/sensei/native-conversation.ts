// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei Rework (Pillar B) — loop conversation model + native translators.
 *
 * The Sensei tool-calling loop keeps ONE conversation representation
 * (`LoopTurn[]`) that renders to BOTH transports:
 *
 *   - XML / non-native path  → a flat prompt string (today's contract).
 *   - native path            → structured `ProviderMessage[]` with proper
 *                              tool_use / tool_result id correlation.
 *
 * Both branches normalize provider output to the same `ParsedToolCall`
 * shape so the guard / confirmation / SSE code downstream is transport-
 * agnostic. Pure module (no I/O) so it unit-tests without a network.
 */
import type { ProviderMessage, ProviderToolCall, ProviderToolSpec } from '../llm-types';
import type { SenseiToolDefinition } from './types';
import type { ParsedToolCall } from './tool-parser';

/**
 * A single turn in the Sensei loop conversation. Renderable to the flat
 * prompt (XML path) and to a `ProviderMessage` (native path).
 */
export interface LoopTurn {
  readonly role: 'user' | 'assistant' | 'tool';
  readonly content: string;
  /** assistant turns that emitted tool calls — native correlation. */
  readonly toolCalls?: readonly ProviderToolCall[];
  /** tool turns — the call id this result answers (native correlation). */
  readonly toolCallId?: string;
  /** tool turns — the tool name (flat-prompt label only). */
  readonly toolName?: string;
}

/** Map Sensei tool definitions to native provider tool specs. */
export function toProviderToolSpecs(
  tools: readonly SenseiToolDefinition[],
): ProviderToolSpec[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters as Record<string, unknown>,
  }));
}

/**
 * Normalize a provider's native `ProviderToolCall[]` into the loop's
 * `ParsedToolCall` shape. A blank/absent native id gets a positional
 * fallback (`call_<i>`) so every call is addressable downstream — this is
 * the native half of the id-unification the XML parser does with `tc_*`.
 */
export function normalizeNativeToolCalls(
  calls: readonly ProviderToolCall[] | undefined,
): ParsedToolCall[] {
  if (!calls || calls.length === 0) return [];
  return calls.map((c, i) => ({
    id: typeof c.id === 'string' && c.id.length > 0 ? c.id : `call_${i}`,
    tool: c.name,
    args: Object.freeze({ ...(c.arguments ?? {}) }),
  }));
}

/** Rebuild a native `ProviderToolCall` from a normalized call (assistant turn). */
export function toProviderToolCall(call: ParsedToolCall): ProviderToolCall {
  return { id: call.id, name: call.tool, arguments: { ...call.args } };
}

/**
 * Placeholder that replaces a superseded `get_skill` playbook body once a newer
 * skill has been loaded in the same loop (see `elideSupersededSkillBodies`).
 */
export const SUPERSEDED_SKILL_BODY =
  '[earlier get_skill playbook elided — superseded by a newer skill load; one skill stays resident per turn]';

/**
 * Enforce "exactly one skill body resident per turn" (plan Pillar C). `get_skill`
 * returns a full playbook as a tool result; when the model loads several across
 * tool rounds, every prior body would otherwise stay in the re-rendered prompt,
 * bloating the context and defeating the "one skill at a time" discipline. Keep
 * only the MOST RECENT `get_skill` body; replace earlier ones with a short
 * placeholder.
 *
 * The window is the conversation accumulated within ONE request's tool-calling
 * loop: the SSE client replays only prior user/assistant text (never tool
 * turns), so earlier-request skill bodies never reach here. Only `content` is
 * replaced — `role`/`toolCallId`/`toolName` are preserved so native
 * tool_use↔tool_result id-correlation stays intact. Pure — returns a new array,
 * mutates nothing.
 */
export function elideSupersededSkillBodies(
  turns: readonly LoopTurn[],
  skillToolName: string = 'get_skill',
): LoopTurn[] {
  const isSkillTurn = (t: LoopTurn): boolean =>
    t.role === 'tool' && t.toolName === skillToolName;

  let lastSkillIdx = -1;
  for (let i = 0; i < turns.length; i++) {
    if (isSkillTurn(turns[i])) lastSkillIdx = i;
  }

  return turns.map((t, i) =>
    i !== lastSkillIdx && isSkillTurn(t)
      ? { ...t, content: SUPERSEDED_SKILL_BODY }
      : t,
  );
}

/** Render the loop conversation to the flat prompt string (XML / non-native). */
export function renderFlatPrompt(turns: readonly LoopTurn[]): string {
  return turns
    .map((t) => {
      if (t.role === 'user') return `User: ${t.content}`;
      if (t.role === 'assistant') return `Assistant: ${t.content}`;
      return `Tool Result: ${t.content}`;
    })
    .join('\n\n');
}

/**
 * Render the loop conversation to structured `ProviderMessage[]` (native).
 * The system prompt is passed via the `systemMessage` request option (both
 * the OpenAI and Anthropic adapters merge it), so it is NOT emitted here.
 */
export function renderProviderMessages(
  turns: readonly LoopTurn[],
): ProviderMessage[] {
  return turns.map((t) => {
    if (t.role === 'tool') {
      return {
        role: 'tool',
        content: t.content,
        ...(t.toolCallId ? { toolCallId: t.toolCallId } : {}),
      };
    }
    if (t.role === 'assistant') {
      return {
        role: 'assistant',
        content: t.content,
        ...(t.toolCalls && t.toolCalls.length > 0 ? { toolCalls: t.toolCalls } : {}),
      };
    }
    return { role: 'user', content: t.content };
  });
}
