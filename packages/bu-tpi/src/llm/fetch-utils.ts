// SPDX-License-Identifier: Apache-2.0
/**
 * Fetch utilities for LLM provider system
 *
 * Provides timeout-aware fetch with URL validation and credential sanitization.
 * Uses Node.js native fetch (Node >= 20).
 *
 * Index:
 * - fetchWithTimeout (line ~15)
 * - sanitizeUrl (line ~60)
 */

import { Agent } from 'undici';
import type { LLMProviderStatus } from './types.js';
import { createPinnedLookup } from './security.js';

/** Default request timeout in ms */
const DEFAULT_TIMEOUT_MS = 30_000;

// Reused undici dispatchers whose connector pins + revalidates the DNS-resolved
// IP at socket-connect time (SSRF / DNS-rebinding defense — the sync URL check
// runs before native fetch re-resolves, so the pin is what actually holds). One
// per isLocal mode; the pinned lookup re-reads the blocklists (and
// TPI_TRUSTED_INTERNAL_IPS) live on every connect, so memoizing is safe. Lazily
// created to avoid touching security.js at module-init (circular import).
let pinnedLocalDispatcher: Agent | undefined;
let pinnedRemoteDispatcher: Agent | undefined;

function pinnedDispatcher(isLocal: boolean): Agent {
  if (isLocal) {
    return (pinnedLocalDispatcher ??= new Agent({ connect: { lookup: createPinnedLookup(true) } }));
  }
  return (pinnedRemoteDispatcher ??= new Agent({ connect: { lookup: createPinnedLookup(false) } }));
}

/**
 * Public accessor for the connect-time-pinned undici dispatcher this module uses.
 *
 * A SEPARATE outbound stack — dojolm-web's LLM provider adapters — issues its own
 * streaming fetch at inference time and keeps its own AbortSignal-based timeout
 * classification, so it can't route through fetchWithTimeout without regressing that
 * error handling. It attaches THIS dispatcher to its native `fetch` init instead, so
 * both stacks share one SSRF pin and one blocklist source (createPinnedLookup →
 * isResolvedIpAllowed), rather than the web app re-implementing the pin (and pulling
 * in its own undici). Memoized per isLocal mode — same instance fetchWithTimeout uses.
 */
export function getPinnedDispatcher(isLocal: boolean = false): Agent {
  return pinnedDispatcher(isLocal);
}

/** Maximum allowed timeout in ms. Aligns with the model-config validator's
 *  requestTimeout ceiling (600_000) so a slow served brain (e.g. a 27B on the
 *  torch fallback, ~8 tok/s) can actually use a multi-minute configured timeout
 *  instead of being silently clamped back to 2 min. */
const MAX_TIMEOUT_MS = 600_000;

/** Clamp a requested timeout into [1, MAX_TIMEOUT_MS]. Exported so the clamp
 *  ceiling is directly testable — a config asking for 300s must not be silently
 *  reduced below what it configured. */
export function clampTimeout(timeoutMs: number): number {
  return Math.min(Math.max(1, timeoutMs), MAX_TIMEOUT_MS);
}

/**
 * URL query parameter names that may contain auth tokens.
 * Stripped before including URLs in errors/logs.
 */
const AUTH_QUERY_PARAMS = new Set([
  'key', 'token', 'apikey', 'api_key', 'access_token', 'api-key',
]);

/**
 * Strips authentication-related query parameters from a URL for safe logging.
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove embedded credentials (user:pass@host)
    parsed.username = '';
    parsed.password = '';
    // Remove auth query params
    for (const param of AUTH_QUERY_PARAMS) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    }
    return parsed.toString();
  } catch {
    // If URL is malformed, mask the whole thing
    return '[INVALID_URL]';
  }
}

/**
 * Options for fetchWithTimeout
 */
export interface FetchWithTimeoutOptions extends RequestInit {
  /** Timeout in milliseconds (default: 30000, max: 600000) */
  timeoutMs?: number;
  /** Skip URL validation (for internal/trusted URLs only) */
  skipUrlValidation?: boolean;
  /** URL validator function — injected from S78a */
  validateUrl?: (url: string, isLocal: boolean) => boolean;
  /** Whether this is a local provider URL */
  isLocal?: boolean;
}

/**
 * Fetch with timeout, URL validation, and credential sanitization.
 *
 * Uses AbortSignal.timeout() for clean timeout handling.
 * Strips auth query params from URLs before including in any error.
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    skipUrlValidation = false,
    validateUrl,
    isLocal = false,
    ...fetchOptions
  } = options;

  // Clamp timeout
  const effectiveTimeout = clampTimeout(timeoutMs);

  // URL validation (when validator is provided)
  if (!skipUrlValidation && validateUrl) {
    const isValid = validateUrl(url, isLocal);
    if (!isValid) {
      throw new Error(`URL validation failed: ${sanitizeUrl(url)}`);
    }
  }

  // Use AbortSignal.timeout for clean timeout handling
  const signal = AbortSignal.timeout(effectiveTimeout);

  // Attach the connect-time IP pin on EVERY request — NOT gated on skipUrlValidation.
  // skipUrlValidation only means "the cheap sync string check already ran" (e.g. the
  // custom provider validated above); it must NOT disable the SSRF backstop, or the
  // one path with a fully user-configurable baseUrl ships with no rebinding defense.
  // redirect:'error' fails closed on 3xx: net.connect skips a custom lookup for an
  // IP-literal host, so a validated host that 302-redirects to http://169.254.169.254
  // (or 127.0.0.1) would otherwise reach it untouched by the pin.
  // ponytail: reject all redirects (LLM endpoints don't 3xx); upgrade to per-hop
  // resolveAndValidateUrl re-checking if a provider ever legitimately needs them.
  const fetchInit: RequestInit = { ...fetchOptions, signal, redirect: 'error' };
  // `dispatcher` is a Node/undici fetch extension. The undici package's Agent is
  // structurally the same dispatcher as @types/node's, but a distinct nominal type,
  // so assign through a loose cast (verified compatible at runtime).
  (fetchInit as { dispatcher?: unknown }).dispatcher = pinnedDispatcher(isLocal);

  try {
    const response = await fetch(url, fetchInit);
    return response;
  } catch (error: unknown) {
    const safeUrl = sanitizeUrl(url);
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error(`Request to ${safeUrl} timed out after ${effectiveTimeout}ms`);
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request to ${safeUrl} was aborted`);
    }
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network'))) {
      throw new Error(`Network error connecting to ${safeUrl}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Creates a timeout promise that rejects after the specified duration.
 * Reused from dojolm-web pattern.
 */
export function createTimeoutPromise(timeoutMs: number, operation: string): Promise<never> {
  return new Promise((_resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    // Don't prevent process exit
    if (typeof id === 'object' && 'unref' in id) {
      id.unref();
    }
  });
}

/**
 * Race a promise against a timeout.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  return Promise.race([promise, createTimeoutPromise(timeoutMs, operation)]);
}

/**
 * Measure duration since a start time.
 */
export function measureDuration(startTime: number): number {
  return Math.round(performance.now() - startTime);
}
