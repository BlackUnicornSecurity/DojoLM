// SPDX-License-Identifier: Apache-2.0
/**
 * /api/admin/atemi — Gap 3 v1-deferred: ToS-attestation admin API.
 *
 * Flag-gated by `ATEMI_ENABLED=true`. Admin-only.
 *
 * Supported requests:
 *   GET          -> list current TosRecords + known vault targets.
 *   POST register  { vendor, targetId }
 *   POST attest    { vendor, targetId, operatorId, signature }
 *   POST activate  { vendor, targetId }
 *   POST revoke    { vendor, targetId }
 *
 * All user input is validated by zod before it reaches the bu-tpi
 * registry. The bu-tpi layer re-validates defensively.
 *
 * Security:
 * - `targetId` / `operatorId` regex mirror bu-tpi rules (filename-safe).
 * - Bidi overrides + zero-width chars rejected (audit-lesson #182, #188).
 * - Reserved prototype keys rejected (audit-lesson #184).
 * - No raw payload content is accepted (R-T1).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/route-guard';
import {
  getTosRegistry,
  isAtemiEnabled,
} from '@/lib/atemi/registry';
import { TosStateError } from 'bu-tpi/atemi';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

const BIDI_ZWS_RE = /[\u200B-\u200F\u2028-\u202F\u2066-\u2069\uFEFF]/;
const RESERVED_IDS = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'hasOwnProperty',
  'toString',
  'valueOf',
]);

const vendorSchema = z.enum([
  'claude-chat',
  'claude-memory',
  'claude-artifacts',
  'chatgpt',
  'chatgpt-memory',
  'chatgpt-artifacts',
  'gemini',
  'gemini-memory',
]);

const targetIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/, 'targetId must be filename-safe')
  .refine((v) => !BIDI_ZWS_RE.test(v), {
    message: 'targetId must not contain bidi/zero-width chars',
  })
  .refine((v) => !RESERVED_IDS.has(v), {
    message: 'targetId is reserved',
  });

const operatorIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._@:-]{0,127}$/, 'operatorId invalid')
  .refine((v) => !BIDI_ZWS_RE.test(v))
  .refine((v) => !RESERVED_IDS.has(v));

const signatureSchema = z
  .string()
  .min(1)
  .max(1024)
  .refine((v) => !BIDI_ZWS_RE.test(v), {
    message: 'signature must not contain bidi/zero-width chars',
  });

const registerActionSchema = z.object({
  action: z.literal('register'),
  vendor: vendorSchema,
  targetId: targetIdSchema,
});

const attestActionSchema = z.object({
  action: z.literal('attest'),
  vendor: vendorSchema,
  targetId: targetIdSchema,
  operatorId: operatorIdSchema,
  signature: signatureSchema,
});

const activateActionSchema = z.object({
  action: z.literal('activate'),
  vendor: vendorSchema,
  targetId: targetIdSchema,
});

const revokeActionSchema = z.object({
  action: z.literal('revoke'),
  vendor: vendorSchema,
  targetId: targetIdSchema,
});

const postBodySchema = z.discriminatedUnion('action', [
  registerActionSchema,
  attestActionSchema,
  activateActionSchema,
  revokeActionSchema,
]);

function notEnabled(): NextResponse {
  return NextResponse.json(
    { error: 'ATEMI feature flag disabled' },
    { status: 404, headers: RESPONSE_HEADERS },
  );
}

export const GET = withAuth(
  async () => {
    if (!isAtemiEnabled()) return notEnabled();
    const registry = getTosRegistry();
    const records = registry.list();
    return NextResponse.json(
      { records },
      { status: 200, headers: RESPONSE_HEADERS },
    );
  },
  { role: 'admin' },
);

export const POST = withAuth(
  async (request: NextRequest) => {
    if (!isAtemiEnabled()) return notEnabled();

    let body: z.infer<typeof postBodySchema>;
    try {
      const raw = (await request.json()) as unknown;
      body = postBodySchema.parse(raw);
    } catch (err) {
      const message =
        err instanceof z.ZodError
          ? err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
          : 'Invalid request body';
      return NextResponse.json(
        { error: message },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const registry = getTosRegistry();

    try {
      if (body.action === 'register') {
        const record = registry.register(body.vendor, body.targetId);
        return NextResponse.json(
          { ok: true, record },
          { status: 201, headers: RESPONSE_HEADERS },
        );
      }
      if (body.action === 'attest') {
        const record = registry.attest({
          vendor: body.vendor,
          targetId: body.targetId,
          operatorId: body.operatorId,
          signature: body.signature,
        });
        return NextResponse.json(
          { ok: true, record },
          { status: 200, headers: RESPONSE_HEADERS },
        );
      }
      if (body.action === 'activate') {
        const record = registry.activate({
          vendor: body.vendor,
          targetId: body.targetId,
        });
        return NextResponse.json(
          { ok: true, record },
          { status: 200, headers: RESPONSE_HEADERS },
        );
      }
      // revoke — narrow union
      if (body.action !== 'revoke') {
        return NextResponse.json(
          { error: 'unsupported action' },
          { status: 400, headers: RESPONSE_HEADERS },
        );
      }
      registry.revoke(body.vendor, body.targetId);
      return NextResponse.json(
        { ok: true },
        { status: 200, headers: RESPONSE_HEADERS },
      );
    } catch (err) {
      if (err instanceof TosStateError) {
        return NextResponse.json(
          { error: err.message },
          { status: 409, headers: RESPONSE_HEADERS },
        );
      }
      const message = err instanceof Error ? err.message : 'internal error';
      return NextResponse.json(
        { error: message },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }
  },
  { role: 'admin' },
);

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, POST, OPTIONS' },
  });
}
