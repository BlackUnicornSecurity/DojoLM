// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/admin/webauthn/register/options — start the registration
 * ceremony. Returns the PublicKeyCredentialCreationOptions JSON the
 * browser feeds into `navigator.credentials.create({publicKey: ...})`.
 *
 * E1-A-RB-9 (Master Plan v1.0 §4.1). Flag-gated by
 * `WEBAUTHN_SIGNOFF_ENABLED=true`; defaults OFF so Stage 1 deploys can
 * keep the phrase ceremony while operators register their platform
 * authenticators. The companion `WEBAUTHN_SIGNOFF_REQUIRED` flag
 * (default OFF) gates the sign-off route's mandatory enforcement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { checkRateLimit } from '@/lib/api-handler';
import { buildRegistrationOptions } from '@/lib/auth/webauthn';
import { getWebAuthnStore } from '@/lib/auth/webauthn-fs-store';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

function isEnabled(): boolean {
  return process.env.WEBAUTHN_SIGNOFF_ENABLED === 'true';
}

const protectedPost = withAuth(
  async (request: NextRequest, ctx) => {
    const rate = await checkRateLimit(request, 'write');
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'too many requests', code: 'rate-limited' },
        { status: 429, headers: RESPONSE_HEADERS },
      );
    }
    try {
      const options = await buildRegistrationOptions({
        userId: ctx.user.id,
        username: ctx.user.username,
        store: getWebAuthnStore(),
      });
      return NextResponse.json(options, { status: 200, headers: RESPONSE_HEADERS });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[webauthn/register/options] error', {
        name: err instanceof Error ? err.name : undefined,
      });
      return NextResponse.json(
        { error: 'internal error', code: 'internal-error' },
        { status: 500, headers: RESPONSE_HEADERS },
      );
    }
  },
  { role: 'admin' },
);

export async function POST(request: NextRequest, context: { params: Promise<unknown> }): Promise<Response> {
  if (!isEnabled()) {
    return NextResponse.json(
      { error: 'webauthn registration is not enabled', code: 'service-not-configured' },
      { status: 503, headers: RESPONSE_HEADERS },
    );
  }
  return protectedPost(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
}
