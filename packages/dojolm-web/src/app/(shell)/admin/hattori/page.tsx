// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/hattori — YR.4.6 v2.1 module page (Steel-tint cluster).
 *
 * Admin-only Hattori guard workbench. Composes YR.6 primitives
 * (HattoriGuardModes, CoverageMatrix, GoldenDiff, RegressionLog)
 * over the live `/api/guard/forge-defense/*` + `/api/guard/hardening`
 * endpoints.
 *
 * Flag gate: `HATTORI_UI_ENABLED` — flag-OFF renders a sumi-e
 * EmptyState (loading state) instead of a 5xx so an admin operator who
 * toggles the gate at runtime sees a graceful pause rather than a hard
 * error.
 *
 * RBAC tripod (defense-in-depth):
 *   1. middleware/rbac.ts redirects unauth `/admin/*` to `/login` at the edge
 *   2. this page re-checks role server-side via `resolveYr4PagePrelude`
 *   3. POST /api/guard/hardening + GET /api/guard/forge-defense/applied
 *      both run through `createApiHandler` with auth so a client bypass
 *      that reaches the API still fails
 */

import { redirect } from "next/navigation";
import { EmptyState } from "@/design";
import { resolveYr4PagePrelude } from "@/lib/yr4-page-prelude";
import { HattoriClient } from "./HattoriClient";

export const dynamic = "force-dynamic";

export default async function AdminHattoriPage() {
  const prelude = await resolveYr4PagePrelude({
    flag: "HATTORI_UI_ENABLED",
    demoHeader: "x-hattori-ui-enabled",
  });

  if (prelude.kind === "unauth") redirect("/login");

  if (prelude.kind === "flag-off") {
    return (
      <div className="yr4-page" data-testid="admin-hattori-flag-off">
        <EmptyState
          module="hattori"
          state="disabled"
          title="Hattori offline"
          sub="Ask an operator to enable the guard workbench for this deployment."
          testId="admin-hattori-flag-off-empty"
        />
      </div>
    );
  }

  if (prelude.kind === "forbidden") {
    return (
      <div className="yr4-page" data-testid="admin-hattori-forbidden">
        <EmptyState
          module="hattori"
          state="error"
          title="Admin access required"
          sub="The Hattori workbench is restricted to operators with the admin role."
          testId="admin-hattori-forbidden-empty"
        />
      </div>
    );
  }

  return (
    <div className="yr4-page" data-testid="admin-hattori-root">
      <HattoriClient />
    </div>
  );
}
