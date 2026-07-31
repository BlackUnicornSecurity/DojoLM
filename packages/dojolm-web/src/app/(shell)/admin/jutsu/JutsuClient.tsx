// SPDX-License-Identifier: Apache-2.0
/* eslint-disable no-restricted-syntax -- `llm` is a typed report API scope here, never a retired NavId. */
/**
 * JutsuClient — YR.18 / G-016..G-019 + E-A5 Phase 3 client component
 * for `/admin/jutsu`.
 *
 * 4-tab outer workbench (page-head `<KpiStrip>` with per-KPI sub-captions
 * + single torii-red "Add model" CTA anchored top-right + free-standing
 * underline sub-tabs with count badges + the registry card grid) plus a
 * card-click detail-drawer:
 *   - Models — 4-col card grid sourced from `GET /api/llm/models`,
 *     reproducing the design `.mdl` card: provider eyebrow + mono name +
 *     belt-rank chip + status/guard/risk chips + `UPDATED · MAX TOKENS ·
 *     RESILIENCE` meta triple + a single-row Edit · Test · Delete cluster.
 *     Per-card test-connection (`POST /api/llm/models/[id]/test`) and
 *     delete (ConfirmPhraseModal, phrase = DELETE;
 *     `DELETE /api/llm/models/[id]`). Adding is the header CTA only (the
 *     prior 9th dashed-border tile was removed to match the reference).
 *   - Compare — CompareTab renders the compliance heatmap against
 *     `/api/compliance/transfer-matrix`.
 *   - Jutsu — per-model resilience cards using `<BeltBadge>` (white →
 *     black). Belt source: model.safetyRisk → score map (closed map).
 *   - Coverage — `<CoverageTab>` per-framework coverage from
 *     `/api/llm/coverage`.
 *   - Detail-drawer — opens on Models-card Edit click.
 *
 * Single torii-red CTA discipline (E-A5 Phase B Q3): "Add Model" page-
 * head top-right is the only `btn-primary` on the JutsuClient surface;
 * AddProviderDrawer footer submit + per-row Delete (btn-danger) are
 * carve-outs per E-A4 / E-A7 precedent (form-submit + row mutation).
 *
 * R-T1 discriminant-redaction:
 *   - SAFETY_TO_SEV_LEVEL / SAFETY_LABEL (closed maps over SafetyRisk)
 *   - the retired enum→belt-score map (formerly BeltBadge derivation)
 *   - ERROR_COPY (fixed-vocabulary banner per code)
 *   - isJutsuOuterTab (named predicate on SegmentedSubTabs onChange)
 */

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
// E-A5 Phase B — Darwin-perf rule per the darwin-perf import rule:
// narrow direct-component-path imports (never the bare `@/design` barrel).
// AttackRow + AttackRowItem + AttackRowStatus + SAFETY_TO_STATUS map were
// dropped as part of the V1 card-grid conversion (vertical AttackRow list
// is replaced by a 4-col CSS-grid of model cards).
import { ConsolidatedReportButton } from "@/design/system/ConsolidatedReportButton";
import { ConfirmPhraseModal } from "@/design/system/ConfirmPhraseModal";
import { PageHead } from "@/design/shell/PageHead";
import { RefBlock } from "@/design/shell/RefBlock";
import { KpiStrip, type KpiStripItem } from "@/design/primitives/KpiStrip";
import {
  externalSegmentedPanelProps,
  SegmentedSubTabs,
  type SegmentedSubTabItem,
} from "@/design/primitives/SegmentedSubTabs";
import { cap } from "@/design/primitives/_caps";
import { BeltBadge } from "@/components/ui/BeltBadge";
import type { AivssScore } from "bu-tpi/aivss";
import { readCsrfToken } from "@/lib/csrf-cookie";
import { CompareTab } from "./CompareTab";
import { CoverageTab } from "./CoverageTab";
import { OblTab } from "./OblTab";
import { BatchTab } from "./BatchTab";
import { AddProviderDrawer, type AddProviderError } from "./AddProviderDrawer";
// PR #3 component split — extracted sub-components live in `./_components/`.
// Shared types + tone maps re-imported here for the sanitizer + belt-
// score derivations the orchestrator still drives directly.
import {
  SAFETY_LABEL,
  // The enum→belt-score map was retired per E1-A-RB-15.5 — that
  // operator-enum→score mapping was the same procurement-killer pattern
  // flagged on the Bushido leaderboard. BeltBadge now renders only when real
  // measurement (aivss) is present; "(not assessed)" placeholder
  // otherwise. See types.ts for the full rationale.
  type SafeModelConfig,
  type SafetyRisk,
} from "./_components/types";
import { JutsuModelCard } from "./_components/JutsuModelCard";
import { JutsuModelDetailDrawer } from "./_components/JutsuModelDetailDrawer";
import { SenseiBrainPicker } from "./_components/SenseiBrainPicker";

