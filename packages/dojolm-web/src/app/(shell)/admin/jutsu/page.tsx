// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/jutsu — YR.4.3 v2.1 module page (Red-tint cluster).
 *
 * Admin-only Jutsu (model lab) workbench. Composes YR.6 primitives
 * (AttackRow, Spark, KV, SwapCandidate, DiffBlock, PillTabs) over the live
 * `/api/llm/models` GET endpoint.
 *
 * Flag gate: `JUTSU_UI_ENABLED` — flag-OFF renders sumi-e EmptyState.
 * RBAC tripod: middleware/rbac.ts → server-side role check → /api/llm/*
 * route guard.
 */

import { redirect } from "next/navigation";
import { EmptyState } from "@/design";
import { resolveYr4PagePrelude } from "@/lib/yr4-page-prelude";
import { JutsuClient } from "./JutsuClient";

export const dynamic = "force-dynamic";

export default async function AdminJutsuPage() {
  const prelude = await resolveYr4PagePrelude({
    flag: "JUTSU_UI_ENABLED",
    demoHeader: "x-jutsu-ui-enabled",
  });

  if (prelude.kind === "unauth") redirect("/login");

  if (prelude.kind === "flag-off") {
    return (
      <div className="yr4-page" data-testid="admin-jutsu-flag-off">
        <EmptyState
          module="jutsu"
          state="disabled"
          title="Jutsu lab offline"
          sub="Ask an operator to enable model configuration for this deployment."
          testId="admin-jutsu-flag-off-empty"
        />
      </div>
    );
  }

  if (prelude.kind === "forbidden") {
    return (
      <div className="yr4-page" data-testid="admin-jutsu-forbidden">
        <EmptyState
          module="jutsu"
          state="error"
          title="Admin access required"
          sub="The Jutsu model lab is restricted to operators with the admin role."
          testId="admin-jutsu-forbidden-empty"
        />
      </div>
    );
  }

  return (
    <div className="yr4-page" data-testid="admin-jutsu-root">
      <JutsuClient />
    </div>
  );
}
