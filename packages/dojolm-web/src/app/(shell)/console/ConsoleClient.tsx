// SPDX-License-Identifier: Apache-2.0
/**
 * ConsoleClient — Workbench `/console` client orchestrator (TICKET-D-211).
 *
 * Foundation surface mounted at `/console`. Renders the workbench shell:
 *   - Toolbar with `<WorkbenchCustomizer>` toggle popover
 *   - 5 widget slots, one per `WorkbenchWidgetId`, each gated on
 *     `widgetState[id]` (toggle-off → slot hidden)
 *
 * Widget restoration progress (per ADR-0096 §3 amended 2026-05-07):
 *   - `kill-count` — RESTORED via D-207 (`<KillCountWidgetLive>`).
 *   - `threat-radar` — RESTORED via D-208 (`<ThreatRadarWidgetLive>`).
 *   - `attack-of-the-day` — RESTORED via D-209 (`<AttackOfTheDayWidgetLive>`).
 *   - `fixture-roulette` — RESTORED via D-210 (`<FixtureRouletteWidgetLive>`).
 *   - `quick-launch-pad` — RESTORED via D-212 (`<QuickLaunchPadWidgetLive>`).
 *     Phase B `/console` grid is now ALL-FIVE-LIVE. Per ADR-0096 §3
 *     amendment 2026-05-07 (D-206 closeout), the closed-enum is 5 ids
 *     — `engine-toggle-grid` was removed (canonical 13-engine surfaces
 *     stay on `/admin/scanner`, `/admin/hattori`, `/`).
 *
 * Auth model: AuthGate defers to `useAuth()` hook (mirrors `/` HomeClient
 * pattern). Unauth → `/login`. Auth-required is the only gate; the
 * Workbench is not admin-only per ADR-0096 Justification §3.
 *
 * State / persistence: `useWorkbenchWidgetState(userId)` returns the
 * per-user `Record<WorkbenchWidgetId, boolean>` from
 * `tpi.workbench.widgets.<userId>` localStorage scope, with the
 * customizer + readWorkbenchWidgetState fall-through to `default` for
 * synthetic / unsafe userIds (T8.1 API_KEY_USER_ID exclusion).
 */

"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  WORKBENCH_WIDGET_IDS,
  WORKBENCH_WIDGET_LABEL,
  type WorkbenchWidgetId,
} from "@/lib/workbench/widgets";
import {
  WorkbenchCustomizer,
  useWorkbenchWidgetState,
} from "@/design/workbench/WorkbenchCustomizer";
// E-A2 Phase B — narrow Phase 3 chrome imports (the darwin-perf import rule).
import { PageHead } from "@/design/shell/PageHead";
import { KpiStrip, type KpiStripItem } from "@/design/primitives/KpiStrip";
import { KillCountWidgetLive } from "./KillCountWidgetLive";
import { AttackOfTheDayWidgetLive } from "./AttackOfTheDayWidgetLive";
import { ThreatRadarWidgetLive } from "./ThreatRadarWidgetLive";
import { FixtureRouletteWidgetLive } from "./FixtureRouletteWidgetLive";
import { QuickLaunchPadWidgetLive } from "./QuickLaunchPadWidgetLive";
import { useWorkbenchKpis } from "./useWorkbenchKpis";

/** Auth gate — redirect unauthenticated visitors to /login. */
function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);
  if (loading)
    return (
      <div
        className="dojo-auth-loading"
        role="status"
        aria-live="polite"
        aria-label="Loading"
        data-testid="console-loading"
      >
        <div className="dojo-auth-loading-spinner" aria-hidden="true" />
      </div>
    );
  if (!user) return null;
  return <>{children}</>;
}

/**
 * Placeholder widget slot — renders a labeled card while the real widget
 * body is queued under its restoration ticket. Closed-map labels per R-T1.
 */
function PlaceholderWidget({ id }: { readonly id: WorkbenchWidgetId }) {
  return (
    <div
      role="region"
      aria-label={WORKBENCH_WIDGET_LABEL[id]}
      data-testid={`workbench-widget-${id}`}
      style={{
        border: "1px solid var(--b-2)",
        borderRadius: 6,
        padding: 16,
        background: "var(--bg-1)",
        minHeight: 140,
      }}
    >
      <h2
        style={{
          fontSize: 13,
          fontWeight: 600,
          margin: "0 0 8px",
          color: "var(--fg)",
        }}
      >
        {WORKBENCH_WIDGET_LABEL[id]}
      </h2>
      <p style={{ fontSize: 12, color: "var(--fg-dim)", margin: 0 }}>
        Widget pending restoration.
      </p>
    </div>
  );
}

