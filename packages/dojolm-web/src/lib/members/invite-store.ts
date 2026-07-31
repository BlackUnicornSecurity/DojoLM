// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/invite-store.ts
 * Purpose: E4B.1 S4B.1.1 (original) + E4B.6 S4B.6.1 (interface refactor)
 *          — in-memory WORM-ish store for member invite records.
 *          Append-only + immutable — every status transition replaces
 *          the record with a freshly-built object so the discipline
 *          matches the onigaeshi engagement store pattern.
 *
 * The raw invite code is NEVER stored. Only its SHA-256 hash lands
 * here (R-T3 — single-use, email-bound; defense-in-depth at rest).
 *
 * Lifecycle:
 *    pending -> consumed  (magic-link GET path)
 *    pending -> revoked   (admin revoke; no HTTP surface ships in E4B.6)
 * Terminal states never transition back.
 *
 * E4B.6 S4B.6.1 — interface + swap-site refactor (additive).
 *
 *   - `MemberInviteStore` interface declares the public surface every
 *     backend must satisfy.
 *   - `InMemoryMemberInviteStore` wraps the original module-level Map
 *     into a class; semantics are byte-identical to E4B.1.
 *   - `getMemberInviteStore()` / `setMemberInviteStore(next)` /
 *     `_resetMemberInviteStoreForTests()` mirror the swap-site pattern
 *     that `belt-ledger-source.ts` already uses — E4B.6 swap site:
 *     call `setMemberInviteStore(new FsInviteStore(...))` or
 *     `setMemberInviteStore(new SqliteInviteStore(...))` at app boot
 *     in production.
 *   - The six existing named-function exports (`createInvite`,
 *     `getInviteById`, `findPendingByCodeHash`, `findAnyByCodeHash`,
 *     `markInviteConsumed`, `_resetInviteStoreForTests`) stay as thin
 *     delegates that read the active source via
 *     `getMemberInviteStore()`. Every existing caller (admin POST
 *     route, magic-link redemption route, route + e2e tests) keeps
 *     working without edits.
 *   - `listInvites(opts)` is a new method on the interface (needed by
 *     the E4B.6 GET list endpoint); it is NOT re-exported as a named
 *     function because there is no pre-existing caller.
 *
 * Shape-stable surfaces (brief §S4B.6.1 "Do NOT change the shape"):
 *   - `MemberInvite`, `CreateInviteInput`, `InviteStoreError` stay
 *     byte-identical to E4B.1.
 */

import { randomBytes } from 'node:crypto';

export type InviteStatus = 'pending' | 'consumed' | 'revoked';

export interface MemberInvite {
  readonly id: string;
  readonly email: string;
  readonly handle: string;
  readonly inviteCodeHash: string;
  readonly status: InviteStatus;
  readonly createdAt: string;
  readonly consumedAt: string | null;
  readonly revokedAt: string | null;
  readonly actorAdminId: string;
}

export interface CreateInviteInput {
  readonly email: string;
  readonly handle: string;
  readonly inviteCodeHash: string;
  readonly actorAdminId: string;
  readonly now?: () => Date;
}

export class InviteStoreError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'duplicate-handle'
      | 'duplicate-email'
      | 'not-found'
      | 'terminal-state',
  ) {
    super(message);
    this.name = 'InviteStoreError';
  }
}

/**
 * Query options for `MemberInviteStore.listInvites`. A narrow status
 * filter (`'pending' | 'consumed' | 'revoked'`) keeps the common admin
 * flow (show me pending invites) concise; `'all'` is the explicit
 * opt-in for cross-status sweeps. `limit` / `offset` mirror the
 * pagination discipline of every other /members list endpoint.
 */
export interface ListInvitesOptions {
  readonly status?: InviteStatus | 'all';
  readonly limit: number;
  readonly offset: number;
}

/**
 * Public surface every invite-store backend must satisfy. E4B.6 ships
 * two implementations: the original in-memory default + a persistent
 * fs-JSON append-log adapter (`fs-invite-store.ts`). Backends MUST
 * return frozen records so callers never mutate shared state.
 */
export interface MemberInviteStore {
  createInvite(input: CreateInviteInput): MemberInvite;
  getInviteById(id: string): MemberInvite | null;
  /** Pending-only lookup — never returns a consumed / revoked row. */
  findPendingByCodeHash(codeHash: string): MemberInvite | null;
  /** Any-status lookup — collapses the 404/410 disambiguation. */
  findAnyByCodeHash(codeHash: string): MemberInvite | null;
  markInviteConsumed(id: string, opts?: { readonly now?: () => Date }): MemberInvite;
  /**
   * Return a frozen, oldest-first slice of invites matching the filter.
   * Defaults to `status: 'pending'` at the caller layer — the interface
   * keeps `status` optional so backends do not ship a default.
   */
  listInvites(opts: ListInvitesOptions): readonly MemberInvite[];
}

function generateInviteId(): string {
  return `inv-${randomBytes(6).toString('hex')}`;
}

/**
 * In-memory default. Process-local Map + O(n) scan — fine for the
 * beta-cohort size (hundreds of invites) and keeps the discipline
 * byte-identical to E4B.1. A future persistent backend (fs-JSON
 * append-log or SQLite) is installed via `setMemberInviteStore(...)`.
 *
 * R-T1: every returned record is frozen; callers never receive a
 * mutable reference into the internal Map.
 */
export class InMemoryMemberInviteStore implements MemberInviteStore {
  private readonly invites = new Map<string, MemberInvite>();

  private hasPendingWithHandle(handle: string): boolean {
    for (const row of this.invites.values()) {
      if (row.status === 'pending' && row.handle === handle) return true;
    }
    return false;
  }

