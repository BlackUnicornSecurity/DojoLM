// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/buki/fixtures/[id] — TICKET-A402 fixture-detail route.
 *
 * Last PR of the Buki Phase 2 close-out wave (PR-5). Replaces the
 * per-card `<details>` accordion in `FixturesTab.tsx` with a dedicated
 * detail route: each fixture category gets a deep-link surface with
 * its full file list, severity breakdown, and a back link to the
 * /admin/buki Fixtures tab.
 *
 * Pattern mirrors `/admin/buki/page.tsx`:
 *   - Server component with the YR.4 prelude (auth + flag + RBAC).
 *   - Client component (`FixtureDetailClient`) owns the data fetch
 *     against `/api/fixtures` and the render.
 *
 * Flag gate: `BUKI_UI_ENABLED` — flag-OFF renders the sumi-e
 * EmptyState identical to the parent route.
 */

import { redirect } from "next/navigation";
// E-A4 Phase B darwin-perf fix 2026-05-19: direct-component-path import
// bypasses the `@/design` bare barrel cascade. Per
// the darwin-perf import rule.
import { EmptyState } from "@/design/system/EmptyState";
import { resolveYr4PagePrelude } from "@/lib/yr4-page-prelude";
import { FixtureDetailClient } from "../../_components/FixtureDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function AdminBukiFixtureDetailPage({
  params,
}: PageProps) {
  const prelude = await resolveYr4PagePrelude({
    flag: "BUKI_UI_ENABLED",
    demoHeader: "x-buki-ui-enabled",
  });

  if (prelude.kind === "unauth") redirect("/login");

  if (prelude.kind === "flag-off") {
    return (
      <div
        className="yr4-page"
        data-testid="admin-buki-fixture-detail-flag-off"
      >
        <EmptyState
          module="buki"
          state="disabled"
          title="Payload armory is disabled"
          sub="Buki houses the SAGE seed corpus, mutation operators, fuzz playbooks, and quarantine queue used to assemble adversarial test fixtures. Enable the Buki feature flag to browse the armory, add new fixtures, and run protocol fuzz sessions."
          testId="admin-buki-fixture-detail-flag-off-empty"
        />
      </div>
    );
  }

  if (prelude.kind === "forbidden") {
    return (
      <div
        className="yr4-page"
        data-testid="admin-buki-fixture-detail-forbidden"
      >
        <EmptyState
          module="buki"
          state="error"
          title="Admin access required"
          sub="The Buki armory is restricted to operators with the admin role."
          testId="admin-buki-fixture-detail-forbidden-empty"
        />
      </div>
    );
  }

  // Resolve the dynamic param. Next.js 16+ ships params as a Promise.
  const resolved = await params;

  return (
    <div className="yr4-page" data-testid="admin-buki-fixture-detail-root">
      <FixtureDetailClient categoryId={resolved.id} />
    </div>
  );
}
