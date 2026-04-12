/**
 * File: /api/auth/logout/route.ts
 * Purpose: Logout endpoint — destroys session, clears cookies
 * Story: S106 (Auth UI Login)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { buildLogoutCookies } from '@/lib/auth/route-guard';

export async function POST(req: NextRequest) {
  if (!isDemoMode()) {
    const { destroySession } = await import('@/lib/auth/session');
    const { getSessionToken } = await import('@/lib/auth/route-guard');
    const token = getSessionToken(req);
    if (token) {
      destroySession(token);
    }
  }

  const response = NextResponse.json({ success: true });

  for (const cookie of buildLogoutCookies(req)) {
    response.headers.append('Set-Cookie', cookie);
  }

  return response;
}
