// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/active-model — set the per-user active-model cookie (server-set,
 * httpOnly so XSS cannot read or spoof it).
 * DELETE /api/active-model — clear the cookie (revert to admin/first-enabled
 * fallback).
 *
 * Active Model Switcher hardening (post-merge fold-in 2026-05-08):
 *   - Replaces the client-side `document.cookie` write path that the original
 *     Story D shipped. The provider now POSTs here on every change; the server
 *     attaches `Set-Cookie: ...; HttpOnly; SameSite=Lax; Secure (in prod)`.
 *   - Existing client-set cookies remain readable; once a user changes their
 *     selection through this endpoint the cookie becomes httpOnly and the
 *     browser silently ignores any subsequent `document.cookie` write attempt
 *     against the same name (the canonical browser-cookie rule).
 *   - Validation matches the syntactic gate in `validateSettingPair` for
 *     `active_model.default_id` (non-empty, ≤200 chars, no control chars).
 *     Existence + enabled checks are NOT done here — the resolver chain
 *     (Story B) re-validates at every inference call. Doing the check here
 *     would either duplicate logic or block the picker before the dropdown
 *     hydrates metrics.
 *
 * Auth: any authenticated user. NOT admin-only — every user owns their own
 * preference. Admin org default is a separate path (PATCH /api/admin/settings).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/route-guard';
import { checkRateLimit } from '@/lib/api-handler';
import { ACTIVE_MODEL_COOKIE_NAME } from '@/lib/llm/active-model-cookie-name';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const postBodySchema = z.object({
  id: z.string().min(1).max(200),
});

function rateLimitedResponse(retryAfterMs: number): NextResponse {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    {
      status: 429,
      headers: {
        ...RESPONSE_HEADERS,
        'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
      },
    },
  );
}

function buildCookieHeader(value: string | null): string {
  const parts = [
    `${ACTIVE_MODEL_COOKIE_NAME}=${value === null ? '' : encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${value === null ? 0 : COOKIE_MAX_AGE_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function isPlainAscii(value: string): boolean {
  return !/[\x00-\x1f\x7f]/.test(value);
}

export const POST = withAuth(
  async (request: NextRequest) => {
    const limit = await checkRateLimit(request, 'write');
    if (!limit.allowed) {
      return rateLimitedResponse(limit.resetMs);
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const parsed = postBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body — expected { id: string }' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const id = parsed.data.id.trim();
    if (id.length === 0 || !isPlainAscii(id)) {
      return NextResponse.json(
        { error: 'id must be non-empty ASCII without control characters' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const response = NextResponse.json(
      { id },
      { status: 200, headers: RESPONSE_HEADERS },
    );
    response.headers.append('Set-Cookie', buildCookieHeader(id));
    return response;
  },
);

export const DELETE = withAuth(
  async (request: NextRequest) => {
    const limit = await checkRateLimit(request, 'write');
    if (!limit.allowed) {
      return rateLimitedResponse(limit.resetMs);
    }

    const response = NextResponse.json(
      { cleared: true },
      { status: 200, headers: RESPONSE_HEADERS },
    );
    response.headers.append('Set-Cookie', buildCookieHeader(null));
    return response;
  },
);
