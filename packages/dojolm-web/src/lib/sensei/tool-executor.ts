// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — Tool Executor
 * SH3.2: Execute validated tool calls via internal API or client-side handlers.
 */

import type { SenseiToolDefinition, SenseiToolResult } from './types';
import { MODULE_CONTEXT } from './system-prompt';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum tool execution timeout in milliseconds. */
const TOOL_TIMEOUT_MS = 30_000;

/** Maximum result payload size in bytes (4KB). */
const MAX_RESULT_SIZE = 4096;

/** Fields to redact from tool results (canonical mixed-case entries). */
const REDACTED_FIELDS = new Set([
  'apikey',
  'api_key',
  'apiKey',
  'secretkey',
  'secret_key',
  'secretKey',
  'password',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
]);

/** CR-6: Lowercase-normalized lookup for case-insensitive field redaction */
const REDACTED_FIELDS_LOWER = new Set([...REDACTED_FIELDS].map((k) => k.toLowerCase()));

// ---------------------------------------------------------------------------
// SH3.2 Step 2 — Lightweight argument validation
// ---------------------------------------------------------------------------

interface ValidationError {
  readonly field: string;
  readonly message: string;
}

/**
 * Validate args against the tool's JSON Schema parameters.
 * Lightweight validation: checks required fields and basic types.
 */
