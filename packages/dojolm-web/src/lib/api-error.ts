/**
 * File: api-error.ts
 * Purpose: Centralized API error response helper (H-02)
 *
 * Returns generic error messages in production to prevent
 * leaking internal paths, stack traces, or error details.
 * Detailed messages are only shown in development mode.
 */

import { NextResponse } from 'next/server';

const VALID_HTTP_STATUS_MIN = 400;
const VALID_HTTP_STATUS_MAX = 599;

/**
 * Create a safe API error response.
 * In production: returns only the user-facing message.
 * In development: includes the original error details for debugging.
 */
export function apiError(
  userMessage: string,
  status: number,
  error?: unknown,
): NextResponse {
  if (error) {
    console.error(`[API Error] ${userMessage}:`, error);
  }

  // Validate status code — clamp to valid error range
  const safeStatus = (status >= VALID_HTTP_STATUS_MIN && status <= VALID_HTTP_STATUS_MAX)
    ? status
    : 500;

  const body: Record<string, string> = { error: userMessage };

  // Inline check per-request (not frozen at module load)
  if (process.env.NODE_ENV !== 'production' && error) {
    body.message = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(body, { status: safeStatus });
}
