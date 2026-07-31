// SPDX-License-Identifier: Apache-2.0
/**
 * Process-local TTL cache for GET /api/members/seasons/archive/:slug.
 *
 * Lives in a sibling module so Next.js' route-file export validator
 * (which rejects arbitrary exports from `route.ts`) does not reject
 * the `_resetSeasonsArchiveCacheForTests` hook. Same split pattern as
 * E4B.2 (`/api/members/leaderboard/cache.ts`) and E4B.3
 * (`/api/members/leaderboard/bypass-matrix/cache.ts`).
 *
 * Key shape is `slug` only — the archive is not paginated, and it is
 * viewer-independent by contract (decision #3/#6 — immutable
 * anonymized aggregate).
 *
 * Eviction cap inherited from E4B.3 — bounded to 256 distinct slugs.
 * Archived seasons are rare (quarterly cadence), so 256 covers >60
 * years of real history. The cap exists to defend against a crafted
 * slug flood from within each caller's `'read'` rate-limit budget.
 */

import type { BypassMatrix, BypassSubmission } from 'bu-tpi/catalog';
import type { Season } from '@/lib/members/seasons-source';
import type { LeaderboardEntry } from '@/lib/members/score-source';

export const CACHE_TTL_MS = 60_000;
export const MAX_CACHE_ENTRIES = 256;

export interface ArchiveLeaderboardPayload {
  readonly entries: readonly LeaderboardEntry[];
  readonly totalEntries: number;
}

export interface ArchivePayload {
  readonly season: Season;
  readonly leaderboard: ArchiveLeaderboardPayload;
  readonly bypassMatrix: BypassMatrix;
  readonly generatedAt: string;
}

// Re-export for the route's strong-typed source reads. The archive
// route builds the matrix from submissions the submission source
// returns — identical to how the live bypass-matrix endpoint consumes
// the source — so the re-export keeps the route + cache in one import
// graph.
export type { BypassSubmission };

interface CacheEntry {
  readonly expiresAt: number;
  readonly payload: ArchivePayload;
}

const cache = new Map<string, CacheEntry>();

/**
 * Namespaced key — mirrors the `::`-segmented format the E4B.2/E4B.3
 * caches use. Keeps the cache audit-readable and avoids ambiguity if
 * the three caches ever consolidate under a shared registry.
 *
 * Invariant: `slug` is constrained to `^[A-Za-z0-9-]{1,32}$` by the
 * route's params schema, so `::` cannot appear in a slug and the
 * separator is unambiguous.
 */
export function cacheKey(slug: string): string {
  return `seasons-archive::${slug}`;
}

export function cacheGet(key: string, now: number): CacheEntry | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= now) {
    cache.delete(key);
    return null;
  }
  return hit;
}

export function cacheSet(key: string, payload: ArchivePayload, now: number): void {
  // Eviction-on-write: when inserting a NEW key would exceed the
  // ceiling, drop the oldest entry first. Map preserves insertion
  // order, so `keys().next().value` is the least-recently-inserted
  // key. Updates to an existing key never trigger eviction. Parity
  // with E4B.3's bypass-matrix cache.
  if (!cache.has(key) && cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, {
    expiresAt: now + CACHE_TTL_MS,
    payload,
  });
}

/** Test-only — drops every cached tuple so suites start cold. */
export function _resetSeasonsArchiveCacheForTests(): void {
  cache.clear();
}
