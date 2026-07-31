// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/kotoba — YR.4.7 v2.1 module page (Steel-tint cluster).
 *
 * Admin-only Kotoba prompt-hardening workbench. Composes YR.6 primitives
 * (TokenizedPrompt, DiffBlock, ScoreCard, VersionList) over the live
 * `/api/kotoba/score` + `/api/kotoba/harden` endpoints.
 *
 * Flag gate: `KOTOBA_UI_ENABLED` — flag-OFF renders a sumi-e EmptyState
 * (loading state) instead of a 5xx so an admin operator who toggles
 * the gate at runtime sees a graceful pause rather than a hard error.
 *
 * RBAC tripod (defense-in-depth):
 *   1. middleware/rbac.ts redirects unauth `/admin/*` to `/login` at the edge
 *   2. this page re-checks role server-side via `resolveYr4PagePrelude`
 *   3. POST /api/kotoba/score + POST /api/kotoba/harden run through
 *      `createApiHandler` with auth so a client bypass that reaches the
 *      API still fails
 */

import { redirect } from "next/navigation";
import { EmptyState } from "@/design";
import { resolveYr4PagePrelude } from "@/lib/yr4-page-prelude";
import { KotobaClient } from "./KotobaClient";

export const dynamic = "force-dynamic";

export default async function AdminKotobaPage() {
  const prelude = await resolveYr4PagePrelude({
    flag: "KOTOBA_UI_ENABLED",
    demoHeader: "x-kotoba-ui-enabled",
  });

  if (prelude.kind === "unauth") redirect("/login");

  if (prelude.kind === "flag-off") {
    return (
      <div className="yr4-page" data-testid="admin-kotoba-flag-off">
        <EmptyState
          module="kotoba"
          state="disabled"
          title="Kotoba offline"
          sub="Ask an operator to enable prompt hardening for this deployment."
          testId="admin-kotoba-flag-off-empty"
        />
      </div>
    );
  }

  if (prelude.kind === "forbidden") {
    return (
      <div className="yr4-page" data-testid="admin-kotoba-forbidden">
        <EmptyState
          module="kotoba"
          state="error"
          title="Admin access required"
          sub="The Kotoba workbench is restricted to operators with the admin role."
          testId="admin-kotoba-forbidden-empty"
        />
      </div>
    );
  }

  return (
    <div className="yr4-page" data-testid="admin-kotoba-root">
      <KotobaClient />
    </div>
  );
}
