// SPDX-License-Identifier: Apache-2.0
/**
 * CSP middleware per plan R-C1 (b).
 *
 * Wires `lib/csp.ts` into the Next.js middleware so every request gets a
 * fresh nonce + the strict Content-Security-Policy header. Report-only mode
 * is enabled when CSP_REPORT_ONLY=true (staging default per plan); enforced
 * mode (the default everywhere else) blocks violating loads.
 *
 * The rendered response keeps the existing pattern of forwarding the nonce
 * via the `x-nonce` request header so server components can read it via
 * `next/headers().get('x-nonce')`.
 */

import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { buildCsp } from '@/lib/csp';

const NONCE_HEADER = 'x-nonce';
const ENFORCE_HEADER = 'Content-Security-Policy';
const REPORT_ONLY_HEADER = 'Content-Security-Policy-Report-Only';

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64');
}

interface CspEnv {
  readonly isDev: boolean;
  readonly forceHttps: boolean;
  readonly reportOnly: boolean;
}

export function readCspEnv(env: NodeJS.ProcessEnv = process.env): CspEnv {
  return {
    isDev: env.NODE_ENV === 'development',
    // TPI_FORCE_HTTPS is the current name; NODA_FORCE_HTTPS is the legacy
    // codename fallback (F-14b). `||` so an empty injected value falls through.
    forceHttps: (env.TPI_FORCE_HTTPS || env.NODA_FORCE_HTTPS) === 'true',
    reportOnly: env.CSP_REPORT_ONLY === 'true',
  };
}

export function buildCspResponse(
  request: NextRequest,
  env: CspEnv = readCspEnv(),
): NextResponse {
  const nonce = generateNonce();
  const csp = buildCsp(nonce, env.isDev, env.forceHttps);
  const cspHeader = env.reportOnly ? REPORT_ONLY_HEADER : ENFORCE_HEADER;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  // Next.js app-render extracts the nonce for its auto-injected <script>
  // chunk tags by parsing `headers['content-security-policy']` from the
  // REQUEST headers (see node_modules/next/dist/server/app-render/app-render.js
  // and ./get-script-nonce-from-header.js). Setting CSP only on the response
  // means Next falls back to its own internal nonce, which never matches the
  // CSP directive we send to the browser → all chunk scripts get blocked
  // and the page never hydrates. Mirror the CSP onto the request so Next
  // sees the same directive we're enforcing on the wire.
  requestHeaders.set(cspHeader, csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(NONCE_HEADER, nonce);
  response.headers.set(cspHeader, csp);
  return response;
}

export function applyCspToResponse(
  base: NextResponse,
  request: NextRequest,
  env: CspEnv = readCspEnv(),
): NextResponse {
  const nonce = request.headers.get(NONCE_HEADER) ?? generateNonce();
  const csp = buildCsp(nonce, env.isDev, env.forceHttps);
  const cspHeader = env.reportOnly ? REPORT_ONLY_HEADER : ENFORCE_HEADER;
  base.headers.set(NONCE_HEADER, nonce);
  base.headers.set(cspHeader, csp);
  return base;
}

/**
 * Static-asset paths that don't need CSP because they don't render HTML.
 * The Next.js middleware matcher already excludes most of these via the
 * negative-lookahead pattern, but we keep the function-level check as a
 * defense-in-depth guard.
 */
export function shouldApplyCsp(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return false;
  if (pathname.startsWith('/_next/static/')) return false;
  if (pathname.startsWith('/_next/image')) return false;
  if (/\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot|map)$/i.test(pathname)) {
    return false;
  }
  return true;
}
