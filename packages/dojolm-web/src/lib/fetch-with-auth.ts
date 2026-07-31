// SPDX-License-Identifier: Apache-2.0
/**
 * File: fetch-with-auth.ts
 * Purpose: Shared authenticated fetch utility for frontend API calls (Story 13.9 / C-07)
 *
 * Wraps the native fetch() with:
 * - X-API-Key header from localStorage or env
 * - 401 response handling — emits an `auth-session-expired` window event
 *   so the shell chrome can surface the SessionExpiredCard takeover
 *   (E9.S3 / F-7-006). De-duped to once per session: subsequent 401s
 *   while the takeover is mounted do NOT re-emit. AuthContext's `login`
 *   and `logout` callers reset the dedupe via
 *   `resetSessionExpiredSignal()` so a fresh sign-in re-arms the surface.
 * - Graceful degradation when no key configured
 *
 * Index:
 * - getApiKey() (line ~30)
 * - setApiKey() (line ~50)
 * - fetchWithAuth() (line ~70)
 * - resetSessionExpiredSignal() (line ~30)
 */

'use client';

import { getStorage } from '@/lib/client-storage'
import { apiKeySessionStore, apiKeyLocalStore } from '@/lib/stores'

const API_KEY_STORAGE_KEY = 'noda-api-key';
const SAFE_RETRY_METHODS = new Set(['GET', 'HEAD']);
const NETWORK_RETRY_DELAYS_MS = [150, 400];

/**
 * E9.S3 — name of the window CustomEvent emitted on 401. Listeners
 * (the shell chrome) use this to mount `<SessionExpiredCard>`. Exported
 * so test files + listeners pin to the same string and we never have a
 * silent typo on either end of the contract.
 */
export const SESSION_EXPIRED_EVENT = 'auth-session-expired' as const;

/**
 * Wave 3ff (F-7-013 P1 retire) — Discriminated outcome shape so callers
 * can branch on transient-timeout vs. permanent-server-error vs.
 * network-failure without inspecting `Error.name` heuristically. The
 * legacy `fetchWithAuth` returned a raw `Promise<Response>` and threw an
 * un-typed Error on AbortError, which forced every caller to surface a
 * generic "request failed" copy. The new helper `fetchWithAuthResult`
 * wraps the same call and returns a tagged outcome.
 *
 * - `ok`      — `response.ok` (2xx). Carry the Response so callers can
 *               read the body.
 * - `timeout` — AbortError. `signal?.aborted` was set, typically by a
 *               consumer-supplied AbortController.timeout or by the
 *               browser's connect timeout. Treat as transient.
 * - `server`  — Response with `status >= 500`. Permanent server error
 *               from this attempt; retry advised only at the user's
 *               request, not automatic.
 * - `client`  — Response with `400 <= status < 500` and not 401.
 *               Permanent client-side error (validation, missing, etc.).
 *               401 is special-cased: it does NOT enter this branch
 *               because the shell chrome handles it via
 *               `auth-session-expired` event.
 * - `network` — `fetch` threw a TypeError (DNS / connection / offline).
 *               Transient; the consumer can retry.
 */
export type FetchAuthOutcome =
  | { readonly kind: 'ok'; readonly response: Response }
  | { readonly kind: 'timeout'; readonly message: string }
  | { readonly kind: 'server'; readonly response: Response; readonly status: number }
  | { readonly kind: 'client'; readonly response: Response; readonly status: number }
  | { readonly kind: 'network'; readonly message: string };

/**
 * Wave 3ff (F-7-013 P1 retire) — Human-readable copy mapped per outcome
 * kind. Exported so toast / banner / error-card callers all surface the
 * same string for each class of failure. The wording intentionally
 * distinguishes "try again" (transient — timeout / network) from
 * "try later" (permanent — server 5xx) so the operator's recovery
 * action is unambiguous.
 */
export const FETCH_AUTH_OUTCOME_COPY: Readonly<Record<FetchAuthOutcome['kind'], string>> = {
  ok: '',
  timeout: 'Request timed out — try again',
  server: 'Server unavailable — try later',
  client: 'Request rejected — check inputs',
  network: 'Network error — check your connection',
};

/**
 * Wave 3ff (F-7-013 P1 retire) — Classify an error / response pair into
 * a tagged outcome. Pure function so callers can also classify outcomes
 * from non-fetchWithAuth code paths (e.g. provider adapters that
 * already have a Response in hand). Exported for unit tests.
 */
