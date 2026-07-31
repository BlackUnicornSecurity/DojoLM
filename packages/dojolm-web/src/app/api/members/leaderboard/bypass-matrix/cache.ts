// SPDX-License-Identifier: Apache-2.0
/**
 * Process-local TTL cache for GET /api/members/leaderboard/bypass-matrix.
 *
 * Lives in a sibling module so Next.js' route-file export validator
 * (which rejects arbitrary exports from `route.ts`) does not reject
 * the `_resetBypassMatrixCacheForTests` hook. Same split pattern as
 * E4B.2's `/api/members/leaderboard/cache.ts`.
 *
 * Key shape is `season` only — the matrix is NOT paginated (no
 * limit/offset) and is viewer-independent by contract (cross-member
 * isolation — `MemberSubmissionSource.listSubmissions`).
 */

import type { BypassMatrix } from 'bu-tpi/catalog';

export const CACHE_TTL_MS = 60_000;

/**
 * Hard ceiling on distinct cache entries. The `season` schema admits
 * up to 32-char alphanumeric strings, so without this cap a flood of
 * crafted season values (within each caller's `'read'` rate-limit
 * budget, across many members) would grow the Map unbounded. 256 is
 * generous — seasons are quarterly, so a real deployment sees ~4 per
 * year per tenant.
 */
export const MAX_CACHE_ENTRIES = 256;

interface CacheEntry {
  readonly expiresAt: number;
  readonly matrix: BypassMatrix;
}

const cache = new Map<string, CacheEntry>();

/**
 * Namespaced key — mirrors the `::`-segmented format the E4B.2
 * leaderboard cache uses. Keeps the cache audit-readable and avoids
 * ambiguity if the two caches ever consolidate under a shared
 * registry in a later sub-epic.
 *
 * Invariant: `season` is constrained to `^[A-Za-z0-9-]+$` by the
 * route's `seasonSchema`, so `::` cannot appear in a season value and
 * the separator is unambiguous. If the schema ever expands to admit
 * `:` (unlikely — the seasons registry in E4B.4 uses the same regex),
 * this key format must be revisited.
 */
export function cacheKey(season: string): string {
  return `bypass-matrix::${season}`;
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

export function cacheSet(key: string, matrix: BypassMatrix, now: number): void {
  // Eviction-on-write: when inserting a NEW key would exceed the
  // ceiling, drop the oldest entry first. Map preserves insertion
  // order, so `keys().next().value` is the least-recently-inserted
  // key. Updates to an existing key never trigger eviction.
  if (!cache.has(key) && cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  // The stored `matrix` reference is deeply frozen by
  // `buildBypassMatrix` (bu-tpi/catalog). Any middleware that tries to
  // mutate it downstream will throw a TypeError — the serializer's
  // read-only path is unaffected.
  cache.set(key, {
    expiresAt: now + CACHE_TTL_MS,
    matrix,
  });
}

/** Test-only — drops every cached tuple so suites start cold. */
export function _resetBypassMatrixCacheForTests(): void {
  cache.clear();
}
