// SPDX-License-Identifier: Apache-2.0
// @orphan-tracked -- YA.6 Buki SAGE seeds — sage seed-gen surface
/**
 * File: api/llm/seed/route.ts
 * Purpose: Seed sample test cases into storage
 * Method: POST
 *
 * YR.13.2 founder migration — single-verb POST mutation, gated by `withAuth`
 * with `role: 'admin'`. Adds CSRF enforcement (the legacy `checkApiAuth` had
 * none) and routes admin-only writes through the same guard as the rest of
 * the YR.13.x security tripod.
 */

import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-error';
import { seedTestCases } from '@/lib/data/sample-test-cases';
import { withAuth } from '@/lib/auth/route-guard';

// ===========================================================================
// POST /api/llm/seed - Seed sample test cases
// ===========================================================================

export const POST = withAuth(
  async (_request: NextRequest) => {
    try {
      const result = await seedTestCases();

      return NextResponse.json({
        success: true,
        seeded: result.seeded,
        failed: result.failed,
        message: `Seeded ${result.seeded} test cases${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
      });
    } catch (error) {
      return apiError('Failed to seed test cases', 500, error);
    }
  },
  { role: 'admin' },
);
