// SPDX-License-Identifier: Apache-2.0
/**
 * @dojolm/mcp-control — shared types.
 *
 * The control plane speaks MCP over hand-rolled JSON-RPC 2.0 (mirroring the
 * adversarial `@dojolm/mcp` server — no `@modelcontextprotocol/sdk` dependency,
 * so `npx @dojolm/mcp-control` stays install-light and the OSS clean-room build
 * needs nothing extra). These are the wire + catalog shapes.
 */

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 wire types
// ---------------------------------------------------------------------------

export interface JsonRpcRequest {
  readonly jsonrpc: '2.0';
  readonly id?: number | string | null;
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

export interface JsonRpcError {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

export interface JsonRpcResponse {
  readonly jsonrpc: '2.0';
  readonly id: number | string | null;
  readonly result?: unknown;
  readonly error?: JsonRpcError;
}

/** Standard JSON-RPC / MCP error codes used by the dispatcher. */
export const RPC = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// ---------------------------------------------------------------------------
// Catalog (canonical tool definitions)
// ---------------------------------------------------------------------------

/** Platform RBAC role. The platform's `withAuth` is the authoritative gate;
 * `minRole` here is only a friendlier pre-filter than a raw 403. */
export type ControlRole = 'viewer' | 'user' | 'admin';

/** API-key scope the tool conceptually needs (read < mutate < admin). */
export type ControlScope = 'read' | 'mutate' | 'admin';

/** OSS/EE tier. `ee` tools live in the BUSL catalog and are stripped from the
 * OSS export; they are merged only via the guarded dynamic import. */
export type ControlTier = 'oss' | 'ee';

export interface ControlToolDef {
  /** MCP tool name (snake_case, stable). */
  readonly name: string;
  /** Human title for tools/list. */
  readonly title: string;
  /** What the tool does + when to use it. */
  readonly description: string;
  /** JSON Schema for the tool arguments (MCP `inputSchema`). */
  readonly inputSchema: Record<string, unknown>;
  /** Platform endpoint the executor calls (relative; base URL from ctx). */
  readonly endpoint: string;
  readonly method: 'GET' | 'POST';
  /** True if the call changes state. */
  readonly mutating: boolean;
  /** True if the call must pass the two-phase confirmation gate. */
  readonly requiresConfirmation: boolean;
  /** Friendlier-than-403 pre-filter role. */
  readonly minRole: ControlRole;
  /** Scope the caller's key conceptually needs. */
  readonly scopeRequired: ControlScope;
  /** OSS/EE tier. */
  readonly tier: ControlTier;
  /** Async tools: returns a runId fast; poll `statusTool` for status/report.
   * `pollAfterSeconds` is a backoff hint surfaced in the launch result so an
   * external MCP client waits instead of hammering the status tool. */
  readonly longRunning?: { readonly statusTool: string; readonly pollAfterSeconds?: number };
  /**
   * Skip the executor's 4 KB result cap (secret redaction + HTML-strip still
   * apply). For report / status / export tools whose full body an external MCP
   * client must receive intact. Default (undefined) → the 4 KB cap applies.
   * The in-app `McpToolSource` path re-runs the app's own `sanitizeResult`, so
   * this exemption only un-caps the external transports.
   */
  readonly noTruncate?: boolean;
}

// ---------------------------------------------------------------------------
// MCP prompt (skill playbook) shape
// ---------------------------------------------------------------------------

export interface ControlPromptArg {
  readonly name: string;
  readonly description: string;
  readonly required: boolean;
}

export interface ControlPrompt {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly arguments: readonly ControlPromptArg[];
  readonly tier: ControlTier;
  /** Template body; `{{arg}}` placeholders are interpolated by prompts/get. */
  readonly template: string;
}

// ---------------------------------------------------------------------------
// MCP resource (bundled reference content) shape
// ---------------------------------------------------------------------------

/**
 * A read-only MCP resource. Content is BUNDLED with the package (`text` is a
 * self-contained constant) — the control MCP never reads the `dojolm://`
 * namespace off disk, so there is no path to the harmful-payload fixtures
 * corpus and no filesystem-traversal surface. OSS resources are public-read;
 * `ee`-tier resources require an authenticated caller (gap-H posture).
 */
export interface ControlResource {
  /** Stable resource URI (always under the `dojolm://` scheme). */
  readonly uri: string;
  /** Short machine name (last path segment). */
  readonly name: string;
  /** Human title for resources/list. */
  readonly title: string;
  /** What the resource contains. */
  readonly description: string;
  /** MIME type of `text` (e.g. text/markdown, application/json). */
  readonly mimeType: string;
  /** OSS/EE tier. EE resources require auth. */
  readonly tier: ControlTier;
  /** Bundled, self-contained content. No disk read, ever. */
  readonly text: string;
}

// ---------------------------------------------------------------------------
// Execution context (per call) — confused-deputy-safe
// ---------------------------------------------------------------------------

/** Resolved per request: the platform base URL + the CALLER's forwarded key.
 * The MCP never holds an ambient platform credential on the HTTP transport. */
export interface AuthContext {
  readonly baseUrl: string;
  /** The caller's `x-api-key` (forwarded). Absent → unauthenticated call. */
  readonly apiKey?: string;
  /** Stable per-caller identity for confirmation-token binding + rate limit. */
  readonly identity: string;
}
