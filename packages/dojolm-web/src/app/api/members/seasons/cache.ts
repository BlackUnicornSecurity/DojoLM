// SPDX-License-Identifier: Apache-2.0
/**
 * Process-local TTL cache for GET /api/members/seasons (the list).
 *
 * Lives in a sibling module so Next.js' route-file export validator
 * (which rejects arbitrary exports from `route.ts`) does not reject
 * the `_resetSeasonsListCacheForTests` hook. Same split pattern as
 * E4B.2 (`/api/members/leaderboard/cache.ts`) and E4B.3
 * (`/api/members/leaderboard/bypass-matrix/cache.ts`).
 *
 * Key shape is the empty string `''` — the list is global and
 * viewer-independent (decision #6 — cross-member isolation).
 */

import type { Season } from '@/lib/members/seasons-source';

export const CACHE_TTL_MS = 60_000;

export interface SeasonsListPayload {
  readonly active: Season | null;
  readonly archives: readonly Season[];
  readonly generatedAt: string;
}

interface CacheEntry {
  readonly expiresAt: number;
  readonly payload: SeasonsListPayload;
}

const cache = new Map<string, CacheEntry>();

/**
 * Namespaced key — mirrors the `::`-segmented format used by the
 * E4B.2/E4B.3 caches. The list is global (no params), so the suffix
 * is the empty string.
 */
export function cacheKey(): string {
  return 'seasons-list::';
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

export function cacheSet(key: string, payload: SeasonsListPayload, now: number): void {
  // Single-entry invariant: this cache only ever stores the fixed
  // 'seasons-list::' key, so an entry cap would be a no-op. A future
  // caller introducing variable keys MUST add a cap — see the archive
  // cache's MAX_CACHE_ENTRIES guard for the pattern.
  cache.set(key, {
    expiresAt: now + CACHE_TTL_MS,
    payload,
  });
}

/** Test-only — drops the cached list so suites start cold. */
export function _resetSeasonsListCacheForTests(): void {
  cache.clear();
}
