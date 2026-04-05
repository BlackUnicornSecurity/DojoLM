/**
 * File: /api/auth/me/route.ts
 * Purpose: Get current user info from session
 * Story: S106 (Auth UI Login)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode, DEMO_USER } from '@/lib/demo';

export async function GET(req: NextRequest) {
  // Demo mode: always return demo user
  if (isDemoMode()) {
    return NextResponse.json({ user: DEMO_USER });
  }

  const { validateSession } = await import('@/lib/auth/session');
  const { getSessionToken } = await import('@/lib/auth/route-guard');

  const token = getSessionToken(req);

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = validateSession(token);

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user });
}
