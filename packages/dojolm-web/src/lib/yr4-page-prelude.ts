// SPDX-License-Identifier: Apache-2.0
/**
 * YR.4 — Shared server-side prelude for the v2.1 admin module pages
 * (Scanner / Buki / Jutsu / Arena / Sengoku — Red-tint cluster).
 *
 * Each page calls `resolveYr4PagePrelude({ flag, demoHeader })` from its
 * server component to get back one of three discriminated states:
 *   - { kind: 'flag-off' }       → flag-OFF EmptyState (loading state per
 *                                  states.md)
 *   - { kind: 'forbidden' }      → role-mismatch EmptyState (error state +
 *                                  "no admin access")
 *   - { kind: 'ok', user }       → authenticated admin → render the client
 *
 * Unauth handling lives one layer up in `middleware/rbac.ts` — the edge
 * gate redirects every `/admin/*` request without a session cookie to
 * `/login` BEFORE reaching the page. By the time `resolveYr4PagePrelude`
 * runs, the request has either a valid session cookie or it's a demo
 * call (resolved through the demo-mode header bypass).
 *
 * Demo-mode contract:
 *   - `isDemoMode()` true + `x-<module>-ui-enabled: 0/false` → flag off
 *   - `isDemoMode()` true + `x-<module>-ui-enabled: 1/true`  → flag on
 *   - `isDemoMode()` true + `x-dojo-demo-no-session: 1`      → no session
 *     (forces the unauth path to surface in tests; middleware bypasses
 *     unauth in demo mode so tests can pin the state via the header).
 *
 * This mirrors the `/admin/members/invites` precedent verbatim so e2e
 * fixtures (e2e/helpers/e8-fixtures.ts) drive every YR.4 page from the
 * same demo-mode toggles.
 */

import { cookies, headers } from 'next/headers';
import { defaultFlagReader, type FlagName } from 'bu-tpi/flags';
import { validateSession, type SessionUser } from '@/lib/auth/session';
import { isDemoMode, DEMO_USER } from '@/lib/demo';

export const SESSION_COOKIE_NAME = 'tpi_session';
export const DEMO_NO_SESSION_HEADER = 'x-dojo-demo-no-session';

export interface Yr4PreludeOptions {
  /** Compile-time-typed flag name (one of the YR.4.x flags). */
  readonly flag: FlagName;
  /** Header used to override the flag in demo mode (e.g. `x-scanner-ui-enabled`). */
  readonly demoHeader: string;
}

export type Yr4PreludeResult =
  | { readonly kind: 'flag-off' }
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'ok'; readonly user: SessionUser };

async function isFlagEnabled(opts: Yr4PreludeOptions): Promise<boolean> {
  if (isDemoMode()) {
    const hdr = (await headers()).get(opts.demoHeader);
    if (hdr === '0' || hdr === 'false') return false;
    if (hdr === '1' || hdr === 'true') return true;
  }
  return defaultFlagReader().isEnabled(opts.flag);
}

async function currentSession(): Promise<SessionUser | null> {
  if (isDemoMode()) {
    const hdrs = await headers();
    if (hdrs.get(DEMO_NO_SESSION_HEADER) === '1') return null;
    return DEMO_USER;
  }
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return validateSession(token);
}

/**
 * Resolve flag + session + role for a YR.4 admin module page. Returns one
 * of four discriminated outcomes:
 *
 *   - `unauth`     → caller should redirect to `/login`. Always wins when
 *                    no session is present, regardless of flag state.
 *                    Authentication is a precondition for authorization
 *                    *and* for any flag-gated UX.
 *   - `forbidden`  → caller should render the forbidden EmptyState.
 *                    Returned only when the user IS authenticated but
 *                    NOT admin.
 *   - `flag-off`   → caller should render the flag-off EmptyState.
 *                    Returned only when the user IS authenticated, IS
 *                    admin (so we never leak a flag-off shell to a
 *                    sessionless or unauthorized caller), and the flag
 *                    is OFF.
 *   - `ok`         → caller renders the live module client.
 *
 * Auth-first ordering rationale: middleware/rbac.ts already gates
 * `/admin/*` at the edge, so the unauth case is normally unreachable in
 * production. Putting the session check ahead of the flag check makes
 * the demo-mode `x-dojo-demo-no-session: 1` test path align with the
 * production behaviour (no-session always lands on `/login`, never on
 * the flag-off shell), and closes a defense-in-depth gap.
 *
 * Concurrent fetch keeps the perf cost flat — flag read + session
 * validation run in parallel even though the unauth branch wins first.
 */
export async function resolveYr4PagePrelude(
  opts: Yr4PreludeOptions,
): Promise<Yr4PreludeResult | { kind: 'unauth' }> {
  const [enabled, user] = await Promise.all([
    isFlagEnabled(opts),
    currentSession(),
  ]);

  // 1. Authentication first — no session always wins (regardless of flag).
  if (!user) return { kind: 'unauth' };

  // 2. Authorization next — non-admin sees the forbidden EmptyState. We
  //    branch on role BEFORE the flag check so that a non-admin caller
  //    cannot probe whether a given module is enabled by reading which
  //    EmptyState renders.
  if (user.role !== 'admin') return { kind: 'forbidden' };

  // 3. Flag last — only authenticated admins ever see the flag-off shell.
  if (!enabled) return { kind: 'flag-off' };

  return { kind: 'ok', user };
}
