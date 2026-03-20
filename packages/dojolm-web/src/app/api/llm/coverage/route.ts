/**
 * File: api/llm/coverage/route.ts
 * Purpose: Get test coverage metrics
 * Method: GET
 */

import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-error';
import { fetchCoverageMap } from '@/lib/llm-server-utils';
import { checkApiAuth } from '@/lib/api-auth';

// ===========================================================================
// GET /api/llm/coverage - Get coverage metrics
// ===========================================================================

export async function GET(request: NextRequest) {
  const authError = checkApiAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);

    // Get optional model filter
    const modelId = searchParams.get('modelId') || undefined;

    // Get coverage map
    const coverage = await fetchCoverageMap(modelId);

    // Calculate summary statistics
    const owaspCategories = Object.keys(coverage.owasp).length;
    const tpiStories = Object.keys(coverage.tpi).length;

    const owaspTested = Object.values(coverage.owasp).filter(c => c.tested > 0).length;
    const tpiTested = Object.values(coverage.tpi).filter(c => c.tested > 0).length;

    const owaspPassed = Object.values(coverage.owasp).filter(c => c.passed > 0).length;
    const tpiPassed = Object.values(coverage.tpi).filter(c => c.passed > 0).length;

    const summary = {
      owasp: {
        total: owaspCategories,
        tested: owaspTested,
        passed: owaspPassed,
        percentage: owaspTested > 0 ? Math.round((owaspPassed / owaspTested) * 100) : 0,
      },
      tpi: {
        total: tpiStories,
        tested: tpiTested,
        passed: tpiPassed,
        percentage: tpiTested > 0 ? Math.round((tpiPassed / tpiTested) * 100) : 0,
      },
    };

    return NextResponse.json({
      coverage,
      summary,
    });
  } catch (error) {
    return apiError('Failed to get coverage', 500, error);
  }
}
