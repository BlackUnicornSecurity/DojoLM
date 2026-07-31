// SPDX-License-Identifier: Apache-2.0
/**
 * Command palette index — TICKET-X-601 / DP-008 closeout.
 *
 * Closed-enum tuple of palette command ids with closed-record maps for
 * label, hint, and action. R-T1 §10.16 discipline: no inline literals
 * at the render site. Each command has a fully resolved `action`
 * (navigate-via-NavId or window-event dispatch) so the controller can
 * route deterministically without string-matching ids.
 *
 * Scope: V2.1 first-class navigation routes — the items already
 * surfaced in the rail nav (`NAV_ITEMS` w/o `hidden`) plus two
 * window-event affordances reachable from the chrome (`Sensei`,
 * `Workbench`). HAGANE E4.S1 extends to the full (shell) route set
 * (35 entries, at the ≤35 Hick's-Law cap — the next addition forces a
 * grouping/scoping decision) — the palette-coverage test pins
 * route↔palette completeness; extending the catalogue
 * is intentionally a code change, not a runtime mutation.
 *
 * E3.S7 (2026-05-11): each command now carries a `category` tag so the
 * palette can render grouped results (F-2-209 P2: Hick's Law / Miller's
 * 7±2 chunking). Categories are a closed enum (Models / Pages / Recent /
 * Help). The default catalogue uses `Pages` for nav targets, `Models` for
 * runtime/model affordances, and `Help` for assistant/console openers.
 * "Recent" is reserved for a future history-driven slot.
 *
 * Zero new deps. Pure data + frozen objects.
 */

import type { NavId } from "../constants";

export const PALETTE_CATEGORY_IDS = [
  "models",
  "pages",
  "recent",
  "help",
] as const satisfies readonly string[];

export type PaletteCategoryId = (typeof PALETTE_CATEGORY_IDS)[number];

/**
 * Display labels for the 4 palette categories. Frozen so render sites
 * cannot mutate the section headers at runtime. Mirrors the closed-map
 * pattern used by COMMAND_LABEL / COMMAND_HINT below.
 */
export const PALETTE_CATEGORY_LABEL: Readonly<
  Record<PaletteCategoryId, string>
> = Object.freeze({
  models: "Models",
  pages: "Pages",
  recent: "Recent",
  help: "Help",
});

export const PALETTE_COMMAND_IDS = [
  "go-dashboard",
  "go-scanner",
  "go-buki",
  "go-jutsu",
  "go-jutsu-batch",
  "go-jutsu-obl",
  "go-arena",
  "go-adversarial",
  "go-sengoku",
  "go-ronin-hub",
  "go-guard",
  "go-kotoba",
  "go-mitsuke",
  "go-dna",
  "go-kagami",
  "go-compliance",
  "go-admin",
  "go-eval",
  "go-validation",
  "go-projects",
  "go-budget",
  "go-tatami",
  "go-system-health",
  "go-users",
  "go-exports",
  "go-plugins",
  "go-settings",
  "go-leaks",
  "go-onigaeshi",
  "go-shingan",
  "go-kokugikan",
  "go-agentic",
  "go-account",
  "go-flags",
  "go-member-invites",
  "open-sensei",
  "open-glossary",
  "open-workbench",
] as const satisfies readonly string[];

export type PaletteCommandId = (typeof PALETTE_COMMAND_IDS)[number];

export type PaletteAction =
  | { readonly type: "navigate"; readonly navId: NavId }
  | {
      readonly type: "event";
      readonly event: "sensei-toggle" | "glossary-toggle";
    }
  | { readonly type: "href"; readonly href: string };

export interface PaletteCommand {
  readonly id: PaletteCommandId;
  readonly label: string;
  readonly hint?: string;
  readonly action: PaletteAction;
  /**
   * E3.S7 — grouping bucket. Defaults to `'pages'` for the v1 catalogue
   * (every command is a nav target) but explicit so render sites can
   * partition without inferring from id prefixes. Sensei / Workbench
   * openers tag `'help'`; future model-switcher entries will tag
   * `'models'`. The `'recent'` bucket is reserved for a future
   * localStorage-driven history slot.
   */
  readonly category: PaletteCategoryId;
}

