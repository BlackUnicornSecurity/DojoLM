// SPDX-License-Identifier: Apache-2.0

/** Canonical display identity for the v2 product skin. */
export interface RouteNaming {
  /** Unique canonical path owned by this display identity. */
  readonly route: string;
  /** Match nested path segments below `route`; exact matching is the default. */
  readonly matchDescendants?: boolean;
  readonly plain: string;
  /** Historical PageHead titles accepted while legacy clients migrate. */
  readonly legacyPageHeadTitles?: readonly string[];
  /** Exclude an intentionally duplicate title from legacy title inference. */
  readonly inferPageHead?: false;
  readonly codename: string | null;
  readonly kanji: string | null;
  /**
   * Single-glyph monogram for directory cards (wave-a Admin Landing v2
   * `.kj`). Defaults to the first `kanji` character; set only where the
   * signed corpus picks a different character.
   */
  readonly kanjiGlyph?: string;
  readonly romaji: string | null;
  /** Short registry-owned second line for routes without a codename. */
  readonly navSecondary?: string;
  readonly gloss: string;
  readonly belt:
    | "white"
    | "yellow"
    | "orange"
    | "green"
    | "blue"
    | "black"
    | null;
  readonly navGroup:
    | "home"
    | "test"
    | "protect"
    | "intel"
    | "operations"
    | "members";
  readonly tier: 1 | 2 | 3;
  readonly offNav: boolean;
  /** Include a nested utility route in the Admin module directory. */
  readonly adminDirectory?: true;
}

const identity = (value: RouteNaming): RouteNaming => Object.freeze(value);

/**
 * SKIN-SPEC §2.5 v1.3, keyed by the stable route identity used by the
 * filesystem and navigation registries. Product copy must read from here.
 */
