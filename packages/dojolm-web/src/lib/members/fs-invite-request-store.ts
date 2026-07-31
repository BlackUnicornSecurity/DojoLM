// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/fs-invite-request-store.ts
 * Purpose: Epic 4B.7 S4B.7.2 — fs-JSON append-log persistent
 *          implementation of `MemberInviteRequestStore`.
 *
 * Design: mirrors `fs-invite-store.ts` byte-for-byte — same JSONL
 * append discipline, same 0o600 file mode, same 9 MB warn / 10 MB
 * refuse thresholds, same replay-on-boot / append-on-mutate
 * concurrency model. Operators can `cat` the file to inspect
 * request history the same way they `cat` the invite file.
 *
 * R-T2 defense: the on-disk file contains the caller-supplied
 * `email` + `why` fields verbatim (already validated at the route
 * layer — printable-ASCII + tab/newline subset, length ≤280). No
 * session tokens, no invite-code hashes, no signing keys ever
 * land in this file.
 *
 * Path non-disclosure: the resolved file path is server-side and
 * NEVER appears in any thrown error message, log line, or
 * response body (rule §16 — sanitized error logging).
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
  InviteRequestStoreError,
  type CreateInviteRequestInput,
  type InviteRequestStatus,
  type ListInviteRequestsOptions,
  type MemberInviteRequest,
  type MemberInviteRequestStore,
} from './invite-request-store';
import { randomBytes } from 'node:crypto';

/** 9 MB — warn-on-next-append threshold. */
export const FS_INVITE_REQUEST_SIZE_WARN_BYTES = 9 * 1024 * 1024;
/** 10 MB — refuse-next-append threshold (hard cap). */
export const FS_INVITE_REQUEST_SIZE_REFUSE_BYTES = 10 * 1024 * 1024;
/** 0o600 — owner-read-write-only mode for the on-disk log. */
export const FS_INVITE_REQUEST_FILE_MODE = 0o600;

function generateRequestId(): string {
  return `req-${randomBytes(6).toString('hex')}`;
}

/**
 * fs-JSON append-log invite-request store. Single instance per
 * process; the boot shim installs exactly one via
 * `setMemberInviteRequestStore(...)` when
 * `MEMBERS_PERSISTENT_STORAGE=true` or NODE_ENV === 'production'.
 */
export class FsInviteRequestStore implements MemberInviteRequestStore {
  private readonly filePath: string;
  private readonly requests = new Map<string, MemberInviteRequest>();
  private warnedOnSizeCap = false;

  constructor(opts: { readonly filePath: string }) {
    if (typeof opts?.filePath !== 'string' || opts.filePath.length === 0) {
      // Never include the attempted-path in the error — paths are
      // server-internal (rule §16).
      throw new Error('FsInviteRequestStore: filePath must be a non-empty string');
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
      appendFileSync(this.filePath, '', { mode: FS_INVITE_REQUEST_FILE_MODE });
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
      if (!isMemberInviteRequest(parsed)) continue;
      this.requests.set(parsed.id, Object.freeze({ ...parsed }));
    }
  }

  private appendRecord(record: MemberInviteRequest): void {
    // Hard-cap check — refuse writes past SIZE_REFUSE_BYTES. Size
    // check happens BEFORE the append so we never cross the cap.
    let currentBytes = 0;
    try {
      currentBytes = statSync(this.filePath).size;
    } catch {
      // File missing — will be created by appendFileSync; cap check
      // against 0 passes.
    }
    if (currentBytes >= FS_INVITE_REQUEST_SIZE_REFUSE_BYTES) {
      // Fixed message — never include the path or size (§16).
      throw new InviteRequestStoreError(
        'fs-invite-request-store log is full',
        'log-full',
      );
    }
    if (currentBytes >= FS_INVITE_REQUEST_SIZE_WARN_BYTES && !this.warnedOnSizeCap) {
      this.warnedOnSizeCap = true;
      // Log a fixed string — NEVER include the file path.
      // eslint-disable-next-line no-console
      console.warn(
        '[fs-invite-request-store] log size exceeded warn threshold — rotate before the hard cap is reached',
      );
    }
    const line = `${JSON.stringify(record)}\n`;
    appendFileSync(this.filePath, line, { mode: FS_INVITE_REQUEST_FILE_MODE });
  }

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
      status: 'pending' as InviteRequestStatus,
      dismissedAt: null,
      issuedAt: null,
      actorAdminId: null,
    });
    this.appendRecord(record);
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
      status: 'dismissed' as InviteRequestStatus,
      dismissedAt,
      actorAdminId: opts.actorAdminId,
    });
    this.appendRecord(updated);
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
      status: 'issued' as InviteRequestStatus,
      issuedAt,
      actorAdminId: opts.actorAdminId,
    });
    this.appendRecord(updated);
    this.requests.set(id, updated);
    return updated;
  }
}

function isMemberInviteRequest(value: unknown): value is MemberInviteRequest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.email === 'string' &&
    typeof v.why === 'string' &&
    typeof v.createdAt === 'string' &&
    (v.status === 'pending' || v.status === 'dismissed' || v.status === 'issued') &&
    (v.dismissedAt === null || typeof v.dismissedAt === 'string') &&
    (v.issuedAt === null || typeof v.issuedAt === 'string') &&
    (v.actorAdminId === null || typeof v.actorAdminId === 'string')
  );
}

