/**
 * File: api/llm/seed/route.ts
 * Purpose: Seed sample test cases into storage
 * Method: POST
 */

import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-error';
import { seedTestCases } from '@/lib/data/sample-test-cases';
import { checkApiAuth } from '@/lib/api-auth';

// ===========================================================================
// POST /api/llm/seed - Seed sample test cases
// ===========================================================================

export async function POST(request: NextRequest) {
  const authError = checkApiAuth(request);
  if (authError) return authError;

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
}
