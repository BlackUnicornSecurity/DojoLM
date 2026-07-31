// SPDX-License-Identifier: Apache-2.0
/**
 * ScannerClient — YR.4.1 client component for `/admin/scanner`.
 *
 * Live-wires the v2.1 Haiku scanner workbench:
 *   - text input + Run scan POST → /api/scan
 *   - Ribbon for the severity distribution of the latest scan
 *   - AttackRow list of findings (capped, severity-mapped through a static
 *     SEV map — never spliced as a raw `${level}`)
 *   - Collapsed in-session analysis alongside durable History
 *
 * Discriminant-redaction:
 *   - SEVERITY_TO_SEV_LEVEL maps Finding.severity (closed-union) → SevStripLevel
 *   - VERDICT_LABEL maps Verdict → human label
 * No closed-union value participates in an aria-label without going through
 * one of these maps.
 *
 * Caps:
 *   - cap(category, 80), cap(description, 200), capOpt(match, 240)
 *   - .slice(0, MAX_FINDINGS_DISPLAYED) on the findings list
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  type AttackRowItem,
  PageHead,
  Panel,
  Ribbon,
  type RibbonSegment,
  KV,
  externalSegmentedPanelProps,
  SegmentedSubTabs,
  type SegmentedSubTabItem,
  cap,
  capOpt,
  ProtocolFuzzPanel,
} from "@/design";
import type { SevStripLevel } from "@/design";
import { AivssPill } from "@/design/aivss";
import { calculate, type AivssScore } from "bu-tpi/aivss";
import { findingToAivssMetrics } from "@/lib/scanner/aivss-mapping";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { EngineStatusEntry } from "@/design/scanner";
import { DEFAULT_ENGINES } from "@/lib/scanner/engines";
import { type HattoriMode } from "@/design";
import { useScannerEngineToggleState } from "@/lib/scanner/scanner-engine-toggle-state";
import { ScannerEngineControlsPanel } from "./ScannerEngineControlsPanel";
import { ScannerKpiTilesPanel } from "./ScannerKpiTilesPanel";
import {
  FindingsCategoryGroup,
  type CategorizedFindingRow,
} from "./FindingsCategoryGroup";
import { categorizeFinding } from "@/lib/scanner/finding-categorization";
import { ScannerHistoryPanel } from "./ScannerHistoryPanel";
import { ScannerSessionAnalysis } from "./ScannerSessionAnalysis";
import { ScannerScanTab, type AttackMode } from "./ScannerScanTab";
// Epic 3 — Tatami evidence Rail mounted over the run the operator is viewing.
import { ScannerEvidenceRail } from "./ScannerEvidenceRail";
import type { TatamiRailMode, TatamiRailTabId } from "@/design/tatami";
import type { ScanRunRecord } from "@/lib/scan-runs/types";

// HAGANE E2.S2a — wire types, sanitizers, and closed display maps moved
// verbatim to ./scan-codec (this file was 885 LOC, over the 800 cap,
// before the E2.S2b history panel lands).
import {
  SEVERITY_TO_SEV_LEVEL,
  SEVERITY_TO_STATUS,
  VERDICT_LABEL,
  VERDICT_TONE,
  sanitizeScanResponse,
  type Finding,
  type HistoryEntry,
  type ScanErrorCode,
  type ScanResponse,
  type Severity,
  type Verdict,
} from "./scan-codec";

export const MAX_FINDINGS_DISPLAYED = 50;
const MAX_SCAN_INPUT = 10_000;
const PREVIEW_MAX = 80;
const ENGINE_MAX = 64;
const CATEGORY_MAX = 80;
const DESCRIPTION_MAX = 200;
const MATCH_MAX = 240;

function makePreview(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return cap(trimmed, PREVIEW_MAX);
}

function formatTs(ms: number): string {
  return new Date(ms).toLocaleTimeString();
}

function buildHistoryId(): string {
  // Stable enough for a list key in a dev-only ring buffer; no cryptographic claim.
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface AttackToolsResponse {
  readonly tools?: readonly unknown[];
  readonly total?: unknown;
  readonly mode?: unknown;
}

// TICKET-A-405 — Hattori 4-mode display constants extracted to the
// sibling `ScannerEngineControlsPanel.tsx`. Only the runtime guard
// stays here because the parent's GET /api/llm/guard fetch effect
// uses it to narrow the response before passing `platformMode` to the
// child panel.
function isHattoriMode(v: unknown): v is HattoriMode {
  return (
    v === "shinobi" || v === "samurai" || v === "sensei" || v === "hattori"
  );
}

// YR.18 — outer tab strip: Scan / Fuzz. Fuzz tab hosts ProtocolFuzzPanel
// (G-023) which calls /api/buki/fuzz POST. Multimodal input (G-024) is
// HALTED in YR.18 per stop condition — the /api/scan route does not yet
// accept multipart form-data.
// HAGANE E2.S2b — 'history' tab hosts the server-backed scan-run
// history (ScannerHistoryPanel). Tab + run selection hydrate from
// `?tab=` / `?runId=` / `?findingId=` so finding deep links survive
// refresh/share (page.tsx wraps this client in <Suspense> for
// useSearchParams — validation-page template).
type ScannerTabId = "scan" | "fuzz" | "history";
const SCANNER_TAB_LABEL: Record<ScannerTabId, string> = {
  scan: "Scan",
  fuzz: "Protocol fuzz",
  history: "History",
};
const SCANNER_TABS: readonly SegmentedSubTabItem[] = [
  { id: "scan", label: SCANNER_TAB_LABEL.scan },
  { id: "fuzz", label: SCANNER_TAB_LABEL.fuzz },
  { id: "history", label: SCANNER_TAB_LABEL.history },
];

const RUN_ID_PARAM = /^r-[a-z0-9]+-[0-9a-f]{10}$/;

function isScannerTabId(v: unknown): v is ScannerTabId {
  return v === "scan" || v === "fuzz" || v === "history";
}

export interface ScannerClientProps {
  /**
   * Authenticated user id (forwarded from the page-level `resolveYr4PagePrelude`
   * result so the engine-toggle persistence is scoped per-user). Optional
   * because pre-A-405 callers + tests render `<ScannerClient />` without
   * an explicit user; the toggle hook falls back to the 'default' scope.
   */
  readonly userId?: string;
  /**
   * Server-resolved demo mode (page.tsx `isDemoMode()` after auth). Passed to
   * the KPI strip so the design's synthetic headline numbers seed only in demo.
   */
  readonly demo?: boolean;
}

