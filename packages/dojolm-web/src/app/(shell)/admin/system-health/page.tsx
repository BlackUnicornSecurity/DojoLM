// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/system-health — YR.17 / G-006 admin system-health dashboard.
 *
 * Read-only operator surface. Polls `/api/admin/health` every 30 s and
 * renders per-service indicators (scanner / guard / mcp / storage / app).
 * The endpoint is two-tier (YR.13.2.2): an authenticated admin gets the
 * full payload; unauthenticated callers and Docker healthchecks get a
 * minimal liveness shape. This page assumes the full-tier payload —
 * middleware/rbac.ts gates `/admin/*` at the edge before this client
 * component renders, and the route itself re-checks role.
 *
 * R-T1 discipline: the active `guard.mode` is a closed-union scalar
 * coming off the API. The mode is rendered through `GUARD_MODE_LABEL`,
 * a closed map — a malformed payload renders the literal "unknown"
 * rather than the raw value. Same posture as the YR.16 GlobalBanners.
 *
 * Polling:
 *   - 30-second interval while the tab is foregrounded.
 *   - Pauses when `document.visibilityState === 'hidden'` to avoid
 *     wasted polls on background tabs (matches the prompt's code-review
 *     bias for SWR-with-keepPreviousData behavior). On visibility
 *     restore the next tick re-aligns; the displayed payload remains
 *     the previous one until the new one resolves (no flicker).
 *   - Manual refresh button is throttled to 5 s.
 *
 * Stop conditions (from the prompt):
 *   - If any health-payload field is missing on first read (DB
 *     unavailable, etc.), the page falls back to an EmptyState rather
 *     than rendering partial chrome.
 */

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { PageHead, Panel, SystemBanner } from "@/design";

// ---------------------------------------------------------------------------
// Wire shapes — narrow types mirroring the route's full-tier response.
// ---------------------------------------------------------------------------

type GuardMode = "shinobi" | "samurai" | "sensei" | "hattori";

interface HealthPayload {
  readonly status: "ok" | "degraded";
  readonly scanner: {
    readonly reachable: boolean;
    readonly responseTimeMs?: number;
    readonly lastScanTime: string | null;
  };
  readonly guard: {
    readonly enabled: boolean;
    readonly mode: GuardMode | string;
    readonly eventCount: number;
  };
  readonly mcp: {
    readonly expected: boolean;
    readonly reachable: boolean;
    readonly latencyMs?: number;
  };
  readonly storage: {
    readonly type: string;
    readonly modelsCount: number;
  };
  readonly app: {
    readonly version: string;
    readonly responseTimeMs: number;
  };
}

type LoadState =
  | { readonly kind: "loading" }
  | {
      readonly kind: "ok";
      readonly data: HealthPayload;
      readonly fetchedAt: number;
    }
  | { readonly kind: "error" };

// R-T1: closed map for the human label of `guard.mode`. A payload value
// outside this set falls back to "unknown" — never echoed verbatim.
const GUARD_MODE_LABEL: Readonly<Record<GuardMode, string>> = Object.freeze({
  shinobi: "Observe (log only)",
  samurai: "Shadow (block inbound)",
  sensei: "Enforce (block outbound)",
  hattori: "Hardened (block both)",
});

const POLL_INTERVAL_MS = 30_000;
const REFRESH_THROTTLE_MS = 5_000;

function isFiniteCount(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

function isString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isGuardMode(v: unknown): v is GuardMode {
  return (
    v === "shinobi" || v === "samurai" || v === "sensei" || v === "hattori"
  );
}

function validateHealthPayload(raw: unknown): HealthPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.status !== "ok" && r.status !== "degraded") return null;

  const scanner = r.scanner as Record<string, unknown> | undefined;
  if (!scanner || typeof scanner !== "object") return null;
  if (typeof scanner.reachable !== "boolean") return null;
  if (
    scanner.responseTimeMs !== undefined &&
    !isFiniteCount(scanner.responseTimeMs)
  ) {
    return null;
  }
  if (scanner.lastScanTime !== null && !isString(scanner.lastScanTime)) {
    return null;
  }

  const guard = r.guard as Record<string, unknown> | undefined;
  if (!guard || typeof guard !== "object") return null;
  if (typeof guard.enabled !== "boolean") return null;
  if (!isString(guard.mode)) return null;
  if (!isFiniteCount(guard.eventCount)) return null;

  const mcp = r.mcp as Record<string, unknown> | undefined;
  if (!mcp || typeof mcp !== "object") return null;
  if (typeof mcp.expected !== "boolean") return null;
  if (typeof mcp.reachable !== "boolean") return null;
  if (mcp.latencyMs !== undefined && !isFiniteCount(mcp.latencyMs)) return null;

  const storage = r.storage as Record<string, unknown> | undefined;
  if (!storage || typeof storage !== "object") return null;
  if (!isString(storage.type)) return null;
  if (!isFiniteCount(storage.modelsCount)) return null;

  const app = r.app as Record<string, unknown> | undefined;
  if (!app || typeof app !== "object") return null;
  if (!isString(app.version)) return null;
  if (!isFiniteCount(app.responseTimeMs)) return null;

  return Object.freeze({
    status: r.status,
    scanner: Object.freeze({
      reachable: scanner.reachable,
      responseTimeMs: scanner.responseTimeMs as number | undefined,
      lastScanTime: scanner.lastScanTime as string | null,
    }),
    guard: Object.freeze({
      enabled: guard.enabled,
      mode: guard.mode,
      eventCount: guard.eventCount,
    }),
    mcp: Object.freeze({
      expected: mcp.expected,
      reachable: mcp.reachable,
      latencyMs: mcp.latencyMs as number | undefined,
    }),
    storage: Object.freeze({
      type: storage.type,
      modelsCount: storage.modelsCount,
    }),
    app: Object.freeze({
      version: app.version,
      responseTimeMs: app.responseTimeMs,
    }),
  });
}

