/**
 * File: /api/auth/logout/route.ts
 * Purpose: Logout endpoint — destroys session, clears cookies
 * Story: S106 (Auth UI Login)
 */

import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';
import { getSessionToken, buildLogoutCookies } from '@/lib/auth/route-guard';

export async function POST(req: NextRequest) {
  const token = getSessionToken(req);

  if (token) {
    destroySession(token);
  }

  const response = NextResponse.json({ success: true });

  for (const cookie of buildLogoutCookies()) {
    response.headers.append('Set-Cookie', cookie);
  }

  return response;
}
