// SPDX-License-Identifier: Apache-2.0
"use client";

/**
 * LeaderboardClient — v2 reskin P2b rebuild (design wave-e
 * "Leaderboard v2.html").
 *
 * Renders the designed content model: kicker/H1/gloss header, the
 * pre-launch home-note, a real 5-column standings table (Rank | Member
 * | Verified bypasses | Highest severity | Points) with the §4.1 empty
 * state hosted INSIDE the table body (空), and the "How standings work"
 * medals panel. Copy is verbatim from the signed design render; the
 * pre-launch numbers source from `MEMBER_PRELAUNCH_FACTS` (D-07).
 *
 * Network layer unchanged from Epic 4B.2: fetch `/api/members/
 * leaderboard` with `?page=&limit=`, 60s poll (matches the server
 * cache TTL), pagination footer. The manual Refresh button is retired
 * (D10) — the reference header is kicker/H1/gloss only.
 *
 * DTO gap (nr-leaderboard.md §4): entries carry no `verifiedBypasses`
 * / `highestSeverity` yet, so populated rows render an honest "—" in
 * those columns until the API grows the fields.
 *
 * Error states (rule §7 — fixed operator-facing strings):
 *   - 503 (MEMBERS_UI_DISABLED)  → warn banner
 *   - 4xx / 5xx (anything else)  → danger banner
 */

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import { Panel } from "@/design/shell";
import { BrandFooterChip } from "@/design/shell/BrandFooterChip";
import { EmptyState, SystemBanner } from "@/design/system";
import type { Belt } from "@/design/arena/BeltDisc";
import { MEMBER_PRELAUNCH_FACTS } from "@/lib/demo/demo-facts";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface LeaderboardEntryDTO {
  readonly rank: number;
  readonly handle: string;
  readonly score: number;
  readonly belt: Belt;
  readonly displayAs: "handle" | "hash";
}

interface LeaderboardResponse {
  readonly season: string;
  readonly entries: readonly LeaderboardEntryDTO[];
  readonly totalEntries: number;
  readonly viewerEntry: LeaderboardEntryDTO | null;
  readonly generatedAt: string;
}

type LoadState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "ok"; readonly data: LeaderboardResponse }
  | { readonly kind: "flag-off" }
  | { readonly kind: "error" };

const POLL_INTERVAL_MS = 60_000;
// E3.S5 (F-7-007 P0) — leaderboard default page size. The members API
// caps `limit` at 200 server-side.
const DEFAULT_LEADERBOARD_PAGE_LIMIT = 50;

