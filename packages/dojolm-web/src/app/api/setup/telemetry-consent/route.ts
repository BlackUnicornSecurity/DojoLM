// SPDX-License-Identifier: Apache-2.0
/**
 * File: /api/setup/telemetry-consent/route.ts
 * Purpose: Records the operator's acknowledgement of the telemetry-disclosure
 *          step in the first-boot wizard (E6.S3 / F-8-006).
 *
 * Story: First-boot Setup wizard — Data Sharing & Telemetry step.
 *
 * Legal context (revised per Decision Log D-12, 2026-06-16 — telemetry is
 * legitimate-interest with a free opt-out, NOT mandatory/consent; see
 * project_business_model.md and /legal/privacy §5):
 *   - GDPR Art. 13/14 — this row is the time-stamped record that the
 *     transparency disclosure was shown and acknowledged (it is not a
 *     record of consent-to-mandatory-processing).
 *   - GDPR Art. 6(1)(f) / Art. 21 — the per-install envelope rides
 *     legitimate interests with a free right to object.
 *   - ePrivacy Art. 5(3) / ICO PECR — strictly-necessary storage only.
 *   - CCPA 1798.135 — opt-out / disclosure parity for US operators.
 *   - The `acknowledged_telemetry_at` persistence path is unchanged.
 *
 * Endpoint shape:
 *   POST { acknowledged: true, buildChannel: 'cloud' | 'self-host' }
 *   →    201 { ok: true, acknowledged_telemetry_at: string }
 *
 * Auth posture:
 *   - Authenticated session required (admin role enforced via withAuth).
 *   - The route is reachable BEFORE the /admin/* gate flips, because the
 *     gate keys off this very endpoint's write. The session itself was
 *     established by `/api/setup/admin` (auto-login) so every caller here
 *     is already an authenticated admin.
 *   - Server re-validates the build channel against the env var the
 *     server actually shipped — a tampered client cannot persist a
 *     different channel than the one the operator was shown.
 */

import { NextResponse } from 'next/server';
import {
  isDemoMode,
  DEMO_USER,
} from '@/lib/demo';
import { withAuth } from '@/lib/auth/route-guard';
import { isBuildChannel, type BuildChannel } from '@/lib/db/types';
import { getBuildChannel } from '@/lib/build-channel';

interface ConsentRequestBody {
  readonly acknowledged?: unknown;
  readonly buildChannel?: unknown;
}

export const POST = withAuth(
  async (req, { user }) => {
    let body: ConsentRequestBody;
    try {
      body = (await req.json()) as ConsentRequestBody;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    if (body.acknowledged !== true) {
      return NextResponse.json(
        { error: 'Acknowledgement is required to proceed' },
        { status: 400 },
      );
    }

    if (!isBuildChannel(body.buildChannel)) {
      return NextResponse.json(
        { error: 'buildChannel must be one of {cloud, self-host}' },
        { status: 400 },
      );
    }

    // Server-side cross-check: the channel the operator clicked through must
    // match the channel the server actually shipped. A mismatch means either
    // a tampered client or a mid-session env-var flip — fail closed in both
    // cases so the persisted ack always reflects what the operator saw.
    const serverChannel: BuildChannel = getBuildChannel();
    if (body.buildChannel !== serverChannel) {
      return NextResponse.json(
        { error: 'buildChannel does not match deployment channel' },
        { status: 400 },
      );
    }

    // Demo mode: simulate ack without DB write.
    if (isDemoMode()) {
      return NextResponse.json(
        {
          ok: true,
          acknowledged_telemetry_at: new Date().toISOString(),
          acknowledged_telemetry_by_user_id: DEMO_USER.id,
          build_channel_at_ack: serverChannel,
        },
        { status: 201 },
      );
    }

    try {
      const { setupStateRepo } = await import(
        '@/lib/db/repositories/setup-state.repository'
      );
      const snapshot = await setupStateRepo.acknowledgeTelemetry(
        user.id,
        serverChannel,
      );
      return NextResponse.json(
        {
          ok: true,
          acknowledged_telemetry_at: snapshot.acknowledged_telemetry_at,
          acknowledged_telemetry_by_user_id:
            snapshot.acknowledged_telemetry_by_user_id,
          build_channel_at_ack: snapshot.build_channel_at_ack,
        },
        { status: 201 },
      );
    } catch (err) {
      console.error('[setup/telemetry-consent] failed to record ack:', err);
      return NextResponse.json(
        { error: 'Failed to record acknowledgement' },
        { status: 500 },
      );
    }
  },
  { role: 'admin' },
);
