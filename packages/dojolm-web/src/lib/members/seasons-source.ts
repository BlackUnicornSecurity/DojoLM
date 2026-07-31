// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/seasons-source.ts
 * Purpose: Epic 4B.4 S4B.4.1 — `MemberSeasonsSource` interface + default
 *          single-entry implementation matching the hardcoded
 *          `ACTIVE_SEASON` in `score-source.ts`.
 *
 * This module is the canonical read site for the active season + the
 * list of archived seasons. The leaderboard + bypass-matrix endpoints
 * consume `isKnownSeason(slug)` as their 404-gate; the new
 * `/members/seasons` + `/members/seasons/archive/:slug` surfaces
 * consume the list + per-slug lookups.
 *
 * E4B.5 integration seam: the admin season-rollover endpoint (a
 * later sub-epic) will implement `MemberSeasonsSource` backed by
 * persistent state and swap in via `setMemberSeasonsSource(...)` at
 * module init. The route reads the live source via
 * `getMemberSeasonsSource()` on every request so a mid-process swap is
 * observable immediately.
 *
 * Viewer-independence contract (inherited from E4B.2/E4B.3): neither
 * `listSeasons` nor `getSeason` take a `viewerId` — the seasons
 * registry is viewer-independent by construction. Two calls at the
 * same wall-clock time MUST return byte-identical results regardless
 * of the caller. This is why the `/api/members/seasons` route caches
 * the list under the empty string key (the list is global).
 */
import { ACTIVE_SEASON } from './score-source';

export interface Season {
  readonly slug: string;
  readonly label: string;
  /** ISO-8601 UTC timestamp at which this season started accepting scores. */
  readonly startedAt: string;
  /**
   * ISO-8601 UTC timestamp at which this season closed. `null` for the
   * active season. Archived seasons ALWAYS carry a non-null `endedAt`.
   */
  readonly endedAt: string | null;
  /**
   * `'active'` — exactly one season MAY carry this status at a time;
   *              the registry's `getActiveSeason()` returns this entry.
   * `'archived'` — a historical season whose leaderboard + bypass
   *                matrix are frozen. E4B.4's default `InMemory`
   *                implementation returns zero archives; the first
   *                real archive lands when the admin rollover endpoint
   *                (a later sub-epic) flips the active season.
   */
  readonly status: 'active' | 'archived';
}

export interface MemberSeasonsSource {
  listSeasons(): Promise<readonly Season[]>;
  getSeason(slug: string): Promise<Season | null>;
  getActiveSeason(): Promise<Season | null>;
}

/**
 * Default single-entry source: one active season matching the
 * hardcoded `ACTIVE_SEASON` constant, no archives.
 *
 * The start timestamp is derived from the `YYYY-QN` slug rather than
 * hardcoded so future seasons hitting this path land with the right
 * date without a code change. The default implementation only
 * advertises `ACTIVE_SEASON`, so the derivation runs exactly once per
 * process.
 */
function deriveQuarterStartIso(slug: string): string {
  const match = /^(\d{4})-Q([1-4])$/.exec(slug);
  if (!match) {
    // Fallback to the E4B.2 shipping date. The `YYYY-QN` shape is the
    // decision #7 contract — any deviation is a programming error, but
    // returning a valid ISO keeps the surface from crashing in dev.
    return '2026-04-01T00:00:00.000Z';
  }
  const year = Number(match[1]);
  const q = Number(match[2]);
  const month = (q - 1) * 3;
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString();
}

function deriveQuarterLabel(slug: string): string {
  const match = /^(\d{4})-Q([1-4])$/.exec(slug);
  if (!match) return slug;
  return `${match[1]} Q${match[2]}`;
}

const ACTIVE_SEASON_STARTED_AT = deriveQuarterStartIso(ACTIVE_SEASON);
const ACTIVE_SEASON_LABEL = deriveQuarterLabel(ACTIVE_SEASON);

const DEFAULT_ACTIVE_SEASON: Season = Object.freeze({
  slug: ACTIVE_SEASON,
  label: ACTIVE_SEASON_LABEL,
  startedAt: ACTIVE_SEASON_STARTED_AT,
  endedAt: null,
  status: 'active' as const,
});

export class InMemorySeasonsSource implements MemberSeasonsSource {
  async listSeasons(): Promise<readonly Season[]> {
    return [DEFAULT_ACTIVE_SEASON];
  }

  async getSeason(slug: string): Promise<Season | null> {
    if (slug === DEFAULT_ACTIVE_SEASON.slug) return DEFAULT_ACTIVE_SEASON;
    return null;
  }

  async getActiveSeason(): Promise<Season | null> {
    return DEFAULT_ACTIVE_SEASON;
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton + swap site (E4B.5 integration seam).
// ---------------------------------------------------------------------------

let currentSource: MemberSeasonsSource = new InMemorySeasonsSource();

export function getMemberSeasonsSource(): MemberSeasonsSource {
  return currentSource;
}

export function setMemberSeasonsSource(next: MemberSeasonsSource): void {
  currentSource = next;
}

/** Test-only: restore the default single-entry source between suites. */
export function _resetMemberSeasonsSourceForTests(): void {
  currentSource = new InMemorySeasonsSource();
}

/**
 * Leaderboard + bypass-matrix 404-gate helper.
 *
 * Returns `true` iff the current `MemberSeasonsSource.getSeason(slug)`
 * returns non-null. Wraps the source call in a try/catch so a source
 * error falls back to `false` (the endpoint then 404s rather than
 * 500s — consistent with the "unknown season" surface).
 *
 * Note: the flag-gate + auth + rate-limit already ran before this is
 * called from the leaderboard/bypass-matrix routes; an unauthenticated
 * prober cannot oracle the registry via this helper.
 */
export async function isKnownSeason(slug: string): Promise<boolean> {
  try {
    const season = await getMemberSeasonsSource().getSeason(slug);
    return season !== null;
  } catch {
    return false;
  }
}