export function classifyFetchOutcome(
  response: Response | null,
  error: unknown
): FetchAuthOutcome {
  // AbortError is the canonical timeout signal across Node + browser.
  // We also accept the explicit "TimeoutError" name (modern DOM spec)
  // and the "AbortSignal.timeout"-thrown DOMException.
  if (error instanceof Error) {
    const name = error.name;
    if (name === 'AbortError' || name === 'TimeoutError') {
      return { kind: 'timeout', message: error.message || 'Request timed out' };
    }
    // TypeError from native fetch means DNS / offline / CORS-preflight
    // failure. Distinct from timeout (AbortError) so the consumer can
    // copy "check your connection" instead of "try again".
    if (error instanceof TypeError) {
      return { kind: 'network', message: error.message || 'Network unavailable' };
    }
  }

  if (response) {
    if (response.ok) {
      return { kind: 'ok', response };
    }
    if (response.status >= 500) {
      return { kind: 'server', response, status: response.status };
    }
    // 401 is handled by the existing session-expired event; callers
    // should still see it as a 'client' outcome so they don't double-
    // handle. The dedupe + emit happens in fetchWithAuth itself.
    if (response.status >= 400) {
      return { kind: 'client', response, status: response.status };
    }
    // Catch-all (1xx / 3xx unhandled). Treat as ok so callers can read
    // the body directly — this preserves the pre-Wave-3ff behaviour for
    // unusual status codes.
    return { kind: 'ok', response };
  }

  // No response + no recognised error → treat as network failure so
  // the consumer surfaces the "check connection" copy rather than a
  // bare "request failed".
  return {
    kind: 'network',
    message: error instanceof Error ? error.message : 'Request failed',
  };
}

/** Throttle 401 warnings to at most once per 5 seconds */
let lastWarningTime = 0;

/**
 * E9.S3 (F-7-006) — module-level dedupe flag. Once a 401 has emitted the
 * `auth-session-expired` event, subsequent 401s in the same session do
 * NOT re-emit. The shell chrome already mounts a single takeover, so
 * additional emits would only churn React state. AuthContext.login()
 * + AuthContext.logout() call `resetSessionExpiredSignal()` so a
 * deliberate re-auth re-arms the surface.
 *
 * This is module-state (not React state) on purpose: fetchWithAuth is
 * a free function, not a hook, so a module-level boolean keeps the
 * contract surface tiny and avoids a singleton-context antipattern.
 */
let sessionExpiredEmitted = false;

/**
 * E9.S3 — reset the once-per-session dedupe. Call this from
 * AuthContext.login (after a successful sign-in) and AuthContext.logout
 * (so the operator's next 401 surfaces a fresh takeover) — also useful
 * in tests that want to re-arm the signal between cases.
 */
export function resetSessionExpiredSignal(): void {
  sessionExpiredEmitted = false;
}

/**
 * E9.S3 — emit the session-expired signal exactly once per session.
 * No-op on the server (no `window`), so SSR + node-only callers stay
 * silent. The CustomEvent has no detail payload — the shell chrome
 * listener simply flips its `forcedExpired` state to `true`.
 */
function emitSessionExpiredOnce(): void {
  if (sessionExpiredEmitted) return;
  if (typeof window === 'undefined') return;
  sessionExpiredEmitted = true;
  try {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  } catch {
    // CustomEvent unavailable in the host (very old browsers / non-DOM
    // jsdom env). Swallow — the dedupe flag has already flipped, and
    // re-throwing would surface a network "auth failed" as a render-
    // blocking exception, which is exactly the silent-fail anti-pattern
    // F-7-006 calls out. Logging stays in `lastWarningTime` branch.
  }
}

function isRetryableNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

