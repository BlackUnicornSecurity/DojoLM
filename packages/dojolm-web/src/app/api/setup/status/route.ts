// SPDX-License-Identifier: Apache-2.0
/**
 * File: /api/setup/status/route.ts
 * Purpose: Returns whether initial setup is needed (no users in DB),
 *          plus telemetry-consent ack state for the wizard flow
 *          (E6.S3 / F-8-006).
 * Story: Setup Wizard
 *
 * Security (F-5, 2026-04-16): Once setup is complete (users exist), this
 * endpoint returns 401 to unauthenticated callers. Only the login page
 * and authenticated sessions may check setup status post-setup — this
 * prevents unauthenticated recon from learning whether the instance has
 * been provisioned.
 *
 * Response shape (200):
 *   {
 *     needsSetup: boolean,                // user-creation step pending
 *     telemetryAcknowledged: boolean,     // wizard step 5 ack present
 *   }
 *
 * The `telemetryAcknowledged` field lets the /setup page distinguish
 * "already-completed wizard" (redirect to /login) from "wizard mid-flow
 * with telemetry-consent step still pending" (render wizard for the
 * authenticated admin).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';

export async function GET(req: NextRequest) {
  // Demo mode: always show setup wizard on page load
  if (isDemoMode()) {
    return NextResponse.json({ needsSetup: true, telemetryAcknowledged: false });
  }

  try {
    const { userRepo } = await import('@/lib/db/repositories/user.repository');
    const count = userRepo.countUsers();

    // Setup incomplete (no users) — always allow so the setup wizard can render
    if (count === 0) {
      return NextResponse.json({
        needsSetup: true,
        telemetryAcknowledged: false,
      });
    }

    // Setup complete — gate behind auth to prevent unauthenticated recon (F-5)
    const sessionCookie = req.cookies.get('tpi_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { validateSession } = await import('@/lib/auth/session');
    const session = validateSession(sessionCookie);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Authenticated callers also see the telemetry-ack state so the
    // /setup page can distinguish "wizard fully done" from "wizard
    // mid-flow with telemetry step pending" (E6.S3 / F-8-006).
    let telemetryAcknowledged = true;
    try {
      const { setupStateRepo } = await import(
        '@/lib/db/repositories/setup-state.repository'
      );
      telemetryAcknowledged = setupStateRepo.isTelemetryAcknowledged();
    } catch {
      // Fail-open on read error — the /admin/* layout gate is the
      // authoritative enforcement point, so a status-route blip cannot
      // grant unauthorised access. We do NOT poison the response with
      // a 500 because that would also lock out /login.
      telemetryAcknowledged = true;
    }

    return NextResponse.json({
      needsSetup: false,
      telemetryAcknowledged,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}
