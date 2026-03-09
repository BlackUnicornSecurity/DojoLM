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

/** Throttle 401 warnings to at most once per 5 seconds */
let lastWarningTime = 0;

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

  const headers = new Headers(init?.headers);

  // Add auth header if key is available
  if (apiKey) {
    headers.set('X-API-Key', apiKey);
  }

  // Auto-set Content-Type for mutation requests with a string body
  // Skip for FormData, Blob, ArrayBuffer etc. — browser sets correct Content-Type automatically
  const method = (init?.method ?? 'GET').toUpperCase();
  if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type') && ['POST', 'PUT', 'PATCH'].includes(method)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

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
