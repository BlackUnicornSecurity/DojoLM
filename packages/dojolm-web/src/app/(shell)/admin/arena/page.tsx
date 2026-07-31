// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/arena — YR.4.4 v2.1 module page (Red-tint cluster).
 *
 * Admin-only Arena (model battle) workbench. Composes YR.6 primitives
 * (VsBar, Bracket, FeedRow, leaderboard rank tiles) over the live
 * `/api/arena/leaderboard` GET endpoint.
 *
 * Flag gate: `ARENA_UI_ENABLED` — flag-OFF renders sumi-e EmptyState.
 * RBAC tripod: middleware/rbac.ts → server-side role check → /api/arena/*
 * route guard.
 */

import { redirect } from "next/navigation";
import { EmptyState } from "@/design";
import { resolveYr4PagePrelude } from "@/lib/yr4-page-prelude";
import { ArenaClient } from "./ArenaClient";
import { resolveArenaOuterTab } from "./arena-tab-contract";

export const dynamic = "force-dynamic";

interface AdminArenaPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminArenaPage({
  searchParams,
}: AdminArenaPageProps) {
  const prelude = await resolveYr4PagePrelude({
    flag: "ARENA_UI_ENABLED",
    demoHeader: "x-arena-ui-enabled",
  });

  if (prelude.kind === "unauth") redirect("/login");

  if (prelude.kind === "flag-off") {
    return (
      <div className="yr4-page" data-testid="admin-arena-flag-off">
        <EmptyState
          module="arena"
          state="disabled"
          title="Arena offline"
          sub="Ask an operator to enable adversarial matches for this deployment."
          testId="admin-arena-flag-off-empty"
        />
      </div>
    );
  }

  if (prelude.kind === "forbidden") {
    return (
      <div className="yr4-page" data-testid="admin-arena-forbidden">
        <EmptyState
          module="arena"
          state="error"
          title="Admin access required"
          sub="The Arena workbench is restricted to operators with the admin role."
          testId="admin-arena-forbidden-empty"
        />
      </div>
    );
  }

  return (
    <div className="yr4-page" data-testid="admin-arena-root">
      <ArenaClient
        initialTab={resolveArenaOuterTab((await searchParams).tab)}
      />
    </div>
  );
}
