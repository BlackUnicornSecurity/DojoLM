// SPDX-License-Identifier: Apache-2.0
/**
 * GET    /api/account/sessions — list the caller's own active sessions.
 * DELETE /api/account/sessions — revoke one session by id, or all-others.
 *
 * EPIC-D (F-QA-024) — OSS single-operator session-management surface.
 * Mirrors the /admin/account UI which lists tokens and lets the operator
 * revoke a lost-laptop session without dropping into shell.
 *
 * Auth: any signed-in user; CSRF enforced by withAuth (DELETE).
 *
 * Body for DELETE:
 *   { "sessionId": "<uuid>" }                       — revoke one session.
 *   { "all": true }                                 — revoke every OTHER
 *                                                     session for this user
 *                                                     (current preserved).
 *
 * Error invariants:
 *   - Unknown id OR id owned by another user → 404. Never 403, so a
 *     caller cannot enumerate another operator's session ids.
 *   - Attempting to revoke the current session by id → 409 (caller must
 *     use the logout endpoint).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, SESSION_COOKIE_NAME } from '@/lib/auth/route-guard';
import { isDemoMode } from '@/lib/demo';
import { demoAccountSessionsGet } from '@/lib/demo/mock-api-handlers';
import { hashSessionToken } from '@/lib/auth/auth';
import {
  listSessionsForUser,
  revokeSessionByIdForUser,
  revokeOtherSessionsForUser,
} from '@/lib/auth/session';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

function extractRawTokenFromCookie(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split('.');
  if (parts.length !== 3) return null;
  const raw = parts[0];
  return /^[0-9a-f]{64}$/i.test(raw) ? raw : null;
}

function currentTokenHash(req: NextRequest): string | null {
  const raw = extractRawTokenFromCookie(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  return raw ? hashSessionToken(raw) : null;
}

export const GET = withAuth(async (req: NextRequest, { user }) => {
  // Demo runtime: the synthetic admin owns no session rows — serve the
  // single honest demo session (revokes fall through to the real DB,
  // which no-ops for the synthetic user).
  if (isDemoMode()) return demoAccountSessionsGet();
  const sessions = listSessionsForUser(user.id, currentTokenHash(req));
  return NextResponse.json(
    { sessions },
    { status: 200, headers: RESPONSE_HEADERS },
  );
});

interface DeleteBody {
  sessionId?: unknown;
  all?: unknown;
}

export const DELETE = withAuth(async (req: NextRequest, { user }) => {
  let body: DeleteBody;
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    return NextResponse.json(
      { error: 'invalid JSON body' },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const currentHash = currentTokenHash(req);

  if (body.all === true) {
    if (!currentHash) {
      return NextResponse.json(
        { error: 'revoke-all-others requires a cookie-borne session' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }
    const revoked = revokeOtherSessionsForUser(user.id, currentHash);
    return NextResponse.json(
      { ok: true, revoked },
      { status: 200, headers: RESPONSE_HEADERS },
    );
  }

  if (typeof body.sessionId !== 'string' || body.sessionId.length === 0) {
    return NextResponse.json(
      { error: 'sessionId (string) or all=true required' },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  if (currentHash !== null) {
    const all = listSessionsForUser(user.id, currentHash);
    const target = all.find((s) => s.id === body.sessionId);
    if (target?.current) {
      return NextResponse.json(
        { error: 'cannot revoke the current session — use /api/auth/logout' },
        { status: 409, headers: RESPONSE_HEADERS },
      );
    }
  }

  const changes = revokeSessionByIdForUser(body.sessionId, user.id);
  if (changes === 0) {
    return NextResponse.json(
      { error: 'session not found' },
      { status: 404, headers: RESPONSE_HEADERS },
    );
  }
  return NextResponse.json(
    { ok: true, revoked: 1 },
    { status: 200, headers: RESPONSE_HEADERS },
  );
});