type OuterTabId = "models" | "compare" | "jutsu" | "coverage" | "obl" | "batch";

const OUTER_TAB_LABEL: Record<OuterTabId, string> = {
  models: "Models",
  compare: "Compare",
  jutsu: "Jutsu",
  coverage: "Coverage",
  obl: "OBL",
  batch: "Batch",
};

const OUTER_TAB_ITEMS: readonly SegmentedSubTabItem[] = [
  { id: "models", label: OUTER_TAB_LABEL.models },
  { id: "compare", label: OUTER_TAB_LABEL.compare },
  { id: "jutsu", label: OUTER_TAB_LABEL.jutsu },
  { id: "coverage", label: OUTER_TAB_LABEL.coverage },
  { id: "obl", label: OUTER_TAB_LABEL.obl },
  { id: "batch", label: OUTER_TAB_LABEL.batch },
];

// E-A5 Phase B — closed-enum R-T1 named predicate replacing the previous
// `id as OuterTabId` cast on `<SegmentedSubTabs onChange>`. Mirrors
// E-A4 `isBukiOuterTab` / E-A7 MED-1 fixup pattern.
function isJutsuOuterTab(value: unknown): value is OuterTabId {
  return (
    value === "models" ||
    value === "compare" ||
    value === "jutsu" ||
    value === "coverage" ||
    value === "obl" ||
    value === "batch"
  );
}

export const MAX_MODELS_DISPLAYED = 50;

type ErrorCode =
  | "load-models"
  | "load-matrix"
  | "add-invalid"
  | "add-forbidden"
  | "add-server"
  | "test-forbidden"
  | "test-server"
  | "delete-forbidden"
  | "delete-server"
  | "network";

const ERROR_COPY: Record<ErrorCode, string> = {
  "load-models": "Could not load models. Refresh in a moment.",
  "load-matrix": "Compliance transfer matrix is unavailable right now.",
  "add-invalid":
    "Provider configuration rejected. Check name, provider id, and model id.",
  "add-forbidden": "Access denied. Sign in as an admin operator.",
  "add-server": "Adding the provider failed. Try again later.",
  "test-forbidden": "Test denied. Sign in as an admin operator.",
  "test-server": "Connection test failed. The model endpoint did not respond.",
  "delete-forbidden": "Delete denied. Sign in as an admin operator.",
  "delete-server": "Delete failed. Try again later.",
  network: "Network error. Try again.",
};

const ADD_ERROR_TO_CODE: Record<AddProviderError, ErrorCode> = {
  invalid: "add-invalid",
  forbidden: "add-forbidden",
  server: "add-server",
  network: "network",
};

function isSafetyRisk(value: unknown): value is SafetyRisk {
  return (
    value === "CRITICAL" ||
    value === "HIGH" ||
    value === "MEDIUM" ||
    value === "LOW" ||
    value === "SAFE"
  );
}

