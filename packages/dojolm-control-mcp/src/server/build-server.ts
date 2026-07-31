// SPDX-License-Identifier: Apache-2.0
/**
 * Control-plane MCP server — hand-rolled JSON-RPC 2.0 dispatcher.
 *
 * Shared by both transports (stdio + HTTP). Handles `initialize`, `tools/list`,
 * `tools/call` (with the two-phase confirmation gate), `prompts/list`,
 * `prompts/get`, and `resources/list` + `resources/read` (bundled OSS reference
 * docs + a payload-free fixtures taxonomy index; no disk read, no path to the
 * corpus). The platform's `withAuth`/RBAC is the authoritative gate; this
 * dispatcher adds the friendlier pre-filter,
 * the confirmation gate, secret redaction, and an op-log line per call (never
 * the verbatim mutating args — they are hashed).
 */

import { randomUUID } from 'node:crypto';
import {
  RPC,
  type AuthContext,
  type ControlPrompt,
  type ControlResource,
  type ControlToolDef,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from '../types.js';
import { loadCatalog } from '../catalog/load-catalog.js';
import { loadPrompts, renderPrompt } from '../prompts/load-prompts.js';
import { loadResources } from '../resources/load-resources.js';
import { executeTool, sanitize } from './executor.js';
import {
  ConfirmationStore,
  buildClaims,
  hashArgs,
  issueConfirmationToken,
} from './confirm-gate.js';

export const PROTOCOL_VERSION = '2024-11-05';
export const SERVER_NAME = 'dojolm-control-mcp';
export const SERVER_VERSION = '0.1.0';

/** A single op-log line (no verbatim mutating args — argsHash only). */
export interface OpLogEntry {
  readonly method: string;
  readonly tool?: string;
  readonly identity: string;
  readonly ok: boolean;
  readonly durationMs?: number;
  readonly argsHash?: string;
}

/**
 * A transport lifecycle line (start / stop), emitted through the SAME sink as
 * the per-call OpLogEntry lines so a deployment gets start/stop observability
 * without a platform `auditLog`. No secrets — only the bind host/port for http.
 */
export interface LifecycleEntry {
  readonly event: 'start' | 'stop';
  readonly transport: 'stdio' | 'http';
  readonly host?: string;
  readonly port?: number;
}

/** Any line the control op-log sink accepts (per-call OR transport lifecycle). */
export type ControlLogLine = OpLogEntry | LifecycleEntry;

/** Build a transport lifecycle line. `bind` (http only) carries host/port — no
 * secrets ever. Pure + exported so transports stay thin and the shape is locked. */
export function lifecycleEntry(
  event: LifecycleEntry['event'],
  transport: LifecycleEntry['transport'],
  bind?: { readonly host: string; readonly port: number },
): LifecycleEntry {
  return { event, transport, ...(bind ? { host: bind.host, port: bind.port } : {}) };
}

export interface BuildServerOptions {
  /** Include EE-tier tools + prompts (Enterprise build). Default false. */
  readonly includeEE?: boolean;
  /** Per-deployment HMAC secret for confirmation tokens. Generated per-process
   * if absent (fine for a single local instance; set it for multi-instance HTTP). */
  readonly hmacSecret?: string;
  /** Optional op-log sink. */
  readonly log?: (entry: OpLogEntry) => void;
  /** Injectable fetch (tests). */
  readonly fetchImpl?: typeof fetch;
}

export interface ControlServer {
  /** Handle one JSON-RPC request. Returns null for notifications (no reply). */
  handle(request: JsonRpcRequest, auth: AuthContext): Promise<JsonRpcResponse | null>;
}

function ok(id: JsonRpcRequest['id'], result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, result };
}
function err(id: JsonRpcRequest['id'], code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

/**
 * Friendlier-than-403 pre-filter (defense-in-depth). The dispatcher cannot see
 * the caller's resolved role — the platform derives it from the forwarded key —
 * so the only sound, behavior-neutral check is: an ANONYMOUS caller (no key)
 * cannot reach a tool that needs more than public viewer/read. Authenticated
 * callers always pass here; the platform's `withAuth` stays the authoritative
 * gate. Returns a rejection message, or null to allow.
 */
export function preFilterReject(tool: ControlToolDef, auth: AuthContext): string | null {
  if (auth.apiKey) return null;
  if (tool.minRole === 'viewer' && tool.scopeRequired === 'read') return null;
  return `"${tool.name}" requires authentication (minRole: ${tool.minRole}, scopeRequired: ${tool.scopeRequired}). Provide an API key.`;
}

/**
 * Defense-in-depth traversal guard for resource URIs. Resource reads are an
 * exact-match lookup against a fixed bundled set (no filesystem access, so
 * traversal is structurally impossible) — but we still reject traversal-shaped
 * URIs explicitly, mirroring the adversarial `@dojolm/mcp` server, so the
 * envelope stays trustworthy regardless of any future disk-backed source.
 */
export function isResourceTraversal(uri: string): boolean {
  let decoded = uri;
  try {
    decoded = decodeURIComponent(uri);
  } catch {
    /* malformed escape → fall back to the raw form */
  }
  const hay = `${uri}\n${decoded}`.toLowerCase();
  return hay.includes('..') || hay.includes('%2e%2e') || hay.includes('\0') || hay.includes('%00');
}

/**
 * Resource-read pre-filter (the gap-H anon posture applied to resources). OSS
 * resources are public-read; an `ee`-tier resource requires an authenticated
 * caller. Authenticated callers always pass (the platform stays authoritative).
 * Returns a rejection message, or null to allow.
 */
export function resourceReadReject(resource: ControlResource, auth: AuthContext): string | null {
  if (resource.tier === 'oss') return null;
  if (auth.apiKey) return null;
  return `Resource "${resource.uri}" requires authentication (EE tier). Provide an API key.`;
}

/**
 * For a long-running launch tool, append a `longRunning` hint (statusTool +
 * optional pollAfterSeconds) to the success payload so an external MCP client
 * knows which tool to poll and how long to back off first. No-op for tools
 * without `longRunning`. The launch payload is small (a runId), so this never
 * conflicts with the result cap.
 */
export function withLongRunningHint(tool: ControlToolDef, data: unknown): unknown {
  if (!tool.longRunning) return data;
  const hint: Record<string, unknown> = { statusTool: tool.longRunning.statusTool };
  if (tool.longRunning.pollAfterSeconds !== undefined) {
    hint.pollAfterSeconds = tool.longRunning.pollAfterSeconds;
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return { ...(data as Record<string, unknown>), longRunning: hint };
  }
  return { result: data, longRunning: hint };
}

/** Strip the control fields so only true tool params reach hashing + execution. */
function toolArgs(raw: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (k === 'confirm' || k === 'confirmationToken') continue;
    out[k] = v;
  }
  return out;
}

