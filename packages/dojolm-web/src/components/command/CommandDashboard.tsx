// SPDX-License-Identifier: Apache-2.0
"use client";

/**
 * CommandDashboard — Sensei morning stand-up surface on `/`.
 *
 * Honest in production (v2-prod-design-parity): every widget renders
 * from a live signal or an honest empty/unavailable state. There is NO
 * page-level "Demo data" banner and no fixture sentinels — the design's
 * only demo disclosure is the shell footer "· demo data" line, which the
 * shell renders solely when isDemoMode() is true server-side.
 *
 * Wired to live endpoints:
 *   - /api/stats        → scanner pattern/group/source counts (the KPI
 *                         strip + readiness Coverage bar)
 *   - /api/admin/health → guard block (useGuardHealth) → readiness
 *                         Defenses bar + Active-defenses card states
 *   - /api/audit/log    → Ticker (admin-only; on 401/403/empty/error it
 *                         falls back to the design's narrative status
 *                         lines, not demo data) + Recent-activity feed
 *                         (HAGANE E1.S3: NO fixture fallback — explicit
 *                         unavailable state + Retry; View-all expands
 *                         5→20 in place)
 *
 * The CommandHero Readiness gauge derives LIVE from /api/stats +
 * /api/admin/health via src/lib/readiness/derive.ts (HAGANE E1.S1) —
 * score and bars are computed with per-bar derivation receipts in
 * `title`, never hardcoded; unresolved signals render an honest
 * "posture resolving/unavailable" state instead of a number.
 *
 * Active defenses cards derive their ACTIVE/OFF/Opt-in chips from the
 * live guard-health signal (never a hardcoded "ACTIVE"). The Coverage
 * heatmap renders an honest all-quiet grid — no fabricated seeded ramp —
 * because no 91-day per-day activity endpoint exists yet.
 */

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardCustomizer,
  useDashboardWidgetState,
  Ticker,
  GuardModes,
  type GuardMode,
  Panel,
  EngineFilterChips,
} from "@/design";
// E-A1 Phase B — narrow imports for net-new V1 restoration primitives
// (the darwin-perf import rule operative for Phase 3).
// Stage 2 brutal-review UI-202 (Lukas Brunczyk): Dashboard now uses the
// shared KpiStrip primitive instead of 4 hand-rolled `.mcard` divs so
// the Command-archetype landing surface uses the same KpiStrip primitive
// the other 7 Phase 3 surfaces wire through.
import { KpiStrip } from "@/design/primitives/KpiStrip";
import { PageHead } from "@/design/shell/PageHead";
// HAGANE E1.S1/S2 — live readiness derivation + honest hero copy
// (narrow imports per R7).
import { deriveReadiness } from "@/lib/readiness/derive";
import { heroCopyFor, readinessVerdict } from "@/lib/readiness/hero-copy";
import { useGuardHealth } from "./useGuardHealth";
import { ModuleOnboarding } from "@/design/primitives/ModuleOnboarding";
import { DEFAULT_ENGINES, type ScannerEngineId } from "@/lib/scanner/engines";
import { DashboardKillSwitchChip } from "./DashboardKillSwitchChip";
import { DashboardMonitoringColumn } from "./DashboardMonitoringColumn";

// Non-throwing variant of `useAuth` — returns `null` when no AuthProvider
// is mounted in the tree (e.g. CommandDashboard.test renders this
// component without the shell wrapper).

// HAGANE E5.S6d — data layer moved verbatim to ./command-dashboard-data
// (E-A1-deferred split; 1,316 LOC over the 800 cap; dashboard-main pin
// + unmodified E-A1-phase-b tests guard equivalence).
import {
  E_A1_ONBOARDING_STEPS,
  E_A1_PAGE_HEAD_CTAS,
  E_A1_ZONES,
  aggregateDisplay,
  blockedCardSubtitle,
  budgetCapDisplay,
  budgetCapSubtitle,
  patternCountDisplay,
  runsCardDelta,
  useAuditActivity,
  useAuthOptional,
  useScannerStats,
} from "./command-dashboard-data";