function WorkbenchSurface() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [widgetState, setWidgetState] = useWorkbenchWidgetState(userId);

  // Security measures are the signed Workbench contract. Values are wired
  // to honest live signals (`/api/stats` aggregates + the session activity
  // feed) via `useWorkbenchKpis`; any unresolved signal renders "—" rather
  // than a reconstructed number (audit D2).
  const kpi = useWorkbenchKpis();
  const kpiItems: readonly KpiStripItem[] = [
    {
      label: "Guard blocks · 48h",
      value: kpi.guardBlocks,
      tone: "steel",
      delta: { direction: "flat", value: kpi.guardBlocksSub },
      testId: "console-kpi-guard-blocks",
      ariaLabel: `Guard blocks in 48 hours — ${kpi.guardBlocks}`,
    },
    {
      label: "Scan runs · 48h",
      value: kpi.scanRuns,
      tone: "steel",
      delta: kpi.scanRunsDelta,
      testId: "console-kpi-scan-runs",
      ariaLabel: `Scan runs in 48 hours — ${kpi.scanRuns}`,
    },
    {
      label: "Threats · session",
      value: kpi.threats,
      tone: "steel",
      delta: { direction: "flat", value: kpi.threatsSub },
      testId: "console-kpi-threats",
      ariaLabel: `Threats this session — ${kpi.threats}`,
    },
    {
      label: "Coverage",
      value: kpi.coverage,
      tone: "steel",
      delta: { direction: "flat", value: kpi.coverageSub },
      testId: "console-kpi-coverage",
      ariaLabel: `Coverage — ${kpi.coverage}`,
    },
  ];

  // WorkbenchCustomizer stays in the header, while navigation back to the
  // Command Center is deliberately neutral so the page does not spend its
  // one primary action on navigation.
  const pageHeadActions: ReactNode = (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => router.push("/")}
        data-testid="console-cta-open-dashboard"
      >
        Open Command Center
      </button>
      <WorkbenchCustomizer
        userId={userId}
        state={widgetState}
        onChange={setWidgetState}
      />
    </>
  );

  return (
    <div
      className="motion-safe:animate-fade-in"
      data-testid="console-root"
      style={{ padding: 20 }}
    >
      <PageHead
        namingId="console"
        title="Workbench"
        jp="工房"
        lede="Your configurable console of live monitoring widgets."
        actions={pageHeadActions}
      />

      <div
        style={{ marginTop: 16, marginBottom: 20 }}
        data-testid="console-kpi-strip-row"
      >
        <KpiStrip
          module="workbench"
          items={[...kpiItems]}
          testId="console-kpi-strip"
        />
      </div>

      {/* Audit D4 — the corpus is a 2×2 pairing (Threats blocked | Threat
          radar / Attack of the day | Fixture roulette) with Quick launch
          full-width below, NOT a single 4-across row. The column count is
          owned by the scoped `.v2-workbench-grid` rules (v2/command-center
          .css overrides the read-only module.css 4-col default); no inline
          grid-template so those rules — and the mobile reflow — win. */}
      <div className="v2-workbench-grid" data-testid="console-grid">
        {WORKBENCH_WIDGET_IDS.map((id) => {
          if (!widgetState[id]) return null;
          // D-207 — KillCount live widget (reads ActivityContext for
          // `threat_detected` events).
          if (id === "kill-count") {
            return (
              <KillCountWidgetLive key={id} testId={`workbench-widget-${id}`} />
            );
          }
          // D-208 — ThreatRadar live widget (sector counts derived from
          // ScannerContext findings via ENGINE_TO_SECTOR closed map).
          if (id === "threat-radar") {
            return (
              <ThreatRadarWidgetLive
                key={id}
                testId={`workbench-widget-${id}`}
              />
            );
          }
          // D-209 — AttackOfTheDay live widget (deterministic
          // daily-rotation from PAYLOAD_CATALOG, UTC-anchored).
          if (id === "attack-of-the-day") {
            return (
              <AttackOfTheDayWidgetLive
                key={id}
                testId={`workbench-widget-${id}`}
              />
            );
          }
          // D-210 — FixtureRoulette live widget (manifest-driven random
          // pick + inline scan verdict + media preview).
          if (id === "fixture-roulette") {
            return (
              <FixtureRouletteWidgetLive
                key={id}
                testId={`workbench-widget-${id}`}
              />
            );
          }
          // D-212 — QuickLaunchPad live widget (closed nav-action map +
          // LIVE badge derived from useActivityState).
          if (id === "quick-launch-pad") {
            return (
              <QuickLaunchPadWidgetLive
                key={id}
                testId={`workbench-widget-${id}`}
              />
            );
          }
          return <PlaceholderWidget key={id} id={id} />;
        })}
      </div>
    </div>
  );
}

export function ConsoleClient() {
  // W21 FOLD-IN — `<Providers>` lifted to `(shell)/layout.tsx`; per-page
  // wrap dropped to avoid duplicate provider instances.
  return (
    <AuthGate>
      <ErrorBoundary
        fallbackTitle="Workbench Error"
        fallbackDescription="Unable to load the workbench. Please try again."
      >
        <WorkbenchSurface />
      </ErrorBoundary>
    </AuthGate>
  );
}
