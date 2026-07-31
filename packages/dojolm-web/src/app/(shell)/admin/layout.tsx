// SPDX-License-Identifier: Apache-2.0
/**
 * /admin layout — server-side gate for the telemetry-consent ack
 * (E6.S3 / F-8-006).
 *
 * Layered enforcement:
 *   - `proxy.ts` → `rbacMiddleware` already redirects unauthenticated /
 *     non-admin sessions at the Edge before this layout boots. That gate
 *     is role-only — it runs without DB access.
 *   - This layout adds a DB-backed check on top: even an authenticated
 *     admin lands back on `/setup` when the singleton `setup_state` row
 *     has `acknowledged_telemetry_at IS NULL`. The Edge runtime cannot
 *     read SQLite, so the check has to live in a Node-runtime server
 *     component, which is exactly what an `app/(shell)/admin/layout.tsx`
 *     gives us.
 *
 * Demo mode bypass: the demo build runs without a real DB and renders
 * the wizard on every load by design. The gate would otherwise pin
 * demo users on `/setup` forever, so we short-circuit here.
 *
 * The redirect appends `?reason=telemetry-consent-required` so the
 * setup page can render an inline banner explaining why the operator
 * landed back on the wizard. This is the WCAG 3.3.2 (Labels or
 * Instructions) signal — the user gets a plain-language explanation,
 * not a silent redirect.
 *
 * DEFERRED-BEHAVIOURAL (post-launch; NOT a counsel/legal blocker) — F-QA-018:
 * Decision Log D-12 (2026-06-16) holds that the admin console must NOT be gated
 * on a telemetry acknowledgement (telemetry is legitimate-interest with a free
 * opt-out, not mandatory). Removing this DB-backed gate is a deliberate, separate
 * behavioural change (it also touches the wizard resume flow and the admin-gate
 * tests); the founder sign-off (2026-07-05) approved the current text-only state
 * and left the gate removal as a tracked post-launch product item.
 * The acknowledgement record itself (`acknowledged_telemetry_at`) is
 * retained as the Art. 13/14 transparency evidence either way.
 */

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { isDemoMode } from '@/lib/demo';

export const dynamic = 'force-dynamic';

async function isTelemetryAcknowledged(): Promise<boolean> {
  // Demo mode: skip the DB read; the demo deployment doesn't carry a
  // real setup_state row.
  if (isDemoMode()) return true;

  try {
    const { setupStateRepo } = await import(
      '@/lib/db/repositories/setup-state.repository'
    );
    return setupStateRepo.isTelemetryAcknowledged();
  } catch (err) {
    // Fail-safe: a transient DB error must not lock an authenticated
    // admin out of the console. The proxy + RBAC middleware already
    // confirmed the session, so we let the request through and let the
    // page-level handler surface any data-source errors.
    console.error('[admin/layout] setup-state read failed:', err);
    return true;
  }
}

export default async function AdminGateLayout({
  children,
}: {
  children: ReactNode;
}) {
  const acknowledged = await isTelemetryAcknowledged();
  if (!acknowledged) {
    redirect('/setup?reason=telemetry-consent-required');
  }
  return <>{children}</>;
}
