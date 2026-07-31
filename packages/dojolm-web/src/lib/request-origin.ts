// SPDX-License-Identifier: Apache-2.0
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
  // BUG-002 fix: TPI_APP_URL is a server-only env var that can be changed
  // in Docker env config without rebuilding the image. NEXT_PUBLIC_APP_URL
  // is frozen into the client-side bundle at build time by Next.js.
  const configured = (process.env.TPI_APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL)?.trim();
  if (configured) {
    return normalizeOrigin(configured);
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return DEV_FALLBACK_APP_ORIGIN;
}

// EPIC-B (F-QA-022): derive the trusted origin from the incoming request's
// own Host (or X-Forwarded-Host when behind a trusted reverse proxy) when
// no TPI_APP_URL is configured. Lets a single OSS image serve any hostname
// the operator points at it (LAN IP, LAN DNS, ngrok, …) without a rebuild —
// no more 401 storm on the first hit from a host the build wasn't pinned to.
function getRequestDerivedOrigin(request: NextRequest): string | null {
  const xfHost = request.headers.get('x-forwarded-host')?.trim();
  const host = (xfHost || request.headers.get('host'))?.trim();
  if (!host) return null;
  // Honour X-Forwarded-Proto only when the reverse proxy is trusted (TRUSTED_PROXY).
  // Otherwise fall back to the request URL's protocol (Next.js parses request URL
  // from the same headers but with its own trust model).
  const trustedProxy = process.env.TRUSTED_PROXY?.trim();
  const xfProto = trustedProxy ? request.headers.get('x-forwarded-proto')?.trim() : null;
  let proto = xfProto || request.nextUrl.protocol.replace(/:$/, '');
  if (proto !== 'http' && proto !== 'https') proto = 'http';
  return normalizeOrigin(`${proto}://${host}`);
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

function getExtraAllowedOrigins(): Set<string> {
  const raw = process.env.TPI_ALLOWED_ORIGINS_EXTRA?.trim();
  if (!raw) return new Set();
  const out = new Set<string>();
  for (const part of raw.split(',')) {
    const normalized = normalizeOrigin(part.trim());
    if (normalized) out.add(normalized);
  }
  return out;
}

export function isTrustedBrowserOriginRequest(request: NextRequest): boolean {
  // EPIC-B (F-QA-022): when TPI_APP_URL is unset (single-host OSS deploys),
  // fall back to the request's own Host so any hostname the operator points
  // at the container is trusted for its own same-origin requests.
  const appOrigin = getConfiguredAppOrigin() ?? getRequestDerivedOrigin(request);
  if (!appOrigin) {
    return false;
  }

  // 2026-05-12 PROD-HOTFIX: Caddy reverse-proxy on the production host strips
  // `Sec-Fetch-*` request headers, so the strict-fetch-metadata gate
  // rejected every legitimate same-origin browser request (the cookie-
  // auth path fell through to "external/programmatic", which requires
  // an API key, returning 401 on every /api/admin/* page-mounted
  // fetch — symptom: 500/401-after-login). When Sec-Fetch headers are
  // PRESENT, we still enforce the strict check (defense in depth on
  // direct-to-container Cloudflare/edge traffic). When they are ABSENT
  // (reverse-proxy strip), we fall back to Origin/Referer same-origin
  // match alone — same protection level browsers themselves enforce
  // for SameSite=Strict cookies.
  const secFetchSite = request.headers.get('sec-fetch-site');
  const hasFetchMetadataHeaders = secFetchSite !== null
    || request.headers.get('sec-fetch-mode') !== null
    || request.headers.get('sec-fetch-dest') !== null;
  if (hasFetchMetadataHeaders && !hasValidFetchMetadata(request)) {
    return false;
  }

  const origin = normalizeOrigin(request.headers.get('origin') ?? '');
  const refererOrigin = normalizeOrigin(request.headers.get('referer') ?? '');
  const extraOrigins = getExtraAllowedOrigins();

  if (process.env.NODE_ENV !== 'production') {
    if (origin === appOrigin || refererOrigin === appOrigin) {
      return true;
    }

    return (
      (!!origin && (DEV_EXTRA_ALLOWED_ORIGINS.has(origin) || extraOrigins.has(origin))) ||
      (!!refererOrigin && (DEV_EXTRA_ALLOWED_ORIGINS.has(refererOrigin) || extraOrigins.has(refererOrigin)))
    );
  }

  if (origin === appOrigin || refererOrigin === appOrigin) {
    return true;
  }

  if (extraOrigins.size > 0) {
    if ((origin && extraOrigins.has(origin)) || (refererOrigin && extraOrigins.has(refererOrigin))) {
      return true;
    }
  }

  return false;
}

export function isTrustedBrowserSessionRequest(request: NextRequest): boolean {
  if (!isTrustedBrowserOriginRequest(request)) {
    return false;
  }

  return hasValidSession(request);
}
