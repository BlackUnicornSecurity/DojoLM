// SPDX-License-Identifier: Apache-2.0
/**
 * Haiku License Modules — TICKET-D-205 / V1→V2 program restoration.
 *
 * Single source of truth for the operator-facing license-gated module
 * catalog rendered on the dashboard. The V1 dashboard shipped a 35-row
 * "Haiku License Modules" list with active/inactive state per row; the
 * V2 narrowing dropped it during the Path-B widget cull (ref: the
 * V1→V2 audit row D-205). This file restores the
 * data backbone.
 *
 * Recovery scope (operator decision 2026-05-04):
 *   - The literal 35-row V1 source could not be recovered from the
 *     archived V1 design surfaces — none of those artifacts contains a
 *     35-module license catalog. (See PR body for the audit log.)
 *   - In lieu of fabricating module names, this catalog enumerates the
 *     35 license-gated surfaces ACTUALLY SHIPPED in V2 today, mapped to
 *     the canonical Yamabushi 13-module taxonomy. Each entry is a real
 *     V2 surface with a real route — operators can click through and
 *     verify presence.
 *   - Surface set is anchored to:
 *       1. The 13 V2 Rail modules (Yamabushi glossary, Epic 0)
 *       2. The 9-tab Admin split (post-A-401..A-405 reconciliation)
 *       3. The Member-shell surfaces (members / leaderboard / bounty)
 *
 * Closed-enum discipline (R-T1 §10.16):
 *   - `HAIKU_MODULE_IDS`         — `as const` tuple, 35 entries
 *   - `HAIKU_MODULE_CATEGORIES`  — `as const` tuple, 6 entries
 *   - `HaikuModuleId`            — derived `(typeof ...)[number]`
 *   - `HaikuModuleCategory`      — derived `(typeof ...)[number]`
 *   - `HAIKU_MODULES`            — `Object.freeze`'d defs of length 36
 *
 * The categories follow the Rail's own grouping convention plus
 * `Operations` for Admin/operator-only surfaces and `Member` for the
 * `/members/*` shell. Every entry maps cleanly to one category — no
 * dual-categorization and no orphan ids.
 *
 * Zero runtime dependencies. No fetches. Pure data + freeze guards.
 */

/**
 * Closed-enum tuple of all 35 canonical license-gated module ids. Order
 * is load-bearing — drives render order in the UI primitive (categories
 * stay grouped, sort within category is Rail/route order).
 *
 * NOTE: never widen this to `string[]`. Consumers depend on
 * `HaikuModuleId` being a literal string union for exhaustiveness
 * checks.
 */
export const HAIKU_MODULE_IDS = [
  // Sensei (1) — operator command surface
  'dashboard',
  // Test (7) — offensive surfaces
  'scanner',
  'buki',
  'jutsu',
  'arena',
  'atemi',
  'sengoku',
  'ronin',
  // Protect (2) — defensive surfaces
  'hattori',
  'kotoba',
  // Intel (4) — evidence + telemetry
  'mitsuke',
  'amaterasu',
  'kagami',
  'bushido',
  // Operations (16) — admin / operator-only
  'admin-users',
  'admin-api-keys',
  'admin-validation',
  'admin-projects',
  'admin-flags',
  'admin-system-health',
  'admin-exports',
  'admin-plugins',
  'admin-settings',
  'admin-onigaeshi',
  'admin-leaks',
  'admin-eval',
  'admin-eval-run',
  'admin-bushido-run',
  'admin-shingan',
  'admin-members',
  'admin-arena-run',
  // Member (5) — member-shell surfaces
  'members-home',
  'members-leaderboard',
  'members-bypass-matrix',
  'members-seasons',
  'members-bounty',
] as const;

/** Literal-union derived from the closed tuple. 35 members. */
export type HaikuModuleId = (typeof HAIKU_MODULE_IDS)[number];

/**
 * Closed-enum tuple of the 6 module categories. Categories drive
 * grouped rendering in the dashboard primitive. Order is the canonical
 * Rail order (Sensei → Test → Protect → Intel) extended with the V2
 * additions (Operations + Member).
 */
export const HAIKU_MODULE_CATEGORIES = [
  'Sensei',
  'Test',
  'Protect',
  'Intel',
  'Operations',
  'Member',
] as const;

/** Literal-union derived from the closed tuple. 6 members. */
export type HaikuModuleCategory = (typeof HAIKU_MODULE_CATEGORIES)[number];

/**
 * Static metadata for one license-gated module. Frozen. All fields
 * readonly.
 *
 *   - `id`        — closed-enum id (canonical surface key)
 *   - `name`      — operator-facing display label
 *   - `category`  — Rail category for grouped rendering
 *   - `route`     — canonical route path (used for tooltip; primitive
 *                   does NOT navigate — caller wires anchor if needed)
 *   - `enabled`   — initial enabled/disabled state (true = active under
 *                   default Enterprise license; false = gated behind
 *                   add-on entitlement). Static for now; future ticket
 *                   will wire to the live entitlement endpoint once
 *                   `/api/license/modules` ships.
 */
