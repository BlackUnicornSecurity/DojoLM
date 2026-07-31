// SPDX-License-Identifier: Apache-2.0
/**
 * TatamiClient — /admin/tatami evidence workspace shell.
 *
 * A "browser + actions" surface over the deployed Tatami HTTP API: a flat
 * tier-2 PageHead + KPI strip + a URL-driven SegmentedSubTabs strip
 * (`?tab=proofs|cases`) that swaps between the ProofsPanel (beside the "How a
 * proof works" explainer) and the CasesPanel, closed with a Compliance
 * cross-link — the wave-g2/Evidence v2 reference layout.
 *
 * RBAC posture: `/admin/*` is admin-gated at the Edge (`middleware/rbac.ts`
 * → `requiredRole: 'admin'`), so a member or operator session is redirected
 * to `/forbidden` and NEVER reaches this surface. Every user who does reach
 * it is an admin, and admin holds `executions:create` (capture / new case /
 * attach), so the write affordances are unconditional — an in-component
 * role/`canWrite` gate would be dead code (only an admin is ever here). The
 * server RBAC gate on the POST routes (`executions:create`) remains the real
 * boundary; this UI just renders the actions the reachable role already has.
 *
 * Mutation failures bubble up to a single page-level `actionError` banner
 * (no silent catch — HAGANE re-audit lesson).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  externalSegmentedPanelProps,
  PageHead,
  Panel,
  SegmentedSubTabs,
} from "@/design";
import { KpiStrip, type KpiStripItem } from "@/design/primitives/KpiStrip";
import { RefBlock } from "@/design/shell/RefBlock";
import type { StepsItem } from "@/design/shell/Steps";
import {
  DEFAULT_TATAMI_LIMIT,
  parseTab,
  type CasesListResponse,
  type ProofsListResponse,
  type TabId,
} from "./_lib";
import { ProofsPanel } from "./_components/ProofsPanel";
import { CasesPanel } from "./_components/CasesPanel";

// "How a proof works" — corpus copy, verbatim (wave-g2/Evidence v2).
const PROOF_STEPS: readonly StepsItem[] = [
  {
    title: "Capture from a run",
    sub: "Any completed scan run can be frozen as a proof.",
  },
  {
    title: "Verify the receipt",
    sub: "Each proof carries a hash-chained receipt anyone can re-check.",
  },
  {
    title: "Attach to a case",
    sub: "Group related proofs into an investigation case.",
  },
];

interface TatamiKpiCounts {
  readonly loading: boolean;
  readonly error: boolean;
  readonly proofs: string;
  readonly cases: string;
  readonly attached: string;
  readonly verified: string;
}

const ZERO_KPI_COUNTS: TatamiKpiCounts = {
  loading: true,
  error: false,
  proofs: "0",
  cases: "0",
  attached: "0",
  verified: "0",
};

/** D9 — parse a KPI count label ("0" / "12") back to the integer the tab
 *  count badge renders. An unparseable/loading value floors to 0 (honest
 *  zero, never NaN). */
