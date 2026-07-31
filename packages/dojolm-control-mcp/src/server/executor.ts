// SPDX-License-Identifier: Apache-2.0
/**
 * Tool executor — ported from the dojolm-web Sensei `tool-executor.ts`, but
 * runs OUT OF PROCESS: the platform base URL + the CALLER's key come from the
 * AuthContext, never an ambient credential.
 *
 * Ports: `{param}` path interpolation, GET→querystring / POST→body, secret
 * redaction, HTML strip, 4 KB truncation, 30 s timeout. The platform's
 * `withAuth`/RBAC remains the authoritative gate — we forward the caller's key.
 */

import type { AuthContext, ControlToolDef } from '../types.js';

const TOOL_TIMEOUT_MS = 30_000;
const MAX_RESULT_SIZE = 4096;

const REDACTED_FIELDS_LOWER = new Set([
  'apikey', 'api_key', 'secretkey', 'secret_key', 'password',
  'token', 'accesstoken', 'access_token', 'refreshtoken', 'refresh_token',
]);

export interface ToolExecResult {
  readonly ok: boolean;
  readonly data: unknown;
  readonly error?: string;
  readonly durationMs: number;
}

function redact(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(redact);
  if (typeof data === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      out[k] = REDACTED_FIELDS_LOWER.has(k.toLowerCase()) ? '***' : redact(v);
    }
    return out;
  }
  if (typeof data === 'string') return data.replace(/<[^>]*>/g, '');
  return data;
}

function truncate(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  const s = JSON.stringify(data);
  if (s.length <= MAX_RESULT_SIZE) return data;
  if (typeof data === 'string') return data.slice(0, MAX_RESULT_SIZE) + '... [truncated]';
  return { _truncated: true, _originalSize: s.length, _preview: s.slice(0, MAX_RESULT_SIZE - 100) };
}

/**
 * Sanitize a platform response for return: redact secrets, strip HTML, cap size.
 * `noTruncate` keeps redaction + HTML-strip but skips the 4 KB cap — for
 * report/status/export tools whose full body an external MCP client needs intact.
 */
export function sanitize(data: unknown, opts?: { readonly noTruncate?: boolean }): unknown {
  const redacted = redact(data);
  return opts?.noTruncate ? redacted : truncate(redacted);
}

function buildUrl(endpoint: string, args: Readonly<Record<string, unknown>>, baseUrl: string): string {
  const path = endpoint.replace(/\{(\w+)\}/g, (_m, p: string) => {
    const v = args[p];
    return typeof v === 'string' || typeof v === 'number' ? encodeURIComponent(String(v)) : '';
  });
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

/**
 * Validate caller args against the tool's `inputSchema` before any request:
 * enforce declared `enum` constraints, and reject path-param values that look
 * like traversal (defense-in-depth — a trustworthy envelope regardless of how
 * the downstream platform decodes). Returns an error string, or null if clean.
 */
export function validateArgs(
  tool: ControlToolDef,
  args: Readonly<Record<string, unknown>>,
): string | null {
  const props = (tool.inputSchema as { properties?: Record<string, { enum?: readonly unknown[] }> }).properties ?? {};
  const pathParams = new Set([...tool.endpoint.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
  for (const [key, value] of Object.entries(args)) {
    if (value === null || value === undefined) continue;
    const schema = props[key];
    if (schema?.enum && !schema.enum.includes(value)) {
      return `"${key}" must be one of: ${schema.enum.join(', ')}.`;
    }
    if (pathParams.has(key) && typeof value === 'string' && /[\\/]|\.\./.test(value)) {
      return `"${key}" contains an illegal path segment.`;
    }
  }
  return null;
}

/** Execute a control tool against the platform on behalf of the caller. */
export async function executeTool(
  tool: ControlToolDef,
  args: Readonly<Record<string, unknown>>,
  ctx: AuthContext,
  fetchImpl: typeof fetch = fetch,
): Promise<ToolExecResult> {
  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;

  const invalid = validateArgs(tool, args);
  if (invalid) return { ok: false, data: null, error: `Invalid arguments: ${invalid}`, durationMs: elapsed() };

  // Path params are consumed by interpolation; remaining args become query/body.
  const pathParams = new Set(
    [...tool.endpoint.matchAll(/\{(\w+)\}/g)].map((m) => m[1]),
  );
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (!pathParams.has(k) && v !== null && v !== undefined) rest[k] = v;
  }

  let url = buildUrl(tool.endpoint, args, ctx.baseUrl);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ctx.apiKey) headers['x-api-key'] = ctx.apiKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);
  const init: RequestInit = { method: tool.method, headers, signal: controller.signal };

  if (tool.method === 'GET' && Object.keys(rest).length > 0) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(rest)) qs.set(k, String(v));
    url = `${url}${url.includes('?') ? '&' : '?'}${qs.toString()}`;
  } else if (tool.method === 'POST') {
    init.body = JSON.stringify(rest);
  }

  try {
    const res = await fetchImpl(url, init);
    clearTimeout(timer);
    if (!res.ok) {
      // 5xx: never echo the body (may carry stack traces). 4xx: surface a
      // helpful message but parse it as JSON and OBJECT-redact first — a plain
      // string only gets HTML-stripped, so a secret-shaped value in a raw 4xx
      // body would otherwise pass through. Non-JSON bodies fall back to generic.
      let detail = '';
      if (res.status < 500) {
        const text = await res.text().catch(() => '');
        try {
          detail = `: ${JSON.stringify(sanitize(JSON.parse(text))).slice(0, 200)}`;
        } catch {
          detail = ': Request failed.';
        }
      }
      return {
        ok: false,
        data: null,
        error: `API error (${res.status})${detail}`,
        durationMs: elapsed(),
      };
    }
    const data = await res.json().catch(() => null);
    return { ok: true, data: sanitize(data, { noTruncate: tool.noTruncate }), durationMs: elapsed() };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      data: null,
      error: isTimeout
        ? `Tool "${tool.name}" timed out after ${TOOL_TIMEOUT_MS / 1000}s.`
        : err instanceof Error ? err.message : 'Tool execution failed.',
      durationMs: elapsed(),
    };
  }
}