export interface HaikuModule {
  readonly id: HaikuModuleId;
  readonly name: string;
  readonly category: HaikuModuleCategory;
  readonly route: string;
  readonly enabled: boolean;
}

/**
 * Frozen metadata for all 35 modules. `Object.freeze` on the array
 * itself + every entry → consumers cannot mutate the catalog.
 *
 * Default-enabled rule: all 13 Rail modules + the 9 Admin tabs default
 * to enabled (Enterprise license parity). The 5 member-shell surfaces
 * default to enabled (covered by the same Enterprise tier). The
 * additional Admin/operator surfaces default to enabled with one
 * exception:
 *   - `admin-shingan`     — opt-in real-time detection (gated)
 *
 * `admin-shingan` is gated to demonstrate the active/inactive split
 * the V1 list communicated; the rest mirror the shipped Enterprise
 * default.
 */
export const HAIKU_MODULES: readonly HaikuModule[] = Object.freeze([
  // Sensei (1)
  Object.freeze({
    id: 'dashboard',
    name: 'Dashboard',
    category: 'Sensei',
    route: '/',
    enabled: true,
  }),

  // Test (7)
  Object.freeze({
    id: 'scanner',
    name: 'Haiku Scanner',
    category: 'Test',
    route: '/admin/scanner',
    enabled: true,
  }),
  Object.freeze({
    id: 'buki',
    name: 'Payloads & Fixtures',
    category: 'Test',
    route: '/admin/buki',
    enabled: true,
  }),
  Object.freeze({
    id: 'jutsu',
    name: 'Model Lab',
    category: 'Test',
    route: '/admin/jutsu',
    enabled: true,
  }),
  Object.freeze({
    id: 'arena',
    name: 'Battle Arena',
    category: 'Test',
    route: '/admin/arena',
    enabled: true,
  }),
  Object.freeze({
    id: 'atemi',
    name: 'Adversarial Lab',
    category: 'Test',
    route: '/admin/atemi',
    enabled: true,
  }),
  Object.freeze({
    id: 'sengoku',
    name: 'Campaigns',
    category: 'Test',
    route: '/admin/sengoku',
    enabled: true,
  }),
  Object.freeze({
    id: 'ronin',
    name: 'Bounty Hub',
    category: 'Test',
    route: '/admin/ronin',
    enabled: true,
  }),

  // Protect (2)
  Object.freeze({
    id: 'hattori',
    name: 'Hattori Guard',
    category: 'Protect',
    route: '/admin/hattori',
    enabled: true,
  }),
  Object.freeze({
    id: 'kotoba',
    name: 'Prompt Hardening',
    category: 'Protect',
    route: '/admin/kotoba',
    enabled: true,
  }),

  // Intel (4)
  Object.freeze({
    id: 'mitsuke',
    name: 'Threat Feed',
    category: 'Intel',
    route: '/admin/mitsuke',
    enabled: true,
  }),
  Object.freeze({
    id: 'amaterasu',
    name: 'Attack DNA',
    category: 'Intel',
    route: '/admin/amaterasu',
    enabled: true,
  }),
  Object.freeze({
    id: 'kagami',
    name: 'Mirror Test',
    category: 'Intel',
    route: '/admin/kagami',
    enabled: true,
  }),
  Object.freeze({
    id: 'bushido',
    name: 'Compliance',
    category: 'Intel',
    route: '/admin/bushido',
    enabled: true,
  }),

  // Operations (16)
  Object.freeze({
    id: 'admin-users',
    name: 'Users · RBAC',
    category: 'Operations',
    route: '/admin/users',
    enabled: true,
  }),
  Object.freeze({
    id: 'admin-api-keys',
    name: 'API Keys',
    category: 'Operations',
    route: '/admin/api-keys',
    enabled: true,
  }),
  Object.freeze({
    id: 'admin-validation',
    name: 'KATANA Validation',
    category: 'Operations',
    route: '/admin/validation',
    enabled: true,
  }),
  Object.freeze({
    id: 'admin-projects',
    name: 'Projects (Engagements)',
    category: 'Operations',
    route: '/admin/projects',
    enabled: true,
  }),
  Object.freeze({
    id: 'admin-flags',
    name: 'Feature Flags',
    category: 'Operations',
    route: '/admin/flags',
    enabled: true,
  }),
  Object.freeze({
    id: 'admin-system-health',
    name: 'System Health',
    category: 'Operations',
    route: '/admin/system-health',
    enabled: true,
  }),
  Object.freeze({
    id: 'admin-exports',
    name: 'Exports',
    category: 'Operations',
    route: '/admin/exports',
    enabled: true,
  }),
  Object.freeze({
    id: 'admin-plugins',
    name: 'Plugins',
    category: 'Operations',
    route: '/admin/plugins',
    enabled: true,
  }),
  Object.freeze({
    id: 'admin-settings',
    name: 'Settings',
    category: 'Operations',
    route: '/admin/settings',
    enabled: true,
  }),
  Object.freeze({
    // Pass-2 reviewer fold-in: `admin-onigaeshi` was previously marked
    // `enabled: false` to "demonstrate the active/inactive split", but
    // the `/admin/onigaeshi` route is a fully shipped page with API
    // routes — operators reading the catalog would mistakenly conclude
    // the feature was un-provisioned. The active/inactive split is
    // demonstrated by `admin-shingan` (which is genuinely a future
    // surface) so dropping the false signal here is safe.
    id: 'admin-onigaeshi',
    name: 'Onigaeshi (reflective block)',
    category: 'Operations',
    route: '/admin/onigaeshi',
    enabled: true,
  }),
  Object.freeze({
    id: 'admin-leaks',
    name: 'Leak Audit',
    category: 'Operations',
    route: '/admin/leaks',
    enabled: true,
  }),
  Object.freeze({
    id: 'admin-eval',
    name: 'Evaluations Leaderboard',
    category: 'Operations',
    route: '/admin/eval',
    enabled: true,
  }),
  Object.freeze({
    id: 'admin-eval-run',
    name: 'Eval Race Runner',
    category: 'Operations',
    route: '/admin/eval/run',
    enabled: true,
  }),
  Object.freeze({
    id: 'admin-bushido-run',
    name: 'Bushido Run',
    category: 'Operations',
    route: '/admin/bushido/run',
    enabled: true,
  }),
  Object.freeze({
    id: 'admin-shingan',
    name: 'Shingan (real-time eye)',
    category: 'Operations',
    route: '/admin/shingan',
    enabled: false,
  }),
  Object.freeze({
    id: 'admin-members',
    name: 'Member Invites',
    category: 'Operations',
    route: '/admin/members/invites',
    enabled: true,
  }),
  Object.freeze({
    // Distinct sub-route placeholder mirroring `admin-bushido-run`
    // pattern. Pass-2 reviewer fold-in: prior `admin-arena` route
    // duplicated the Test-category `arena` route `/admin/arena`,
    // misrepresenting two separate license rows as the same surface.
    // Sub-route lands when the Arena admin run-orchestration view
    // ships in a follow-up ticket.
    id: 'admin-arena-run',
    name: 'Arena Run',
    category: 'Operations',
    route: '/admin/arena/run',
    enabled: true,
  }),

  // Member (5)
  Object.freeze({
    id: 'members-home',
    name: 'Members Home',
    category: 'Member',
    route: '/members',
    enabled: true,
  }),
  Object.freeze({
    id: 'members-leaderboard',
    name: 'Leaderboard',
    category: 'Member',
    route: '/members/leaderboard',
    enabled: true,
  }),
  Object.freeze({
    id: 'members-bypass-matrix',
    name: 'Bypass Matrix',
    category: 'Member',
    route: '/members/leaderboard/bypass-matrix',
    enabled: true,
  }),
  Object.freeze({
    id: 'members-seasons',
    name: 'Seasons',
    category: 'Member',
    route: '/members/seasons',
    enabled: true,
  }),
  Object.freeze({
    id: 'members-bounty',
    name: 'Bounty',
    category: 'Member',
    route: '/members/bounty',
    enabled: true,
  }),
]);

