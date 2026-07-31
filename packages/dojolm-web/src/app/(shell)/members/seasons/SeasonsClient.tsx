// SPDX-License-Identifier: Apache-2.0
"use client";

/**
 * SeasonsClient — v2 reskin P2b rebuild (design wave-e "Seasons v2.html").
 *
 * Renders the honest pre-launch narrative: a static Season-1-upcoming
 * card + "How a season runs" steps + home-note, then a zoned archive.
 * Copy is verbatim from the signed design render; season facts source
 * from `MEMBER_PRELAUNCH_FACTS` (D-07 copy contract) — never invented.
 *
 * The archive panel stays wired to `/api/members/seasons` for the
 * post-launch list (source unchanged), but the page never renders the
 * live `active` season — pre-launch there is no running season (D1).
 *
 * Error states (rule §6 — fixed operator-facing strings, no server
 * reflection):
 *   - 503 (MEMBERS_UI_DISABLED)  -> warn banner
 *   - 4xx / 5xx (anything else)  -> danger banner
 *   - empty archives[]           -> honest §4.1 empty block (蔵)
 *
 * Shape validation (rule §12): every slug passes the alphanumeric +
 * dash regex before reaching the DOM, a Link href, or a data-testid.
 */

import Link from "next/link";
import { useEffect, useState, type ReactElement } from "react";
import { PageHead, Panel, Steps } from "@/design/shell";
import { BrandFooterChip } from "@/design/shell/BrandFooterChip";
import { SystemBanner } from "@/design/system";
import { MEMBER_PRELAUNCH_FACTS } from "@/lib/demo/demo-facts";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface SeasonDTO {
  readonly slug: string;
  readonly label: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly status: "active" | "archived";
}

type LoadState =
  | { readonly kind: "loading" }
  | { readonly kind: "ok"; readonly archives: readonly SeasonDTO[] }
  | { readonly kind: "flag-off" }
  | { readonly kind: "error" };

/**
 * Slug validation gate — mirrors the server-side schema
 * `^[A-Za-z0-9-]{1,32}$` so an operator-controlled response cannot
 * smuggle a path separator through the archive Link hrefs.
 */
const SLUG_RE = /^[A-Za-z0-9-]{1,32}$/;

function validateSeason(raw: unknown): SeasonDTO | null {
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

function validateArchives(raw: unknown): readonly SeasonDTO[] | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.archives)) return null;
  const archives: SeasonDTO[] = [];
  for (const a of r.archives) {
    const s = validateSeason(a);
    if (s === null) return null;
    if (s.status === "archived") archives.push(s);
  }
  return archives;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

// Verbatim from the design render (wave-e "Seasons v2.html").
const SEASON_STEPS = [
  {
    title: "Doors open",
    sub: "Invited members compete in the stadium for the length of the season.",
  },
  {
    title: "Verified bypasses score",
    sub: "Standings and bounty update as the dojo verifies each submission — only verified work counts.",
  },
  {
    title: "The season archives",
    sub: "Final standings freeze, medals are awarded, and the season moves to the archive below.",
  },
] as const;

export function SeasonsClient(): ReactElement {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  // ponytail: one fetch on mount — a pre-launch narrative has nothing to
  // refresh (D3); the archive changes once per season rollover.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchWithAuth("/api/members/seasons");
        if (cancelled) return;
        if (res.status === 503) {
          setState({ kind: "flag-off" });
          return;
        }
        if (!res.ok) {
          setState({ kind: "error" });
          return;
        }
        const archives = validateArchives((await res.json()) as unknown);
        if (cancelled) return;
        setState(
          archives === null ? { kind: "error" } : { kind: "ok", archives },
        );
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const archives = state.kind === "ok" ? state.archives : [];

  return (
    <div>
      <PageHead namingId="seasons" title="Seasons" />

      <SystemBanner
        active={state.kind === "flag-off"}
        tone="warn"
        testId="members-seasons-flag-off-banner"
      >
        Seasons are currently disabled. Ask your operator to enable them.
      </SystemBanner>

      <SystemBanner
        active={state.kind === "error"}
        tone="danger"
        testId="members-seasons-error-banner"
      >
        Seasons temporarily unavailable. Try again in a moment.
      </SystemBanner>

      <div className="home-note" data-testid="members-seasons-note">
        <span className="dot" aria-hidden="true" />
        <span>
          <b>{MEMBER_PRELAUNCH_FACTS.seasonName} is being prepared.</b> The
          season calendar publishes at private-beta launch — your invite
          already reserves your seat.
        </span>
      </div>

      <div className="g-main" style={{ marginTop: 16 }}>
        <Panel
          title="Current season"
          meta={
            <span className="chip">
              <span className="dot quiet" aria-hidden="true" />
              {MEMBER_PRELAUNCH_FACTS.seasonChip}
            </span>
          }
        >
          <div
            className="cat-card"
            style={{ background: "var(--bg-1)" }}
            data-testid="members-seasons-season1-card"
          >
            <div className="top">
              <span className="t">{MEMBER_PRELAUNCH_FACTS.seasonName}</span>
              <span className="badge">Upcoming</span>
            </div>
            <span className="code">The opening season</span>
            <p className="desc" style={{ margin: 0 }}>
              The stadium&apos;s first competition. Doors open at private-beta
              launch; standings and bounty run for the length of the season,
              then the final board freezes into the archive.
            </p>
            <div className="stat-row">
              <span className="dot" aria-hidden="true" />
              Opens at private-beta launch · calendar publishes with the rules
            </div>
          </div>
          <div className="sev-note" style={{ marginTop: 12 }}>
            Standings for the live season are always on the{" "}
            <Link href="/members/leaderboard">Leaderboard</Link>; rewards
            attach on the <Link href="/members/bounty">Bounty</Link> page.
          </div>
        </Panel>

        <Panel title="How a season runs">
          <Steps items={SEASON_STEPS} />
        </Panel>
      </div>

      <div className="zone-title">
        <h2>Archive</h2>
        <span className="sub">Finished seasons, final boards frozen</span>
      </div>
      <section className="panel" aria-label="Season archive">
        {archives.length > 0 ? (
          <ul
            data-testid="members-seasons-archive-list"
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {archives.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/members/seasons/archive/${s.slug}`}
                  data-testid={`members-seasons-archive-link-${s.slug}`}
                >
                  {s.label}
                </Link>
                {s.endedAt && (
                  <>
                    {" · closed "}
                    <time dateTime={s.endedAt}>{formatDate(s.endedAt)}</time>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty" data-testid="members-seasons-empty">
            <div className="kj" lang="ja" aria-hidden="true">
              蔵
            </div>
            <h4>No finished seasons yet</h4>
            <p>
              When {MEMBER_PRELAUNCH_FACTS.seasonName} ends, its final
              standings freeze and land here.
            </p>
            <div className="links">
              <Link className="link-mono" href="/members/leaderboard">
                See the {MEMBER_PRELAUNCH_FACTS.seasonName} board →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Design wave-e "Seasons v2.html":104 — `.app-foot` closes the content. */}
      <BrandFooterChip />
    </div>
  );
}
