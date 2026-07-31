// SPDX-License-Identifier: Apache-2.0
/**
 * DSR per-user rate-limit helper (Phase E PR-E2 / #392).
 *
 * Lives outside `src/app/api/dsr/route.ts` because Next.js Route handlers
 * can only export specific symbols (GET/POST/etc.) — non-handler exports
 * fail the route typegen check.
 */

import type { DsrService } from 'bu-tpi/compliance';

/** Per-user rate limit: 5 submissions per rolling 24h window. */
export const DSR_RATE_LIMIT_MAX = 5;
export const DSR_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * 7 days in seconds — `Retry-After` value sent on 503 (DSR_BACKEND
 * unset). Shared across both POST and GET handlers so the operator
 * response window has one source of truth.
 */
export const DSR_BACKEND_RETRY_AFTER_SECONDS = 60 * 60 * 24 * 7;

/**
 * Returns null when the caller is under the limit; otherwise returns the
 * `Retry-After` value in seconds. Conservative — we ask the caller to
 * retry after a full 24h window because we don't know the timestamp of
 * the oldest counted submission without an extra round-trip.
 */
export async function evaluateRateLimit(
  service: DsrService,
  userId: string,
  now: Date,
): Promise<number | null> {
  const sinceISO = new Date(now.getTime() - DSR_RATE_LIMIT_WINDOW_MS).toISOString();
  const recent = await service.countSubmissionsSince(userId, sinceISO);
  if (recent < DSR_RATE_LIMIT_MAX) return null;
  return Math.ceil(DSR_RATE_LIMIT_WINDOW_MS / 1000);
}
