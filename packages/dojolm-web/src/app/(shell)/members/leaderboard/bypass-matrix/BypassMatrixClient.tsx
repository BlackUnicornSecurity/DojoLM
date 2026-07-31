// SPDX-License-Identifier: Apache-2.0
"use client";

/**
 * BypassMatrixClient — Epic 4B.3 S4B.3.4.
 *
 * Client-side renderer for the anonymized technique × model bypass-
 * rate heatmap. Fetches `/api/members/leaderboard/bypass-matrix`,
 * paints a `<BypassCell>` grid inside a `<Panel>`, and polls every 60
 * seconds (matches the server cache TTL so a refetch is usually a
 * cache hit). The reference header is kicker/H1/gloss only — the manual
 * Refresh button is retired (prod-parity; the design carries no such
 * control) so the 60s poll is the sole refresh path.
 *
 * Error states (rule §6 — fixed operator-facing strings, no server
 * reflection):
 *   - 503 (MEMBERS_UI_DISABLED)  → warn banner, no retry
 *   - 4xx / 5xx (anything else)  → danger banner, retry allowed
 *   - empty cells[]              → empty-state panel pointing the
 *                                   member at /members/kumite/long-match
 *
 * Shape validation (rule §12 — defense against a malformed future
 * source): every cell passes `Number.isFinite` + range checks + Wilson
 * band monotonicity before reaching the DOM. Invalid cells are dropped
 * with a dev-mode `console.warn`; the rest of the matrix still
 * renders.
 *
 * Hash routing (rule §11):
 *   #cell=<technique>|<model>   → opens the drill-down drawer
 *   #technique=<id>             → opens the Codex Technique card drawer
 *
 * Both branches pass through an alphanumeric-leading regex (mirrors
 * the server-side `ID_PATTERN` in bu-tpi/catalog) before reaching
 * setState. Shared deep-link URLs (`#cell=T001|gpt-4`) are public-safe
 * — they address aggregate cells, never per-member rows, so the hash
 * leaks no authored content beyond the cell identity the sharer
 * chose to view.
 */

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import {
  BypassCell,
  Drawer,
  EmptyState,
  Panel,
  SystemBanner,
  TechniqueCard,
} from "@/design";
import { BrandFooterChip } from "@/design/shell/BrandFooterChip";
import { MEMBER_PRELAUNCH_FACTS } from "@/lib/demo/demo-facts";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  getTechnique,
  TECHNIQUE_ID_RE,
  type Technique,
} from "@/lib/technique-catalog";
import {
  validateMatrix,
  type BypassCellData,
  type BypassMatrixDTO,
} from "./validate";

interface BypassMatrixResponse {
  readonly season: string;
  readonly matrix: BypassMatrixDTO;
}

type LoadState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "ok"; readonly data: BypassMatrixResponse }
  | { readonly kind: "flag-off" }
  | { readonly kind: "error" };

const POLL_INTERVAL_MS = 60_000;

// Strict hash regex — the drill-down state is deep-linkable via the
// URL hash. Validate before interpreting to keep an operator-
// controlled URL from reaching setState with a path-separator /
// script-like payload. The leading-alphanumeric requirement mirrors
// the server-side `ID_PATTERN` in bu-tpi/catalog (`[A-Za-z0-9][A-Za-z0-9_.-]*`)
// so any id that can round-trip through the hash is also a valid
// server-side id — closes the asymmetry where a `.leading`-dot id
// could reach the client but not the server.
const HASH_TECHNIQUE_RE = /^#technique=([A-Za-z0-9][A-Za-z0-9._-]{0,63})$/;
const HASH_CELL_RE =
  /^#cell=([A-Za-z0-9][A-Za-z0-9._-]{0,63})\|([A-Za-z0-9][A-Za-z0-9._-]{0,63})$/;

/**
 * Format a [0, 1] rate as a percentage string with the requested
 * decimal places. Caps at 100 so a rate like `0.99999999999999`
 * (which passes `isFiniteRate`) cannot render as `"100.0%"` via
 * floating-point rounding — the aria-label and the displayed cell
 * would otherwise diverge.
 */
function formatPct(rate: number, decimals: number): string {
  return Math.min(rate * 100, 100).toFixed(decimals);
}

// --- component ----------------------------------------------------------

