// SPDX-License-Identifier: Apache-2.0
/**
 * FixturesTab — outer-tab render for /admin/buki Fixtures. Extracted
 * from BukiClient.tsx for the PR-2 split (parent was 1296 LOC, over
 * the 800 cap).
 *
 * V1-faithful 3-col category-card grid (v1-02b-buki.png reference).
 * Each card surfaces the at-a-glance shape: name + count badge +
 * description + stacked severity bar + counts + collapsible file list.
 *
 * Pure render component — all state (fixtureCats / loading / error)
 * is owned by the parent BukiClient. Mirrors the Jutsu/Ronin
 * `_components/*` props-only pattern from PR #841.
 *
 * E-A4 Phase B carve-outs (preserved verbatim):
 *   - Stacked SeverityBar with `colorize` opt-in (B.3 + B.3-NICE-1).
 *   - Per-card "View N fixtures" disclosure → inline AttackRow list,
 *     capped at MAX_FIXTURE_FILES_PER_CAT with +N overflow hint.
 */

"use client";

import Link from "next/link";
import { EmptyState } from "@/design/system/EmptyState";
import { SeverityBar } from "@/design/primitives/SeverityBar";
import { cap } from "@/design/primitives/_caps";
import {
  fixtureCategoryCounts,
  type FixtureCategoryEntry,
} from "./fixture-helpers";

/**
 * P4 D12 — category descriptions ship without terminal punctuation in the
 * katana-gated fixture manifest, but the design renders them as full
 * sentences ("…vectors."). Normalize presentation-side only (never touches
 * the manifest data): append a period unless the text already ends in
 * sentence punctuation or an ellipsis (cap() may have added one).
 */
