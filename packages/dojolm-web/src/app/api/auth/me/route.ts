// SPDX-License-Identifier: Apache-2.0
/**
 * File: /api/auth/me/route.ts
 * Purpose: Get current user info from session
 * Story: S106 (Auth UI Login)
 *
 * F-8-008 (Wave 3hh) — also expose `expiresAt` (ISO-8601 of the
 * session row) so the client can surface a proactive expiring-soon
 * banner N minutes before the cookie dies. The field is null in
 * demo mode (no real session) and absent when there is no live
 * session at all. Carries no secret material — it is the same
 * column that already gates the SQL predicate in
 * `validateSessionWithExpiry`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode, DEMO_USER } from '@/lib/demo';

export async function GET(req: NextRequest) {
  // Demo mode: always return demo user; expiresAt is null because no
  // real session exists. The client treats null as "no warning to
  // surface" so demo-mode previews never flash the banner.
  if (isDemoMode()) {
    return NextResponse.json({ user: DEMO_USER, expiresAt: null });
  }

  const { validateSessionWithExpiry } = await import('@/lib/auth/session');
  const { getSessionToken } = await import('@/lib/auth/route-guard');

  const token = getSessionToken(req);

  if (!token) {
    return NextResponse.json({ user: null, expiresAt: null }, { status: 200 });
  }

  const result = validateSessionWithExpiry(token);

  if (!result) {
    return NextResponse.json({ user: null, expiresAt: null }, { status: 200 });
  }

  return NextResponse.json({ user: result.user, expiresAt: result.expiresAt });
}
