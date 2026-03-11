/**
 * File: /api/auth/me/route.ts
 * Purpose: Get current user info from session
 * Story: S106 (Auth UI Login)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { getSessionToken } from '@/lib/auth/route-guard';

export async function GET(req: NextRequest) {
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