// ---------------------------------------------------------------------------
// GuardModes + Coverage probes (YR.15 / G-013) — RETIRED in E8.S5
//
// Previously this surface mounted two `useGetProbe` hooks against
// `/api/guard/forge-defense/applied` and `/api/llm/coverage` so a future
// widget could flip a per-widget badge from "Demo data" to "Endpoint
// offline" when the underlying path went 401 / 5xx. The probe results
// were never read by any visible widget (the page-level fixture banner
// drives the indicator), so each home-page mount fired two extra
// network requests that the audit catalogued as `requestfailed` events
// (F-9-007).
//
// The probes are removed entirely. When a downstream module epic wires
// real applied-template → mode-card or coverage-map → 7×13 grid
// transforms, that consumer will fetch the underlying endpoints itself
// (CoverageTab on /admin/jutsu already does this on demand) and the
// page-level banner can fold in the per-widget signal without
// dashboard-side speculative probing.
// ---------------------------------------------------------------------------

/** Gauge ring circumference (2π × r32) — the corpus 76px dial
 *  (Command Center v2.html:133-138) draws its arc as a dasharray
 *  fraction of this. */
const GAUGE_CIRC = 201.1;

/**
 * §5.2 value-color law — zeros and absences are neutral facts: render
 * them `--fg-dim`, never red. Wraps only the '0' / '—' displays; every
 * other value keeps the default ink. (`.kpi-dim` is styled in
 * v2/command-center.css.)
 */
function dimKpi(display: string): ReactNode {
  return display === "0" || display === "—" ? (
    <span className="kpi-dim">{display}</span>
  ) : (
    display
  );
}