export function buildControlServer(opts: BuildServerOptions = {}): ControlServer {
  const includeEE = opts.includeEE ?? false;
  const secret = opts.hmacSecret ?? randomUUID();
  const confirmations = new ConfirmationStore();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const log = opts.log ?? (() => {});

  let catalogP: Promise<readonly ControlToolDef[]> | null = null;
  let promptsP: Promise<readonly ControlPrompt[]> | null = null;
  let resourcesP: Promise<readonly ControlResource[]> | null = null;
  const catalog = () => (catalogP ??= loadCatalog(includeEE));
  const prompts = () => (promptsP ??= loadPrompts(includeEE));
  const resources = () => (resourcesP ??= loadResources(includeEE));

  async function handle(request: JsonRpcRequest, auth: AuthContext): Promise<JsonRpcResponse | null> {
    if (request.jsonrpc !== '2.0') {
      return err(request.id ?? null, RPC.INVALID_REQUEST, 'Invalid Request: must be JSON-RPC 2.0');
    }
    if (typeof request.method !== 'string') {
      return err(request.id ?? null, RPC.INVALID_REQUEST, 'Invalid Request: method must be a string');
    }
    // Notifications (no reply expected).
    if (request.method.startsWith('notifications/')) return null;

    switch (request.method) {
      case 'initialize':
        log({ method: 'initialize', identity: auth.identity, ok: true });
        return ok(request.id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: { listChanged: false },
            prompts: { listChanged: false },
            resources: { listChanged: false },
          },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        });

      case 'tools/list': {
        const tools = (await catalog()).map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: t.inputSchema,
        }));
        log({ method: 'tools/list', identity: auth.identity, ok: true });
        return ok(request.id, { tools });
      }

      case 'tools/call':
        return handleToolsCall(request, auth);

      case 'prompts/list': {
        const list = (await prompts()).map((p) => ({
          name: p.name,
          title: p.title,
          description: p.description,
          arguments: p.arguments.map((a) => ({ name: a.name, description: a.description, required: a.required })),
        }));
        log({ method: 'prompts/list', identity: auth.identity, ok: true });
        return ok(request.id, { prompts: list });
      }

      case 'prompts/get':
        return handlePromptsGet(request, auth);

      case 'resources/list': {
        const list = (await resources()).map((r) => ({
          uri: r.uri,
          name: r.name,
          title: r.title,
          description: r.description,
          mimeType: r.mimeType,
        }));
        log({ method: 'resources/list', identity: auth.identity, ok: true });
        return ok(request.id, { resources: list });
      }

      case 'resources/read':
        return handleResourcesRead(request, auth);

      default: {
        const safe = String(request.method).slice(0, 100).replace(/[^\w/\-.]/g, '?');
        return err(request.id, RPC.METHOD_NOT_FOUND, `Method not found: ${safe}`);
      }
    }
  }

  async function handleToolsCall(request: JsonRpcRequest, auth: AuthContext): Promise<JsonRpcResponse> {
    const params = request.params as { name?: string; arguments?: Record<string, unknown> } | undefined;
    const name = params?.name;
    if (!name) return err(request.id, RPC.INVALID_PARAMS, 'Invalid params: missing tool name');

    const tool = (await catalog()).find((t) => t.name === name);
    if (!tool) return err(request.id, RPC.INVALID_PARAMS, `Tool not found: ${name.slice(0, 64)}`);

    // --- minRole/scope pre-filter (friendlier-than-403, defense-in-depth) ---
    // Runs BEFORE the confirmation gate so an anonymous caller never even
    // receives a confirmation token for a tool it cannot execute. Surfaced as an
    // isError tool-result — the same wire shape the platform's 401 would produce,
    // just earlier, friendlier, and without the doomed round-trip.
    const reject = preFilterReject(tool, auth);
    if (reject) {
      log({ method: 'tools/call', tool: name, identity: auth.identity, ok: false });
      return ok(request.id, {
        content: [{ type: 'text', text: JSON.stringify({ error: reject }) }],
        isError: true,
      });
    }

    const args = toolArgs(params?.arguments);
    const raw = params?.arguments ?? {};

    // --- two-phase confirmation gate ---
    if (tool.requiresConfirmation) {
      const confirmed = raw.confirm === true;
      const token = typeof raw.confirmationToken === 'string' ? raw.confirmationToken : undefined;
      if (!confirmed || !token) {
        const claims = buildClaims(`${name}-${randomUUID()}`, name, args, auth.identity, secret);
        const confirmationToken = issueConfirmationToken(claims, secret);
        log({ method: 'tools/call', tool: name, identity: auth.identity, ok: true, argsHash: claims.argsHash });
        return ok(request.id, {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'confirmation_required',
              tool: name,
              arguments: args,
              confirmationToken,
              expiresInSeconds: 300,
              message: 'This tool mutates state. Re-call with the same arguments plus confirm:true and this confirmationToken to execute.',
            }),
          }],
          isError: false,
        });
      }
      const verdict = confirmations.verifyAndConsume(
        token, { tool: name, argsHash: hashArgs(args, secret), identity: auth.identity }, secret,
      );
      if (!verdict.ok) {
        log({ method: 'tools/call', tool: name, identity: auth.identity, ok: false, argsHash: hashArgs(args, secret) });
        return err(request.id, RPC.INVALID_PARAMS, `Confirmation failed: ${verdict.reason}`);
      }
    }

    // --- execute ---
    const result = await executeTool(tool, args, auth, fetchImpl);
    log({
      method: 'tools/call', tool: name, identity: auth.identity,
      ok: result.ok, durationMs: result.durationMs, argsHash: hashArgs(args, secret),
    });
    const payload = result.ok ? withLongRunningHint(tool, result.data) : { error: result.error };
    return ok(request.id, {
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      isError: !result.ok,
    });
  }

  async function handlePromptsGet(request: JsonRpcRequest, auth: AuthContext): Promise<JsonRpcResponse> {
    const params = request.params as { name?: string; arguments?: Record<string, unknown> } | undefined;
    const name = params?.name;
    if (!name) return err(request.id, RPC.INVALID_PARAMS, 'Invalid params: missing prompt name');

    const prompt = (await prompts()).find((p) => p.name === name);
    if (!prompt) return err(request.id, RPC.INVALID_PARAMS, `Prompt not found: ${name.slice(0, 64)}`);

    let text: string;
    try {
      text = renderPrompt(prompt, params?.arguments ?? {});
    } catch (e) {
      return err(request.id, RPC.INVALID_PARAMS, e instanceof Error ? e.message : 'Invalid prompt arguments');
    }
    log({ method: 'prompts/get', tool: name, identity: auth.identity, ok: true });
    return ok(request.id, {
      description: prompt.description,
      messages: [{ role: 'user', content: { type: 'text', text } }],
    });
  }

  async function handleResourcesRead(request: JsonRpcRequest, auth: AuthContext): Promise<JsonRpcResponse> {
    const params = request.params as { uri?: string } | undefined;
    const uri = params?.uri;
    if (!uri) return err(request.id, RPC.INVALID_PARAMS, 'Invalid params: missing uri');

    // Block traversal-shaped URIs BEFORE the lookup (defense in depth).
    if (isResourceTraversal(uri)) {
      log({ method: 'resources/read', identity: auth.identity, ok: false });
      return err(request.id, RPC.INVALID_PARAMS, 'Access denied: traversal attempt detected');
    }

    const resource = (await resources()).find((r) => r.uri === uri);
    if (!resource) return err(request.id, RPC.INVALID_PARAMS, 'Resource not found');

    // Anon pre-filter (gap-H posture): EE resources require auth; OSS are public-read.
    const reject = resourceReadReject(resource, auth);
    if (reject) {
      log({ method: 'resources/read', identity: auth.identity, ok: false });
      return err(request.id, RPC.INVALID_PARAMS, reject);
    }

    // Run bundled content through the same sanitizer the executor uses
    // (secret redaction + HTML strip + size cap) before returning it.
    const text = String(sanitize(resource.text));
    log({ method: 'resources/read', tool: resource.name, identity: auth.identity, ok: true });
    return ok(request.id, {
      contents: [{ uri: resource.uri, mimeType: resource.mimeType, text }],
    });
  }

  return { handle };
}
