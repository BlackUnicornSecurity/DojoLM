// SPDX-License-Identifier: Apache-2.0
/**
 * BukiClient — YR.18 / G-040 + G-041 client component for `/admin/buki`.
 *
 * 4-tab outer workbench (one render panel per outer tab in
 * `_components/*Tab.tsx`):
 *   - Fixtures — armory catalog (live `/api/fixtures` with static
 *     fallback). Render: FixturesTab.
 *   - Payloads — card grid sourced from `PAYLOAD_CATALOG`. Render:
 *     PayloadsTab.
 *   - Generator — nested 4-tab strip (Dashboard / Seeds / Mutations /
 *     Quarantine) over the live `/api/buki/sage/*` GET endpoints.
 *     Render: GeneratorTab. The YR.4.2 Seeds-tab implementation is
 *     preserved verbatim under Generator → Seeds via `<BukiSeedRow>`.
 *   - Fuzzer — `<ProtocolFuzzPanel>` wired to `/api/buki/fuzz` POST
 *     (synchronous variant per YR.18 stop condition). Inline (16-LOC
 *     section, not worth its own _components file).
 *
 * PR-2 split (post-PR #843, post-#842 audit fixups):
 *   This file shrank from 1296 → ~250 LOC by extracting:
 *     _components/types.ts            — shared types + closed-enum constants
 *     _components/sanitize.ts         — wire-shape sanitizers + ribbon builder
 *     _components/fixture-helpers.ts  — fixture-manifest parser + severity maps
 *     _components/FixturesTab.tsx     — outer Fixtures render
 *     _components/PayloadsTab.tsx     — outer Payloads render
 *     _components/GeneratorTab.tsx    — outer Generator + inner 4-tab strip
 *   The parent retains: data-fetch effects, derived `useMemo`
 *   aggregations, outer-tab routing. Pattern mirrors the Jutsu/Ronin
 *   PR #841 split (4 + 7 `_components/*` files respectively).
 *
 * AIVSS field (TICKET-G3-API-BUKI shipped via PR #843 squash sha
 * `1f5d0ec84f`):
 *   SeedRecord rows render an AIVSS chip via <BukiSeedRow>; server now
 *   supplies the score per ADR-0097 §7. Client-side derivation in
 *   BukiSeedRow remains as a graceful fallback when the wire shape
 *   omits the field (sanitizeAivss returns null → BukiSeedRow's
 *   `s.aivss ?? null` falls through). Deprecating the client-side
 *   fallback is a Phase 2.5 follow-up.
 *
 * Layout (E-A4 Phase B, 2026-05-19):
 *   page-head action row    — "Add Fixture" (disabled-stub, single torii-red) + "Coming soon" hint
 *   <KpiStrip>              — V1-style 4-tile (Generation / Best Fitness / Total Seeds / Quarantined)
 *   free-standing <SegmentedSubTabs>  — 4 outer tabs (fixtures / generator / fuzzer / payloads)
 *   Each outer/inner tab body wrapper is <section role="tabpanel" aria-label=...>
 *
 * E-A4 Phase B carve-outs:
 *   - Fixtures tab adds <SeverityBar variant="stacked" colorize> per
 *     category card (B.3 + B.3-NICE-1 `colorize` opt-in).
 *   - Payloads tab adds "Click to load into scanner" deep-link per card
 *     (Case-B URL synthesis with TODO(E-B4) comment). Scanner-side
 *     hydration is a separate Phase 2 epic.
 *   - Generator → Dashboard adds SAGE Evolution Engine eyebrow + inner
 *     KpiStrip (Generation / Best Fitness / Total Seeds / Quarantined).
 *     Fitness-over-generations chart + Content-Safety + Quarantine-review
 *     summary deferred to Phase 2 per Step 0 finding.
 *   - ProtocolFuzzPanel deferred entirely per Step 1 founder Q2. The
 *     grammar <select> + mutations <input> stay as-is. Its "Run fuzz
 *     session" submit is neutral since the §1.3 red-demotion sweep —
 *     buki's one red is the Add Fixture header action.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
// HAGANE E3.S2 — ?tab/?gen URL state (page.tsx wraps in <Suspense>).
import { useSearchParams } from "next/navigation";
// PR-2 split — narrow @/design sub-path imports preserved verbatim
// (the darwin-perf import rule). Mirrors E-A7 Phase B
// (page.tsx) + E-A15 Phase A (ComplianceClient.tsx) precedent.
import { PageHead } from "@/design/shell/PageHead";
import { KpiStrip, type KpiStripItem } from "@/design/primitives/KpiStrip";
import {
  externalSegmentedPanelProps,
  SegmentedSubTabs,
  type SegmentedSubTabItem,
} from "@/design/primitives/SegmentedSubTabs";
import { ProtocolFuzzPanel } from "@/design/scanner/ProtocolFuzzPanel";
import { fixtureManifest } from "@/lib/fixtures-manifest";
import { PAYLOAD_CATALOG } from "@/lib/payload-catalog";
import { AddFixtureDialog } from "./_components/AddFixtureDialog";
import { FixturesTab } from "./_components/FixturesTab";
import { PayloadsTab } from "./_components/PayloadsTab";
import { GeneratorTab } from "./_components/GeneratorTab";
import {
  fixtureCategories,
  type FixtureCategoryEntry,
} from "./_components/fixture-helpers";
import {
  sanitizeMutation,
  sanitizeQuarantine,
  sanitizeSeed,
} from "./_components/sanitize";
import {
  GEN_TAB_LABEL,
  GEN_TAB_ORDER,
  isBukiGenTab,
  isBukiOuterTab,
  OUTER_TAB_LABEL,
  OUTER_TAB_ORDER,
  type GenTabId,
  type MutationOperatorRecord,
  type MutationsResponse,
  type OuterTabId,
  type QuarantineRecord,
  type QuarantineResponse,
  type SeedRecord,
  type SeedsResponse,
} from "./_components/types";

// Test-suite-facing re-exports — preserved for any external module
// (or test file) that previously imported MAX_*_DISPLAYED constants
// from BukiClient. Originals now live in `_components/types.ts`.
export {
  MAX_SEEDS_DISPLAYED,
  MAX_MUTATIONS_DISPLAYED,
  MAX_QUARANTINE_DISPLAYED,
} from "./_components/types";

const GEN_TAB_ITEMS: readonly SegmentedSubTabItem[] = GEN_TAB_ORDER.map(
  (id) => ({
    id,
    label: GEN_TAB_LABEL[id],
    testId: `buki-gen-tab-${id}`,
  }),
);

export function BukiClient() {
  // HAGANE E3.S2 — hydrate ?tab=/?gen= (closed-enum guarded; invalid
  // params degrade to defaults) and sync back via replaceState so tab
  // position survives refresh/share (audit M2: URL-state amnesia).
  const searchParams = useSearchParams();
  const [outerTab, setOuterTabState] = useState<OuterTabId>(() => {
    const t = searchParams.get("tab");
    return t !== null && isBukiOuterTab(t) ? t : "fixtures";
  });
  const [mountedOuterTabs, setMountedOuterTabs] = useState<
    ReadonlySet<OuterTabId>
  >(() => new Set([outerTab]));

  useEffect(() => {
    setMountedOuterTabs((previous) => {
      if (previous.has(outerTab)) return previous;
      return new Set([...previous, outerTab]);
    });
  }, [outerTab]);
  const [genTab, setGenTabState] = useState<GenTabId>(() => {
    const g = searchParams.get("gen");
    return g !== null && isBukiGenTab(g) ? g : "dashboard";
  });
  const syncTabUrl = useCallback((tab: OuterTabId, gen: GenTabId) => {
    const url = new URL(window.location.href);
    if (tab === "fixtures") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    if (tab === "generator" && gen !== "dashboard")
      url.searchParams.set("gen", gen);
    else url.searchParams.delete("gen");
    window.history.replaceState(null, "", url.toString());
  }, []);
  const setOuterTab = useCallback(
    (t: OuterTabId) => {
      setOuterTabState(t);
      syncTabUrl(t, genTab);
    },
    [genTab, syncTabUrl],
  );
  const setGenTab = useCallback(
    (g: GenTabId) => {
      setGenTabState(g);
      syncTabUrl(outerTab, g);
    },
    [outerTab, syncTabUrl],
  );
  const [addFixtureOpen, setAddFixtureOpen] = useState(false);
  // HAGANE E3.S4 — one Retry re-runs all three SAGE fetches (#873).
  const [sageAttempt, setSageAttempt] = useState(0);

  // Seeds — preserved from YR.4.2.
  const [seeds, setSeeds] = useState<readonly SeedRecord[]>([]);
  const [seedsError, setSeedsError] = useState<string | null>(null);
  const [seedsLoading, setSeedsLoading] = useState(true);

  // Mutations.
  const [mutations, setMutations] = useState<readonly MutationOperatorRecord[]>(
    [],
  );
  const [mutationsError, setMutationsError] = useState<string | null>(null);
  const [mutationsLoading, setMutationsLoading] = useState(true);

  // Quarantine.
  const [quarantine, setQuarantine] = useState<readonly QuarantineRecord[]>([]);
  const [quarantineError, setQuarantineError] = useState<string | null>(null);
  const [quarantineLoading, setQuarantineLoading] = useState(true);

  // Fixtures — live armory catalog from /api/fixtures (server reads
  // packages/bu-tpi/fixtures/manifest.json). Falls back to the static
  // stub on fetch failure so the tab degrades gracefully.
  const [fixtureCats, setFixtureCats] = useState<
    readonly FixtureCategoryEntry[]
  >(() => fixtureCategories(fixtureManifest));
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  // HAGANE E1.S5 — bump to re-run the live fixtures fetch (Retry).
  const [fixturesAttempt, setFixturesAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSeedsLoading(true);
      try {
        const res = await fetch("/api/buki/sage/seeds?limit=200", {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as SeedsResponse;
        if (cancelled) return;
        if (!res.ok) {
          setSeedsError("Armory unavailable");
          setSeeds([]);
        } else {
          const safe: SeedRecord[] = [];
          for (const raw of body.seeds ?? []) {
            const seed = sanitizeSeed(raw);
            if (seed) safe.push(seed);
          }
          // Adversarial HIGH-2 — preserve any optimistically-prepended
          // seeds (from AddFixtureDialog.onSeedAdded) that the GET
          // response doesn't include yet. Without this, a POST that
          // returns before the GET resolves would be silently overwritten
          // (user sees the new seed flash in, then disappear when the
          // initial GET lands). Functional updater + id-set merge.
          setSeeds((prev) => {
            const fetchedIds = new Set(safe.map((s) => s.id));
            const optimistic = prev.filter((s) => !fetchedIds.has(s.id));
            return optimistic.length === 0 ? safe : [...optimistic, ...safe];
          });
          setSeedsError(null);
        }
      } catch {
        if (!cancelled) {
          setSeedsError("Network error");
          setSeeds([]);
        }
      } finally {
        if (!cancelled) setSeedsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sageAttempt]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMutationsLoading(true);
      try {
        const res = await fetch("/api/buki/sage/mutations?limit=200", {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as MutationsResponse;
        if (cancelled) return;
        if (!res.ok) {
          setMutationsError("Mutations unavailable");
          setMutations([]);
        } else {
          const safe: MutationOperatorRecord[] = [];
          for (const raw of body.operators ?? []) {
            const op = sanitizeMutation(raw);
            if (op) safe.push(op);
          }
          setMutations(safe);
          setMutationsError(null);
        }
      } catch {
        if (!cancelled) {
          setMutationsError("Network error");
          setMutations([]);
        }
      } finally {
        if (!cancelled) setMutationsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sageAttempt]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setQuarantineLoading(true);
      try {
        const res = await fetch("/api/buki/sage/quarantine?limit=200", {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as QuarantineResponse;
        if (cancelled) return;
        if (!res.ok) {
          setQuarantineError("Quarantine unavailable");
          setQuarantine([]);
        } else {
          const safe: QuarantineRecord[] = [];
          for (const raw of body.items ?? []) {
            const q = sanitizeQuarantine(raw);
            if (q) safe.push(q);
          }
          setQuarantine(safe);
          setQuarantineError(null);
        }
      } catch {
        if (!cancelled) {
          setQuarantineError("Network error");
          setQuarantine([]);
        }
      } finally {
        if (!cancelled) setQuarantineLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sageAttempt]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFixturesLoading(true);
      try {
        const res = await fetch("/api/fixtures", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json().catch(() => null)) as unknown;
        if (cancelled) return;
        const cats = fixtureCategories(body);
        setFixtureCats(cats);
        setFixturesError(null);
      } catch {
        if (cancelled) return;
        // HAGANE E1.S5 (audit C2): the bundled-manifest fallback must be
        // DISCLOSED, never presented as the live catalog. Pre-HAGANE
        // this branch nulled the error whenever the fallback had
        // content — a silent fixture swap.
        const fallback = fixtureCategories(fixtureManifest);
        setFixtureCats(fallback);
        setFixturesError(
          fallback.length === 0
            ? "Armory unavailable"
            : "Live armory unavailable — showing the bundled manifest.",
        );
      } finally {
        if (!cancelled) setFixturesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fixturesAttempt]);

  // Outer KpiStrip values — shared with the inner Generator Dashboard
  // KpiStrip (passed through as props to GeneratorTab). Every other
  // derived view (cappedSeeds / ribbonSegs / mutationsItems /
  // quarantineItems / dashboardKvRows / avgFitness / avgSuccess /
  // totalUsage / capped counts) is consumed ONLY by Generator and
  // therefore lives in GeneratorTab.tsx — architect MED-1 in PR-2
  // review (mirrors Jutsu/Ronin precedent of state-down / derive-in-panel).
  const totalSeeds = seeds.length;
  const quarantinedTotal = quarantine.length;
  const maxGeneration = useMemo(() => {
    let max = 0;
    for (const s of seeds) {
      if (s.generation > max) max = s.generation;
    }
    return max;
  }, [seeds]);
  const bestFitness = useMemo(() => {
    let max = 0;
    for (const s of seeds) {
      if (s.fitness > max) max = s.fitness;
    }
    return Math.round(max * 100);
  }, [seeds]);

  // P4 D9 — the outer sub-tab row carries live count badges (design
  // "Fixtures 17 · … · Payloads 6"). Fixtures total sums files across every
  // category; Payloads is the static promoted-armory catalog. Badges are
  // omitted at zero so the strip never shows a bare "0" while data loads.
  const fixturesTotal = useMemo(
    () => fixtureCats.reduce((sum, c) => sum + c.files.length, 0),
    [fixtureCats],
  );
  const outerTabItems = useMemo<readonly SegmentedSubTabItem[]>(
    () =>
      OUTER_TAB_ORDER.map((id) => ({
        id,
        label: OUTER_TAB_LABEL[id],
        testId: `buki-outer-tab-${id}`,
        ...(id === "fixtures" && fixturesTotal > 0
          ? { badge: { count: fixturesTotal } }
          : {}),
        ...(id === "payloads" && PAYLOAD_CATALOG.length > 0
          ? { badge: { count: PAYLOAD_CATALOG.length } }
          : {}),
      })),
    [fixturesTotal],
  );

  return (
    <>
      <header className="buki-page-head-wrap">
        {/* E-A4 Phase B: the single primary action opens AddFixtureDialog.
            The supporting copy stays grouped with the action at narrow widths. */}
        <PageHead
          namingId="buki"
          title="Buki"
          jp="武器"
          actions={
            <div className="buki-page-actions">
              {/* P4 D8 — reference page-head action pair: torii-red primary
                  "+ Add fixture" + ghost "Import pack" (design Payloads
                  v2.html). The stray "Adds a seed…" caption is retired; the
                  action label carries the affordance. */}
              <button
                id="buki-add-fixture"
                type="button"
                className="btn btn-primary btn-sm"
                data-testid="buki-add-fixture-button"
                aria-label="Add a new SAGE seed fixture"
                onClick={() => setAddFixtureOpen(true)}
              >
                + Add fixture
              </button>
              {/* Ghost secondary. No dedicated bulk-pack import route exists
                  yet, so this interim routes to the same single-fixture
                  corpus-write dialog (never a dead control); wire a real
                  pack importer when the backend lands. */}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                data-testid="buki-import-pack-button"
                aria-label="Import a fixture pack into the SAGE corpus"
                onClick={() => setAddFixtureOpen(true)}
              >
                Import pack
              </button>
            </div>
          }
        />
      </header>

      <div className="buki-kpi-wrap">
        {/* E-A4 Phase B — V1-style 4-tile KpiStrip
            (Generation · Best Fitness · Total Seeds · Quarantined) per
            Step 1 founder Q3 + V1 reference v1-02d-buki-generator.png. */}
        <KpiStrip
          module="buki"
          testId="buki-kpi-strip"
          items={
            [
              // P4 D3 — §5.2 KPI law: values are ink, tone reserved for
              // up/down deltas. Each tile carries the design's dim
              // sub-caption (design .kpi .d). Quarantined dims its own zero
              // via KpiStrip's --zero cell class (no tone needed).
              {
                label: "Generation",
                value: maxGeneration,
                sub: "evolution cycles",
                testId: "buki-kpi-generation",
              },
              {
                label: "Best Fitness",
                value: bestFitness,
                sub: "of 100",
                testId: "buki-kpi-best-fitness",
              },
              {
                label: "Total Seeds",
                value: totalSeeds,
                sub: "corpus loaded",
                testId: "buki-kpi-total-seeds",
              },
              {
                label: "Quarantined",
                value: quarantinedTotal,
                sub: quarantinedTotal === 0 ? "queue empty" : "in review",
                testId: "buki-kpi-quarantined",
              },
            ] satisfies KpiStripItem[]
          }
        />
      </div>

      {/* P4 D4 — the design has no "Buki workbench" panel wrapper: the outer
          sub-tab row sits free-standing under the KPIs (design Payloads
          v2.html), and each tab body renders directly beneath it. */}
      <div className="buki-subtabs-row">
        <SegmentedSubTabs
          className="buki-workbench-tabs"
          items={outerTabItems}
          active={outerTab}
          onChange={(id) => {
            // E-A4 Phase B R-T1 closed-enum guard (replaces inline cast).
            if (isBukiOuterTab(id)) setOuterTab(id);
          }}
          ariaLabel="Payloads sections"
          externalPanelIdPrefix="buki-workbench-panel"
          externalMountedPanelIds={[...mountedOuterTabs]}
        />
      </div>

      <div className="buki-tab-bodies">
        {(mountedOuterTabs.has("fixtures") || outerTab === "fixtures") && (
          <div hidden={outerTab !== "fixtures"}>
            <FixturesTab
              fixtureCats={fixtureCats}
              fixturesError={fixturesError}
              fixturesLoading={fixturesLoading}
              onAddFixture={() => setAddFixtureOpen(true)}
              onRetryFixtures={() => setFixturesAttempt((a) => a + 1)}
            />
          </div>
        )}

        {(mountedOuterTabs.has("payloads") || outerTab === "payloads") && (
          <div hidden={outerTab !== "payloads"}>
            <PayloadsTab />
          </div>
        )}

        {(mountedOuterTabs.has("generator") || outerTab === "generator") && (
          <div hidden={outerTab !== "generator"}>
            <GeneratorTab
              genTab={genTab}
              onRetrySage={() => setSageAttempt((a) => a + 1)}
              onGenTabChange={setGenTab}
              genTabItems={GEN_TAB_ITEMS}
              seeds={seeds}
              mutations={mutations}
              quarantine={quarantine}
              maxGeneration={maxGeneration}
              bestFitness={bestFitness}
              totalSeeds={totalSeeds}
              quarantinedTotal={quarantinedTotal}
              seedsError={seedsError}
              seedsLoading={seedsLoading}
              mutationsError={mutationsError}
              mutationsLoading={mutationsLoading}
              quarantineError={quarantineError}
              quarantineLoading={quarantineLoading}
            />
          </div>
        )}

        {(mountedOuterTabs.has("fuzzer") || outerTab === "fuzzer") && (
          <section
            {...externalSegmentedPanelProps("buki-workbench-panel", "fuzzer")}
            hidden={outerTab !== "fuzzer"}
            data-testid="buki-fuzzer-tab"
          >
            {/* E-A4 Phase B Q2 — ProtocolFuzzPanel polish deferred
                entirely; shared primitive owned by Scanner, reused here
                verbatim. Its submit is neutral since the §1.3
                red-demotion sweep (scanner's one red = Run scan; buki's
                = Add Fixture). Phase 2 follow-up would land
                grammar/mutations polish at the primitive level. */}
            <ProtocolFuzzPanel testId="buki-fuzz" />
          </section>
        )}
      </div>

      <AddFixtureDialog
        open={addFixtureOpen}
        onClose={() => setAddFixtureOpen(false)}
        onSeedAdded={(seed) => {
          // Prepend so the newly-added seed appears first in the
          // capped corpus view (which slices the first
          // MAX_SEEDS_DISPLAYED rows). Immutability: spread into a
          // fresh array; never mutate the existing `seeds` state.
          setSeeds((prev) => [seed, ...prev]);
        }}
      />
    </>
  );
}