export function ScannerClient({ userId, demo = false }: ScannerClientProps = {}) {
  const [input, setInput] = useState("");
  const [latest, setLatest] = useState<ScanResponse | null>(null);
  const [history, setHistory] = useState<readonly HistoryEntry[]>([]);
  const [error, setError] = useState<ScanErrorCode | null>(null);
  const [loading, setLoading] = useState(false);
  // HAGANE E2.S6 — honest in-flight feedback. The server scan() is
  // synchronous and CANNOT be cancelled (scan/route.ts) — "Stop
  // watching" only abandons the client wait; copy must never claim the
  // scan was cancelled (R14). Elapsed ticks while in flight.
  const abortRef = useRef<AbortController | null>(null);
  const scanInFlightRef = useRef(false);
  const [stoppedWatching, setStoppedWatching] = useState(false);
  const [elapsedS, setElapsedS] = useState(0);

  useEffect(() => {
    if (!loading) return;
    setElapsedS(0);
    const t = setInterval(() => setElapsedS((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  // HAGANE E2.S2b — hydrate tab + run/finding selection from the URL
  // (deep links survive refresh); a bare ?runId= implies the history
  // tab. Sync back via history.replaceState (BushidoTabs precedent —
  // no nav-stack spam, no router re-render).
  const searchParams = useSearchParams();
  const initialRunId = (() => {
    const r = searchParams.get("runId");
    return r !== null && RUN_ID_PARAM.test(r) ? r : null;
  })();
  const initialTab = (() => {
    const t = searchParams.get("tab");
    if (isScannerTabId(t)) return t;
    return initialRunId !== null ? "history" : "scan";
  })();
  const [tab, setTabState] = useState<ScannerTabId>(initialTab);
  const [mountedTabs, setMountedTabs] = useState<ReadonlySet<ScannerTabId>>(
    () => new Set([initialTab]),
  );

  useEffect(() => {
    setMountedTabs((previous) => {
      if (previous.has(tab)) return previous;
      return new Set([...previous, tab]);
    });
  }, [tab]);
  const [selectedRunId, setSelectedRunIdState] = useState<string | null>(
    initialRunId,
  );
  const selectedFindingId = (() => {
    const f = searchParams.get("findingId");
    return f !== null && /^[0-9a-f]{16}$/.test(f) ? f : null;
  })();

  // Epic 3 — Tatami evidence Rail. Read-only: it reflects the run record the
  // history panel has loaded (lifted via `onRunRecordLoaded`, no new fetch).
  // Defaults to collapsed so it ships ~0 JS and never fetches until expanded.
  const [viewedRun, setViewedRun] = useState<ScanRunRecord | null>(null);
  const [railMode, setRailMode] = useState<TatamiRailMode>("collapsed");
  const [railTab, setRailTab] = useState<TatamiRailTabId>("proof");

  const syncUrl = useCallback((nextTab: ScannerTabId, runId: string | null) => {
    const url = new URL(window.location.href);
    if (nextTab === "scan") url.searchParams.delete("tab");
    else url.searchParams.set("tab", nextTab);
    if (runId === null || nextTab !== "history") {
      url.searchParams.delete("runId");
      url.searchParams.delete("findingId");
    } else {
      url.searchParams.set("runId", runId);
    }
    window.history.replaceState(null, "", url.toString());
  }, []);

  const setTab = useCallback(
    (next: ScannerTabId) => {
      setTabState(next);
      syncUrl(next, selectedRunId);
    },
    [syncUrl, selectedRunId],
  );

  // TICKET-A-405 — engine-toggle hook + Hattori platform-mode read.
  // The hook hydrates from localStorage on mount; the platform mode is
  // a one-shot fetch (no SSE) — admin operators reload the page to
  // resync after a /admin/hattori mode change.
  const {
    state: toggleState,
    toggleEngine,
    selectAll: selectAllEngines,
    deselectAll: deselectAllEngines,
    setBlockThreshold,
  } = useScannerEngineToggleState(userId);
  const [platformMode, setPlatformMode] = useState<HattoriMode | null>(null);
  const [platformModeError, setPlatformModeError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth("/api/llm/guard", {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setPlatformModeError("Guard config unavailable");
          return;
        }
        const body = (await res.json().catch(() => null)) as {
          data?: { mode?: unknown };
        } | null;
        if (cancelled) return;
        const mode = body?.data?.mode;
        if (isHattoriMode(mode)) {
          setPlatformMode(mode);
          setPlatformModeError(null);
        } else {
          setPlatformModeError("Guard config shape unexpected");
        }
      } catch {
        if (!cancelled) setPlatformModeError("Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // YR.16 / G-065 — attack-mode state + tool-count refresh on change.
  // Default 'basic'. The fetch is best-effort; a network error keeps
  // the dropdown enabled but surfaces a small disclosure with the
  // last-known count.
  const [attackMode, setAttackMode] = useState<AttackMode>("basic");
  const [attackToolCount, setAttackToolCount] = useState<number | null>(null);
  const [attackToolError, setAttackToolError] = useState<string | null>(null);

  // Refresh the available tool count whenever the operator picks a mode.
  // Runs once on mount with the default. The endpoint is read-only
  // (`createApiHandler{public:true}`), so no CSRF cookie is required.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/atemi/attack-tools?mode=${encodeURIComponent(attackMode)}&limit=1`,
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (!res.ok) {
          setAttackToolError("Tool catalogue unavailable");
          return;
        }
        const body = (await res.json()) as AttackToolsResponse;
        if (cancelled) return;
        if (
          typeof body.total === "number" &&
          Number.isFinite(body.total) &&
          body.total >= 0
        ) {
          setAttackToolCount(Math.trunc(body.total));
          setAttackToolError(null);
        } else {
          setAttackToolError("Tool catalogue shape unexpected");
        }
      } catch {
        if (!cancelled) setAttackToolError("Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attackMode]);

  // HAGANE E3.S4 — runScan extracted from the form handler so the
  // error-banner Retry can re-fire the same submission (#873 pattern).
  const runScan = useCallback(async () => {
    if (scanInFlightRef.current) return;
    const trimmed = input.trim();
    if (!trimmed) {
      setError("input-empty");
      return;
    }
    if (trimmed.length > MAX_SCAN_INPUT) {
      setError("input-too-long");
      return;
    }
    scanInFlightRef.current = true;
    setLoading(true);
    setError(null);
    setStoppedWatching(false);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetchWithAuth("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
        signal: controller.signal,
      });
      if (!res.ok) {
        setError("scan-unavailable");
        return;
      }
      const raw: unknown = await res.json().catch(() => null);
      const body = sanitizeScanResponse(raw);
      if (!body) {
        setError("scan-unavailable");
        return;
      }
      setLatest(body);
      const engine = body.findings[0]?.engine ?? "all";
      setHistory((prev) => [
        {
          id: buildHistoryId(),
          ts: formatTs(Date.now()),
          verdict: body.verdict,
          findings: body.findings.length,
          elapsedMs: Math.round(body.elapsed),
          engine: cap(engine, ENGINE_MAX),
          preview: makePreview(trimmed),
        },
        ...prev,
      ]);
    } catch (err: unknown) {
      // HAGANE E2.S6 — an operator abort is NOT an error: the server
      // scan still completes and persists (run appears in History).
      if (
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        setStoppedWatching(true);
      } else {
        setError("network");
      }
    } finally {
      abortRef.current = null;
      scanInFlightRef.current = false;
      setLoading(false);
    }
  }, [input]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void runScan();
    },
    [runScan],
  );

  const cappedFindings: readonly Finding[] = useMemo(() => {
    if (!latest) return [];
    return latest.findings.slice(0, MAX_FINDINGS_DISPLAYED);
  }, [latest]);

  const ribbonSegs: readonly RibbonSegment[] = useMemo(() => {
    if (!latest) return [];
    return [
      { k: "fail", v: latest.counts.critical },
      { k: "warn", v: latest.counts.warning },
      { k: "pass", v: latest.counts.info },
    ];
  }, [latest]);

  const verdictTone: "red" | "jade" | undefined = latest
    ? VERDICT_TONE[latest.verdict]
    : undefined;
  const verdictText = latest ? VERDICT_LABEL[latest.verdict] : "—";

  const findingsPanelSub = latest
    ? `${cappedFindings.length} of ${latest.findings.length} findings · verdict ${VERDICT_LABEL[latest.verdict]}`
    : "Latest run";

  // TICKET-S-306 fold-in — combined memo replacing the prior parallel-
  // arrays contract (`findingsItems[]` + `findingsCategories[]`). Each
  // row now carries both its `AttackRowItem` and its
  // `FindingCategoryClass` so the consumer cannot silently misalign
  // them. Single derivation from `cappedFindings` keeps the categorize
  // call once-per-finding.
  const findingRows: readonly CategorizedFindingRow[] = useMemo(() => {
    return cappedFindings.map<CategorizedFindingRow>((f, idx) => {
      // ADR-0097 §7 — derive AIVSS client-side from finding category +
      // severity. When the server begins emitting `f.aivss` directly
      // (TICKET-G3-API), the explicit field wins; otherwise we calculate.
      // Wrapped in try/catch so a malformed finding can never crash the
      // findings table — falls back to band='none' chip.
      let aivss: AivssScore | null = f.aivss ?? null;
      if (aivss === null) {
        try {
          aivss = calculate(
            findingToAivssMetrics({
              category: f.category,
              severity: f.severity,
            }),
          );
        } catch (err) {
          // Defensive fallback — preserves the row but flags the regression.
          // A throw here means findingToAivssMetrics or calculate broke for a
          // shape that should have been narrowed by sanitizeFinding upstream.
          console.error("[scanner] AIVSS derivation failed for finding", {
            category: f.category,
            severity: f.severity,
            err,
          });
          aivss = null;
        }
      }
      const pill = aivss ? (
        <AivssPill
          band={aivss.severity}
          score={aivss.base}
          testId={`scanner-aivss-pill-${idx}`}
        />
      ) : (
        <AivssPill band="none" testId={`scanner-aivss-pill-${idx}`} />
      );
      const item: AttackRowItem = {
        id: `f-${idx}`,
        eyebrow: cap(f.engine, ENGINE_MAX),
        title: cap(f.category, CATEGORY_MAX),
        sub: capOpt(f.description, DESCRIPTION_MAX),
        sev: SEVERITY_TO_SEV_LEVEL[f.severity],
        status: SEVERITY_TO_STATUS[f.severity],
        right: pill,
      };
      return {
        item,
        category: categorizeFinding({ category: f.category }),
      };
    });
  }, [cappedFindings]);

  const matchKvRows = useMemo(() => {
    if (!latest) return [];
    return [
      { k: "Verdict", v: VERDICT_LABEL[latest.verdict] },
      { k: "Critical", v: String(latest.counts.critical) },
      { k: "Warning", v: String(latest.counts.warning) },
      { k: "Info", v: String(latest.counts.info) },
      { k: "Elapsed (ms)", v: String(Math.round(latest.elapsed)) },
      { k: "Text length", v: String(latest.textLength) },
    ];
  }, [latest]);

  // TICKET-S-301 / CA-6 — Scanner Engine Stack 13-module status bar.
  // Today the page has no live engine-status feed (deferred to future
  // TICKET-S301-API), so we render the canonical 13 in their default
  // armed state. When the backend lands, swap this for a fetched/SSE-
  // polled `readonly EngineStatusEntry[]` shape — the primitive itself
  // is consumer-agnostic (operator decision 2026-05-04: S-301 owns the
  // shared primitive; A-405 + Workbench reuse without modification).
  const engineStatusEntries: readonly EngineStatusEntry[] = useMemo(
    () =>
      DEFAULT_ENGINES.map((e) => ({
        engineId: e.id,
        status: e.defaultEnabled ? ("active" as const) : ("inactive" as const),
      })),
    [],
  );

  return (
    <>
      <PageHead
        namingId="scanner"
        title="Scanner"
        jp="俳句"
        lede="Live prompt-injection detection and triage."
      />

      {/* Epic 3 — the workbench sits beside the Tatami evidence Rail. The row
          wraps on narrow viewports (rail drops below); PageHead stays full
          width above it. `minWidth: 0` keeps the content column from
          overflowing the flex track. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "var(--space-4)",
        }}
      >
        <div style={{ flex: "1 1 420px", minWidth: 0 }}>
          {/* TICKET-S-302 — Scanner top KPI tiles. */}
          <ScannerKpiTilesPanel demo={demo} />

          <div style={{ marginBottom: "var(--space-3)" }}>
            <SegmentedSubTabs
              items={SCANNER_TABS}
              active={tab}
              onChange={(id) => {
                if (isScannerTabId(id)) setTab(id);
              }}
              ariaLabel="Scanner workbench tabs"
              externalPanelIdPrefix="scanner-panel"
              externalMountedPanelIds={[...mountedTabs]}
            />
          </div>

          {(mountedTabs.has("scan") || tab === "scan") && (
            <section
              {...externalSegmentedPanelProps("scanner-panel", "scan")}
              hidden={tab !== "scan"}
            >
              <Panel
                title="Run a scan"
                headingLevel={2}
                sub="Candidate text runs against every enabled engine"
              >
                <ScannerScanTab
                  latest={latest}
                  verdictTone={verdictTone}
                  verdictText={verdictText}
                  onOpenHistory={() => {
                    setTabState("history");
                    setSelectedRunIdState(latest?.runId ?? null);
                    syncUrl("history", latest?.runId ?? null);
                  }}
                  onSubmit={onSubmit}
                  attackMode={attackMode}
                  onAttackModeChange={(mode) => setAttackMode(mode)}
                  attackToolCount={attackToolCount}
                  attackToolError={attackToolError}
                  input={input}
                  onInputChange={(value) => setInput(value)}
                  maxInputLength={MAX_SCAN_INPUT}
                  loading={loading}
                  elapsedS={elapsedS}
                  onStopWatching={() => abortRef.current?.abort()}
                  stoppedWatching={stoppedWatching}
                  error={error}
                  onRetry={() => void runScan()}
                />
              </Panel>

              <div className="yr4-section-grid">
                <Panel title="Findings" sub={findingsPanelSub}>
                  {/* Column header only fronts a populated table; the empty
                      state below is the design's centered kanji ceremony. */}
                  {findingRows.length > 0 ? (
                    <div className="yr4-thead-attack" aria-hidden="true">
                      <span>Category</span>
                      <span>Status</span>
                      <span>Sev</span>
                      <span>AIVSS</span>
                    </div>
                  ) : null}
                  {/* TICKET-S-306 — V1-canonical findings grouping (Direct Override /
              Jailbreak / Encoded / Other). Empty-state copy preserves the
              prior "no scan run yet" vs "clean" distinction. */}
                  <FindingsCategoryGroup
                    rows={findingRows}
                    emptyMessage={
                      latest ? "Clean — no findings" : "No scan run yet"
                    }
                    emptyHelper={
                      latest
                        ? undefined
                        : "Run a scan and findings land here with category, verdict, and severity."
                    }
                    emptyTestId="scanner-findings-empty"
                  />
                </Panel>

                <Panel title="Severity distribution" sub="Latest run">
                  {latest ? (
                    <>
                      <div className="yr4-ribbon-row">
                        <span className="yr4-ribbon-cap">Severity ribbon</span>
                        <Ribbon segs={[...ribbonSegs]} />
                      </div>
                      <div className="yr4-stack-gap" aria-hidden="true" />
                      <KV rows={matchKvRows} />
                    </>
                  ) : (
                    <>
                      <div
                        className="sevbar zero"
                        aria-label="No scored findings yet"
                      />
                      <div className="sev-counts zero">
                        <span className="k-crit">
                          <b>0</b> critical
                        </span>
                        <span className="k-high">
                          <b>0</b> high
                        </span>
                        <span className="k-med">
                          <b>0</b> medium
                        </span>
                        <span className="k-low">
                          <b>0</b> low
                        </span>
                        <span className="k-clean">
                          <b>0</b> clean
                        </span>
                      </div>
                      <p
                        className="sev-note"
                        data-testid="scanner-distribution-empty"
                      >
                        Run a scan to score the distribution.
                      </p>
                    </>
                  )}
                </Panel>
              </div>

              <ScannerEngineControlsPanel
                toggleState={toggleState}
                toggleEngine={toggleEngine}
                selectAllEngines={selectAllEngines}
                deselectAllEngines={deselectAllEngines}
                setBlockThreshold={setBlockThreshold}
                engineStatusEntries={engineStatusEntries}
                platformMode={platformMode}
                platformModeError={platformModeError}
              />

              <ScannerSessionAnalysis latest={latest} history={history} />
            </section>
          )}

          {(mountedTabs.has("fuzz") || tab === "fuzz") && (
            <section
              {...externalSegmentedPanelProps("scanner-panel", "fuzz")}
              hidden={tab !== "fuzz"}
            >
              <Panel
                title={SCANNER_TAB_LABEL.fuzz}
                headingLevel={2}
                sub="Exercise protocol boundaries and malformed request paths"
              >
                <ProtocolFuzzPanel testId="scanner-fuzz" />
              </Panel>
            </section>
          )}

          {(mountedTabs.has("history") || tab === "history") && (
            <section
              {...externalSegmentedPanelProps("scanner-panel", "history")}
              hidden={tab !== "history"}
            >
              <Panel
                title={SCANNER_TAB_LABEL.history}
                headingLevel={2}
                sub="Review durable scanner runs and finding evidence"
              >
                <ScannerHistoryPanel
                  selectedRunId={selectedRunId}
                  selectedFindingId={selectedFindingId}
                  onSelectRun={(runId) => {
                    setTabState("history");
                    setSelectedRunIdState(runId);
                    syncUrl("history", runId);
                  }}
                  onRunRecordLoaded={setViewedRun}
                />
              </Panel>
            </section>
          )}
        </div>
        <aside
          aria-label="Scanner evidence"
          style={{
            flex: "0 0 auto",
            position: "sticky",
            top: "var(--space-4)",
            alignSelf: "flex-start",
            maxHeight: "calc(100vh - var(--space-6))",
          }}
        >
          <ScannerEvidenceRail
            // The Rail reflects the run the operator is VIEWING — which only
            // happens on the History tab. Gate the prop so the Rail is honestly
            // empty on the Scan / Fuzz tabs (don't rely on unmount timing).
            run={tab === "history" ? viewedRun : null}
            mode={railMode}
            onModeChange={setRailMode}
            activeTab={railTab}
            onTabChange={setRailTab}
          />
        </aside>
      </div>
    </>
  );
}
