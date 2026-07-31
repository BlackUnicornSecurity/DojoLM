// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/belt-ledger-source.ts
 * Purpose: Epic 4B.5 S4B.5.1b + S4B.5.4 — `MemberBeltLedgerSource`
 *          interface + default in-memory implementation + belt-tier
 *          constants + pure threshold resolver.
 *
 * The belt ledger is **append-only + WORM-signed** (decision #11 of
 * the E4B design decisions). Every promotion writes a new row with
 * `previousHash` = prior entry's `entryHash`, and `entryHash` = HMAC
 * of the canonicalised body + previousHash. See `./belt-ledger-worm.ts`
 * for the signing primitive.
 *
 * This module is **client-safe** in a narrow sense: the four public
 * exports that survive tree-shaking into the client bundle are the
 * type-only `Belt` / `SignedBeltLedgerEntry` re-exports and the pure
 * constants + resolver (`BELT_TIERS`, `BELT_THRESHOLDS`,
 * `resolveBeltForPoints`). The `InMemoryBeltLedgerSource` class imports
 * `./belt-ledger-worm.ts` transitively for `appendPromotion` — the
 * client MUST import this module via `@/lib/members/belt-ledger-source`
 * and never touch the source class directly.
 *
 * **Belt thresholds** (decision #8 — the only re-decidable item in
 * E4B.5 per the prompt doc): `0 / 100 / 250 / 500 / 1000 / 2000 /
 * 4000 / 8000 / 16000`. Doubling cadence past green preserves
 * motivation across a hunter's tenure. These values match the
 * suggested table in the prompt doc — no deviation.
 *
 * **E4B.6 integration seam** (duplicated inline in `score-source.ts`'s
 * prior-art JSDoc): a ledger-backed `MemberScoreSource.getLeaderboard`
 * implementation should call `resolveBeltForPoints(entry.score)` when
 * populating each `LeaderboardEntry.belt` field. The shipping
 * `InMemoryScoreSource` in E4B.5 continues to return `belt: 'unranked'`
 * for every row — there are no promotions to threshold against — so
 * the leaderboard page still surfaces `'unranked'` for every row
 * until E4B.6 lands.
 *
 * **Viewer-independence contract**: `getTierDistribution()` MUST NOT
 * vary by caller (it is a global aggregate). `listOwnEntries({ viewerId })`
 * is the ONLY per-viewer read path — implementations MUST filter to
 * `row.userId === viewerId`. Tests enforce both invariants.
 */

import type { Belt } from '@/design/arena/BeltDisc';
import {
  getBeltLedgerSigningKey,
  hashEntry,
  type CanonicalEntryBody,
} from './belt-ledger-worm';

// ---------------------------------------------------------------------------
// Belt tier enumeration + threshold table
// ---------------------------------------------------------------------------

/**
 * Nine-tier dojo ladder, white → black. Matches the ordering in
 * `BeltDisc.tsx`'s `Belt` union minus the `'unranked'` seed (which is
 * not a ladder tier — it's the pre-ranked state). Order is significant:
 * `resolveBeltForPoints` walks the tiers from highest threshold down,
 * so reversing the array would silently misclassify points.
 */
export const BELT_TIERS: readonly Belt[] = Object.freeze([
  'white',
  'yellow',
  'orange',
  'green',
  'blue',
  'purple',
  'brown',
  'red',
  'black',
] as const) satisfies readonly Belt[];

export type RankedBelt = Exclude<Belt, 'unranked'>;

/**
 * Point thresholds for promotion. `resolveBeltForPoints(points)` returns
 * the highest tier whose threshold is `<= points`. The doubling cadence
 * past green (500 → 1000 → 2000 → 4000 → 8000 → 16000) matches the
 * Epic 4B.5 prompt doc's suggested table; the three early tiers grow
 * faster (0 → 100 → 250 → 500) so a new hunter sees belt motion on
 * their first handful of earned points.
 */
