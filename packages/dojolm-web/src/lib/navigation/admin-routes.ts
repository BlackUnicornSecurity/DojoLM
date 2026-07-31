// SPDX-License-Identifier: Apache-2.0
/* eslint-disable no-restricted-syntax -- This compatibility registry is the documented boundary for retired NavId aliases. */
/**
 * Closed projection from NavId → admin-route URL.
 *
 * Every NavId in the closed union from `lib/constants` MUST appear here.
 * Adding a new module to NAV_ITEMS requires an explicit entry — TypeScript
 * enforces exhaustivity through `Record<NavId, string>`. This is the
 * single source of truth for:
 *
 *   - Rail click navigation (`shell-chrome.tsx#railHrefFor`)
 *   - `/?tab=<id>` server-side redirect dispatcher (`(shell)/page.tsx`)
 *   - In-page back-link navigation (KumiteRetiredNotice and friends)
 *
 * Open-redirect defense:
 *   - `resolveTabRedirect` resolves the raw `tab` query value through the
 *     closed alias map first, then looks it up in NAV_ID_TO_URL. A
 *     malicious value like `tab=https://attacker.example` is NOT a valid
 *     key and resolves to `null`, so the dispatcher falls through to the
 *     dashboard. The map values are all hardcoded `/admin/<module>` paths
 *     — never derived from user input.
 *   - Prototype-pollution defense: the alias lookup uses `Object.hasOwn`
 *     so `tab=__proto__` cannot reach the prototype chain.
 */

import { NAV_ITEMS, NAV_ID_ALIASES } from "../constants";
import type { NavId } from "../constants";
import { ROUTE_NAMING, type RouteNamingId } from "./route-naming";

/**
 * Closed map: every NavId resolves to a single canonical destination URL.
 *
 * `dashboard` is the only entry that does NOT point at `/admin/<module>`
 * — clicking the Dashboard rail item lands on `/`. Every other rail
 * click bypasses the legacy `/?tab=<id>` shell tab system.
 *
 * Mapping rationale (non-obvious entries):
 *   - `armory` → `/admin/buki` — the Armory NavId is a hidden back-compat
 *     alias for Buki (the Payload Lab absorbed the Armory in PR-4b.3).
 *   - `adversarial` → `/admin/atemi` — the Atemi Lab is the v2.1
 *     successor to the legacy "Adversarial" surface.
 *   - `compliance` → `/admin/bushido` — Bushido Book is the canonical
 *     compliance surface.
 *   - `dna` → `/admin/amaterasu` — Amaterasu is the v2.1 home for the
 *     Attack DNA explorer.
 *   - `guard` → `/admin/hattori` — Hattori Guard is the v2.1 successor
 *     to the legacy Guard Dashboard.
 *   - `ronin-hub` → `/admin/ronin` — the rail uses the `-hub` suffix for
 *     historical reasons; the route is canonical.
 *   - `admin` → `/admin/flags` — the admin NavId historically rendered
 *     a generic "Admin" panel. Hattori Flags is the most-trafficked
 *     admin surface and serves as the canonical admin landing.
 *   - `strategic` → `/admin/eval` — the Kumite hub was retired in PR
 *     -4b.8; Battle Arena (`/admin/eval`) is the closest semantic peer
 *     and serves as the back-compat redirect target.
 */
export const NAV_ID_TO_URL: Readonly<Record<NavId, string>> = Object.freeze({
  dashboard: "/",
  scanner: "/admin/scanner",
  armory: "/admin/buki",
  buki: "/admin/buki",
  jutsu: "/admin/jutsu",
  arena: "/admin/arena",
  adversarial: "/admin/atemi",
  sengoku: "/admin/sengoku",
  "ronin-hub": "/admin/ronin",
  guard: "/admin/hattori",
  kotoba: "/admin/kotoba",
  mitsuke: "/admin/mitsuke",
  dna: "/admin/amaterasu",
  kagami: "/admin/kagami",
  compliance: "/admin/bushido",
  admin: "/admin/flags",
  strategic: "/admin/eval",
  // TICKET-L701-IMPLEMENT (2026-05-06): AgenticLab restoration deep-link
  // target. Hidden NavItem in NAV_ITEMS; visible only via the Sensei
  // run_agentic_test tool dispatch and direct URL navigation.
  agentic: "/admin/agentic",
  // E3.S6c (F-3-019): `/console` Workbench rail destination. The
  // canonical Rail (`design/shell/Rail.tsx#RAIL`) renders a `'console'`
  // row using `I.console`; clicking it dispatches `getRailHref('console')`
  // which resolves directly through this map (no alias bridge needed —
  // the Rail-id and NavId are intentionally identical).
  console: "/console",
  // HAGANE E4.S2 — Operations rail group.
  validation: "/admin/validation",
  // EE Projects — engagement half of the full test report (EE-only).
  projects: "/admin/projects",
  // Tatami evidence workspace (OSS) — Operations rail group.
  tatami: "/admin/tatami",
  "system-health": "/admin/system-health",
  users: "/admin/users",
  // EPIC-D (F-QA-024) — OSS self-management surface; ships in both OSS
  // and EE shells. EE_NAV_IDS does NOT include 'account', so it survives
  // the materialize-time transform.
  account: "/admin/account",
  exports: "/admin/exports",
});

