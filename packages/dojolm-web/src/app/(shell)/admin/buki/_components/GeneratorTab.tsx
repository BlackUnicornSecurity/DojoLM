// SPDX-License-Identifier: Apache-2.0
/**
 * GeneratorTab — outer-tab render for /admin/buki Generator.
 * Extracted from BukiClient.tsx for the PR-2 split.
 *
 * Nested 4-tab strip: Dashboard / Seeds / Mutations / Quarantine.
 * Each sub-tab body is a `<section role="tabpanel">` with its own
 * testId. The Dashboard sub-tab carries the inner SAGE Evolution
 * Engine KpiStrip (mirrors V1 v1-02d-buki-generator.png 4-tile —
 * Generation / Best Fitness / Total Seeds / Quarantined).
 *
 * Pure render — all state (seeds / mutations / quarantine / loading /
 * error / genTab) is owned by the parent BukiClient. Inner-tab
 * `onChange` is gated by the `isBukiGenTab` closed-enum guard so the
 * Radix `string`-widened id always narrows back to the closed union.
 */

"use client";

import { useMemo } from "react";
import { AttackRow, type AttackRowItem } from "@/design/primitives/AttackRow";
import { EmptyState } from "@/design/system/EmptyState";
import { KV } from "@/design/primitives/KV";
import { KpiStrip, type KpiStripItem } from "@/design/primitives/KpiStrip";
import { Panel } from "@/design/shell/Panel";
import { Ribbon } from "@/design/primitives/Ribbon";
import {
  externalSegmentedPanelProps,
  SegmentedSubTabs,
  type SegmentedSubTabItem,
} from "@/design/primitives/SegmentedSubTabs";
import { cap, capOpt } from "@/design/primitives/_caps";
import { BukiSeedRow } from "../BukiSeedRow";
import { buildCriticityRibbon } from "./sanitize";
import {
  DESCRIPTION_MAX,
  isBukiGenTab,
  MAX_MUTATIONS_DISPLAYED,
  MAX_QUARANTINE_DISPLAYED,
  MAX_SEEDS_DISPLAYED,
  NAME_MAX,
  STATUS_LABEL,
  STATUS_TO_ATTACK_STATUS,
  STATUS_TO_SEV_LEVEL,
  type GenTabId,
  type MutationOperatorRecord,
  type QuarantineRecord,
  type SeedRecord,
} from "./types";

interface GeneratorTabProps {
  // Tab control
  readonly genTab: GenTabId;
  readonly onGenTabChange: (id: GenTabId) => void;
  readonly genTabItems: readonly SegmentedSubTabItem[];
  // Raw fetched state (panel derives all capped + mapped views from these)
  readonly seeds: readonly SeedRecord[];
  readonly mutations: readonly MutationOperatorRecord[];
  readonly quarantine: readonly QuarantineRecord[];
  // KpiStrip values shared with the outer Buki KpiStrip — the parent
  // already memoizes these to drive its own render, so we pass them
  // through rather than re-deriving (would create two identical
  // useMemo chains).
  readonly maxGeneration: number;
  readonly bestFitness: number;
  readonly totalSeeds: number;
  readonly quarantinedTotal: number;
  // Loading + error flags per fetched stream
  readonly seedsError: string | null;
  /** HAGANE E3.S4 — re-runs the SAGE fetch trio (#873 pattern). */
  readonly onRetrySage?: () => void;
  readonly seedsLoading: boolean;
  readonly mutationsError: string | null;
  readonly mutationsLoading: boolean;
  readonly quarantineError: string | null;
  readonly quarantineLoading: boolean;
}

