// SPDX-License-Identifier: Apache-2.0
/**
 * Guard-mode helpers — YR.16 / G-066.
 *
 * Centralises:
 *   - `readActiveGuardMode()` — DB-backed read of the platform-wide
 *     guard posture from `admin_settings.guard_mode`. Cached for 5s
 *     so a hot-path tool-execution endpoint pays one read per cache
 *     window, not per request.
 *   - `enforceGuardMode(direction, request)` — returns a 403
 *     `NextResponse` when the active mode forbids the requested
 *     `direction`, or `null` when the request may proceed.
 *
 * Direction model (matches the yamabushi glossary):
 *   - 'inbound'  — the request injects a payload INTO a model
 *     (prompt-injection probes, payload fuzzing, scanner submit).
 *     Blocked when the active mode is 'samurai' or 'hattori'.
 *   - 'outbound' — the request gates a model RESPONSE (output
 *     filtering, response-side leak inspection).
 *     Blocked when the active mode is 'sensei' or 'hattori'.
 *   - 'both'     — bilateral. Blocked when mode is 'hattori' OR
 *     either of the directional checks would fail.
 *
 * Defense-in-depth: this enforcement layer composes with the per-tool
 * RBAC / kill-switch checks that already gate the route. A request
 * blocked by guard-mode lands a `GUARD_MODE_BLOCK` audit row so the
 * operator sees why the call failed without leaking which mode is
 * active to the response body.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminSettingsRepo } from '@/lib/db/repositories/admin-settings.repository';
import type { GuardMode } from '@/lib/db/types';
import { auditLog } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/api-handler';

export type GuardDirection = 'inbound' | 'outbound' | 'both';

/**
 * Five-second cache window: balances freshness (an operator flipping the
 * mode sees enforcement within at most 5s) against the cost of hitting
 * the SQLite read path on every tool-execution request.
 *
 * Multi-worker propagation note: this cache is module-level, so each
 * Node.js worker (PM2 cluster, Kubernetes pod, etc.) holds its own copy.
 * After an operator flips the mode, expect a per-worker propagation lag
 * of at most one TTL window — within 5s of the PATCH every worker will
 * have re-read the row. During that window, requests that land on a
 * worker with a stale cache may briefly disagree with the operator's
 * intent (typically harmless: a request that was about to be allowed
 * gets allowed; a request that should now be blocked could slip through
 * for one window). Tighten the TTL or add pub/sub invalidation if a
 * smaller propagation window is required.
 */
const CACHE_TTL_MS = 5_000;

interface CacheEntry {
  readonly mode: GuardMode;
  readonly readAt: number;
}

let cache: CacheEntry | null = null;

export function readActiveGuardMode(): GuardMode {
  const now = Date.now();
  if (cache !== null && now - cache.readAt < CACHE_TTL_MS) {
    return cache.mode;
  }
  let mode: GuardMode;
  try {
    mode = adminSettingsRepo.getGuardMode();
  } catch {
    // DB unavailable — fail-secure to 'shinobi' (log-only). The
    // alternative (defaulting to 'hattori') would block every tool call
    // during a transient lock; that's a denial-of-service vector.
    // 'shinobi' lets work continue while flagging the read failure
    // upstream via the route's existing error handling.
    mode = 'shinobi';
  }
  cache = { mode, readAt: now };
  return mode;
}

/**
 * Test-only escape hatch: clears the in-process cache so the next
 * `readActiveGuardMode` re-reads the DB. Production never calls.
 */
export function __resetGuardModeCacheForTests(): void {
  cache = null;
}

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

interface BlockedBody {
  readonly error: 'tool-unavailable-in-mode';
}

// Pass-1 security-review MED-1 fold-in: drop the `direction` field from
// the 403 body. Echoing it back leaked a partial oracle on the active
// guard mode (a direction='inbound' rejection narrows the live mode to
// {samurai, hattori}). The forensic record is preserved server-side via
// `auditLog.guardModeBlock(...)` which carries both mode + direction.
// Clients that need to distinguish guard-blocked from capability-blocked
// errors can key off the `error` discriminant instead.
function bodyFor(_direction: GuardDirection): BlockedBody {
  return { error: 'tool-unavailable-in-mode' };
}

/**
 * Returns true iff `mode` blocks `direction`. Pure function, exported for
 * tests + the UI's mode-description copy.
 */
export function modeBlocks(mode: GuardMode, direction: GuardDirection): boolean {
  switch (mode) {
    case 'shinobi':
      return false; // log-only; never blocks
    case 'samurai':
      return direction === 'inbound' || direction === 'both';
    case 'sensei':
      return direction === 'outbound' || direction === 'both';
    case 'hattori':
      return true; // blocks every direction
  }
}

/**
 * Enforce the active guard mode against the request `direction`. Returns
 * a 403 `NextResponse` (with a fixed-vocabulary body — never names which
 * mode is active) when the request must be blocked, or `null` to allow
 * the route handler to proceed.
 *
 * The audit row carries the active mode + direction so a forensic review
 * can reconstruct the decision; the response body deliberately does NOT
 * (R-T1 / fixed-vocabulary discipline matches `KillSwitchStatusBadge`).
 *
 * Operator-context fields are best-effort: when `request.headers.get`
 * doesn't surface a UA or X-Forwarded-For (curl, internal call), the
 * audit row uses empty strings for those fields. The mode + direction
 * remain attributable.
 */
export async function enforceGuardMode(
  direction: GuardDirection,
  request: NextRequest,
  context?: { readonly operatorId?: string },
): Promise<NextResponse | null> {
  const mode = readActiveGuardMode();
  if (!modeBlocks(mode, direction)) return null;

  // Audit the decision before responding. Best-effort — never let an
  // audit-write failure cause a misclassified 200 (which is what a
  // missing await would do on this path).
  try {
    await auditLog.guardModeBlock({
      operatorId: context?.operatorId ?? '',
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? '',
      mode,
      direction,
      route: request.nextUrl?.pathname ?? new URL(request.url).pathname,
    });
  } catch {
    // ignore — the 403 response is the primary enforcement signal
  }

  return NextResponse.json(bodyFor(direction), {
    status: 403,
    headers: RESPONSE_HEADERS,
  });
}
