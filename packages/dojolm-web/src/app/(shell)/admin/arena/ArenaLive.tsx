// SPDX-License-Identifier: Apache-2.0
/**
 * ArenaLive — T7.2 / G-026.
 *
 * Live + Replay sub-tab for /admin/arena. Closes the post-Yamabushi-train
 * splinter (yr20-21-visualization-splinters-carry-forward.md) by wiring
 * the existing `/api/arena/[id]/stream` SSE consumer + a replay scrubber
 * for completed matches.
 *
 * Modes:
 *   - idle    : no match selected; matchId input prompts a Connect
 *   - live    : EventSource open; events tail in newest-first
 *   - replay  : completed match loaded; slider scrubs through events
 *
 * Connect flow:
 *   1. Validate matchId against `SAFE_MATCH_ID` regex.
 *   2. GET /api/arena/[id] to determine status + load existing events.
 *   3. If `completed` or `aborted` → switch to replay mode.
 *      Else                       → open EventSource, switch to live mode.
 *
 * SSE schema (from `/api/arena/[id]/stream/route.ts`):
 *   - `connected`      : { matchId, status, eventCount }
 *   - `match_event`    : MatchEvent (full payload from match.events[])
 *   - `status`         : { status, roundsCompleted, scores, winnerId }
 *   - `match_complete` : { status, winnerId, winReason, scores, finalScores, totalRounds }
 *   - `error`          : { message }
 *
 * Discriminant-redaction (R-T1):
 *   - STATUS_CHIP / STATUS_LABEL : closed MatchStatus → chip class + label
 *   - EVENT_TYPE_LABEL           : closed MatchEventType → display label
 *   - LOAD_ERROR_COPY            : closed LoadErrorCode → user copy
 *
 * Stop-condition handling:
 *   - SSE event framing IS defined upstream — no poll-based fallback needed.
 *   - Per-primitive ≤400-line ceiling honoured (this file ~370 lines).
 *   - Zero new design primitives; reuses Panel + cap from `@/design`.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Panel, cap } from "@/design";
import { AivssPill } from "@/design/aivss";
import type { AivssScore } from "bu-tpi/aivss";

type MatchStatus = "pending" | "running" | "completed" | "aborted";
type FighterRole = "attacker" | "defender";
type MatchEventType =
  | "match_start"
  | "match_end"
  | "round_start"
  | "round_end"
  | "attack_sent"
  | "attack_success"
  | "attack_blocked"
  | "defense_hold"
  | "flag_captured"
  | "hill_claimed"
  | "hill_held"
  | "role_swap"
  | "score_update"
  | "sage_mutation"
  | "fighter_error"
  | "timeout";

type LiveMode = "idle" | "live" | "replay";
type LoadErrorCode =
  | "forbidden"
  | "invalid-input"
  | "network"
  | "server"
  | "not-found";

interface MatchEventLite {
  readonly id: string;
  readonly round: number;
  readonly timestamp: string;
  readonly type: MatchEventType;
  readonly fighterId: string;
  readonly role: FighterRole | null;
  /**
   * Phase G.3 / TICKET-G3-ARENA — optional server-supplied AIVSS score.
   * Populated by `/api/arena/[id]/stream` once TICKET-G3-API-ARENA ships
   * the per-event scoring schema. Until then `aivss` is `undefined` and
   * the host renders `<AivssPill band='none'>` as a non-judgmental
   * placeholder (RONIN + ONIGAESHI-precedent suppression — match-event
   * rows do NOT carry an attack-class signal, so a client-side derivation
   * from `MatchEventType` would mislead operators on the live combat
   * surface).
   *
   * @see ADR-0097 §7 — Per-finding AIVSS field
   * @see packages/dojolm-web/src/lib/arena/aivss-mapping.ts — the
   *      preserved-but-unused client-side derivation harness
   */
  readonly aivss?: AivssScore;
}

interface StatusSnapshot {
  readonly status: MatchStatus;
  readonly roundsCompleted: number;
  readonly winnerId: string | null;
}

const STATUS_CHIP: Record<MatchStatus, string> = {
  pending: "wb-badge muted",
  running: "wb-badge ok",
  completed: "wb-badge ok",
  aborted: "wb-badge alert",
};

const STATUS_LABEL: Record<MatchStatus, string> = {
  pending: "PENDING",
  running: "RUNNING",
  completed: "COMPLETED",
  aborted: "ABORTED",
};