export function BypassMatrixClient(): ReactElement {
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [selected, setSelected] = useState<BypassCellData | null>(null);
  const [technique, setTechnique] = useState<Technique | null>(null);
  const [pendingCellKey, setPendingCellKey] = useState<
    readonly [string, string] | null
  >(null);

  const load = useCallback(async (): Promise<void> => {
    setState((prev) => (prev.kind === "ok" ? prev : { kind: "loading" }));
    try {
      const res = await fetchWithAuth("/api/members/leaderboard/bypass-matrix");
      if (res.status === 503) {
        setState({ kind: "flag-off" });
        return;
      }
      if (!res.ok) {
        setState({ kind: "error" });
        return;
      }
      const raw = (await res.json()) as unknown;
      if (!raw || typeof raw !== "object") {
        setState({ kind: "error" });
        return;
      }
      const body = raw as Record<string, unknown>;
      const season = typeof body.season === "string" ? body.season : "";
      const matrix = validateMatrix(body.matrix, {
        onDroppedCell:
          process.env.NODE_ENV !== "production"
            ? (rc) => console.warn("[bypass-matrix] dropped invalid cell", rc)
            : undefined,
      });
      if (matrix === null) {
        setState({ kind: "error" });
        return;
      }
      setState({ kind: "ok", data: { season, matrix } });
    } catch {
      setState({ kind: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  // Hash-state routing — mirror the /admin/eval discipline. States are
  // mutually exclusive. Uses replaceState (not push) so the Back button
  // doesn't pile up drill-down navigations.
  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash;
      if (!hash) {
        setTechnique(null);
        return;
      }
      const tMatch = hash.match(HASH_TECHNIQUE_RE);
      if (tMatch) {
        const t = getTechnique(tMatch[1]);
        setTechnique(t);
        if (t !== null) setSelected(null);
        // Clear any in-flight cell deep-link so a stale #cell= key
        // doesn't resolve into the drawer after the matrix loads
        // and overwrite the technique-drawer state the user just
        // navigated to.
        setPendingCellKey(null);
        return;
      }
      const cMatch = hash.match(HASH_CELL_RE);
      if (cMatch) {
        setTechnique(null);
        setPendingCellKey([cMatch[1], cMatch[2]]);
        return;
      }
      // Unknown hash — clear drill-downs rather than guess.
      setTechnique(null);
      setPendingCellKey(null);
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => {
      window.removeEventListener("hashchange", applyHash);
    };
  }, []);

  // Resolve a pending #cell= hash once the matrix finishes loading.
  useEffect(() => {
    if (!pendingCellKey) return;
    if (state.kind !== "ok") return;
    const [t, m] = pendingCellKey;
    const cell = state.data.matrix.cells.find(
      (c) => c.techniqueId === t && c.modelId === m,
    );
    if (cell) {
      setSelected(cell);
      setPendingCellKey(null);
    }
  }, [state, pendingCellKey]);

  function openCell(cell: BypassCellData): void {
    setTechnique(null);
    setPendingCellKey(null);
    setSelected(cell);
    if (
      TECHNIQUE_ID_RE.test(cell.techniqueId) &&
      TECHNIQUE_ID_RE.test(cell.modelId)
    ) {
      window.history.replaceState(
        null,
        "",
        `#cell=${cell.techniqueId}|${cell.modelId}`,
      );
    }
  }

  function closeCell(): void {
    setSelected(null);
    setPendingCellKey(null);
    if (window.location.hash.startsWith("#cell=")) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }

  function openTechnique(id: string): void {
    if (!TECHNIQUE_ID_RE.test(id)) return;
    const t = getTechnique(id);
    if (!t) return;
    setSelected(null);
    setTechnique(t);
    window.history.replaceState(null, "", `#technique=${id}`);
  }

  function closeTechnique(): void {
    setTechnique(null);
    if (window.location.hash.startsWith("#technique=")) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }

  const matrix = state.kind === "ok" ? state.data.matrix : null;
  const hasMatrix =
    matrix !== null && matrix.techniques.length > 0 && matrix.models.length > 0;
  // Empty requires BOTH dimensions empty — mirrors the admin eval
  // discipline. An asymmetric state (one dimension populated, the
  // other empty, with cells present) is treated as malformed and
  // neither the empty-state nor the grid render; the error banner
  // would surface only if the response failed validation upstream,
  // which the dev-mode console.warn in `validateMatrix` flags for
  // diagnosis without crashing the surface for the member.
  const isEmpty =
    matrix !== null &&
    matrix.techniques.length === 0 &&
    matrix.models.length === 0;

  function findCell(t: string, m: string): BypassCellData | undefined {
    return matrix?.cells.find((c) => c.techniqueId === t && c.modelId === m);
  }

  // P5 prod-parity — the reference header is the 国技館 Stadium kicker + H1 +
  // gloss (design wave-e "Bypass Matrix v2.html":50-56), rendered directly like
  // the LeaderboardClient stadium header. PageHead cannot render the Kokugikan
  // kicker (this route carries no kanji in route-naming), and the design carries
  // no Refresh control, so both the boxed PageHead and the manual Refresh button
  // are dropped. The 60s poll is the sole refresh path.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="page-head">
        <div className="col" style={{ minWidth: 0 }}>
          <div className="page-kick">
            <span className="kj" lang="ja" aria-hidden="true">
              国技館
            </span>
            <span>Stadium · Kokugikan</span>
          </div>
          <h1>Bypass matrix</h1>
          <p className="lede">
            Which submitted attacks bypass which models — the public results
            grid.
          </p>
        </div>
      </div>

      <SystemBanner
        active={state.kind === "flag-off"}
        tone="warn"
        testId="members-bypass-matrix-flag-off-banner"
      >
        The bypass matrix is currently disabled. Ask your operator to enable it.
      </SystemBanner>

      <SystemBanner
        active={state.kind === "error"}
        tone="danger"
        testId="members-bypass-matrix-error-banner"
      >
        Bypass matrix temporarily unavailable. Try refresh in a moment.
      </SystemBanner>

      {(state.kind === "idle" || state.kind === "loading") && (
        <EmptyState
          module="arena"
          state="loading"
          testId="members-bypass-matrix-loading"
        />
      )}

      {isEmpty && (
        // P2c (2026-07-16) — designed zero state restored verbatim from
        // wave-e "Bypass Matrix v2.html" (audit D1/D2/D4): home-note
        // banner + two-panel g-main (results grid 網 empty + "Severity
        // of verified results" fact panel). Counts are honest zeros —
        // this branch only renders when the matrix has no results.
        <>
          <div
            className="home-note"
            data-testid="members-bypass-matrix-note"
          >
            <span className="dot" aria-hidden="true" />
            <span>
              <b>No verified results yet.</b> The grid fills as verified
              bypasses land — one cell per attack family × model.
            </span>
          </div>

          <div className="g-main">
            <Panel
              title="The results grid"
              sub={`${MEMBER_PRELAUNCH_FACTS.verifiedBypasses} verified results`}
              meta={
                <span className="chip">
                  <span className="dot quiet" aria-hidden="true" />
                  {MEMBER_PRELAUNCH_FACTS.seasonChip}
                </span>
              }
            >
              <div className="empty" data-testid="members-bypass-matrix-empty">
                <div className="kj" lang="ja" aria-hidden="true">
                  網
                </div>
                <h4>An empty grid, honestly</h4>
                <p>
                  Every verified bypass lands as one cell — the attack family
                  on the row, the model it bypassed on the column. The models
                  on the board publish at launch.
                </p>
                <div className="links">
                  <Link className="btn btn-ghost" href="/members/bounty">
                    How verification works
                  </Link>
                  <Link className="link-mono" href="/members/leaderboard">
                    Season 1 standings →
                  </Link>
                </div>
              </div>
            </Panel>

            <Panel title="Severity of verified results">
              <div
                className="sevbar zero"
                role="img"
                aria-label="No scored results yet"
                data-testid="members-bypass-matrix-sevbar"
              />
              <div className="sev-counts zero">
                <span className="k-crit">
                  <b>0</b> Critical
                </span>
                <span className="k-high">
                  <b>0</b> High
                </span>
                <span className="k-med">
                  <b>0</b> Medium
                </span>
                <span className="k-low">
                  <b>0</b> Low
                </span>
              </div>
              <div className="sev-note">
                Nothing scored yet — the distribution fills as the dojo
                verifies results. The same severities set reward tiers on the{" "}
                <Link href="/members/bounty">Bounty</Link> page.
              </div>
              <div
                className="drows"
                style={{ marginTop: 14 }}
                data-testid="members-bypass-matrix-facts"
              >
                <div className="drow">
                  <span className="l">Verified results</span>
                  <span className="v dim">
                    {MEMBER_PRELAUNCH_FACTS.verifiedBypasses}
                  </span>
                </div>
                <div className="drow">
                  <span className="l">Models on the board</span>
                  <span className="v dim">Publish at launch</span>
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}

      {hasMatrix && matrix && (
        <Panel
          title="Heatmap"
          sub={`${matrix.techniques.length} techniques · ${matrix.models.length} models`}
          noPad
        >
          <section
            // `members-matrix-heading` namespaces the a11y id so two
            // bypass-matrix surfaces cannot collide if a future
            // comparison page renders both the admin and member ports
            // on one document. The admin eval port uses the bare
            // `matrix-heading` id; the divergence is intentional.
            aria-labelledby="members-matrix-heading"
            data-testid="members-bypass-matrix-grid"
          >
            <h2 id="members-matrix-heading" className="sr-only">
              Bypass-rate heatmap
            </h2>
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
                  {matrix.techniques.map((t) => {
                    const hasCatalogEntry =
                      TECHNIQUE_ID_RE.test(t) && getTechnique(t) !== null;
                    return (
                      <tr key={t}>
                        <th scope="row">
                          {hasCatalogEntry ? (
                            <button
                              type="button"
                              onClick={() => openTechnique(t)}
                              data-testid={`members-bypass-matrix-technique-${t}`}
                              aria-label={`Open technique catalog entry for ${t}`}
                              style={{
                                background: "none",
                                border: 0,
                                padding: 0,
                                color: "inherit",
                                cursor: "pointer",
                                textDecoration: "underline dotted",
                                textUnderlineOffset: 2,
                                font: "inherit",
                              }}
                            >
                              {t}
                            </button>
                          ) : (
                            t
                          )}
                        </th>
                        {matrix.models.map((m) => {
                          const cell = findCell(t, m);
                          if (!cell) {
                            return (
                              <td
                                key={m}
                                data-testid={`members-bypass-matrix-cell-${t}-${m}`}
                              >
                                <span className="arena-heat-empty">—</span>
                              </td>
                            );
                          }
                          const isSelected =
                            selected !== null &&
                            selected.techniqueId === t &&
                            selected.modelId === m;
                          return (
                            <td
                              key={m}
                              data-testid={`members-bypass-matrix-cell-${t}-${m}`}
                            >
                              <BypassCell
                                rate={cell.bypassRate}
                                ci={{
                                  low: cell.wilsonLow,
                                  high: cell.wilsonHigh,
                                }}
                                n={cell.n}
                                unranked={cell.unranked}
                                selected={isSelected}
                                onClick={() => openCell(cell)}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </Panel>
      )}

      <Drawer
        open={selected !== null}
        onClose={closeCell}
        title={
          selected
            ? `${selected.techniqueId} × ${selected.modelId}`
            : "Cell detail"
        }
        sub={selected ? `n=${selected.n}` : undefined}
      >
        {selected && (
          <div data-testid="members-bypass-matrix-drawer">
            <dl>
              <dt>n</dt>
              <dd>{selected.n}</dd>
              <dt>bypass count</dt>
              <dd>{selected.bypassCount}</dd>
              <dt>bypass rate</dt>
              <dd>{formatPct(selected.bypassRate, 2)}%</dd>
              <dt>Wilson 95% CI</dt>
              <dd>
                [{formatPct(selected.wilsonLow, 2)}%,{" "}
                {formatPct(selected.wilsonHigh, 2)}%]
              </dd>
              <dt>unranked</dt>
              <dd>{selected.unranked ? "yes" : "no"}</dd>
            </dl>
          </div>
        )}
      </Drawer>

      <Drawer
        open={technique !== null}
        onClose={closeTechnique}
        title={technique ? technique.label : "Technique"}
        sub={technique ? technique.id : undefined}
      >
        {technique && (
          <div data-testid="members-bypass-matrix-technique-drawer">
            <TechniqueCard
              id={technique.id}
              label={technique.label}
              description={technique.description}
              exampleTriggerPhrase={technique.exampleTriggerPhrase}
              tags={technique.tags}
              references={technique.references}
            />
          </div>
        )}
      </Drawer>

      {/* Design wave-e "Bypass Matrix v2.html":100 — `.app-foot` closes the
          member content. */}
      <BrandFooterChip />
    </div>
  );
}
