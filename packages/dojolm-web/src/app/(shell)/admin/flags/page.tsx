// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/flags — live feature flags, readiness, and audited kill switches.
 * Admin access is enforced by the enclosing layout; existing FIRE state and
 * confirmation contracts remain intact (R-F2, ADR-0041).
 */

"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { KILL_SIGNALS, type KillReason } from "bu-tpi/flags";
import { ConfirmPhraseModal, PendingApprovalsPanel } from "@/design";
import { PageHead, Panel, I, FreshnessChip } from "@/design";
import { readCsrfToken } from "@/lib/csrf-cookie";

/**
 * Design "Flags v2" shows friendly, plain-language flag rows — not the raw
 * registry ids / ADR paths the API returns. This client-side map turns each
 * known `/api/admin/feature-flags` id into its human name + one-line
 * description (no ADR/API jargon, per the header-gloss law). Unknown ids fall
 * back to the raw id + API description so nothing is silently hidden.
 */
const FLAG_META: Readonly<Record<string, { name: string; desc: string }>> = {
  "kotoba.llm": {
    name: "Second-opinion insights",
    desc: "Adds an extra review pass to Prompt hardening scores.",
  },
  "sengoku.llm": {
    name: "Multi-turn executor",
    desc: "Drives temporal runs in Campaigns across multiple turns.",
  },
  "ronin.intel-ingest": {
    name: "Incident-feed polling",
    desc: "Pulls CVE and AI-incident data into Research intake.",
  },
};

const KILL_REASONS: readonly KillReason[] = [
  "manual-admin",
  "two-person-approval-revoke",
  "auto-anomaly",
  "drill",
];

interface FireResult {
  ok: boolean;
  signal: string;
  firedAt: string;
  error?: string;
  /** YR.13.3: when the FIRE flow opens a two-person approval rather than
   *  immediately firing, the server returns the approval id + 8-char code.
   *  Operator A copies the code and shares it out-of-band with operator B. */
  approvalId?: string;
  approvalCode?: string;
  approvalExpiresAt?: string;
}

interface FlagRow {
  readonly flag: string;
  readonly description?: string;
  readonly enabled: boolean;
  readonly override?: boolean | null;
}

interface FlagsResponse {
  readonly flags?: readonly unknown[];
  readonly error?: string;
}

function sanitizeFlagRow(raw: unknown): FlagRow | null {
  if (raw === null || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.flag !== "string" || row.flag.length === 0) return null;
  if (typeof row.enabled !== "boolean") return null;
  if (
    row.override !== undefined &&
    row.override !== null &&
    typeof row.override !== "boolean"
  ) {
    return null;
  }
  return {
    flag: row.flag.slice(0, 80),
    description:
      typeof row.description === "string"
        ? row.description.slice(0, 240)
        : undefined,
    enabled: row.enabled,
    override: row.override as boolean | null | undefined,
  };
}

function sanitizeFlagRows(rows: readonly unknown[]): readonly FlagRow[] {
  const byFlag = new Map<string, FlagRow>();
  for (const raw of rows) {
    const row = sanitizeFlagRow(raw);
    if (row !== null && !byFlag.has(row.flag)) byFlag.set(row.flag, row);
  }
  return [...byFlag.values()];
}

