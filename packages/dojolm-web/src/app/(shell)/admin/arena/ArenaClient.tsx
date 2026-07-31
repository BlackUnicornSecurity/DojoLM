// SPDX-License-Identifier: Apache-2.0
/**
 * ArenaClient — YR.4.4 client component for `/admin/arena`.
 *
 * Live-wires the v2.1 Arena module to the design's Kumite composition
 * (wave-b Arena v2): a single torii-red "+ New stand-off" primary action,
 * four labeled mode cards, a mono-caps KPI strip with sub-captions, the
 * Leaderboard / Bracket / Recent-fighters panels, an Achievement-medals
 * panel, and the 計 Match-aggregates ref-block. The design has no
 * Headliner / Top-Fighters rail / attack-type + fixture charts, so those
 * legacy sections are retired.
 *
 *   - GET /api/arena/leaderboard powers standings, KPIs, brackets, and feeds.
 *   - Bracket placeholder seeded from the top four leaderboard entries.
 *   - Leaderboard rank tiles (top-10, capped via MAX_RANK_DISPLAYED)
 *
 * Discriminant-redaction:
 *   - STREAK_TO_TONE maps StreakType → tone class
 *   - STREAK_TO_FEED_KIND maps streak → FeedTagKind
 */

"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  PageHead,
  Panel,
  KpiStrip,
  type KpiStripItem,
  SegmentedSubTabs,
  type SegmentedSubTabItem,
  Bracket,
  type BracketRound,
  cap,
} from "@/design";
import { FeedRow, type FeedTagKind } from "@/design";
import type { Severity as FeedSeverity } from "@/design";
import { type ArenaMode } from "@/design/arena";
import { RefBlock } from "@/design/shell";
import {
  filterEntriesByMode,
  buildModeCounts,
  type GameMode,
} from "./arena-w18-adapters";
import { MatchesTab, RosterTab } from "./ArenaTabs";
import { MatchLiveTab } from "./ArenaLive";
import { AchievementLegend } from "./ArenaLeaderboardSections";
import { MatchCreationWizardLive } from "./MatchCreationWizardLive";
import {
  ARENA_OUTER_TAB_LABEL,
  ARENA_OUTER_TAB_ORDER,
  isArenaOuterTab,
  type ArenaOuterTab,
} from "./arena-tab-contract";
import { useArenaVisitedTabs } from "./useArenaVisitedTabs";
import { ArenaQuietEmpty } from "./ArenaQuietEmpty";

type StreakType = "win" | "loss" | "draw";

interface LeaderEntry {
  readonly modelId: string;
  readonly modelName: string;
  readonly provider: string;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly totalMatches: number;
  readonly winRate: number;
  readonly avgScore: number;
  readonly bestScore: number;
  readonly currentStreak: number;
  readonly streakType: StreakType;
  readonly favoriteGameMode: GameMode | null;
  readonly lastMatchAt: string | null;
}

interface GlobalStats {
  readonly totalMatches: number;
  readonly completedMatches: number;
}

interface LeaderboardResponse {
  readonly leaderboard?: readonly LeaderEntry[];
  readonly globalStats?: unknown;
  readonly total?: number;
}

const STREAK_TO_TONE: Record<StreakType, "red" | "jade" | "gold"> = {
  win: "jade",
  loss: "red",
  draw: "gold",
};

const STREAK_LABEL: Record<StreakType, string> = {
  win: "win streak",
  loss: "loss streak",
  draw: "draw streak",
};

const STREAK_TO_FEED_KIND: Record<StreakType, FeedTagKind> = {
  win: "allow",
  loss: "block",
  draw: "muted",
};

const STREAK_TO_FEED_SEV: Record<StreakType, FeedSeverity> = {
  win: "low",
  loss: "high",
  draw: "med",
};

export const MAX_RANK_DISPLAYED = 10;
export const MAX_FEED_DISPLAYED = 10;
const NAME_MAX = 80;
const PROVIDER_MAX = 40;
const ARIA_LABEL_MAX = 240;

function isStreakType(value: unknown): value is StreakType {
  return value === "win" || value === "loss" || value === "draw";
}