/**
 * Pass-1 fold-in (TICKET-G3-JUTSU mirrors TICKET-G3-RONIN): wire-shape
 * validator for `AivssScore`. Without this, `SafeModelConfig.aivss`
 * would be unreachable and the row's `m.aivss ?? null` guard would
 * always fall through to the suppression placeholder — making the
 * optional field dead code that would silently stay broken when
 * `TICKET-G3-API-JUTSU` ships server-side AIVSS values.
 */
function isAivssSeverity(value: unknown): value is AivssScore["severity"] {
  return (
    value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "low" ||
    value === "none"
  );
}

function sanitizeAivss(raw: unknown): AivssScore | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.base !== "number" || !Number.isFinite(r.base)) return null;
  if (!isAivssSeverity(r.severity)) return null;
  if (typeof r.vector !== "string") return null;
  const temporal =
    typeof r.temporal === "number" && Number.isFinite(r.temporal)
      ? r.temporal
      : null;
  const environmental =
    typeof r.environmental === "number" && Number.isFinite(r.environmental)
      ? r.environmental
      : null;
  return {
    base: r.base,
    temporal,
    environmental,
    severity: r.severity,
    vector: r.vector,
  };
}

function sanitizeModel(raw: unknown): SafeModelConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;
  if (typeof r.provider !== "string" || typeof r.model !== "string")
    return null;
  const enabled = r.enabled === true;
  const safetyRisk = isSafetyRisk(r.safetyRisk) ? r.safetyRisk : undefined;
  const requiresGuard = r.requiresGuard === true;
  const maxTokens =
    typeof r.maxTokens === "number" && Number.isFinite(r.maxTokens)
      ? r.maxTokens
      : undefined;
  const temperature =
    typeof r.temperature === "number" && Number.isFinite(r.temperature)
      ? r.temperature
      : undefined;
  // Pass-1 fold-in (TICKET-G3-JUTSU): forward `aivss` from wire when
  // present. Server-side AIVSS lands here when TICKET-G3-API-JUTSU
  // ships; until then `r.aivss` is undefined and the host renders the
  // suppression placeholder (band='none' AivssPill).
  const aivss = sanitizeAivss(r.aivss);
  // D2: carry the wire `updatedAt` through so the card's `UPDATED` meta
  // cell can render a real last-updated date (the route serializes it).
  const updatedAt = typeof r.updatedAt === "string" ? r.updatedAt : undefined;
  return {
    id: r.id,
    name: r.name,
    provider: r.provider,
    model: r.model,
    enabled,
    safetyRisk,
    requiresGuard,
    maxTokens,
    temperature,
    ...(updatedAt !== undefined ? { updatedAt } : {}),
    ...(aivss !== null ? { aivss } : {}),
  };
}