export function validateArgs(
  toolDef: SenseiToolDefinition,
  args: Readonly<Record<string, unknown>>,
): readonly ValidationError[] {
  const errors: ValidationError[] = [];
  const schema = toolDef.parameters as {
    readonly properties?: Readonly<Record<string, { readonly type?: string; readonly enum?: readonly unknown[] }>>;
    readonly required?: readonly string[];
  };

  // Check required fields
  const required = schema.required ?? [];
  for (const field of required) {
    if (!(field in args) || args[field] === undefined || args[field] === null) {
      errors.push({ field, message: `Required field "${field}" is missing.` });
    }
  }

  // Check basic types for provided fields.
  // F-09/F-10 fix: Skip null values for optional fields — LLMs often emit
  // {"provider": null} instead of omitting the key entirely.
  const properties = schema.properties ?? {};
  for (const [key, value] of Object.entries(args)) {
    // Skip null optional args (not in required list)
    if (value === null && !required.includes(key)) {
      continue;
    }

    const propSchema = properties[key];
    if (!propSchema) {
      errors.push({ field: key, message: `"${key}" is not allowed.` });
      continue;
    }

    if (propSchema.enum && !propSchema.enum.includes(value)) {
      errors.push({
        field: key,
        message: `"${key}" must be one of: ${propSchema.enum.join(', ')}.`,
      });
      continue;
    }

    if (!propSchema.type) continue;

    const expectedType = propSchema.type;
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (expectedType === 'number' && actualType !== 'number') {
      errors.push({ field: key, message: `"${key}" must be a number.` });
    } else if (expectedType === 'string' && actualType !== 'string') {
      errors.push({ field: key, message: `"${key}" must be a string.` });
    } else if (expectedType === 'boolean' && actualType !== 'boolean') {
      errors.push({ field: key, message: `"${key}" must be a boolean.` });
    } else if (expectedType === 'array' && actualType !== 'array') {
      errors.push({ field: key, message: `"${key}" must be an array.` });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// SH3.2 Step 3 — Result sanitization
// ---------------------------------------------------------------------------

/**
 * Recursively redact sensitive fields from result data.
 * Replaces values of fields matching REDACTED_FIELDS with '***'.
 */
function redactSensitiveFields(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(redactSensitiveFields);
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // CR-6: Case-insensitive field matching for defence-in-depth
      if (REDACTED_FIELDS.has(key) || REDACTED_FIELDS_LOWER.has(key.toLowerCase())) {
        result[key] = '***';
      } else {
        result[key] = redactSensitiveFields(value);
      }
    }
    return result;
  }

  // Strip HTML tags from string values
  if (typeof data === 'string') {
    return data.replace(/<[^>]*>/g, '');
  }

  return data;
}

/**
 * Truncate result data to MAX_RESULT_SIZE bytes for context injection.
 * Returns the original data if it fits, or a truncated indicator.
 */
function truncateResult(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  const serialized = JSON.stringify(data);
  if (serialized.length <= MAX_RESULT_SIZE) return data;

  // For objects/arrays, try to return a subset
  if (typeof data === 'object' && data !== null) {
    return {
      _truncated: true,
      _originalSize: serialized.length,
      _preview: serialized.slice(0, MAX_RESULT_SIZE - 100),
    };
  }

  // For strings, truncate directly
  if (typeof data === 'string') {
    return data.slice(0, MAX_RESULT_SIZE) + '... [truncated]';
  }

  return data;
}

/**
 * Sanitize a tool result: redact secrets, strip HTML, truncate.
 */
export function sanitizeResult(data: unknown): unknown {
  const redacted = redactSensitiveFields(data);
  return truncateResult(redacted);
}

// ---------------------------------------------------------------------------
// SH3.2 Step 5 — Client-side tool handlers
// ---------------------------------------------------------------------------

/**
 * Handle the `navigate_to` client-side tool.
 * Returns a navigation event (no API call).
 */
function handleNavigateTo(
  args: Readonly<Record<string, unknown>>,
): { readonly action: string; readonly module: string } {
  const moduleId = typeof args.module === 'string' ? args.module : 'dashboard';
  return { action: 'navigate', module: moduleId };
}

/**
 * Handle the `explain_feature` client-side tool.
 * Returns a static description from MODULE_CONTEXT.
 */
function handleExplainFeature(
  args: Readonly<Record<string, unknown>>,
): { readonly module: string; readonly description: string } {
  const moduleId = typeof args.module === 'string' ? args.module : 'dashboard';
  const description =
    (MODULE_CONTEXT as Readonly<Record<string, string>>)[moduleId] ??
    `Module "${moduleId}" — no description available.`;
  return { module: moduleId, description };
}

// ---------------------------------------------------------------------------
// SH3.2 Step 1 — Execute a validated tool call
// ---------------------------------------------------------------------------

/**
 * Build the full URL for a tool endpoint, interpolating path parameters.
 */
function buildEndpointUrl(
  endpoint: string,
  args: Readonly<Record<string, unknown>>,
  baseUrl: string,
): string {
  // Interpolate {param} placeholders in the endpoint
  const url = endpoint.replace(/\{(\w+)\}/g, (_match, param: string) => {
    const value = args[param];
    return typeof value === 'string' ? encodeURIComponent(value) : '';
  });

  // For GET requests with args, append as query params
  return `${baseUrl}${url}`;
}

/**
 * Resolve the origin for server-side tool fetches.
 *
 * Sensei tools call the app's OWN internal API. Behind a reverse proxy (e.g.
 * one terminating `https://dojo.example.internal`) the incoming request
 * origin is the PUBLIC hostname, which is frequently NOT reachable from inside
 * the app container (hairpin routing) — which makes every server-side tool fetch
 * fail ("fetch failed"). So a non-loopback request origin is redirected to an
 * internal loopback on the app's PORT. `SENSEI_TOOL_BASE_URL` overrides
 * explicitly; loopback request origins (local dev / tests) are left untouched.
 */
function resolveToolOrigin(request: Request): string {
  const explicit = process.env.SENSEI_TOOL_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const loopbackBase = `http://127.0.0.1:${process.env.PORT?.trim() || '42001'}`;
  try {
    const { origin, hostname } = new URL(request.url);
    const isLoopback =
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    return isLoopback ? origin : loopbackBase;
  } catch {
    return loopbackBase;
  }
}

/**
 * Resolve the `Origin` header to present on a server-side tool fetch.
 *
 * The platform's API gateway (`checkApiAuth` → `isTrustedBrowserSessionRequest`,
 * `lib/request-origin.ts`) only accepts a cookie-authenticated request when it
 * looks same-origin: the `Origin` (or `Referer`) must match the app origin
 * (`getConfiguredAppOrigin()` → `TPI_APP_URL`/`NEXT_PUBLIC_APP_URL`, else the
 * request-derived Host). A server-side fetch carries no browser `Origin`, so
 * WITHOUT this every tool call is rejected with `401 Authentication required`
 * even though the forwarded session cookie is valid.
 *
 * We mirror `getConfiguredAppOrigin`'s env precedence (kept inline so this
 * Sensei path does not pull the DB-backed `request-origin` graph). When neither
 * env is set we fall back to the internal origin we're fetching — which is also
 * what the gateway derives from the internal request's own Host — so the
 * same-origin check passes in both the pinned and Host-derived deployments.
 */
function resolveToolRequestOrigin(request: Request): string {
  const configured = process.env.TPI_APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Malformed env — fall through to the internal origin.
    }
  }
  return resolveToolOrigin(request);
}

