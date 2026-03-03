/**
 * @module types
 * Core type definitions for the Adversarial MCP Server.
 * AdversarialTool interface defined here per SME HIGH-04.
 */

// ---------------------------------------------------------------------------
// Attack Types & Modes
// ---------------------------------------------------------------------------

export type AttackType =
  // P4: MCP attacks
  | 'capability-spoofing'
  | 'tool-poisoning'
  | 'uri-traversal'
  | 'sampling-loop'
  | 'name-typosquatting'
  | 'cross-server-leak'
  | 'notification-flood'
  | 'prompt-injection'
  // P5: Adversarial tool attacks
  | 'vector-db-poisoning'
  | 'browser-exploitation'
  | 'api-exploitation'
  | 'filesystem-exploitation'
  | 'model-exploitation'
  | 'email-exploitation'
  | 'code-repository-poisoning'
  | 'message-queue-exploitation'
  | 'search-poisoning';

export type AttackModeName = 'passive' | 'basic' | 'advanced' | 'aggressive';

export interface AttackModeConfig {
  readonly id: AttackModeName;
  readonly name: string;
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly enabledAttacks: readonly AttackType[];
}

// ---------------------------------------------------------------------------
// MCP JSON-RPC 2.0
// ---------------------------------------------------------------------------

export interface JsonRpcRequest {
  readonly jsonrpc: '2.0';
  readonly id?: number | string;
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  readonly jsonrpc: '2.0';
  readonly id: number | string | null;
  readonly result?: unknown;
  readonly error?: JsonRpcError;
}

export interface JsonRpcError {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

// ---------------------------------------------------------------------------
// MCP Protocol Types
// ---------------------------------------------------------------------------

export interface MCPCapabilities {
  readonly tools?: Record<string, unknown>;
  readonly resources?: Record<string, unknown>;
  readonly prompts?: Record<string, unknown>;
  readonly logging?: Record<string, unknown>;
  readonly sampling?: Record<string, unknown>;
}

export interface MCPToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema?: {
    readonly type: 'object';
    readonly properties?: Record<string, unknown>;
    readonly required?: readonly string[];
  };
}

export interface MCPResource {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType?: string;
}

export interface MCPToolCallParams {
  readonly name: string;
  readonly arguments?: Record<string, unknown>;
}

export interface MCPToolCallResult {
  readonly content: Array<{
    readonly type: string;
    readonly text?: string;
    readonly data?: string;
    readonly mimeType?: string;
  }>;
  readonly isError?: boolean;
}

export interface MCPResourceReadParams {
  readonly uri: string;
}

export interface MCPResourceContent {
  readonly uri: string;
  readonly mimeType?: string;
  readonly text?: string;
  readonly blob?: string;
}

export interface MCPSamplingParams {
  readonly messages: Array<{
    readonly role: 'user' | 'assistant';
    readonly content: {
      readonly type: string;
      readonly text?: string;
    };
  }>;
  readonly modelPreferences?: Record<string, unknown>;
  readonly maxTokens?: number;
}

// ---------------------------------------------------------------------------
// AdversarialTool Interface (SME HIGH-04: defined in S40, not deferred)
// ---------------------------------------------------------------------------

export interface AdversarialTool {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: AttackType;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly mcpDefinition: MCPToolDefinition;
  execute(args: Record<string, unknown>, mode: AttackModeName): AdversarialToolResult;
}

export interface AdversarialToolResult {
  readonly content: Array<{
    readonly type: string;
    readonly text?: string;
  }>;
  readonly isError?: boolean;
  readonly metadata: {
    readonly attackType: AttackType;
    readonly payloadId: string;
    readonly encoding?: string;
  };
}

// ---------------------------------------------------------------------------
// Attack Scenarios & Payloads
// ---------------------------------------------------------------------------

export interface AttackScenario {
  readonly id: string;
  readonly name: string;
  readonly type: AttackType;
  readonly description: string;
  readonly payloads: readonly AttackPayload[];
}

export interface AttackPayload {
  readonly id: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly content: string;
  readonly encoding?: string;
  readonly minMode: AttackModeName;
}

// ---------------------------------------------------------------------------
// Server Configuration
// ---------------------------------------------------------------------------

export interface AdversarialServerConfig {
  readonly host: string;
  readonly port: number;
  readonly defaultMode: AttackModeName;
  readonly timeoutMs: number;
  readonly maxSamplingDepth: number;
  readonly enabledScenarios?: readonly AttackType[];
  readonly consentRequired: boolean;
}

export const DEFAULT_SERVER_CONFIG: AdversarialServerConfig = {
  host: '127.0.0.1',       // SME HIGH-14: localhost only
  port: 18000,             // SME MED-14: port range 18000-18100
  defaultMode: 'basic',
  timeoutMs: 5 * 60 * 1000, // SME HIGH-15: 5 min default timeout
  maxSamplingDepth: 5,
  consentRequired: true,
};

// ---------------------------------------------------------------------------
// Event Logging
// ---------------------------------------------------------------------------

export type MCPEventType =
  | 'initialize'
  | 'tool_list'
  | 'tool_call'
  | 'resource_list'
  | 'resource_read'
  | 'sampling_create'
  | 'notification'
  | 'error'
  | 'mode_change'
  | 'shutdown'
  | 'consent';

export interface MCPEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly type: MCPEventType;
  readonly method?: string;
  readonly params?: Record<string, unknown>;
  readonly result?: unknown;
  readonly attackType?: AttackType;
  readonly mode: AttackModeName;
  readonly metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Virtual Filesystem (SME CRIT-03: sandboxing)
// ---------------------------------------------------------------------------

export interface VirtualFile {
  readonly path: string;
  readonly content: string;
  readonly mimeType: string;
}

// ---------------------------------------------------------------------------
// Detection Metrics
// ---------------------------------------------------------------------------

export interface DetectionMetrics {
  readonly scenarioId: string;
  readonly attackType: AttackType;
  readonly payloadDelivered: boolean;
  readonly instructionsFollowed: boolean | null;
  readonly detectedByClient: boolean | null;
  readonly responseCategory: 'compliant' | 'resistant' | 'unknown';
  readonly timestamp: string;
}

// ---------------------------------------------------------------------------
// Health & Status
// ---------------------------------------------------------------------------

export interface ServerStatus {
  readonly running: boolean;
  readonly mode: AttackModeName;
  readonly uptime: number;
  readonly totalEvents: number;
  readonly activeScenarios: readonly string[];
  readonly connectedClients: number;
}
