/**
 * File: /api/setup/status/route.ts
 * Purpose: Returns whether initial setup is needed (no users in DB)
 * Story: Setup Wizard
 */

import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';

export async function GET() {
  // Demo mode: always show setup wizard on page load
  if (isDemoMode()) {
    return NextResponse.json({ needsSetup: true });
  }

  try {
    const { userRepo } = await import('@/lib/db/repositories/user.repository');
    const count = userRepo.countUsers();
    return NextResponse.json({ needsSetup: count === 0 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}