export const ROUTE_NAMING = Object.freeze({
  dashboard: identity({
    route: "/",
    plain: "Command Center",
    codename: null,
    kanji: null,
    // Rail/monogram mark. `kanji` is null (the Command Center hero owns no
    // codename), so the corpus glyph 道 (dō — "the way") is set explicitly.
    kanjiGlyph: "道",
    romaji: null,
    navSecondary: "Home",
    gloss: "Live security posture and the day's next actions.",
    belt: null,
    navGroup: "home",
    tier: 1,
    offNav: false,
  }),
  console: identity({
    route: "/console",
    plain: "Workbench",
    codename: "Kōbō",
    kanji: "工房",
    romaji: "Kōbō",
    gloss: "Your configurable console of live monitoring widgets.",
    belt: null,
    navGroup: "home",
    tier: 2,
    offNav: false,
  }),
  scanner: identity({
    route: "/admin/scanner",
    matchDescendants: true,
    plain: "Scanner",
    legacyPageHeadTitles: ["Haiku Scanner"],
    codename: "Haiku",
    kanji: "俳句",
    romaji: "Haiku",
    gloss: "Live prompt-injection detection and triage.",
    belt: "white",
    navGroup: "test",
    tier: 2,
    offNav: false,
  }),
  buki: identity({
    route: "/admin/buki",
    matchDescendants: true,
    plain: "Payloads",
    codename: "Buki",
    kanji: "武器",
    romaji: "Buki",
    gloss: "Fixtures, synthetic generator, and fuzzer.",
    belt: "yellow",
    navGroup: "test",
    tier: 2,
    offNav: false,
  }),
  jutsu: identity({
    route: "/admin/jutsu",
    matchDescendants: true,
    plain: "Models",
    codename: "Jutsu",
    kanji: "術",
    romaji: "Jutsu",
    gloss: "Model configuration and comparison.",
    belt: "orange",
    navGroup: "test",
    tier: 2,
    offNav: false,
  }),
  arena: identity({
    route: "/admin/arena",
    matchDescendants: true,
    plain: "Arena",
    codename: "Kumite",
    kanji: "組手",
    romaji: "Kumite",
    gloss: "Multi-agent adversarial matches.",
    belt: null,
    navGroup: "test",
    tier: 2,
    offNav: false,
  }),
  atemi: identity({
    route: "/admin/atemi",
    matchDescendants: true,
    plain: "Live practice",
    legacyPageHeadTitles: ["Atemi Lab"],
    codename: "Atemi",
    kanji: "当身",
    romaji: "Atemi",
    gloss: "Hands-on testing of tools and integrations.",
    belt: null,
    navGroup: "test",
    tier: 2,
    offNav: false,
  }),
  sengoku: identity({
    route: "/admin/sengoku",
    matchDescendants: true,
    plain: "Campaigns",
    codename: "Sengoku",
    kanji: "戦国",
    romaji: "Sengoku",
    gloss: "Continuous red-team campaigns.",
    belt: "blue",
    navGroup: "test",
    tier: 2,
    offNav: false,
  }),
  ronin: identity({
    route: "/admin/ronin",
    matchDescendants: true,
    plain: "Research intake",
    legacyPageHeadTitles: ["Ronin Hub"],
    codename: "Ronin",
    kanji: "浪人",
    romaji: "Ronin",
    gloss: "Bug-bounty submissions and tracking.",
    belt: null,
    navGroup: "test",
    tier: 2,
    offNav: false,
  }),
  hattori: identity({
    route: "/admin/hattori",
    matchDescendants: true,
    plain: "Guard",
    codename: "Hattori",
    kanji: "服部",
    romaji: "Hattori",
    gloss: "Input, output, and policy protection controls.",
    belt: "green",
    navGroup: "protect",
    tier: 2,
    offNav: false,
  }),
  kotoba: identity({
    route: "/admin/kotoba",
    matchDescendants: true,
    plain: "Prompt hardening",
    codename: "Kotoba",
    kanji: "言葉",
    romaji: "Kotoba",
    gloss: "Prompt scoring and optimization.",
    belt: null,
    navGroup: "protect",
    tier: 2,
    offNav: false,
  }),
  mitsuke: identity({
    route: "/admin/mitsuke",
    matchDescendants: true,
    plain: "Threat intel",
    codename: "Mitsuke",
    kanji: "見付",
    romaji: "Mitsuke",
    gloss: "Intelligence pipeline and indicators.",
    belt: null,
    navGroup: "intel",
    tier: 2,
    offNav: false,
  }),
  tatami: identity({
    route: "/admin/tatami",
    matchDescendants: true,
    plain: "Evidence",
    codename: "Tatami",
    kanji: "畳",
    romaji: "Tatami",
    gloss: "Proofs, cases, and verifiable receipts.",
    belt: null,
    navGroup: "operations",
    tier: 2,
    offNav: false,
  }),
  // EE Projects — the engagement half of the full test report (client,
  // SUT identity, scope, governance). EE-only: stripped from OSS via
  // EE_NAV_IDS + the oss-export route exclusion.
  "system-health": identity({
    route: "/admin/system-health",
    matchDescendants: true,
    plain: "System health",
    codename: "Kenkō",
    kanji: "健康",
    romaji: "Kenkō",
    gloss: "Real-time component status.",
    belt: null,
    navGroup: "operations",
    tier: 3,
    offNav: false,
  }),
  account: identity({
    route: "/admin/account",
    matchDescendants: true,
    plain: "Account",
    codename: null,
    kanji: null,
    romaji: null,
    gloss: "Your profile, password, and sessions.",
    belt: null,
    navGroup: "operations",
    tier: 3,
    offNav: true,
  }),
  exports: identity({
    route: "/admin/exports",
    matchDescendants: true,
    plain: "Exports",
    codename: null,
    kanji: null,
    romaji: null,
    gloss: "Telemetry destinations: Datadog, Prometheus, or file.",
    belt: null,
    navGroup: "operations",
    tier: 3,
    offNav: true,
  }),
  admin: identity({
    route: "/admin",
    plain: "Admin",
    codename: null,
    kanji: null,
    romaji: null,
    navSecondary: "All modules",
    gloss:
      "Every module, grouped by job. Health lives in System health.",
    belt: null,
    navGroup: "operations",
    tier: 3,
    offNav: false,
  }),
  settings: identity({
    route: "/admin/settings",
    matchDescendants: true,
    plain: "Settings",
    codename: null,
    kanji: null,
    romaji: null,
    gloss: "Session, retention, and default-model controls.",
    belt: null,
    navGroup: "operations",
    tier: 3,
    offNav: true,
  }),
  budget: identity({
    route: "/admin/budget",
    matchDescendants: true,
    plain: "Spend budgets",
    codename: null,
    kanji: null,
    romaji: null,
    gloss: "Per-model and application-wide LLM spend caps.",
    belt: null,
    navGroup: "operations",
    tier: 3,
    offNav: true,
  }),
  flags: identity({
    route: "/admin/flags",
    matchDescendants: true,
    plain: "Feature flags",
    codename: null,
    kanji: null,
    romaji: null,
    gloss: "Runtime switches and the emergency kill-switch.",
    belt: null,
    navGroup: "operations",
    tier: 3,
    offNav: true,
  }),
  plugins: identity({
    route: "/admin/plugins",
    matchDescendants: true,
    plain: "Plugins",
    codename: null,
    kanji: null,
    romaji: null,
    gloss: "Extension registry: install, configure, remove.",
    belt: null,
    navGroup: "operations",
    tier: 3,
    offNav: true,
  }),
  "api-keys": identity({
    route: "/admin/api-keys",
    matchDescendants: true,
    plain: "API keys",
    codename: null,
    kanji: null,
    romaji: null,
    gloss: "Issue, rotate, and revoke programmatic access keys.",
    belt: null,
    navGroup: "operations",
    tier: 3,
    offNav: true,
  }),
  members: identity({
    route: "/members",
    // P5 prod-parity — the design rail/crumb leaf is "Home" (wave-c "Members
    // Home v2.html":28 l1="Home", :41 crumb "Members / Home"), not "Members
    // home". Drives the member-rail label + the /members crumb leaf.
    plain: "Home",
    codename: null,
    kanji: null,
    // Member rail mark mirrors the Command Center 道 glyph (design SSOT).
    kanjiGlyph: "道",
    romaji: null,
    navSecondary: "Overview",
    gloss: "Overview.",
    belt: null,
    navGroup: "members",
    tier: 2,
    offNav: false,
  }),
  leaderboard: identity({
    route: "/members/leaderboard",
    matchDescendants: true,
    plain: "Leaderboard",
    codename: null,
    kanji: null,
    romaji: null,
    navSecondary: "Standings",
    gloss: "Standings.",
    belt: null,
    navGroup: "members",
    tier: 2,
    offNav: false,
  }),
  seasons: identity({
    route: "/members/seasons",
    matchDescendants: true,
    plain: "Seasons",
    codename: "Kisetsu",
    kanji: "季節",
    romaji: "Kisetsu",
    gloss: "Competition seasons and archives.",
    belt: null,
    navGroup: "members",
    tier: 2,
    offNav: false,
  }),
  bounty: identity({
    route: "/members/bounty",
    matchDescendants: true,
    plain: "Bounty",
    codename: "Houbi",
    kanji: "褒美",
    romaji: "Houbi",
    gloss: "Rewards for verified bypasses.",
    belt: null,
    navGroup: "members",
    tier: 2,
    offNav: false,
  }),
  "bypass-matrix": identity({
    route: "/members/leaderboard/bypass-matrix",
    matchDescendants: true,
    plain: "Bypass matrix",
    codename: null,
    kanji: null,
    romaji: null,
    navSecondary: "Attack results",
    gloss: "Attack results by model and category.",
    belt: null,
    navGroup: "members",
    tier: 2,
    offNav: false,
  }),
} satisfies Readonly<Record<string, RouteNaming>>);

