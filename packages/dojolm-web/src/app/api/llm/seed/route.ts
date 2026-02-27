/**
 * File: api/llm/seed/route.ts
 * Purpose: Seed sample test cases into storage
 * Method: POST
 */

import { NextRequest, NextResponse } from 'next/server';

import { seedTestCases } from '@/lib/data/sample-test-cases';

// ===========================================================================
// POST /api/llm/seed - Seed sample test cases
// ===========================================================================

export async function POST(request: NextRequest) {
  try {
    const result = await seedTestCases();

    return NextResponse.json({
      success: true,
      seeded: result.seeded,
      failed: result.failed,
      message: `Seeded ${result.seeded} test cases${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
    });
  } catch (error) {
    console.error('Error seeding test cases:', error);
    return NextResponse.json(
      { error: 'Failed to seed test cases', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