export const BELT_THRESHOLDS: Readonly<Record<RankedBelt, number>> = Object.freeze({
  white: 0,
  yellow: 100,
  orange: 250,
  green: 500,
  blue: 1000,
  purple: 2000,
  brown: 4000,
  red: 8000,
  black: 16000,
});

/**
 * Pure tier resolver. Lifetime-cumulative (decision #8) — there is no
 * per-season reset, no regression, no negative-points path. Edge cases:
 *
 *   - NaN / non-finite / non-number / negative  -> `'unranked'`
 *   - 0                                         -> `'white'`
 *   - 99                                        -> `'white'`
 *   - 100                                       -> `'yellow'`   (exact threshold)
 *   - 16_000_000                                -> `'black'`    (cap)
 *
 * Callers should pass integer points; the resolver tolerates floats
 * (`Math.floor`-style boundary) via a `>=` comparison so a stored
 * `99.9` rounds DOWN to `'white'` — a rank should not appear until the
 * threshold is fully crossed.
 */
export function resolveBeltForPoints(points: number): Belt {
  if (typeof points !== 'number' || !Number.isFinite(points) || points < 0) {
    return 'unranked';
  }
  // Walk from highest to lowest; the first match is the caller's tier.
  // The reverse order matches the BELT_TIERS ordering — any new tier
  // inserted in BELT_THRESHOLDS MUST also appear in BELT_TIERS or this
  // lookup will undercount.
  for (let i = BELT_TIERS.length - 1; i >= 0; i -= 1) {
    const tier = BELT_TIERS[i] as RankedBelt;
    if (points >= BELT_THRESHOLDS[tier]) return tier;
  }
  // Unreachable if BELT_TIERS contains 'white' (threshold 0) and points
  // is a non-negative finite number — defensive fallback only.
  return 'unranked';
}

// ---------------------------------------------------------------------------
// Ledger entry types
// ---------------------------------------------------------------------------

/**
 * Unsigned promotion record. Callers (E4B.6 admin surface) build this
 * and pass it to `appendPromotion`; the source signs the record and
 * returns the signed entry. The body carries NO `season` field — belts
 * are lifetime cumulative (decision #8 — re-confirmed before shipping).
 *
 * `sequence` is 1-based per user. `appendPromotion` enforces
 * strictly-increasing sequence for a given `userId` AND that
 * `toBelt`'s tier index > `fromBelt`'s tier index (no regression,
 * no lateral).
 */
export interface BeltLedgerEntry {
  readonly userId: string;
  readonly promotedAt: string;
  readonly fromBelt: Belt;
  readonly toBelt: Belt;
  readonly totalPointsAtPromotion: number;
  readonly sequence: number;
}

/**
 * Signed chain entry as stored on the source + returned by
 * `listOwnEntries`. The two hash-pointer fields (`previousHash`,
 * `entryHash`) extend the unsigned body — verifiers reconstruct the
 * body by stripping these two fields and rehashing.
 */
export interface SignedBeltLedgerEntry extends BeltLedgerEntry {
  readonly previousHash: string | null;
  readonly entryHash: string;
}

// ---------------------------------------------------------------------------
// Source interface
// ---------------------------------------------------------------------------

export interface MemberBeltLedgerSource {
  /**
   * Return the caller's own promotion history, oldest first. MUST
   * filter by `viewerId === userId` — two callers never see each
   * other's rows (decision #4/#6 — cross-member isolation).
   */
  listOwnEntries(opts: { readonly viewerId: string }): Promise<readonly SignedBeltLedgerEntry[]>;

  /**
   * Return the full ledger, oldest first. Viewer-independent — every
   * caller sees byte-identical output. The verify endpoint
   * (`/api/members/bounty/belt-ledger/verify`, E4B.6) consumes this
   * to run `verifyChain` against the entire chain; the response does
   * NOT echo the entries (only the ok-flag + firstInvalidIndex +
   * total-count), so exposing the full chain through this interface
   * method does not widen any privacy surface — the route body is
   * what gates viewer-independence.
   */
  listAllEntries(): Promise<readonly SignedBeltLedgerEntry[]>;

