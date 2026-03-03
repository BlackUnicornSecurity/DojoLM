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

import type { LLMProviderStatus } from './types.js';

/** Default request timeout in ms */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Maximum allowed timeout in ms */
const MAX_TIMEOUT_MS = 120_000;

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
  /** Timeout in milliseconds (default: 30000, max: 120000) */
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
  const effectiveTimeout = Math.min(Math.max(1, timeoutMs), MAX_TIMEOUT_MS);

  // URL validation (when validator is provided)
  if (!skipUrlValidation && validateUrl) {
    const isValid = validateUrl(url, isLocal);
    if (!isValid) {
      throw new Error(`URL validation failed: ${sanitizeUrl(url)}`);
    }
  }

  // Use AbortSignal.timeout for clean timeout handling
  const signal = AbortSignal.timeout(effectiveTimeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal,
    });
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
