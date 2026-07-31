// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/admin/webauthn/register/verify — finish the registration
 * ceremony. Consumes the pending challenge, verifies the attestation
 * response, persists the new credential to the WebAuthn store, emits
 * the `WEBAUTHN_REGISTER` audit event.
 *
 * E1-A-RB-9 (Master Plan v1.0 §4.1).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { checkRateLimit } from '@/lib/api-handler';
import { auditLog } from '@/lib/audit-logger';
import { verifyRegistration } from '@/lib/auth/webauthn';
import { getWebAuthnStore } from '@/lib/auth/webauthn-fs-store';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

function isEnabled(): boolean {
  return process.env.WEBAUTHN_SIGNOFF_ENABLED === 'true';
}

function isValidResponse(value: unknown): value is RegistrationResponseJSON {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.rawId === 'string' &&
    typeof v.type === 'string' &&
    typeof v.response === 'object' &&
    v.response !== null
  );
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'request body must be JSON', code: 'invalid-body' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }
    if (!isValidResponse(body)) {
      return NextResponse.json(
        { error: 'registration response payload invalid', code: 'invalid-payload' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }
    try {
      const result = await verifyRegistration({
        userId: ctx.user.id,
        response: body,
        store: getWebAuthnStore(),
      });
      void auditLog.webauthnRegister({
        userId: ctx.user.id,
        credentialId: result.credentialId,
        authenticatorGUID: result.authenticatorGUID,
      });
      return NextResponse.json(
        {
          ok: true,
          credentialId: result.credentialId,
          authenticatorGUID: result.authenticatorGUID,
        },
        { status: 200, headers: RESPONSE_HEADERS },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      const code = msg.startsWith('WEBAUTHN_') ? msg.toLowerCase().replace(/_/g, '-') : 'webauthn-failure';
      // eslint-disable-next-line no-console
      console.error('[webauthn/register/verify] error', { code });
      return NextResponse.json(
        { error: 'registration failed', code },
        { status: 400, headers: RESPONSE_HEADERS },
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