function isGameMode(value: unknown): value is GameMode {
  return value === "CTF" || value === "KOTH" || value === "RvB";
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sanitizeEntry(raw: unknown): LeaderEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.modelId !== "string" || typeof r.modelName !== "string")
    return null;
  if (typeof r.provider !== "string") return null;
  return {
    modelId: r.modelId,
    modelName: r.modelName,
    provider: r.provider,
    wins: safeNumber(r.wins),
    losses: safeNumber(r.losses),
    draws: safeNumber(r.draws),
    totalMatches: safeNumber(r.totalMatches),
    // /api/arena/leaderboard returns winRate as a 0–100 percentage
    // (post-buildLeaderboard `ratioToPct` conversion). Clamp on read so
    // a stale fixture or pre-conversion value cannot poison the rendered
    // percent (e.g. a misbehaving demo handler returning winRate=10000).
    winRate: Math.min(100, Math.max(0, safeNumber(r.winRate))),
    avgScore: safeNumber(r.avgScore),
    bestScore: safeNumber(r.bestScore),
    currentStreak: safeNumber(r.currentStreak),
    streakType: isStreakType(r.streakType) ? r.streakType : "draw",
    favoriteGameMode: isGameMode(r.favoriteGameMode)
      ? r.favoriteGameMode
      : null,
    lastMatchAt: typeof r.lastMatchAt === "string" ? r.lastMatchAt : null,
  };
}

function sanitizeStats(raw: unknown): GlobalStats {
  if (!raw || typeof raw !== "object") {
    return { totalMatches: 0, completedMatches: 0 };
  }
  const r = raw as Record<string, unknown>;
  return {
    totalMatches: safeNumber(r.totalMatches),
    completedMatches: safeNumber(r.completedMatches),
  };
}

