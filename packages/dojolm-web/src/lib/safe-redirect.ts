// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/safe-redirect.ts
 * Purpose: Shared open-redirect protection for `next` / `returnTo` query
 * parameters consumed by `/login`, `/forbidden`, and the SessionExpiredCard.
 *
 * Story: E4.S11 (retires F-7-028 P2) — `/forbidden` returnTo wiring.
 *
 * Why centralize:
 *   - Three independent surfaces (RBAC middleware, /forbidden, /login,
 *     SessionExpiredCard) reflect a caller-supplied path back into a
 *     hyperlink href. Each one is an open-redirect vector if the input
 *     escapes same-origin. A duplicated regex in three places drifts;
 *     a single boundary validator does not.
 *
 * Threat model:
 *   - Attacker crafts `?next=https://evil.example/steal-creds` and
 *     funnels victims through /forbidden → /login. Without the guard
 *     a successful sign-in lands the victim on the attacker's page,
 *     possibly with cookies leaked via `document.referrer`.
 *   - Protocol-relative URLs (`//evil.example/x`) inherit the current
 *     scheme and are also out-of-origin — the leading-slash test alone
 *     is insufficient.
 *   - `javascript:`-class schemes never appear because the guard
 *     requires the path to start with a single `/` (so `javascript:foo`
 *     is rejected outright; `/javascript:foo` is allowed only as a
 *     same-origin path segment, and is then encoded as a query value
 *     by the consumer — never executed as a top-level href).
 *
 * Boundary contract:
 *   - `isSafeOriginPath(p)`: returns `true` IFF `p` is a same-origin
 *     pathname-and-search starting with a single `/`, with no scheme
 *     and no whitespace. The protocol-relative class (`//host`) is
 *     explicitly excluded.
 *   - `sanitizeReturnTo(raw, fallback = '/')`: accepts the raw
 *     `searchParams` value (string | string[] | undefined) and
 *     returns either the validated same-origin path or the fallback.
 *     This is the function pages should call before reflecting the
 *     parameter into a CTA href.
 */

const SAFE_RETURN_TO = /^\/(?!\/)[^\s]*$|^\/$/;

/**
 * Type-guard: returns `true` IFF `p` is a same-origin path.
 *
 * Accepts:
 *   - `/`
 *   - `/admin/users`
 *   - `/admin/users?tab=invites&page=2`
 *
 * Rejects:
 *   - `undefined` / `null` / `''`
 *   - `//evil.example/x` (protocol-relative)
 *   - `https://evil.example/x` (absolute URL)
 *   - `admin/users` (missing leading slash)
 *   - paths containing whitespace
 */
export function isSafeOriginPath(p: string | undefined | null): p is string {
  if (typeof p !== 'string' || p.length === 0) return false;
  return SAFE_RETURN_TO.test(p);
}

/**
 * Boundary validator for `?next=` / `?returnTo=` query parameters.
 *
 * Pages that consume `searchParams` should call this BEFORE reflecting
 * the value into any href. Returns the validated same-origin path or
 * the supplied fallback (defaults to `/`).
 *
 * @param raw The raw `searchParams[key]` value — Next.js routes this
 *   as `string | string[] | undefined`.
 * @param fallback The path to return when validation fails.
 *   Defaults to `/` (the dashboard).
 */
export function sanitizeReturnTo(
  raw: string | string[] | undefined,
  fallback: string = '/',
): string {
  // Reject array form outright — repeated query keys are an injection
  // class we never legitimately emit. Pages that emit `?next=` always
  // emit a single key.
  if (typeof raw !== 'string') return fallback;
  if (!isSafeOriginPath(raw)) return fallback;
  return raw;
}

/**
 * Build a `?next=<encoded>` query suffix for chaining a same-origin
 * path through a redirect target. Returns `''` when the input fails
 * validation — callers that want a fallback should compose that
 * themselves.
 *
 * Used by `/forbidden`'s "Sign in with different role" CTA to thread
 * the originating URL through to `/login?next=<x>`.
 */
export function buildNextQuerySuffix(
  raw: string | string[] | undefined,
): string {
  if (typeof raw !== 'string') return '';
  if (!isSafeOriginPath(raw)) return '';
  return `next=${encodeURIComponent(raw)}`;
}
