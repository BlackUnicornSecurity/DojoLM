// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/admin/kill-switch — trigger a kill signal (Section 0.2, R-F2).
 *
 * Fires the named signal via the in-process KillSwitchRegistry.
 * The registry fan-outs to all registered handlers within 5s (R-F2).
 *
 * Body: { signal: KillSignal, reason: KillReason, note?: string }
 * Auth: admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/route-guard';
import {
  KILL_SIGNALS,
  killSwitchRegistry,
  type KillReason,
} from 'bu-tpi/flags';
import { auditLog } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/api-handler';

const KILL_REASONS = [
  'manual-admin',
  'two-person-approval-revoke',
  'auto-anomaly',
  'drill',
] as const satisfies readonly KillReason[];

const killSignalSet = new Set<string>(KILL_SIGNALS);

const bodySchema = z.object({
  signal: z.string().refine((s) => killSignalSet.has(s), {
    message: `signal must be one of: ${KILL_SIGNALS.join(', ')}`,
  }),
  reason: z.enum(KILL_REASONS),
  note: z.string().optional(),
});

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    let body: z.infer<typeof bodySchema>;
    try {
      const raw = await request.json() as unknown;
      body = bodySchema.parse(raw);
    } catch (err) {
      const message = err instanceof z.ZodError
        ? err.issues.map((e) => e.message).join('; ')
        : 'Invalid request body';
      return NextResponse.json(
        { error: message },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const { signal, reason, note } = body;
    const actor = user?.id ?? 'unknown';
    const firedAt = new Date();

    await killSwitchRegistry.fire({
      signal: signal as typeof KILL_SIGNALS[number],
      reason,
      firedAt,
      firedBy: actor,
    });

    // YR.13.4 — emit the typed `KILL_SWITCH_FIRE` audit row so a query on
    // `event=KILL_SWITCH_FIRE` covers BOTH the direct-fire path and the
    // two-person-approval path. The actor context is sourced from the
    // session user + request headers, mirroring the YR.13.3 handler.
    await auditLog.killSwitchFire({
      operatorId: actor,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? '',
      signal,
      reason,
    });

    return NextResponse.json(
      {
        ok: true,
        signal,
        reason,
        ...(note !== undefined && { note }),
        firedBy: actor,
        firedAt: firedAt.toISOString(),
      },
      { status: 200, headers: RESPONSE_HEADERS },
    );
  },
  { role: 'admin' },
);

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST, OPTIONS' },
  });
}
