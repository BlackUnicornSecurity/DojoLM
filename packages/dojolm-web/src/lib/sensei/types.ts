// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — Type Definitions
 * SH1.1: All Sensei types for the AI assistant engine.
 */

import type { NavId } from '../constants';
import type { GuardConfig } from '../guard-types';

// ---------------------------------------------------------------------------
// Tool Call & Result
// ---------------------------------------------------------------------------

export interface SenseiToolCall {
  readonly id: string;
  readonly tool: string;
  readonly args: Readonly<Record<string, unknown>>;
  readonly status:
    | 'pending'
    | 'confirmed'
    | 'rejected'
    | 'executed'
    | 'error';
}

export interface SenseiToolResult {
  readonly toolCallId: string;
  readonly tool: string;
  readonly success: boolean;
  readonly data: unknown;
  readonly error?: string;
  readonly durationMs: number;
}

// ---------------------------------------------------------------------------
// Tool Definition (registry entry)
// ---------------------------------------------------------------------------

/** Role required to see/run a tool. Hierarchy: viewer < user < admin. */
export type SenseiToolRole = 'viewer' | 'user' | 'admin';

/**
 * OSS/EE tier of a tool. `'ee'` tools are only registered when the EE build is
 * active and are stripped from the OSS public export. Undefined === `'oss'`.
 */
export type SenseiToolTier = 'oss' | 'ee';

export interface SenseiToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>; // JSON Schema
  readonly endpoint: string;
  readonly method: 'GET' | 'POST';
  readonly mutating: boolean;
  readonly requiresConfirmation: boolean;
  readonly minRole: SenseiToolRole;
  /** OSS/EE tier. Optional; undefined is treated as `'oss'`. */
  readonly tier?: SenseiToolTier;
  /**
   * Runtime env-flag gate (env var name, e.g. `'AGENTIC_ENABLED'`). When set,
   * the tool is hidden from the tool list AND refused at dispatch unless
   * `process.env[flagName] === 'true'` (F-QA-038 — keeps stub tools like
   * `run_agentic_test` off by default without an EE retier). Same pattern as
   * `ATEMI_ENABLED`.
   */
  readonly flagName?: string;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type SenseiMessageRole =
  | 'user'
  | 'assistant'
  | 'system'
  | 'tool_result';

/**
 * E4.S5 — Cost / latency footer metadata.
 * Populated on assistant messages once the SSE `done` event arrives with
 * `usage` + `model` + `durationMs`. Renders as `<FooterChip />` beneath the
 * assistant bubble (e.g., "qwen3-coder:30b · 1.4s · 245 tokens").
 *
 * Retires F-7-016, F-7-017, F-7-021, F-7-024, F-7-025.
 */
export interface SenseiMessageFooter {
  readonly model: string;
  readonly durationMs: number;
  readonly tokens: number;
}

export interface SenseiMessage {
  readonly id: string;
  readonly role: SenseiMessageRole;
  readonly content: string;
  readonly toolCalls?: readonly SenseiToolCall[];
  readonly toolResults?: readonly SenseiToolResult[];
  readonly timestamp: number;
  /** E4.S5 — populated on assistant messages with cost/latency footer info. */
  readonly footer?: SenseiMessageFooter;
}

// ---------------------------------------------------------------------------
// Context (injected into system prompt)
// ---------------------------------------------------------------------------

export interface SenseiContext {
  readonly activeModule: NavId;
  readonly guardConfig: Readonly<GuardConfig>;
  readonly configuredModels: readonly string[];
  readonly recentActivity: readonly string[];
  readonly userRole: 'viewer' | 'user' | 'admin';
}

// ---------------------------------------------------------------------------
// Conversation (localStorage persistence)
// ---------------------------------------------------------------------------

export interface SenseiConversation {
  readonly id: string;
  readonly messages: readonly SenseiMessage[];
  readonly modelId: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

// ---------------------------------------------------------------------------
// SSE Stream Events (discriminated union)
// ---------------------------------------------------------------------------

export interface SenseiStreamTextEvent {
  readonly type: 'text';
  readonly content: string;
}

export interface SenseiStreamToolCallEvent {
  readonly type: 'tool_call';
  readonly callId: string;
  readonly tool: string;
  readonly args: Readonly<Record<string, unknown>>;
}

export interface SenseiStreamToolResultEvent {
  readonly type: 'tool_result';
  readonly callId: string;
  readonly tool: string;
  readonly result: Readonly<SenseiToolResult>;
}

export interface SenseiStreamConfirmationEvent {
  readonly type: 'confirmation_needed';
  readonly callId: string;
  readonly tool: string;
  readonly args: Readonly<Record<string, unknown>>;
  readonly description: string;
}

export interface SenseiStreamDoneEvent {
  readonly type: 'done';
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  /** E4.S5 — model id (e.g., "qwen3-coder:30b"); populated when known. */
  readonly model?: string;
  /** E4.S5 — wall-clock duration from request start to last chunk in ms. */
  readonly durationMs?: number;
  /**
   * E4.S4 — propagated from `ProviderResponse.doneReason` so the client can
   * branch on empty completion (`length` + 0-length content → "Model
   * returned no output") vs context overflow (`length` + non-empty content
   * → "Prompt too long for this model"). Optional — legacy providers and
   * tests that don't surface a finish reason omit it.
   */
  readonly doneReason?: 'stop' | 'length' | 'load' | 'error';
  /**
   * E4.S4 — model context window in tokens (e.g., 128_000 for llama3.2).
   * Populated by the server via `adapter.getMaxContext(model)` so the
   * context-overflow banner can read "Prompt too long for this model
   * (X tokens, Y max)". Optional — adapters without a context-window
   * lookup omit it; the client falls back to "Y max" being unknown.
   */
  readonly maxContextTokens?: number;
}

export interface SenseiStreamErrorEvent {
  readonly type: 'error';
  readonly message: string;
}

export type SenseiStreamEvent =
  | SenseiStreamTextEvent
  | SenseiStreamToolCallEvent
  | SenseiStreamToolResultEvent
  | SenseiStreamConfirmationEvent
  | SenseiStreamDoneEvent
  | SenseiStreamErrorEvent;