  /**
   * Return the anonymized count of members at each belt tier. Viewer-
   * independent by contract — two simultaneous calls from different
   * viewerIds return byte-identical aggregates. Only the HIGHEST tier
   * reached by each member counts; a hunter with 3 promotions appears
   * once, in their current belt.
   */
  getTierDistribution(): Promise<Readonly<Record<Belt, number>>>;

  /**
   * Append a new promotion row. Signs the entry with the current
   * ledger signing key and returns the signed row (frozen).
   *
   * Enforces:
   *   - `sequence > max(sequence for entry.userId)` (strictly increasing)
   *   - `tierIndex(toBelt) > tierIndex(fromBelt)` (no regression)
   *   - `totalPointsAtPromotion >= 0`
   *   - `userId` non-empty string
   *
   * The method is server-internal in E4B.5 — it is NOT exposed over
   * HTTP. Epic 4B.6 (admin surface) is the first caller.
   */
  appendPromotion(entry: BeltLedgerEntry): Promise<SignedBeltLedgerEntry>;
}

// ---------------------------------------------------------------------------
// In-memory default implementation
// ---------------------------------------------------------------------------

/**
 * Empty distribution: every tier at 0, plus the `unranked` seed slot.
 * The object is built fresh on every `getTierDistribution()` call so
 * the viewer never mutates the prototype.
 */
function emptyTierDistribution(): Record<Belt, number> {
  return {
    white: 0,
    yellow: 0,
    orange: 0,
    green: 0,
    blue: 0,
    purple: 0,
    brown: 0,
    red: 0,
    black: 0,
    unranked: 0,
  };
}

function tierIndex(belt: Belt): number {
  if (belt === 'unranked') return -1;
  return BELT_TIERS.indexOf(belt);
}

/**
 * In-memory append-only ledger. Internal array is frozen-per-entry; a
 * new array is allocated on append so existing snapshots stay
 * immutable. NO UPDATE, NO DELETE paths — the only mutation is `push`
 * of a fresh signed entry.
 *
 * Epic 4B.6 swaps this default for a persistent-storage implementation
 * via `setMemberBeltLedgerSource(...)`.
 */
export class InMemoryBeltLedgerSource implements MemberBeltLedgerSource {
  // Readonly-after-append — the slot holds the growing array, never
  // the individual entries. Each entry is frozen before append.
  private entries: readonly SignedBeltLedgerEntry[] = [];

  async listOwnEntries(
    opts: { readonly viewerId: string },
  ): Promise<readonly SignedBeltLedgerEntry[]> {
    if (typeof opts?.viewerId !== 'string' || opts.viewerId.length === 0) {
      return Object.freeze([]);
    }
    const viewerId = opts.viewerId;
    const own = this.entries.filter((e) => e.userId === viewerId);
    return Object.freeze(own);
  }

  /**
   * Full ledger accessor — oldest first — for the verify endpoint. The
   * internal `entries` array is already frozen-per-entry + replaced
   * (never mutated) on append, so returning the same reference is
   * safe. Two callers see the same underlying array at the same
   * `Date.now()`; viewer-independence holds trivially.
   */
  async listAllEntries(): Promise<readonly SignedBeltLedgerEntry[]> {
    return this.entries;
  }

  async getTierDistribution(): Promise<Readonly<Record<Belt, number>>> {
    // Highest tier reached per user. A user with 3 promotions counts
    // ONCE in their current belt. A user never appearing in the ledger
    // does not contribute to any bucket (they are not counted as
    // 'unranked' — the aggregate only covers hunters who have earned
    // at least one promotion record).
    const highestByUser = new Map<string, Belt>();
    for (const e of this.entries) {
      const prior = highestByUser.get(e.userId);
      if (prior === undefined || tierIndex(e.toBelt) > tierIndex(prior)) {
        highestByUser.set(e.userId, e.toBelt);
      }
    }
    const counts = emptyTierDistribution();
    for (const belt of highestByUser.values()) {
      counts[belt] += 1;
    }
    return Object.freeze(counts);
  }

