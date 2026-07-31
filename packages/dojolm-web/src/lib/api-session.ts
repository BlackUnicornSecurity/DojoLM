// SPDX-License-Identifier: Apache-2.0
/**
 * File: api-session.ts
 * Purpose: Session-user resolution helper for API routes that want to
 *          scope data per authenticated user without adopting the full
 *          `withAuth` RBAC wrapper. Mirrors the user-resolution order
 *          `withAuth` uses: session cookie first, then API key fallback.
 *
 * Story: WAVE3-PER-USER-SCOPE / ADR-0021.
 *
 * Routes behind `createApiHandler` already gate on auth; this helper
 * only exposes the resolved identity so handlers can filter / tag data
 * by `user.id`. Returns `null` only when the request reached the handler
 * via a path that did not attach an identity (which should not happen
 * on non-public routes — defensive null still useful for tests).
 *
 * Demo mode: `isDemoMode()` is called here so consumer routes do not
 * need to branch individually. That also means consumer routes do not
 * need an entry in `DEMO_ROUTE_REGISTRY` — the registry audits files
 * that literally call `isDemoMode()`, and the shared helper keeps that
 * contract centralised.
 */

import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME, getApiKeyRole } from '@/lib/auth/route-guard'
import { validateSession, type SessionUser } from '@/lib/auth/session'
import { isDemoMode, DEMO_USER } from '@/lib/demo'
import { API_KEY_USER_ID, isSafeUserIdSegment } from '@/lib/api-session-client'

export type { SessionUser }

// Re-exported from `api-session-client` (zero server deps) so existing
// server-side callers keep importing from `@/lib/api-session` unchanged.
// Client-side callers MUST import from `@/lib/api-session-client` directly
// to avoid pulling bcrypt + fs into the browser bundle.
export { API_KEY_USER_ID, isSafeUserIdSegment }

/**
 * Resolve the calling user. Async because `getApiKeyRole` does a
 * DB-first lookup as of YR.14.2. Returns null when neither a session
 * cookie nor a valid API key resolves an identity.
 */
export async function resolveSessionUser(request: NextRequest): Promise<SessionUser | null> {
  if (isDemoMode()) return DEMO_USER

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (token) {
    const user = validateSession(token)
    if (user !== null) return user
  }

  const apiKey = request.headers.get('x-api-key')
  if (apiKey) {
    const role = await getApiKeyRole(apiKey)
    if (role !== null) {
      return {
        id: API_KEY_USER_ID,
        username: 'api-key',
        email: null,
        role,
        displayName: 'API Key User',
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Per-user in-process mutex (+ optional filesystem mutex)
// ---------------------------------------------------------------------------
//
// Routes that do load-modify-write on a per-user file (e.g., Guard
// Forge-Defense `applied/<userId>.json`) can race under concurrent POSTs
// from the same user (double-click across tabs). This mutex serialises
// such handlers per namespace+userId within a single Node process.
//
// ADR-0040: when `TPI_FILE_LOCK=1`, the in-process queue is wrapped
// with a filesystem-level lock (`lib/user-lock-fs.ts`) so
// horizontally-scaled deployments (multiple Node processes against
// the same data dir) also serialise per user. Default is in-process
// only — sufficient for single-container deployments (the
// production and dev/QA hosts today).
import { withFsUserLock, isFsLockingEnabled } from '@/lib/user-lock-fs'

const userLocks = new Map<string, Promise<unknown>>()

async function withInProcessLock<T>(
  namespace: string,
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = `${namespace}:${userId}`
  const previous = userLocks.get(key) ?? Promise.resolve()
  // Swallow prior errors so a failing caller does not block the queue.
  const chained = previous.then(fn, fn)
  userLocks.set(key, chained)
  try {
    return await chained
  } finally {
    // Only evict if we're still the tail — later callers may have
    // already chained onto us.
    if (userLocks.get(key) === chained) {
      userLocks.delete(key)
    }
  }
}

export async function withUserLock<T>(
  namespace: string,
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  // Always serialise within the process (cheap, prevents same-tab
  // double-click races even when fs locking is on). When fs locking
  // is enabled, the inner closure additionally takes a cross-process
  // file lock before running the user-supplied function.
  if (isFsLockingEnabled()) {
    return withInProcessLock(namespace, userId, () =>
      withFsUserLock(namespace, userId, fn),
    )
  }
  return withInProcessLock(namespace, userId, fn)
}
