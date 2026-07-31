// SPDX-License-Identifier: Apache-2.0
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
import { withAuth } from '@/lib/auth/route-guard';

// ===========================================================================
// GET /api/llm/guard/stats - Get aggregated guard statistics
// ===========================================================================

export const GET = withAuth(
  async (_request: NextRequest) => {
  if (isDemoMode()) return demoGuardStatsGet();

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
  },
  { role: 'admin' },
);
