// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — Tool Source Seam
 *
 * A narrow interface the chat route depends on instead of the concrete tool
 * registry. Two implementations share it:
 *
 *  - `LocalToolSource` (ships now) wraps the existing `SENSEI_TOOLS` array +
 *    `executeToolCall`, so today's 36 tools keep working byte-for-byte.
 *  - `McpToolSource` (Sensei Rework step 10) consumes the `@dojolm/mcp-control`
 *    catalog + executor in-process for the tools it covers, falling back to
 *    `LocalToolSource` for the rest (never shrinking the surface).
 *
 * Swapping sources is a one-line factory change — the chat route only ever
 * touches `SenseiToolSource`. Role + OSS/EE tier filtering live here so an OSS
 * deployment never even *describes* an EE tool to the model, and `execute`
 * re-checks both (defense in depth) so a jailbroken model can't name an
 * out-of-tier or above-role tool by string.
 */

import type { NavId } from '../constants';
import type {
  SenseiToolDefinition,
  SenseiToolResult,
  SenseiToolRole,
  SenseiToolTier,
} from './types';
import type { SenseiPersona } from './personas';
// Type-only import (erased at runtime) of the control-plane catalog shapes. The
// runtime values (`loadCatalog`/`executeTool`) are pulled via a lazy dynamic
// `import()` inside `McpToolSource` so the default `LocalToolSource` graph never
// loads `@dojolm/mcp-control`.
import type { ControlToolDef, AuthContext } from '@dojolm/mcp-control';
import { SENSEI_TOOLS, getToolByName } from './tool-definitions';
import { executeToolCall, sanitizeResult } from './tool-executor';
import { getPersonaOrDefault } from './personas';
import { loadSenseiSkills, findVisibleSkill } from './personas/skills';

/** Context for listing tools (what the model is allowed to see this turn). */
export interface SenseiToolListContext {
  /** The caller's role. */
  readonly userRole: SenseiToolRole;
  /** Active module (reserved for future module-narrowing of the catalog). */
  readonly activeModule?: NavId;
  /** Whether EE-tier tools are present in this build/edition. */
  readonly includeEE: boolean;
}

/** Context for executing a tool. */
export interface SenseiToolExecuteContext {
  /** The inbound request (forwarded auth/headers to internal `/api/*`). */
  readonly request: Request;
  /** The caller's role. */
  readonly userRole: SenseiToolRole;
  /** Whether EE-tier tools are permitted in this build/edition. */
  readonly includeEE: boolean;
  /**
   * Sensei Rework (Pillar C) — the active persona, resolved once at the
   * route boundary and threaded down so `get_skill` visibility uses the
   * SAME persona governance as the prompt's SKILL INDEX. Optional: when
   * absent (e.g. a unit test that doesn't wire it), the default persona is
   * used — behavior-neutral with the pre-persistence path.
   */
  readonly persona?: SenseiPersona;
}

/** The seam consumed by the chat route, capability panel, and guard. */
export interface SenseiToolSource {
  /** Tools the caller may see, filtered by role + tier. */
  listTools(ctx: SenseiToolListContext): Promise<readonly SenseiToolDefinition[]>;
  /** Look up a single tool definition by name (unfiltered). */
  getTool(name: string): Promise<SenseiToolDefinition | undefined>;
  /** Execute a tool, re-checking role + tier before dispatch. */
  execute(
    name: string,
    args: Readonly<Record<string, unknown>>,
    ctx: SenseiToolExecuteContext,
  ): Promise<SenseiToolResult>;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const ROLE_RANK: Readonly<Record<SenseiToolRole, number>> = {
  viewer: 0,
  user: 1,
  admin: 2,
};

/** True when `userRole` is at least `minRole` in the hierarchy. */
export function roleSatisfies(userRole: SenseiToolRole, minRole: SenseiToolRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole];
}

/** A tool's effective tier (undefined === 'oss'). */
export function toolTier(tool: SenseiToolDefinition): SenseiToolTier {
  return tool.tier ?? 'oss';
}

/**
 * A flag-gated tool (F-QA-038) is hidden/refused when its env flag is off.
 * Ungated tools (no `flagName`) are always allowed by this check.
 * Same env-flag pattern as ATEMI_ENABLED (`process.env[name] === 'true'`).
 */
