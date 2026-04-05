/**
 * File: api/llm/guard/stats/route.ts
 * Purpose: Guard aggregated statistics API
 * Story: TPI-UIP-11
 * Method: GET
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoGuardStatsGet } from '@/lib/demo/mock-api-handlers';
import { getGuardStats } from '@/lib/storage/guard-storage';
import { checkApiAuth } from '@/lib/api-auth';

// ===========================================================================
// GET /api/llm/guard/stats - Get aggregated guard statistics
// ===========================================================================

export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoGuardStatsGet();
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const stats = await getGuardStats();

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Error getting guard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