export const COMMAND_LABEL: Readonly<Record<PaletteCommandId, string>> =
  Object.freeze({
    "go-dashboard": "Go to Dashboard",
    "go-scanner": "Go to Scanner",
    "go-buki": "Go to Buki (Payloads & Fixtures)",
    "go-jutsu": "Go to Jutsu (Model Lab)",
    "go-jutsu-batch": "Go to Batch test (Jutsu)",
    "go-jutsu-obl": "Go to OBL analysis (Jutsu)",
    "go-arena": "Go to Arena (Battle Sandbox)",
    "go-adversarial": "Go to Live practice (Adversarial)",
    "go-sengoku": "Go to Sengoku (Campaigns)",
    "go-ronin-hub": "Go to Ronin Hub (Bounty)",
    "go-guard": "Go to Hattori Guard",
    "go-kotoba": "Go to Kotoba (Prompt Hardening)",
    "go-mitsuke": "Go to Mitsuke (Threat Feed)",
    "go-dna": "Go to Amaterasu DNA",
    "go-kagami": "Go to Kagami (Mirror Test)",
    "go-compliance": "Go to Bushido Book (Compliance)",
    "go-admin": "Go to Admin",
    "go-eval": "Go to Evaluations (Bypass Matrix)",
    "go-validation": "Go to Validation",
    "go-projects": "Go to Projects (Engagements)",
    "go-budget": "Go to Spend Budgets",
    "go-tatami": "Go to Tatami (Evidence)",
    "go-system-health": "Go to System Health",
    "go-users": "Go to Users",
    "go-exports": "Go to Data Exports",
    "go-plugins": "Go to Plugins",
    "go-settings": "Go to Admin Settings",
    "go-leaks": "Go to Leaks Archive",
    "go-onigaeshi": "Go to Onigaeshi (Unaligned)",
    "go-shingan": "Go to Shingan",
    "go-kokugikan": "Go to Kokugikan",
    "go-agentic": "Go to Agentic Lab",
    "go-account": "Go to Account",
    "go-flags": "Go to Feature Flags (Hattori)",
    "go-member-invites": "Go to Member Invites",
    "open-sensei": "Open Sensei assistant",
    "open-glossary": "Open module glossary",
    "open-workbench": "Open Workbench",
  });

export const COMMAND_HINT: Readonly<Record<PaletteCommandId, string>> =
  Object.freeze({
    "go-dashboard": "Overview",
    "go-scanner": "Live PI detection",
    "go-buki": "Fixtures + fuzzer",
    "go-jutsu": "Model config",
    "go-jutsu-batch": "Batch test runner",
    "go-jutsu-obl": "Obliteratus behavioural analysis",
    "go-arena": "Multi-agent sandbox",
    "go-adversarial": "Adversarial MCP",
    "go-sengoku": "Continuous red team",
    "go-ronin-hub": "Bug bounty",
    "go-guard": "Hattori controls",
    "go-kotoba": "Prompt scoring",
    "go-mitsuke": "Threat intel",
    "go-dna": "Attack lineage",
    "go-kagami": "Model fingerprinting",
    "go-compliance": "Audit + evidence",
    "go-admin": "Settings",
    "go-eval": "Leaderboard + races",
    "go-validation": "ISO tool validation",
    "go-projects": "Client engagements + full reports",
    "go-budget": "LLM spend caps",
    "go-tatami": "Proofs + cases + receipts",
    "go-system-health": "Service status",
    "go-users": "Accounts + roles",
    "go-exports": "Downloads",
    "go-plugins": "Integrations",
    "go-settings": "Platform config",
    "go-leaks": "CL4R1T4S intel",
    "go-onigaeshi": "Engagement sign-off",
    "go-shingan": "Insight scans",
    "go-kokugikan": "Leaderboard arena",
    "go-agentic": "Autonomous scenarios",
    "go-account": "Profile + session",
    "go-flags": "Flags + kill-switch",
    "go-member-invites": "Invite issuance",
    "open-sensei": "Assistant drawer",
    "open-glossary": "What each codename does",
    "open-workbench": "/console",
  });

export const COMMAND_CATEGORY: Readonly<
  Record<PaletteCommandId, PaletteCategoryId>
