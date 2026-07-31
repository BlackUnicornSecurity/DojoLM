// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/admin/atemi/probe — Epic 9 S9.2.
 *
 * Fleet-wide probe trigger. The endpoint composes the Gap 3
 * `createProbeRunner` factory over every `active` tuple in the ToS
 * attestation registry and returns a synchronous summary.
 *
 * Shape:
 *   POST {}                     — fleet-wide pass (no input, no filter)
 *   Response 200:
 *     { started, skipped, errors, results: ProbeTupleResult[] }
 *
 * Refusal matrix (spec-mandated):
 *   ATEMI_ENABLED=false          -> 404 (parity with GET /api/admin/atemi)
 *   KILL_ATEMI kill-switch armed -> 403
 *   Non-admin session            -> 401 / 403 via withAuth
 *   Malformed body               -> 400
 *
 * R-T1 redaction:
 *   Per-tuple response carries {vendor, targetId, status, probeStatus,
 *   elapsedMs, reason?} only. No raw seed, no driver output text, no
 *   evidenceHash crosses this boundary. The orchestrator strips those
 *   before returning — the route never reads them.
 *
 * Audit + telemetry:
 *   One aggregate `scanExecuted` entry lands per request with the
 *   operator id + scanType='atemi.probe.fleet' + findings=started +
 *   durationMs=elapsed. No per-tuple telemetry is emitted here; that
 *   surface is owned by the bu-tpi probe-runner's driver integration
 *   (future PR once the driver is wired).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/route-guard';
import { killSwitchRegistry } from 'bu-tpi/flags';
import { auditLog } from '@/lib/audit-logger';
import { getTosRegistry, getAuthVault, isAtemiEnabled } from '@/lib/atemi/registry';
import { getAtemiDriver } from '@/lib/atemi/driver';
import { getBudgetLedger } from '@/lib/budget';
import { enforceGuardMode } from '@/lib/guard-mode';
import {
  runFleetProbe,
  type ProbeFleetSummary,
} from '@/lib/atemi/probe-orchestrator';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

// Accept `{}` today. Future fields (vendor filter, dry-run toggle) can
// land as optional keys without a breaking change.
const bodySchema = z
  .object({})
  .strict()
  .optional();

function notEnabled(): NextResponse {
  return NextResponse.json(
    { error: 'ATEMI feature flag disabled' },
    { status: 404, headers: RESPONSE_HEADERS },
  );
}

function killSwitchRefusal(): NextResponse {
  return NextResponse.json(
    {
      error: 'KILL_ATEMI kill-switch is active — probe execution refused',
      code: 'ATEMI.KILLSWITCH.ACTIVE',
    },
    { status: 403, headers: RESPONSE_HEADERS },
  );
}

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    if (!isAtemiEnabled()) return notEnabled();
    if (killSwitchRegistry.isActive('KILL_ATEMI')) return killSwitchRefusal();

    // YR.16 / G-066 — server-side guard-mode enforcement. The probe
    // injects payloads into target models (inbound direction); when the
    // active mode is 'samurai' or 'hattori', the request is rejected
    // before any work or budget consumption. Composes with the kill-
    // switch + ATEMI feature-flag gates above — defense-in-depth.
    const guardBlock = await enforceGuardMode('inbound', request, {
      operatorId: user?.id,
    });
    if (guardBlock !== null) return guardBlock;

    // Body parsing: accept empty-body POST, `{}`, or `null`. Reject
    // anything with unknown keys (strict schema catches typos that
    // would otherwise silently pass the fleet-wide default).
    const text = await request.text();
    if (text.length > 0) {
      try {
        const raw = JSON.parse(text);
        bodySchema.parse(raw === null ? undefined : raw);
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
    }

    // Review HIGH-1: every admin POST that writes to the audit log MUST
    // carry a trustworthy operator id. `withAuth({ role: 'admin' })`
    // already guarantees `user` is non-null, but `user.id` is the
    // actual attribution — we refuse rather than fall back to a
    // sentinel that would quietly poison forensics.
    const operatorId = user?.id;
    if (!operatorId) {
      return NextResponse.json(
        { error: 'session identity missing' },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    const registry = getTosRegistry();
    const vault = getAuthVault();
    // Shared ledger so admin-configured per-model / app-wide caps bind here.
    const ledger = await getBudgetLedger();
    const driver = getAtemiDriver();

    const startedAt = Date.now();
    let summary: ProbeFleetSummary;
    try {
      summary = await runFleetProbe({
        registry,
        vault,
        ledger,
        ...(driver && { driver }),
        operatorId,
        killSwitch: () => killSwitchRegistry.isActive('KILL_ATEMI'),
      });
    } catch (err) {
      // Review HIGH-2: never forward an exception message to the
      // client — it could leak internal state (file paths, registry
      // keys, vault internals). Log the detail server-side, return a
      // fixed sentinel.
      console.error('[atemi/probe] orchestrator crashed', err);
      return NextResponse.json(
        { error: 'orchestrator-failed' },
        { status: 500, headers: RESPONSE_HEADERS },
      );
    }
    const durationMs = Date.now() - startedAt;

    // Aggregate audit entry. R-T1: no payload content, no seed text,
    // no driver output. Just the count + duration + operator id.
    await auditLog.scanExecuted({
      endpoint: '/api/admin/atemi/probe',
      user: operatorId,
      scanType: 'atemi.probe.fleet',
      findings: summary.started,
      durationMs,
    });

    return NextResponse.json(
      {
        ok: true,
        started: summary.started,
        skipped: summary.skipped,
        errors: summary.errors,
        results: summary.results,
        durationMs,
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
