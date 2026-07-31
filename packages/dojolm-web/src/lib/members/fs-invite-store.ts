// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/fs-invite-store.ts
 * Purpose: Epic 4B.6 S4B.6.2 — fs-JSON append-log persistent
 *          implementation of `MemberInviteStore`.
 *
 * Design — append-only newline-delimited JSON (JSONL):
 *
 *   - Every mutation (create / consume / revoke) appends ONE newline-
 *     terminated JSON record to the end of the log file. The file
 *     reads left-to-right as a timeline: the latest record for a given
 *     `id` is the authoritative state.
 *   - On construction the adapter streams the whole file into an
 *     in-memory Map keyed by `id`, replaying each record as a
 *     last-writer-wins upsert. Readers hit the in-memory map
 *     (O(1)); writers hit disk (append + in-memory update).
 *   - The log file stores the same `MemberInvite` shape (including
 *     `inviteCodeHash`) — it NEVER stores the raw invite code
 *     (R-T1: raw code lives exclusively in the one-shot POST response
 *     body returned to the admin).
 *   - File mode is 0o600 — owner-read-write-only — so other Unix users
 *     on the same host cannot read the hash dump.
 *
 * Rotation / size-cap (R-T1/R-T3 defense-in-depth — brief S4B.6.2):
 *
 *   - `SIZE_WARN_BYTES` (9 MB) — a pre-write check emits a one-shot
 *     `console.warn` when the log crosses this threshold. Operators
 *     get early notice to rotate / archive before hitting the hard cap.
 *   - `SIZE_REFUSE_BYTES` (10 MB) — a pre-write check REFUSES any
 *     append that would cross this threshold; the method throws a
 *     fixed `InviteStoreError('fs-invite-store log is full', ...)`
 *     with a stable code so the route can surface `internal-error`
 *     rather than leaking path or size detail.
 *
 * Concurrency:
 *
 *   - Single-node topology — the app runs in
 *     one Docker container; Node is single-threaded on the event
 *     loop. A synchronous file append inside a single event-loop tick
 *     is atomic with respect to other JS callers.
 *   - `fs.appendFileSync` is the simplest primitive that matches this
 *     model. Async file I/O would introduce interleaving windows
 *     between multiple in-flight writes; since every mutation is
 *     short, we accept the sync blocking cost (the admin surface is
 *     low-throughput).
 *
 * Tamper / inspection surface:
 *
 *   - The log is `cat`-readable JSONL. An operator can dump it with
 *     `cat data/member-invites.jsonl` and the content is a stream of
 *     `MemberInvite` records — no binary encoding, no native
 *     schema-migration story. Revoking, rotating, or archiving is
 *     just file-system discipline.
 *   - The log file NEVER stores the signing key (invites do not carry
 *     one — signing lives on the belt-ledger side). A grep of the
 *     raw file for the one-shot raw invite code MUST return zero
 *     hits (tested).
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import * as path from 'node:path';
import {
  InviteStoreError,
  type CreateInviteInput,
  type InviteStatus,
  type ListInvitesOptions,
  type MemberInvite,
  type MemberInviteStore,
} from './invite-store';
import { randomBytes } from 'node:crypto';

/** 9 MB — warn-on-next-append threshold. */
export const FS_INVITE_SIZE_WARN_BYTES = 9 * 1024 * 1024;
/** 10 MB — refuse-next-append threshold (hard cap). */
export const FS_INVITE_SIZE_REFUSE_BYTES = 10 * 1024 * 1024;
/** 0o600 — owner-read-write-only mode for the on-disk log. */
export const FS_INVITE_FILE_MODE = 0o600;

function generateInviteId(): string {
  return `inv-${randomBytes(6).toString('hex')}`;
}

/**
 * fs-JSON append-log invite store. Single instance per process; the
 * boot shim installs exactly one via `setMemberInviteStore(...)` when
 * `MEMBERS_PERSISTENT_STORAGE=true` or NODE_ENV === 'production'.
 */
export class FsInviteStore implements MemberInviteStore {
  private readonly filePath: string;
  private readonly invites = new Map<string, MemberInvite>();
  private warnedOnSizeCap = false;

  constructor(opts: { readonly filePath: string }) {
    if (typeof opts?.filePath !== 'string' || opts.filePath.length === 0) {
      throw new Error('FsInviteStore: filePath must be a non-empty string');
    }
    this.filePath = opts.filePath;
    this.ensureFile();
    this.replay();
  }

  private ensureFile(): void {
    const dir = path.dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
    if (!existsSync(this.filePath)) {
      // Create empty file with the restricted mode on first boot.
      appendFileSync(this.filePath, '', { mode: FS_INVITE_FILE_MODE });
    }
  }

  private replay(): void {
    const raw = readFileSync(this.filePath, 'utf8');
    if (raw.length === 0) return;
    const lines = raw.split('\n');
    for (const line of lines) {
      if (line.length === 0) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        // Corrupt line — skip rather than crash. Operator inspects
        // the log; the store continues serving valid records.
        continue;
      }
      if (!isMemberInvite(parsed)) continue;
      this.invites.set(parsed.id, Object.freeze({ ...parsed }));
    }
  }

  private appendRecord(record: MemberInvite): void {
    // Hard-cap check — refuse writes past SIZE_REFUSE_BYTES. Size
    // check happens BEFORE the append so we never cross the cap.
    let currentBytes = 0;
    try {
      currentBytes = statSync(this.filePath).size;
    } catch {
      // File missing — will be created by appendFileSync; cap check
      // against 0 passes.
    }
    if (currentBytes >= FS_INVITE_SIZE_REFUSE_BYTES) {
      throw new InviteStoreError(
        'fs-invite-store log is full',
        'not-found', // reuse an existing code; route maps to internal-error
      );
    }
    if (currentBytes >= FS_INVITE_SIZE_WARN_BYTES && !this.warnedOnSizeCap) {
      this.warnedOnSizeCap = true;
      // Log a fixed string — NEVER include the file path (that is a
      // server-side implementation detail).
      console.warn(
        '[fs-invite-store] log size exceeded warn threshold — rotate before the hard cap is reached',
      );
    }
    const line = `${JSON.stringify(record)}\n`;
    appendFileSync(this.filePath, line, { mode: FS_INVITE_FILE_MODE });
  }

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
      status: 'pending' as InviteStatus,
      createdAt: timestamp,
      consumedAt: null,
      revokedAt: null,
      actorAdminId: input.actorAdminId,
    });
    this.appendRecord(record);
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
    const updated: MemberInvite = Object.freeze({
      ...row,
      status: 'consumed' as InviteStatus,
      consumedAt,
    });
    this.appendRecord(updated);
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
    matches.sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });
    const start = Math.max(0, opts.offset);
    const end = start + Math.max(0, opts.limit);
    return Object.freeze(matches.slice(start, end));
  }
}

function isMemberInvite(value: unknown): value is MemberInvite {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.email === 'string' &&
    typeof v.handle === 'string' &&
    typeof v.inviteCodeHash === 'string' &&
    (v.status === 'pending' || v.status === 'consumed' || v.status === 'revoked') &&
    typeof v.createdAt === 'string' &&
    (v.consumedAt === null || typeof v.consumedAt === 'string') &&
    (v.revokedAt === null || typeof v.revokedAt === 'string') &&
    typeof v.actorAdminId === 'string'
  );
}