  private hasPendingWithEmail(email: string): boolean {
    for (const row of this.invites.values()) {
      if (row.status === 'pending' && row.email === email) return true;
    }
    return false;
  }

  createInvite(input: CreateInviteInput): MemberInvite {
    if (this.hasPendingWithEmail(input.email)) {
      throw new InviteStoreError('invite already pending for email', 'duplicate-email');
    }
    if (this.hasPendingWithHandle(input.handle)) {
      throw new InviteStoreError('invite already pending for handle', 'duplicate-handle');
    }
    const id = generateInviteId();
    const timestamp = (input.now?.() ?? new Date()).toISOString();
    const record: MemberInvite = Object.freeze({
      id,
      email: input.email,
      handle: input.handle,
      inviteCodeHash: input.inviteCodeHash,
      status: 'pending',
      createdAt: timestamp,
      consumedAt: null,
      revokedAt: null,
      actorAdminId: input.actorAdminId,
    });
    this.invites.set(id, record);
    return record;
  }

  getInviteById(id: string): MemberInvite | null {
    return this.invites.get(id) ?? null;
  }

  findPendingByCodeHash(codeHash: string): MemberInvite | null {
    for (const row of this.invites.values()) {
      if (row.inviteCodeHash === codeHash && row.status === 'pending') return row;
    }
    return null;
  }

  findAnyByCodeHash(codeHash: string): MemberInvite | null {
    for (const row of this.invites.values()) {
      if (row.inviteCodeHash === codeHash) return row;
    }
    return null;
  }

  markInviteConsumed(
    id: string,
    opts?: { readonly now?: () => Date },
  ): MemberInvite {
    const row = this.invites.get(id);
    if (!row) throw new InviteStoreError('invite not found', 'not-found');
    if (row.status !== 'pending') {
      throw new InviteStoreError('invite is in a terminal state', 'terminal-state');
    }
    const consumedAt = (opts?.now?.() ?? new Date()).toISOString();
    // Immutable update — build a new record rather than mutating.
    const updated: MemberInvite = Object.freeze({ ...row, status: 'consumed', consumedAt });
    this.invites.set(id, updated);
    return updated;
  }

  listInvites(opts: ListInvitesOptions): readonly MemberInvite[] {
    const statusFilter = opts.status;
    const wantAll = statusFilter === undefined || statusFilter === 'all';
    const matches: MemberInvite[] = [];
    for (const row of this.invites.values()) {
      if (!wantAll && row.status !== statusFilter) continue;
      matches.push(row);
    }
    // Deterministic oldest-first ordering — `createdAt` is an ISO-8601
    // string, lexicographic sort matches chronological order at the
    // millisecond precision `new Date().toISOString()` emits. A stable
    // secondary sort on `id` handles same-millisecond ties.
    matches.sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });
    const start = Math.max(0, opts.offset);
    const end = start + Math.max(0, opts.limit);
    return Object.freeze(matches.slice(start, end));
  }

  /** Test-only — clear the in-memory Map. */
  _resetForTests(): void {
    this.invites.clear();
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton + swap site (E4B.6 S4B.6.1 integration seam)
// ---------------------------------------------------------------------------
//
// E4B.6 swaps the in-memory default for a persistent-storage
// implementation via `setMemberInviteStore(new FsInviteStore(...))`
// at server bootstrap. The route reads the live source via
// `getMemberInviteStore()` on every request so a mid-process swap
// is observable immediately. The gating discipline lives on the boot
// shim (`src/app/_members-persistent-storage.ts`) — NODE_ENV === 'production'
// OR MEMBERS_PERSISTENT_STORAGE === 'true'.

let currentStore: MemberInviteStore = new InMemoryMemberInviteStore();

export function getMemberInviteStore(): MemberInviteStore {
  return currentStore;
}

export function setMemberInviteStore(next: MemberInviteStore): void {
  currentStore = next;
}

/** Test-only — restore the default in-memory store between suites. */
export function _resetMemberInviteStoreForTests(): void {
  currentStore = new InMemoryMemberInviteStore();
}

// ---------------------------------------------------------------------------
// Backward-compatible named-function delegates (E4B.1 surface)
// ---------------------------------------------------------------------------
//
// Every existing caller (admin POST route, magic-link redemption
// route, invite-store route tests) imports these as named functions.
// S4B.6.1 keeps them working unchanged by reading the live source on
// every call. Do NOT remove, rename, or alter the signatures — the
// E4B.1 contract is frozen.

export function createInvite(input: CreateInviteInput): MemberInvite {
  return currentStore.createInvite(input);
}

export function getInviteById(id: string): MemberInvite | null {
  return currentStore.getInviteById(id);
}

export function findPendingByCodeHash(codeHash: string): MemberInvite | null {
  return currentStore.findPendingByCodeHash(codeHash);
}

export function findAnyByCodeHash(codeHash: string): MemberInvite | null {
  return currentStore.findAnyByCodeHash(codeHash);
}

export function markInviteConsumed(
  id: string,
  opts?: { readonly now?: () => Date },
): MemberInvite {
  return currentStore.markInviteConsumed(id, opts);
}

/**
 * Test-only reset helper. Production code MUST NOT call this.
 * Route + e2e suites call it in `beforeEach` to isolate the in-memory
 * state across specs — the store is process-scoped and otherwise
 * survives between tests. The name is preserved for back-compat with
 * every test that imports it today; internally it restores the
 * default in-memory store via `_resetMemberInviteStoreForTests`.
 */
export function _resetInviteStoreForTests(): void {
  _resetMemberInviteStoreForTests();
}
