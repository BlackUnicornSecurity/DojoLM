// SPDX-License-Identifier: Apache-2.0
/* eslint-disable no-restricted-syntax -- `atemi` is the canonical route-naming and EmptyState product id here, never a NavId. */
/**
 * /admin/atemi — Atemi Lab control panel (V1 restoration + V2 viewer).
 *
 * Admin-only (role enforced by the admin layout + API route-guard).
 * Flag-gated by `ATEMI_ENABLED` — when disabled the API returns 404 and
 * this page renders a disabled banner instead of the panel.
 *
 * This page is DELIBERATELY read-only for ToS records. State
 * transitions (attest, activate, revoke) are issued from the signed-
 * attestation admin CLI (future PR). The viewer exists so operators
 * can audit which (vendor, targetId) tuples are dispatch-eligible.
 *
 * Production-warning banner: the Vault-backed KmsVault is deferred
 * (ADR-0002). Dev/test uses InMemoryKmsVault. The banner surfaces this
 * so operators don't mistake the dev adapter for the production one.
 *
 * Layout (E-A7 Phase B, 2026-05-18):
 *   page-head action row    — "Record" page-head CTA (single torii-red) + sub-line
 *   <ModuleOnboarding>      — 3-step Getting Started card (Records-tab only)
 *   <McpConnectorStatus>    — MCP connection posture (promoted top placement)
 *   <ModeSelector>          — 4-mode attack-mode strip (controls Skills filter)
 *   <KpiStrip>              — 4-tile at-a-glance (Active / Attested / Pending / Total)
 *   <SegmentedSubTabs>      — 5 outer tabs (records / skills / playbooks / sessions / recon)
 *   Records body            — WorkbenchShell (config rail / canvas / inspector)
 *
 * Deep-link consumer (E-A7 Phase B / Bushido→Atemi monetizable loop):
 *   ?control=<code>&framework=<fw>&prefill=true switches outerTab → records
 *   and, when prefill=true, auto-opens the EXECUTE PROBE phrase modal.
 *
 * Epic 7 S7.5 · Edge-state matrix:
 *   loading              → <p role="status">Fetching attestations…</p>
 *   empty                → <p data-testid="atemi-empty">
 *   filter-empty         → <p data-testid="atemi-filter-empty">
 *   error                → <div data-testid="atemi-error" className="wb-banner danger">
 *   pending-attestation  → <SystemBanner testId="pending-attestation-banner"> (any row in pending)
 *   populated            → <table data-testid="atemi-records-table">
 *
 * Epic 7 S7.4 · Phrase site:
 *   EXECUTE PROBE (page-head Record CTA — wired to POST /api/admin/atemi/probe.
 *                  On 2xx the returned fleet summary is appended to the
 *                  history panel; on non-2xx the error string surfaces
 *                  through the `atemi-probe-error` banner.)
 */

"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
// E-A7 darwin-perf fix 2026-05-18: sub-barrel imports above
// (@/design/shell + @/design/workbench + @/design/system + @/design/primitives
// + @/design/adversarial) made vitest hang on darwin at module load —
// 5-barrel cumulative transitive load exceeded darwin's vitest threshold
// even with the narrow-import rule applied. Direct-component-path imports
// bypass the sub-barrel cascade entirely. Per
// the darwin-perf import rule.
import { PageHead } from "@/design/shell/PageHead";
import { Panel } from "@/design/shell/Panel";
import { ConfirmPhraseModal } from "@/design/system/ConfirmPhraseModal";
import { SystemBanner } from "@/design/system/SystemBanner";
import { EmptyState } from "@/design/system/EmptyState";
import { KpiStrip, type KpiStripItem } from "@/design/primitives/KpiStrip";
import {
  ModeSelector,
  type ModeSelectorItem,
} from "@/design/primitives/ModeSelector";
import {
  externalSegmentedPanelProps,
  SegmentedSubTabs,
  type SegmentedSubTabItem,
} from "@/design/primitives/SegmentedSubTabs";
import {
  SkillsLibraryTab,
  PlaybooksTab,
  SessionsTab,
  ConceptReconTab,
  type AtemiAttackMode,
} from "./AtemiTabs";
import { AtemiRecordsTab } from "./_components/AtemiRecordsTab";
import type {
  ListResponse,
  McpStatusResponse,
  ProbeFleetResponse,
  ProbeHistoryEntry,
  TosRecord,
} from "./_components/types";
import {
  EXECUTE_PROBE_PHRASE,
  capParam,
  deriveDefenseDegradation,
} from "./_components/atemi-helpers";