export function JutsuClient(): ReactElement {
  const [outerTab, setOuterTab] = useState<OuterTabId>("models");
  const [mountedOuterTabs, setMountedOuterTabs] = useState<
    ReadonlySet<OuterTabId>
  >(() => new Set(["models"]));

  useEffect(() => {
    setMountedOuterTabs((previous) => {
      if (previous.has(outerTab)) return previous;
      return new Set([...previous, outerTab]);
    });
  }, [outerTab]);
  const [models, setModels] = useState<readonly SafeModelConfig[]>([]);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, "success" | "failure">
  >({});

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [detailModelId, setDetailModelId] = useState<string | null>(null);

  const refreshModels = useCallback(async () => {
    setLoading(true);
    try {
      // Sensei Rework (Pillar B): this is the model-MANAGEMENT grid, so it
      // must still show the Sensei brain (which is hidden from target lists
      // by default). `?includeBrain=true` keeps it visible here.
      const res = await fetch("/api/llm/models?includeBrain=true", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(body)) {
        setError("load-models");
        setModels([]);
        return;
      }
      const safe: SafeModelConfig[] = [];
      for (const raw of body) {
        const m = sanitizeModel(raw);
        if (m) safe.push(m);
      }
      setModels(safe);
      setError(null);
    } catch {
      setError("network");
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshModels();
  }, [refreshModels]);

  const onTestConnection = useCallback(
    async (id: string) => {
      if (testingId !== null) return;
      setTestingId(id);
      try {
        const csrf = readCsrfToken();
        const res = await fetch(
          `/api/llm/models/${encodeURIComponent(id)}/test`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              ...(csrf ? { "x-csrf-token": csrf } : {}),
            },
            body: JSON.stringify({}),
          },
        );
        if (!res.ok) {
          if (res.status === 401 || res.status === 403)
            setError("test-forbidden");
          else setError("test-server");
          setTestResults((prev) => ({ ...prev, [id]: "failure" }));
          return;
        }
        const body: unknown = await res.json().catch(() => null);
        const success =
          body !== null &&
          typeof body === "object" &&
          (body as Record<string, unknown>).success === true;
        setTestResults((prev) => ({
          ...prev,
          [id]: success ? "success" : "failure",
        }));
        if (!success) setError("test-server");
        else setError(null);
      } catch {
        setError("network");
        setTestResults((prev) => ({ ...prev, [id]: "failure" }));
      } finally {
        setTestingId(null);
      }
    },
    [testingId],
  );

  const onConfirmDelete = useCallback(async () => {
    if (!deleteId || deleting) return;
    setDeleting(true);
    // Founder eye-test 2026-05-20: typing DELETE didn't dismiss the
    // modal when the API rejected (401/403/500) — operator got stuck
    // staring at the confirm modal with no way to escape via the
    // confirm path. Close the modal OPTIMISTICALLY before the API
    // call resolves; any failure surfaces in the page-level error
    // banner outside the modal. The closure captures deleteId's
    // current value so the URL string + EA5-006 source-literal
    // contract stays byte-identical.
    if (detailModelId === deleteId) setDetailModelId(null);
    try {
      const csrf = readCsrfToken();
      const res = await fetch(
        `/api/llm/models/${encodeURIComponent(deleteId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: csrf ? { "x-csrf-token": csrf } : undefined,
        },
      );
      // Dismiss the modal regardless of API outcome — the operator
      // never gets stuck. Error banner on failure tells them to retry.
      setDeleteId(null);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403)
          setError("delete-forbidden");
        else setError("delete-server");
        return;
      }
      await refreshModels();
    } catch {
      setDeleteId(null);
      setError("network");
    } finally {
      setDeleting(false);
    }
  }, [deleteId, deleting, detailModelId, refreshModels]);

  const cappedModels = useMemo(
    () => models.slice(0, MAX_MODELS_DISPLAYED),
    [models],
  );

  const totalModels = models.length;
  const enabledCount = useMemo(
    () => models.filter((m) => m.enabled).length,
    [models],
  );
  const guardRequired = useMemo(
    () => models.filter((m) => m.requiresGuard).length,
    [models],
  );
  const providerNames = useMemo(
    () => [...new Set(models.map((m) => m.provider))],
    [models],
  );
  const providerCount = providerNames.length;
  const standbyCount = totalModels - enabledCount;
  // Design KPI sub-captions (`.kpi .d`). "in the registry" / "route
  // through Guard" are the reference's static copy; the standby count and
  // the provider list are wired live so they never lie.
  const providerSub =
    providerNames.length > 0 ? cap(providerNames.join(" · "), 42) : undefined;

  const detailModel = useMemo(
    () =>
      detailModelId
        ? (models.find((m) => m.id === detailModelId) ?? null)
        : null,
    [detailModelId, models],
  );

  // E-A5 Phase B — the previous `items: AttackRowItem[]` useMemo + the
  // bottom `<Panel title="Lab KPIs">` `kvRows` useMemo + the
  // `SAFETY_TO_STATUS` closed-record were dropped along with the
  // vertical AttackRow list when the Models tab was converted to a V1
  // 4-col card grid. Card-level severity coloring uses
  // `SAFETY_TO_SEV_LEVEL` directly (via `data-sev` attr on the risk
  // pill); KpiStrip already mounts the same aggregate counts that the
  // bottom panel used to render, so the bottom panel was removed for
  // visual coherence (no founder gate required — implicit-decision
  // cleanup per Step 1 mockup-gate doc).

  // D7: the reference tabs are free-standing underline tabs with count
  // badges on Models + Jutsu ("Models 8 | Compare | Jutsu 8 | Coverage"),
  // not a segmented control docked to a "Model lab" panel. Badges are
  // layered onto the frozen OUTER_TAB_ITEMS (kept intact for the EA5-007
  // byte-identical contract) so the key/label literals never move.
  const outerTabItems = useMemo<SegmentedSubTabItem[]>(
    () =>
      OUTER_TAB_ITEMS.map((tab) =>
        tab.id === "models" || tab.id === "jutsu"
          ? { ...tab, badge: { count: totalModels } }
          : tab,
      ),
    [totalModels],
  );

  return (
    <>
      {/* D3 — single torii-red CTA anchored at the header top-right (design
          tier-2 header `.actions`). ConsolidatedReportButton sits beside it
          as a neutral (non-red) action; Add model is the only btn-primary on
          the surface. AddProviderDrawer submit + per-row Delete btn-danger
          are carve-outs per E-A4 / E-A7 precedent (form-submit + row
          mutation, not page-level navigation). */}
      <PageHead
        namingId="jutsu"
        title="Models"
        lede="Model configuration and comparison."
        actions={
          <>
            <ConsolidatedReportButton
              scope="llm"
              testId="jutsu-consolidated-report"
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              data-testid="jutsu-add-model-trigger"
              onClick={() => setAddOpen(true)}
            >
              Add model
            </button>
          </>
        }
      />

      {/* D9 — assistant-model row restored to the reference's bordered panel
          with a horizontal `.asst-bar` (title + helper left, select right). */}
      <div
        className="panel"
        style={{ marginBottom: 16 }}
        data-testid="jutsu-assistant-panel"
      >
        <div className="panel-body">
          <SenseiBrainPicker />
        </div>
      </div>

      {/* D4 — mono-caps KPI labels + mono values come from the systemic
          slice; the per-KPI `sub` captions are wired here from the ref. */}
      <KpiStrip
        module="jutsu"
        testId="jutsu-kpi-strip"
        items={
          [
            { label: "Models", value: totalModels, sub: "in the registry" },
            {
              label: "Active",
              value: enabledCount,
              sub: `${standbyCount} on standby`,
            },
            {
              label: "Guard required",
              value: guardRequired,
              sub: "route through Guard",
            },
            { label: "Providers", value: providerCount, sub: providerSub },
          ] satisfies KpiStripItem[]
        }
      />

      {/* D7 — free-standing underline tabs with count badges, no "Model lab"
          panel wrapper around the grid. */}
      <div style={{ marginTop: 20 }}>
        <SegmentedSubTabs
          items={outerTabItems}
          active={outerTab}
          onChange={(id) => {
            if (isJutsuOuterTab(id)) setOuterTab(id);
          }}
          ariaLabel="Jutsu workbench tabs"
          // P5 prod-parity — the design's Models tabs (wave-g3 .subtabs
          // .st.on) are a filled segmented pill, not an underline bar.
          mode="pill"
          externalPanelIdPrefix="jutsu-panel"
          externalMountedPanelIds={[...mountedOuterTabs]}
        />
      </div>

      {error !== null && (
        <div
          role="alert"
          data-testid="jutsu-error"
          className="yr4-banner tone-red"
          style={{ marginTop: 12 }}
        >
          {ERROR_COPY[error]}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {(mountedOuterTabs.has("models") || outerTab === "models") && (
          <section
            {...externalSegmentedPanelProps("jutsu-panel", "models")}
            hidden={outerTab !== "models"}
            data-testid="jutsu-models-tab"
          >
            {!loading && cappedModels.length === 0 && error === null && (
              <p className="wb-hint" data-testid="jutsu-empty">
                No models registered. Use “Add model” above to register one.
              </p>
            )}

            {/* Registry card grid (design wave-g3 `.mdl-grid` — 4-col at
                1440, D12). Per-model `<article>` bodies live in
                `./_components/JutsuModelCard`; the orchestrator owns the grid
                container + the state that drives card props. D11 — the prior
                9th dashed-border "Add Model" tile was removed (the reference
                grid holds exactly the model cards; adding is the header CTA). */}
            <div
              className="jutsu-model-grid"
              data-testid="jutsu-models-list"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(min(272px, 100%), 1fr))",
                gap: 12,
              }}
            >
              {cappedModels.map((m) => (
                <JutsuModelCard
                  key={m.id}
                  model={m}
                  testingId={testingId}
                  deleting={deleting}
                  onDetail={setDetailModelId}
                  onTest={onTestConnection}
                  onDelete={setDeleteId}
                />
              ))}
            </div>

            {/* P2c (2026-07-16) — audit D6: below-grid registry caption +
                Arena / Evaluations cross-links restored from wave-g3
                "Models v2.html". Copy verbatim; counts stay live. */}
            {totalModels > 0 && (
              <div
                className="tbl-foot"
                style={{ paddingLeft: 2 }}
                data-testid="jutsu-registry-foot"
              >
                {totalModels} models · {enabledCount} active ·{" "}
                {totalModels - enabledCount} on standby — resilience scores
                are self-attested by each provider record until an evaluation
                measures them
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              <RefBlock
                kj="組"
                title="Arena"
                sub="Put two of these models head-to-head in a sparring match"
                href="/admin/arena"
                linkLabel="Open in Arena →"
              />
            </div>
            {/* The design's Evaluations ref-block carries no kanji mark —
                plain .ref-block markup keeps it verbatim. */}
            <div
              className="ref-block"
              style={{ marginTop: 10 }}
              data-testid="jutsu-eval-refblock"
            >
              <span className="t">Evaluations</span>
              <span className="s">
                Score the registry with a run to populate resilience belts and
                coverage
              </span>
              <a href="/admin/eval">Open in Evaluations →</a>
            </div>
          </section>
        )}

        {(mountedOuterTabs.has("compare") || outerTab === "compare") && (
          <section
            {...externalSegmentedPanelProps("jutsu-panel", "compare")}
            hidden={outerTab !== "compare"}
            data-testid="jutsu-compare-tab"
          >
            <CompareTab
              active={outerTab === "compare"}
              onLoadError={() => setError("load-matrix")}
            />
          </section>
        )}

        {(mountedOuterTabs.has("jutsu") || outerTab === "jutsu") && (
          <section
            {...externalSegmentedPanelProps("jutsu-panel", "jutsu")}
            hidden={outerTab !== "jutsu"}
            data-testid="jutsu-jutsu-tab"
          >
            {!loading && cappedModels.length === 0 && (
              <p className="wb-hint" data-testid="jutsu-jutsu-empty">
                No models registered.
              </p>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {cappedModels.map((m) => {
                // E1-A-RB-15.5: render <BeltBadge> only when real measurement
                // (aivss) is present. Operator-attested safetyRisk alone is
                // NOT a score and must not be mapped to a 0-95 number — the
                // enum→belt-score constant has been retired. Real
                // measurement flows in via E1-PHASE-4-M4 verdict-to-run
                // binding once the Kokugikan submission pipe (Phase-3-A
                // backbone) carries per-model aivss scores derived from
                // OWASP LLM01 probe runs (RB-2).
                // AIVSS base 0-10 risk → BeltBadge 0-95 resilience (invert + clamp)
                const measuredScore =
                  m.aivss && typeof m.aivss.base === "number"
                    ? Math.max(
                        0,
                        Math.min(95, 95 - Math.round(m.aivss.base * 9.5)),
                      )
                    : null;
                return (
                  <div
                    key={m.id}
                    data-testid={`jutsu-belt-card-${m.id}`}
                    style={{
                      padding: 10,
                      border: "1px solid var(--b-1)",
                      borderRadius: 6,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 6,
                      }}
                    >
                      <strong style={{ fontSize: 12 }}>
                        {cap(m.name, 32)}
                      </strong>
                      {measuredScore !== null ? (
                        <BeltBadge score={measuredScore} size="sm" />
                      ) : (
                        <span
                          data-testid={`jutsu-belt-card-${m.id}-not-assessed`}
                          className="wb-hint"
                          style={{ fontSize: 11, fontStyle: "italic" }}
                        >
                          (not assessed)
                        </span>
                      )}
                    </div>
                    <div
                      className="wb-hint"
                      style={{ fontSize: 11, marginTop: 4 }}
                    >
                      {cap(m.provider, 24)} · {cap(m.model, 32)}
                    </div>
                    <div
                      className="wb-hint"
                      style={{ fontSize: 11, marginTop: 2 }}
                    >
                      {m.safetyRisk
                        ? `${SAFETY_LABEL[m.safetyRisk]} (operator-attested)`
                        : "no risk telemetry yet"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {(mountedOuterTabs.has("coverage") || outerTab === "coverage") && (
          <section
            {...externalSegmentedPanelProps("jutsu-panel", "coverage")}
            hidden={outerTab !== "coverage"}
            data-testid="jutsu-coverage-tab-wrap"
          >
            <CoverageTab active={outerTab === "coverage"} />
          </section>
        )}

        {(mountedOuterTabs.has("obl") || outerTab === "obl") && (
          <section
            {...externalSegmentedPanelProps("jutsu-panel", "obl")}
            hidden={outerTab !== "obl"}
            data-testid="jutsu-obl-tab-wrap"
          >
            <OblTab active={outerTab === "obl"} />
          </section>
        )}

        {(mountedOuterTabs.has("batch") || outerTab === "batch") && (
          <section
            {...externalSegmentedPanelProps("jutsu-panel", "batch")}
            hidden={outerTab !== "batch"}
            data-testid="jutsu-batch-tab-wrap"
          >
            <BatchTab active={outerTab === "batch"} />
          </section>
        )}
      </div>

      {/* E-A5 Phase B — the prior bottom `<Panel title="Lab KPIs">` +
          `<KV rows={kvRows}>` block was removed: it duplicated the
          page-head KpiStrip data verbatim (Models / Active / Archived
          / Guard required / Providers). Implicit-decision cleanup per
          Step 1 mockup-gate doc (no founder gate required). */}

      <AddProviderDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmitted={refreshModels}
        onError={(code) => setError(ADD_ERROR_TO_CODE[code])}
      />

      <JutsuModelDetailDrawer
        model={detailModel}
        testResult={detailModel ? testResults[detailModel.id] : undefined}
        onClose={() => setDetailModelId(null)}
      />

      <ConfirmPhraseModal
        isOpen={deleteId !== null}
        title="Delete model"
        description={
          deleteId
            ? `Delete model "${deleteId}". This cannot be undone. Type DELETE to confirm.`
            : ""
        }
        // Founder eye-test 2026-05-19 fix: confirm phrase was `deleteId`
        // (the model id) which contains characters like ":" "/" "-" and
        // model-vendor-specific Unicode that operators couldn't reliably
        // type — blocked any model deletion from the Jutsu surface. The
        // model id is still rendered into the description text so the
        // operator sees WHICH model they are deleting; only the confirm
        // phrase is the literal `DELETE` token.
        phrase="DELETE"
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        onConfirm={onConfirmDelete}
        onClose={() => {
          // Founder eye-test 2026-05-20: when `deleting` got stuck at
          // `true` (API hang / demo-mode rejection), the previous
          // `if (!deleting)` gate trapped the operator — Cancel/Esc/
          // backdrop click all did nothing. ALWAYS dismiss + reset
          // `deleting` so no path can deadlock the modal.
          setDeleteId(null);
          setDeleting(false);
        }}
      />
    </>
  );
}
