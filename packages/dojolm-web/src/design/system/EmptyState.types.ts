// SPDX-License-Identifier: Apache-2.0
/**
 * Shared types for the design-system EmptyState. Split from the component
 * file so empty-state-copy.ts can import without dragging in JSX.
 *
 * Canonical 17-id `EmptyStateModule` union — single source of truth per
 * ADR-0103 (EMPTY-STATE-TAXONOMY-RECONCILIATION, amends ADR-0081). Any
 * addition / removal must:
 *   1. Update this union, plus `MOTIFS` + `TINT_BY_MODULE` (EmptyState.tsx)
 *      and `MODULE_DEFAULTS` (empty-state-copy.ts) in the same PR.
 *   2. Update the canvas iteration list at
 *      `app/(design)/canvas/06-empty-states/page.tsx` so the design-team
 *      reference matrix renders N × 3 (module × state) cells.
 *   3. Update / append to ADR-0103 §3 with the new module-id table row
 *      and §10 fallback log entry — do not silently widen the union.
 *
 * 16 module ids cover the Yamabushi V2 surface modules + admin chrome
 * (`command` / `admin` / `ronin` / `scanner` / `buki` / `jutsu` / `arena` /
 * `atemi` / `sengoku` / `hattori` / `kotoba` / `mitsuke` / `amaterasu` /
 * `kagami` / `bushido` / `shingan`) + 1 `enso` fallback for unknown ids
 * = 17 of 17 entries below. Every entry has corresponding motif + tint +
 * default copy coverage; consumers passing an unrecognised id fall back
 * to `enso` per `EmptyState.tsx` `MOTIFS[module] ? module : 'enso'`.
 */

export type EmptyStateModule =
  | 'command'
  | 'bushido'
  | 'admin'
  | 'ronin'
  | 'scanner'
  | 'buki'
  | 'jutsu'
  | 'arena'
  | 'atemi'
  | 'sengoku'
  | 'hattori'
  | 'kotoba'
  | 'mitsuke'
  | 'amaterasu'
  | 'kagami'
  | 'shingan'
  | 'enso';

/**
 * A.1 consolidation (2026-05-14) — added `filter-narrowed` and
 * `search-narrowed`. Both share the visual treatment of `empty` (no
 * torii-slash overlay) but route through `STATE_COPY` so the sub-line
 * can carry shared "try clearing filters" / "no matches for {query}"
 * messaging. Strictly additive: the original 4-id union remains valid.
 */
export type EmptyStateState =
  | 'empty'
  | 'loading'
  | 'error'
  | 'disabled'
  | 'filter-narrowed'
  | 'search-narrowed';

export type EmptyStateTint = 'red' | 'steel' | 'gold' | 'violet' | 'neutral';

/**
 * A.1 consolidation (2026-05-14) — semantic tone, orthogonal to the
 * module-derived `EmptyStateTint`. `tint` is brand-anchored (always
 * follows the module's wash). `tone` layers on top to communicate the
 * semantic flavor of the surface (info = neutral / default, warning =
 * gold-accented title, error = torii-accented title). Backward compat:
 * default `tone="info"` adds no class + no visual change versus today.
 */
export type EmptyStateTone = 'info' | 'warning' | 'error';

/**
 * A.1 consolidation (2026-05-14) — discrete size axis. `compact` (the
 * pre-existing boolean prop) maps to `size="compact"` when explicit
 * `size` is omitted. `hero` is the net-new variant — larger padding,
 * Fraunces editorial title, optional kanji watermark slot. Default
 * `size="regular"` emits no extra class + matches today's layout.
 */
export type EmptyStateSize = 'regular' | 'compact' | 'hero';

/**
 * Generic action shape accepted by `loading` / `error` states (and the
 * `secondary` slot on every state). `href` is optional — clicking falls
 * back to a `<button>` if no safe href is supplied.
 */
export interface EmptyStateAction {
  readonly label: string;
  readonly onClick?: () => void;
  readonly href?: string;
}

/**
 * Required CTA shape for `state="empty"`. E3.S2 (audit/REMEDIATION-PLAN
 * lines 416-420) — every empty surface MUST surface a verb-led CTA with
 * a canonical href so the user always has a forward path. The discriminated
 * union below makes this a build-time invariant.
 *
 * - `label`: verb-led action (e.g. "Plan bout", "Open scanner").
 * - `href`: canonical destination (same-origin path or https URL).
 * - `onClick`: optional client-side handler (analytics, optimistic updates).
 *
 * `href` is required so the CTA can render as a real anchor with a
 * stable destination — pure-`onClick` CTAs that depend on in-page state
 * machines were the F-6-003 / F-7-014 anti-pattern this story retires.
 */
export interface EmptyStateEmptyAction {
  readonly label: string;
  readonly href: string;
  readonly onClick?: () => void;
}