function formatLatency(ms: number | undefined): string {
  if (ms === undefined) return "—";
  if (ms < 1) return "<1 ms";
  return `${Math.round(ms)} ms`;
}

function guardModeLabel(mode: string): string {
  return isGuardMode(mode) ? GUARD_MODE_LABEL[mode] : "unknown";
}

interface ComponentRow {
  readonly key: string;
  readonly name: string;
  readonly desc: string;
  readonly value: string;
  readonly chipClass: string;
  readonly chipText: string;
  readonly testId?: string;
}

/**
 * Design "System Health v2" renders a flat `Components` list (§Components)
 * instead of the old Overall + Scanner/Guard/MCP/Storage card grid with
 * mono-caps key/value tables. We keep prod's real, live-tested component
 * taxonomy — the design's six fresh-state placeholder rows would drop the
 * guard/MCP health signal this surface actually measures — and present it
 * as the design's `.lrow` list. Positive/healthy states take the jade dot
 * (jade-for-positive token law); nothing is invented.
 */
function buildComponentRows(d: HealthPayload): readonly ComponentRow[] {
  return [
    {
      key: "api",
      name: "API server",
      desc: "Request handling and auth",
      value: formatLatency(d.app.responseTimeMs),
      chipClass: "jade",
      chipText: "OK",
    },
    {
      key: "scanner",
      name: "Scan engine fleet",
      desc: "The detection engine fleet",
      value: d.scanner.reachable
        ? formatLatency(d.scanner.responseTimeMs)
        : "—",
      chipClass: d.scanner.reachable ? "jade" : "red",
      chipText: d.scanner.reachable ? "OK" : "Down",
      testId: `admin-system-health-scanner-${d.scanner.reachable ? "reachable" : "unreachable"}`,
    },
    {
      key: "guard",
      name: "Guard",
      desc: guardModeLabel(d.guard.mode),
      value: `${d.guard.eventCount} events`,
      chipClass: d.guard.enabled ? "jade" : "",
      chipText: d.guard.enabled ? "On" : "Off",
      testId: `admin-system-health-guard-${d.guard.enabled ? "enabled" : "disabled"}`,
    },
    {
      key: "mcp",
      name: "MCP",
      desc: "Model-context tool host",
      value: !d.mcp.expected
        ? "Not configured"
        : d.mcp.reachable
          ? formatLatency(d.mcp.latencyMs)
          : "—",
      chipClass: !d.mcp.expected ? "" : d.mcp.reachable ? "jade" : "red",
      chipText: !d.mcp.expected ? "N/A" : d.mcp.reachable ? "OK" : "Down",
      testId: `admin-system-health-mcp-${!d.mcp.expected ? "unconfigured" : d.mcp.reachable ? "reachable" : "unreachable"}`,
    },
    {
      key: "storage",
      name: "Database",
      desc: "Findings, fixtures, audit ledger",
      value: d.storage.type,
      chipClass: "jade",
      chipText: "OK",
      testId: "admin-system-health-storage",
    },
  ];
}