function FlagsRegistry() {
  const [flags, setFlags] = useState<readonly FlagRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // HAGANE re-audit 2026-06-14 (B9) — extracted to a useCallback so the
  // flags-error banner can offer a Retry. Previously a transient registry
  // failure left "Registry unavailable" with no recovery short of a reload.
  const reloadFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as FlagsResponse;
      if (!res.ok) {
        // R-T1 (YR.1.11 audit pass-2): the server-supplied error string is
        // intentionally NOT reflected here. We map the HTTP class to a
        // fixed-vocabulary label.
        setError("Registry unavailable");
        setFlags([]);
      } else {
        setFlags(sanitizeFlagRows(body.flags ?? []));
        setError(null);
      }
    } catch {
      setError("Network error");
      setFlags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadFlags();
  }, [reloadFlags]);

  // Design "Flags v2" uses real toggle switches. The registry already
  // exposes a PATCH override write (ADR-0041); flipping the switch writes the
  // override optimistically and resyncs from the server on any rejection.
  const [busy, setBusy] = useState<string | null>(null);

  const toggleFlag = useCallback(
    async (flag: string, next: boolean) => {
      setBusy(flag);
      setFlags((cur) =>
        cur.map((f) =>
          f.flag === flag ? { ...f, enabled: next, override: next } : f,
        ),
      );
      try {
        const csrf = readCsrfToken();
        const res = await fetch("/api/admin/feature-flags", {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            ...(csrf ? { "x-csrf-token": csrf } : {}),
          },
          body: JSON.stringify({ flag, enabled: next }),
        });
        if (!res.ok) {
          await reloadFlags();
          return;
        }
        const body = (await res.json().catch(() => null)) as {
          enabled?: unknown;
          override?: unknown;
        } | null;
        if (body && typeof body.enabled === "boolean") {
          const enabled = body.enabled;
          const override =
            typeof body.override === "boolean" ? body.override : null;
          setFlags((cur) =>
            cur.map((f) =>
              f.flag === flag ? { ...f, enabled, override } : f,
            ),
          );
        }
      } catch {
        await reloadFlags();
      } finally {
        setBusy(null);
      }
    },
    [reloadFlags],
  );

  const enabledCount = flags.filter((f) => f.enabled).length;

  return (
    <Panel
      headingLevel={2}
      title="Flags"
      sub={
        loading
          ? "Loading registry…"
          : error
            ? "Registry unavailable"
            : `${flags.length} registered · ${enabledCount} enabled`
      }
    >
      {error && (
        <>
          <div
            role="alert"
            data-testid="flags-error"
            className="chip red"
            style={{ margin: "4px 0 12px" }}
          >
            <span className="dot" />
            {error}
          </div>
          {/* HAGANE re-audit 2026-06-14 (B9) — Retry re-runs the registry
              fetch in place. */}
          <button
            type="button"
            className="btn sm"
            onClick={() => void reloadFlags()}
            data-testid="flags-error-retry"
            aria-label="Retry loading the feature-flag registry"
          >
            Retry
          </button>
        </>
      )}

      {!loading && flags.length === 0 && !error && (
        <p
          data-testid="flags-empty"
          style={{ fontSize: 12.5, color: "var(--fg-dim)" }}
        >
          No flags registered.
        </p>
      )}

      {flags.length > 0 && (
        <div role="group" aria-label="Feature flag registry">
          {flags.map((f) => {
            const meta = FLAG_META[f.flag];
            const name = meta?.name ?? f.flag;
            const desc = meta?.desc ?? f.description ?? "";
            const source =
              f.override === true
                ? "override · on"
                : f.override === false
                  ? "override · off"
                  : "default";
            return (
              <div
                key={f.flag}
                className="lrow"
                data-testid={`flag-row-${f.flag}`}
              >
                <span className="bd">
                  <span className="t">{name}</span>
                  {desc && <span className="s">{desc}</span>}
                </span>
                <span className="end">
                  <span className="mono" style={{ color: "var(--fg-dim)" }}>
                    {source}
                  </span>
                  <button
                    type="button"
                    className="tgl"
                    role="switch"
                    aria-checked={f.enabled}
                    aria-label={`${name}, ${f.enabled ? "on" : "off"}`}
                    disabled={busy === f.flag}
                    onClick={() => void toggleFlag(f.flag, !f.enabled)}
                    data-testid={`flag-toggle-${f.flag}`}
                  >
                    <i aria-hidden="true" />
                  </button>
                </span>
              </div>
            );
          })}
          <p className="flags-help">
            Flag state is the shipped default plus any admin override.
            Production overrides create a pending approval below.
          </p>
        </div>
      )}
    </Panel>
  );
}

