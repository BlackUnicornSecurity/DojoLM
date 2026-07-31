// SPDX-License-Identifier: Apache-2.0
/**
 * FixtureDetailClient — TICKET-A402 fixture-detail client component.
 *
 * Renders one fixture category: tier-2 hero (kicker + capitalized
 * label + gloss + Export action) · stacked SeverityBar · full file
 * list as AttackRow rows · §5.5 ref-block footer · back link to the
 * /admin/buki Fixtures tab.
 *
 * Data source — fetches `/api/fixtures` on mount and falls back to
 * the static `fixtureManifest` stub on failure (same pattern as
 * BukiClient's fixtures fetch). Sanitized via `fixtureCategories()`
 * so a malformed manifest never crashes the render. 404 EmptyState
 * when the category id from the URL is not present in the manifest.
 *
 * Why a client component:
 *   - The /api/fixtures route is auth-gated and lives in the same
 *     deployment; doing the fetch client-side keeps the trust
 *     boundary identical to BukiClient (avoids duplicating server-
 *     side manifest-loading code from the API route).
 *   - 'use client' is required because the page mounts via
 *     useEffect + useState for the loading/error states.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AttackRow, type AttackRowStatus } from "@/design/primitives/AttackRow";
import { EmptyState } from "@/design/system/EmptyState";
import { RefBlock } from "@/design/shell/RefBlock";
import { SeverityBar } from "@/design/primitives/SeverityBar";
import { cap, capOpt } from "@/design/primitives/_caps";
import { fixtureManifest } from "@/lib/fixtures-manifest";
import {
  fixtureCategories,
  fixtureCategoryCounts,
  FIXTURE_SEVERITY_MAP,
  FIXTURE_STATUS_MAP,
  type FixtureCategoryEntry,
} from "./fixture-helpers";
import { DESCRIPTION_MAX, NAME_MAX } from "./types";

interface FixtureDetailClientProps {
  readonly categoryId: string;
}

export function FixtureDetailClient({ categoryId }: FixtureDetailClientProps) {
  const [cats, setCats] = useState<readonly FixtureCategoryEntry[]>(() =>
    fixtureCategories(fixtureManifest),
  );
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/fixtures", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json().catch(() => null)) as unknown;
        if (cancelled) return;
        const parsed = fixtureCategories(body);
        setCats(parsed);
        setFetchError(null);
      } catch {
        if (cancelled) return;
        const fallback = fixtureCategories(fixtureManifest);
        setCats(fallback);
        setFetchError(fallback.length === 0 ? "Armory unavailable" : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Dep array carries `categoryId` so a same-instance re-render with a
    // different prop value re-fetches and revalidates the lookup. Today
    // Next.js unmounts/remounts on navigation so this is belt-and-
    // suspenders — adversarial review HIGH-1 in PR-5. The /api/fixtures
    // response is global (not id-scoped), so re-fetching on prop change
    // is cheap (same manifest, no per-id query).
  }, [categoryId]);

  const category = useMemo(
    () => cats.find((c) => c.id === categoryId),
    [cats, categoryId],
  );

  // Adversarial MED-1 / arch MED-1 — the fetch-error banner must
  // surface on EVERY render branch (loading / 404 / detail) so an
  // operator looking at a "not found" page understands whether the id
  // is genuinely missing or whether /api/fixtures is down (the stub
  // manifest has empty categories → fetch failure always renders as
  // 404 without this hoist). Renders above all branch returns.
  const fetchErrorBanner =
    fetchError !== null ? (
      <div
        role="alert"
        data-testid="buki-fixture-detail-fetch-error"
        className="yr4-banner tone-red"
        style={{ margin: "12px 24px 0" }}
      >
        {cap(fetchError, 200)}
      </div>
    ) : null;

  // 404 — id not present in the manifest. Render an EmptyState with a
  // back link rather than throwing notFound() so the surrounding
  // chrome (PageHead + back link) stays for orientation.
  if (!loading && !category) {
    return (
      <div data-testid="buki-fixture-detail-not-found-container">
        <BackLink />
        {fetchErrorBanner}
        <EmptyState
          module="buki"
          state="empty"
          title="Fixture category not found"
          sub={`No category "${cap(categoryId, 64)}" in the armory manifest.`}
          cta={{ label: "Back to fixtures", href: "/admin/buki?tab=fixtures" }}
          testId="buki-fixture-detail-not-found"
        />
      </div>
    );
  }

  if (loading && !category) {
    return (
      <div data-testid="buki-fixture-detail-loading-container">
        <BackLink />
        {fetchErrorBanner}
        <p className="wb-hint" data-testid="buki-fixture-detail-loading">
          Loading fixture detail…
        </p>
      </div>
    );
  }

  // category is guaranteed defined here.
  if (!category) return null;

  const counts = fixtureCategoryCounts(category);
  const totalFixtures = cats.reduce((sum, c) => sum + c.files.length, 0);

  return (
    <div data-testid="buki-fixture-detail-root">
      <header style={{ padding: "16px 24px 0" }}>
        <BackLink />
        <CategoryHero category={category} />
      </header>

      {fetchErrorBanner}

      <div style={{ padding: "20px 24px" }}>
        <section
          aria-label="Severity distribution"
          data-testid="buki-fixture-detail-severity-section"
          style={{
            padding: "18px 22px",
            background:
              "linear-gradient(180deg, var(--bg-2) 0%, var(--bg-1) 100%)",
            border: "1px solid var(--b-1)",
            borderRadius: 12,
            boxShadow: "var(--shadow-card)",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: 15.5, // design .p-hd h3 (wave-h Buki Fixture Detail)
              letterSpacing: "-0.02em",
              fontWeight: 600,
              color: "var(--fg)",
            }}
          >
            Severity distribution
          </h2>
          <SeverityBar
            variant="stacked"
            counts={counts}
            colorize
            // P5 prod-parity — the design's severity card carries the bar +
            // the .sev-counts grammar below ONLY; the SeverityBar's own
            // mono-caps text summary is the redundant old-skin line.
            showText={false}
            ariaLabel={`Severity distribution for ${category.id}`}
            testId={`buki-fixture-detail-severity-${category.id}`}
          />
          {/* Design wave-b .sev-counts grammar — "critical / medium / clean"
              copy verbatim from the wave-h reference (nr-buki-fixture-detail
              item 5); the CSS already lives in v2/module.css. */}
          <div
            className="sev-counts"
            data-testid="buki-fixture-detail-sev-counts"
          >
            <span className="k-crit">
              <b>{counts.crit}</b> critical
            </span>
            <span className="k-med">
              <b>{counts.warn}</b> medium
            </span>
            <span className="k-clean">
              <b>{counts.clean}</b> clean
            </span>
          </div>
        </section>

        <section
          aria-label="Fixture files"
          data-testid="buki-fixture-detail-files-section"
        >
          {/* P5 prod-parity — design (wave-h) is a .zone-title: plain "Files"
              H2 with the count folded into a dim sub-caption, not "Files (N)". */}
          <div className="zone-title">
            <h2>Files</h2>
            <span className="sub">
              {category.files.length}{" "}
              {category.files.length === 1 ? "fixture" : "fixtures"} · verdicts
              from the last scored run
            </span>
          </div>
          {category.files.length === 0 ? (
            <EmptyState
              module="buki"
              state="empty"
              title="No files in this category"
              sub="The category has no fixtures attached yet."
              cta={{
                label: "Back to fixtures",
                href: "/admin/buki?tab=fixtures",
              }}
              testId="buki-fixture-detail-files-empty"
              compact
            />
          ) : (
            <div
              className="yr4-data-list"
              role="list"
              data-testid="buki-fixture-detail-files-list"
              aria-label={`Fixture files in ${category.id}`}
            >
              {category.files.map((f, idx) => {
                const sev = f.severity
                  ? (FIXTURE_SEVERITY_MAP[f.severity] ?? "low")
                  : "low";
                const status = f.clean
                  ? ("pass" as AttackRowStatus)
                  : f.severity
                    ? (FIXTURE_STATUS_MAP[f.severity] ?? "open")
                    : ("open" as AttackRowStatus);
                // Adversarial LOW-2 in PR-5 — AttackRow's root div
                // already emits `role="listitem"`. A wrapping div with
                // the same role would double-mark the list item for
                // screen readers; drop the wrapper and put the key
                // directly on AttackRow.
                return (
                  <AttackRow
                    key={`${category.id}-${idx}-${f.file}`}
                    item={{
                      id: `${category.id}-${idx}`,
                      eyebrow: cap(category.id, 32),
                      title: cap(f.file, NAME_MAX),
                      sub: capOpt(f.attack ?? undefined, DESCRIPTION_MAX),
                      sev,
                      status,
                    }}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* §5.5 ref-block footer (design wave-h reference, ref-block zone).
            N/M derive from the live manifest in scope — with the demo
            manifest this reads "one of 5 … (17 fixtures total)" verbatim. */}
        <div
          style={{ marginTop: 16 }}
          data-testid="buki-fixture-detail-ref-block"
        >
          <RefBlock
            kj="武"
            title="This category"
            sub={`is one of ${cats.length} in the Buki fixture library (${totalFixtures} fixtures total).`}
            href="/admin/buki?tab=fixtures"
            linkLabel="Back to fixtures →"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Tier-2 hero (design wave-h page-head): kicker `武器 Buki · fixture
 * category` + capitalized category label H1 + gloss with the story code
 * + "Export category" ghost action. Rendered locally (not via PageHead)
 * because the kicker text is route-specific, not a ROUTE_NAMING entry —
 * markup mirrors PageHead's .page-head/.col/.page-kick anatomy so the
 * existing v2 CSS applies unchanged.
 */
function CategoryHero({ category }: { category: FixtureCategoryEntry }) {
  return (
    <div className="page-head">
      <div className="col" style={{ minWidth: 0 }}>
        <div className="page-kick">
          <span className="kj" lang="ja" aria-hidden="true">
            武器
          </span>
          <span>Buki · fixture category</span>
        </div>
        <h1>{cap(categoryLabel(category.id), 64)}</h1>
        <p className="lede">
          {category.desc
            ? cap(category.desc, DESCRIPTION_MAX)
            : `Fixture category — ${category.files.length} file${category.files.length === 1 ? "" : "s"}.`}
          {category.story ? (
            <>
              {" — "}
              <span
                style={{ fontFamily: "var(--mono)", color: "var(--fg-dim)" }}
              >
                {cap(category.story, 64)}
              </span>
            </>
          ) : null}
        </p>
      </div>
      <div className="actions">
        <button
          type="button"
          className="btn btn-ghost"
          data-testid="buki-fixture-detail-export"
          onClick={() => exportCategory(category)}
        >
          Export category
        </button>
      </div>
    </div>
  );
}

/** "images" → "Images" — the design H1 is the capitalized category label. */
function categoryLabel(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

// ponytail: client-side JSON download of the already-fetched category —
// no category-scoped export endpoint exists; add a server export if
// operators ever need signed artifacts.
function exportCategory(category: FixtureCategoryEntry): void {
  const blob = new Blob([JSON.stringify(category, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `buki-fixtures-${category.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function BackLink() {
  return (
    <Link
      href="/admin/buki?tab=fixtures"
      data-testid="buki-fixture-detail-back-link"
      className="wb-link v2-touch-link"
      style={{ fontSize: 13, display: "inline-block", marginBottom: 8 }}
    >
      ← Back to fixtures
    </Link>
  );
}