export function LeaderboardClient(): ReactElement {
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(DEFAULT_LEADERBOARD_PAGE_LIMIT);

  const load = useCallback(async (): Promise<void> => {
    setState((prev) => (prev.kind === "ok" ? prev : { kind: "loading" }));
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const res = await fetchWithAuth(
        `/api/members/leaderboard?${qs.toString()}`,
      );
      if (res.status === 503) {
        setState({ kind: "flag-off" });
        return;
      }
      if (!res.ok) {
        setState({ kind: "error" });
        return;
      }
      const data = (await res.json()) as LeaderboardResponse;
      setState({ kind: "ok", data });
    } catch {
      setState({ kind: "error" });
    }
  }, [page, limit]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const entries = state.kind === "ok" ? state.data.entries : [];
  const isEmptyBoard = state.kind === "ok" && entries.length === 0;

  return (
    <div>
      {/* Kicker-above header (design page-kick). The route-naming entry
          carries no kanji for this route, so PageHead cannot render the
          Kokugikan kicker — markup rendered directly per nr-leaderboard D4. */}
      <div className="page-head">
        <div className="col" style={{ minWidth: 0 }}>
          <div className="page-kick">
            <span className="kj" lang="ja" aria-hidden="true">
              国技館
            </span>
            <span>Stadium · Kokugikan</span>
          </div>
          <h1>Leaderboard</h1>
          <p className="lede">
            Season standings for verified bypasses — who found what, ranked.
          </p>
        </div>
      </div>

      <SystemBanner
        active={state.kind === "flag-off"}
        tone="warn"
        testId="members-leaderboard-flag-off-banner"
      >
        The leaderboard is currently disabled. Ask your operator to enable it.
      </SystemBanner>

      <SystemBanner
        active={state.kind === "error"}
        tone="danger"
        testId="members-leaderboard-error-banner"
      >
        Leaderboard temporarily unavailable. Try again in a moment.
      </SystemBanner>

      <div className="home-note" data-testid="members-leaderboard-note">
        <span className="dot" aria-hidden="true" />
        <span>
          <b>{MEMBER_PRELAUNCH_FACTS.seasonName} hasn&apos;t opened yet.</b>{" "}
          Standings appear as verified bypasses land — the first verified
          bypass starts the board.
        </span>
      </div>

      {(state.kind === "idle" || state.kind === "loading") && (
        <EmptyState
          module="arena"
          state="loading"
          testId="members-leaderboard-loading"
        />
      )}

      {state.kind === "ok" && (
        <div className="g-main" style={{ marginTop: 16 }}>
          <Panel
            title={`${MEMBER_PRELAUNCH_FACTS.seasonName} standings`}
            headingLevel={2}
            sub={
              isEmptyBoard
                ? `${MEMBER_PRELAUNCH_FACTS.rankedHunters} ranked · ${MEMBER_PRELAUNCH_FACTS.verifiedBypasses} verified bypasses`
                : `${state.data.totalEntries} ranked`
            }
            meta={
              // The opens-at-launch chip is only honest while the board
              // is empty — the first verified bypass retires it.
              isEmptyBoard ? (
                <span className="chip">
                  <span className="dot quiet" aria-hidden="true" />
                  {MEMBER_PRELAUNCH_FACTS.seasonChip}
                </span>
              ) : undefined
            }
            noPad
          >
            <div className="tbl-scroll">
              <table
                // ctable--empty lifts the 640px min-width so the in-table
                // empty state stays fully visible at 390 (P3 finding).
                className={
                  entries.length === 0 ? "ctable ctable--empty" : "ctable"
                }
                data-testid="members-leaderboard-table"
              >
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>Rank</th>
                    <th>Member</th>
                    <th className="num">Verified bypasses</th>
                    <th className="num">Highest severity</th>
                    <th className="num">Points</th>
                  </tr>
                </thead>
                <tbody data-testid="members-leaderboard-entries">
                  {entries.length === 0 ? (
                    <tr>
                      <td className="emptycell" colSpan={5}>
                        <div
                          className="empty"
                          data-testid="members-leaderboard-empty"
                        >
                          <div className="kj" lang="ja" aria-hidden="true">
                            空
                          </div>
                          <h4>No standings yet</h4>
                          <p>
                            {MEMBER_PRELAUNCH_FACTS.seasonName} opens at
                            private-beta launch — the first verified bypass
                            starts the board.
                          </p>
                          <div className="links">
                            <a className="btn btn-ghost" href="#scoring">
                              How standings work
                            </a>
                            <Link className="link-mono" href="/members/bounty">
                              Bounty rules →
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr
                        key={`${entry.rank}:${entry.handle}`}
                        data-testid={`members-leaderboard-entry-${entry.rank}`}
                      >
                        <td className="num" style={{ textAlign: "left" }}>
                          {entry.rank}
                        </td>
                        <td className="nm">{entry.handle}</td>
                        {/* DTO gap — honest "—" until the API carries the
                            per-entry fields (nr-leaderboard.md §4). */}
                        <td className="num">—</td>
                        <td className="num">—</td>
                        <td className="num">{entry.score}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {state.data.totalEntries > limit && (
              <div
                data-testid="members-leaderboard-pagination-footer"
                role="navigation"
                aria-label="Leaderboard pagination"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "var(--fg-dim)",
                  borderTop: "1px solid var(--b-1)",
                }}
              >
                <span data-testid="members-leaderboard-pagination-summary">
                  {(() => {
                    const start = (page - 1) * limit + 1;
                    const end = Math.min(
                      state.data.totalEntries,
                      (page - 1) * limit + entries.length,
                    );
                    return `${start}-${end} of ${state.data.totalEntries}`;
                  })()}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span className="sr-only">Rows per page</span>
                    <select
                      aria-label="Rows per page"
                      data-testid="members-leaderboard-pagination-limit"
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      style={{ minHeight: 32, padding: "4px 6px" }}
                    >
                      {[25, 50, 100, 200].map((n) => (
                        <option key={n} value={n}>
                          {n} / page
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn"
                    disabled={page <= 1}
                    data-testid="members-leaderboard-pagination-prev"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    style={{ minHeight: 32, minWidth: 60 }}
                  >
                    Prev
                  </button>
                  <span
                    data-testid="members-leaderboard-pagination-page"
                    aria-current="page"
                    style={{ minWidth: 80, textAlign: "center" }}
                  >
                    Page {page} /{" "}
                    {Math.max(
                      1,
                      Math.ceil(state.data.totalEntries / Math.max(1, limit)),
                    )}
                  </span>
                  <button
                    type="button"
                    className="btn"
                    disabled={
                      page >=
                      Math.ceil(state.data.totalEntries / Math.max(1, limit))
                    }
                    data-testid="members-leaderboard-pagination-next"
                    onClick={() => setPage((p) => p + 1)}
                    style={{ minHeight: 32, minWidth: 60 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </Panel>

          <div id="scoring">
            {/* headingLevel 2 — the v2 route heading contract promotes every
                route-level Panel in this file to h2 under the page h1. */}
            <Panel title="How standings work" headingLevel={2}>
              <div className="drows" data-testid="members-leaderboard-medals">
                <div
                  className="drow"
                  style={{ gap: 14, alignItems: "center" }}
                >
                  <span className="medal gold">1</span>
                  <span>
                    <span className="mt">First place</span>
                    <span className="ms">
                      Gold finish — the season&apos;s top verified score.
                    </span>
                  </span>
                </div>
                <div
                  className="drow"
                  style={{ gap: 14, alignItems: "center" }}
                >
                  <span className="medal steel">2</span>
                  <span>
                    <span className="mt">Second place</span>
                    <span className="ms">Steel finish.</span>
                  </span>
                </div>
                <div
                  className="drow"
                  style={{ gap: 14, alignItems: "center" }}
                >
                  <span className="medal bronze">3</span>
                  <span>
                    <span className="mt">Third place</span>
                    <span className="ms">
                      Bronze finish — everyone else ranks by points.
                    </span>
                  </span>
                </div>
              </div>
              <div className="sev-note" style={{ marginTop: 12 }}>
                Each verified bypass scores by severity — a critical bypass
                earns the most points. Submissions count only after the dojo
                verifies them; nothing on this board is self-reported. Rewards
                attach on the <Link href="/members/bounty">Bounty</Link> page.
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* Design wave-e "Leaderboard v2.html":122 — the `.app-foot` brand line
          closes the member content. */}
      <BrandFooterChip />
    </div>
  );
}
