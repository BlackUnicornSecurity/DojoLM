'use client';

import { getApiKey } from './fetch-with-auth';

const AUTH_ACCESS_CACHE_TTL_MS = 5_000;

let cachedAuthAccess: boolean | null = null;
let cachedAuthAccessAt = 0;
let authAccessRequest: Promise<boolean> | null = null;

export function resetClientAuthAccessCache(): void {
  cachedAuthAccess = null;
  cachedAuthAccessAt = 0;
  authAccessRequest = null;
}

export async function canAccessProtectedApi(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  if (getApiKey()) {
    return true;
  }

  const now = Date.now();
  if (cachedAuthAccess !== null && now - cachedAuthAccessAt < AUTH_ACCESS_CACHE_TTL_MS) {
    return cachedAuthAccess;
  }

  if (authAccessRequest) {
    return authAccessRequest;
  }

  authAccessRequest = (async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as { user?: unknown };
      return Boolean(data.user);
    } catch {
      return false;
    }
  })().then((hasAccess) => {
    cachedAuthAccess = hasAccess;
    cachedAuthAccessAt = Date.now();
    return hasAccess;
  }).finally(() => {
    authAccessRequest = null;
  });

  return authAccessRequest;
}