function isRelativeOrSameOriginRequest(input: RequestInfo | URL): boolean {
  if (typeof window === 'undefined') return false;

  const target =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (target.startsWith('/')) {
    return true;
  }

  try {
    return new URL(target, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

function shouldRetryRequest(
  input: RequestInfo | URL,
  method: string,
  init?: RequestInit
): boolean {
  if (init?.signal?.aborted) {
    return false;
  }

  return SAFE_RETRY_METHODS.has(method) && isRelativeOrSameOriginRequest(input);
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Get API key from sessionStorage (preferred) or localStorage (legacy fallback).
 * Returns null if not set.
 */
export function getApiKey(): string | null {
  // Prefer sessionStorage (AUTH-04: shorter-lived, cleared on tab close)
  const fromSession = apiKeySessionStore.get();
  if (fromSession) return fromSession;
  // Legacy fallback: migrate from localStorage to sessionStorage
  const fromLocal = apiKeyLocalStore.get();
  if (fromLocal) {
    try {
      apiKeySessionStore.set(fromLocal);
      apiKeyLocalStore.remove();
    } catch { /* ignore migration failures */ }
    return fromLocal;
  }
  return null;
}

/**
 * Store API key in sessionStorage (AUTH-04 fix: sessionStorage is cleared on
 * tab close, reducing the XSS exfiltration window vs localStorage which persists
 * indefinitely). Falls back to localStorage for backward compatibility if
 * sessionStorage is unavailable.
 */
export function setApiKey(key: string): void {
  if (typeof window === 'undefined') return;

  const sessionStorage = getStorage('session');
  const localStorageRef = getStorage('local');
  try {
    if (!sessionStorage) throw new Error('session storage unavailable');
    sessionStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify(key));
    // Clean up any legacy localStorage entry
    try { localStorageRef?.removeItem(API_KEY_STORAGE_KEY); } catch { /* ignore */ }
  } catch {
    // Fallback to localStorage if sessionStorage is blocked (e.g., some privacy modes)
    if (localStorageRef) {
      try {
        localStorageRef.setItem(API_KEY_STORAGE_KEY, JSON.stringify(key));
      } catch {
        console.warn('[fetch-with-auth] Failed to save API key');
      }
    } else {
      console.warn('[fetch-with-auth] Failed to save API key');
    }
  }
}

/**
 * Clear stored API key.
 */
export function clearApiKey(): void {
  apiKeySessionStore.remove();
  apiKeyLocalStore.remove();
}

/**
 * Fetch wrapper that automatically includes X-API-Key header.
 * Drop-in replacement for fetch() in frontend code.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const apiKey = getApiKey();
  const method = (init?.method ?? (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();

  const headers = new Headers(init?.headers);

  // Add auth header if key is available
  if (apiKey) {
    headers.set('X-API-Key', apiKey);
  }

  // Auto-set Content-Type for mutation requests with a string body
  // Skip for FormData, Blob, ArrayBuffer etc. — browser sets correct Content-Type automatically
  if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type') && ['POST', 'PUT', 'PATCH'].includes(method)) {
    headers.set('Content-Type', 'application/json');
  }

  // CSRF double-submit: attach x-csrf-token from cookie on state-mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && typeof document !== 'undefined') {
    const csrfMatch = document.cookie.match(/(?:^|;\s*)tpi_csrf=([^;]+)/);
    if (csrfMatch?.[1]) {
      headers.set('x-csrf-token', decodeURIComponent(csrfMatch[1]));
    }
  }

  const requestInit: RequestInit = {
    ...init,
    headers,
  };
  const canRetry = shouldRetryRequest(input, method, init);
  let response: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= NETWORK_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      response = await fetch(input, requestInit);
      break;
    } catch (error) {
      lastError = error;
      if (!canRetry || !isRetryableNetworkError(error) || attempt === NETWORK_RETRY_DELAYS_MS.length) {
        throw error;
      }
      await delay(NETWORK_RETRY_DELAYS_MS[attempt]);
    }
  }

  if (!response) {
    throw lastError instanceof Error ? lastError : new Error('Request failed');
  }

  // Handle 401 — API key invalid or missing (throttled to once per 5s).
  // E9.S3 (F-7-006): also emit a `auth-session-expired` window event
  // so the shell chrome surfaces `<SessionExpiredCard>` instead of
  // letting the caller silently fail. Dedupe is module-level so 5
  // simultaneous 401s mount one takeover, not five.
  if (response.status === 401) {
    const now = Date.now();
    if (now - lastWarningTime > 5000) {
      console.warn('[fetch-with-auth] 401 Unauthorized — API key may be invalid');
      lastWarningTime = now;
    }
    emitSessionExpiredOnce();
  }

  return response;
}

/**
 * Wave 3ff (F-7-013 P1 retire) — Outcome-typed wrapper around
 * `fetchWithAuth`. Use this instead of the raw `fetchWithAuth` when the
 * caller needs to distinguish:
 *   - transient timeout (AbortError → user retries the same action)
 *   - permanent server-5xx (operator should check the server, not the
 *     same action again)
 *   - network failure (offline / DNS)
 *   - 4xx (validation; surface the response body verbatim)
 *
 * The raw `fetchWithAuth` is retained for backwards compatibility — all
 * existing callers continue to work unchanged. New code that needs the
 * distinction (chat surfaces, provider adapters, anywhere we surface a
 * "request failed" toast) should prefer this helper.
 */
export async function fetchWithAuthResult(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<FetchAuthOutcome> {
  try {
    const response = await fetchWithAuth(input, init);
    return classifyFetchOutcome(response, null);
  } catch (error) {
    return classifyFetchOutcome(null, error);
  }
}
