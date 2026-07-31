// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/scanner — YR.4.1 v2.1 module page (Red-tint cluster).
 *
 * Admin-only Haiku scanner workbench. Composes YR.6 primitives (PostureTile,
 * AttackRow, Ribbon, KV, Spark) over the live `/api/scan` POST endpoint.
 *
 * Flag gate: `SCANNER_UI_ENABLED` — flag-OFF renders a sumi-e EmptyState
 * (disabled state) instead of a 503/404 so an admin operator who toggles
 * the gate at runtime sees a graceful pause rather than a hard error.
 * Wave 3ff (F-7-010 P1 retire) — the prior `state="loading"` semantic
 * was wrong: flag-off is not transient, the surface is intentionally
 * disabled. `disabled` surfaces the Admin → Flags deep link via
 * `DISABLED_DEFAULT_CTA` so the operator has a one-click path to flip
 * the flag back on.
 *
 * RBAC tripod (defense-in-depth):
 *   1. middleware/rbac.ts redirects unauth `/admin/*` to `/login` at the edge
 *   2. this page re-checks role server-side via `resolveYr4PagePrelude`
 *   3. POST /api/scan runs `withAuth({ resource: 'executions', action: 'execute' })`
 *      so a client bypass that reaches the API still fails
 *
 * HAGANE E2.S2b — scan history IS persisted now (/api/scan/history +
 * /api/scan/runs/[id], the YR.4.1.A follow-up). ScannerClient hydrates
 * `?tab=/?runId=/?findingId=` via useSearchParams, so it renders under
 * a <Suspense> boundary (validation-page template — Next.js app-router
 * requirement for useSearchParams in client components).
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { EmptyState } from "@/design";
import { resolveYr4PagePrelude } from "@/lib/yr4-page-prelude";
import { isDemoMode } from "@/lib/demo";
import { ScannerClient } from "./ScannerClient";

export const dynamic = "force-dynamic";

export default async function AdminScannerPage() {
  const prelude = await resolveYr4PagePrelude({
    flag: "SCANNER_UI_ENABLED",
    demoHeader: "x-scanner-ui-enabled",
  });

  if (prelude.kind === "unauth") redirect("/login");

  if (prelude.kind === "flag-off") {
    return (
      <div className="yr4-page" data-testid="admin-scanner-flag-off">
        <EmptyState
          module="scanner"
          state="disabled"
          title="Scanner is turned off"
          sub="The Scanner surface is disabled for this deployment. Ask your operator to enable it, then reopen this page."
          testId="admin-scanner-flag-off-empty"
        />
      </div>
    );
  }

  if (prelude.kind === "forbidden") {
    return (
      <div className="yr4-page" data-testid="admin-scanner-forbidden">
        <EmptyState
          module="scanner"
          state="error"
          title="Admin access required"
          sub="The Scanner workbench is restricted to operators with the admin role."
          testId="admin-scanner-forbidden-empty"
        />
      </div>
    );
  }

  return (
    <div className="yr4-page scanner-v2" data-testid="admin-scanner-root">
      <Suspense fallback={null}>
        <ScannerClient userId={prelude.user.id} demo={isDemoMode()} />
      </Suspense>
    </div>
  );
}
