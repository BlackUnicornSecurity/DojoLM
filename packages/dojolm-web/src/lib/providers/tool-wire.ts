// SPDX-License-Identifier: Apache-2.0
/**
 * File: providers/tool-wire.ts
 * Purpose: Pure translators between the neutral native-tool-calling shapes
 *   (ProviderToolSpec / ProviderToolChoice / ProviderMessage / ProviderToolCall)
 *   and each provider's wire format. Shared by the OpenAI-compatible adapters
 *   (openai, ollama) and the Anthropic adapter.
 *
 * Everything here is pure + side-effect free so it can be unit-tested without a
 * network mock; the provider adapters own the fetch + response plumbing.
 *
 * Index:
 * - OpenAI-compatible: toOpenAITools / toOpenAIToolChoice / toOpenAIMessages /
 *   parseOpenAIToolCalls
 * - Anthropic: toAnthropicTools / toAnthropicToolChoice / toAnthropicMessages /
 *   parseAnthropicContent
 */

import type {
  ProviderToolSpec,
  ProviderToolChoice,
  ProviderMessage,
  ProviderToolCall,
} from '../llm-types';

// ===========================================================================
// OpenAI-compatible wire format (openai + ollama)
// ===========================================================================

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
  choice: ProviderToolChoice | undefined
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
  messages: readonly ProviderMessage[]
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
 * Tolerates `arguments` as a JSON string (OpenAI) or an object (some Ollama
 * builds). Calls missing a name are dropped; a missing id falls back to a
 * positional `call_<index>`.
 */
export function parseOpenAIToolCalls(
  message: Record<string, unknown> | undefined
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

// ===========================================================================
// Anthropic wire format
// ===========================================================================

interface AnthropicToolWire {
  readonly name: string;
  readonly description: string;
  readonly input_schema: Record<string, unknown>;
}

/** Translate neutral tool specs → Anthropic `tools` array (`input_schema`). */
export function toAnthropicTools(
  specs: readonly ProviderToolSpec[]
): AnthropicToolWire[] {
  return specs.map((spec) => ({
    name: spec.name,
    description: spec.description,
    input_schema: spec.parameters,
  }));
}

type AnthropicToolChoiceWire = { readonly type: 'auto' | 'any' | 'none' };

/** Map the neutral choice onto Anthropic's `tool_choice` object form. */
export function toAnthropicToolChoice(
  choice: ProviderToolChoice | undefined
): AnthropicToolChoiceWire {
  switch (choice) {
    case 'required':
      return { type: 'any' };
    case 'none':
      return { type: 'none' };
    case 'auto':
    default:
      return { type: 'auto' };
  }
}

type AnthropicContentBlock =
  | { readonly type: 'text'; readonly text: string }
  | {
      readonly type: 'tool_use';
      readonly id: string;
      readonly name: string;
      readonly input: Record<string, unknown>;
    }
  | { readonly type: 'tool_result'; readonly tool_use_id: string; readonly content: string };

interface AnthropicMessageWire {
  readonly role: 'user' | 'assistant';
  readonly content: string | readonly AnthropicContentBlock[];
}

/**
 * Translate a structured conversation → Anthropic `messages`. Anthropic has
 * only user/assistant roles: assistant tool calls become `tool_use` content
 * blocks, and `role:'tool'` results become `tool_result` blocks on a user
 * turn (consecutive results are coalesced into one user message, as the API
 * requires). `role:'system'` messages are dropped — the adapter carries the
 * system prompt on `body.system`.
 */
export function toAnthropicMessages(
  messages: readonly ProviderMessage[]
): AnthropicMessageWire[] {
  return messages.reduce<AnthropicMessageWire[]>((acc, m) => {
    if (m.role === 'system') return acc;

    if (m.role === 'tool') {
      const block: AnthropicContentBlock = {
        type: 'tool_result',
        tool_use_id: m.toolCallId ?? '',
        content: m.content ?? '',
      };
      const last = acc[acc.length - 1];
      if (last && last.role === 'user' && Array.isArray(last.content)) {
        return [
          ...acc.slice(0, -1),
          { role: 'user', content: [...last.content, block] },
        ];
      }
      return [...acc, { role: 'user', content: [block] }];
    }

    if (m.role === 'assistant' && m.toolCalls?.length) {
      const textBlocks: AnthropicContentBlock[] = m.content
        ? [{ type: 'text', text: m.content }]
        : [];
      const toolBlocks: AnthropicContentBlock[] = m.toolCalls.map((tc) => ({
        type: 'tool_use',
        id: tc.id,
        name: tc.name,
        input: { ...(tc.arguments ?? {}) },
      }));
      return [...acc, { role: 'assistant', content: [...textBlocks, ...toolBlocks] }];
    }

    return [
      ...acc,
      { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content ?? '' },
    ];
  }, []);
}

/**
 * Pull the system prompt out of a structured conversation. Anthropic carries
 * system on `body.system` (not in the messages array), so adapters use this to
 * recover a system prompt that was supplied only as a `role:'system'` message.
 * Returns the joined system content, or undefined when there is none.
 */
export function extractSystemPrompt(
  messages: readonly ProviderMessage[] | undefined
): string | undefined {
  if (!messages?.length) return undefined;
  const parts = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content ?? '')
    .filter((c) => c !== '');
  return parts.length ? parts.join('\n') : undefined;
}

export interface AnthropicParsedContent {
  readonly text: string;
  readonly toolCalls: ProviderToolCall[];
}

/**
 * Split an Anthropic response `content` array into joined text and normalized
 * tool calls (`tool_use` blocks). Non-array content yields empty results.
 */
export function parseAnthropicContent(content: unknown): AnthropicParsedContent {
  if (!Array.isArray(content)) {
    return { text: '', toolCalls: [] };
  }

  const textParts: string[] = [];
  const toolCalls: ProviderToolCall[] = [];

  content.forEach((block, index) => {
    if (typeof block !== 'object' || block === null) return;
    const b = block as Record<string, unknown>;

    if (b.type === 'text' && typeof b.text === 'string') {
      textParts.push(b.text);
    } else if (b.type === 'tool_use') {
      const name = typeof b.name === 'string' ? b.name : undefined;
      if (!name) return;
      const input =
        b.input && typeof b.input === 'object' && !Array.isArray(b.input)
          ? (b.input as Record<string, unknown>)
          : {};
      const id = typeof b.id === 'string' && b.id ? b.id : `toolu_${index}`;
      toolCalls.push({ id, name, arguments: input });
    }
  });

  return { text: textParts.join(''), toolCalls };
}
