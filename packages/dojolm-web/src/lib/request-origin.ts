import { NextRequest } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { SESSION_COOKIE_NAME } from '@/lib/auth/route-guard';

const DEV_FALLBACK_APP_ORIGIN = 'http://127.0.0.1:42001';
const DEV_EXTRA_ALLOWED_ORIGINS = new Set([
  'http://localhost:42001',
  'http://localhost:3001',
]);
const VALID_SEC_FETCH_MODES = new Set(['cors', 'same-origin', 'navigate']);
const VALID_SEC_FETCH_DESTS = new Set(['empty', 'document']);

function normalizeOrigin(value: string): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function hasValidFetchMetadata(request: NextRequest): boolean {
  const secFetchSite = request.headers.get('sec-fetch-site');
  const secFetchMode = request.headers.get('sec-fetch-mode');
  const secFetchDest = request.headers.get('sec-fetch-dest');

  return (
    secFetchSite === 'same-origin' &&
    !!secFetchMode &&
    VALID_SEC_FETCH_MODES.has(secFetchMode) &&
    !!secFetchDest &&
    VALID_SEC_FETCH_DESTS.has(secFetchDest)
  );
}

function hasValidSession(request: NextRequest): boolean {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }

  try {
    return validateSession(token) !== null;
  } catch {
    return false;
  }
}

export function getConfiguredAppOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return normalizeOrigin(configured);
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return DEV_FALLBACK_APP_ORIGIN;
}

export function isAllowedCorsOrigin(origin: string): boolean {
  const normalizedOrigin = normalizeOrigin(origin);
  const appOrigin = getConfiguredAppOrigin();

  if (!normalizedOrigin || !appOrigin) {
    return false;
  }

  if (process.env.NODE_ENV === 'production') {
    return normalizedOrigin === appOrigin;
  }

  return normalizedOrigin === appOrigin || DEV_EXTRA_ALLOWED_ORIGINS.has(normalizedOrigin);
}

export function isTrustedBrowserOriginRequest(request: NextRequest): boolean {
  const appOrigin = getConfiguredAppOrigin();
  if (!appOrigin || !hasValidFetchMetadata(request)) {
    return false;
  }

  const origin = normalizeOrigin(request.headers.get('origin') ?? '');
  const refererOrigin = normalizeOrigin(request.headers.get('referer') ?? '');

  if (process.env.NODE_ENV !== 'production') {
    if (origin === appOrigin || refererOrigin === appOrigin) {
      return true;
    }

    return (
      (!!origin && DEV_EXTRA_ALLOWED_ORIGINS.has(origin)) ||
      (!!refererOrigin && DEV_EXTRA_ALLOWED_ORIGINS.has(refererOrigin))
    );
  }

  if (origin !== appOrigin && refererOrigin !== appOrigin) {
    return false;
  }

  return true;
}

export function isTrustedBrowserSessionRequest(request: NextRequest): boolean {
  if (!isTrustedBrowserOriginRequest(request)) {
    return false;
  }

  return hasValidSession(request);
}