  async appendPromotion(entry: BeltLedgerEntry): Promise<SignedBeltLedgerEntry> {
    if (typeof entry?.userId !== 'string' || entry.userId.length === 0) {
      throw new Error('appendPromotion: userId must be a non-empty string');
    }
    if (typeof entry.totalPointsAtPromotion !== 'number' ||
        !Number.isFinite(entry.totalPointsAtPromotion) ||
        entry.totalPointsAtPromotion < 0) {
      throw new Error('appendPromotion: totalPointsAtPromotion must be a non-negative finite number');
    }
    if (tierIndex(entry.toBelt) <= tierIndex(entry.fromBelt)) {
      throw new Error(
        `appendPromotion: toBelt (${entry.toBelt}) must outrank fromBelt (${entry.fromBelt})`,
      );
    }
    const priorForUser = this.entries.filter((e) => e.userId === entry.userId);
    const maxSeq = priorForUser.reduce((m, e) => (e.sequence > m ? e.sequence : m), 0);
    if (entry.sequence <= maxSeq) {
      throw new Error(
        `appendPromotion: sequence (${entry.sequence}) must exceed prior max (${maxSeq}) for user`,
      );
    }

    // Chain pointer: the LAST entry across the ENTIRE ledger (not the
    // per-user tail) is the pointer source. The ledger is a single
    // linear chain — two members' promotions interleave by wall-clock
    // order and the chain links them together. This matches the
    // onigaeshi audit-chain semantics.
    const tail = this.entries.length === 0 ? null : this.entries[this.entries.length - 1];
    const previousHash = tail === null ? null : tail.entryHash;

    const body: CanonicalEntryBody = {
      userId: entry.userId,
      promotedAt: entry.promotedAt,
      fromBelt: entry.fromBelt,
      toBelt: entry.toBelt,
      totalPointsAtPromotion: entry.totalPointsAtPromotion,
      sequence: entry.sequence,
    };
    const signingKey = getBeltLedgerSigningKey();
    const entryHash = hashEntry(body, previousHash, signingKey);

    const signed: SignedBeltLedgerEntry = Object.freeze({
      ...entry,
      previousHash,
      entryHash,
    });
    // Immutability: assign a new array rather than mutating in place.
    this.entries = Object.freeze([...this.entries, signed]);
    return signed;
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton + swap site (E4B.6 integration seam)
// ---------------------------------------------------------------------------
//
// E4B.6 swaps the in-memory default for a persistent-storage
// implementation via `setMemberBeltLedgerSource(new LedgerSource(...))`
// at server bootstrap. The route reads the live source via
// `getMemberBeltLedgerSource()` on every request so a mid-process swap
// is observable immediately.

let currentSource: MemberBeltLedgerSource = new InMemoryBeltLedgerSource();

export function getMemberBeltLedgerSource(): MemberBeltLedgerSource {
  return currentSource;
}

export function setMemberBeltLedgerSource(next: MemberBeltLedgerSource): void {
  currentSource = next;
}

/** Test-only: restore the default in-memory source between suites. */
export function _resetMemberBeltLedgerSourceForTests(): void {
  currentSource = new InMemoryBeltLedgerSource();
}

// ---------------------------------------------------------------------------
// Client-safe re-exports
// ---------------------------------------------------------------------------
//
// The bounty page + client bundle reach for the `Belt` type + the
// signed-entry shape — the types are erased at compile time, so the
// `export type` re-export below does NOT drag the WORM module into
// the client chunk. The runtime values (`BELT_TIERS`, `BELT_THRESHOLDS`,
// `resolveBeltForPoints`) are pure + dep-free and are safe to ship
// client-side.
//
// The `InMemoryBeltLedgerSource` class is NOT re-exported client-side —
// it transitively imports `node:crypto`. Client callers that need a
// data shape should import the types only via this file; they MUST NOT
// import the class constructor.

export type { Belt };