/**
 * Execute a single tool call via internal API or client-side handler.
 *
 * @param toolDef - The tool definition from the registry
 * @param args - Validated arguments for the tool
 * @param request - The original incoming request (for auth header forwarding)
 * @returns SenseiToolResult with execution outcome
 */
export async function executeToolCall(
  toolDef: SenseiToolDefinition,
  args: Readonly<Record<string, unknown>>,
  request: Request,
): Promise<SenseiToolResult> {
  const startTime = Date.now();
  const toolCallId = `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // --- Skill loader (resolved by the tool source, never via HTTP) ---
  // Defense-in-depth: `get_skill` is handled in LocalToolSource.execute, so it
  // should never reach here. If it does (a caller bypassing the source), fail
  // cleanly rather than attempting a fetch to the `__skill__` sentinel.
  if (toolDef.endpoint === '__skill__') {
    return {
      toolCallId,
      tool: toolDef.name,
      success: false,
      data: null,
      error: 'Skill loader must be resolved via the tool source.',
      durationMs: Date.now() - startTime,
    };
  }

  // --- Client-side tools (no API call) ---
  if (toolDef.endpoint === '__client__') {
    try {
      const data =
        toolDef.name === 'navigate_to'
          ? handleNavigateTo(args)
          : toolDef.name === 'explain_feature'
            ? handleExplainFeature(args)
            : { message: 'Unknown client tool.' };

      return {
        toolCallId,
        tool: toolDef.name,
        success: true,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        toolCallId,
        tool: toolDef.name,
        success: false,
        data: null,
        error: err instanceof Error ? err.message : 'Client tool execution failed.',
        durationMs: Date.now() - startTime,
      };
    }
  }

  // --- Server-side tools (internal API call) ---
  try {
    // Build URL — server-side tools target the app's internal origin, not the
    // (possibly proxy-public, container-unreachable) request origin.
    const origin = resolveToolOrigin(request);
    const url = buildEndpointUrl(toolDef.endpoint, args, origin);

    // Forward auth headers from original request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) headers['x-api-key'] = apiKey;
    const cookie = request.headers.get('cookie');
    if (cookie) headers['cookie'] = cookie;
    // Present a matching Origin so the platform's same-origin auth gate
    // (checkApiAuth → isTrustedBrowserSessionRequest) accepts the forwarded
    // session cookie. A server-side fetch has no browser Origin, so without
    // this the gate rejects the (valid) cookie with 401 — see resolveToolRequestOrigin.
    headers['origin'] = resolveToolRequestOrigin(request);
    // Forward Sec-Fetch headers for same-origin auth bypass
    headers['sec-fetch-site'] = 'same-origin';
    headers['sec-fetch-mode'] = 'cors';
    headers['sec-fetch-dest'] = 'empty';

    // Build fetch options
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);

    const fetchOptions: RequestInit = {
      method: toolDef.method,
      headers,
      signal: controller.signal,
    };

    // For GET with params, append query string; for POST, send as body
    let fetchUrl = url;
    if (toolDef.method === 'GET' && Object.keys(args).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      }
      fetchUrl = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
    } else if (toolDef.method === 'POST') {
      // F-09/F-10 fix: strip null optional args before sending to API
      const cleanArgs: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(args)) {
        if (value !== null && value !== undefined) {
          cleanArgs[key] = value;
        }
      }
      fetchOptions.body = JSON.stringify(cleanArgs);
    }

    const response = await fetch(fetchUrl, fetchOptions);
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const sanitizedError =
        typeof sanitizeResult(errorText) === 'string'
          ? (sanitizeResult(errorText) as string).slice(0, 200)
          : 'Request failed.';
      return {
        toolCallId,
        tool: toolDef.name,
        success: false,
        data: null,
        error: response.status >= 500
          ? `API error (${response.status})`
          : `API error (${response.status}): ${sanitizedError}`,
        durationMs: Date.now() - startTime,
      };
    }

    const data: unknown = await response.json().catch(() => null);
    const sanitized = sanitizeResult(data);

    return {
      toolCallId,
      tool: toolDef.name,
      success: true,
      data: sanitized,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    const isTimeout =
      (err instanceof Error && err.name === 'AbortError') ||
      (err instanceof DOMException && err.name === 'AbortError');
    const message = isTimeout
      ? `Tool "${toolDef.name}" timed out after ${TOOL_TIMEOUT_MS / 1000}s.`
      : err instanceof Error
        ? err.message
        : 'Tool execution failed.';

    return {
      toolCallId,
      tool: toolDef.name,
      success: false,
      data: null,
      error: message,
      durationMs: Date.now() - startTime,
    };
  }
}