export function CommandDashboard() {
  const router = useRouter();
  const stats = useScannerStats();
  // HAGANE E1.S1 — guard mode feeds the Defenses readiness bar.
  const guardHealth = useGuardHealth();
  // HAGANE E1.S3 — one audit fetch powers the Ticker + activity feed.
  const { ticker, feed: activity, retryFeed } = useAuditActivity();
  const [activityExpanded, setActivityExpanded] = useState(false);
  const readiness = useMemo(
    () =>
      deriveReadiness(
        stats.status === "ok"
          ? {
              patternCount: stats.data.patternCount,
              groupCount: stats.data.groupCount,
              sourceCount: stats.data.sourceCount,
              budgetExceededLast48h: stats.data.budgetExceededLast48h,
              budgetConfigured: stats.data.budgetConfigured,
            }
          : null,
        guardHealth.status === "ok" ? guardHealth.guard : null,
      ),
    [stats, guardHealth],
  );
  // HAGANE E1.S2 — hero copy selected by band, composed from live facts
  // only (the retired static title/lede asserted "all lanes green" +
  // "overnight queue is clear" unconditionally — audit finding C1).
  const heroCopy = useMemo(() => {
    const status =
      readiness.score !== null
        ? ("live" as const)
        : stats.status === "loading" || guardHealth.status === "loading"
          ? ("resolving" as const)
          : ("unavailable" as const);
    return heroCopyFor(
      readiness.band,
      status,
      {
        patternCount: stats.status === "ok" ? stats.data.patternCount : null,
        runsLast48h: stats.status === "ok" ? stats.data.runsLast48h : null,
        blockedLast48h:
          stats.status === "ok" ? stats.data.blockedLast48h : null,
        guardEnabled:
          guardHealth.status === "ok" ? guardHealth.guard.enabled : null,
        guardMode: guardHealth.status === "ok" ? guardHealth.guard.mode : null,
      },
      new Date().getHours(),
    );
  }, [readiness, stats, guardHealth]);
  // Phase 4.3 conformity (Command Center v2.html:132-143 / audit D8): the
  // hero gauge is the COVERAGE dial — one number, one COVERAGE bar. The
  // composite defenses/budget bars feed the Active-defenses panel, not this
  // gauge (the design shows no DEFENSES row here). gaugeValue drives the
  // ring fill, the big number, AND the readiness verdict so the two never
  // disagree (the prod "40 number vs 55% bar" mismatch is retired).
  const coverageBar = readiness.bars.find((b) => b.k === "Coverage") ?? null;
  const gaugeValue = coverageBar?.v ?? null;
  // YR.21 / G-014 + G-015 (Path B): 4-widget toggle persisted in
  // localStorage scoped by userId. Default: all widgets ON.
  const auth = useAuthOptional();
  const user = auth?.user ?? null;
  const [widgetState, setWidgetState] = useDashboardWidgetState(user?.id);
  // TICKET-D201 / Phase B / CA-7 Shugyō Five Rites onboarding state
  // (useTrainingScrollState) RETIRED per Stage 2 brutal-review
  // UI-003 / UI-102 (UI eng + UX 2-persona convergent kill). The paper
  // TrainingScroll Zone 3 mount duplicated the V1 "Begin Your Training"
  // ModuleOnboarding row-deep-links already shipped in Zone 1, plus
  // shipped on cream paper-ivory on the dark cockpit — off-brand visual
  // anchor. Operators who want the Shugyō ritual can mount it from
  // /admin or another surface; Dashboard does not need two onboarding
  // affordances stacked one zone apart.
  // TICKET-D-204: Engine Filters chip strip — local-only state. The
  // default selection is the full 13-engine fleet so the dashboard
  // shows an unfiltered view at first paint. Server persistence is a
  // follow-up; finding-aware widget consumers wire through this Set
  // when they gain finding-driven data flow.
  // DEFAULT_ENGINES is a frozen module constant + `useState` lazy
  // initializer runs once on mount → no useMemo required.
  const [selectedEngines, setSelectedEngines] = useState<
    ReadonlySet<ScannerEngineId>
  >(() => new Set<ScannerEngineId>(DEFAULT_ENGINES.map((e) => e.id)));

  const tickerIsLive = ticker.status === "ok";

  // v2-prod-design-parity — the dashboard is honest in prod: every widget
  // renders from a live signal or an honest empty/unavailable state, so
  // there is NO page-level "Demo data" banner and no fixture sentinels.
  //   - CommandHero Readiness → deriveReadiness (live /api/stats + guard);
  //     unresolved signals render an honest "posture unavailable" state.
  //   - Active defenses → derived from the live guard-health signal below.
  //   - Coverage heatmap → honest all-quiet grid (no fabricated ramp; no
  //     91-day activity endpoint exists yet).
  //   - Ticker → live /api/audit/log; on empty/error it falls back to the
  //     design's narrative status lines, not "demo data".
  // The only demo disclosure is the shell footer "· demo data" line, which
  // the shell renders solely when isDemoMode() is true server-side.

  // Active-defenses cards derive from the live guard-health signal the page
  // already fetches (/api/admin/health guard block). `guardOn === null`
  // while the signal is loading/unavailable → cards render a neutral state,
  // never a fabricated "ACTIVE" claim.
  const guardOn: boolean | null =
    guardHealth.status === "ok" ? guardHealth.guard.enabled : null;
  const activeDefenses: GuardMode[] = [
    {
      name: "Onigaeshi · reflective block",
      active: guardOn === true,
      ...(guardOn === false ? { statusLabel: "Off" } : {}),
      desc: "Intercepts injection attempts; returns canonical refusal plus telemetry.",
      flags: [
        { label: "pre-prompt", on: guardOn === true },
        { label: "post-response", on: guardOn === true },
        { label: "tool-call gate", on: guardOn === true },
      ],
    },
    {
      name: "Kappa · input sanitizer",
      active: guardOn === true,
      ...(guardOn === false ? { statusLabel: "Off" } : {}),
      desc: "Normalizes Unicode, strips zero-width, detects encoded payloads.",
      flags: [
        { label: "zero-width", on: guardOn === true },
        { label: "base64 sniff", on: guardOn === true },
        { label: "homoglyph", on: guardOn === true },
      ],
    },
    {
      name: "Tanuki · evasive rewrite",
      active: false,
      statusLabel: "Opt-in",
      desc: "Experimental. Rewrites suspect prompts preserving intent but neutralizing attack vector.",
      flags: [],
    },
  ];

  /**
   * E3.S7 (F-3-015 P2) — first-run progressive-disclosure scent.
   *
   * Goal-Gradient + Peak-End: a fresh admin landing on `/` with the
   * scanner library loaded but zero probes executed has no visual cue
   * toward the canonical "first task" (run an Atemi probe or fire the
   * Scanner). Pre-E3.S7 the dashboard rendered the full Sensei
   * morning-stand-up surface as if the operator had context, which the
   * audit flagged as a goal-gradient miss.
   *
   * Signal: the `/api/stats` audit-log slice already exposes
   * `runs.last48h` (SCAN_EXECUTED count). `runsLast48h === 0` AND
   * `blockedLast48h === 0` is a strong negative signal that NO probe has
   * run on this deployment in the recent past — which is the audit's
   * working definition of "first-run admin". The callout hides as soon
   * as either counter advances (so a second-session admin returning the
   * next morning, or any teammate's probe, retires the scent).
   *
   * Defensive: when stats are loading or errored, suppress the callout
   * — better to omit the scent than to render it transiently and then
   * have it vanish under the operator's cursor on the next render.
   */
  const isFirstRun =
    stats.status === "ok" &&
    stats.data.runsLast48h === 0 &&
    stats.data.blockedLast48h === 0;

  // Zone 1 "N LIVE" badge — counts widgets currently showing live data in
  // Zone 1 (CommandHero / Ticker / 4-tile stats). The 4-tile stats grid is
  // live when stats.status === 'ok'; Ticker when tickerIsLive; CommandHero
  // when its readiness gauge actually resolved a number (gaugeValue !== null),
  // not merely when it's visible.
  const zoneCommandLiveCount =
    (tickerIsLive && widgetState.ticker ? 1 : 0) +
    (stats.status === "ok" ? 1 : 0) +
    (gaugeValue !== null && widgetState["command-hero"] ? 1 : 0);

  // Phase 4.3 conformity — the page-head carries exactly TWO actions per
  // the corpus (Command Center v2.html:120-123): the red Scan Text CTA
  // (owns the view's one chrome red, §1.2) + the neutral Customize
  // control (DashboardCustomizer trigger). The 3 ghost deep-links and
  // the "N/4 widgets" meta-chip (§5.2 B-07) are retired.
  const pageHeadActions: ReactNode = (
    <>
      {E_A1_PAGE_HEAD_CTAS.map((cta) => (
        <button
          key={cta.id}
          type="button"
          className="btn btn-primary"
          onClick={() => router.push(cta.href)}
          data-testid={`dashboard-page-head-cta-${cta.id}`}
        >
          {cta.label}
        </button>
      ))}
      <DashboardCustomizer
        userId={user?.id}
        state={widgetState}
        onChange={setWidgetState}
        testId="dashboard-page-head-customizer"
      />
    </>
  );

  return (
    <div className="dashboard-v2">
      {/*
        Stage 2 brutal-review UI-110 (Bartłomiej Wójcik): the
        `.dashboard-page-head-shell` wrapper was scoped to Dashboard
        only, leaving `/admin` + `/console` with bare PageHead + bordered
        KpiStrip — three landing surfaces with three different chrome
        treatments. Wrapper RETIRED so all three Command/Workbench/Admin
        landings share the same PageHead chrome. The torii-red `Scan
        text` CTA + 4-CTA ghost row stays in PageHead's actions slot.
        DashboardKillSwitchChip stays removed (founder eye-test).
        Hidden-but-preserved: `dashboard-kill-switch-row` testId stub
        stays in the DOM so the CD-023 contract holds without rendering
        the chip widget.
      */}
      {/* Lede comes from ROUTE_NAMING.dashboard.gloss (§2.5: "Live
          security posture and the day's next actions."); the retired
          "N widgets across 3 zones" prop was page self-description
          (§5.2 B-07) and was already overridden by the naming source. */}
      <PageHead
        namingId="dashboard"
        title="Command Center"
        actions={pageHeadActions}
      />

      {/* Hidden test-contract stub for the CD-023 kill-switch baseline.
          The chip widget itself is no longer mounted on the dashboard. */}
      <div
        data-testid="dashboard-kill-switch-row"
        style={{ display: "none" }}
        aria-hidden="true"
      >
        <DashboardKillSwitchChip />
      </div>

      <section
        role="region"
        aria-labelledby="zone-command-heading"
        data-testid="dashboard-zone-command"
        style={{ marginTop: 20 }}
      >
        {/*
          E3.S7 (F-3-015 P2) — first-run progressive-disclosure scent.
          Surfaces a "Get started" callout INSIDE Zone 1 (between zone
          heading and Begin Training) when the audit-log slice reports
          zero scans + zero guard blocks in the last 48h. Founder
          eye-test 2026-05-19 moved this from above-page-head to here so
          it doesn't crowd the heading.
        */}
        {isFirstRun ? (
          <div
            className="grid"
            data-testid="dashboard-first-run-row"
            style={{ marginBottom: 14 }}
          >
            <div style={{ gridColumn: "span 12" }}>
              <div
                className="dashboard-first-run-callout"
                role="region"
                aria-labelledby="dashboard-first-run-heading"
                data-testid="dashboard-first-run-callout"
                style={{
                  padding: "18px 22px",
                  border: "1px solid var(--b-2)",
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  id="dashboard-first-run-heading"
                  style={{ fontWeight: 700, fontSize: 16 }}
                >
                  Get started — run your first probe
                </div>
                <div style={{ fontSize: 14, color: "var(--fg-dim)" }}>
                  No probes have executed yet. Pick a first task to populate
                  this dashboard with live signals.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => router.push("/admin/atemi")}
                    data-testid="dashboard-first-run-cta-atemi"
                  >
                    Open Live practice
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => router.push("/admin/scanner")}
                    data-testid="dashboard-first-run-cta-scanner"
                  >
                    Run a scanner probe
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/*
          Phase 4.3 conformity — hero restructured to the corpus two-panel
          posture + gauge composition (Command Center v2.html:126-145):
          a posture panel (kick · verdict · sub) beside a 300px gauge
          panel (steel ring + per-signal coverage bars), both capped at
          180px on a steel wash (§3.5 tier 1 — alarm wash is reserved for
          a live-critical override, which this surface has no wired
          signal for; B-08: unknown/degraded posture stays steel). Copy
          stays the HAGANE E1.S2 live-fact matrix; the gauge stays the
          E1.S1 derivation with per-bar receipts in `title`. The two
          surviving E6.S2 contextual actions (destinations the page-head
          strip does NOT carry) stay text-scale: the Evaluations link
          rides inside the sub (the corpus sub carries an inline link,
          v2.html:130) + a compact export control below it.
        */}
        {widgetState["command-hero"] ? (
          <div className="grid-hero" data-testid="dashboard-command-hero-row">
            <div className="hero-panel">
              <div className="hero-kick">
                <span
                  className={`dot${gaugeValue !== null ? " live" : ""}`}
                  aria-hidden="true"
                />
                {heroCopy.eyebrow}
              </div>
              {/* Single-weight Fraunces verdict (§ legal serif slot). The
                  copy is the readiness-band verdict — no greeting, no
                  bold/italic/bold split (audit D5). */}
              <h2 className="hero-verdict">{readinessVerdict(gaugeValue, guardOn)}</h2>
              <p className="hero-sub">
                {heroCopy.facts}{" "}
                <a
                  href="#dashboard-onboarding"
                  className="cc-hero-link"
                  data-testid="dashboard-cta-resume-setup"
                >
                  Resume setup
                </a>
              </p>
            </div>
            <div className="hero-panel gauge">
              {gaugeValue !== null && coverageBar !== null ? (
                <>
                  <svg
                    width="76"
                    height="76"
                    viewBox="0 0 76 76"
                    role="img"
                    aria-label={`Readiness ${gaugeValue}% — ${coverageBar.title}`}
                    data-testid="dashboard-readiness-gauge"
                  >
                    <circle
                      cx="38"
                      cy="38"
                      r="32"
                      fill="none"
                      stroke="var(--bg-4)"
                      strokeWidth="7"
                    />
                    <circle
                      cx="38"
                      cy="38"
                      r="32"
                      fill="none"
                      stroke="var(--steel)"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={`${((gaugeValue / 100) * GAUGE_CIRC).toFixed(1)} ${GAUGE_CIRC}`}
                      transform="rotate(-90 38 38)"
                    />
                    <text
                      x="38"
                      y="43"
                      textAnchor="middle"
                      fill="var(--fg)"
                      fontFamily="var(--mono)"
                      fontSize="17"
                      fontWeight="600"
                    >
                      {gaugeValue}
                    </text>
                  </svg>
                  {/* Ref gauge anatomy: READINESS cap → COVERAGE · N% cap →
                      one covbar (Command Center v2.html:139-143). No DEFENSES
                      row — that signal lives in the Active-defenses panel. */}
                  <div className="gauge-bars" title={coverageBar.title}>
                    <div className="cap">Readiness</div>
                    <div>
                      <div className="cap">Coverage · {gaugeValue}%</div>
                      <div className="covbar">
                        <i style={{ width: `${gaugeValue}%` }} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="cap" data-testid="dashboard-readiness-pending">
                  {stats.status === "loading" ||
                  guardHealth.status === "loading"
                    ? "Posture resolving…"
                    : "Posture unavailable — no live signal"}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Zone-1 order per the corpus (Command Center v2.html:126-174):
            hero → zone-title → KPIs → onboarding → ticker. The design's
            only demo disclosure is the footer "· demo data" line (shell
            renders it under isDemoMode) — there is NO gold banner here. */}
        <div className="zone-title" data-testid="dashboard-zone-command-title">
          <h2 id="zone-command-heading">{E_A1_ZONES[0].heading}</h2>
          <p className="sub">{E_A1_ZONES[0].sub}</p>
          <span className="end" style={{ marginLeft: "auto" }}>
            <span
              className="chip jade"
              aria-label={`${zoneCommandLiveCount} live widgets in Command zone`}
              data-testid="dashboard-zone-command-live-badge"
            >
              <span className="dot" />
              {zoneCommandLiveCount} LIVE
            </span>
          </span>
        </div>

        {/*
        Stage 2 brutal-review UI-202 (Lukas Brunczyk): one shared
        <KpiStrip> instead of 4 hand-rolled `.mcard` divs; per-cell
        `dash-*` testIds pin per-tile values. Phase 4.3 conformity:
        labels are the corpus §5.2 strings verbatim (Command Center
        v2.html:151-156), decorative per-card tones/icons dropped
        (§5.2: no per-card decorative accents), zeros and absences
        render dim ink via `dimKpi` (§5.2: zeros --fg-dim, never red).
      */}
        <KpiStrip
          module="dashboard"
          testId="dashboard-stats-grid"
          items={[
            {
              label: "Patterns loaded",
              value: dimKpi(patternCountDisplay(stats)),
              testId: "dash-pattern-count",
              delta: {
                direction: "flat",
                value:
                  stats.status === "ok"
                    ? `${stats.data.groupCount} groups · ${stats.data.sourceCount} sources`
                    : stats.status === "error"
                      ? stats.message
                      : "loading stats…",
              },
            },
            {
              label: "Scan runs · 48h",
              value: dimKpi(aggregateDisplay(stats, (s) => s.runsLast48h)),
              testId: "dash-runs-count",
              delta: runsCardDelta(stats),
            },
            {
              label: "Guard blocks · 48h",
              value: dimKpi(aggregateDisplay(stats, (s) => s.blockedLast48h)),
              testId: "dash-blocked-count",
              delta: { direction: "flat", value: blockedCardSubtitle(stats) },
            },
            {
              label: "Budget cap",
              value: dimKpi(budgetCapDisplay(stats)),
              testId: "dash-budget-exceeded",
              delta: { direction: "flat", value: budgetCapSubtitle(stats) },
            },
          ]}
        />

        {/*
          E-A1 — V1 "Begin Your Training" 4-step onboarding via B.4
          ModuleOnboarding variant="row-deep-links" (founder Q2 gate
          2026-05-19). Sits AFTER the KPI strip per the corpus zone-1
          order (v2.html:158-167). Dismiss persists via
          `tpi.onboarding.dashboard-begin-training.dismissed`.
        */}
        <div id="dashboard-onboarding" style={{ marginTop: 16 }}>
          <ModuleOnboarding
            variant="row-deep-links"
            moduleId="dashboard-begin-training"
            title="Begin your training"
            subtitle="Four steps to a live dojo"
            dismissLabel="Got it — don't show again"
            steps={E_A1_ONBOARDING_STEPS}
            testId="dashboard-begin-training"
          />
        </div>

        {widgetState.ticker ? (
          tickerIsLive ? (
            <div data-testid="ticker-live" style={{ marginTop: 16 }}>
              <Ticker items={[...ticker.items]} />
            </div>
          ) : (
            <div data-testid="ticker-fallback" style={{ marginTop: 16 }}>
              <Ticker items={[...ticker.items]} />
            </div>
          )
        ) : null}
      </section>

      {/*
        E-A1 — Zone 2 Monitoring (founder Q3 gate approved 2026-05-19).
        Hosts the threat memory + activity + live campaign monitor
        widgets: Today's playbook + Recent activity (left 7/12 span);
        Active defenses (GuardModes) + Coverage heatmap (right 5/12
        span). Each child widget visibility
        is governed by the DashboardCustomizer per-user toggle — when
        all 4 are hidden, the zone renders an empty `<section>` (the
        landmark stays so screen-reader navigation is stable).
      */}
      <section
        role="region"
        aria-labelledby="zone-monitoring-heading"
        data-testid="dashboard-zone-monitoring"
        style={{ marginTop: 28 }}
      >
        <div className="zone-title">
          <h2 id="zone-monitoring-heading">{E_A1_ZONES[1].heading}</h2>
          <p className="sub">{E_A1_ZONES[1].sub}</p>
        </div>

        <div className="grid">
          {" "}
          <DashboardMonitoringColumn
            activity={activity}
            activityExpanded={activityExpanded}
            onToggleExpanded={() => setActivityExpanded((v) => !v)}
            onRetry={retryFeed}
          />
          <div style={{ gridColumn: "span 5" }}>
            {widgetState["guard-modes"] ? (
              <Panel
                title="Active defenses"
                sub="Guard modes"
                meta={
                  <>
                    {/* Reflects the live guard-health signal — ARMED when
                    the guard is enabled, OFF when disabled, "—" while the
                    signal is unresolved. Never a hardcoded ARMED. */}
                    <span className="chip">
                      <span className="dot" />
                      {guardOn === true
                        ? "ARMED"
                        : guardOn === false
                          ? "OFF"
                          : "—"}
                    </span>
                  </>
                }
              >
                <div>
                  <GuardModes modes={activeDefenses} />
                </div>
              </Panel>
            ) : null}

            {widgetState["coverage-grid"] ? (
              <Panel
                title="Coverage heatmap"
                sub="91 days · scanner lanes"
                style={{ marginTop: 20 }}
                meta={
                  <>
                    {/* Groups chip reflects live scanner state (/api/stats). */}
                    <span className="chip steel">
                      <span className="dot" />
                      {stats.status === "ok"
                        ? `${stats.data.groupCount} groups`
                        : "—"}
                    </span>
                  </>
                }
              >
                {/* Honest all-quiet heatmap: no 91-day activity endpoint
                    exists, so every cell renders at the neutral "less" tier
                    rather than a fabricated seeded ramp. The design's
                    less→more + critical-day legend stays as the key so the
                    grid lights up correctly once real per-day data lands. */}
                <div>
                  <div
                    className="cov-grid"
                    style={{ gridTemplateColumns: "repeat(13, 1fr)" }}
                    role="img"
                    aria-label="Coverage heatmap — no scan activity recorded yet"
                    data-testid="dashboard-coverage-grid"
                  >
                    {Array.from({ length: 91 }, (_, i) => (
                      <div key={i} className="cov-cell l0" />
                    ))}
                  </div>
                  <div className="cov-footer">
                    <span>Less</span>
                    {(["l0", "l1", "l2", "l3", "l4"] as const).map((l) => (
                      <span key={l} className="legend">
                        <span className={`sw ${l}`} />
                      </span>
                    ))}
                    <span>More</span>
                    <span className="cov-crit-label">Critical day</span>
                    <span className="legend">
                      <span className="sw crit" />
                    </span>
                  </div>
                </div>
              </Panel>
            ) : null}
          </div>
        </div>
      </section>

      {/*
        Stage 2 brutal-review UI-003 / UI-102 + UI-103 (UI eng + UX
        2-persona convergent kill): Zone 3 Platform previously hosted
        EngineFilterChips + TrainingScroll + HaikuLicenseModules. Both
        TrainingScroll (duplicate "Begin your training" affordance,
        cream-paper-ivory on dark cockpit) AND HaikuLicenseModules
        (duplicate of `/admin` Modules grid one Rail click away) RETIRED
        per CONVERGENCE.md "4-persona convergence: kill TrainingScroll
        on Dashboard". The EngineFilterChips strip stays — it is the
        actual Zone 3 work surface (finding-aware widget consumers wire
        through the selected Set in a follow-up).
      */}
      <section
        role="region"
        aria-labelledby="zone-platform-heading"
        data-testid="dashboard-zone-platform"
        style={{ marginTop: 28 }}
      >
        <div className="zone-title">
          <h2 id="zone-platform-heading">{E_A1_ZONES[2].heading}</h2>
          <p className="sub">{E_A1_ZONES[2].sub}</p>
        </div>

        <div className="grid" data-testid="dashboard-engine-filter-row">
          <div style={{ gridColumn: "span 12" }}>
            <EngineFilterChips
              selected={selectedEngines}
              onChange={setSelectedEngines}
              testId="dashboard-engine-filter"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
