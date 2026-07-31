// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/score-source.ts
 * Purpose: Epic 4B.2 S4B.2.1 — `MemberScoreSource` interface + default
 *          empty-list implementation + active-season constant.
 *
 * This module is the E4B.5 integration seam. Once the belt-threshold
 * table + point-ledger lands, a new `MemberScoreSource` implementation
 * (backed by the persistent ledger) swaps in via `setMemberScoreSource`
 * at module init. The `/api/members/leaderboard` route reads the
 * current source via `getMemberScoreSource()` — it never imports the
 * concrete class directly, so replacing the default is a one-liner.
 *
 * Lifecycle note: there is NO schema, migration, or ledger write in
 * E4B.2. The default `InMemoryScoreSource.getLeaderboard` returns an
 * empty page; the `/members/leaderboard` page renders the empty-state
 * copy until E4B.5 flips the factory.
 */

import type { Belt } from '@/design/arena/BeltDisc';

/**
 * Hardcoded active season for E4B.2. The seasons registry lands with
 * E4B.4 — the leaderboard route defaults the `season` query param to
 * this value when the caller omits it.
 */
export const ACTIVE_SEASON = '2026-Q2';

/**
 * One row of the leaderboard.
 *
 * `displayAs` carries the visibility choice the entry would honour
 * once the opt-out editor lands. For E4B.2 every row is `'handle'`
 * (decision #5 of the E4B design decisions — default-visible, no
 * editor in v1).
 */
export interface LeaderboardEntry {
  readonly rank: number;
  readonly handle: string;
  readonly score: number;
  readonly belt: Belt;
  readonly displayAs: 'handle' | 'hash';
}

export interface LeaderboardPage {
  readonly season: string;
  readonly entries: readonly LeaderboardEntry[];
  readonly totalEntries: number;
  /**
   * The authenticated viewer's own entry, if they appear in the full
   * ranking. Populated independently of the paginated `entries[]` so
   * a member always sees where they stand regardless of offset.
   */
  readonly viewerEntry: LeaderboardEntry | null;
  readonly generatedAt: string;
}

export interface GetLeaderboardOpts {
  readonly season: string;
  readonly limit: number;
  readonly offset: number;
  /**
   * Authenticated caller's user id, or null when the source does not
   * need it.
   *
   * **Contract (cross-member isolation — decision #4/#6):** `viewerId`
   * is consumed ONLY to populate `viewerEntry`. It MUST NOT influence
   * the contents or ordering of `entries[]`; two calls with the same
   * `(season, limit, offset)` tuple and different `viewerId` values
   * MUST produce byte-identical `entries[]` arrays. The route caches
   * `entries[]` by `(season, limit, offset)` only — excluding
   * `viewerId` from the cache key — so a source implementation that
   * tainted `entries[]` with `viewerId` would silently serve one
   * member's view to every caller until the TTL expired. E4B.5's
   * ledger-backed source MUST uphold this invariant.
   */
  readonly viewerId: string | null;
}

export interface MemberScoreSource {
  /**
   * See `GetLeaderboardOpts.viewerId` for the cross-member isolation
   * contract that every implementation must honour.
   */
  getLeaderboard(opts: GetLeaderboardOpts): Promise<LeaderboardPage>;
}

/**
 * Default in-memory source. Returns an empty page — no entries, no
 * viewer entry, totalEntries = 0.
 *
 * This is the SHIPPED implementation for E4B.2. E4B.5 swaps it out
 * for a ledger-backed source via `setMemberScoreSource()`.
 */
export class InMemoryScoreSource implements MemberScoreSource {
  async getLeaderboard(opts: GetLeaderboardOpts): Promise<LeaderboardPage> {
    return {
      season: opts.season,
      entries: [],
      totalEntries: 0,
      viewerEntry: null,
      generatedAt: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton + swap site
// ---------------------------------------------------------------------------
//
// E4B.5 integration seam: a new ledger-backed implementation calls
// `setMemberScoreSource(new LedgerScoreSource(...))` at module init
// (for example from a server bootstrap hook). The route reads the
// live source via `getMemberScoreSource()` on every request so a
// mid-process swap is observable immediately.

let currentSource: MemberScoreSource = new InMemoryScoreSource();

export function getMemberScoreSource(): MemberScoreSource {
  return currentSource;
}

export function setMemberScoreSource(next: MemberScoreSource): void {
  currentSource = next;
}

/** Test-only: restore the default empty-list source between suites. */
export function _resetMemberScoreSourceForTests(): void {
  currentSource = new InMemoryScoreSource();
}
