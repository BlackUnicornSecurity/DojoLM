// SPDX-License-Identifier: Apache-2.0
/**
 * ArenaTabs — YR.20 / G-025 / G-026 / G-027 / G-028.
 *
 * Sibling subcomponents to /admin/arena/ArenaClient.tsx. Houses the 4
 * new tabs added on top of the existing Leaderboard workbench:
 *
 *   - Match creation is owned by MatchCreationWizardLive. The retired
 *     single-form implementation must not reappear beside that 4-step flow.
 *   - MatchesTab     → GET /api/arena → list of recent matches with
 *                      verdict + round count + battle-log export per row.
 *   - RosterTab      → GET /api/arena/warriors → warrior grid.
 *
 * Stop-condition handling (per YR.20 prompt):
 *   - The Live + Replay views (G-026 — round-by-round event animation
 *     + replay slider) are NOT shipped here. The Matches tab covers
 *     the listing-and-export half; live event animation requires a
 *     /api/arena/[id]/stream consumer that doesn't yet ship a wired
 *     client. Tracked for YR.21.
 *   - Battle-log export (G-027) is a button on each Matches row using
 *     POST /api/arena/export — the route is admin-gated under
 *     withAuth post-YR.20. CSRF threaded via fetchWithAuth.
 *
 * Discriminant-redaction (R-T1):
 *   - GAME_MODE_LABEL  : closed enum → display label
 *   - ATTACK_MODE_LABEL: closed enum → display label
 *   - STATUS_CHIP/STATUS_LABEL : closed enum → chip class + label
 *   - EXPORT_FORMAT_LABEL: closed enum → display label
 *   - EXPORT_ERROR_COPY : closed ErrorCode → user copy
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { EmptyState, Panel, cap } from "@/design";

type GameMode = "CTF" | "KOTH" | "RvB";
type AttackMode = "kunai" | "shuriken" | "naginata" | "musashi";
type MatchStatus = "pending" | "running" | "completed" | "aborted";
type ExportFormat = "training" | "markdown" | "dna";
type ExportErrorCode =
  | "forbidden"
  | "invalid-input"
  | "network"
  | "server"
  | "not-found";

interface MatchLite {
  readonly id: string;
  readonly status: MatchStatus;
  readonly gameMode: GameMode;
  readonly attackMode: AttackMode;
  readonly fighterCount: number;
  readonly winnerId: string | null;
  readonly roundCount: number;
  readonly createdAt: string;
}

interface WarriorLite {
  readonly modelId: string;
  readonly modelName: string;
  readonly provider: string;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: number;
  readonly currentBelt: string;
}

const GAME_MODE_LABEL: Record<GameMode, string> = {
  CTF: "CTF",
  KOTH: "King of the Hill",
  RvB: "Red vs Blue",
};

const ATTACK_MODE_LABEL: Record<AttackMode, string> = {
  kunai: "Kunai (passive)",
  shuriken: "Shuriken (basic)",
  naginata: "Naginata (advanced)",
  musashi: "Musashi (aggressive)",
};

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

const EXPORT_FORMAT_LABEL: Record<ExportFormat, string> = {
  training: "Training data (JSONL)",
  markdown: "Markdown report",
  dna: "DNA pipeline",
};

const EXPORT_ERROR_COPY: Record<ExportErrorCode, string> = {
  forbidden: "Export refused. Confirm admin access.",
  "invalid-input": "Invalid match id or format.",
  network: "Network error. Check your connection.",
  server: "Export service unavailable. Retry shortly.",
  "not-found": "Match not found.",
};

const VALID_GAME_MODES: ReadonlySet<GameMode> = new Set(["CTF", "KOTH", "RvB"]);
const VALID_ATTACK_MODES: ReadonlySet<AttackMode> = new Set([
  "kunai",
  "shuriken",
  "naginata",
  "musashi",
]);
const VALID_MATCH_STATUS: ReadonlySet<MatchStatus> = new Set([
  "pending",
  "running",
  "completed",
  "aborted",
]);

const ID_MAX = 128;
const NAME_MAX = 80;
const PROVIDER_MAX = 40;
const TS_MAX = 32;
const MAX_MATCHES_DISPLAYED = 25;
const MAX_WARRIORS_DISPLAYED = 50;

function isGameMode(v: unknown): v is GameMode {
  return typeof v === "string" && VALID_GAME_MODES.has(v as GameMode);
}

function isAttackMode(v: unknown): v is AttackMode {
  return typeof v === "string" && VALID_ATTACK_MODES.has(v as AttackMode);
}

function isMatchStatus(v: unknown): v is MatchStatus {
  return typeof v === "string" && VALID_MATCH_STATUS.has(v as MatchStatus);
}

function safeNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function sanitizeMatch(raw: unknown): MatchLite | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  if (!isMatchStatus(r.status)) return null;
  const cfg = (r.config ?? {}) as Record<string, unknown>;
  if (!isGameMode(cfg.gameMode)) return null;
  if (!isAttackMode(cfg.attackMode)) return null;
  const fighters = Array.isArray(r.fighters) ? r.fighters : [];
  const rounds = Array.isArray(r.rounds) ? r.rounds : [];
  return {
    id: cap(r.id, ID_MAX),
    status: r.status,
    gameMode: cfg.gameMode,
    attackMode: cfg.attackMode,
    fighterCount: fighters.length,
    winnerId: typeof r.winnerId === "string" ? cap(r.winnerId, ID_MAX) : null,
    roundCount: rounds.length,
    createdAt: cap(typeof r.createdAt === "string" ? r.createdAt : "", TS_MAX),
  };
}

function sanitizeWarrior(raw: unknown): WarriorLite | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.modelId !== "string" || typeof r.modelName !== "string")
    return null;
  if (typeof r.provider !== "string") return null;
  return {
    modelId: cap(r.modelId, ID_MAX),
    modelName: cap(r.modelName, NAME_MAX),
    provider: cap(r.provider, PROVIDER_MAX),
    wins: safeNumber(r.wins),
    losses: safeNumber(r.losses),
    draws: safeNumber(r.draws),
    winRate: Math.min(1, Math.max(0, safeNumber(r.winRate))),
    currentBelt:
      typeof r.currentBelt === "string" ? cap(r.currentBelt, 32) : "unranked",
  };
}

// =============================================================================
// MatchesTab — match list with battle-log export per row (G-026 + G-027)
// =============================================================================

export function MatchesTab() {
  const [matches, setMatches] = useState<readonly MatchLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportError, setExportError] = useState<{
    id: string;
    code: ExportErrorCode;
  } | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth("/api/arena?limit=25", {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as {
          matches?: readonly unknown[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setError("Match list unavailable");
          setMatches([]);
          return;
        }
        const safe: MatchLite[] = [];
        for (const item of body.matches ?? []) {
          const m = sanitizeMatch(item);
          if (m && safe.length < MAX_MATCHES_DISPLAYED) safe.push(m);
        }
        setMatches(safe);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Network error");
          setMatches([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onExport(matchId: string, format: ExportFormat) {
    if (exportingId !== null) return;
    setExportingId(matchId);
    setExportError(null);
    try {
      const res = await fetchWithAuth("/api/arena/export", {
        method: "POST",
        body: JSON.stringify({ matchId, format }),
      });
      if (!res.ok) {
        let code: ExportErrorCode = "server";
        if (res.status === 401 || res.status === 403) code = "forbidden";
        else if (res.status === 400) code = "invalid-input";
        else if (res.status === 404) code = "not-found";
        setExportError({ id: matchId, code });
        return;
      }
      // For training + markdown the response is a downloadable file;
      // for dna it's a JSON acknowledgement. Read text + offer a save.
      if (format === "dna") {
        // Acknowledged in-band; nothing to download.
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `match-${matchId}.${format === "training" ? "jsonl" : "md"}`;
      a.click();
      // Microtask cleanup so the click has time to fire.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setExportError({ id: matchId, code: "network" });
    } finally {
      setExportingId(null);
    }
  }

  return (
    <Panel
      headingLevel={2}
      title="Matches"
      sub={
        loading
          ? "Fetching matches…"
          : error
            ? error
            : `${matches.length} most-recent matches`
      }
    >
      {error !== null && (
        <div
          role="alert"
          data-testid="arena-matches-error"
          className="wb-banner danger"
        >
          {error}
        </div>
      )}
      {!loading && !error && matches.length === 0 && (
        <EmptyState
          module="arena"
          state="empty"
          title="No matches yet"
          sub="Create one in the Match wizard tab to populate this list."
          cta={{ label: "Open Match wizard", href: "/admin/arena?tab=wizard" }}
          testId="arena-matches-empty"
          compact
        />
      )}
      {matches.length > 0 && (
        <div
          className="v2-data-scroll"
          role="region"
          aria-label="Arena matches table scroll area"
          tabIndex={0}
        >
          <table
            className="wb-table"
            aria-label="Arena matches"
            data-testid="arena-matches-table"
          >
            <thead>
              <tr>
                <th>Id</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Fighters</th>
                <th>Rounds</th>
                <th>Created</th>
                <th>Battle log</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} data-testid={`arena-match-row-${m.id}`}>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                    {m.id}
                  </td>
                  <td>
                    <span
                      aria-label={`Game mode ${GAME_MODE_LABEL[m.gameMode]}`}
                    >
                      {GAME_MODE_LABEL[m.gameMode]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={STATUS_CHIP[m.status]}
                      aria-label={`Status ${STATUS_LABEL[m.status]}`}
                    >
                      {STATUS_LABEL[m.status]}
                    </span>
                  </td>
                  <td>{m.fighterCount}</td>
                  <td>{m.roundCount}</td>
                  <td style={{ fontSize: 11 }}>{m.createdAt}</td>
                  <td>
                    <select
                      data-testid={`arena-export-format-${m.id}`}
                      className="wb-select"
                      onChange={(e) => {
                        const next = e.target.value;
                        if (
                          next === "training" ||
                          next === "markdown" ||
                          next === "dna"
                        ) {
                          onExport(m.id, next);
                          e.currentTarget.value = "";
                        }
                      }}
                      value=""
                      disabled={exportingId === m.id}
                      aria-label={`Export battle log for match ${m.id}`}
                    >
                      <option value="" disabled>
                        {exportingId === m.id ? "Exporting…" : "Export…"}
                      </option>
                      <option value="training">
                        {EXPORT_FORMAT_LABEL.training}
                      </option>
                      <option value="markdown">
                        {EXPORT_FORMAT_LABEL.markdown}
                      </option>
                      <option value="dna">{EXPORT_FORMAT_LABEL.dna}</option>
                    </select>
                    {exportError !== null && exportError.id === m.id && (
                      <div
                        role="alert"
                        data-testid={`arena-export-error-${m.id}`}
                        style={{
                          fontSize: 11,
                          color: "var(--torii-hi)",
                          marginTop: 4,
                        }}
                      >
                        {EXPORT_ERROR_COPY[exportError.code]}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// =============================================================================
// RosterTab — warrior grid (G-028)
// =============================================================================

export function RosterTab() {
  const [warriors, setWarriors] = useState<readonly WarriorLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth("/api/arena/warriors", {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as {
          warriors?: readonly unknown[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setError("Warrior roster unavailable");
          setWarriors([]);
          return;
        }
        const safe: WarriorLite[] = [];
        for (const item of body.warriors ?? []) {
          const w = sanitizeWarrior(item);
          if (w && safe.length < MAX_WARRIORS_DISPLAYED) safe.push(w);
        }
        setWarriors(safe);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Network error");
          setWarriors([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(
    () => [...warriors].sort((a, b) => b.winRate - a.winRate),
    [warriors],
  );

  return (
    <Panel
      headingLevel={2}
      title="Warrior roster"
      sub={
        loading
          ? "Fetching warrior roster…"
          : error
            ? error
            : `${warriors.length} warriors · sorted by win rate`
      }
    >
      {error !== null && (
        <div
          role="alert"
          data-testid="arena-roster-error"
          className="wb-banner danger"
        >
          {error}
        </div>
      )}
      {!loading && !error && sorted.length === 0 && (
        <EmptyState
          module="arena"
          state="empty"
          title="No warriors registered yet"
          sub="Register a model fighter to start populating the roster."
          cta={{ label: "Register a fighter", href: "/admin/arena?tab=wizard" }}
          testId="arena-roster-empty"
          compact
        />
      )}
      {sorted.length > 0 && (
        <div
          className="v2-data-scroll"
          role="region"
          aria-label="Arena warrior roster table scroll area"
          tabIndex={0}
        >
          <table
            className="wb-table"
            aria-label="Arena warrior roster"
            data-testid="arena-roster-table"
          >
            <thead>
              <tr>
                <th>Model</th>
                <th>Provider</th>
                <th>W / L / D</th>
                <th>Win rate</th>
                <th>Belt</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((w) => (
                <tr
                  key={w.modelId}
                  data-testid={`arena-warrior-row-${w.modelId}`}
                >
                  <td>
                    <div>{w.modelName}</div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: "var(--fg-dim)",
                      }}
                    >
                      {w.modelId}
                    </div>
                  </td>
                  <td>{w.provider}</td>
                  <td>
                    {w.wins} / {w.losses} / {w.draws}
                  </td>
                  <td>{Math.round(w.winRate * 100)}%</td>
                  <td>{w.currentBelt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