/**
 * Polling interval for the panel-level ARMED chip. 30 s matches the TopBar
 * `KillSwitchStatusBadge` cadence — Doherty Threshold says interactive
 * surfaces should respond <400 ms, but for an at-a-glance status indicator
 * a 30 s poll is the documented kill-switch surface cadence (matches
 * `/api/admin/kill-switch/status` `Cache-Control: no-store` contract).
 *
 * E0.S8 phase 2 (E5.S2 / REMEDIATION-PLAN.md:587-591): the chip is now
 * paired with `<FreshnessChip lastFetched pollEvery>` (E5.S6 primitive)
 * so operators can see how stale the rendered state is at-a-glance —
 * the chip itself keeps its low-noise contract (only flips to "unknown"
 * before the first fetch resolves), while the freshness indicator
 * provides the "Just now / Ns ago / Nm ago" context. Retires F-8-022 P2.
 */
const ARMED_CHIP_POLL_MS = 30_000;

interface KillSwitchStatusBody {
  readonly activeSignals?: readonly string[];
}

/**
 * Live ARMED-state chip for the KillSwitchPanel meta slot.
 *
 * F-022 / E0.S8 phase 1: the chip used to render `<span className="chip red">ARMED</span>`
 * unconditionally — operators landing on /admin/flags would see a red ARMED
 * banner even when no signals were actually fired (Nielsen #1 — Visibility
 * of System Status, false-certainty failure mode).
 *
 * Wires to GET /api/admin/kill-switch/status (admin-gated, no-store) and
 * mirrors `KillSwitchStatusBadge`'s polling pattern. State semantics:
 *   - unknown (pre-first-fetch)         -> muted em-dash chip
 *   - armed   (activeSignals.length>0)  -> red chip "<N> ARMED"
 *   - idle    (activeSignals.length===0)-> jade chip "IDLE"
 *
 * Citations: Nielsen #1 (Visibility); Doherty Threshold (30 s cadence is
 * acceptable for at-a-glance status surfaces — confirm-modal interactions
 * remain immediate).
 */
function KillSwitchArmedChip(): ReactElement {
  // null = unknown / pre-first-fetch; number = activeSignals length
  const [armedCount, setArmedCount] = useState<number | null>(null);
  // E5.S2: lastFetched stamps drive the FreshnessChip below — null until
  // the first OK response resolves. isPending flips to true while a poll
  // is in flight so the FreshnessChip can show "Fetching..." without
  // flashing the chip itself off.
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [isPending, setIsPending] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    async function tick(): Promise<void> {
      if (!cancelled) setIsPending(true);
      try {
        const res = await fetch("/api/admin/kill-switch/status", {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          // 401/403/5xx — keep last-known state, drop the pending flag
          // so the FreshnessChip doesn't get stuck in "Fetching...".
          setIsPending(false);
          return;
        }
        const body = (await res.json()) as KillSwitchStatusBody;
        if (cancelled) return;
        setArmedCount(body.activeSignals?.length ?? 0);
        setLastFetched(new Date());
        setIsPending(false);
      } catch {
        // Network failure (offline, fetch abort, etc.) - keep the
        // last-known count rather than flashing the chip on/off.
        if (!cancelled) setIsPending(false);
      }
    }

    void tick();
    const id = setInterval(() => {
      void tick();
    }, ARMED_CHIP_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // E5.S2: <FreshnessChip> renders alongside the ARMED state so operators
  // can see how stale the chip is at-a-glance. Aligned with WCAG 2.1
  // SC 4.1.3 (Status Messages) — both the chip and the FreshnessChip
  // carry role="status" + aria-live="polite" so AT users hear transitions
  // without focus theft.
  const freshness = (
    <FreshnessChip
      lastFetched={lastFetched}
      pollEvery={ARMED_CHIP_POLL_MS}
      isPending={isPending}
      testId="kill-switch-armed-chip-freshness"
    />
  );

  if (armedCount === null) {
    return (
      <span
        data-testid="kill-switch-armed-chip-row"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <span
          className="chip"
          role="status"
          aria-live="polite"
          aria-label="Kill-switch status — unknown"
          data-testid="kill-switch-armed-chip"
          data-armed-state="unknown"
        >
          <span className="dot" aria-hidden="true" />
          &mdash;
        </span>
        {freshness}
      </span>
    );
  }

  if (armedCount > 0) {
    return (
      <span
        data-testid="kill-switch-armed-chip-row"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <span
          className="chip red"
          role="status"
          aria-live="polite"
          aria-label={`Kill-switch active — ${armedCount} signals armed`}
          data-testid="kill-switch-armed-chip"
          data-armed-state="armed"
          data-armed-count={armedCount}
        >
          <span className="dot" aria-hidden="true" />
          {armedCount} ARMED
        </span>
        {freshness}
      </span>
    );
  }

  return (
    <span
      data-testid="kill-switch-armed-chip-row"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
      }}
    >
      <span
        className="chip jade"
        role="status"
        aria-live="polite"
        aria-label="Kill-switch idle — no signals armed"
        data-testid="kill-switch-armed-chip"
        data-armed-state="idle"
        data-armed-count={0}
      >
        <span className="dot" aria-hidden="true" />
        IDLE
      </span>
      {freshness}
    </span>
  );
}

