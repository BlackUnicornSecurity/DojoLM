// SPDX-License-Identifier: Apache-2.0
/**
 * File: setup-status-cache.ts
 * Purpose: Shared module-level cache + in-flight dedupe for `/api/setup/status`.
 * Story: E8.S5 (F-9-007 P1) — trace + fix aborted API requests.
 *
 * Background:
 *   The audit cited `/api/setup/status` firing x8 per page-load. Two
 *   surfaces hit the endpoint (`/login` and `/setup`); each had a useEffect
 *   with a deps array including `router` (which changes identity across
 *   renders) plus React strict-mode double-mount. Combined with the
 *   AuthContext refresh cycle (`loading: true → false` plus
 *   `user: null → x`) the login-page effect re-fired enough times to
 *   stack 4-8 in-flight aborts before settling.
 *
 * Strategy:
 *   - Module-level singleton cache (TTL 1h) — once we know whether setup
 *     is needed, we don't need to re-ask for an hour. The page is a
 *     redirect-gate, not a live data surface.
 *   - In-flight dedupe — concurrent callers share a single Promise.
 *   - `revalidate()` escape hatch for callers that genuinely need a fresh
 *     read (e.g. after the wizard completes).
 *
 * Acceptance (E8.S5 plan-spec):
 *   /api/setup/status polled exactly 1× per hour (or single SWR-cached
 *   call). Implemented by SETUP_STATUS_TTL_MS = 60×60×1000.
 */

interface SetupStatusResponse {
  readonly needsSetup?: boolean;
  readonly telemetryAcknowledged?: boolean;
}

interface SetupStatusEntry {
  readonly value: SetupStatusResponse;
  readonly fetchedAt: number;
}

// 1h cache lifetime. The page is a redirect-gate; any operator who
// completes setup re-loads the page (router.replace) which crosses the
// cache boundary anyway, and the wizard's completion path explicitly
// calls `revalidateSetupStatus()` to bust the cache.
const SETUP_STATUS_TTL_MS = 60 * 60 * 1000;

let cachedEntry: SetupStatusEntry | null = null;
let inFlight: Promise<SetupStatusResponse | null> | null = null;

/**
 * Fetch `/api/setup/status` with module-level caching + in-flight dedupe.
 * Returns `null` on network/server failure so callers can fall through
 * to their existing failure-mode behaviour (login page falls through to
 * the credentials form; setup page redirects to /login).
 */
export async function fetchSetupStatus(): Promise<SetupStatusResponse | null> {
  const now = Date.now();

  if (cachedEntry !== null && now - cachedEntry.fetchedAt < SETUP_STATUS_TTL_MS) {
    return cachedEntry.value;
  }

  if (inFlight !== null) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const res = await fetch('/api/setup/status');
      if (!res.ok) {
        return null;
      }
      const value = (await res.json()) as SetupStatusResponse;
      cachedEntry = { value, fetchedAt: Date.now() };
      return value;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Bust the cache. Called when a flow that mutates setup state completes
 * (e.g. SetupWizard finished). Tests also call this in `beforeEach` to
 * isolate between cases.
 */
export function revalidateSetupStatus(): void {
  cachedEntry = null;
  inFlight = null;
}

/**
 * Test-only helper — exposes the current cache state for assertions.
 * Not part of the public surface; only `__tests__/` should import this.
 */
export function __getSetupStatusCacheForTesting(): {
  readonly cached: SetupStatusEntry | null;
  readonly inFlight: boolean;
} {
  return { cached: cachedEntry, inFlight: inFlight !== null };
}