const EVENT_TYPE_LABEL: Record<MatchEventType, string> = {
  match_start: "Match start",
  match_end: "Match end",
  round_start: "Round start",
  round_end: "Round end",
  attack_sent: "Attack sent",
  attack_success: "Attack success",
  attack_blocked: "Attack blocked",
  defense_hold: "Defense hold",
  flag_captured: "Flag captured",
  hill_claimed: "Hill claimed",
  hill_held: "Hill held",
  role_swap: "Role swap",
  score_update: "Score update",
  sage_mutation: "SAGE mutation",
  fighter_error: "Fighter error",
  timeout: "Timeout",
};

const LOAD_ERROR_COPY: Record<LoadErrorCode, string> = {
  forbidden: "Match access refused. Confirm admin access.",
  "invalid-input": "Invalid match id.",
  network: "Network error. Check your connection.",
  server: "Match service unavailable. Retry shortly.",
  "not-found": "Match not found.",
};

const VALID_STATUSES: ReadonlySet<MatchStatus> = new Set([
  "pending",
  "running",
  "completed",
  "aborted",
]);
const VALID_EVENT_TYPES: ReadonlySet<MatchEventType> = new Set([
  "match_start",
  "match_end",
  "round_start",
  "round_end",
  "attack_sent",
  "attack_success",
  "attack_blocked",
  "defense_hold",
  "flag_captured",
  "hill_claimed",
  "hill_held",
  "role_swap",
  "score_update",
  "sage_mutation",
  "fighter_error",
  "timeout",
]);
const VALID_ROLES: ReadonlySet<FighterRole> = new Set(["attacker", "defender"]);

const SAFE_MATCH_ID = /^[\w-]{1,128}$/;
// ISO-8601 prefix (date + time + tz/precision tail). 32-char cap covers the
// canonical `2026-05-03T09:34:21.123Z` shape with margin. Anything failing
// this falls through to '' so the rendered placeholder is the neutral '—'.
const ISO_TS_RE = /^\d{4}-\d{2}-\d{2}T[\d:.Z+-]{0,20}$/;
const ID_MAX = 128;
const TS_MAX = 32;
export const MAX_EVENTS_DISPLAYED = 200;

function isMatchStatus(v: unknown): v is MatchStatus {
  return typeof v === "string" && VALID_STATUSES.has(v as MatchStatus);
}

function isEventType(v: unknown): v is MatchEventType {
  return typeof v === "string" && VALID_EVENT_TYPES.has(v as MatchEventType);
}

function isRole(v: unknown): v is FighterRole {
  return typeof v === "string" && VALID_ROLES.has(v as FighterRole);
}

function safeInt(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return 0;
  return Math.floor(v);
}

function sanitizeIdField(v: unknown): string {
  // Defense-in-depth (security MED-2/3/5): server upstream already restricts
  // ids to /^[\w-]{1,128}$/ but we re-validate here so an adversarial backend
  // (or future schema drift) cannot leak unsafe characters into testids /
  // <code> blocks. Empty string when invalid; render layer falls back to '—'.
  if (typeof v !== "string" || !SAFE_MATCH_ID.test(v)) return "";
  return cap(v, ID_MAX);
}

function sanitizeTimestamp(v: unknown): string {
  // Defense-in-depth (security MED-4): validate ISO-8601 prefix before rendering.
  if (typeof v !== "string") return "";
  const capped = cap(v, TS_MAX);
  return ISO_TS_RE.test(capped) ? capped : "";
}

/**
 * Phase G.3 / TICKET-G3-ARENA — closed-enum gate for the
 * `aivss.severity` band (mirrors TICKET-G3-BUKI / G3-RONIN /
 * G3-ONIGAESHI `isAivssSeverity` pattern). Without this validator,
 * `MatchEventLite.aivss` would be unreachable and the row's
 * `e.aivss ?? null` guard would always fall through to the suppression
 * branch — making the optional field dead code that would silently stay
 * broken when TICKET-G3-API-ARENA ships server-side AIVSS values.
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

/**
 * Phase G.3 / TICKET-G3-ARENA — wire-shape validator for `AivssScore`.
 * Returns null on any shape mismatch so consumers fall back to the
 * suppression branch (`<AivssPill band='none'>`).
 *
 * Mirrors TICKET-G3-RONIN / TICKET-G3-ONIGAESHI `sanitizeAivss`
 * verbatim. The route layer is admin-gated and emits a closed shape,
 * but defence-in-depth wire validation matches the G-3 sister pattern +
 * protects against future schema drift.
 */
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

