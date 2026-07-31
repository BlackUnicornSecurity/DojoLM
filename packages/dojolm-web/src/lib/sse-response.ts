// SPDX-License-Identifier: Apache-2.0
import { NextResponse } from 'next/server';

/**
 * Server-side Server-Sent-Events Response builder.
 *
 * The one job of this helper is to guarantee `Connection: close` on every SSE
 * Response. A long SSE stream over a keep-alive socket leaves the connection
 * dirty; Node/undici (or an upstream proxy pool) then reuses it for the NEXT
 * request → instant empty-body 400. Reproduced on the .141 harness as strict
 * ABAB status alternation by execution order (a 200 stream poisons its socket →
 * the next request reuses it → 400 → socket evicted → next is fresh → 200).
 * Closing per-stream stops the pool from ever reusing a poisoned connection.
 *
 * `X-Accel-Buffering: no` stops nginx/caddy buffering the stream. Both are
 * forced via `Headers.set` AFTER the caller's headers are applied — `set` is
 * case-insensitive and overwrites, so a caller cannot re-enable keep-alive or
 * proxy buffering even with a differently-cased key (`connection` vs
 * `Connection`), which a plain-object spread would comma-merge past the guard.
 * That's the whole point of routing every SSE route through this chokepoint.
 *
 * `Content-Type`, `Cache-Control`, and `X-Content-Type-Options: nosniff` are
 * defaults the caller may override (e.g. a stricter `Cache-Control: no-store`
 * or a `; charset=utf-8`); every SSE route wants nosniff, so it ships by
 * default rather than being a per-caller footgun.
 */
export function sseResponse(
  stream: ReadableStream,
  init: { readonly headers?: Record<string, string> } = {},
): NextResponse {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'text/event-stream');
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-cache');
  if (!headers.has('X-Content-Type-Options')) headers.set('X-Content-Type-Options', 'nosniff');
  // Non-negotiable — set last so no caller-supplied (any-cased) key survives.
  headers.set('Connection', 'close');
  headers.set('X-Accel-Buffering', 'no');
  return new NextResponse(stream, { headers });
}