/** Set of all valid NavIds derived from NAV_ITEMS — defense-in-depth */
const VALID_NAV_IDS = new Set<string>(NAV_ITEMS.map((item) => item.id));

/**
 * Resolve the canonical NavId for a raw query-string `tab` value.
 *
 * Returns `null` for unknown or malformed values so the caller can
 * fall through (e.g. drop the `tab` param and render the dashboard).
 *
 * Defense layers:
 *   1. Lowercase normalization for case-insensitive deep links
 *   2. Direct NavId lookup against `VALID_NAV_IDS`
 *   3. Alias lookup via `Object.hasOwn` (prototype-pollution-safe)
 *   4. Double-check the alias target is a valid NavId (defense if
 *      NAV_ID_ALIASES gets out of sync with NAV_ITEMS)
 */
export function resolveCanonicalNavId(rawTab: string): NavId | null {
  const lower = rawTab.toLowerCase();
  if (VALID_NAV_IDS.has(lower)) return lower as NavId;
  if (Object.hasOwn(NAV_ID_ALIASES, lower)) {
    const aliased = NAV_ID_ALIASES[lower as keyof typeof NAV_ID_ALIASES];
    if (VALID_NAV_IDS.has(aliased)) return aliased;
  }
  return null;
}

/**
 * Resolve the destination URL for a raw `?tab=<id>` query-string value
 * landing on `/`.
 *
 * Returns:
 *   - `null` when no redirect should occur (unknown/malformed tab, or
 *     `tab=dashboard` since `/` is already the dashboard)
 *   - `/admin/<module>` URL with non-`tab` query params preserved
 *
 * Query-string preservation contract:
 *   - All params other than `tab` are forwarded through to the redirect
 *     target (e.g. `/?tab=mitsuke&debug=1` → `/admin/mitsuke?debug=1`)
 *   - Multi-valued params (e.g. `?foo=a&foo=b`) preserve all values
 *   - Non-string param values from `searchParams` are filtered out
 *
 * Open-redirect defense:
 *   - The base URL is always sourced from `NAV_ID_TO_URL` (closed map of
 *     hardcoded `/admin/*` paths). User input never reaches the host
 *     portion of the URL.
 */
export function resolveTabRedirect(
  rawTab: string,
  otherParams: ReadonlyArray<readonly [string, string]> = [],
): string | null {
  const navId = resolveCanonicalNavId(rawTab);
  if (navId === null) return null;
  if (navId === "dashboard") return null;
  const baseUrl = NAV_ID_TO_URL[navId];
  if (otherParams.length === 0) return baseUrl;
  const search = new URLSearchParams(
    otherParams.map(([k, v]) => [k, v]),
  ).toString();
  return search.length > 0 ? `${baseUrl}?${search}` : baseUrl;
}

/**
 * Flatten a Next.js `searchParams` payload into the `[key, value]` pair
 * shape that `resolveTabRedirect` accepts.
 *
 * Excludes the `tab` key itself (it would otherwise re-redirect in a
 * loop) and any non-string values.
 */
export function searchParamsToOtherParams(
  searchParams: Readonly<
    Record<string, string | readonly string[] | undefined>
  >,
): ReadonlyArray<readonly [string, string]> {
  const out: Array<readonly [string, string]> = [];
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "tab") continue;
    if (typeof value === "string") {
      out.push([key, value]);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        if (typeof v === "string") out.push([key, v]);
      }
    }
  }
  return out;
}