export function isToolFlagEnabled(tool: SenseiToolDefinition): boolean {
  return tool.flagName === undefined || process.env[tool.flagName] === 'true';
}

/** Whether a tool is visible/runnable under the given role + EE availability. */
export function isToolPermitted(
  tool: SenseiToolDefinition,
  userRole: SenseiToolRole,
  includeEE: boolean,
): boolean {
  if (!roleSatisfies(userRole, tool.minRole)) return false;
  if (toolTier(tool) === 'ee' && !includeEE) return false;
  if (!isToolFlagEnabled(tool)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// LocalToolSource — wraps the in-process registry + executor
// ---------------------------------------------------------------------------

/** Returned when `execute` is called for a tool the caller may not use. */
function deniedResult(name: string, reason: string): SenseiToolResult {
  return {
    toolCallId: `denied_${name}`,
    tool: name,
    success: false,
    data: null,
    error: reason,
    durationMs: 0,
  };
}

export class LocalToolSource implements SenseiToolSource {
  async listTools(ctx: SenseiToolListContext): Promise<readonly SenseiToolDefinition[]> {
    return SENSEI_TOOLS.filter((t) => isToolPermitted(t, ctx.userRole, ctx.includeEE));
  }

  async getTool(name: string): Promise<SenseiToolDefinition | undefined> {
    return getToolByName(name);
  }

  async execute(
    name: string,
    args: Readonly<Record<string, unknown>>,
    ctx: SenseiToolExecuteContext,
  ): Promise<SenseiToolResult> {
    const tool = getToolByName(name);
    if (!tool) return deniedResult(name, `Unknown tool "${name}".`);
    if (!roleSatisfies(ctx.userRole, tool.minRole)) {
      return deniedResult(name, `Tool "${name}" requires role "${tool.minRole}".`);
    }
    if (toolTier(tool) === 'ee' && !ctx.includeEE) {
      return deniedResult(name, `Tool "${name}" is not available in this edition.`);
    }
    if (!isToolFlagEnabled(tool)) {
      return deniedResult(name, `Tool "${name}" is not enabled.`);
    }
    // `get_skill` is resolved LOCALLY (no HTTP): return the playbook body for an
    // id the caller may actually load (persona ∩ tier-in-build ∩ role). The
    // tier filter is implicit — `loadSenseiSkills(includeEE)` never returns an
    // EE body in an OSS build / non-EE edition.
    if (name === 'get_skill') {
      return resolveGetSkill(args, ctx);
    }
    return executeToolCall(tool, args, ctx.request);
  }
}

/** Resolve the read-only `get_skill` capability against the governance gate. */
async function resolveGetSkill(
  args: Readonly<Record<string, unknown>>,
  ctx: SenseiToolExecuteContext,
): Promise<SenseiToolResult> {
  const startedAt = Date.now();
  const id = typeof args.id === 'string' ? args.id.trim() : '';
  const result = (
    success: boolean,
    data: unknown,
    error?: string,
  ): SenseiToolResult => ({
    toolCallId: `skill_${id || 'unknown'}`,
    tool: 'get_skill',
    success,
    data,
    ...(error ? { error } : {}),
    durationMs: Date.now() - startedAt,
  });

  if (!id) return result(false, null, 'get_skill requires a skill id.');

  // Use the persona resolved at the route boundary (identical to the prompt's
  // SKILL INDEX governance); fall back to the default when the caller didn't
  // thread one in (behavior-neutral with the pre-persistence path).
  const persona = ctx.persona ?? getPersonaOrDefault(null);
  const skills = await loadSenseiSkills(ctx.includeEE);
  const skill = findVisibleSkill(skills, persona, ctx.userRole, id);
  if (!skill) {
    // Generic message — no oracle revealing whether the id exists out-of-tier.
    return result(false, null, `Skill "${id}" is not available.`);
  }

  return result(true, {
    id: skill.id,
    title: skill.title,
    body: skill.body,
  });
}

// ---------------------------------------------------------------------------
// McpToolSource — sources the @dojolm/mcp-control catalog + executor in-process
// ---------------------------------------------------------------------------

/**
 * Map a control-plane `ControlToolDef` onto the in-app `SenseiToolDefinition`
 * the chat route, guard, and capability panel expect. The shapes differ:
 * `ControlToolDef` carries `inputSchema`/`title`/`scopeRequired`/`longRunning`,
 * the Sensei def carries `parameters`. `ControlRole`/`ControlTier` are the same
 * string unions as `SenseiToolRole`/`SenseiToolTier`, so they pass through.
 */
export function controlToolToSensei(
  tool: ControlToolDef,
  local?: SenseiToolDefinition,
): SenseiToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    endpoint: tool.endpoint,
    method: tool.method,
    mutating: tool.mutating,
    requiresConfirmation: tool.requiresConfirmation,
    minRole: tool.minRole,
    tier: tool.tier,
    // F-QA-038: `flagName` is a LOCAL-registry gate (not in the control catalog),
    // so carry it over from the local def — otherwise a control-covered tool like
    // `run_agentic_test` would lose its gate on the MCP tool-source path.
    ...(local?.flagName ? { flagName: local.flagName } : {}),
    // `title`/`scopeRequired`/`longRunning` have no `SenseiToolDefinition` slot
    // and are intentionally dropped — internal Sensei doesn't consume them.
  };
}

