// SPDX-License-Identifier: Apache-2.0
/**
 * Admin module directory projected from the signed v2 route registry.
 * Route identity, display copy, grouping, and destinations stay registry-owned.
 */

import type { ReactElement } from "react";

import { NAV_ID_TO_URL } from "@/lib/navigation/admin-routes";
import {
  ROUTE_NAMING,
  type RouteNaming,
  type RouteNamingId,
} from "@/lib/navigation/route-naming";

const ADMIN_GROUPS: readonly RouteNaming["navGroup"][] = [
  "test",
  "protect",
  "intel",
  "operations",
];

const ADMIN_GROUP_LABEL: Readonly<Record<RouteNaming["navGroup"], string>> =
  Object.freeze({
    home: "Home",
    test: "Test",
    protect: "Protect",
    intel: "Intel & evidence",
    operations: "Operations",
    members: "Members",
  });

// ---------------------------------------------------------------------------
// Filesystem-truth admin module catalog. Each key MUST correspond to a
// directory under `packages/dojolm-web/src/app/(shell)/admin/<key>/page.tsx`
// at HEAD. Nested product views stay with their parent module unless their
// registry identity explicitly opts into the directory.
// ---------------------------------------------------------------------------

export interface AdminRouteEntry {
  /** Filesystem slug (e.g. `'system-health'`). Used as the React key. */
  readonly slug: string;
  /** User-facing module name (e.g. `'System Health'`). */
  readonly name: string;
  /** Canonical destination URL (`/admin/<slug>` for shipped modules). */
  readonly route: string;
  /** One-line tagline shown beneath the name. */
  readonly tagline: string;
}

/**
 * Closed catalog of every shipped top-level admin module.
 *
 * Drift contract: every `/admin/*` URL in `NAV_ID_TO_URL` (except `/`)
 * MUST appear here as the value of some entry's `route`. Drift is
 * caught at runtime by `assertAdminRouteCatalogParity` (dev-only).
 */
const ADMIN_ROUTE_ENTRIES = Object.entries(ROUTE_NAMING).filter(
  ([, naming]) =>
    naming.route.startsWith("/admin/") &&
    (naming.route.split("/").length === 3 || naming.adminDirectory === true),
) as readonly [RouteNamingId, RouteNaming][];

export const ADMIN_ROUTE_CATALOG: Readonly<Record<string, AdminRouteEntry>> =
  Object.freeze(
    Object.fromEntries(
      ADMIN_ROUTE_ENTRIES.map(([id, naming]) => [
        id,
        Object.freeze({
          slug: id,
          name: naming.plain,
          route: naming.route,
          tagline: naming.gloss,
        }),
      ]),
    ),
  );

/**
 * Defensive: dev-only check that every `/admin/*` URL in
 * `NAV_ID_TO_URL` (except the dashboard root `/`) appears as the
 * `route` of some `ADMIN_ROUTE_CATALOG` entry. Drift means a Rail
 * destination was added without a matching landing-nav card —
 * exactly the F-3-001 regression.
 *
 * Returns the list of orphan URLs. Empty list = parity. Caller uses
 * the return value to decide whether to console.warn at component
 * mount; we deliberately do NOT throw so test runs against future
 * NAV_ID_TO_URL additions stay green.
 */
/**
 * E-A2 Phase B (2026-05-19) — `findAdminRouteOrphans` exempt list for
 * NAV_ID_TO_URL entries that intentionally do NOT have an AdminLandingNav
 * card because they are not admin-only routes.
 *
 * `/console` is the Workbench archetype per ADR-0096 §"Justification" —
 * an auth-required route, NOT admin-only. AdminLandingNav by design only
 * surfaces admin-only modules (the `/admin/<slug>` family). The Workbench is reached from the Rail
 * "Workbench" entry; it is not a peer of `/admin/scanner` etc.
 *
 * Adding `/console` to ADMIN_ROUTE_CATALOG would mis-classify it as admin
 * and break RBAC framing for non-admin operators landing on `/admin`.
 * Exempting it from the orphan check is the correct fix.
 */