function sanitizeEvent(raw: unknown): MatchEventLite | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !SAFE_MATCH_ID.test(r.id)) return null;
  if (!isEventType(r.type)) return null;
  // Phase G.3 / TICKET-G3-ARENA — optional `aivss` wire passthrough.
  // The route layer does NOT emit this field today (suppression branch);
  // when TICKET-G3-API-ARENA ships, the field arrives populated and
  // `sanitizeAivss` narrows it to a closed shape.
  const aivss = sanitizeAivss(r.aivss);
  const base: Omit<MatchEventLite, "aivss"> = {
    id: cap(r.id, ID_MAX),
    round: safeInt(r.round),
    timestamp: sanitizeTimestamp(r.timestamp),
    type: r.type,
    fighterId: sanitizeIdField(r.fighterId),
    role: isRole(r.role) ? r.role : null,
  };
  return aivss === null ? base : { ...base, aivss };
}

function sanitizeStatus(raw: unknown): StatusSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isMatchStatus(r.status)) return null;
  return {
    status: r.status,
    // SSE `match_complete` payload uses `totalRounds`; `status` events use
    // `roundsCompleted`. Accept either so the rounds counter never silently
    // resets to 0 when a match finishes.
    roundsCompleted: safeInt(r.roundsCompleted ?? r.totalRounds),
    winnerId:
      typeof r.winnerId === "string"
        ? sanitizeIdField(r.winnerId) || null
        : null,
  };
}

function statusFromHttp(status: number): LoadErrorCode {
  if (status === 401 || status === 403) return "forbidden";
  if (status === 400) return "invalid-input";
  if (status === 404) return "not-found";
  return "server";
}