> = Object.freeze({
  "go-dashboard": "pages",
  "go-scanner": "pages",
  "go-buki": "pages",
  "go-jutsu": "pages",
  "go-jutsu-batch": "pages",
  "go-jutsu-obl": "pages",
  "go-arena": "pages",
  "go-adversarial": "pages",
  "go-sengoku": "pages",
  "go-ronin-hub": "pages",
  "go-guard": "pages",
  "go-kotoba": "pages",
  "go-mitsuke": "pages",
  "go-dna": "pages",
  "go-kagami": "pages",
  "go-compliance": "pages",
  "go-admin": "pages",
  "go-eval": "pages",
  "go-validation": "pages",
  "go-projects": "pages",
  "go-budget": "pages",
  "go-tatami": "pages",
  "go-system-health": "pages",
  "go-users": "pages",
  "go-exports": "pages",
  "go-plugins": "pages",
  "go-settings": "pages",
  "go-leaks": "pages",
  "go-onigaeshi": "pages",
  "go-shingan": "pages",
  "go-kokugikan": "pages",
  "go-agentic": "pages",
  "go-account": "pages",
  "go-flags": "pages",
  "go-member-invites": "pages",
  "open-sensei": "help",
  "open-glossary": "help",
  "open-workbench": "help",
});

export const COMMAND_ACTION: Readonly<Record<PaletteCommandId, PaletteAction>> =
  Object.freeze({
    "go-dashboard": Object.freeze({ type: "navigate", navId: "dashboard" }),
    "go-scanner": Object.freeze({ type: "navigate", navId: "scanner" }),
    "go-buki": Object.freeze({ type: "navigate", navId: "buki" }),
    "go-jutsu": Object.freeze({ type: "navigate", navId: "jutsu" }),
    // Batch + OBL live as tabs inside Jutsu (no per-tab deep-link yet), so
    // these land on Jutsu; the label/hint make "Batch"/"OBL" searchable —
    // closes CONT-R2-008's "No matches for Batch/OBL" palette gap.
    "go-jutsu-batch": Object.freeze({ type: "navigate", navId: "jutsu" }),
    "go-jutsu-obl": Object.freeze({ type: "navigate", navId: "jutsu" }),
    "go-arena": Object.freeze({ type: "navigate", navId: "arena" }),
    "go-adversarial": Object.freeze({ type: "navigate", navId: "adversarial" }),
    "go-sengoku": Object.freeze({ type: "navigate", navId: "sengoku" }),
    "go-ronin-hub": Object.freeze({ type: "navigate", navId: "ronin-hub" }),
    "go-guard": Object.freeze({ type: "navigate", navId: "guard" }),
    "go-kotoba": Object.freeze({ type: "navigate", navId: "kotoba" }),
    "go-mitsuke": Object.freeze({ type: "navigate", navId: "mitsuke" }),
    "go-dna": Object.freeze({ type: "navigate", navId: "dna" }),
    "go-kagami": Object.freeze({ type: "navigate", navId: "kagami" }),
    "go-compliance": Object.freeze({ type: "navigate", navId: "compliance" }),
    // HAGANE E4.S1 — 'Go to Admin' now lands on the /admin hub (the
    // navigate-'admin' navId routes to /admin/flags — that's go-flags).
    "go-admin": Object.freeze({ type: "href", href: "/admin" }),
    "go-eval": Object.freeze({ type: "href", href: "/admin/eval" }),
    "go-validation": Object.freeze({ type: "href", href: "/admin/validation" }),
    "go-projects": Object.freeze({ type: "href", href: "/admin/projects" }),
    "go-budget": Object.freeze({ type: "href", href: "/admin/budget" }),
    "go-tatami": Object.freeze({ type: "href", href: "/admin/tatami" }),
    "go-system-health": Object.freeze({
      type: "href",
      href: "/admin/system-health",
    }),
    "go-users": Object.freeze({ type: "href", href: "/admin/users" }),
    "go-exports": Object.freeze({ type: "href", href: "/admin/exports" }),
    "go-plugins": Object.freeze({ type: "href", href: "/admin/plugins" }),
    "go-settings": Object.freeze({ type: "href", href: "/admin/settings" }),
    "go-leaks": Object.freeze({ type: "href", href: "/admin/leaks" }),
    "go-onigaeshi": Object.freeze({ type: "href", href: "/admin/onigaeshi" }),
    "go-shingan": Object.freeze({ type: "href", href: "/admin/shingan" }),
    "go-kokugikan": Object.freeze({ type: "href", href: "/admin/kokugikan" }),
    "go-agentic": Object.freeze({ type: "href", href: "/admin/agentic" }),
    "go-account": Object.freeze({ type: "href", href: "/account" }),
    "go-flags": Object.freeze({ type: "navigate", navId: "admin" }),
    "go-member-invites": Object.freeze({
      type: "href",
      href: "/admin/members/invites",
    }),
    "open-sensei": Object.freeze({ type: "event", event: "sensei-toggle" }),
    "open-glossary": Object.freeze({ type: "event", event: "glossary-toggle" }),
    "open-workbench": Object.freeze({ type: "href", href: "/console" }),
  });

