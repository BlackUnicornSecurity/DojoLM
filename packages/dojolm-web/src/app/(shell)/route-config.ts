// SPDX-License-Identifier: Apache-2.0
/* eslint-disable no-restricted-syntax -- Route/Rail identities intentionally preserve shipped path codenames; they are not outgoing legacy NavIds. */
/**
 * Shell route configuration — maps each shipped product route to its
 * Rail active-id, TopBar breadcrumbs, archetype, and kanji glyph.
 *
 * Archetype controls which optional chrome renders (see ShellChrome):
 *   - Kamae panel appears on Command surfaces only (§5 guardrails).
 *
 * Reference: the design-upgrade plan §4 route reconciliation
 * and §5 archetype vocabulary.
 */

export type Archetype = "command" | "workbench" | "arena" | "codex" | "ritual";

export interface EnvChipSpec {
  readonly label: string;
  readonly kind?: "jade" | "red" | "warn" | "steel" | "ghost";
}

export interface RouteConfig {
  readonly active: string;
  readonly archetype: Archetype;
  readonly crumbs: readonly string[];
  readonly jp: string | null;
  readonly envChips?: readonly EnvChipSpec[];
  /** Kamae stance bar rides the command archetype by default; the design
   *  omits it on some command surfaces (Admin index, Users) — set false
   *  to opt out without changing the archetype. */
  readonly kamae?: boolean;
}