export function MatchLiveTab() {
  const [matchId, setMatchId] = useState("");
  const [mode, setMode] = useState<LiveMode>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LoadErrorCode | null>(null);
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(null);
  const [events, setEvents] = useState<readonly MatchEventLite[]>([]);
  const [replayCursor, setReplayCursor] = useState(0);
  const sourceRef = useRef<EventSource | null>(null);
  // Mounted-flag (code HIGH-1): every async continuation that writes state
  // checks this first so a fast Connect → Disconnect or unmount-mid-fetch
  // cannot ship stale writes (or open a phantom second EventSource).
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (sourceRef.current !== null) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
    };
  }, []);

  function reset(): void {
    if (sourceRef.current !== null) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    setMode("idle");
    setSnapshot(null);
    setEvents([]);
    setReplayCursor(0);
    setError(null);
  }

  function appendEvent(raw: unknown): void {
    const e = sanitizeEvent(raw);
    if (e === null) return;
    setEvents((prev) => {
      const next = [e, ...prev];
      return next.length > MAX_EVENTS_DISPLAYED
        ? next.slice(0, MAX_EVENTS_DISPLAYED)
        : next;
    });
  }

  function openLiveStream(id: string): void {
    // jsdom test envs may not provide EventSource; fall back to error.
    if (typeof EventSource === "undefined") {
      setError("server");
      setMode("idle");
      return;
    }
    const es = new EventSource(`/api/arena/${encodeURIComponent(id)}/stream`);
    sourceRef.current = es;

    es.addEventListener("connected", (ev) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse((ev as MessageEvent).data) as unknown;
        const snap = sanitizeStatus(data);
        if (snap !== null) setSnapshot(snap);
      } catch {
        /* ignore parse error; status event will follow */
      }
    });

    es.addEventListener("status", (ev) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse((ev as MessageEvent).data) as unknown;
        const snap = sanitizeStatus(data);
        if (snap !== null) setSnapshot(snap);
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("match_event", (ev) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse((ev as MessageEvent).data) as unknown;
        appendEvent(data);
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("match_complete", (ev) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse((ev as MessageEvent).data) as unknown;
        const snap = sanitizeStatus(data);
        if (snap !== null) setSnapshot(snap);
        // After a normal completion, freeze the accumulated event log into
        // chronological order and switch to replay mode so the operator can
        // scrub back through the match without reconnecting. setEvents
        // updater stays pure (no side-effects) so strict-mode double-invokes
        // are safe; sibling setters batch with the same React tick.
        setEvents((prev) => [...prev].reverse());
        setReplayCursor(0);
        setMode("replay");
      } catch {
        /* ignore */
      }
      es.close();
      sourceRef.current = null;
    });

    es.addEventListener("error", () => {
      // Some browsers (notably Firefox) fire a generic 'error' immediately
      // after .close() moves readyState → CLOSED (=2). Suppress that case so
      // a normal match_complete close does not flash a network banner.
      if (es.readyState === 2 /* CLOSED */) return;
      if (!mountedRef.current) return;
      setError("network");
      setMode("idle");
      es.close();
      sourceRef.current = null;
    });
  }

  async function onConnect(): Promise<void> {
    if (busy) return;
    if (!SAFE_MATCH_ID.test(matchId)) {
      setError("invalid-input");
      return;
    }
    const id = matchId;
    reset();
    setBusy(true);
    try {
      const res = await fetchWithAuth(`/api/arena/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!mountedRef.current) return;
      if (!res.ok) {
        setError(statusFromHttp(res.status));
        setMode("idle");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as {
        match?: {
          status?: unknown;
          events?: readonly unknown[];
          winnerId?: unknown;
          rounds?: readonly unknown[];
        };
      };
      if (!mountedRef.current) return;
      const m = body.match ?? {};
      if (!isMatchStatus(m.status)) {
        setError("server");
        setMode("idle");
        return;
      }
      setSnapshot({
        status: m.status,
        roundsCompleted: Array.isArray(m.rounds) ? m.rounds.length : 0,
        winnerId:
          typeof m.winnerId === "string"
            ? sanitizeIdField(m.winnerId) || null
            : null,
      });
      const safeEvents: MatchEventLite[] = [];
      for (const raw of m.events ?? []) {
        const ev = sanitizeEvent(raw);
        if (ev === null) continue;
        safeEvents.push(ev);
        if (safeEvents.length >= MAX_EVENTS_DISPLAYED) break;
      }
      if (m.status === "completed" || m.status === "aborted") {
        setEvents(safeEvents);
        // Replay starts at the FIRST event so the operator scrubs forward
        // through time (code HIGH-3). Setting to length-1 was the inverse.
        setReplayCursor(0);
        setMode("replay");
      } else {
        setEvents([...safeEvents].reverse());
        setMode("live");
        openLiveStream(id);
      }
    } catch {
      if (!mountedRef.current) return;
      setError("network");
      setMode("idle");
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }

  function onDisconnect(): void {
    reset();
  }

  const inputValid = SAFE_MATCH_ID.test(matchId);
  const replayEvent =
    mode === "replay" && events.length > 0
      ? events[Math.min(replayCursor, events.length - 1)]
      : null;

  return (
    <Panel
      headingLevel={2}
      title="Live + Replay"
      sub={
        mode === "idle"
          ? "Enter a match id to attach to the SSE stream or load a completed match"
          : mode === "live"
            ? `Streaming · ${events.length} events`
            : `Replay · ${events.length} events`
      }
    >
      {error !== null && (
        <div
          role="alert"
          data-testid="arena-live-error"
          className="wb-banner danger"
          style={{ marginBottom: 10 }}
        >
          {LOAD_ERROR_COPY[error]}
        </div>
      )}

      <div className="wb-field">
        <label htmlFor="arena-live-match-id">Match id</label>
        <input
          id="arena-live-match-id"
          data-testid="arena-live-match-id-input"
          type="text"
          className="wb-input"
          value={matchId}
          onChange={(e) => setMatchId(e.target.value.slice(0, ID_MAX))}
          disabled={busy || mode !== "idle"}
          placeholder="match-abc123"
          autoComplete="off"
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {mode === "idle" ? (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="arena-live-connect-button"
            onClick={onConnect}
            disabled={busy || !inputValid}
            aria-label={busy ? "Connecting…" : "Connect to match stream"}
          >
            {busy ? "Connecting…" : "Connect"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            data-testid="arena-live-disconnect-button"
            onClick={onDisconnect}
            aria-label="Disconnect from match stream"
          >
            Disconnect
          </button>
        )}
      </div>

      {snapshot !== null && (
        <div
          data-testid="arena-live-status-panel"
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <span
            className={STATUS_CHIP[snapshot.status]}
            data-testid="arena-live-status-chip"
            aria-label={`Status ${STATUS_LABEL[snapshot.status]}`}
          >
            {STATUS_LABEL[snapshot.status]}
          </span>
          <span data-testid="arena-live-rounds" style={{ fontSize: 12 }}>
            Rounds: {snapshot.roundsCompleted}
          </span>
          {snapshot.winnerId !== null && (
            <span data-testid="arena-live-winner" style={{ fontSize: 12 }}>
              Winner: <code>{snapshot.winnerId}</code>
            </span>
          )}
        </div>
      )}

      {mode === "replay" && events.length > 0 && (
        <div data-testid="arena-live-replay-controls" style={{ marginTop: 16 }}>
          <label htmlFor="arena-live-replay-slider" style={{ fontSize: 12 }}>
            Event {replayCursor + 1} of {events.length}
          </label>
          <input
            id="arena-live-replay-slider"
            data-testid="arena-live-replay-slider"
            type="range"
            min={0}
            max={events.length - 1}
            value={replayCursor}
            onChange={(e) => setReplayCursor(safeInt(Number(e.target.value)))}
            aria-valuemin={0}
            aria-valuemax={events.length - 1}
            aria-valuenow={replayCursor}
            aria-valuetext={`Event ${replayCursor + 1} of ${events.length}`}
            aria-label="Replay event cursor"
            style={{ width: "100%", marginTop: 4 }}
          />
          {replayEvent !== null && (
            <div
              data-testid="arena-live-replay-detail"
              style={{
                marginTop: 8,
                padding: 8,
                background: "var(--es-wash, transparent)",
                fontSize: 12,
              }}
            >
              <div>
                <strong>Type:</strong>{" "}
                <span
                  aria-label={`Event type ${EVENT_TYPE_LABEL[replayEvent.type]}`}
                >
                  {EVENT_TYPE_LABEL[replayEvent.type]}
                </span>
              </div>
              <div>
                <strong>Round:</strong> {replayEvent.round}
              </div>
              <div>
                <strong>Fighter:</strong>{" "}
                <code>{replayEvent.fighterId || "—"}</code>
              </div>
              <div>
                <strong>Timestamp:</strong> {replayEvent.timestamp || "—"}
              </div>
              {/*
                Phase G.3 / TICKET-G3-ARENA — server-supplied
                `replayEvent.aivss` wins when present
                (TICKET-G3-API-ARENA future). Until then, client-side
                derivation is INTENTIONALLY SUPPRESSED on the
                match-event surface: the `MatchEventType` enum
                describes combat lifecycle (match_*, round_*,
                attack_*, scoring), not attack class — deriving an
                AIVSS chip from the event type would mislead
                operators on the live combat surface (where the chip
                would influence stop-the-match decisions). The mapper
                machinery in `lib/arena/aivss-mapping.ts` is preserved
                for harness symmetry + the future server-side flow but
                is NOT invoked here.

                RONIN + ONIGAESHI precedent — see `RoninAdminClient.tsx`
                queue rows + `onigaeshi/page.tsx` audit rows.
              */}
              <div style={{ marginTop: 4 }}>
                <strong>AIVSS:</strong>{" "}
                {replayEvent.aivss !== undefined ? (
                  <AivssPill
                    band={replayEvent.aivss.severity}
                    score={replayEvent.aivss.base}
                    testId={`arena-aivss-pill-replay-${replayEvent.id}`}
                  />
                ) : (
                  <AivssPill
                    band="none"
                    testId={`arena-aivss-pill-replay-${replayEvent.id}`}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "live" && (
        <div data-testid="arena-live-event-log" style={{ marginTop: 16 }}>
          <div
            style={{ fontSize: 12, marginBottom: 6, color: "var(--fg-dim)" }}
          >
            Event log (newest first, cap {MAX_EVENTS_DISPLAYED})
          </div>
          {events.length === 0 ? (
            <p className="wb-hint" data-testid="arena-live-event-log-empty">
              Waiting for events…
            </p>
          ) : (
            <ul
              role="list"
              aria-label="Live match events"
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {events.map((ev) => (
                <li
                  key={ev.id}
                  data-testid={`arena-live-event-${ev.id}`}
                  style={{
                    padding: "4px 0",
                    borderBottom: "1px solid var(--b-0, #2a2a2a)",
                    fontSize: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      aria-label={`Event type ${EVENT_TYPE_LABEL[ev.type]}`}
                    >
                      {EVENT_TYPE_LABEL[ev.type]}
                    </span>
                    {" · round "}
                    {ev.round}
                    {" · "}
                    <code style={{ fontSize: 11 }}>{ev.fighterId || "—"}</code>
                  </span>
                  {/*
                    Phase G.3 / TICKET-G3-ARENA — same suppression
                    rationale as the replay detail panel above.
                    Server-supplied `ev.aivss` wins when present;
                    client-side derivation is intentionally suppressed.
                  */}
                  {ev.aivss !== undefined ? (
                    <AivssPill
                      band={ev.aivss.severity}
                      score={ev.aivss.base}
                      testId={`arena-aivss-pill-${ev.id}`}
                    />
                  ) : (
                    <AivssPill
                      band="none"
                      testId={`arena-aivss-pill-${ev.id}`}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}
