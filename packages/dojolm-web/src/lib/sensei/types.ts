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

export interface SenseiToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>; // JSON Schema
  readonly endpoint: string;
  readonly method: 'GET' | 'POST';
  readonly mutating: boolean;
  readonly requiresConfirmation: boolean;
  readonly minRole: 'viewer' | 'user' | 'admin';
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type SenseiMessageRole =
  | 'user'
  | 'assistant'
  | 'system'
  | 'tool_result';

export interface SenseiMessage {
  readonly id: string;
  readonly role: SenseiMessageRole;
  readonly content: string;
  readonly toolCalls?: readonly SenseiToolCall[];
  readonly toolResults?: readonly SenseiToolResult[];
  readonly timestamp: number;
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
