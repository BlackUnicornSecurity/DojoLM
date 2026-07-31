// SPDX-License-Identifier: Apache-2.0
/**
 * File: providers/openai-tool-wire.ts
 * Purpose: Pure translators between the neutral native-tool-calling shapes
 *   (ProviderToolSpec / ProviderToolChoice / ProviderMessage / ProviderToolCall)
 *   and the OpenAI-compatible wire format, for adapters that live in the
 *   `bu-tpi` package (currently the Sensei brain adapter).
 *
 * Why a second copy: dojolm-web owns an equivalent `providers/tool-wire.ts`
 *   (openai + ollama + anthropic), but it lives in the dojolm-web package and
 *   `bu-tpi` sits BELOW it in the dependency graph — bu-tpi must not import from
 *   dojolm-web. This module carries only the OpenAI-compatible subset the Sensei
 *   adapter needs, over bu-tpi's own neutral types. Keep the two in sync.
 *
 * Everything here is pure + side-effect free so it unit-tests without a network
 * mock; the adapter owns the fetch + response plumbing.
 */

import type {
  ProviderToolSpec,
  ProviderToolChoice,
  ProviderMessage,
  ProviderToolCall,
  ProviderDoneReason,
} from '../types.js';

interface OpenAIToolWire {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
}

/** Translate neutral tool specs → OpenAI `tools` array. */
export function toOpenAITools(specs: readonly ProviderToolSpec[]): OpenAIToolWire[] {
  return specs.map((spec) => ({
    type: 'function',
    function: {
      name: spec.name,
      description: spec.description,
      parameters: spec.parameters,
    },
  }));
}

/** OpenAI accepts the choice strings ('auto' | 'none' | 'required') verbatim. */
export function toOpenAIToolChoice(
  choice: ProviderToolChoice | undefined,
): ProviderToolChoice {
  return choice ?? 'auto';
}

interface OpenAIMessageWire {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly tool_calls?: ReadonlyArray<{
    readonly id: string;
    readonly type: 'function';
    readonly function: { readonly name: string; readonly arguments: string };
  }>;
  readonly tool_call_id?: string;
}

/**
 * Translate a structured conversation → OpenAI `messages` array. Assistant
 * tool calls become `tool_calls`; `role:'tool'` results carry `tool_call_id`.
 */
export function toOpenAIMessages(
  messages: readonly ProviderMessage[],
): OpenAIMessageWire[] {
  return messages.map((m) => {
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant',
        content: m.content ?? '',
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments ?? {}) },
        })),
      };
    }
    if (m.role === 'tool') {
      return {
        role: 'tool',
        content: m.content ?? '',
        tool_call_id: m.toolCallId ?? '',
      };
    }
    return { role: m.role, content: m.content ?? '' };
  });
}

/**
 * Extract normalized tool calls from an OpenAI-compatible response message.
 * Tolerates `arguments` as a JSON string (OpenAI) or an object (some local
 * builds). Calls missing a name are dropped; a missing id falls back to a
 * positional `call_<index>`.
 */
export function parseOpenAIToolCalls(
  message: Record<string, unknown> | undefined,
): ProviderToolCall[] {
  const rawCalls = message?.tool_calls;
  if (!Array.isArray(rawCalls) || rawCalls.length === 0) return [];

  const calls: ProviderToolCall[] = [];
  rawCalls.forEach((raw, index) => {
    if (typeof raw !== 'object' || raw === null) return;
    const r = raw as Record<string, unknown>;
    const fn = r.function as Record<string, unknown> | undefined;
    const name = typeof fn?.name === 'string' ? fn.name : undefined;
    if (!name) return;

    const id = typeof r.id === 'string' && r.id ? r.id : `call_${index}`;
    calls.push({ id, name, arguments: coerceArguments(fn?.arguments) });
  });
  return calls;
}

/** Coerce a wire `arguments` value (JSON string or object) → a plain object. */
function coerceArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    if (raw.trim() === '') return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

/**
 * Normalize an OpenAI-compatible `finish_reason` onto the neutral
 * ProviderDoneReason union (mirrors dojolm-web's openai adapter). `content_filter`
 * is intentionally NOT mapped (the adapter surfaces it via filtered/filterReason),
 * and `tool_calls` maps to undefined — the model paused to emit native tool calls,
 * which is neither an error nor a natural stop, so the empty-completion banner
 * must not misfire.
 */
export function normalizeOpenAIFinishReason(raw: unknown): ProviderDoneReason | undefined {
  if (typeof raw !== 'string' || raw.length === 0) return undefined;
  switch (raw) {
    case 'stop':
    case 'length':
    case 'load':
    case 'error':
      return raw;
    case 'content_filter':
    case 'tool_calls':
      return undefined;
    default:
      return undefined;
  }
}