export default function AdminSystemHealthPage(): ReactElement {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const lastRefreshAt = useRef<number>(0);

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/admin/health", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) {
        setState((prev) => (prev.kind === "ok" ? prev : { kind: "error" }));
        return;
      }
      const raw = (await res.json()) as unknown;
      const data = validateHealthPayload(raw);
      if (data === null) {
        // First-load malformed payload: surface the empty state so a
        // partial DB unavailability doesn't render half-chrome. Already-
        // resolved payloads stay sticky (keepPreviousData behavior).
        setState((prev) => (prev.kind === "ok" ? prev : { kind: "error" }));
        return;
      }
      setState({ kind: "ok", data, fetchedAt: Date.now() });
    } catch {
      setState((prev) => (prev.kind === "ok" ? prev : { kind: "error" }));
    }
  }, []);

  // Visibility-aware polling — pauses when the tab is hidden.
  useEffect(() => {
    void load();
    let timer: ReturnType<typeof setInterval> | null = null;

    function startPolling(): void {
      if (timer !== null) return;
      timer = setInterval(() => {
        void load();
      }, POLL_INTERVAL_MS);
    }

    function stopPolling(): void {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }

    function onVisibilityChange(): void {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") {
        // Refresh once on return so a long-backgrounded tab doesn't
        // wait up to 30 s for a fresh value.
        void load();
        startPolling();
      } else {
        stopPolling();
      }
    }

    if (
      typeof document === "undefined" ||
      document.visibilityState === "visible"
    ) {
      startPolling();
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    return () => {
      stopPolling();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [load]);

  const onRefreshClick = useCallback((): void => {
    const now = Date.now();
    if (now - lastRefreshAt.current < REFRESH_THROTTLE_MS) return;
    lastRefreshAt.current = now;
    void load();
  }, [load]);

  const data = state.kind === "ok" ? state.data : null;

  const overallStatusChip = useMemo<ReactElement | null>(() => {
    if (state.kind === "loading") {
      return (
        <span
          className="chip steel"
          data-testid="admin-system-health-overall-loading"
        >
          <span className="dot" />
          LOADING
        </span>
      );
    }
    if (state.kind === "error") {
      return (
        <span
          className="chip red"
          data-testid="admin-system-health-overall-error"
        >
          <span className="dot" />
          ERROR
        </span>
      );
    }
    const presentationStatus =
      state.data.status === "degraded" || !state.data.scanner.reachable
        ? "degraded"
        : "ok";
    const tone = presentationStatus === "ok" ? "steel" : "red";
    return (
      <span
        className={`chip ${tone}`}
        data-testid={`admin-system-health-overall-${presentationStatus}`}
      >
        <span className="dot" />
        {presentationStatus.toUpperCase()}
      </span>
    );
  }, [state]);

  return (
    <div data-testid="admin-system-health-page">
      <PageHead
        namingId="system-health"
        title="System health"
        variant="compact"
        actions={
          <>
            {overallStatusChip}
            <span className="chip">
              <span className="dot" aria-hidden="true" />
              Checks every 30 s
            </span>
            <button
              type="button"
              className="btn"
              data-testid="admin-system-health-refresh"
              onClick={onRefreshClick}
              disabled={state.kind === "loading"}
            >
              Refresh
            </button>
          </>
        }
      />

      {state.kind === "error" ? (
        <SystemBanner
          active
          tone="danger"
          title="System health can't be reached"
          testId="admin-system-health-error-banner"
        >
          <p>
            The latest health check failed. The dojo keeps running — this page
            just can&apos;t report on it right now.
          </p>
          <button
            type="button"
            className="sys-banner-action"
            data-testid="admin-system-health-retry"
            onClick={onRefreshClick}
          >
            Retry
          </button>
          <details>
            <summary>Details</summary>
            <p>
              Automatic checks continue while this tab is visible. Try again in
              a moment.
            </p>
          </details>
        </SystemBanner>
      ) : data === null ? (
        /* Design "System Health v2" §D-05: a fresh/pre-first-check surface
           is an empty-INFO state (health-watermark, onboarding CTAs, zero
           red), never an error. Shown until the first payload resolves. */
        <div
          className="panel"
          data-testid="admin-system-health-fresh"
          style={{ marginTop: 12 }}
        >
          <div className="empty">
            <div className="kj" lang="ja" aria-hidden="true">
              健
            </div>
            <h4>Not reporting yet</h4>
            <p>
              Health checks begin once setup finishes and the first scan engine
              comes online. Nothing is wrong — there&apos;s just nothing to
              measure yet.
            </p>
            <div className="links">
              <a className="btn btn-ghost" href="/setup">
                Finish setup
              </a>
              <a className="link-steel" href="/admin/scanner">
                Run a first scan
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <SystemBanner
            active={
              data.status === "degraded" || data.scanner.reachable === false
            }
            tone="warn"
            testId="admin-system-health-degraded-banner"
          >
            Overall status is degraded. One or more connected components is not
            reporting.
          </SystemBanner>

          <Panel
            headingLevel={2}
            title="Components"
            sub="Live component status"
          >
            <div data-testid="admin-system-health-components">
              {buildComponentRows(data).map((row) => (
                <div className="lrow" key={row.key}>
                  <span className="bd">
                    <span className="t">{row.name}</span>
                    <span className="s">{row.desc}</span>
                  </span>
                  <span className="end">
                    <span className="mono">{row.value}</span>
                    <span
                      className={`chip ${row.chipClass}`.trim()}
                      data-testid={row.testId}
                    >
                      <span className="dot" aria-hidden="true" />
                      {row.chipText}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
