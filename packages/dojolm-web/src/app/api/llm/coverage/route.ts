/**
 * File: api/llm/coverage/route.ts
 * Purpose: Get test coverage metrics
 * Method: GET
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoCoverageGet } from '@/lib/demo/mock-api-handlers';

import { apiError } from '@/lib/api-error';
import { fetchCoverageMap } from '@/lib/llm-server-utils';
import { checkApiAuth } from '@/lib/api-auth';
import { getClientIp } from '@/lib/api-handler';

// In-memory rate limiter — 30 coverage requests per minute per IP
const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (rateLimiter.size > 10_000) {
    for (const [key, ts] of rateLimiter) {
      if (ts.every((t) => now - t >= RATE_WINDOW_MS)) rateLimiter.delete(key);
    }
  }
  const timestamps = rateLimiter.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  rateLimiter.set(ip, recent);
  return true;
}

// ===========================================================================
// GET /api/llm/coverage - Get coverage metrics
// ===========================================================================

export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoCoverageGet();
  const authError = checkApiAuth(request);
  if (authError) return authError;

  const ip = getClientIp(request);

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded — try again later' },
      { status: 429 },
    );
  }

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