export function GeneratorTab(props: GeneratorTabProps) {
  const {
    genTab,
    onGenTabChange,
    genTabItems,
    seeds,
    mutations,
    quarantine,
    maxGeneration,
    bestFitness,
    totalSeeds,
    quarantinedTotal,
    seedsError,
    onRetrySage,
    seedsLoading,
    mutationsError,
    mutationsLoading,
    quarantineError,
    quarantineLoading,
  } = props;

  // Panel-local derivations (architect MED-1 — these views are
  // consumed only inside GeneratorTab so they live here rather than
  // bubbling 9 props through the parent).
  const cappedSeeds = useMemo(
    () => seeds.slice(0, MAX_SEEDS_DISPLAYED),
    [seeds],
  );
  const ribbonSegs = useMemo(
    () => buildCriticityRibbon(cappedSeeds),
    [cappedSeeds],
  );

  const cappedMutations = useMemo(
    () => mutations.slice(0, MAX_MUTATIONS_DISPLAYED),
    [mutations],
  );
  const mutationsItems: readonly AttackRowItem[] = useMemo(() => {
    return cappedMutations.map<AttackRowItem>((m) => ({
      id: m.id,
      eyebrow: cap(m.category, 48),
      title: cap(m.name, NAME_MAX),
      sub: capOpt(m.description, DESCRIPTION_MAX),
      sev: "low",
      status: "pass",
    }));
  }, [cappedMutations]);

  const cappedQuarantine = useMemo(
    () => quarantine.slice(0, MAX_QUARANTINE_DISPLAYED),
    [quarantine],
  );
  const quarantineItems: readonly AttackRowItem[] = useMemo(() => {
    return cappedQuarantine.map<AttackRowItem>((q) => ({
      id: q.id,
      eyebrow: cap(STATUS_LABEL[q.status], 32),
      title: cap(q.seedName, NAME_MAX),
      sub: capOpt(q.reason, DESCRIPTION_MAX),
      sev: STATUS_TO_SEV_LEVEL[q.status],
      status: STATUS_TO_ATTACK_STATUS[q.status],
    }));
  }, [cappedQuarantine]);

  const avgFitness = useMemo(() => {
    if (seeds.length === 0) return 0;
    const total = seeds.reduce((s, r) => s + r.fitness, 0);
    return Math.round((total / seeds.length) * 100);
  }, [seeds]);
  const avgSuccess = useMemo(() => {
    if (seeds.length === 0) return 0;
    const total = seeds.reduce((s, r) => s + r.successRate, 0);
    return Math.round(total / seeds.length);
  }, [seeds]);
  const totalUsage = useMemo(
    () => seeds.reduce((s, r) => s + r.usageCount, 0),
    [seeds],
  );

  const dashboardKvRows = useMemo(() => {
    return [
      { k: "Seeds (total)", v: String(totalSeeds) },
      { k: "Avg fitness", v: `${avgFitness} / 100` },
      { k: "Avg success rate", v: `${avgSuccess}%` },
      { k: "Total usage", v: String(totalUsage) },
      { k: "Mutation operators", v: String(mutations.length) },
      {
        k: "Quarantine pending",
        v: String(quarantine.filter((q) => q.status === "pending").length),
      },
    ];
    // Use array references (not .length) so a same-length replace-in-place
    // still triggers the recompute. Matches the asymmetry around `quarantine`.
  }, [totalSeeds, avgFitness, avgSuccess, totalUsage, mutations, quarantine]);

  const cappedMutationsCount = cappedMutations.length;
  const cappedQuarantineCount = cappedQuarantine.length;

  return (
    <section
      id="buki-workbench-panel-generator"
      role="tabpanel"
      aria-labelledby="buki-workbench-panel-generator-trigger"
      tabIndex={0}
      data-testid="buki-generator-tab"
    >
      <SegmentedSubTabs
        items={genTabItems}
        active={genTab}
        onChange={(id) => {
          // E-A4 Phase B R-T1 closed-enum guard (replaces inline cast).
          if (isBukiGenTab(id)) onGenTabChange(id);
        }}
        ariaLabel="SAGE generator sub-tabs"
        externalPanelIdPrefix="buki-generator-panel"
      />
      <div style={{ marginTop: 12 }}>
        {genTab === "dashboard" && (
          <section
            {...externalSegmentedPanelProps(
              "buki-generator-panel",
              "dashboard",
            )}
            data-testid="buki-gen-dashboard"
          >
            {/* E-A4 Phase B — SAGE Evolution Engine eyebrow + inner
                KpiStrip. Mirrors V1 reference
                v1-02d-buki-generator.png 4-tile (Generation / Best
                Fitness / Total Seeds / Quarantined). Fitness chart +
                Content-Safety + Quarantine-review summary deferred
                to Phase 2 per Step 0 finding (no time-series data
                in the 4 APIs today). */}
            <div
              className="wb-eyebrow"
              data-testid="buki-sage-eyebrow"
              style={{ marginBottom: 8 }}
            >
              SAGE Evolution Engine
            </div>
            <KpiStrip
              module="buki-sage"
              testId="buki-sage-kpi-strip"
              items={
                [
                  // P4 D3 — mirrors the outer KPI band: §5.2 law keeps values
                  // ink (tone is for up/down deltas only) and carries the
                  // design's dim sub-captions. Quarantined dims its own zero
                  // via KpiStrip's --zero cell class.
                  {
                    label: "Generation",
                    value: maxGeneration,
                    sub: "evolution cycles",
                    testId: "buki-sage-kpi-generation",
                  },
                  {
                    label: "Best Fitness",
                    value: bestFitness,
                    sub: "of 100",
                    testId: "buki-sage-kpi-best-fitness",
                  },
                  {
                    label: "Total Seeds",
                    value: totalSeeds,
                    sub: "corpus loaded",
                    testId: "buki-sage-kpi-total-seeds",
                  },
                  {
                    label: "Quarantined",
                    value: quarantinedTotal,
                    sub: quarantinedTotal === 0 ? "queue empty" : "in review",
                    testId: "buki-sage-kpi-quarantined",
                  },
                ] satisfies KpiStripItem[]
              }
            />

            <div className="yr4-section-grid" style={{ marginTop: 16 }}>
              <Panel
                title="Criticity distribution"
                sub="Across loaded seed corpus"
              >
                {cappedSeeds.length === 0 ? (
                  <EmptyState
                    module="buki"
                    state="empty"
                    title="No seed data to chart"
                    sub="Add seed records to the SAGE corpus to see the criticity ribbon."
                    cta={{
                      label: "Open Seeds tab",
                      href: "/admin/buki?tab=generator&gen=seeds",
                    }}
                    testId="buki-dashboard-empty"
                    compact
                  />
                ) : (
                  <div className="yr4-ribbon-row">
                    <span className="yr4-ribbon-cap">
                      Critical · High+Med · Low+Info
                    </span>
                    <Ribbon segs={[...ribbonSegs]} />
                  </div>
                )}
              </Panel>
              <Panel title="Armory KPIs" sub="Aggregates across SAGE corpora">
                <KV rows={dashboardKvRows} />
              </Panel>
            </div>
          </section>
        )}

        {genTab === "seeds" && (
          <section
            {...externalSegmentedPanelProps("buki-generator-panel", "seeds")}
            data-testid="buki-gen-seeds"
          >
            {seedsError !== null && (
              <div
                role="alert"
                data-testid="buki-seeds-error"
                className="yr4-banner tone-red"
              >
                {cap(seedsError, 200)}
                {onRetrySage !== undefined && (
                  <button
                    type="button"
                    className="btn sm"
                    style={{ marginLeft: 10 }}
                    onClick={onRetrySage}
                    data-testid="buki-sage-retry-seeds"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            {!seedsLoading &&
              cappedSeeds.length === 0 &&
              seedsError === null && (
                <EmptyState
                  module="buki"
                  state="empty"
                  title="No seeds in the corpus yet"
                  sub="Add via the SAGE CLI to populate the seed corpus."
                  cta={{ label: "Open SAGE docs", href: "/admin/buki" }}
                  testId="buki-seeds-empty"
                  compact
                />
              )}
            {cappedSeeds.length > 0 && (
              <div
                className="v2-data-scroll"
                data-testid="buki-seeds-list"
                role="table"
                aria-label="Buki SAGE-seed corpus findings with AIVSS"
                tabIndex={0}
              >
                <div
                  role="row"
                  className="yr4-thead-attack"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 100px 90px 130px",
                    gap: 8,
                    padding: "4px 0",
                  }}
                >
                  <span role="columnheader">Seed</span>
                  <span role="columnheader">Category</span>
                  <span role="columnheader">Severity</span>
                  <span role="columnheader">AIVSS</span>
                </div>
                {cappedSeeds.map((s) => (
                  <BukiSeedRow key={s.id} seed={s} />
                ))}
              </div>
            )}
          </section>
        )}

        {genTab === "mutations" && (
          <section
            {...externalSegmentedPanelProps(
              "buki-generator-panel",
              "mutations",
            )}
            data-testid="buki-gen-mutations"
          >
            {mutationsError !== null && (
              <div
                role="alert"
                data-testid="buki-mutations-error"
                className="yr4-banner tone-red"
              >
                {cap(mutationsError, 200)}
                {onRetrySage !== undefined && (
                  <button
                    type="button"
                    className="btn sm"
                    style={{ marginLeft: 10 }}
                    onClick={onRetrySage}
                    data-testid="buki-sage-retry-mutations"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            {!mutationsLoading &&
              cappedMutationsCount === 0 &&
              mutationsError === null && (
                <EmptyState
                  module="buki"
                  state="empty"
                  title="No mutation operators loaded"
                  sub="Mutation operators populate from the SAGE corpus once seeds are imported."
                  cta={{
                    label: "Open Seeds tab",
                    href: "/admin/buki?tab=generator&gen=seeds",
                  }}
                  testId="buki-mutations-empty"
                  compact
                />
              )}
            {cappedMutationsCount > 0 && (
              <>
                <div className="yr4-thead-attack" aria-hidden="true">
                  <span>Operator</span>
                  <span>Category</span>
                  <span>Weight</span>
                </div>
                <div
                  className="yr4-data-list"
                  role="list"
                  data-testid="buki-mutations-list"
                  aria-label="SAGE mutation operators"
                >
                  {mutationsItems.map((item) => (
                    <AttackRow key={item.id ?? item.title} item={item} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {genTab === "quarantine" && (
          <section
            {...externalSegmentedPanelProps(
              "buki-generator-panel",
              "quarantine",
            )}
            data-testid="buki-gen-quarantine"
          >
            {quarantineError !== null && (
              <div
                role="alert"
                data-testid="buki-quarantine-error"
                className="yr4-banner tone-red"
              >
                {cap(quarantineError, 200)}
                {onRetrySage !== undefined && (
                  <button
                    type="button"
                    className="btn sm"
                    style={{ marginLeft: 10 }}
                    onClick={onRetrySage}
                    data-testid="buki-sage-retry-quarantine"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            {!quarantineLoading &&
              cappedQuarantineCount === 0 &&
              quarantineError === null && (
                <EmptyState
                  module="buki"
                  state="empty"
                  title="No items in quarantine"
                  sub="Quarantined seeds appear here after the SAGE pipeline flags them for review."
                  cta={{
                    label: "Open Seeds tab",
                    href: "/admin/buki?tab=generator&gen=seeds",
                  }}
                  testId="buki-quarantine-empty"
                  compact
                />
              )}
            {cappedQuarantineCount > 0 && (
              <>
                <div className="yr4-thead-attack" aria-hidden="true">
                  <span>Seed</span>
                  <span>Status</span>
                  <span>Reason</span>
                </div>
                <div
                  className="yr4-data-list"
                  role="list"
                  data-testid="buki-quarantine-list"
                  aria-label="SAGE quarantine queue"
                >
                  {quarantineItems.map((item) => (
                    <AttackRow key={item.id ?? item.title} item={item} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </section>
  );
}
