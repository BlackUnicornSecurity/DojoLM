// SPDX-License-Identifier: Apache-2.0
/**
 * RBAC middleware for /admin/*, /members/*, /settings/* routes.
 * Plan Section 0.1: applied to every /admin/* and /members/* route.
 *
 * YR.13.2 — edge-runtime role enforcement (G-071, G-073).
 *
 * Layered enforcement:
 * - Middleware (this module) decodes the HMAC-signed session-claim cookie
 *   issued at login time, verifies the signature + expiry + token-hash
 *   binding, and compares the claimed role against the route's required
 *   role. No DB lookup — `better-sqlite3` cannot run on the Edge runtime
 *   (per ticket pass-3 CRIT-1).
 * - Page-level / API-level handlers re-validate against the live DB row
 *   via `withAuth` for the definitive allow/deny.
 *
 * Outcomes for a gated request:
 * - no cookie → 307 to `/login?next=...`.
 * - malformed/expired/forged cookie → 307 to `/login?next=...` (case
 *   indistinguishable in the redirect to avoid leaking which path fired).
 * - authenticated but role insufficient → 307 to
 *   `/forbidden?role=<required>&next=<originating-url>` so the operator
 *   can request the right role + bounce back after re-auth (E4.S11
 *   retires F-7-028 P2).
 * - authenticated with sufficient role → pass through.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { isDemoMode } from '@/lib/demo';
import { parseAndVerifySessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth/session-claim';
import { isAtLeastRole } from '@/lib/auth/rbac';
import type { UserRole } from '@/lib/db/types';

interface GateRule {
  readonly pathPrefix: string;
  readonly requiredRole: UserRole;
}

/**
 * Prefix list kept in path-specificity order (longest prefix first).
 *
 * `/admin/*`    requires `admin`.
 * `/members/*`  requires `member` (admin satisfies via `isAtLeastRole`).
 * `/settings/*` requires `member` — every authenticated user has account-
 * level settings; role-specific settings live under `/admin/settings`.
 */
const GATE_RULES: readonly GateRule[] = [
  { pathPrefix: '/admin', requiredRole: 'admin' },
  { pathPrefix: '/members', requiredRole: 'member' },
  { pathPrefix: '/settings', requiredRole: 'member' },
  /* /account hosts DSR self-service (export + delete). Authenticated-user
     surface — any session with a real userId can file a DSR. Edge gate
     parity with /members + /settings: defence-in-depth ahead of the
     server-component validateSession() call. (E6.S5) */
  { pathPrefix: '/account', requiredRole: 'member' },
] as const;

/**
 * Explicit public-path exemptions that fall inside a gated prefix.
 * Each entry is matched with exact-equality against the incoming pathname.
 *
 * Keep this set narrow: each entry is a hole in an otherwise-enforced
 * gate, so the value must be a single deterministic path. Additions
 * require the same security-review posture as a new harm-path flag.
 */
const PUBLIC_EXEMPTIONS: readonly string[] = [
  '/members/sign-in',
  '/members/request-invite',
] as const;

function isPublicExemption(pathname: string): boolean {
  return PUBLIC_EXEMPTIONS.includes(pathname);
}

function matchRule(pathname: string): GateRule | undefined {
  if (isPublicExemption(pathname)) return undefined;
  return GATE_RULES.find((rule) => pathname.startsWith(rule.pathPrefix));
}

function isDemoBypass(req: NextRequest): boolean {
  if (!isDemoMode()) return false;
  return req.headers.get('x-dojo-demo-mode') === '1';
}

function redirectToLogin(req: NextRequest): NextResponse {
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

function redirectToForbidden(req: NextRequest, requiredRole: UserRole): NextResponse {
  const forbiddenUrl = new URL('/forbidden', req.url);
  forbiddenUrl.searchParams.set('role', requiredRole);
  // E4.S11 (retires F-7-028 P2): preserve the originating pathname +
  // search so the /forbidden page's "Sign in with different role" CTA
  // can chain to /login?next=<x> and bounce the operator back after
  // re-auth. The two-roles case (e.g. admin+member browsing /admin/users
  // with only the member claim active) loses no context.
  //
  // The chain is: /admin/users → /forbidden?role=admin&next=/admin/users
  //   → /login?next=/admin/users → /admin/users (post-auth).
  //
  // The /forbidden page re-validates `next` via `sanitizeReturnTo` from
  // lib/safe-redirect.ts before reflecting it into the CTA href, so we
  // emit an unencoded same-origin path here and rely on the boundary
  // validator at consume-time. URLSearchParams.set() handles the wire
  // encoding for us.
  forbiddenUrl.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(forbiddenUrl);
}

export async function rbacMiddleware(req: NextRequest): Promise<NextResponse> {
  const rule = matchRule(req.nextUrl.pathname);
  if (!rule) return NextResponse.next();

  if (isDemoBypass(req)) {
    return NextResponse.next();
  }

  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookieValue) {
    return redirectToLogin(req);
  }

  const parsed = await parseAndVerifySessionCookie(cookieValue);
  if (!parsed) {
    return redirectToLogin(req);
  }

  if (!isAtLeastRole(parsed.claim.r, rule.requiredRole)) {
    return redirectToForbidden(req, rule.requiredRole);
  }

  return NextResponse.next();
}

export const RBAC_MIDDLEWARE_MATCHER: readonly string[] = [
  '/admin/:path*',
  '/members/:path*',
  '/settings/:path*',
] as const;
