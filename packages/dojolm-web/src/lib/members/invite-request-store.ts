// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/invite-request-store.ts
 * Purpose: Epic 4B.7 S4B.7.2 — in-memory WORM-ish store for
 *          public-beta invite requests (unauthenticated submissions
 *          queued for admin review). Mirrors the
 *          `MemberInviteStore` shape from E4B.1/E4B.6 byte-for-byte:
 *          same swap-site setter + reader pattern, same terminal-
 *          state guard on status transitions, same frozen-record
 *          discipline.
 *
 * Security posture (R-T1 / R-T2 / §13):
 *   - There is NO invite code on this record. A request is advisory;
 *     the admin decides whether to mint a real invite via the
 *     existing `POST /api/admin/members/invites` path. R-T1
 *     raw-token safety is therefore N/A for the request surface.
 *   - The `why` field is operator-supplied free text, bounded
 *     server-side by the route schema (length ≤280, printable ASCII
 *     + tab/newline only, deny-list of markdown/HTML-ish chars). The
 *     store receives the already-validated text verbatim; the
 *     store itself does NOT re-validate — the route is the single
 *     validation boundary.
 *   - Every returned record is `Object.freeze`'d so downstream
 *     callers cannot mutate shared state.
 *
 * Lifecycle:
 *     pending -> dismissed   (admin dismiss click)
 *     pending -> issued      (admin issue-invite click fires the
 *                             existing POST then the mark-issued
 *                             transition)
 *   Terminal states never transition back. Attempting to dismiss
 *   an already-dismissed or already-issued request throws a fixed
 *   `InviteRequestStoreError` with code `'terminal-state'`.
 *
 * Persistent-store swap discipline (same as E4B.6 invite store):
 *   - `getMemberInviteRequestStore()` reads the live source.
 *   - `setMemberInviteRequestStore(next)` swaps the backing store
 *     at boot (or inside tests). E4B.7 boot shim installs
 *     `FsInviteRequestStore` under the persistent-storage gate.
 *   - `_resetMemberInviteRequestStoreForTests()` restores the
 *     in-memory default between vitest suites.
 */

import { randomBytes } from 'node:crypto';

export type InviteRequestStatus = 'pending' | 'dismissed' | 'issued';

export interface MemberInviteRequest {
  readonly id: string;
  readonly email: string;
  readonly why: string;
  readonly createdAt: string;
  readonly status: InviteRequestStatus;
  readonly dismissedAt: string | null;
  readonly issuedAt: string | null;
  readonly actorAdminId: string | null;
}

export interface CreateInviteRequestInput {
  readonly email: string;
  readonly why: string;
  readonly now?: () => Date;
}

export class InviteRequestStoreError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'duplicate-pending-request'
      | 'not-found'
      | 'terminal-state'
      | 'log-full',
  ) {
    super(message);
    this.name = 'InviteRequestStoreError';
  }
}

/**
 * Query options for `MemberInviteRequestStore.listRequests`. Mirrors
 * the `ListInvitesOptions` shape on the invite store — same status
 * filter discipline (`'all'` as the explicit opt-in for cross-status
 * sweeps), same limit/offset pagination.
 */
export interface ListInviteRequestsOptions {
  readonly status?: InviteRequestStatus | 'all';
  readonly limit: number;
  readonly offset: number;
}

export interface MemberInviteRequestStore {
  createRequest(input: CreateInviteRequestInput): MemberInviteRequest;
  getRequestById(id: string): MemberInviteRequest | null;
  /**
   * Return a frozen, oldest-first slice of requests matching the
   * filter. Backends MUST NOT cache a per-caller view — the admin
   * tab re-fetches on poll + refresh and expects fresh data.
   */
  listRequests(opts: ListInviteRequestsOptions): readonly MemberInviteRequest[];
  markDismissed(
    id: string,
    opts: { readonly actorAdminId: string; readonly now?: () => Date },
  ): MemberInviteRequest;
  markIssued(
    id: string,
    opts: { readonly actorAdminId: string; readonly now?: () => Date },
  ): MemberInviteRequest;
}

function generateRequestId(): string {
  return `req-${randomBytes(6).toString('hex')}`;
}

/**
 * In-memory default. Process-local Map — same shape as
 * `InMemoryMemberInviteStore`. Fine for the beta-cohort scale; a
 * persistent backend (`FsInviteRequestStore`) takes over under the
 * same env gate that swaps the invite store.
 *
 * R-T1: every returned record is frozen; callers never receive a
 * mutable reference into the internal Map.
 */
