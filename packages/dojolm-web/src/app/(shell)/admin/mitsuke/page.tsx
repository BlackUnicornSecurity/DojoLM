// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/mitsuke — YR.4.8 v2.1 module page (Gold-tint cluster).
 *
 * Admin-only Mitsuke threat-feed surface. Composes YR.6 primitives
 * (Ticker, AttackRow, BarRow, RegressionLog, KV) over the live
 * `/api/mitsuke/{entries,sources,indicators}` endpoints.
 *
 * Flag gate: `MITSUKE_UI_ENABLED` — flag-OFF renders a sumi-e
 * EmptyState (loading state) instead of a 5xx so an admin operator
 * who toggles the gate at runtime sees a graceful pause rather than
 * a hard error.
 *
 * RBAC tripod (defense-in-depth):
 *   1. middleware/rbac.ts redirects unauth `/admin/*` to `/login` at the edge
 *   2. this page re-checks role server-side via `resolveYr4PagePrelude`
 *   3. each `/api/mitsuke/*` route runs through `createApiHandler` with
 *      its own rate-limit posture (read-tier for GET; write-tier for
 *      source POST) so a client bypass that reaches the API still fails
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { EmptyState } from "@/design";
import { resolveYr4PagePrelude } from "@/lib/yr4-page-prelude";
import { MitsukeClient } from "./MitsukeClient";

export const dynamic = "force-dynamic";

export default async function AdminMitsukePage() {
  const prelude = await resolveYr4PagePrelude({
    flag: "MITSUKE_UI_ENABLED",
    demoHeader: "x-mitsuke-ui-enabled",
  });

  if (prelude.kind === "unauth") redirect("/login");

  if (prelude.kind === "flag-off") {
    return (
      <div className="yr4-page" data-testid="admin-mitsuke-flag-off">
        <EmptyState
          module="mitsuke"
          state="disabled"
          title="Mitsuke offline"
          sub="Ask an operator to enable threat intelligence for this deployment."
          testId="admin-mitsuke-flag-off-empty"
        />
      </div>
    );
  }

  if (prelude.kind === "forbidden") {
    return (
      <div className="yr4-page" data-testid="admin-mitsuke-forbidden">
        <EmptyState
          module="mitsuke"
          state="error"
          title="Admin access required"
          sub="The Mitsuke threat-feed surface is restricted to operators with the admin role."
          testId="admin-mitsuke-forbidden-empty"
        />
      </div>
    );
  }

  return (
    <div className="yr4-page" data-testid="admin-mitsuke-root">
      <Suspense fallback={null}>
        {/* HAGANE E3.S3 — useSearchParams boundary (validation template). */}
        <MitsukeClient />
      </Suspense>
    </div>
  );
}
