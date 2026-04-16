/**
 * File: /api/setup/status/route.ts
 * Purpose: Returns whether initial setup is needed (no users in DB)
 * Story: Setup Wizard
 *
 * Security (F-5, 2026-04-16): Once setup is complete (users exist), this
 * endpoint returns 401 to unauthenticated callers. Only the login page
 * and authenticated sessions may check setup status post-setup — this
 * prevents unauthenticated recon from learning whether the instance has
 * been provisioned.
 */

import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';

export async function GET(req: Request) {
  // Demo mode: always show setup wizard on page load
  if (isDemoMode()) {
    return NextResponse.json({ needsSetup: true });
  }

  try {
    const { userRepo } = await import('@/lib/db/repositories/user.repository');
    const count = userRepo.countUsers();

    // Setup incomplete (no users) — always allow so the setup wizard can render
    if (count === 0) {
      return NextResponse.json({ needsSetup: true });
    }

    // Setup complete — gate behind auth to prevent unauthenticated recon (F-5)
    const { getSessionFromRequest } = await import('@/lib/auth/session');
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json({ needsSetup: false });
  } catch {
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}
