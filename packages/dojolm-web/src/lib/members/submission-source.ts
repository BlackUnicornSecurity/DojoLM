// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/submission-source.ts
 * Purpose: Epic 4B.3 S4B.3.1 — `MemberSubmissionSource` interface + default
 *          empty-list implementation.
 *
 * Sibling of `score-source.ts` (E4B.2): the two data sources are
 * independent — one feeds the `/api/members/leaderboard` endpoint, the
 * other feeds `/api/members/leaderboard/bypass-matrix`. E4B.5 will swap
 * in ledger-backed implementations of BOTH interfaces when the point
 * ledger + per-submission WORM store land.
 *
 * This module is the E4B.5 integration seam for the bypass-matrix
 * surface. Once the per-submission WORM store lands, a new
 * `MemberSubmissionSource` implementation (backed by the WORM store)
 * swaps in via `setMemberSubmissionSource()` at module init. The
 * `/api/members/leaderboard/bypass-matrix` route reads the current
 * source via `getMemberSubmissionSource()` — it never imports the
 * concrete class directly, so replacing the default is a one-liner.
 *
 * Lifecycle note: there is NO schema, migration, or submission write in
 * E4B.3. The default `InMemorySubmissionSource.listSubmissions` returns
 * an empty list; the matrix page renders the empty-state copy until
 * E4B.5 flips the factory.
 */

import type { BypassSubmission } from 'bu-tpi/catalog';

export type { BypassSubmission };

export interface ListSubmissionsOpts {
  readonly season: string;
  /**
   * Authenticated caller's user id, or null when the source does not
   * need it.
   *
   * **Contract (cross-member isolation — decision #4/#6):** `viewerId`
   * is consumed ONLY to scope the source's internal authorization
   * check that the caller is a valid member. It MUST NOT filter or
   * annotate the returned list with viewer-specific content. Two calls
   * with the same `season` and different `viewerId` values MUST
   * produce byte-identical submission lists. The aggregate matrix
   * computed from those submissions is viewer-independent by
   * construction — `buildBypassMatrix` never receives `viewerId`.
   * The route caches the resulting matrix by `season` only, so a
   * source implementation that tainted the list with `viewerId` would
   * silently serve one member's view to every caller until the TTL
   * expired. E4B.5's WORM-backed source MUST uphold this invariant.
   */
  readonly viewerId: string | null;
  /**
   * Optional cancellation signal. The current `InMemorySubmissionSource`
   * ignores it (synchronous empty-list return). E4B.5's WORM-backed
   * source SHOULD honour it and abort the underlying I/O call when
   * the route's request lifecycle ends — this keeps a stalled source
   * from pinning connections indefinitely. The field is optional so
   * the route can wire `AbortSignal.timeout(N)` in a later hardening
   * pass without an interface-breaking change on this sub-epic.
   */
  readonly signal?: AbortSignal;
}

export interface MemberSubmissionSource {
  /**
   * See `ListSubmissionsOpts.viewerId` for the cross-member isolation
   * contract that every implementation must honour.
   */
  listSubmissions(opts: ListSubmissionsOpts): Promise<readonly BypassSubmission[]>;
}

/**
 * Default in-memory source. Returns an empty list regardless of
 * season or viewerId.
 *
 * This is the SHIPPED implementation for E4B.3. E4B.5 swaps it out
 * for a WORM-backed source via `setMemberSubmissionSource()`.
 */
export class InMemorySubmissionSource implements MemberSubmissionSource {
  async listSubmissions(_opts: ListSubmissionsOpts): Promise<readonly BypassSubmission[]> {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton + swap site
// ---------------------------------------------------------------------------
//
// E4B.5 integration seam: a new WORM-backed implementation calls
// `setMemberSubmissionSource(new WormSubmissionSource(...))` at module
// init (for example from a server bootstrap hook). The route reads
// the live source via `getMemberSubmissionSource()` on every request
// so a mid-process swap is observable immediately.

let currentSource: MemberSubmissionSource = new InMemorySubmissionSource();

export function getMemberSubmissionSource(): MemberSubmissionSource {
  return currentSource;
}

export function setMemberSubmissionSource(next: MemberSubmissionSource): void {
  currentSource = next;
}

/** Test-only: restore the default empty-list source between suites. */
export function _resetMemberSubmissionSourceForTests(): void {
  currentSource = new InMemorySubmissionSource();
}
