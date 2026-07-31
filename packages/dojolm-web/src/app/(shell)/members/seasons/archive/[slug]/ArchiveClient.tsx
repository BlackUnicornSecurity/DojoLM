// SPDX-License-Identifier: Apache-2.0
"use client";

/**
 * ArchiveClient — Epic 4B.4 S4B.4.5.
 *
 * Client-side renderer for the `/members/seasons/archive/:slug`
 * snapshot viewer. Fetches `/api/members/seasons/archive/:slug` ONCE
 * on mount (archived snapshots are immutable — decision #3 — so no
 * polling, no throttled refresh, no refresh button). Renders a
 * read-only mini-leaderboard using the shipped `Leaderboard`
 * primitive, and a read-only bypass-matrix mini-grid using the
 * shipped `BypassCell` grid WITHOUT the drill-down drawer (archives
 * are snapshots, not interactive).
 *
 * Error states:
 *   - 503 (MEMBERS_UI_DISABLED)  -> warn banner, no retry
 *   - 404                        -> not-found testid (slug passed
 *                                    the page prelude regex but the
 *                                    server registry does not know
 *                                    it, or the season was deleted
 *                                    between RSC render and API
 *                                    call).
 *   - 4xx / 5xx (anything else)  -> danger banner
 *
 * Shape validation: reuses `validateMatrix` from the E4B.3
 * validator at `../leaderboard/bypass-matrix/validate.ts`. The
 * leaderboard entries ship a narrower validator colocated here — only
 * the fields the `Leaderboard` primitive consumes reach the DOM.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import {
  BypassCell,
  EmptyState,
  Leaderboard,
  Panel,
  SystemBanner,
  type Belt,
} from "@/design";
import { BrandFooterChip } from "@/design/shell/BrandFooterChip";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  validateMatrix,
  type BypassMatrixDTO,
} from "../../../leaderboard/bypass-matrix/validate";

interface ArchiveLeaderboardEntryDTO {
  readonly rank: number;
  readonly handle: string;
  readonly score: number;
  readonly belt: Belt;
  readonly displayAs: "handle" | "hash";
}

interface ArchiveSeasonDTO {
  readonly slug: string;
  readonly label: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly status: "active" | "archived";
}

interface ArchiveResponse {
  readonly season: ArchiveSeasonDTO;
  readonly leaderboard: {
    readonly entries: readonly ArchiveLeaderboardEntryDTO[];
    readonly totalEntries: number;
  };
  readonly bypassMatrix: BypassMatrixDTO;
  readonly generatedAt: string;
}

type LoadState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "ok"; readonly data: ArchiveResponse }
  | { readonly kind: "not-found" }
  | { readonly kind: "flag-off" }
  | { readonly kind: "error" };

const SLUG_RE = /^[A-Za-z0-9-]{1,32}$/;
const HANDLE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const VALID_BELTS: readonly Belt[] = [
  "white",
  "blue",
  "purple",
  "brown",
  "black",
  "unranked",
];

function isValidBelt(v: unknown): v is Belt {
  return (
    typeof v === "string" && (VALID_BELTS as readonly string[]).includes(v)
  );
}

function validateLeaderboardEntry(
  raw: unknown,
): ArchiveLeaderboardEntryDTO | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.rank !== "number" || !Number.isFinite(e.rank) || e.rank < 1)
    return null;
  if (typeof e.handle !== "string" || !HANDLE_RE.test(e.handle)) return null;
  if (typeof e.score !== "number" || !Number.isFinite(e.score)) return null;
  if (!isValidBelt(e.belt)) return null;
  if (e.displayAs !== "handle" && e.displayAs !== "hash") return null;
  return {
    rank: e.rank,
    handle: e.handle,
    score: e.score,
    belt: e.belt,
    displayAs: e.displayAs,
  };
}

function validateSeason(raw: unknown): ArchiveSeasonDTO | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.slug !== "string" || !SLUG_RE.test(s.slug)) return null;
  if (
    typeof s.label !== "string" ||
    s.label.length === 0 ||
    s.label.length > 64
  )
    return null;
  if (typeof s.startedAt !== "string" || s.startedAt.length === 0) return null;
  if (
    s.endedAt !== null &&
    (typeof s.endedAt !== "string" || s.endedAt.length === 0)
  )
    return null;
  if (s.status !== "active" && s.status !== "archived") return null;
  return {
    slug: s.slug,
    label: s.label,
    startedAt: s.startedAt,
    endedAt: s.endedAt as string | null,
    status: s.status,
  };
}

function validateResponse(raw: unknown): ArchiveResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const season = validateSeason(r.season);
  if (!season) return null;
  const lbRaw = r.leaderboard;
  if (!lbRaw || typeof lbRaw !== "object") return null;
  const lb = lbRaw as Record<string, unknown>;
  const rawEntries = Array.isArray(lb.entries) ? lb.entries : [];
  const entries: ArchiveLeaderboardEntryDTO[] = [];
  for (const e of rawEntries) {
    const v = validateLeaderboardEntry(e);
    if (v) entries.push(v);
  }
  const totalEntries =
    typeof lb.totalEntries === "number" &&
    Number.isFinite(lb.totalEntries) &&
    lb.totalEntries >= 0
      ? lb.totalEntries
      : 0;
  const bypassMatrix = validateMatrix(r.bypassMatrix);
  if (!bypassMatrix) return null;
  const generatedAt = typeof r.generatedAt === "string" ? r.generatedAt : "";
  return {
    season,
    leaderboard: { entries, totalEntries },
    bypassMatrix,
    generatedAt,
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

function formatPct(rate: number, decimals: number): string {
  return Math.min(rate * 100, 100).toFixed(decimals);
}

interface Props {
  readonly slug: string;
}

export function ArchiveClient({ slug }: Props): ReactElement {
  const [state, setState] = useState<LoadState>({ kind: "idle" });

  const load = useCallback(async (): Promise<void> => {
    setState({ kind: "loading" });
    try {
      const res = await fetchWithAuth(`/api/members/seasons/archive/${slug}`);
      if (res.status === 503) {
        setState({ kind: "flag-off" });
        return;
      }
      if (res.status === 404) {
        setState({ kind: "not-found" });
        return;
      }
      if (!res.ok) {
        setState({ kind: "error" });
        return;
      }
      const raw = (await res.json()) as unknown;
      const data = validateResponse(raw);
      if (data === null) {
        setState({ kind: "error" });
        return;
      }
      setState({ kind: "ok", data });
    } catch {
      setState({ kind: "error" });
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const leaderboardRows = useMemo(
    () =>
      state.kind === "ok"
        ? state.data.leaderboard.entries.map((e) => ({
            name: e.handle,
            modelId: "",
            belt: e.belt,
            score: e.score,
          }))
        : [],
    [state],
  );

  const matrix = state.kind === "ok" ? state.data.bypassMatrix : null;
  const hasMatrix =
    matrix != null &&
    matrix.techniques.length > 0 &&
    matrix.models.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <SystemBanner
        active={state.kind === "flag-off"}
        tone="warn"
        testId="members-archive-flag-off-banner"
      >
        Season archives are currently disabled. Ask your operator to enable
        them.
      </SystemBanner>

      <SystemBanner
        active={state.kind === "error"}
        tone="danger"
        testId="members-archive-error-banner"
      >
        Archive temporarily unavailable.
      </SystemBanner>

      {(state.kind === "idle" || state.kind === "loading") && (
        <EmptyState
          module="arena"
          state="loading"
          testId="members-archive-loading"
        />
      )}

      {/* D1 — the season-not-found state carries the same tier-2 header
          anatomy (back-link + kisetsu kicker + H1 + gloss) as the archived
          state, per the wave-h reference (hst-not-found). */}
      {state.kind === "not-found" && (
        <div>
          <a className="back-link" href="/members/seasons">
            ← All seasons
          </a>
          <div className="page-head">
            <div className="col">
              <div className="page-kick">
                <span className="kj" lang="ja">
                  季節
                </span>{" "}
                Kisetsu · season archive
              </div>
              <h1>Season not found</h1>
              <p className="lede">This slug is not in the archive.</p>
            </div>
          </div>
          <Panel>
            <div className="empty" data-testid="members-archive-not-found">
              <div className="kj" lang="ja" aria-hidden="true">
                季
              </div>
              <h4>Season not found</h4>
              <p>
                This season is not in the archive. It may have been removed, or
                the link is stale.
              </p>
              <div className="links">
                <a className="link-steel" href="/members/seasons">
                  Browse archived seasons →
                </a>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {state.kind === "ok" && (
        <div>
          {/* D1 — restored tier-2 header: back-link + kisetsu kicker + 26px
              season H1 + gloss line. */}
          <a className="back-link" href="/members/seasons">
            ← All seasons
          </a>
          <div className="page-head">
            <div className="col">
              <div className="page-kick">
                <span className="kj" lang="ja">
                  季節
                </span>{" "}
                Kisetsu · season archive
              </div>
              <h1>{state.data.season.label}</h1>
              <p className="lede">
                Archived season — final boards frozen as they stood.
              </p>
            </div>
          </div>

          {/* D2 — season-record data table (+ Archived chip) beside the
              D3 "What an archive holds" description panel. */}
          <div className="g-main" style={{ marginTop: 16 }}>
            <Panel
              title="Season record"
              meta={
                <span className="chip">
                  <span className="dot quiet" />
                  Archived
                </span>
              }
            >
              <div className="panel-body">
                <div className="drows">
                  <div className="drow">
                    <span className="l">Season</span>
                    <span className="v">{state.data.season.label}</span>
                  </div>
                  <div className="drow">
                    <span className="l">Opened</span>
                    <span className="v">
                      {formatDate(state.data.season.startedAt)}
                    </span>
                  </div>
                  <div className="drow">
                    <span className="l">Entries archived</span>
                    <span className="v dim">
                      {state.data.leaderboard.totalEntries}
                    </span>
                  </div>
                  <div className="drow">
                    <span className="l">Matrix data</span>
                    <span className="v dim">
                      {hasMatrix ? "archived" : "none archived"}
                    </span>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="What an archive holds">
              <div className="panel-body">
                <p className="sev-note" style={{ marginTop: 0 }}>
                  When a season ends, its final leaderboard and bypass matrix
                  freeze here exactly as they stood — nothing is recomputed
                  later. This season closed with no verified entries, so its
                  boards are honestly empty.
                </p>
              </div>
            </Panel>
          </div>

          {/* D7 — above-panel zone title (not an in-card "Leaderboard/0 total"
              header). */}
          <div className="zone-title">
            <h2>Final leaderboard</h2>
            <span className="sub">
              {state.data.leaderboard.totalEntries} entries archived
            </span>
          </div>
          <Panel noPad>
            <div data-testid="members-archive-leaderboard">
              {state.data.leaderboard.entries.length === 0 ? (
                <div
                  className="empty"
                  style={{ padding: "28px 20px 24px" }}
                  data-testid="members-archive-leaderboard-empty"
                >
                  {/* D4 — 蔵 storehouse watermark + steel text link. */}
                  <div className="kj" lang="ja" aria-hidden="true">
                    蔵
                  </div>
                  <h4>No entries archived</h4>
                  <p>
                    No verified bypasses scored in this season, so no standings
                    were frozen.
                  </p>
                  <div className="links">
                    <a className="link-mono" href="/members/leaderboard">
                      See the live board →
                    </a>
                  </div>
                </div>
              ) : (
                <Leaderboard
                  rows={leaderboardRows}
                  ariaLabel={`Archived leaderboard for ${state.data.season.label}`}
                />
              )}
            </div>
          </Panel>

          <div className="zone-title">
            <h2>Final bypass matrix</h2>
            <span className="sub">
              {matrix
                ? `${matrix.techniques.length} techniques · ${matrix.models.length} models`
                : "0 techniques · 0 models"}
            </span>
          </div>
          <Panel noPad>
            <section
              aria-labelledby="members-archive-matrix-heading"
              data-testid="members-archive-matrix"
            >
              <h2 id="members-archive-matrix-heading" className="sr-only">
                Archived bypass-rate heatmap
              </h2>
              {matrix &&
              matrix.techniques.length > 0 &&
              matrix.models.length > 0 ? (
                <div className="arena-heat-scroll">
                  <table className="arena-heat-table">
                    <thead>
                      <tr>
                        <th scope="col">technique \ model</th>
                        {matrix.models.map((m) => (
                          <th key={m} scope="col">
                            {m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.techniques.map((t) => (
                        <tr key={t}>
                          <th scope="row">{t}</th>
                          {matrix.models.map((m) => {
                            const cell = matrix.cells.find(
                              (c) => c.techniqueId === t && c.modelId === m,
                            );
                            if (!cell) {
                              return (
                                <td key={m}>
                                  <span className="arena-heat-empty">—</span>
                                </td>
                              );
                            }
                            return (
                              <td key={m}>
                                <BypassCell
                                  rate={cell.bypassRate}
                                  ci={{
                                    low: cell.wilsonLow,
                                    high: cell.wilsonHigh,
                                  }}
                                  n={cell.n}
                                  unranked={cell.unranked}
                                  ariaLabel={`${t} vs ${m}: ${
                                    cell.unranked
                                      ? "unranked"
                                      : `bypass rate ${formatPct(cell.bypassRate, 1)}%`
                                  }, n=${cell.n}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  className="panel-body"
                  data-testid="members-archive-matrix-empty"
                >
                  {/* D5 — dashed zero severity bar + mono counts + steel
                      "The live matrix" note (distinct from the leaderboard
                      empty state). */}
                  <div
                    className="sevbar zero"
                    aria-label="No archived matrix data"
                  />
                  <div className="sev-counts zero">
                    <span className="k-none">
                      <b>0</b> techniques
                    </span>
                    <span className="k-none">
                      <b>0</b> models
                    </span>
                  </div>
                  <div className="sev-note">
                    No bypass matrix was archived for this season.{" "}
                    <a href="/members/leaderboard/bypass-matrix">
                      The live matrix
                    </a>{" "}
                    populates from verified runs, never seeded.
                  </div>
                </div>
              )}
            </section>
          </Panel>
        </div>
      )}

      {/* Design wave-h "Seasons Archive v2.html":104 — `.app-foot` closes every
          archive state's content. */}
      <BrandFooterChip />
    </div>
  );
}