// Keyed by pathname; longest-prefix match wins for nested routes.
export const ROUTE_CONFIG: Readonly<Record<string, RouteConfig>> = {
  "/": {
    active: "dashboard",
    archetype: "command",
    crumbs: ["Dashboard"],
    jp: "先生",
  },
  "/admin": {
    active: "admin",
    archetype: "command",
    crumbs: ["Admin"],
    jp: "管理",
    kamae: false,
  },
  "/admin/account": {
    active: "admin",
    archetype: "workbench",
    crumbs: ["Admin", "Account"],
    jp: "自分",
  },
  "/admin/api-keys": {
    active: "admin",
    archetype: "workbench",
    crumbs: ["Admin", "API keys"],
    jp: "鍵",
  },
  "/admin/kokugikan": {
    active: "admin",
    archetype: "arena",
    crumbs: ["Admin", "Stadium"],
    jp: "国技館",
  },
  "/admin/plugins": {
    active: "admin",
    archetype: "workbench",
    crumbs: ["Admin", "Plugins"],
    jp: "拡張",
  },
  "/admin/settings": {
    active: "admin",
    archetype: "workbench",
    crumbs: ["Admin", "Settings"],
    jp: "設定",
  },
  "/admin/tatami": {
    active: "tatami",
    archetype: "codex",
    crumbs: ["Admin", "Evidence"],
    jp: "畳",
  },
  // YR.4.4 — admin /admin/arena v2.1 module page (Red-tint). Arena
  // archetype matches the existing /admin/eval surface so the bracket /
  // VsBar / leaderboard primitives compose against the right pattern
  // chrome. Crumbs prefix `Admin` to match the rest of the admin surface;
  // glyph reuses the Kumite kanji per TAB_CONFIG['arena'].
  "/admin/arena": {
    active: "arena",
    archetype: "arena",
    crumbs: ["Admin", "Arena · Battle"],
    jp: "組手",
  },
  "/admin/atemi": {
    active: "atemi",
    archetype: "workbench",
    crumbs: ["Admin", "Atemi · Probe"],
    jp: "当身",
  },
  // YR.4.2 — admin /admin/buki v2.1 module page (Red-tint). Workbench
  // archetype hosts the payload-armory grid (MCard tiles + AttackRow
  // payload list). Glyph 武器 (buki) per TAB_CONFIG['buki'].
  "/admin/buki": {
    active: "buki",
    archetype: "workbench",
    crumbs: ["Admin", "Buki · Payloads"],
    jp: "武器",
  },
  "/admin/bushido": {
    active: "bushido",
    archetype: "command",
    crumbs: ["Admin", "Bushido · Compliance"],
    jp: "武士道",
  },
  "/admin/bushido/run": {
    active: "bushido",
    archetype: "workbench",
    crumbs: ["Admin", "Bushido", "Run"],
    jp: "武士道",
  },
  "/admin/eval": {
    active: "eval",
    archetype: "arena",
    crumbs: ["Admin", "Evaluations"],
    jp: null,
  },
  "/admin/eval/run": {
    active: "eval",
    archetype: "arena",
    crumbs: ["Admin", "Evaluations", "Eval run"],
    jp: null,
  },
  "/admin/flags": {
    active: "admin",
    archetype: "command",
    crumbs: ["Admin", "Hattori · Flags"],
    jp: "服部",
  },
  // YR.4.6 — admin /admin/hattori v2.1 module page (Steel-tint). Command
  // archetype matches the existing /admin/flags surface so the GuardModes
  // accordion + ServiceCoverageGrid + GoldenDiff primitives compose
  // against the right pattern chrome. Crumbs prefix `Admin` to match the
  // rest of the admin surface; glyph 服部 (hattori) per TAB_CONFIG['hattori'].
  "/admin/hattori": {
    active: "hattori",
    archetype: "command",
    crumbs: ["Admin", "Hattori · Guard"],
    jp: "服部",
  },
  // YR.4.7 — admin /admin/kotoba v2.1 module page (Steel-tint). Workbench
  // archetype hosts the rubric workbench (TokenizedPrompt + ScoreCard +
  // DiffBlock + VersionList). Glyph 言葉 (kotoba) per TAB_CONFIG['kotoba'].
  "/admin/kotoba": {
    active: "kotoba",
    archetype: "workbench",
    crumbs: ["Admin", "Kotoba · Hardening"],
    jp: "言葉",
  },
  // YR.4.3 — admin /admin/jutsu v2.1 module page (Red-tint). Workbench
  // archetype hosts the model-lab swap grid (AttackRow per model +
  // SwapCandidate + DiffBlock). Glyph 術 (jutsu) per TAB_CONFIG['jutsu'].
  "/admin/jutsu": {
    active: "jutsu",
    archetype: "workbench",
    crumbs: ["Admin", "Jutsu · Model Lab"],
    jp: "術",
  },
  // Leaks is intentionally off-nav in the v2 registry. Keep the operator
  // oriented by selecting the visible Admin directory row.
  "/admin/leaks": {
    active: "admin",
    archetype: "codex",
    crumbs: ["Admin", "Mitsuke · Leaks"],
    jp: "見",
  },
  // YR.4.8 — admin /admin/mitsuke v2.1 module page (Gold-tint). Codex
  // archetype matches the threat-feed reference catalogue (Ticker +
  // AttackRow + RegressionLog + KV indicator drill-down). Glyph 見つけ
  // (mitsuke — find / discover) per TAB_CONFIG['mitsuke'].
  "/admin/mitsuke": {
    active: "mitsuke",
    archetype: "codex",
    crumbs: ["Admin", "Mitsuke · Threat Feed"],
    jp: "見つけ",
  },
  // YR.4.9 — admin /admin/amaterasu v2.1 module page (Gold-tint). Codex
  // archetype matches the lineage / attack-DNA reference catalogue
  // (DnaGraph + KV + DiffBlock). Glyph 天照 (amaterasu) per
  // TAB_CONFIG['amaterasu'].
  "/admin/amaterasu": {
    active: "amaterasu",
    archetype: "codex",
    crumbs: ["Admin", "Amaterasu · Attack DNA"],
    jp: "天照",
  },
  // YR.4.10 — admin /admin/kagami v2.1 module page (Gold-tint). Workbench
  // archetype matches the per-pair drift workbench (DriftLane +
  // GoldenSuiteCard + RegressionLog + KV). Glyph 鏡 (kagami) per
  // TAB_CONFIG['kagami'].
  "/admin/kagami": {
    active: "kagami",
    archetype: "workbench",
    crumbs: ["Admin", "Kagami · Mirror Test"],
    jp: "鏡",
  },
  // YR.4.11 — admin /admin/ronin v2.1 module page (Gold-tint). Workbench
  // archetype matches the bounty submission queue + leaderboard (AttackRow
  // + HunterLeader + BountyList). Glyph 浪人 (ronin) per
  // TAB_CONFIG['ronin'].
  "/admin/ronin": {
    active: "ronin",
    archetype: "workbench",
    crumbs: ["Admin", "Ronin · Bounty Hub"],
    jp: "浪人",
  },
  "/admin/members/invites": {
    // Epic 4B.6 — admin-only invite issuance surface. Workbench
    // archetype keeps the Command-only Kamae panel off (same choice
    // as `/members` + the onigaeshi ritual) and renders the page with
    // the generic admin workbench visual vocabulary. Crumbs keep the
    // `Admin` prefix to match every other admin surface; `jp` is `招待`
    // (shōtai — invitation) so the TopBar glyph matches the page
    // purpose at a glance.
    //
    // E3.S6c (F-3-017) — `active` was previously `'members'`, but the
    // `'members'` rail item only exists in MEMBER_RAIL (the member-
    // shell variant rendered under `(shell)/members/layout.tsx`).
    // `/admin/members/invites` lives under `(shell)/admin/layout.tsx`
    // (admin shell + telemetry-consent gate) and is RBAC-gated to
    // `requiredRole: 'admin'` by `middleware/rbac.ts` matching the
    // `/admin` prefix first. The route was therefore admin-tooling
    // rendered under admin chrome, but its rail-id pointed at a
    // MEMBER_RAIL item that the admin shell never renders — so the
    // active row never lit up. Re-anchoring to `'admin'` (the
    // canonical admin-directory row in the Operations group)
    // matches the admin-tooling posture of every other invite-
    // adjacent admin surface (`/admin/users`, `/admin/api-keys`).
    active: "admin",
    archetype: "workbench",
    // P5 prod-parity: the design crumb is "Admin / Member invites" (wave-g
    // ref) — a flat two-level trail, not "Admin / Members / Invites" (the
    // deep-path builder appended naming.plain then slice(2)="Invites",
    // producing a redundant trailing crumb).
    crumbs: ["Admin", "Member invites"],
    jp: "招待",
  },
  "/admin/onigaeshi": {
    active: "admin",
    archetype: "ritual",
    crumbs: ["Admin", "Onigaeshi · Unaligned"],
    jp: "鬼返し",
  },
  // YR.4.1 — admin /admin/scanner v2.1 module page (Red-tint). Workbench
  // archetype hosts the haiku-scanner panel grid (PostureTile + MCard
  // tiles + AttackRow finding rows + Ribbon distribution). Glyph 走査
  // (sōsa — scan/sweep) chosen over 俳句 (haiku) so the kanji watermark
  // reflects the action (scanning) rather than the codename. Active id
  // 'scanner' matches TAB_CONFIG['scanner'].
  "/admin/scanner": {
    active: "scanner",
    archetype: "workbench",
    crumbs: ["Admin", "Scanner · Haiku"],
    jp: "走査",
  },
  // YR.4.5 — admin /admin/sengoku v2.1 module page (Red-tint). Workbench
  // archetype hosts the campaign scheduler (CpnRow per campaign +
  // SchedulerList queue + FeedRow activity). Glyph 戦国 (sengoku — warring
  // states) per TAB_CONFIG['sengoku'].
  "/admin/sengoku": {
    active: "sengoku",
    archetype: "workbench",
    crumbs: ["Admin", "Sengoku · Campaigns"],
    jp: "戦国",
  },
  // W22 visual sweep — register Shingan supply-chain trust scan workbench.
  // Workbench archetype matches Scanner / Hattori / Kagami siblings so the
  // Command-only Kamae panel stays off. Glyph 心眼 (shingan — mind's eye)
  // per the existing CommandHero header on the page.
  // Shingan is intentionally off-nav in the v2 registry, so its active state
  // resolves to the visible Admin directory row.
  "/admin/shingan": {
    active: "admin",
    archetype: "workbench",
    crumbs: ["Admin", "Shingan · Supply chain"],
    jp: "心眼",
  },
  // W22 visual sweep — register AgenticLab scenario-execution surface
  // (TICKET-L-701-IMPLEMENT). Workbench archetype hosts the ScenarioRunner
  // form (architecture × categories × difficulty × objective). Glyph
  // エージェント matches the page header.
  "/admin/agentic": {
    active: "admin",
    archetype: "workbench",
    crumbs: ["Admin", "Agentic testing · Scenarios"],
    jp: "エージェント",
  },
  // W22 visual sweep — register System Health diagnostics page
  // (YR.17 / G-006). Workbench archetype matches the operator-tool
  // posture; service-indicator panels render inside the standard chrome.
  //
  // System health owns a dedicated Operations rail row in v2.
  // HAGANE E4.S4 — crumb coverage for the Operations surfaces (audit
  // M4 tail: users/exports fell through to the generic '/admin' crumb)
  // + a fixtures-detail crumb so /admin/buki/fixtures/[id] reads as a
  // drill-down instead of inheriting the bare Buki crumb.
  "/admin/users": {
    active: "users",
    archetype: "command",
    crumbs: ["Admin", "Users"],
    jp: "会員",
    kamae: false,
  },
  "/admin/exports": {
    active: "admin",
    archetype: "codex",
    crumbs: ["Admin", "Data Exports"],
    jp: "輸出",
  },
  "/admin/buki/fixtures": {
    active: "buki",
    archetype: "codex",
    crumbs: ["Admin", "Buki · Payloads", "Fixture"],
    jp: "武器",
  },
  "/admin/system-health": {
    active: "system-health",
    archetype: "workbench",
    crumbs: ["Admin", "System health"],
    jp: "健",
  },
  // W22 visual sweep — register the G-003 validation runner dashboard.
  // Workbench archetype keeps the test-runner controls under the
  // standard admin chrome.
  //
  // Validation owns a dedicated Operations rail row in v2.
  "/admin/validation": {
    active: "validation",
    archetype: "workbench",
    crumbs: ["Admin", "Validation"],
    jp: "校",
  },
  // EE Projects — engagement records for full-report generation; same
  // workbench chrome as validation (Operations rail row).
  "/admin/projects": {
    active: "projects",
    archetype: "workbench",
    crumbs: ["Admin", "Projects"],
    jp: "案",
  },
  // E3.S6c (F-3-019) — register `/console` Workbench so the Rail
  // active-id resolves to the new `'console'` row instead of falling
  // through to DEFAULT (which lit up `'dashboard'` in the previous
  // shipping surface). Workbench archetype matches ADR-0096 §"Why
  // Workbench" — the 5-widget grid is the builder companion to the
  // `/` Command surface. Crumbs keep a single `Workbench` token (no
  // `Admin` prefix; the route is for any authenticated user per ADR-
  // 0096 §Justification, not admin-gated). Glyph `工房` (kōbō —
  // workshop / atelier) matches the `'Workbench'` label and reads as
  // the worker / builder complement to `先生` (Sensei) on `/`.
  "/console": {
    active: "console",
    archetype: "workbench",
    crumbs: ["Workbench"],
    jp: "工房",
  },
  // Epic 4B.1 — member-facing surface. Workbench archetype keeps the
  // Command-only Kamae panel off. Crumbs + glyph stay consistent with
  // the rest of the shell so the members placeholder matches the dojo
  // aesthetic even when MEMBERS_UI_ENABLED is false.
  "/members": {
    active: "members",
    archetype: "workbench",
    crumbs: ["Members", "Home"],
    jp: "会員",
  },
  // Epic 4B.2 — anonymized leaderboard for the active season. Arena
  // archetype (Kumite · 組手) keeps the Command-only Kamae panel off
  // and renders the surface with the ranked-list visual vocabulary.
  "/members/leaderboard": {
    active: "leaderboard",
    archetype: "arena",
    crumbs: ["Members", "Leaderboard"],
    jp: "組手",
  },
  // Epic 4B.3 — anonymized technique × model bypass-rate heatmap
  // drill-down. V2 gives the matrix a dedicated member rail row.
  "/members/leaderboard/bypass-matrix": {
    active: "bypass-matrix",
    archetype: "arena",
    crumbs: ["Members", "Leaderboard", "Bypass matrix"],
    jp: "組手",
  },
  // Epic 4B.4 — seasons registry + archived-season viewer. Codex
  // archetype matches the catalog/archival feel of the surface
  // (read-only snapshots vs. live arena cells). The two entries sit
  // alphabetically — `/members/seasons` before
  // `/members/seasons/archive/:slug` — so `resolveRouteConfig`'s
  // longest-prefix match picks the archive-specific config for
  // `/members/seasons/archive/2025-Q4` URLs.
  "/members/seasons": {
    active: "seasons",
    archetype: "codex",
    crumbs: ["Members", "Seasons"],
    jp: "季節",
  },
  "/members/seasons/archive": {
    active: "seasons",
    archetype: "codex",
    crumbs: ["Members", "Seasons", "Archive"],
    jp: "季節",
  },
  // Epic 4B.5 — member bounty surface (belt ledger + tier
  // distribution). Codex archetype matches the ledger-catalog feel;
  // the same read-only archival vocabulary the archive viewer uses.
  "/members/bounty": {
    active: "bounty",
    archetype: "codex",
    crumbs: ["Members", "Bounty"],
    jp: "褒美",
  },
  "/members/sign-in": {
    active: "members",
    archetype: "workbench",
    crumbs: ["Members", "Sign in"],
    jp: "会員",
  },
  // Epic 4B.7 — unauthenticated public-beta invite-request surface.
  // Workbench archetype matches `/admin/members/invites` prior art
  // (form-centric). No dedicated rail entry (the form is an
  // unauthenticated sibling of `/members/sign-in` reached from the
  // sign-in CTA; the rail only renders for signed-in members).
  // Crumbs keep the `Members` prefix so the TopBar reads as a
  // hunter-adjacent page even when no session exists. `jp` 申請
  // (shinsei — request / application).
  "/members/request-invite": {
    active: "members",
    archetype: "workbench",
    crumbs: ["Members", "Request invite"],
    jp: "申請",
  },
  // E6.S5 — authenticated DSR self-service (export + delete) surface.
  // Workbench archetype matches the form-centric posture (two action
  // cards, no live data feed). No dedicated rail entry — /account is
  // reached from the TopBar avatar / settings menu, not the module
  // rail. Crumbs prefix `Members` because /account is shared between
  // members and admins (any session-user with a real userId can file
  // a DSR for themselves; the synthetic API_KEY_USER_ID is rejected
  // server-side per /api/dsr T8.1/T8.2 lesson). `jp` 私 (watashi —
  // self / first person) makes the surface read as the caller's own
  // pane.
  "/account": {
    active: "admin",
    archetype: "workbench",
    crumbs: ["Account"],
    jp: "私",
  },
};

// Fallback for unregistered paths. Archetype is `workbench` so the Kamae panel
// (§5 Command-only guardrail) does NOT render on a route whose config was
// forgotten — surfacing the omission visually rather than silently opting a
// new page into Command chrome.
const DEFAULT: RouteConfig = {
  active: "dashboard",
  archetype: "workbench",
  crumbs: [],
  jp: null,
};

// Returns the config for the longest matching prefix, or DEFAULT if none match.
//
// YR.5 retired the legacy `?tab=<id>` lookup path: every Rail click now
// targets a top-level pathname, so ShellChrome reads its config from the
// pathname alone. The previous `TAB_CONFIG` + `resolveTabConfig` exports
// were removed alongside the tab dispatcher.
export function resolveRouteConfig(pathname: string): RouteConfig {
  const normalized =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;
  if (ROUTE_CONFIG[normalized]) return ROUTE_CONFIG[normalized];
  const keys = Object.keys(ROUTE_CONFIG)
    .filter((k) => k !== "/" && normalized.startsWith(k + "/"))
    .sort((a, b) => b.length - a.length);
  if (keys.length > 0) return ROUTE_CONFIG[keys[0]];
  return DEFAULT;
}
