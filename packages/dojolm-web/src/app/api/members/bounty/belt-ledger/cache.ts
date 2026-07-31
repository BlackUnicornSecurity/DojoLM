// SPDX-License-Identifier: Apache-2.0
/**
 * Process-local TTL cache for GET /api/members/bounty/belt-ledger.
 *
 * ONLY the `tierDistribution` aggregate is cached — it is viewer-
 * independent by contract (decision #6 + §9 of the E4B.5 prompt doc).
 * The per-viewer fields (`ownEntries`, `currentBelt`, `currentPoints`)
 * are recomputed per-request because they depend on the caller's
 * `viewerId` and must never be reused across members.
 *
 * Key shape: the empty string `''` — the tier distribution is a global
 * aggregate, so there is a single cache slot. Mirrors the namespaced
 * `::`-suffixed style used by E4B.2/E4B.3/E4B.4 caches.
 *
 * Lives in a sibling module so Next.js' route-file export validator
 * (which rejects arbitrary exports from `route.ts`) does not reject
 * the `_resetBeltLedgerCacheForTests` hook.
 */

import type { Belt } from '@/lib/members/belt-ledger-source';

export const CACHE_TTL_MS = 60_000;

export type TierDistribution = Readonly<Record<Belt, number>>;

interface CacheEntry {
  readonly expiresAt: number;
  readonly tierDistribution: TierDistribution;
  readonly generatedAt: string;
}

const cache = new Map<string, CacheEntry>();

/**
 * Namespaced cache key. Mirrors the `::`-segmented format used by the
 * other member-surface caches. Always returns the same key — the
 * tier-distribution aggregate is global (no viewer taint).
 */
export function cacheKey(): string {
  return 'bounty-tier-distribution::';
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

export function cacheSet(
  key: string,
  tierDistribution: TierDistribution,
  generatedAt: string,
  now: number,
): void {
  // Single-entry invariant: this cache only ever stores the fixed
  // 'bounty-tier-distribution::' key, so an entry cap would be a
  // no-op. A future caller introducing variable keys MUST add a cap
  // — see the archive-season cache's MAX_CACHE_ENTRIES guard for
  // the pattern.
  cache.set(key, {
    expiresAt: now + CACHE_TTL_MS,
    tierDistribution,
    generatedAt,
  });
}

/** Test-only — drops the cached aggregate so suites start cold. */
export function _resetBeltLedgerCacheForTests(): void {
  cache.clear();
}