/**
 * A `fetch` that forwards the inbound request's session auth to the same-origin
 * platform API — mirroring `tool-executor.executeToolCall`. The control
 * executor only attaches `x-api-key` (from the AuthContext); internal Sensei
 * runs on cookie/session auth, so we layer the cookie + `sec-fetch-*` headers
 * on top. The session cookie is forwarded ONLY to the request's own origin —
 * a cross-origin target is hard-rejected, so the closure can't be turned into a
 * cookie-leaking SSRF primitive even if handed an attacker-shaped base URL.
 */
export function forwardingFetch(request: Request): typeof fetch {
  const allowedOrigin = new URL(request.url).origin;
  return ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const targetUrl = input instanceof Request ? input.url : String(input);
    if (new URL(targetUrl, request.url).origin !== allowedOrigin) {
      return Promise.reject(new Error('forwardingFetch: cross-origin request blocked.'));
    }
    const headers = new Headers(init?.headers);
    const cookie = request.headers.get('cookie');
    if (cookie) headers.set('cookie', cookie);
    // Present a matching Origin so the platform's same-origin auth gate accepts
    // the forwarded session cookie (a server-side fetch has no browser Origin;
    // without it the gate 401s the valid cookie). Same-origin by construction:
    // the target is hard-pinned to `allowedOrigin` above.
    headers.set('origin', allowedOrigin);
    headers.set('sec-fetch-site', 'same-origin');
    headers.set('sec-fetch-mode', 'cors');
    headers.set('sec-fetch-dest', 'empty');
    return fetch(input, { ...init, headers });
  }) as typeof fetch;
}

/**
 * Internal Sensei tool source backed by `@dojolm/mcp-control`.
 *
 * Additive, not a wholesale replacement: the control catalog is a curated OSS
 * **subset** (30 tools) of the in-app 36-tool registry, so a drop-in swap would
 * shrink the surface Sensei sees. Instead this source keeps the full registry
 * surface and, for the tools the control catalog also covers, sources their
 * definition from the catalog and executes them through the control executor
 * in-process. Everything else (the registry-only tools, the `__client__` tools,
 * and the implicit `get_skill` loader) delegates to `LocalToolSource`.
 *
 * Control-only EE tools (e.g. `run_iso42001_assessment`) are deliberately NOT
 * surfaced here: the chat route's `guardToolExecution` is keyed on the in-app
 * `SENSEI_TOOLS` registry, so a tool absent from it would be described-but-
 * blocked. Those tools stay on the external MCP plane, where the control
 * server's own RBAC governs them. We therefore source only the OSS overlap.
 */
export class McpToolSource implements SenseiToolSource {
  private readonly local = new LocalToolSource();
  private pkgPromise: Promise<typeof import('@dojolm/mcp-control')> | null = null;
  private catalogPromise: Promise<readonly ControlToolDef[]> | null = null;

  /** Lazily load (and memoize) the control package. */
  private pkg(): Promise<typeof import('@dojolm/mcp-control')> {
    return (this.pkgPromise ??= import('@dojolm/mcp-control'));
  }

  /**
   * The control-sourced surface: the OSS catalog, intersected at the call sites
   * with the in-app registry. Loaded once (OSS only — the EE catalog can never
   * be surfaced through the registry-keyed guard, so there is no reason to merge
   * it here).
   */
  private coveredCatalog(): Promise<readonly ControlToolDef[]> {
    return (this.catalogPromise ??= this.pkg().then(({ loadCatalog }) => loadCatalog(false)));
  }

