// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/admin/kill-switch/status — list currently-armed kill signals.
 *
 * Used by the TopBar status badge to render "N armed" (or hide when no
 * signals are armed). Admin-only.
 *
 * Response: { activeSignals: KillSignal[] }
 *
 * Security:
 *   - Admin-only (`withAuth({ role: 'admin' })`) — enumerating armed
 *     signals is operationally sensitive (R-T1 / YR.13.4 prompt §security).
 *     Unauthenticated callers get the same auth handshake as any other
 *     /api/admin/* surface.
 *   - Cache-Control: no-store — the badge polls every 30s and must see
 *     fresh state; intermediate caches MUST NOT serve stale 200s.
 *   - X-Content-Type-Options: nosniff.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { KILL_SIGNALS, killSwitchRegistry } from 'bu-tpi/flags';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

export const GET = withAuth(
  async () => {
    const activeSignals = (KILL_SIGNALS as readonly string[]).filter((s) =>
      killSwitchRegistry.isActive(s as typeof KILL_SIGNALS[number]),
    );
    return NextResponse.json(
      { activeSignals },
      { status: 200, headers: RESPONSE_HEADERS },
    );
  },
  { role: 'admin' },
);

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, OPTIONS' },
  });
}
