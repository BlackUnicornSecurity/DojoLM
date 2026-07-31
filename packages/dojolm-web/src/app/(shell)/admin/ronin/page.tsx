// SPDX-License-Identifier: Apache-2.0
/* eslint-disable no-restricted-syntax -- `ronin` is a typed EmptyState product module here, never a retired NavId. */
/**
 * /admin/ronin — YR.4.11 v2.1 module page (Gold-tint cluster).
 *
 * Admin-only Ronin bounty hub. Composes YR.6 primitives (AttackRow
 * submission queue, HunterLeader rank tiles, BountyList, KV) over
 * the live `/api/ronin/{programs,submissions}` endpoints.
 *
 * Flag gate: `RONIN_UI_ENABLED` — flag-OFF renders a sumi-e
 * EmptyState (loading state) instead of a 5xx so an admin operator
 * who toggles the gate at runtime sees a graceful pause rather than
 * a hard error.
 *
 * RBAC tripod (defense-in-depth):
 *   1. middleware/rbac.ts redirects unauth `/admin/*` to `/login` at the edge
 *   2. this page re-checks role server-side via `resolveYr4PagePrelude`
 *   3. /api/ronin/programs + /api/ronin/submissions both call
 *      `checkApiAuth` (or `createApiHandler`) so a client bypass that
 *      reaches the API still fails
 */

import { redirect } from "next/navigation";
import { EmptyState } from "@/design";
import { resolveYr4PagePrelude } from "@/lib/yr4-page-prelude";
import { RoninAdminClient } from "./RoninAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminRoninPage() {
  const prelude = await resolveYr4PagePrelude({
    flag: "RONIN_UI_ENABLED",
    demoHeader: "x-ronin-ui-enabled",
  });

  if (prelude.kind === "unauth") redirect("/login");

  if (prelude.kind === "flag-off") {
    return (
      <div className="yr4-page" data-testid="admin-ronin-flag-off">
        <EmptyState
          module="ronin"
          state="disabled"
          title="Ronin offline"
          sub="Ask an operator to enable research intake for this deployment."
          testId="admin-ronin-flag-off-empty"
        />
      </div>
    );
  }

  if (prelude.kind === "forbidden") {
    return (
      <div className="yr4-page" data-testid="admin-ronin-forbidden">
        <EmptyState
          module="ronin"
          state="error"
          title="Admin access required"
          sub="The Ronin bounty hub is restricted to operators with the admin role."
          testId="admin-ronin-forbidden-empty"
        />
      </div>
    );
  }

  return (
    <div className="yr4-page" data-testid="admin-ronin-root">
      <RoninAdminClient />
    </div>
  );
}