  async listTools(ctx: SenseiToolListContext): Promise<readonly SenseiToolDefinition[]> {
    const control = await this.coveredCatalog();
    const byName = new Map(control.map((t) => [t.name, t]));
    // Iterate the registry (the guard's source of truth) so the surface is
    // always ⊆ SENSEI_TOOLS; swap in the control definition where one exists.
    const merged = SENSEI_TOOLS.map((local) => {
      const ct = byName.get(local.name);
      return ct ? controlToolToSensei(ct, local) : local;
    });
    return merged.filter((t) => isToolPermitted(t, ctx.userRole, ctx.includeEE));
  }

  async getTool(name: string): Promise<SenseiToolDefinition | undefined> {
    const local = getToolByName(name);
    if (!local) return undefined;
    const control = await this.coveredCatalog();
    const ct = control.find((t) => t.name === name);
    return ct ? controlToolToSensei(ct, local) : local;
  }

  async execute(
    name: string,
    args: Readonly<Record<string, unknown>>,
    ctx: SenseiToolExecuteContext,
  ): Promise<SenseiToolResult> {
    const localDef = getToolByName(name);
    if (!localDef) return deniedResult(name, `Unknown tool "${name}".`);

    const control = await this.coveredCatalog();
    const ct = control.find((t) => t.name === name);
    // Registry-only tools, client tools, and `get_skill` keep the proven local
    // path (cookie auth, `__skill__`/`__client__` handling) byte-for-byte.
    if (!ct) return this.local.execute(name, args, ctx);

    const def = controlToolToSensei(ct, localDef);
    if (!roleSatisfies(ctx.userRole, def.minRole)) {
      return deniedResult(name, `Tool "${name}" requires role "${def.minRole}".`);
    }
    if (toolTier(def) === 'ee' && !ctx.includeEE) {
      return deniedResult(name, `Tool "${name}" is not available in this edition.`);
    }
    if (!isToolFlagEnabled(def)) {
      return deniedResult(name, `Tool "${name}" is not enabled.`);
    }

    // Execute via the control package's executor in-process. We call
    // `executeTool` directly rather than driving the JSON-RPC server's
    // `tools/call`, so the server's two-phase HMAC confirmation gate (built for
    // the stateless external transports) is bypassed — internal Sensei's
    // confirmation is already owned by the chat route's SSE flow.
    const startedAt = Date.now();
    const toolCallId = `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { executeTool } = await this.pkg();
    const apiKey = ctx.request.headers.get('x-api-key') ?? undefined;
    const auth: AuthContext = {
      baseUrl: new URL(ctx.request.url).origin,
      identity: 'internal-sensei',
      ...(apiKey ? { apiKey } : {}),
    };
    try {
      const res = await executeTool(ct, args, auth, forwardingFetch(ctx.request));
      return {
        toolCallId,
        tool: name,
        success: res.ok,
        // The control executor already sanitizes; re-run the app's canonical
        // `sanitizeResult` so the local + MCP paths share one final guarantee
        // (redaction/HTML-strip/4KB cap) and can't drift apart.
        data: res.ok ? sanitizeResult(res.data) : null,
        ...(res.error ? { error: res.error } : {}),
        durationMs: res.durationMs,
      };
    } catch (err) {
      return {
        toolCallId,
        tool: name,
        success: false,
        data: null,
        error: err instanceof Error ? err.message : 'Tool execution failed.',
        durationMs: Date.now() - startedAt,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let cached: SenseiToolSource | null = null;

/**
 * Resolve the active tool source. Defaults to `LocalToolSource`;
 * `SENSEI_TOOL_SOURCE=mcp` selects the additive `McpToolSource`, which sources
 * the OSS overlap from `@dojolm/mcp-control` and delegates the rest. Memoized.
 */
export function getSenseiToolSource(): SenseiToolSource {
  if (cached) return cached;
  cached =
    process.env.SENSEI_TOOL_SOURCE === 'mcp'
      ? new McpToolSource()
      : new LocalToolSource();
  return cached;
}

/** Test-only: reset the memoized source. */
export function __resetSenseiToolSourceForTests(): void {
  cached = null;
}
