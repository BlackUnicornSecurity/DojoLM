// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/sengoku — YR.4.5 v2.1 module page (Red-tint cluster).
 *
 * Admin-only Sengoku (campaign scheduler) workbench. Composes YR.6
 * primitives (CpnRow, SchedulerList, FeedRow, KV) over the live
 * `/api/sengoku/campaigns` GET endpoint.
 *
 * Flag gate: `SENGOKU_UI_ENABLED` — flag-OFF renders sumi-e EmptyState.
 * RBAC tripod: middleware/rbac.ts → server-side role check → /api/sengoku/*
 * route guard.
 */

import { redirect } from "next/navigation";
import { EmptyState } from "@/design";
import { resolveYr4PagePrelude } from "@/lib/yr4-page-prelude";
import { SengokuClient } from "./SengokuClient";

export const dynamic = "force-dynamic";

export default async function AdminSengokuPage() {
  const prelude = await resolveYr4PagePrelude({
    flag: "SENGOKU_UI_ENABLED",
    demoHeader: "x-sengoku-ui-enabled",
  });

  if (prelude.kind === "unauth") redirect("/login");

  if (prelude.kind === "flag-off") {
    return (
      <div className="yr4-page" data-testid="admin-sengoku-flag-off">
        <EmptyState
          module="sengoku"
          state="disabled"
          title="Sengoku scheduler offline"
          sub="Ask an operator to enable campaigns for this deployment."
          testId="admin-sengoku-flag-off-empty"
        />
      </div>
    );
  }

  if (prelude.kind === "forbidden") {
    return (
      <div className="yr4-page" data-testid="admin-sengoku-forbidden">
        <EmptyState
          module="sengoku"
          state="error"
          title="Admin access required"
          sub="The Sengoku scheduler is restricted to operators with the admin role."
          testId="admin-sengoku-forbidden-empty"
        />
      </div>
    );
  }

  return (
    <div className="yr4-page" data-testid="admin-sengoku-root">
      <SengokuClient />
    </div>
  );
}
