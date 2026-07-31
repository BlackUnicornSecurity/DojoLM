// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/account/password — change the caller's own password.
 *
 * EPIC-D (F-QA-024) — OSS single-operator self-management. Distinct
 * from the EE `/api/admin/users/[id]` mutation surface so the classifier
 * cannot accidentally lift EE RBAC code into the OSS build.
 *
 * Flow:
 *   1. Caller supplies `currentPassword` + `newPassword` + `confirmPassword`.
 *   2. Server re-verifies the current password against the stored hash —
 *      returns 401 on mismatch. NEVER reveals whether the user exists.
 *   3. The new password is validated for length (≥12) and complexity
 *      (≥3 of {upper, lower, digit, symbol}) and that it differs from
 *      the current one. Returns 400 with a clear, generic message.
 *   4. On success, every OTHER session for this user is revoked so a
 *      stolen cookie cannot survive a password rotation. The caller's
 *      own session is preserved by passing the cookie's token hash to
 *      a scoped revoke helper.
 *
 * Auth: any signed-in user; CSRF enforced by withAuth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, SESSION_COOKIE_NAME } from '@/lib/auth/route-guard';
import { userRepo } from '@/lib/db/repositories/user.repository';
import { verifyPassword, hashSessionToken } from '@/lib/auth/auth';
import { revokeOtherSessionsForUser } from '@/lib/auth/session';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

const MIN_LENGTH = 12;
const MAX_LENGTH = 256;

interface ChangePasswordBody {
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function classCount(s: string): number {
  let n = 0;
  if (/[a-z]/.test(s)) n++;
  if (/[A-Z]/.test(s)) n++;
  if (/[0-9]/.test(s)) n++;
  if (/[^A-Za-z0-9]/.test(s)) n++;
  return n;
}

function extractRawTokenFromCookie(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split('.');
  if (parts.length !== 3) return null;
  const raw = parts[0];
  return /^[0-9a-f]{64}$/i.test(raw) ? raw : null;
}

export const POST = withAuth(async (req: NextRequest, { user }) => {
  let body: ChangePasswordBody;
  try {
    body = (await req.json()) as ChangePasswordBody;
  } catch {
    return NextResponse.json(
      { error: 'invalid JSON body' },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const { currentPassword, newPassword, confirmPassword } = body;
  if (!isString(currentPassword) || !isString(newPassword) || !isString(confirmPassword)) {
    return NextResponse.json(
      { error: 'currentPassword, newPassword, and confirmPassword are required strings' },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: 'newPassword and confirmPassword do not match' },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }
  if (newPassword.length < MIN_LENGTH || newPassword.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: `newPassword must be ${MIN_LENGTH}–${MAX_LENGTH} characters` },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }
  if (classCount(newPassword) < 3) {
    return NextResponse.json(
      { error: 'newPassword must include at least 3 of: uppercase, lowercase, digit, symbol' },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }
  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: 'newPassword must differ from currentPassword' },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const fullUser = userRepo.findByUsername(user.username);
  if (!fullUser) {
    return NextResponse.json(
      { error: 'account record not found' },
      { status: 404, headers: RESPONSE_HEADERS },
    );
  }
  const ok = await verifyPassword(currentPassword, fullUser.password_hash);
  if (!ok) {
    return NextResponse.json(
      { error: 'currentPassword is incorrect' },
      { status: 401, headers: RESPONSE_HEADERS },
    );
  }

  await userRepo.updatePassword(user.id, newPassword);

  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const rawToken = extractRawTokenFromCookie(cookieValue);
  let revoked = 0;
  if (rawToken) {
    revoked = revokeOtherSessionsForUser(user.id, hashSessionToken(rawToken));
  }

  return NextResponse.json(
    { ok: true, otherSessionsRevoked: revoked },
    { status: 200, headers: RESPONSE_HEADERS },
  );
});