export class InMemoryMemberInviteRequestStore implements MemberInviteRequestStore {
  private readonly requests = new Map<string, MemberInviteRequest>();

  private hasPendingWithEmail(email: string): boolean {
    for (const row of this.requests.values()) {
      if (row.status === 'pending' && row.email === email) return true;
    }
    return false;
  }

  createRequest(input: CreateInviteRequestInput): MemberInviteRequest {
    if (this.hasPendingWithEmail(input.email)) {
      throw new InviteRequestStoreError(
        'invite request already pending for email',
        'duplicate-pending-request',
      );
    }
    const id = generateRequestId();
    const timestamp = (input.now?.() ?? new Date()).toISOString();
    const record: MemberInviteRequest = Object.freeze({
      id,
      email: input.email,
      why: input.why,
      createdAt: timestamp,
      status: 'pending',
      dismissedAt: null,
      issuedAt: null,
      actorAdminId: null,
    });
    this.requests.set(id, record);
    return record;
  }

  getRequestById(id: string): MemberInviteRequest | null {
    return this.requests.get(id) ?? null;
  }

  listRequests(opts: ListInviteRequestsOptions): readonly MemberInviteRequest[] {
    const statusFilter = opts.status;
    const wantAll = statusFilter === undefined || statusFilter === 'all';
    const matches: MemberInviteRequest[] = [];
    for (const row of this.requests.values()) {
      if (!wantAll && row.status !== statusFilter) continue;
      matches.push(row);
    }
    // Oldest-first — identical ordering to `InMemoryMemberInviteStore`.
    // ISO-8601 timestamps sort lexicographically at ms precision; id
    // is the stable tiebreaker for same-ms creations.
    matches.sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });
    const start = Math.max(0, opts.offset);
    const end = start + Math.max(0, opts.limit);
    return Object.freeze(matches.slice(start, end));
  }

  markDismissed(
    id: string,
    opts: { readonly actorAdminId: string; readonly now?: () => Date },
  ): MemberInviteRequest {
    const row = this.requests.get(id);
    if (!row) {
      throw new InviteRequestStoreError('invite request not found', 'not-found');
    }
    if (row.status !== 'pending') {
      throw new InviteRequestStoreError(
        'invite request is in a terminal state',
        'terminal-state',
      );
    }
    const dismissedAt = (opts.now?.() ?? new Date()).toISOString();
    const updated: MemberInviteRequest = Object.freeze({
      ...row,
      status: 'dismissed',
      dismissedAt,
      actorAdminId: opts.actorAdminId,
    });
    this.requests.set(id, updated);
    return updated;
  }

  markIssued(
    id: string,
    opts: { readonly actorAdminId: string; readonly now?: () => Date },
  ): MemberInviteRequest {
    const row = this.requests.get(id);
    if (!row) {
      throw new InviteRequestStoreError('invite request not found', 'not-found');
    }
    if (row.status !== 'pending') {
      throw new InviteRequestStoreError(
        'invite request is in a terminal state',
        'terminal-state',
      );
    }
    const issuedAt = (opts.now?.() ?? new Date()).toISOString();
    const updated: MemberInviteRequest = Object.freeze({
      ...row,
      status: 'issued',
      issuedAt,
      actorAdminId: opts.actorAdminId,
    });
    this.requests.set(id, updated);
    return updated;
  }

  /** Test-only — clear the in-memory Map. */
  _resetForTests(): void {
    this.requests.clear();
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton + swap site (E4B.7 S4B.7.2 integration seam)
// ---------------------------------------------------------------------------
//
// Mirrors the E4B.6 invite-store swap site. Route handlers read the
// live source on every request so a boot-shim swap is observable
// immediately.

let currentStore: MemberInviteRequestStore = new InMemoryMemberInviteRequestStore();

export function getMemberInviteRequestStore(): MemberInviteRequestStore {
  return currentStore;
}

export function setMemberInviteRequestStore(next: MemberInviteRequestStore): void {
  currentStore = next;
}

/** Test-only — restore the default in-memory store between suites. */
export function _resetMemberInviteRequestStoreForTests(): void {
  currentStore = new InMemoryMemberInviteRequestStore();
}