export type RouteNamingId = keyof typeof ROUTE_NAMING;

export function getRouteNaming(id: RouteNamingId): RouteNaming {
  return ROUTE_NAMING[id];
}

export function getRouteNamingForPath(pathname: string): RouteNaming | null {
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const matches = Object.values(ROUTE_NAMING)
    .filter(
      (naming) =>
        normalized === naming.route ||
        (naming.matchDescendants === true &&
          normalized.startsWith(`${naming.route}/`)),
    )
    .sort((left, right) => right.route.length - left.route.length);
  return matches[0] ?? null;
}

/** Preserve route hierarchy while replacing only the canonical module crumb. */
export function getRouteBreadcrumbs(
  pathname: string,
  fallback: readonly string[],
): string[] {
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const naming = getRouteNamingForPath(normalized);
  if (!naming) return [...fallback];
  if (
    normalized === "/" ||
    normalized === "/console" ||
    normalized === "/account" ||
    normalized === "/admin" ||
    normalized === "/members"
  ) {
    return [naming.plain];
  }
  if (/^\/admin\/[^/]+/.test(normalized)) {
    return [fallback[0] ?? "Admin", naming.plain, ...fallback.slice(2)];
  }
  if (/^\/members\/[^/]+$/.test(normalized)) {
    return [fallback[0] ?? "Members", naming.plain];
  }
  if (normalized === "/members/leaderboard/bypass-matrix") {
    // Design (wave-e Bypass Matrix): "会員 Members / Bypass matrix" — the
    // Leaderboard parent collapses. Seasons archive (wave-h) keeps its
    // full "Members / Seasons / Archive" trail, so no general deep-path
    // collapse.
    return [fallback[0] ?? "Members", naming.plain];
  }
  return [...fallback];
}
