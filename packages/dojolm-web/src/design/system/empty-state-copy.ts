// SPDX-License-Identifier: Apache-2.0
/**
 * Default COPY table for the design-system EmptyState component.
 *
 * Source: the V1 design system states handoff +
 * shared/empty-state (DEFAULTS + STATE_COPY constants).
 *
 * Shape — matches the v2.1 prototype:
 *   MODULE_DEFAULTS keys 16 modules (15 Rail IDs + 'enso' fallback) with a
 *   single { title, sub } pair per module that applies on the `empty` state.
 *   STATE_COPY keys 'loading' | 'error' with one shared { title, sub }
 *   that applies to every module on those states.
 *
 * The component resolves copy with this precedence:
 *   1. Explicit `title` / `sub` props on <EmptyState>
 *   2. STATE_COPY[state] when state !== 'empty'
 *   3. MODULE_DEFAULTS[module] for the empty state
 *   4. MODULE_DEFAULTS.enso fallback for unknown modules
 *
 * R-T1: every value is a static string literal. No operator-supplied text
 * ever lands in the COPY table.
 */

import type { EmptyStateModule, EmptyStateState } from './EmptyState.types';

export interface EmptyStateCopy {
  readonly title: string;
  readonly sub: string;
}

export const MODULE_DEFAULTS: Readonly<Record<EmptyStateModule, EmptyStateCopy>> = {
  command: {
    title: 'Nothing on deck',
    sub: 'No posture changes in the last 24h.',
  },
  bushido: {
    title: 'No attestations pending',
    sub: 'All Q2 commitments are signed off.',
  },
  admin: {
    title: 'Fleet is quiet',
    sub: 'No pending policy changes or quota flags.',
  },
  ronin: {
    title: 'No open bounties',
    sub: 'Check back when the next campaign opens.',
  },
  scanner: {
    title: 'Scanner idle',
    sub: 'Point a target at the dojo to begin.',
  },
  buki: {
    title: 'Armory empty',
    sub: 'Import a test pack or clone one from the library.',
  },
  jutsu: {
    title: 'No models configured',
    sub: 'Add a candidate to begin tuning.',
  },
  arena: {
    title: 'No bouts today',
    sub: 'Schedule a head-to-head to populate the board.',
  },
  atemi: {
    title: 'No campaigns evolving',
    sub: 'Seed a family to start adversarial search.',
  },
  sengoku: {
    title: 'No campaigns running',
    sub: 'Launch one from a saved playbook.',
  },
  hattori: {
    title: 'Guard clean',
    sub: 'No blocks or drift in the current window.',
  },
  kotoba: {
    title: 'No prompts in review',
    sub: 'Pin a prompt to start hardening it.',
  },
  mitsuke: {
    title: 'Feed quiet',
    sub: 'No new signals from connected sources.',
  },
  amaterasu: {
    title: 'No families to trace',
    sub: 'Atemi has not produced lineage yet.',
  },
  kagami: {
    title: 'No drift detected',
    sub: 'The mirror suite is clean for this window.',
  },
  shingan: {
    title: 'No skill scanned yet',
    sub: 'Paste a skill, agent, or plugin manifest to surface a trust score.',
  },
  // Wave 3hh — F-6-006 (P2) retire. The previous enso fallback copy
  // ("Nothing here yet" / "Once there is data, it will appear in this
  // panel.") was the textbook "No data" anti-pattern the taxonomy is
  // explicitly meant to fix (the states handoff: "do not say 'No data'
  // — name what the operator would do FIRST"). Replaced with a copy
  // that names the two canonical first-task entry points — Atemi
  // (start adversarial search) and Scanner (point at a target) — so
  // even unknown-module fallbacks surface an actionable next step.
  enso: {
    title: 'Nothing here yet',
    sub: 'Seed activity from /admin/atemi (adversarial search) or /admin/scanner (probe a target) — output will appear here once a task runs.',
  },
};

export const STATE_COPY: Readonly<Record<Exclude<EmptyStateState, 'empty'>, EmptyStateCopy>> = {
  loading: {
    title: 'Loading',
    sub: 'One moment — fetching the latest.',
  },
  error: {
    title: 'Could not load',
    sub: 'Something broke on our side. Retry, or open the details.',
  },
  disabled: {
    title: 'Feature disabled',
    sub: 'Enable in Admin → Flags.',
  },
  // A.1 consolidation (2026-05-14) — filter-narrowed and search-narrowed
  // share the empty-state visual treatment (no torii-slash overlay) but
  // carry their own copy. search-narrowed uses the `{query}` placeholder
  // which `EmptyState.tsx` substitutes with a live-region wrapper so
  // assistive tech announces the search-term update.
  'filter-narrowed': {
    title: 'No matches',
    sub: 'Try clearing one or more filters to widen the result set.',
  },
  'search-narrowed': {
    title: 'No matches',
    sub: 'Nothing matches "{query}". Try a shorter or different term.',
  },
};

/**
 * E3.S3 — Default CTA wiring for `state="disabled"` so flag-off surfaces
 * always offer a one-click path to the flag toggle. Callers may override
 * by passing their own `cta` prop. Same-origin path keeps the
 * scheme allowlist in EmptyState.tsx happy.
 */
export const DISABLED_DEFAULT_CTA = {
  label: 'Open Flags',
  href: '/admin/flags',
} as const;

export function resolveCopy(
  module: EmptyStateModule,
  state: EmptyStateState,
): EmptyStateCopy {
  if (state !== 'empty') return STATE_COPY[state];
  return MODULE_DEFAULTS[module] ?? MODULE_DEFAULTS.enso;
}