export const NON_ADMIN_NAV_URL_EXEMPT_LIST: readonly string[] = Object.freeze([
  "/console",
]);

export function findAdminRouteOrphans(
  catalog: Readonly<Record<string, AdminRouteEntry>> = ADMIN_ROUTE_CATALOG,
  navMap: Readonly<Record<string, string>> = NAV_ID_TO_URL,
): readonly string[] {
  const catalogRoutes = new Set<string>(
    Object.values(catalog).map((entry) => entry.route),
  );
  const exempt = new Set<string>(NON_ADMIN_NAV_URL_EXEMPT_LIST);
  const orphans: string[] = [];
  for (const url of Object.values(navMap)) {
    if (url === "/") continue;
    if (exempt.has(url)) continue;
    if (!catalogRoutes.has(url)) orphans.push(url);
  }
  return Object.freeze(orphans);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface AdminLandingNavProps {
  /**
   * Optional catalog override. Defaults to `ADMIN_ROUTE_CATALOG`.
   * Test-only — production callers should never pass this.
   */
  readonly catalog?: Readonly<Record<string, AdminRouteEntry>>;
}

export function AdminLandingNav({
  catalog = ADMIN_ROUTE_CATALOG,
}: AdminLandingNavProps = {}): ReactElement {
  // F-QA-040: Atemi is a flag-gated surface (`ATEMI_ENABLED`). When the flag
  // is off the API 404s and the module is inert, so its landing card must not
  // render — a card that deep-links to a disabled surface is a dead end.
  // This is a server component and `/admin` is auth-gated + dynamic, so the
  // runtime-env read reflects the live flag, not a build-time value. Filtering
  // the rendered entries (not the catalog) keeps the `findAdminRouteOrphans`
  // parity check below honest against the FULL catalog.
  const atemiEnabled = process.env.ATEMI_ENABLED === "true";
  const entries = Object.values(catalog).filter(
    // eslint-disable-next-line no-restricted-syntax -- semantic module slug, not a retired navigation identity
    (entry) => entry.slug !== "atemi" || atemiEnabled,
  );
  const groupedEntries = ADMIN_GROUPS.map((group) => ({
    group,
    entries: entries.filter((entry) => {
      const naming = Object.hasOwn(ROUTE_NAMING, entry.slug)
        ? ROUTE_NAMING[entry.slug as RouteNamingId]
        : null;
      return (naming?.navGroup ?? "operations") === group;
    }),
  })).filter(({ entries: groupEntries }) => groupEntries.length > 0);

  // Dev-time drift guard: walk NAV_ID_TO_URL and surface any admin URL
  // that lacks a card. Production builds skip the warn.
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    const orphans = findAdminRouteOrphans(catalog);
    if (orphans.length > 0) {
      console.warn(
        "[AdminLandingNav] NAV_ID_TO_URL admin URLs missing from ADMIN_ROUTE_CATALOG:",
        orphans,
      );
    }
  }

  return (
    <nav
      aria-label="Admin modules"
      data-testid="admin-landing-nav"
      style={{ display: "block" }}
    >
      {/* P5 prod-parity (wave-a Admin Landing v2): the "ADMIN MODULES ·
          N surfaces" header the design omits is removed — the page flows
          straight into the first group kicker. The nav keeps its
          `aria-label` so the landmark stays named for AT. */}
      <div
        data-testid="admin-landing-nav-grid"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {groupedEntries.map(({ group, entries: groupEntries }) => (
          <section
            key={group}
            aria-labelledby={`admin-group-${group}`}
            data-testid={`admin-landing-group-${group}`}
          >
            <h3
              id={`admin-group-${group}`}
              style={{
                margin: "0 0 10px",
                // design .grp-kick (wave-a app-shell.css): mono 11/400,
                // 0.2em tracking, fg-mute — not the bolder fg-dim variant.
                color: "var(--fg-mute)",
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 400,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {ADMIN_GROUP_LABEL[group]}
              <span>{` · ${groupEntries.length} modules`}</span>
            </h3>
            <ul
              className="admin-landing-card-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                listStyle: "none",
                margin: 0,
                padding: 0,
                borderTop: "1px solid var(--b-1)",
              }}
            >
              {groupEntries.map((entry) => (
                <AdminLandingCard key={entry.slug} meta={entry} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}

interface AdminLandingCardProps {
  readonly meta: AdminRouteEntry;
}

function AdminLandingCard({ meta }: AdminLandingCardProps): ReactElement {
  const naming = Object.hasOwn(ROUTE_NAMING, meta.slug)
    ? ROUTE_NAMING[meta.slug as RouteNamingId]
    : null;
  const displayName = naming?.plain ?? meta.name;
  const tagline = naming?.gloss ?? meta.tagline;
  const beltLabel = naming?.belt
    ? `${naming.belt.slice(0, 1).toUpperCase()}${naming.belt.slice(1)} belt`
    : null;
  // wave-a Admin Landing v2 `.kj` + `.code` — registry-owned two-line
  // identity (SKIN-SPEC §2.3): single kanji monogram right of the title,
  // then a mono codename · kanji row. Codename-less utility cards keep
  // the row as a non-breaking space so card rhythm holds (corpus &nbsp;).
  const kanjiGlyph = naming?.kanji
    ? (naming.kanjiGlyph ?? [...naming.kanji][0] ?? null)
    : null;
  const codenameRow = naming?.codename
    ? [naming.codename, naming.kanji].filter(Boolean).join(" · ")
    : null;
  return (
    <li className="admin-landing-card-item">
      <a
        className="admin-landing-card"
        href={meta.route}
        data-testid={`admin-landing-card-${meta.slug}`}
        aria-label={`${displayName} module — ${tagline}`}
      >
        <header className="admin-landing-card-top">
          <span
            data-testid={`admin-landing-card-${meta.slug}-name`}
            className="admin-landing-card-title"
          >
            {displayName}
          </span>
          {kanjiGlyph && (
            <span
              className="admin-landing-card-kanji"
              lang="ja"
              aria-hidden="true"
            >
              {kanjiGlyph}
            </span>
          )}
        </header>
        <span className="admin-landing-card-code">
          {codenameRow ?? "\u00A0"}
        </span>
        <p className="admin-landing-card-gloss">{tagline}</p>
        {beltLabel ? (
          <footer className="admin-landing-card-footer">
            <span
              className={`belt ${naming?.belt ?? ""} admin-landing-card-belt`}
            >
              {beltLabel}
            </span>
          </footer>
        ) : null}
      </a>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Back-compat shim — pre-E5.S7 callers imported `ADMIN_PAGE_IDS`,
// `ADMIN_PAGE_META`, and the `AdminPageId` type from this module. The
// rewrite drops the closed `AdminPageId` enum (it would have to enumerate
// 26+ slugs and re-fork on every catalog change). We export aliases that
// preserve the legacy names and shape so external callers keep
// compiling, but we intentionally widen `AdminPageId` to `string` —
// keeping a closed union here would defeat the auto-derivation goal.
// ---------------------------------------------------------------------------

/** @deprecated Use `string` and look up via `ADMIN_ROUTE_CATALOG`. */
export type AdminPageId = string;

/** @deprecated Alias for `ADMIN_ROUTE_CATALOG`; keys are slugs. */
export const ADMIN_PAGE_META: Readonly<Record<string, AdminRouteEntry>> =
  ADMIN_ROUTE_CATALOG;

/** @deprecated Use `Object.keys(ADMIN_ROUTE_CATALOG)` directly. */
export const ADMIN_PAGE_IDS: readonly string[] = Object.freeze(
  Object.keys(ADMIN_ROUTE_CATALOG),
);