// YR.20 outer-tab strip — extends the existing single-screen Records
// workbench with 4 sibling tabs (Skills / Playbooks / Sessions /
// Concept Recon) per gap-matrix G-062 / G-063 / G-064. The existing
// Records UI stays the default so existing /admin/atemi page tests
// continue to assert on the same testids without navigation.
type AtemiOuterTab = "records" | "skills" | "playbooks" | "sessions" | "recon";
const OUTER_TAB_LABEL: Record<AtemiOuterTab, string> = {
  records: "Records",
  skills: "Skills library",
  playbooks: "Playbooks",
  sessions: "Sessions",
  recon: "Concept recon",
};
const OUTER_TAB_ORDER: readonly AtemiOuterTab[] = [
  "records",
  "skills",
  "playbooks",
  "sessions",
  "recon",
];

/**
 * R-T1 closed-enum guard for SegmentedSubTabs onChange. Mirrors the
 * `isInnerTab` (Bushido E-A15) + `isBukiOuterTab` (Buki E-A4) named-
 * predicate pattern. Cross-epic audit 2026-05-19 flagged the prior
 * inline `(OUTER_TAB_ORDER as readonly string[]).includes(id)` plus
 * `id as AtemiOuterTab` cast as the only Phase-3 epic NOT using the
 * named predicate; this closes that pattern gap.
 */
function isAtemiOuterTab(id: string): id is AtemiOuterTab {
  return (OUTER_TAB_ORDER as readonly string[]).includes(id);
}

// P2d (audit D7/D11) — MCP connector posture is rendered as the designed
// "Target connection" panel (below), so the primitive + its exported type
// are gone; the local union keeps the fetch state typed.
type McpConnectorState = "pending" | "connected" | "disconnected" | "error";

// E-A7 Phase B — 4-mode ModeSelector items per V1 v1-05-adversarial-atemi
// reference + YR.16 / G-065 server-side severity allow-list. `tone="steel"`
// per Step 1 founder decision Q4 (Scope C B.5).
// P2d (audit D10) — plain-English mode descriptions (the design drops the
// ALL-CAPS severity enums); helper reads "connector traffic", not "MCP".
const ATTACK_MODE_ITEMS: readonly ModeSelectorItem[] = [
  {
    id: "passive",
    title: "Passive",
    description: "Observe only — no active attacks",
    helperText:
      "Observation only — no active attacks. Monitors for anomalous connector traffic.",
  },
  {
    id: "basic",
    title: "Basic",
    description: "Low-risk probes — through medium",
    helperText:
      "Low-risk probes — through medium severity. Suitable for routine pre-prod regression.",
  },
  {
    id: "advanced",
    title: "Advanced",
    description: "Active exploits — through high",
    helperText:
      "Active exploits — through high severity. Use in dedicated test environments.",
  },
  {
    id: "aggressive",
    title: "Aggressive",
    description: "Full suite — through critical",
    helperText:
      "Full suite — through critical severity. Reserve for red-team capacity-reserved runs.",
  },
];