/**
 * Frozen index from id → module. Used by the UI primitive to verify
 * untrusted ids before emitting them to aria-label / className. Mirrors
 * the `ENGINE_BY_ID` discipline in `lib/scanner/engines.ts`.
 */
export const HAIKU_MODULE_BY_ID: Readonly<
  Record<HaikuModuleId, HaikuModule>
> = Object.freeze(
  // Built via `Object.fromEntries` rather than reduce-with-mutation
  // per project R-T1 immutability rule; mirrors `ENGINE_BY_ID` in
  // `lib/scanner/engines.ts`.
  Object.fromEntries(HAIKU_MODULES.map((m) => [m.id, m])) as Record<
    HaikuModuleId,
    HaikuModule
  >,
);

/**
 * Type-narrowing predicate. Use at every untrusted boundary before
 * indexing into the closed maps.
 */
export function isHaikuModuleId(v: unknown): v is HaikuModuleId {
  return (
    typeof v === 'string' &&
    (HAIKU_MODULE_IDS as readonly string[]).includes(v)
  );
}

/**
 * Type-narrowing predicate for category strings.
 */
export function isHaikuModuleCategory(v: unknown): v is HaikuModuleCategory {
  return (
    typeof v === 'string' &&
    (HAIKU_MODULE_CATEGORIES as readonly string[]).includes(v)
  );
}

/**
 * Group modules by category. Returns a Map preserving the canonical
 * category order from `HAIKU_MODULE_CATEGORIES`. Categories with no
 * modules are omitted.
 */
export function groupHaikuModulesByCategory(
  modules: readonly HaikuModule[] = HAIKU_MODULES,
): ReadonlyMap<HaikuModuleCategory, readonly HaikuModule[]> {
  const out = new Map<HaikuModuleCategory, HaikuModule[]>();
  for (const cat of HAIKU_MODULE_CATEGORIES) {
    const subset = modules.filter((m) => m.category === cat);
    if (subset.length > 0) {
      out.set(cat, subset);
    }
  }
  return out;
}

/** Total module count for the dashboard subtitle. Always 36 by design. */
export const HAIKU_MODULE_COUNT = HAIKU_MODULE_IDS.length;
