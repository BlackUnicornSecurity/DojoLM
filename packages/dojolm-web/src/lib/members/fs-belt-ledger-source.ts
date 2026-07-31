// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/fs-belt-ledger-source.ts
 * Purpose: Epic 4B.6 S4B.6.2 — fs-JSON append-log persistent
 *          implementation of `MemberBeltLedgerSource`.
 *
 * R-T3 WORM invariant (decision #11 — the R-T3 contract is the
 * "belt-ledger never reshapes" test that the persistent adapter
 * inherits byte-for-byte from `InMemoryBeltLedgerSource`):
 *
 *   - **Append-only.** The only mutation is `appendPromotion`, which
 *     writes ONE newline-terminated `SignedBeltLedgerEntry` record to
 *     the end of the log file. No UPDATE path. No DELETE path.
 *   - **Chain signing happens BEFORE disk.** `hashEntry(body, prev, key)`
 *     runs in-memory; the fully-signed `SignedBeltLedgerEntry`
 *     (including `previousHash` + `entryHash`) is what lands on disk.
 *     The signing key NEVER touches the file.
 *   - **Verifiable from raw file dump.** An operator with `cat` +
 *     the signing key can re-run `verifyChain` against the file
 *     contents and detect any single-byte tamper. The on-disk
 *     format is a stable JSONL stream — no framing, no compression,
 *     no binary encoding.
 *   - **Entry shape identical to E4B.5.** The persistent adapter
 *     stores the SAME `SignedBeltLedgerEntry` shape the in-memory
 *     default uses. A future `setMemberBeltLedgerSource(new FsBeltLedgerSource(...))`
 *     swap in production reads the same rows every test fixture
 *     writes today.
 *
 * Concurrency posture matches `fs-invite-store.ts`: single-node
 * topology, single-threaded Node event loop, synchronous
 * `appendFileSync` — no interleaving window between writes.
 *
 * File mode is 0o600 — owner-read-write-only — so other Unix users
 * on the same host cannot read the ledger. The signing key still
 * lives ONLY in `process.env.BELT_LEDGER_SIGNING_KEY` (or the dev
 * fallback when non-production) — never on disk.
 *
 * The adapter does NOT enforce a size cap on the ledger (unlike the
 * invite store): the belt ledger is an append-only audit chain by
 * design; an operator rotating or archiving the file would break the
 * chain-pointer continuity. A future sub-epic can introduce
 * chain-segment archival (write a "carry-over" entry, start a new
 * file), but E4B.6 keeps the single-file model.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import * as path from 'node:path';
import type { Belt } from '@/design/arena/BeltDisc';
import {
  BELT_TIERS,
  type BeltLedgerEntry,
  type MemberBeltLedgerSource,
  type SignedBeltLedgerEntry,
} from './belt-ledger-source';
import {
  getBeltLedgerSigningKey,
  hashEntry,
  type CanonicalEntryBody,
} from './belt-ledger-worm';

/** 0o600 — owner-read-write-only mode for the on-disk ledger. */
export const FS_BELT_LEDGER_FILE_MODE = 0o600;

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
 * fs-JSON append-log belt-ledger source. Single instance per process;
 * the boot shim installs exactly one via `setMemberBeltLedgerSource(...)`
 * when `MEMBERS_PERSISTENT_STORAGE=true` or NODE_ENV === 'production'.
 *
 * The constructor streams the whole file into an in-memory array
 * (order preserved — append-log is implicitly sorted by wall-clock)
 * and precomputes nothing; each read walks the array fresh. For
 * beta-cohort scales (hundreds of promotions) the linear scan is
 * cheap.
 */
export class FsBeltLedgerSource implements MemberBeltLedgerSource {
  private readonly filePath: string;
  private entries: readonly SignedBeltLedgerEntry[] = [];

  constructor(opts: { readonly filePath: string }) {
    if (typeof opts?.filePath !== 'string' || opts.filePath.length === 0) {
      throw new Error('FsBeltLedgerSource: filePath must be a non-empty string');
    }
    this.filePath = opts.filePath;
    this.ensureFile();
    this.replay();
  }

  private ensureFile(): void {
    const dir = path.dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
    if (!existsSync(this.filePath)) {
      appendFileSync(this.filePath, '', { mode: FS_BELT_LEDGER_FILE_MODE });
    }
  }

  private replay(): void {
    const raw = readFileSync(this.filePath, 'utf8');
    if (raw.length === 0) {
      this.entries = Object.freeze([]);
      return;
    }
    const lines = raw.split('\n');
    const rebuilt: SignedBeltLedgerEntry[] = [];
    for (const line of lines) {
      if (line.length === 0) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        // Corrupt line — skip. The ledger's verify endpoint will
        // catch the missing chain link and report it.
        continue;
      }
      if (!isSignedBeltLedgerEntry(parsed)) continue;
      // Freeze each entry — callers never mutate shared state.
      rebuilt.push(Object.freeze({ ...parsed }));
    }
    this.entries = Object.freeze(rebuilt);
  }

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

  async listAllEntries(): Promise<readonly SignedBeltLedgerEntry[]> {
    return this.entries;
  }

  async getTierDistribution(): Promise<Readonly<Record<Belt, number>>> {
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
    if (
      typeof entry.totalPointsAtPromotion !== 'number' ||
      !Number.isFinite(entry.totalPointsAtPromotion) ||
      entry.totalPointsAtPromotion < 0
    ) {
      throw new Error(
        'appendPromotion: totalPointsAtPromotion must be a non-negative finite number',
      );
    }
    if (tierIndex(entry.toBelt) <= tierIndex(entry.fromBelt)) {
      throw new Error(
        `appendPromotion: toBelt (${entry.toBelt}) must outrank fromBelt (${entry.fromBelt})`,
      );
    }
    const priorForUser = this.entries.filter((e) => e.userId === entry.userId);
    const maxSeq = priorForUser.reduce(
      (m, e) => (e.sequence > m ? e.sequence : m),
      0,
    );
    if (entry.sequence <= maxSeq) {
      throw new Error(
        `appendPromotion: sequence (${entry.sequence}) must exceed prior max (${maxSeq}) for user`,
      );
    }

    const tail =
      this.entries.length === 0
        ? null
        : this.entries[this.entries.length - 1];
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

    // Append-only disk write — the record is fully signed before it
    // hits the file. Chain-pointer continuity is preserved because
    // `previousHash` pinned on the `tail` observation above, and
    // Node's single-threaded event loop guarantees no interleaving
    // write can sneak in between `tail` capture and this append.
    const line = `${JSON.stringify(signed)}\n`;
    appendFileSync(this.filePath, line, { mode: FS_BELT_LEDGER_FILE_MODE });

    // Immutability: assign a new array rather than mutating in place.
    this.entries = Object.freeze([...this.entries, signed]);
    return signed;
  }
}

function isSignedBeltLedgerEntry(value: unknown): value is SignedBeltLedgerEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.userId !== 'string' || v.userId.length === 0) return false;
  if (typeof v.promotedAt !== 'string') return false;
  if (typeof v.fromBelt !== 'string') return false;
  if (typeof v.toBelt !== 'string') return false;
  if (typeof v.totalPointsAtPromotion !== 'number') return false;
  if (typeof v.sequence !== 'number') return false;
  if (v.previousHash !== null && typeof v.previousHash !== 'string') return false;
  if (typeof v.entryHash !== 'string') return false;
  return true;
}
