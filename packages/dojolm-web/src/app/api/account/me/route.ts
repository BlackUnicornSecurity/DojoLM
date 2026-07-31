// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/account/me — return the caller's own user record.
 *
 * EPIC-D (F-QA-024) — OSS single-operator self-management surface. The
 * existing `/api/admin/users` family is BUSL/EE for multi-user RBAC; this
 * route is the Apache OSS equivalent scoped to the caller themselves.
 * Operator role-changes, disable, delete, and list-others stay in EE.
 *
 * Auth: any signed-in user (no role gate). CSRF skipped (GET).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { userRepo } from '@/lib/db/repositories/user.repository';
import { isDemoMode } from '@/lib/demo';
import { demoAccountMeGet } from '@/lib/demo/mock-api-handlers';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  // Demo runtime: withAuth passes a synthetic admin with no DB row —
  // serve the demo operator record instead of a dishonest 404.
  if (isDemoMode()) return demoAccountMeGet();
  const row = userRepo.findByIdSafe(user.id);
  if (!row) {
    return NextResponse.json(
      { error: 'account record not found' },
      { status: 404, headers: RESPONSE_HEADERS },
    );
  }
  return NextResponse.json(
    {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      displayName: row.display_name,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
    },
    { status: 200, headers: RESPONSE_HEADERS },
  );
});
