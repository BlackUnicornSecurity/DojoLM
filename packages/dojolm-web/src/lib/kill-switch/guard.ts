// SPDX-License-Identifier: Apache-2.0
/**
 * Request-boundary kill-switch guard helpers (YR.13.4 / G-072).
 *
 * Each route that gates on a kill-signal should call `killSwitchGuard(signal)`
 * at the top of its handler body. When the signal is armed the helper
 * returns a 503 NextResponse with a generic "service-suspended" body —
 * we deliberately do NOT name the armed signal in the response so an
 * unauthenticated probe cannot enumerate which signals are armed
 * (operationally sensitive per YR.13.4 prompt's security bias list).
 *
 * Single-worker constraint: `killSwitchRegistry` is in-process. Cross-
 * worker propagation would require the `kill-switch-pubsub` Redis
 * adapter (out of scope this PR — see
 * `deploy/runbooks/kill-switch-multi-worker.md`).
 */

import { NextResponse } from 'next/server';
import { killSwitchRegistry, type KillSignal } from 'bu-tpi/flags';

/**
 * Standard response shape when a kill-switch is armed at a request
 * boundary. Body is intentionally generic — does not name the signal.
 */
export const KILL_SWITCH_503_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
  'Retry-After': '300',
} as const;

/**
 * Returns a generic 503 response if the named signal is armed; null
 * otherwise. Callers should `if (const blocked = killSwitchGuard(...)) return blocked;`
 * at the top of their handler body before doing any other work.
 *
 * The response body is intentionally generic ("service-suspended") so
 * an unauthenticated probe cannot enumerate which kill-signals are
 * currently armed by simply iterating over routes and observing which
 * return 503.
 */
export function killSwitchGuard(signal: KillSignal): NextResponse | null {
  if (!killSwitchRegistry.isActive(signal)) return null;
  return NextResponse.json(
    { error: 'service-suspended' },
    { status: 503, headers: KILL_SWITCH_503_HEADERS },
  );
}