/**
 * Normalize the raw `tab` query value into a single string or `null`.
 *
 * Next.js delivers a duplicated query-string key (e.g.
 * `/?tab=mitsuke&tab=other`) as a `string[]`. The `resolveTabRedirect`
 * dispatcher takes a single string, so we resolve the array form by
 * picking the first non-empty entry — matching how `searchParamsToOtherParams`
 * flattens multi-valued non-`tab` params and matching what most browsers
 * surface to server handlers.
 *
 * Returns `null` for:
 *   - `undefined` (no `tab` param)
 *   - `''` (empty string)
 *   - `[]` (empty array)
 *   - `[undefined, ...]` / `['', ...]` (no usable string entry)
 */
export function normalizeTabParam(
  raw: string | readonly string[] | undefined,
): string | null {
  if (typeof raw === "string") return raw.length > 0 ? raw : null;
  if (Array.isArray(raw)) {
    for (const v of raw) {
      if (typeof v === "string" && v.length > 0) return v;
    }
    return null;
  }
  return null;
}

/**
 * Rail-side identifiers (`design/shell/Rail.tsx#RAIL`) use the module
 * names directly (`'ronin'`, `'hattori'`, `'amaterasu'`, …), while
 * `NAV_ID_TO_URL` keys are canonical NavIds (`'ronin-hub'`, `'guard'`,
 * `'dna'`, …). Some pairs are already covered by `NAV_ID_ALIASES` for
 * deep-link back-compat (`ronin` → `ronin-hub`, `atemi` → `adversarial`,
 * `bounty` → `ronin-hub`); the rest only existed as Rail ids and would
 * miss every map without this bridge. An unmapped Rail id silently
 * sends the user to `/` (dashboard fallback below) — that's the bug
 * the operator hit when clicking Hattori / Amaterasu / Bushido.
 */
const RAIL_ID_ALIASES: Readonly<Record<string, NavId>> = Object.freeze({
  hattori: "guard",
  amaterasu: "dna",
  bushido: "compliance",
  eval: "strategic",
});

const MEMBER_RAIL_URLS: Readonly<Record<string, string>> = Object.freeze({
  members: "/members",
  leaderboard: "/members/leaderboard",
  seasons: "/members/seasons",
  bounty: "/members/bounty",
  "bypass-matrix": "/members/leaderboard/bypass-matrix",
});

const RAIL_DIRECT_URLS: Readonly<Record<string, string>> = Object.freeze({
  admin: "/admin",
});

/**
 * Closed lookup helper for the Rail's onItemClick handler — returns the
 * canonical destination URL for a given Rail item id.
 *
 * Resolution order (first match wins, all `Object.hasOwn`-guarded for
 * prototype-pollution safety):
 *   1. Explicit Rail destination (`RAIL_DIRECT_URLS` / member Rail)
 *   2. Direct hit in `NAV_ID_TO_URL` (canonical NavId)
 *   3. Rail-id alias (`RAIL_ID_ALIASES` — Rail-specific aliases that
 *      were never deep-link NavIds)
 *   4. `NAV_ID_ALIASES` (retired NavId / deep-link back-compat)
 *   5. Fallback to `/` so an unknown id can never navigate to an
 *      undefined destination.
 */
export function getRailHref(id: string): string {
  if (Object.hasOwn(ROUTE_NAMING, id)) {
    return ROUTE_NAMING[id as RouteNamingId].route;
  }
  if (Object.hasOwn(RAIL_DIRECT_URLS, id)) {
    return RAIL_DIRECT_URLS[id];
  }
  if (Object.hasOwn(MEMBER_RAIL_URLS, id)) {
    return MEMBER_RAIL_URLS[id];
  }
  if (Object.hasOwn(NAV_ID_TO_URL, id)) {
    return NAV_ID_TO_URL[id as NavId];
  }
  if (Object.hasOwn(RAIL_ID_ALIASES, id)) {
    return NAV_ID_TO_URL[RAIL_ID_ALIASES[id]];
  }
  if (Object.hasOwn(NAV_ID_ALIASES, id)) {
    const aliased = NAV_ID_ALIASES[id as keyof typeof NAV_ID_ALIASES];
    if (Object.hasOwn(NAV_ID_TO_URL, aliased)) {
      return NAV_ID_TO_URL[aliased];
    }
  }
  return "/";
}
