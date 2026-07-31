// SPDX-License-Identifier: Apache-2.0
/**
 * File: /api/auth/logout/route.ts
 * Purpose: Logout endpoint — destroys session, clears cookies
 * Story: S106 (Auth UI Login)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import {
  buildLogoutCookies,
  hasCsrfCookie,
  hasValidCsrfDoubleSubmit,
} from '@/lib/auth/route-guard';
import { auditLog } from '@/lib/audit-logger';

export async function POST(req: NextRequest) {
  // CSRF (double-submit cookie). Logout is a PUBLIC, body-less route, so the
  // proxy's Content-Type guard is relaxed for it (F-QA-025) — this check is
  // the CSRF defense. Enforced only when a `tpi_csrf` cookie is present: a
  // request with no CSRF cookie has no live session to protect, so logout
  // stays idempotent/forgiving (clears cookies, returns 200). A cross-site
  // forced-logout would carry the victim's cookie but cannot forge the
  // matching header → 403. Demo mode bypasses, mirroring withAuth.
  if (!isDemoMode() && hasCsrfCookie(req) && !hasValidCsrfDoubleSubmit(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  let userId = 'unknown';
  let username = 'unknown';

  if (!isDemoMode()) {
    const { destroySession, validateSession } = await import('@/lib/auth/session');
    const { getSessionToken } = await import('@/lib/auth/route-guard');
    const token = getSessionToken(req);
    if (token) {
      const user = validateSession(token);
      if (user) {
        userId = user.id;
        username = user.username;
      }
      destroySession(token);
    }
  }

  const response = NextResponse.json({ success: true });

  for (const cookie of buildLogoutCookies(req)) {
    response.headers.append('Set-Cookie', cookie);
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
  void auditLog.authLogout({ userId, username, ip });

  return response;
}
