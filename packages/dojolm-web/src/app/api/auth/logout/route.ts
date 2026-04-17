/**
 * File: /api/auth/logout/route.ts
 * Purpose: Logout endpoint — destroys session, clears cookies
 * Story: S106 (Auth UI Login)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { buildLogoutCookies } from '@/lib/auth/route-guard';
import { auditLog } from '@/lib/audit-logger';

export async function POST(req: NextRequest) {
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
