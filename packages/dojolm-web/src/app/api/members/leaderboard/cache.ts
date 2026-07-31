// SPDX-License-Identifier: Apache-2.0
/**
 * Process-local TTL cache for GET /api/members/leaderboard.
 *
 * Lives in a sibling module so Next.js' route-file export validator
 * (which rejects arbitrary exports from `route.ts`) does not reject
 * the `_resetLeaderboardCacheForTests` hook. The cache itself is
 * identical to what the route would implement inline — shared state
 * lives here so every test file can import the reset helper.
 */

import type { LeaderboardEntry, LeaderboardPage } from '@/lib/members/score-source';

export const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  readonly expiresAt: number;
  readonly entries: readonly LeaderboardEntry[];
  readonly totalEntries: number;
  readonly generatedAt: string;
}

const cache = new Map<string, CacheEntry>();

export function cacheKey(season: string, limit: number, offset: number): string {
  return `${season}::${limit}::${offset}`;
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

export function cacheSet(key: string, page: LeaderboardPage, now: number): void {
  cache.set(key, {
    expiresAt: now + CACHE_TTL_MS,
    entries: page.entries,
    totalEntries: page.totalEntries,
    generatedAt: page.generatedAt,
  });
}

/** Test-only — drops every cached tuple so suites start cold. */
export function _resetLeaderboardCacheForTests(): void {
  cache.clear();
}