function AdminAtemiPageBody() {
  const searchParams = useSearchParams();

  // E-A7 Phase B — deep-link consumer (Bushido→Atemi monetizable loop).
  // Read once at mount; subsequent navigation within the page uses local
  // state. The URL is treated as the seed, not the source-of-truth.
  const deepLinkControl = useMemo(
    () => capParam(searchParams?.get("control") ?? null),
    [searchParams],
  );
  const deepLinkFramework = useMemo(
    () => capParam(searchParams?.get("framework") ?? null),
    [searchParams],
  );
  const deepLinkPrefill = useMemo(
    () => (searchParams?.get("prefill") ?? "").toLowerCase() === "true",
    [searchParams],
  );

  // Outer tab seed: deep-link with a control param lands on Records.
  // Otherwise the default tab is Records too (unchanged behaviour).
  const [outerTab, setOuterTab] = useState<AtemiOuterTab>("records");
  const [mountedOuterTabs, setMountedOuterTabs] = useState<
    ReadonlySet<AtemiOuterTab>
  >(() => new Set(["records"]));

  useEffect(() => {
    setMountedOuterTabs((previous) => {
      if (previous.has(outerTab)) return previous;
      return new Set([...previous, outerTab]);
    });
  }, [outerTab]);

  const [records, setRecords] = useState<readonly TosRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Filter state (vendor + state) now lives inside `AtemiRecordsTab`; only the
  // Records tab consumes it. See `_components/AtemiRecordsTab.tsx`.
  // Probe execution state. Epic 9 S9.2 wires the confirm to the real
  // fleet-wide probe endpoint; on 2xx the summary is appended to
  // probeHistory so the inspector renders the activity; on non-2xx
  // probeError is set and the `atemi-probe-error` banner surfaces the
  // server message (ATEMI disabled → 404; KILL_ATEMI armed → 403; etc).
  const [showProbeModal, setShowProbeModal] = useState(false);
  const [probeHistory, setProbeHistory] = useState<
    readonly ProbeHistoryEntry[]
  >([]);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [probeBusy, setProbeBusy] = useState(false);

  // E-A7 Phase B — 4-mode attack mode state. Default `passive`. Lives
  // at the page level so the Skills tab + the ModeSelector strip share
  // the same source of truth.
  const [attackMode, setAttackMode] = useState<AtemiAttackMode>("passive");

  // E-A7 Phase B — MCP connector status (promoted to top placement).
  // Lazy-fetches /api/mcp/status once on mount; consumers can hit the
  // primitive's "Refresh" button to re-probe.
  const [mcpState, setMcpState] = useState<McpConnectorState>("pending");
  const [mcpLatencyMs, setMcpLatencyMs] = useState<number | undefined>(
    undefined,
  );
  const [mcpMode, setMcpMode] = useState<string | undefined>(undefined);
  const [mcpUptimeS, setMcpUptimeS] = useState<number | undefined>(undefined);
  const [mcpLastError, setMcpLastError] = useState<string | undefined>(
    undefined,
  );
  const [mcpRefreshTick, setMcpRefreshTick] = useState(0);

  // HAGANE re-audit 2026-06-14 (B9) — records fetch extracted to a useCallback
  // so the atemi-error banner can offer a Retry. The flag-off 404 still routes
  // to the early-return EmptyState (page.tsx flag-off branch), so a *visible*
  // Retry only ever re-runs a genuine network/HTTP failure.
  const reloadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/atemi", { cache: "no-store" });
      if (res.status === 404) {
        setError("ATEMI feature flag disabled");
        setRecords([]);
        return;
      }
      const body = (await res.json()) as ListResponse;
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        setRecords([]);
        return;
      }
      setRecords(body.records ?? []);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadRecords();
  }, [reloadRecords]);

  // E-A7 Phase B — MCP connector fetch (refetch on mcpRefreshTick).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth("/api/mcp/status", {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setMcpState("error");
          setMcpLastError(`HTTP ${res.status}`);
          return;
        }
        const body = (await res.json().catch(() => ({}))) as McpStatusResponse;
        if (cancelled) return;
        const connected = body.connected === true;
        setMcpState(connected ? "connected" : "disconnected");
        if (typeof body.latency === "number") setMcpLatencyMs(body.latency);
        if (body.server?.mode) setMcpMode(body.server.mode);
        if (typeof body.server?.uptime === "number")
          setMcpUptimeS(body.server.uptime);
        if (typeof body.lastError === "string") {
          setMcpLastError(body.lastError);
        } else {
          setMcpLastError(undefined);
        }
      } catch {
        if (!cancelled) {
          setMcpState("error");
          setMcpLastError("Network error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mcpRefreshTick]);

  // E-A7 Phase B — deep-link arrival: switch outer tab to records when a
  // control param is present. The previous version of this effect ALSO
  // auto-opened the EXECUTE_PROBE confirm-phrase modal when `?prefill=true`
  // was set on the URL. That was hostile UX (auto-opening a destructive
  // confirm-phrase modal over the operator's first paint) AND a real
  // production blocker — founder eye-test 2026-05-19 reported the modal
  // popping over /admin/atemi blocking any review of the surface. The
  // deep-link context banner below (line ~744) still signals "Arrived
  // from compliance" + the control id, so the operator-flow is preserved;
  // operator explicitly clicks "Record" to open the modal.
  useEffect(() => {
    if (loading) return;
    if (!deepLinkControl) return;
    setOuterTab("records");
  }, [loading, deepLinkControl]);

  // Summary counts drive the Inspector panel. Unfiltered (reflects the
  // underlying fetch) so operators see fleet state regardless of filter.
  const summary = useMemo(() => {
    let active = 0;
    let attested = 0;
    let pending = 0;
    for (const r of records) {
      if (r.state === "active") active += 1;
      else if (r.state === "attested") attested += 1;
      else pending += 1;
    }
    return { active, attested, pending, total: records.length };
  }, [records]);

  // Epic 7 S7.5 — pending-attestation is a fleet-level edge state
  // (any registered tuple awaiting signature). Gate on summary.pending
  // > 0 so the banner does not leak during load or on an empty fleet.
  const hasPendingAttestation = !loading && !error && summary.pending > 0;

  // Atemi-PR-5 — DefenseDegradationIndicator wiring. Aggregates the most
  // recent probe-history entries into a `level / score / breachCount`
  // posture summary. "Errors" is the placeholder breach proxy until the
  // backend ships a dedicated bypass-detection signal; the primitive's
  // own clamps (NaN/Infinity/string-cap) defend the DOM even if upstream
  // data drifts. Recomputes only when probeHistory changes.
  const defenseDegradation = useMemo(
    () => deriveDefenseDegradation(probeHistory),
    [probeHistory],
  );

  // P2d — posture is "Untested" until at least one probe pass has run;
  // the connection chip only goes jade when the MCP transport is up.
  const mcpConnected = mcpState === "connected";
  const postureTested = probeHistory.length > 0;

  async function onConfirmProbe() {
    // Epic 9 S9.2 — fire the fleet-wide probe via POST
    // /api/admin/atemi/probe. Empty body; the endpoint iterates every
    // active tuple and returns a synchronous summary. On non-2xx
    // (ATEMI disabled, KILL_ATEMI armed, etc.) surface the server's
    // error string through the dedicated error banner.
    setShowProbeModal(false);
    setProbeBusy(true);
    setProbeError(null);
    try {
      // fetchWithAuth attaches the `x-csrf-token` double-submit header
      // from the `tpi_csrf` cookie on every state-mutating request so
      // the admin route-guard accepts the POST.
      const res = await fetchWithAuth("/api/admin/atemi/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) message = body.error;
        } catch {
          // Body wasn't JSON — keep the HTTP status as the message.
        }
        setProbeError(message);
        return;
      }
      const body = (await res.json()) as ProbeFleetResponse;
      setProbeHistory((prev) => [
        {
          ts: new Date().toISOString(),
          started: body.started,
          skipped: body.skipped,
          errors: body.errors,
          durationMs: body.durationMs,
        },
        ...prev,
      ]);
    } catch {
      setProbeError("Network error");
    } finally {
      setProbeBusy(false);
    }
  }

  // E-A7 Phase B — disable the page-head Record CTA mirrors the V2
  // Inspector button gating: cannot fire when ATEMI is loading,
  // disabled, or there are no active tuples; also disabled during an
  // in-flight probe.
  const recordDisabled =
    loading || error !== null || summary.active === 0 || probeBusy;
  const recordAriaLabel =
    summary.active === 0
      ? "No active tuples — cannot execute probe"
      : probeBusy
        ? "Probe in flight…"
        : "Record a fleet-wide probe pass (Execute probe)";

  // TICKET-ATEMI-PAGE-FLAG-GATE — early-return EmptyState wrapper when
  // the ATEMI_ENABLED flag is OFF (the API returns 404 → the records
  // useEffect sets this exact sentinel error string). Pre-fix the
  // page rendered the full chrome (PageHead + ModeSelector + KpiStrip
  // + McpConnectorStatus + tab strip + Records body) on top of the
  // error banner, which is confusing — the McpConnectorStatus chip,
  // probe-history table, and all other surfaces don't apply when the
  // feature is gated. Mirrors the `/admin/buki/page.tsx` flag-off
  // EmptyState pattern. Founder gestalt eye-test 2026-05-21 flagged
  // this as a UX-correctness issue alongside the MCP primitive polish.
  if (error === "ATEMI feature flag disabled") {
    return (
      <div data-testid="admin-atemi-flag-off">
        <EmptyState
          module="atemi"
          state="disabled"
          title="Adversarial probe lab is disabled"
          sub="Atemi runs prompt-injection, jailbreak, and tool-abuse probes against a chosen target model and records every attempt. Enable the Atemi feature flag to access the probe controls, MCP connector status, attack-mode playbooks, and session log."
          testId="admin-atemi-flag-off-empty"
        />
      </div>
    );
  }

  return (
    <div data-testid="admin-atemi-page">
      {/* P2d (audit D2/D14) — the page head carries no action button; the
          view's single torii-red primary ("Record a probe pass") lives in
          the Probe-records panel header per the wave-g2 reference. */}
      <header style={{ padding: "16px 24px 0" }}>
        <PageHead namingId="atemi" title="Live practice" jp="当身" />
      </header>

      {/* E-A7 Phase B — deep-link context chip. Renders a small read-only
          banner above the chrome when a Bushido→Atemi deep-link arrives
          carrying a control/framework. The chip is non-interactive — it
          only signals "you arrived here from a compliance control". */}
      {deepLinkControl !== null && (
        <div style={{ padding: "12px 24px 0" }}>
          <SystemBanner
            active={true}
            tone="info"
            title="Test in Atemi"
            testId="atemi-deeplink-context"
          >
            Arrived from compliance{" "}
            <strong data-testid="atemi-deeplink-control">
              {deepLinkControl}
            </strong>
            {deepLinkFramework !== null && (
              <>
                {" "}
                in framework{" "}
                <strong data-testid="atemi-deeplink-framework">
                  {deepLinkFramework}
                </strong>
              </>
            )}
            .
            {deepLinkPrefill &&
              " Probe modal opened automatically — confirm or stand down."}
          </SystemBanner>
        </div>
      )}

      {/* P2d (audit D7/D8/D11) — the paired first row: "Target connection"
          + "Defense posture" as designed Panels (Inter H3 titles, neutral
          posture, no jade chrome on an untested fleet). Replaces the
          McpConnectorStatus + DefenseDegradationIndicator primitives whose
          mono-caps titles and jade "Stable" state broke the color/type
          laws. */}
      <div style={{ padding: "12px 24px 0" }}>
        <div className="g2-wide">
          <div data-testid="atemi-target-connection">
            <Panel
              headingLevel={2}
              title="Target connection"
              sub="Model connector for this deployment"
              meta={
                <span className="end" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className={mcpConnected ? "chip jade" : "chip"}>
                    <span
                      className={mcpConnected ? "dot" : "dot quiet"}
                      aria-hidden="true"
                    />
                    {mcpConnected ? "Connected" : "Disconnected"}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setMcpRefreshTick((n) => n + 1)}
                    data-testid="atemi-target-reconnect"
                  >
                    Reconnect
                  </button>
                </span>
              }
            >
              <div className="drows">
                <div className="drow">
                  <span className="l">Latency</span>
                  <span className={mcpLatencyMs !== undefined ? "v" : "v dim"}>
                    {mcpLatencyMs !== undefined ? `${mcpLatencyMs} ms` : "—"}
                  </span>
                </div>
                <div className="drow">
                  <span className="l">Mode</span>
                  <span className={mcpMode !== undefined ? "v" : "v dim"}>
                    {mcpMode ?? "Not connected"}
                  </span>
                </div>
                <div className="drow">
                  <span className="l">Uptime</span>
                  <span className={mcpUptimeS !== undefined ? "v" : "v dim"}>
                    {mcpUptimeS !== undefined ? `${mcpUptimeS}s` : "—"}
                  </span>
                </div>
              </div>
              <p className="wb-hint" style={{ marginTop: 12 }}>
                Connect a target from the model selector above, then choose an
                attack mode. Nothing runs until a target is connected.
              </p>
            </Panel>
          </div>

          <div data-testid="atemi-defense-posture">
            <Panel
              headingLevel={2}
              title="Defense posture"
              sub="Scored from probe results"
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontWeight: 600,
                    fontSize: 32,
                    color: "var(--fg-dim)",
                  }}
                >
                  {postureTested ? defenseDegradation.score : "—"}
                </span>
                <span style={{ fontSize: 13, color: "var(--fg-dim)" }}>
                  / 100
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <span className="chip">
                  <span className="dot quiet" aria-hidden="true" />
                  {postureTested ? "Scored" : "Untested"}
                </span>
              </div>
              <p className="wb-hint" style={{ marginTop: 12 }}>
                {postureTested
                  ? `${defenseDegradation.breachCount} breaches recorded across ${probeHistory.length} probe runs.`
                  : "No probes run yet · 0 breaches recorded. Run a probe pass to score posture."}
              </p>
            </Panel>
          </div>
        </div>
      </div>

      {/* P2d (audit D10) — visible "Attack mode" zone title above the mode
          strip (was sr-only; the design shows it as a zone divider). */}
      <div style={{ padding: "12px 24px 0" }}>
        <div className="zone-title">
          <h2 id="atemi-mode-selector-heading">Attack mode</h2>
          <span className="sub">
            Sets the severity ceiling for everything you run
          </span>
        </div>
        <ModeSelector
          variant="rich"
          tone="steel"
          ariaLabelledBy="atemi-mode-selector-heading"
          items={ATTACK_MODE_ITEMS}
          active={attackMode}
          onChange={(id) => {
            // Closed-set narrowing — the primitive only fires onChange
            // with id values from `items`, so the cast is safe here.
            if (
              id === "passive" ||
              id === "basic" ||
              id === "advanced" ||
              id === "aggressive"
            ) {
              setAttackMode(id);
            }
          }}
          testId="atemi-mode-selector"
        />
      </div>

      <div style={{ padding: "12px 24px 0" }}>
        {/* Stage 2 brutal-review UI-112 (Bartłomiej Wójcik): V3 KpiStrip
            stripped the V1 sub-line text + helpful context — first
            paint reads as "nothing is happening here" when summary
            values are 0. Sub-line restoration via the KpiStripItem.delta
            slot with direction='flat' (no trend indicator). Labels +
            values stay on the V3 attestation-state semantics (Active /
            Attested / Pending / Total mapping to the records lifecycle);
            sub-lines describe what each counter actually means so an
            operator landing cold understands the model. */}
        {/* P2d (audit D6) — labels + captions per the wave-g2 reference;
            values are ink (no tone re-tint — the "Registered" KPI was
            painting the count red). Zeros render dim via §5.2. */}
        <KpiStrip
          module="adversarial"
          testId="atemi-kpi-strip"
          items={
            [
              {
                label: "Active targets",
                value: summary.active,
                testId: "atemi-kpi-active",
                delta: {
                  direction: "flat",
                  value: `of ${summary.total} registered`,
                },
              },
              {
                label: "Attested",
                value: summary.attested,
                testId: "atemi-kpi-attested",
                delta: { direction: "flat", value: "signed off" },
              },
              {
                label: "Pending signature",
                value: summary.pending,
                testId: "atemi-kpi-pending",
                delta: {
                  direction: "flat",
                  value:
                    summary.pending === 0
                      ? "none awaited"
                      : "awaiting operator signature",
                },
              },
              {
                label: "Registered",
                value: summary.total,
                testId: "atemi-kpi-total",
                delta: {
                  direction: "flat",
                  value: "vendor · target pairs",
                },
              },
            ] satisfies KpiStripItem[]
          }
        />
      </div>

      <div style={{ padding: "8px 24px 0" }}>
        <SegmentedSubTabs
          items={
            OUTER_TAB_ORDER.map((id) => ({
              id,
              label: OUTER_TAB_LABEL[id],
              testId: `atemi-tab-${id}`,
            })) satisfies SegmentedSubTabItem[]
          }
          active={outerTab}
          onChange={(id) => {
            // R-T1 closed-enum guard via named predicate (matches
            // isInnerTab in E-A15 + isBukiOuterTab/isBukiGenTab in E-A4).
            if (isAtemiOuterTab(id)) setOuterTab(id);
          }}
          ariaLabel="Atemi outer tabs"
          testId="atemi-outer-tabs"
          externalPanelIdPrefix="atemi-panel"
          externalMountedPanelIds={[...mountedOuterTabs]}
        />
      </div>

      {(mountedOuterTabs.has("records") || outerTab === "records") && (
        <div hidden={outerTab !== "records"}>
          <AtemiRecordsTab
            records={records}
            loading={loading}
            error={error}
            summary={summary}
            hasPendingAttestation={hasPendingAttestation}
            probeBusy={probeBusy}
            probeError={probeError}
            onRetry={reloadRecords}
            onRecordProbe={() => setShowProbeModal(true)}
            recordDisabled={recordDisabled}
            recordAriaLabel={recordAriaLabel}
          />
        </div>
      )}

      {(mountedOuterTabs.has("skills") || outerTab === "skills") && (
        <section
          {...externalSegmentedPanelProps("atemi-panel", "skills")}
          hidden={outerTab !== "skills"}
          style={{ padding: "12px 24px" }}
          data-testid="atemi-tab-body-skills"
        >
          {/* Wave 3gg — F-4-035 P2 retire: h2 anchor between page h1 and
              Panel h3s for the Skills library tab. */}
          <h2 className="sr-only">Atemi skills library</h2>
          <SkillsLibraryTab attackMode={attackMode} />
        </section>
      )}

      {(mountedOuterTabs.has("playbooks") || outerTab === "playbooks") && (
        <section
          {...externalSegmentedPanelProps("atemi-panel", "playbooks")}
          hidden={outerTab !== "playbooks"}
          style={{ padding: "12px 24px" }}
          data-testid="atemi-tab-body-playbooks"
        >
          {/* Wave 3gg — F-4-035 P2 retire: h2 anchor for Playbooks tab. */}
          <h2 className="sr-only">Atemi playbooks</h2>
          <PlaybooksTab />
        </section>
      )}

      {(mountedOuterTabs.has("sessions") || outerTab === "sessions") && (
        <section
          {...externalSegmentedPanelProps("atemi-panel", "sessions")}
          hidden={outerTab !== "sessions"}
          style={{ padding: "12px 24px" }}
          data-testid="atemi-tab-body-sessions"
        >
          {/* Wave 3gg — F-4-035 P2 retire: h2 anchor for Sessions tab. */}
          <h2 className="sr-only">Atemi probe sessions</h2>
          <SessionsTab probeHistory={probeHistory} />
        </section>
      )}

      {(mountedOuterTabs.has("recon") || outerTab === "recon") && (
        <section
          {...externalSegmentedPanelProps("atemi-panel", "recon")}
          hidden={outerTab !== "recon"}
          style={{ padding: "12px 24px" }}
          data-testid="atemi-tab-body-recon"
        >
          {/* Wave 3gg — F-4-035 P2 retire: h2 anchor for Concept-recon tab. */}
          <h2 className="sr-only">Atemi concept reconnaissance</h2>
          <ConceptReconTab />
        </section>
      )}

      <ConfirmPhraseModal
        isOpen={showProbeModal}
        title="Execute probe"
        description="This runs a fleet-wide probe pass against every active tuple. Probes consume throttle budget — confirm only when you have a capacity reservation."
        phrase={EXECUTE_PROBE_PHRASE}
        confirmLabel="Execute"
        cancelLabel="Stand down"
        onConfirm={onConfirmProbe}
        onClose={() => setShowProbeModal(false)}
      />
    </div>
  );
}

export default function AdminAtemiPage() {
  return (
    <Suspense
      fallback={
        <p
          role="status"
          aria-live="polite"
          // Stage 2 brutal-review Bartłomiej UI-101: 12px small-text on
          // --fg-mute (3.12:1) fails WCAG AA. Swap to --fg-dim (7.35:1).
          style={{ padding: 20, fontSize: 12, color: "var(--fg-dim)" }}
        >
          Loading Atemi…
        </p>
      }
    >
      <AdminAtemiPageBody />
    </Suspense>
  );
}