export const PALETTE_COMMANDS: readonly PaletteCommand[] = Object.freeze(
  PALETTE_COMMAND_IDS.map((id) =>
    Object.freeze({
      id,
      label: COMMAND_LABEL[id],
      hint: COMMAND_HINT[id],
      action: COMMAND_ACTION[id],
      category: COMMAND_CATEGORY[id],
    } satisfies PaletteCommand),
  ),
);

export function filterCommands(
  commands: readonly PaletteCommand[],
  query: string,
): readonly PaletteCommand[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed === "") return commands;
  // HAGANE E4.S1 — match the hint too (operator keywords like
  // "validation" / "exports" live there for the long-tail routes).
  return commands.filter(
    (c) =>
      c.label.toLowerCase().includes(trimmed) ||
      (c.hint !== undefined && c.hint.toLowerCase().includes(trimmed)),
  );
}

/**
 * E3.S7 (F-2-209) — partition a command list into ordered category
 * buckets. Empty buckets are dropped so the palette only renders the
 * sections that have at least one match. The returned array preserves
 * the canonical category order (`PALETTE_CATEGORY_IDS`) so the visible
 * section sequence does not jitter as the filter narrows.
 */
export interface PaletteCommandGroup {
  readonly category: PaletteCategoryId;
  readonly label: string;
  readonly commands: readonly PaletteCommand[];
}

export function groupCommands(
  commands: readonly PaletteCommand[],
): readonly PaletteCommandGroup[] {
  const buckets = new Map<PaletteCategoryId, PaletteCommand[]>();
  for (const category of PALETTE_CATEGORY_IDS) {
    buckets.set(category, []);
  }
  for (const cmd of commands) {
    buckets.get(cmd.category)?.push(cmd);
  }
  const groups: PaletteCommandGroup[] = [];
  for (const category of PALETTE_CATEGORY_IDS) {
    const bucket = buckets.get(category) ?? [];
    if (bucket.length === 0) continue;
    groups.push(
      Object.freeze({
        category,
        label: PALETTE_CATEGORY_LABEL[category],
        commands: Object.freeze(bucket.slice()),
      }),
    );
  }
  return Object.freeze(groups);
}

/**
 * HAGANE E4.S1 — routes DELIBERATELY absent from the palette. The
 * coverage test (palette-coverage.test.ts) fails when a (shell) route
 * is neither reachable through a palette command nor listed here — a
 * new route cannot silently orphan again (audit M4).
 */
export const PALETTE_EXEMPT_ROUTES: readonly string[] = Object.freeze([
  // High-security tool — deliberately non-discoverable (audit note).
  "/admin/api-keys",
  // Member-facing surfaces: the MEMBER_RAIL owns their discovery; the
  // palette is admin chrome.
  "/members",
  "/members/bounty",
  "/members/leaderboard",
  "/members/leaderboard/bypass-matrix",
  "/members/request-invite",
  "/members/seasons",
  "/members/seasons/archive/[slug]",
  "/members/sign-in",
  // Sub-routes reachable from their parent surfaces.
  "/admin/buki/fixtures/[id]",
  "/admin/bushido/run",
  "/admin/eval/run",
  // Admin alias composes the same account surface reached by go-account.
  "/admin/account",
  // Privacy is a sub-page of /account, reachable from the account surface
  // (go-account).
  "/account/privacy",
  // Workbench is covered by the open-workbench event command.
  "/console",
]);