function KillSwitchPanel() {
  const [signal, setSignal] = useState<string>(KILL_SIGNALS[0]);
  const [reason, setReason] = useState<KillReason>("manual-admin");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<FireResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // F-3-007 (Fitts + Nielsen #5 — Error Prevention): the kill-switch fire
  // form sits on the same screen as the routine flag-toggle table. A
  // misclick or wrong-row click could fire kill-switch when the operator
  // meant a flag toggle. Gating the form behind an explicit
  // "Show kill-switch controls" disclosure preserves the existing
  // confirm-phrase + 2/3 approver chain while adding a coarse-grained
  // pre-flight gate that prevents accidental form interaction. Collapsed
  // by default; expansion is an explicit operator-deliberate action.
  const [controlsOpen, setControlsOpen] = useState<boolean>(false);

  async function performFire() {
    setLoading(true);
    setStatus(null);
    try {
      // YR.13.3 (G-057): the kill-switch FIRE flow now opens a pending
      // two-person approval rather than firing directly. Operator A's
      // phrase-confirm submits to /api/admin/two-person-approval; the
      // server returns an 8-char base32 code + approval id. Operator A
      // surfaces the code to the second operator (out-of-band) and the
      // PendingApprovalsPanel below routes operator B's confirmation
      // through to the registered KILL_SWITCH_FIRE handler.
      const csrf = readCsrfToken();
      const res = await fetch("/api/admin/two-person-approval", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({
          actionType: "KILL_SWITCH_FIRE",
          payload: {
            signal,
            reason,
            ...(note.trim() && { note: note.trim() }),
          },
        }),
      });
      let body: {
        approvalId?: string;
        code?: string;
        expiresAt?: string;
        error?: string;
      };
      try {
        body = (await res.json()) as typeof body;
      } catch {
        body = { error: "Invalid response" };
      }
      if (!res.ok || !body.approvalId || !body.code) {
        setStatus({
          ok: false,
          signal,
          firedAt: "",
          error: "Approval submit failed",
        });
        return;
      }
      setStatus({
        ok: true,
        signal,
        firedAt: "",
        approvalId: body.approvalId,
        approvalCode: body.code,
        approvalExpiresAt: body.expiresAt,
      });
    } catch {
      setStatus({ ok: false, signal, firedAt: "", error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  function handleFire(e: React.FormEvent) {
    e.preventDefault();
    setConfirmOpen(true);
  }

  function handleConfirm() {
    setConfirmOpen(false);
    void performFire();
  }

  const confirmPhrase = `FIRE ${signal}`;

  return (
    <Panel
      // v2-skin parity — design (wave-d Flags) renders Kill signals as a
      // PLAIN panel; red budget is "0 / armed 1" and the armed chip carries
      // it. The lacquer variant painted a red border/glow even while IDLE.
      headingLevel={2}
      // P5 (wave-d/Flags v2.html) — design .p-hd is "<h3>Kill signals</h3>"
      // + Idle chip only: lowercase "signals", no invented "Emergency halt ·
      // 2/3 approver policy" subtitle (2/3 also contradicted the 2-of-2 rule).
      title="Kill signals"
      meta={<KillSwitchArmedChip />}
    >
      <section
        aria-labelledby="kill-switch-heading"
        data-testid="kill-switch-section"
        data-controls-open={controlsOpen ? "true" : "false"}
      >
        {/* P5 (wave-d/Flags v2.html) — the design lays the description, reveal
            gate, and controls DIRECTLY in the panel body. The prior nested
            bordered card was an off-spec extra box; F-3-007 error-prevention is
            preserved by the collapsed-by-default reveal gate below (which is in
            the design too), not by an inner card. */}
        <h3 id="kill-switch-heading" className="sr-only">
          Kill signals
        </h3>
        {/* Design "Flags v2": a plain-language description precedes the
            reveal gate so the operator knows what engaging a signal does. */}
        <p
          data-testid="kill-switch-desc"
          style={{
            maxWidth: "52ch",
            fontSize: 13,
            color: "var(--fg-dim)",
            margin: "0 0 12px",
          }}
        >
          Engaging a kill signal cancels all in-flight work gated by that
          signal. It needs a confirm phrase here and a second approver before
          anything stops.
        </p>
        {/* F-3-007: collapsed-by-default disclosure. The reveal is the view's
            single torii-red moment (btn-danger) — the danger lives on the gate,
            not the neutral controls behind it. Native button + aria-expanded
            keeps it keyboard accessible and screen-reader discoverable. */}
        <button
          type="button"
          onClick={() => setControlsOpen((prev) => !prev)}
          aria-label={`${controlsOpen ? "Hide" : "Show"} kill-switch controls`}
          aria-expanded={controlsOpen}
          aria-controls="kill-switch-controls"
          data-testid="kill-switch-toggle"
          className="btn btn-danger"
        >
          {controlsOpen
            ? "Hide kill-switch controls"
            : "Show kill-switch controls"}
        </button>
        {!controlsOpen && (
          <p
            data-testid="kill-switch-collapsed-hint"
            style={{
              marginTop: "var(--space-2)",
              fontSize: 12.5,
              color: "var(--fg-ghost)",
            }}
          >
            Controls stay hidden so routine flag work can&apos;t trip them by
            accident.
          </p>
        )}
        <div
          id="kill-switch-controls"
          data-testid="kill-switch-controls"
          hidden={!controlsOpen}
          style={{ marginTop: controlsOpen ? 12 : 0 }}
        >
          <form
            onSubmit={handleFire}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div>
              <label
                htmlFor="ks-signal"
                className="mono"
                style={{
                  display: "block",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  color: "var(--fg-dim)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Signal
              </label>
              <select
                id="ks-signal"
                value={signal}
                onChange={(e) => setSignal(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 12.5,
                  background: "rgba(var(--black-rgb), 0.3)",
                  color: "var(--fg)",
                  border: "1px solid var(--b-1)",
                  borderRadius: 6,
                  fontFamily: "var(--mono)",
                }}
              >
                {KILL_SIGNALS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="ks-reason"
                className="mono"
                style={{
                  display: "block",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  color: "var(--fg-dim)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Reason
              </label>
              <select
                id="ks-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as KillReason)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 12.5,
                  background: "rgba(var(--black-rgb), 0.3)",
                  color: "var(--fg)",
                  border: "1px solid var(--b-1)",
                  borderRadius: 6,
                  fontFamily: "var(--mono)",
                }}
              >
                {KILL_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="ks-note"
                className="mono"
                style={{
                  display: "block",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  color: "var(--fg-dim)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Note (optional)
              </label>
              <input
                id="ks-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Operator note…"
                autoComplete="off"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 12.5,
                  background: "rgba(var(--black-rgb), 0.3)",
                  color: "var(--fg)",
                  border: "1px solid var(--b-1)",
                  borderRadius: 6,
                  fontFamily: "var(--sans)",
                }}
              />
            </div>
            {/* §1.2 red-demotion: the view's single torii-red is the reveal
                gate above; the actual engage is a neutral primary that opens
                the confirm-phrase modal (where the destructive red lives). */}
            <button
              type="submit"
              disabled={loading}
              className="btn"
              data-testid="fire-button"
              style={{
                justifyContent: "center",
                width: "100%",
                marginTop: "var(--space-1)",
              }}
            >
              {I.power}
              {loading ? "Firing…" : "Engage kill switch"}
            </button>
          </form>
          {status !== null && (
            <div
              role="status"
              aria-live="polite"
              data-testid="fire-status"
              className={`chip ${status.ok ? "jade" : "red"}`}
              style={{ marginTop: 14, display: "inline-flex" }}
            >
              <span className="dot" />
              {status.ok
                ? `Approval submitted — share code ${status.approvalCode ?? "????????"} with second operator`
                : "Error: kill-switch request failed"}
            </div>
          )}
          {status?.ok === true && status.approvalCode && (
            <div
              data-testid="approval-code-display"
              className="mono"
              style={{
                marginTop: "var(--space-2)",
                padding: "8px 10px",
                background: "rgba(var(--black-rgb), 0.3)",
                border: "1px solid var(--b-1)",
                borderRadius: 6,
                fontSize: 13,
                letterSpacing: "0.18em",
              }}
            >
              <strong>{status.approvalCode}</strong>
              {status.approvalExpiresAt && (
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--fg-dim)",
                    marginTop: "var(--space-1)",
                  }}
                >
                  Expires {status.approvalExpiresAt}
                </span>
              )}
            </div>
          )}

          <ConfirmPhraseModal
            isOpen={confirmOpen}
            title={`Fire ${signal}?`}
            description={`This will cancel all in-flight work gated by ${signal} and cannot be undone through this page. Reason: ${reason}.`}
            phrase={confirmPhrase}
            confirmLabel="Fire Signal"
            onConfirm={handleConfirm}
            onClose={() => setConfirmOpen(false)}
          />
        </div>
      </section>
    </Panel>
  );
}

/**
 * Design "Flags v2" §Fleet status: a dedicated 30-day-window panel with
 * honest empties (no traffic yet), replacing the invented hero SLO gauge.
 * Values are not fabricated — the demo build has no fleet traffic.
 */
function FleetStatusPanel(): ReactElement {
  return (
    <Panel headingLevel={2} title="Fleet status" sub="30-day window">
      <div className="drows">
        <div className="drow">
          <span className="l">Uptime</span>
          <span className="v dim">— no data yet</span>
        </div>
        <div className="drow">
          <span className="l">Latency p95</span>
          <span className="v dim">— no traffic yet</span>
        </div>
        <div className="drow">
          <span className="l">Quota used</span>
          <span className="v dim">— no traffic yet</span>
        </div>
        <div className="drow">
          <span className="l">Policy drift</span>
          <span className="v dim">— none detected</span>
        </div>
      </div>
    </Panel>
  );
}

export default function AdminFlagsPage() {
  return (
    <>
      <PageHead
        namingId="flags"
        title="Feature flags"
        lede="Runtime switches and the emergency kill-switch."
        variant="compact"
      />

      <div className="grid">
        <div style={{ gridColumn: "span 8" }}>
          <FlagsRegistry />
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <KillSwitchPanel />
        </div>
        <div style={{ gridColumn: "span 12" }}>
          <FleetStatusPanel />
        </div>
        <div style={{ gridColumn: "span 12" }}>
          {/* P5 (wave-d/Flags v2.html) — §5.9 two-person-rule paper ceremony:
              mono-caps "Two-person rule" kicker + serif "Pending approvals" +
              plain-language body + outline status chip. Passing kicker/body
              flips PendingApprovalsPanel to its sanctioned paper layout
              (previously the default Inter card with no kicker). The
              review-queue wiring (poll + co-sign) is unchanged. The design's
              leading "Nothing waiting." is dropped from the body — that live
              zero/count state is carried honestly by the status chip. */}
          <PendingApprovalsPanel
            kicker="Two-person rule"
            title="Pending approvals"
            body="Kill-switch engagement and production flag overrides need a second operator's seal before they take effect."
          />
        </div>
      </div>
    </>
  );
}
