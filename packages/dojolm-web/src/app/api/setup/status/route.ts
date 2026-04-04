/**
 * File: /api/setup/status/route.ts
 * Purpose: Returns whether initial setup is needed (no users in DB)
 * Story: Setup Wizard
 */

import { NextResponse } from 'next/server';
import { userRepo } from '@/lib/db/repositories/user.repository';

export async function GET() {
  try {
    const count = userRepo.countUsers();
    return NextResponse.json({ needsSetup: count === 0 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}
