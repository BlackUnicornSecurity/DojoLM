// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/buki — YR.4.2 v2.1 module page (Red-tint cluster).
 *
 * Admin-only Buki (payload armory) workbench. Composes YR.6 primitives
 * (AttackRow, Ribbon, Spark, KV, MCard quartet, PillTabs) over the live
 * `/api/buki/sage/*` GET endpoints.
 *
 * Flag gate: `BUKI_UI_ENABLED` — flag-OFF renders sumi-e EmptyState.
 * RBAC tripod: middleware/rbac.ts → server-side role check → /api/buki/*
 * route guard.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
// E-A4 Phase B darwin-perf fix 2026-05-19: direct-component-path import
// bypasses the `@/design` bare barrel cascade. Per
// the darwin-perf import rule.
import { EmptyState } from "@/design/system/EmptyState";
import { resolveYr4PagePrelude } from "@/lib/yr4-page-prelude";
import { BukiClient } from "./BukiClient";

export const dynamic = "force-dynamic";

export default async function AdminBukiPage() {
  const prelude = await resolveYr4PagePrelude({
    flag: "BUKI_UI_ENABLED",
    demoHeader: "x-buki-ui-enabled",
  });

  if (prelude.kind === "unauth") redirect("/login");

  if (prelude.kind === "flag-off") {
    return (
      <div className="yr4-page" data-testid="admin-buki-flag-off">
        <EmptyState
          module="buki"
          state="disabled"
          title="Payload armory is disabled"
          sub="Buki houses the SAGE seed corpus, mutation operators, fuzz playbooks, and quarantine queue used to assemble adversarial test fixtures. Enable the Buki feature flag to browse the armory, add new fixtures, and run protocol fuzz sessions."
          testId="admin-buki-flag-off-empty"
        />
      </div>
    );
  }

  if (prelude.kind === "forbidden") {
    return (
      <div className="yr4-page" data-testid="admin-buki-forbidden">
        <EmptyState
          module="buki"
          state="error"
          title="Admin access required"
          sub="The Buki armory is restricted to operators with the admin role."
          testId="admin-buki-forbidden-empty"
        />
      </div>
    );
  }

  return (
    <div className="yr4-page buki-route-page" data-testid="admin-buki-root">
      <Suspense fallback={null}>
        {/* HAGANE E3.S2 — useSearchParams in BukiClient requires a
            Suspense boundary (validation-page template). */}
        <BukiClient />
      </Suspense>
    </div>
  );
}