function withTrailingPeriod(text: string): string {
  const trimmed = text.trimEnd();
  if (trimmed.length === 0) return trimmed;
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

interface FixturesTabProps {
  readonly fixtureCats: readonly FixtureCategoryEntry[];
  readonly fixturesError: string | null;
  readonly fixturesLoading: boolean;
  readonly onAddFixture?: () => void;
  /** HAGANE E1.S5 — retry the live /api/fixtures fetch after a
   *  disclosed bundled-manifest fallback (audit C2). */
  readonly onRetryFixtures?: () => void;
}

export function FixturesTab({
  fixtureCats,
  fixturesError,
  fixturesLoading,
  onAddFixture,
  onRetryFixtures,
}: FixturesTabProps) {
  return (
    <section
      id="buki-workbench-panel-fixtures"
      role="tabpanel"
      aria-labelledby="buki-workbench-panel-fixtures-trigger"
      tabIndex={0}
      data-testid="buki-fixtures-tab"
    >
      {fixturesError !== null && (
        <div
          role="alert"
          data-testid="buki-fixtures-error"
          className="yr4-banner tone-red"
        >
          {cap(fixturesError, 200)}
          {onRetryFixtures !== undefined && (
            <button
              type="button"
              className="btn sm"
              style={{ marginLeft: 10 }}
              onClick={onRetryFixtures}
              data-testid="buki-fixtures-retry"
            >
              Retry
            </button>
          )}
        </div>
      )}
      {fixturesLoading && fixtureCats.length === 0 ? (
        <p className="wb-hint" data-testid="buki-fixtures-loading">
          Loading armory catalog…
        </p>
      ) : fixtureCats.length === 0 ? (
        <EmptyState
          module="buki"
          state="empty"
          title="Fixture manifest is empty"
          sub="Use Add Fixture above to add the first fixture to the SAGE corpus."
          cta={{
            label: "Add first fixture",
            href: "#buki-add-fixture",
            ...(onAddFixture ? { onClick: onAddFixture } : {}),
          }}
          testId="buki-fixtures-empty"
          compact
        />
      ) : (
        <>
          {/*
            E-A4 founder eye-test 2026-05-20 — Fixture explorer
            REBUILT from vertical row-per-category list (with
            inline file rows) to a V1-faithful 3-col category-card
            grid (v1-02b-buki.png reference). Each card surfaces
            the category at-a-glance shape: icon + name + count
            badge + description + stacked severity bar + counts +
            source chip. The inner file list moves to a per-card
            "View" affordance (drill-into-detail; currently a
            collapsed accordion below the card grid since V2
            doesn't have the dedicated fixture-detail route yet —
            Phase 2 ticket TICKET-A402-FIXTURE-DETAIL).
          */}
          {/* P4 D4 — the design leads the Fixtures body with a free-standing
              "Fixture library" H2 + dim count sub (design .zone-title), not a
              bare hint line. marginTop:0 matches the ref (the tab-body gap
              already supplies the space above). */}
          <div className="zone-title" style={{ marginTop: 0 }}>
            <h2>Fixture library</h2>
            <span className="sub" data-testid="buki-fixtures-counts">
              {fixtureCats.length} categor
              {fixtureCats.length === 1 ? "y" : "ies"} ·{" "}
              {fixtureCats.reduce((sum, c) => sum + c.files.length, 0)} fixtures
            </span>
          </div>
          <div
            data-testid="buki-fixtures-catalog"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
              gap: 20,
            }}
            role="list"
            aria-label="Fixture catalog"
          >
            {fixtureCats.map((cat) => {
              const counts = fixtureCategoryCounts(cat);
              return (
                <div
                  key={cat.id}
                  role="listitem"
                  data-testid={`buki-fixture-cat-${cat.id}`}
                  style={{
                    padding: "20px 22px",
                    background:
                      "linear-gradient(180deg, var(--bg-2) 0%, var(--bg-1) 100%)",
                    border: "1px solid var(--b-1)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-card)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  <header
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 16,
                          fontWeight: 700,
                          color: "var(--fg)",
                          textTransform: "capitalize",
                        }}
                        data-testid={`buki-fixture-cat-${cat.id}-title`}
                      >
                        {cap(cat.id, 64)}
                      </h3>
                      {cat.story && (
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: 13,
                            color: "var(--fg-mute)",
                          }}
                        >
                          {cap(cat.story, 64)}
                        </p>
                      )}
                    </div>
                    <span
                      className="chip steel"
                      data-testid={`buki-fixture-cat-${cat.id}-count`}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {cat.files.length}
                    </span>
                  </header>
                  {cat.desc && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: "var(--fg-mute)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {withTrailingPeriod(cap(cat.desc, 200))}
                    </p>
                  )}
                  <div>
                    <SeverityBar
                      variant="stacked"
                      counts={counts}
                      colorize
                      showText={false}
                      ariaLabel={`Severity distribution for ${cat.id}`}
                      testId={`buki-fixture-severity-${cat.id}`}
                    />
                    {/* P4 D6 — one count row, full severity words (design
                        .sev-counts: colored number + dim word). The bar's
                        built-in text alt is suppressed (showText={false}) so
                        the row isn't doubled; the bar keeps its aria-label as
                        the a11y summary. */}
                    <div
                      className="sev-counts"
                      data-testid={`buki-fixture-counts-${cat.id}`}
                    >
                      {counts.crit > 0 && (
                        <span className="k-crit">
                          <b>{counts.crit}</b> critical
                        </span>
                      )}
                      {counts.warn > 0 && (
                        <span className="k-med">
                          <b>{counts.warn}</b> medium
                        </span>
                      )}
                      {counts.clean > 0 && (
                        <span className="k-clean">
                          <b>{counts.clean}</b> clean
                        </span>
                      )}
                    </div>
                  </div>
                  {/*
                    TICKET-A402 (PR-5 of the Buki Phase 2 close-out
                    wave) — the per-card `<details>` accordion was
                    replaced by a deep-link to the dedicated
                    `/admin/buki/fixtures/[id]` detail route. The
                    detail page renders the full file list (no
                    MAX_FIXTURE_FILES_PER_CAT cap) plus severity
                    chrome.
                  */}
                  {/*
                    Adversarial HIGH-2 in PR-5 — drop the
                    `encodeURIComponent` wrap. Next.js `<Link>` already
                    percent-encodes most segment chars; doing it
                    ourselves creates a read-side asymmetry (Next.js
                    decodes `params.id` before surfacing), so a
                    category id containing `+`, `.`, `~` etc. would
                    silently 404.

                    Latent caveat (audit-loop LOW in PR-5): Next.js
                    Link does NOT encode `?` or `#` in the pathname
                    string — those are interpreted as query / fragment
                    delimiters. Manifest ids today are slug-only
                    (hyphen-alphanumeric), so this is unreachable.
                    Tracked as a follow-up: tighten `fixtureCategories`
                    to reject reserved URL chars in ids when the
                    manifest schema is ever relaxed.
                  */}
                  <Link
                    href={`/admin/buki/fixtures/${cat.id}`}
                    data-testid={`buki-fixture-cat-${cat.id}-view-link`}
                    className="wb-link v2-touch-link"
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      // G2-02 link law: links are steel — torii is reserved
                      // for the view's one chrome-red moment (§1.2).
                      color: "var(--steel-lg)",
                      textDecoration: "none",
                    }}
                  >
                    View {cat.files.length} fixture
                    {cat.files.length === 1 ? "" : "s"} →
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