// "2026-07-16T11:47:32.367Z" → "2026-07-16 11:47". The full ISO token has
// no spaces and overflows the narrow feed timestamp column (D6 overlap at
// 390); the trimmed date+minute form breaks on the space and fits.
function formatFeedTs(iso: string): string {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]} ${m[2]}` : cap(iso, 16);
}

function buildBracketRounds(
  top4: readonly LeaderEntry[],
): readonly BracketRound[] {
  if (top4.length < 2) return [];
  const matches = [];
  for (let i = 0; i < Math.min(top4.length, 4); i += 2) {
    if (i + 1 >= top4.length) break;
    matches.push({
      id: `seed-${i}`,
      a: cap(top4[i].modelName, NAME_MAX),
      b: cap(top4[i + 1].modelName, NAME_MAX),
      winner: null,
    });
  }
  if (matches.length === 0) return [];
  return [
    {
      id: "seed-round",
      name: "Seeded round (top 4 leaderboard)",
      matches,
    },
  ];
}

// Mode selector cards (design wave-b Arena v2 `.modes`): title, sub-label,
// and a per-mode count line. Filters the leaderboard / bracket / feed below.
const MODE_CARDS: readonly {
  readonly id: ArenaMode;
  readonly title: string;
  readonly sub: string;
}[] = [
  { id: "all", title: "All modes", sub: "Every match type" },
  { id: "ctf", title: "Capture the flag", sub: "Extract the secret" },
  { id: "koth", title: "King of the hill", sub: "Hold the position" },
  { id: "rvb", title: "Red vs blue", sub: "Attack vs defend" },
];

export interface ArenaClientProps {
  readonly initialTab?: ArenaOuterTab;
}

export function ArenaClient({ initialTab = "leaderboard" }: ArenaClientProps) {
  const [outerTab, setOuterTab] = useState<ArenaOuterTab>(initialTab);
  const visitedTabs = useArenaVisitedTabs(outerTab);

  useEffect(() => {
    setOuterTab(initialTab);
  }, [initialTab]);
  const [arenaMode, setArenaMode] = useState<ArenaMode>("all");
  const [entries, setEntries] = useState<readonly LeaderEntry[]>([]);
  const [stats, setStats] = useState<GlobalStats>({
    totalMatches: 0,
    completedMatches: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumped after a stand-off is submitted so the leaderboard/KPIs refetch
  // without a full page reload. (A fast CTF early-victory completes seconds
  // after submit; the mount-only fetch otherwise left a stale "0 matches"
  // until the operator manually reloaded.)
  const [reloadKey, setReloadKey] = useState(0);

  // W18-ARENA-WIRING fold: reset arenaMode to 'all' when the user
  // navigates away from the Leaderboard tab. Only the Leaderboard
  // consumes the strip's filter — keeping a stale ctf/koth/rvb
  // selection while the strip is still globally visible would surprise
  // operators when they re-enter Leaderboard. The strip itself remains
  // mounted on every outer tab per the V1 spec.
  useEffect(() => {
    if (outerTab !== "leaderboard") setArenaMode("all");
  }, [outerTab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/arena/leaderboard?limit=20", {
          cache: "no-store",
        });
        const body = (await res
          .json()
          .catch(() => ({}))) as LeaderboardResponse;
        if (cancelled) return;
        if (!res.ok) {
          setError("Arena unavailable");
          setEntries([]);
        } else {
          const safe: LeaderEntry[] = [];
          for (const raw of body.leaderboard ?? []) {
            const entry = sanitizeEntry(raw);
            if (entry) safe.push(entry);
          }
          setEntries(safe);
          setStats(sanitizeStats(body.globalStats));
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Network error");
          setEntries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filteredEntries = useMemo(
    () => filterEntriesByMode(entries, arenaMode),
    [arenaMode, entries],
  );

  const cappedRanked = useMemo(
    () => filteredEntries.slice(0, MAX_RANK_DISPLAYED),
    [filteredEntries],
  );
  const cappedFeed = useMemo(
    () => filteredEntries.slice(0, MAX_FEED_DISPLAYED),
    [filteredEntries],
  );
  const totalFighters = filteredEntries.length;

  const bracketRounds = useMemo(
    () => buildBracketRounds(filteredEntries.slice(0, 4)),
    [filteredEntries],
  );

  // Mode-card counts derive from the unfiltered entries so each card shows
  // its full population independent of the active filter. Adapter extracted
  // to arena-w18-adapters.ts.
  const modeCounts = useMemo(() => buildModeCounts(entries), [entries]);

  // KPI tile values for the leaderboard
  // tab — used by the AL-002 KPI tiles assertion. Derived from
  // `filteredEntries` so all four tiles (Fighters / Matches / Top
  // fighter / Avg battle score) reflect the active arenaMode filter
  // consistently. Top fighter falls back to "—" when the filtered
  // leaderboard is empty so the tile never renders an empty string.
  const topFighterName =
    filteredEntries.length > 0
      ? cap(filteredEntries[0].modelName, NAME_MAX)
      : "—";
  const avgBattleScore = useMemo(() => {
    if (filteredEntries.length === 0) return 0;
    let sum = 0;
    for (const e of filteredEntries) sum += e.avgScore;
    return Math.round((sum / filteredEntries.length) * 10) / 10;
  }, [filteredEntries]);

  const arenaPanelSub = loading
    ? "Loading leaderboard…"
    : error
      ? cap(error, 80)
      : `${cappedRanked.length} of ${totalFighters} fighters`;

  // Design mode-helper line — honest about data-state: the "no matches yet"
  // clause only holds when nothing has run.
  const modeHelper =
    stats.totalMatches === 0
      ? "Filters the leaderboard, bracket, and feed below. No matches have run in any mode yet."
      : "Filters the leaderboard, bracket, and feed below.";

  return (
    <>
      <PageHead
        namingId="arena"
        title="Arena"
        jp="組手"
        actions={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            data-testid="arena-new-standoff"
            onClick={() => setOuterTab("wizard")}
          >
            + New stand-off
          </button>
        }
        chips={
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 12 }}
            data-testid="arena-page-head-actions"
          >
            {/* §1.4 / motion law: live-status runs jade (scan-ring), never
                the torii ramp — red is reserved for the one chrome moment. */}
            <span
              className="chip jade yr4-live-ring"
              aria-label="Arena live indicator"
            >
              <span className="dot live" aria-hidden="true" />
              LIVE
            </span>
          </span>
        }
      />

      {/*
        Mode selector cards (design wave-b Arena v2 `.modes`) — game-mode
        filter above the outer tab nav. State owned here; the active mode
        flows into `filteredEntries` which drives the leaderboard, bracket,
        and feed below.
      */}
      <div
        className="arena-modes"
        role="tablist"
        aria-label="Match mode"
        data-testid="arena-mode-strip"
      >
        {MODE_CARDS.map((m) => {
          const on = arenaMode === m.id;
          const count = modeCounts[m.id] ?? 0;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={`${m.title} — ${count} matches`}
              className={`arena-mode${on ? " on" : ""}`}
              data-testid={`arena-mode-strip-${m.id}`}
              onClick={() => setArenaMode(m.id)}
            >
              <span className="t">{m.title}</span>
              <span className="s">{m.sub}</span>
              <span className="cnt" data-testid={`arena-mode-strip-${m.id}-count`}>
                {count} matches
              </span>
            </button>
          );
        })}
      </div>
      <div className="arena-mode-helper" data-testid="arena-mode-helper">
        {modeHelper}
      </div>

      <div style={{ marginTop: 18, marginBottom: 12 }}>
        <SegmentedSubTabs
          items={
            ARENA_OUTER_TAB_ORDER.map((id) => ({
              id,
              label: ARENA_OUTER_TAB_LABEL[id],
              testId: `arena-tab-${id}`,
              ...(id === "matches"
                ? { badge: { count: stats.totalMatches } }
                : {}),
            })) satisfies SegmentedSubTabItem[]
          }
          active={outerTab}
          onChange={(id) => {
            if (isArenaOuterTab(id)) setOuterTab(id);
          }}
          ariaLabel="Arena outer tabs"
          mode="underline"
          testId="arena-outer-tabs"
        >
          <Tabs.Content
            value="matches"
            forceMount
            hidden={outerTab !== "matches"}
            aria-hidden={outerTab !== "matches"}
            data-testid="arena-tab-body-matches"
          >
            {visitedTabs.has("matches") ? <MatchesTab /> : null}
          </Tabs.Content>

          <Tabs.Content
            value="wizard"
            forceMount
            hidden={outerTab !== "wizard"}
            aria-hidden={outerTab !== "wizard"}
            data-testid="arena-tab-body-wizard"
          >
            {visitedTabs.has("wizard") ? (
              <Panel
                title="Create stand-off"
                headingLevel={2}
                sub="Four reviewed steps · mode, fighters, rules, review"
              >
                <p className="wb-hint" style={{ margin: "0 0 12px" }}>
                  Configure the match through the canonical four-step flow. The
                  legacy single-form creator has been retired.
                </p>
                <MatchCreationWizardLive
                  onSubmitted={() => setReloadKey((k) => k + 1)}
                />
              </Panel>
            ) : null}
          </Tabs.Content>

          <Tabs.Content
            value="roster"
            forceMount
            hidden={outerTab !== "roster"}
            aria-hidden={outerTab !== "roster"}
            data-testid="arena-tab-body-roster"
          >
            {visitedTabs.has("roster") ? <RosterTab /> : null}
          </Tabs.Content>

          <Tabs.Content
            value="live"
            forceMount
            hidden={outerTab !== "live"}
            aria-hidden={outerTab !== "live"}
            data-testid="arena-tab-body-live"
          >
            {visitedTabs.has("live") ? <MatchLiveTab /> : null}
          </Tabs.Content>

          <Tabs.Content
            value="leaderboard"
            forceMount
            hidden={outerTab !== "leaderboard"}
            aria-hidden={outerTab !== "leaderboard"}
            data-testid="arena-tab-body-leaderboard"
          >
            <div
              data-testid="arena-leaderboard-grid"
              className="arena-leaderboard-grid"
            >
              <div data-testid="arena-leaderboard-main" style={{ minWidth: 0 }}>
                {/*
        KPI strip (design .kpis) — mono-caps labels + dim sub-captions.
        Values are ink; a KPI numeric never carries a tone color. The
        legacy KV aggregate table was retired by spec C-04 in favour of
        the Match-aggregates ref-block below.
      */}
                <KpiStrip
                  module="arena"
                  testId="arena-kpi-tiles"
                  items={
                    [
                      {
                        label: "Fighters",
                        value: totalFighters,
                        sub: "on the board",
                        testId: "arena-kpi-fighters",
                      },
                      {
                        label: "Matches",
                        value: stats.totalMatches,
                        sub: "completed",
                        testId: "arena-kpi-matches",
                      },
                      {
                        label: "Avg battle score",
                        value: avgBattleScore,
                        sub: avgBattleScore > 0 ? "across fighters" : "no matches yet",
                        testId: "arena-kpi-avg-score",
                      },
                      {
                        label: "Top fighter",
                        value: topFighterName,
                        sub: totalFighters > 0 ? "by win rate" : "unseeded",
                        testId: "arena-kpi-top-fighter",
                        ariaLabel: `Top fighter: ${topFighterName}`,
                      },
                    ] satisfies KpiStripItem[]
                  }
                />

                <Panel
                  title="Leaderboard"
                  headingLevel={2}
                  sub={arenaPanelSub}
                  style={{ marginTop: 16 }}
                >
                    {error !== null && (
                      <div
                        role="alert"
                        data-testid="arena-error"
                        className="yr4-banner tone-red"
                      >
                        {cap(error, 200)}
                      </div>
                    )}
                    {!loading && cappedRanked.length === 0 && !error && (
                      <EmptyState
                        module="arena"
                        state="empty"
                        title="No fighters yet"
                        sub="Schedule a head-to-head match to seed the leaderboard."
                        cta={{
                          label: "Plan a match",
                          href: "/admin/arena?tab=wizard",
                        }}
                        testId="arena-empty"
                        compact
                      />
                    )}
                    {cappedRanked.length > 0 && (
                      <div
                        className="yr4-data-list"
                        role="list"
                        data-testid="arena-leaderboard-list"
                        aria-label="Arena leaderboard ranked fighters"
                      >
                        {cappedRanked.map((entry, idx) => {
                          const rankNum = idx + 1;
                          // Torii-red discipline: rank 1 keeps the sanctioned
                          // gold tint; every other row stays neutral (the
                          // design puts no red on data rows).
                          const tone = idx === 0 ? "gold" : "";
                          const summary = cap(
                            `Rank ${rankNum}: ${cap(entry.modelName, NAME_MAX)} · ${entry.totalMatches} matches · ${Math.round(entry.winRate)}% win rate · ${STREAK_LABEL[entry.streakType]} ${entry.currentStreak}`,
                            ARIA_LABEL_MAX,
                          );
                          return (
                            <div
                              key={entry.modelId}
                              role="listitem"
                              className={`yr4-rank-tile${tone ? ` tone-${tone}` : ""}`}
                              aria-label={summary}
                            >
                              <span className="rank-num" aria-hidden="true">
                                {rankNum}
                              </span>
                              <span className="rank-name">
                                {cap(entry.modelName, NAME_MAX)}
                              </span>
                              <span className="rank-score">
                                {Math.round(entry.winRate)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                </Panel>

                {/* Design g2 row: Bracket + Recent fighters side by side
                    (collapses to one column below 860px). */}
                <div className="arena-g2" style={{ marginTop: 12 }}>
                  <Panel
                    title="Bracket"
                    headingLevel={2}
                    sub="Seeded from top-4 · live"
                  >
                    <div className="yr4-bracket-frame">
                      {bracketRounds.length === 0 ? (
                        <ArenaQuietEmpty
                          title="Add at least 4 fighters"
                          sub="The bracket seeds from the top-4 leaderboard slots — schedule more matches to qualify enough fighters."
                          testId="arena-bracket-empty"
                        />
                      ) : (
                        <Bracket
                          rounds={bracketRounds}
                          testId="arena-bracket"
                        />
                      )}
                    </div>
                  </Panel>

                  <Panel
                    title="Recent fighters"
                    headingLevel={2}
                    sub="Latest activity"
                  >
                    {cappedFeed.length === 0 ? (
                      <ArenaQuietEmpty
                        title="No recent matches"
                        sub="Schedule a head-to-head to populate the activity feed."
                        testId="arena-feed-empty"
                      />
                    ) : (
                      <div
                        className="yr4-data-list"
                        role="list"
                        data-testid="arena-feed-list"
                        aria-label="Arena recent fighters feed"
                      >
                        {cappedFeed.map((entry) => {
                          const ts = entry.lastMatchAt
                            ? formatFeedTs(entry.lastMatchAt)
                            : "—";
                          const msg = `${cap(entry.modelName, NAME_MAX)} · ${entry.totalMatches} matches`;
                          const path = `${cap(entry.provider, PROVIDER_MAX)} · ${STREAK_LABEL[entry.streakType]} ${entry.currentStreak}`;
                          const sev: FeedSeverity =
                            STREAK_TO_FEED_SEV[entry.streakType];
                          const kind: FeedTagKind =
                            STREAK_TO_FEED_KIND[entry.streakType];
                          const tone = STREAK_TO_TONE[entry.streakType];
                          return (
                            <div
                              key={entry.modelId}
                              role="listitem"
                              data-tone={tone}
                            >
                              <FeedRow
                                ts={ts}
                                sev={sev}
                                msg={msg}
                                path={path}
                                tag={{
                                  kind,
                                  label: `${Math.round(entry.winRate)}%`,
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>
                </div>

                {/* Achievement medals (design wave-b): gold / steel / bronze
                    seats — positive metals, no red. */}
                <div style={{ marginTop: 12 }}>
                  <AchievementLegend />
                </div>

                {/* Spec C-04 / audit D1: the legacy "Arena KPIs" mono table
                    is retired; the design closes the tab with the
                    Match-aggregates ref-block (計) pointing at Evaluations.
                    Completed count stays live. */}
                <div style={{ marginTop: 12 }}>
                  <RefBlock
                    kj="計"
                    title="Match aggregates"
                    sub={`· ${stats.completedMatches} completed · rounds, durations, and injection rate roll up as matches finish`}
                    href="/admin/eval"
                    linkLabel="Full breakdown in Evaluations →"
                  />
                </div>
              </div>
            </div>
          </Tabs.Content>
        </SegmentedSubTabs>
      </div>
    </>
  );
}
