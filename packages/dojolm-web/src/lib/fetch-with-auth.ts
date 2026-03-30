/**
 * File: fetch-with-auth.ts
 * Purpose: Shared authenticated fetch utility for frontend API calls (Story 13.9 / C-07)
 *
 * Wraps the native fetch() with:
 * - X-API-Key header from localStorage or env
 * - 401 response handling
 * - Graceful degradation when no key configured
 *
 * Index:
 * - getApiKey() (line 20)
 * - setApiKey() (line 35)
 * - fetchWithAuth() (line 45)
 */

'use client';

const API_KEY_STORAGE_KEY = 'noda-api-key';
const SAFE_RETRY_METHODS = new Set(['GET', 'HEAD']);
const NETWORK_RETRY_DELAYS_MS = [150, 400];

/** Throttle 401 warnings to at most once per 5 seconds */
let lastWarningTime = 0;

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
 * Get API key from localStorage.
 * Returns null if not set.
 */
export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Store API key in localStorage.
 */
export function setApiKey(key: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  } catch {
    console.warn('[fetch-with-auth] Failed to save API key to localStorage');
  }
}

/**
 * Clear stored API key.
 */
export function clearApiKey(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch {
    // Ignore
  }
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

  // Handle 401 — API key invalid or missing (throttled to once per 5s)
  if (response.status === 401) {
    const now = Date.now();
    if (now - lastWarningTime > 5000) {
      console.warn('[fetch-with-auth] 401 Unauthorized — API key may be invalid');
      lastWarningTime = now;
    }
  }

  return response;
}