function badgeCount(label: string): number {
  const n = Number.parseInt(label, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Page-1 fetch of both Tatami lists, folded into the four strip counts.
 *  Throws on any non-OK / network failure — the hook maps that to the
 *  strip's error tiles (never silently swallowed). */
async function fetchTatamiKpiCounts(): Promise<TatamiKpiCounts> {
  const qs = `?limit=${DEFAULT_TATAMI_LIMIT}`;
  const [proofsRes, casesRes] = await Promise.all([
    fetch(`/api/tatami/proofs${qs}`, { cache: "no-store" }),
    fetch(`/api/tatami/cases${qs}`, { cache: "no-store" }),
  ]);
  if (!proofsRes.ok || !casesRes.ok) {
    throw new Error("Tatami KPI fetch failed");
  }
  const proofsBody = (await proofsRes.json()) as ProofsListResponse;
  const casesBody = (await casesRes.json()) as CasesListResponse;
  const proofs = proofsBody.proofs ?? [];
  const cases = casesBody.cases ?? [];
  // P5 — plain numerals per the design ref: drop the page-1 truncation "+"
  // (which also produced a nonsensical "0+" when the proofs page truncated
  // but a derived count was zero). These are an at-a-glance page-1 snapshot.
  return {
    loading: false,
    error: false,
    proofs: String(proofs.length),
    cases: String(cases.length),
    attached: String(proofs.filter((p) => p.caseId != null).length),
    verified: String(proofs.filter((p) => p.trustState === "verified").length),
  };
}

/**
 * Page-1 snapshot of both Tatami lists for the at-a-glance KPI strip
 * (design wave-g2 `.kpis`). No counts endpoint exists, so the strip
 * derives from the same list projections the panels render.
 * ponytail: mount-only snapshot; add a refresh signal if post-capture
 * drift ever matters (the panels reload themselves already).
 */
function useTatamiKpiCounts(): TatamiKpiCounts {
  const [counts, setCounts] = useState<TatamiKpiCounts>(ZERO_KPI_COUNTS);

  useEffect(() => {
    let cancelled = false;
    fetchTatamiKpiCounts()
      .then((next) => {
        if (!cancelled) setCounts(next);
      })
      .catch(() => {
        if (!cancelled) {
          setCounts({ ...ZERO_KPI_COUNTS, loading: false, error: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}

/** Design zero-state captions are zero-phrased ("none captured") — only
 *  rendered at zero so a populated strip never carries a stale caption
 *  ("none captured" under a value of 20 would be a false statement). Wired
 *  through the Metric `sub` slot (design `.kpi .d`), not the delta slot. */
function zeroCaption(
  value: string,
  caption: string,
): KpiStripItem["sub"] {
  return value === "0" ? caption : undefined;
}

function tatamiKpiItems(k: TatamiKpiCounts): KpiStripItem[] {
  const shared = { loading: k.loading, error: k.error };
  return [
    {
      ...shared,
      label: "Proofs",
      value: k.proofs,
      sub: zeroCaption(k.proofs, "none captured"),
      testId: "tatami-kpi-proofs",
    },
    {
      ...shared,
      label: "Cases",
      value: k.cases,
      sub: zeroCaption(k.cases, "none opened"),
      testId: "tatami-kpi-cases",
    },
    {
      ...shared,
      label: "Attached",
      value: k.attached,
      sub: "proofs on cases",
      testId: "tatami-kpi-attached",
    },
    {
      ...shared,
      label: "Verified receipts",
      value: k.verified,
      sub: zeroCaption(k.verified, "none checked"),
      testId: "tatami-kpi-verified",
    },
  ];
}

export function TatamiClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams?.get("tab") ?? null);
  const kpiCounts = useTatamiKpiCounts();
  const [actionError, setActionError] = useState<string | null>(null);
  const [mountedTabs, setMountedTabs] = useState<ReadonlySet<TabId>>(
    () => new Set([tab]),
  );

  useEffect(() => {
    setMountedTabs((previous) => {
      if (previous.has(tab)) return previous;
      return new Set([...previous, tab]);
    });
  }, [tab]);

  const setTab = useCallback(
    (next: TabId) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", next);
      router.replace(`/admin/tatami?${params.toString()}`, { scroll: false });
      // Clear any stale mutation banner when the operator switches views.
      setActionError(null);
    },
    [router, searchParams],
  );

  return (
    <div className="tatami-v2-legal">
      {/* D3/D4 — flat tier-2 header (畳 TATAMI kicker + Inter H1 + gloss),
          replacing the steel gradient CommandHero banner, its Fraunces serif
          H1, the rotated EVIDENCE watermark, and the wrong 管理 kicker. */}
      {/* title is required by PageHeadProps but the tatami naming (plain
          "Evidence") owns the visible H1 — the prop is the fallback only. */}
      <PageHead namingId="tatami" title="Evidence" />

      <div className="grid">
        {/* P2c — the design's at-a-glance strip (Proofs / Cases / Attached /
            Verified receipts) sits between the page head and the tabs. */}
        <div style={{ gridColumn: "span 12" }}>
          <KpiStrip
            module="tatami"
            items={tatamiKpiItems(kpiCounts)}
            testId="tatami-kpis"
          />
        </div>

        {/* D8/D9 — bare sub-tabs carrying per-tab count badges ("Proofs 0 /
            Cases 0"), not an outer "Tatami" panel with a LIVE chip. */}
        <div style={{ gridColumn: "span 12" }}>
          <SegmentedSubTabs
            ariaLabel="Tatami views"
            active={tab}
            onChange={(id) => setTab(parseTab(id))}
            items={[
              {
                id: "proofs",
                label: "Proofs",
                badge: { count: badgeCount(kpiCounts.proofs) },
                testId: "tatami-tab-proofs",
              },
              {
                id: "cases",
                label: "Cases",
                badge: { count: badgeCount(kpiCounts.cases) },
                testId: "tatami-tab-cases",
              },
            ]}
            externalPanelIdPrefix="tatami-panel"
            externalMountedPanelIds={[...mountedTabs]}
          />
        </div>

        {actionError && (
          <div style={{ gridColumn: "span 12" }}>
            <div role="alert" data-testid="tatami-action-error" className="chip red">
              <span className="dot" />
              {actionError}
            </div>
          </div>
        )}

        <div style={{ gridColumn: "span 12" }}>
          {(mountedTabs.has("proofs") || tab === "proofs") && (
            <div
              {...externalSegmentedPanelProps("tatami-panel", "proofs")}
              hidden={tab !== "proofs"}
            >
              {/* P2c — design g2-wide: captured proofs beside the
                  "How a proof works" explainer (wave-g2/Evidence v2). */}
              <div className="g2-wide">
                {/* D8 — the proofs panel owns the design's "Captured proofs /
                    Newest first" header. headingLevel 2 per the v2 route
                    heading contract (every Panel here is pinned h2). */}
                <Panel
                  headingLevel={2}
                  title="Captured proofs"
                  sub="Newest first"
                >
                  <ProofsPanel onActionError={setActionError} />
                </Panel>
                <Panel headingLevel={2} title="How a proof works">
                  {/* NEW — the design's evidence explainer steps are
                      unnumbered (no counter circle), so this block renders the
                      local .steps/.step anatomy rather than the numbered Steps
                      primitive (whose CSS-counter always draws a circle). */}
                  <div className="steps" data-testid="tatami-proof-steps">
                    {PROOF_STEPS.map((step) => (
                      <div className="step" key={step.title}>
                        <span className="bd">
                          <span className="t">{step.title}</span>
                          <span className="s">{step.sub}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <details
                    className="f-more"
                    style={{ marginTop: 14 }}
                    data-testid="tatami-redaction-note"
                  >
                    <summary>Redaction</summary>
                    <p>
                      Proofs can be captured redacted — payload bodies are
                      stripped and the receipt records the redaction, so the
                      proof still verifies without exposing sensitive content.
                    </p>
                  </details>
                </Panel>
              </div>
            </div>
          )}
          {(mountedTabs.has("cases") || tab === "cases") && (
            <div
              {...externalSegmentedPanelProps("tatami-panel", "cases")}
              hidden={tab !== "cases"}
            >
              <Panel
                headingLevel={2}
                title="Investigation cases"
                sub="Group related proofs into one record"
              >
                <CasesPanel onActionError={setActionError} />
              </Panel>
            </div>
          )}
        </div>

        {/* P2c — design §5.5 cross-link: proofs → Compliance sign-off. */}
        <div style={{ gridColumn: "span 12" }}>
          <RefBlock
            kj="士"
            title="Compliance"
            sub="Verified proofs attach to framework controls as sign-off evidence"
            href="/admin/bushido"
            linkLabel="Open in Compliance →"
          />
        </div>
      </div>
    </div>
  );
}
