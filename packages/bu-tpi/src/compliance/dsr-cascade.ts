// SPDX-License-Identifier: Apache-2.0
/**
 * DSR cascade orchestrator (R-X4 / GDPR Art. 17 / issue #134).
 *
 * Drives the end-to-end Data Subject Request flow across the 6
 * `DsrDataClass` partitions. Each partition has its own store adapter —
 * this module owns only the orchestration + audit semantics; Phase E
 * supplies Postgres adapters that back the in-memory reference ones
 * shipped here.
 *
 * Action mapping (plan §0.3 / R-X4):
 *   HydraTranscript       → deleted        (keep hash on approved entries)
 *   Match                 → deleted
 *   ProbeOutcome          → deleted
 *   CommunitySubmission   → deleted        (hash-only on approved kept)
 *   BudgetLedger          → pseudonymised  (retain 7y; PII → user-hash)
 *   OnigaeshiAuditRecord  → pseudonymised  (retain 7y; PII → user-hash)
 *
 * DSR type = 'export' invokes the export variant on each store. A store
 * that does not support export is treated as `skipped` in the result
 * (export is intentionally partial until Phase E).
 */

import { createHmac, randomUUID } from 'node:crypto';
import type { DsrClassResult, DsrDataClass, DsrType } from './dsr.js';

/**
 * Thrown when the cascade is invoked without a pseudonymisation key.
 *
 * The DSR pseudonymisation contract is HMAC-SHA-256 keyed (PR-E3 / #134) —
 * SHA-256 alone is reversible by enumeration over a known userId namespace,
 * which fails GDPR Recital 26's "additional information kept separately"
 * test. The dojolm-web factory reads `DSR_PSEUDONYM_HMAC_KEY` from env and
 * passes it through to `runDsrCascade`; missing key → this error fires
 * before any audit/data row is written.
 */
export class DsrPseudonymKeyMissingError extends Error {
  readonly code = 'DSR.PSEUDONYM.KEY_MISSING' as const;
  constructor() {
    super(
      'DSR cascade requires a pseudonymisation key. ' +
        'Pass `pseudonymKey` to runDsrCascade() / InMemoryDsrService.',
    );
    this.name = 'DsrPseudonymKeyMissingError';
  }
}

/**
 * Thrown by `runDsrCascade` when a per-class store throws partway through
 * the loop. Carries the `DsrClassResult`s for the classes that completed
 * before the abort so the orchestrator can persist them to
 * `dsr_tickets.results` (status='failed') — required for the GDPR audit
 * trail when the placeholder OnigaeshiAuditRecord store aborts after
 * earlier classes already committed (Phase E PR-E2 / #392, security
 * MED-2).
 */
export class DsrCascadePartialError extends Error {
  readonly code = 'DSR.CASCADE.PARTIAL' as const;
  readonly partialResults: readonly DsrClassResult[];
  readonly cause: unknown;
  constructor(partialResults: readonly DsrClassResult[], cause: unknown) {
    super(
      `DSR cascade aborted after ${partialResults.length} class result(s); ` +
        'partial results preserved for audit-trail persistence.',
    );
    this.name = 'DsrCascadePartialError';
    this.partialResults = partialResults;
    this.cause = cause;
  }
}

// ---------------------------------------------------------------------------
// Action taxonomy
// ---------------------------------------------------------------------------

export const DSR_CASCADE_ACTIONS = [
  'deleted',
  'pseudonymised',
  'exported',
  'retained-legal-hold',
  'skipped',
] as const;

export type DsrCascadeAction = (typeof DSR_CASCADE_ACTIONS)[number];

/**
 * Plan-mandated action per data class for `DsrType === 'delete'`.
 * `DsrType === 'export'` uses the store's export method regardless.
 */
export const DELETE_ACTION_BY_CLASS: Readonly<Record<DsrDataClass, DsrCascadeAction>> = {
  HydraTranscript: 'deleted',
  Match: 'deleted',
  ProbeOutcome: 'deleted',
  CommunitySubmission: 'deleted',
  BudgetLedger: 'pseudonymised',
  OnigaeshiAuditRecord: 'pseudonymised',
};

// ---------------------------------------------------------------------------
// Store contracts
// ---------------------------------------------------------------------------

/**
 * Per-cascade context threaded into store operations. PR-E4 (#134) adds
 * `ticketId` so the WORM-backed OnigaeshiAuditRecord store can embed it
 * in the erasure marker for legal-defensibility traceability. Other
 * stores ignore it.
 */
export interface DsrPseudonymiseContext {
  /** DSR ticket id this pseudonymise call is part of. */
  readonly ticketId: string;
}

/**
 * Contract for a single-class DSR store. Every Postgres-backed store
 * implements this in Phase E; in-memory reference implementations ship
 * here for tests and the Phase 0 scaffold API.
 */
export interface DsrCascadeStore {
  readonly dataClass: DsrDataClass;
  /** Delete raw records for this user. Returns count deleted. */
  deleteRawByUser?(userId: string): Promise<number>;
  /**
   * Replace user PII with the supplied user-hash. Returns count updated.
   *
   * `context` carries the ticketId (PR-E4 #134) — required at the
   * contract level so a future store implementor cannot silently drop
   * it. The orchestrator (`runDsrCascade`) always supplies it; existing
   * stores that don't need ticketId (in-memory + Postgres pseudonymise)
   * accept the wider arity via TS structural compatibility and ignore
   * the value.
   */
  pseudonymiseByUser?(
    userId: string,
    userHash: string,
    context: DsrPseudonymiseContext,
  ): Promise<number>;
  /** Export records for this user (DSR export). Returns opaque payload. */
  exportByUser?(userId: string): Promise<{ count: number; payload: unknown }>;
}

export interface DsrCascadeStores {
  readonly HydraTranscript: DsrCascadeStore;
  readonly Match: DsrCascadeStore;
  readonly ProbeOutcome: DsrCascadeStore;
  readonly CommunitySubmission: DsrCascadeStore;
  readonly BudgetLedger: DsrCascadeStore;
  readonly OnigaeshiAuditRecord: DsrCascadeStore;
}

/**
 * Audit log sink for DSR operations. One entry per class result, plus
 * one envelope entry per ticket. Phase E points this at the WORM audit
 * sink (`OnigaeshiAuditRecord` itself — so the DSR run is self-auditing).
 */
export interface DsrAuditEntry {
  readonly ticketId: string;
  /** Hashed user identifier (`userHmac(rawUserId, pseudonymKey)`); never the raw id (Q3 fix + PR-E3 HMAC). */
  readonly userId: string;
  readonly type: DsrType;
  readonly dataClass: DsrDataClass;
  readonly action: DsrCascadeAction;
  readonly count: number;
  readonly ts: string;
}

export interface DsrAuditLog {
  record(entry: DsrAuditEntry): Promise<void>;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export interface RunDsrCascadeOptions {
  readonly ticketId?: string;
  readonly stores: DsrCascadeStores;
  readonly audit: DsrAuditLog;
  /**
   * Key for HMAC-SHA-256 pseudonymisation (PR-E3). Required — empty
   * string throws `DsrPseudonymKeyMissingError`. The dojolm-web factory
   * reads `DSR_PSEUDONYM_HMAC_KEY` from env and passes it through.
   */
  readonly pseudonymKey: string;
  readonly now?: () => Date;
}

const ALL_CLASSES: readonly DsrDataClass[] = [
  'HydraTranscript',
  'Match',
  'ProbeOutcome',
  'CommunitySubmission',
  'BudgetLedger',
  'OnigaeshiAuditRecord',
];

/**
 * Derive the stable user-hash used to pseudonymise retained classes.
 *
 * HMAC-SHA-256 over the user id with a server-held key. SHA-256 alone is
 * reversible by enumeration over a known userId namespace; the keyed-HMAC
 * upgrade (PR-E3 / #134) makes the hash unlinkable without access to the
 * key. The key lives in `DSR_PSEUDONYM_HMAC_KEY` env var (MVP) and will
 * move to KMS in Phase E+1 (sub-ticket #397). Rotation = re-pseudonymise
 * pass + key-version bump (see `dsr/key-version.ts` in dojolm-web).
 *
 * Throws `DsrPseudonymKeyMissingError` if the key is empty/whitespace.
 */
export function userHmac(userId: string, key: string): string {
  if (typeof key !== 'string' || key.trim().length === 0) {
    throw new DsrPseudonymKeyMissingError();
  }
  return createHmac('sha256', key).update(userId).digest('hex');
}

// ---------------------------------------------------------------------------
// Key-version derivation (PR-E4 #134, architect H-1)
// ---------------------------------------------------------------------------

/**
 * Stable salt for keyId derivation. Single source of truth shared by
 * `bu-tpi/onigaeshi/audit-overlay.ts` (read-side overlay) and
 * `dojolm-web/src/lib/dsr/key-version.ts` (write-side env loader). If
 * this string changes, every previously-written WORM erasure marker
 * becomes opaque (different keyId), forcing the runbook §7
 * re-pseudonymisation procedure.
 */
export const DSR_KEY_VERSION_SALT = 'dsr-key-version-salt-v1';

/** Hex prefix length for the keyId. 12 hex chars = 48 bits — enough to detect rotation collisions in practice. */
export const DSR_KEY_ID_HEX_LEN = 12;

/**
 * Derive a stable, non-secret 12-char hex keyId from the active HMAC key.
 *
 * Pure function; caller resolves the key from env. Throws if `key` is
 * empty so callers cannot accidentally produce a "no-key" identifier
 * that collides with a real one.
 */
export function deriveDsrKeyId(key: string): string {
  if (typeof key !== 'string' || key.trim().length === 0) {
    throw new DsrPseudonymKeyMissingError();
  }
  return createHmac('sha256', key)
    .update(DSR_KEY_VERSION_SALT)
    .digest('hex')
    .slice(0, DSR_KEY_ID_HEX_LEN);
}

/**
 * Run the DSR cascade. Calls each store in turn, records per-class audit
 * entries, and returns the result list in plan order.
 */
export async function runDsrCascade(
  userId: string,
  type: DsrType,
  opts: RunDsrCascadeOptions,
): Promise<readonly DsrClassResult[]> {
  const ticketId = opts.ticketId ?? randomUUID();
  const now = opts.now ?? (() => new Date());
  // userHmac validates the key and throws DsrPseudonymKeyMissingError if
  // it is empty/whitespace — fires before any data row or audit row is
  // written, so a misconfigured deploy fails fast rather than silently
  // pseudonymising under a missing key.
  const hash = userHmac(userId, opts.pseudonymKey);
  const results: DsrClassResult[] = [];

  for (const cls of ALL_CLASSES) {
    let action: DsrCascadeAction;
    let count: number;
    try {
      ({ action, count } = await applyCascadeAction(
        type,
        store(opts, cls),
        userId,
        hash,
        cls,
        { ticketId },
      ));
    } catch (err) {
      throw new DsrCascadePartialError([...results], err);
    }
    const result: DsrClassResult = { dataClass: cls, count, action };
    results.push(result);

    try {
      await opts.audit.record({
        ticketId,
        userId: hash,
        type,
        dataClass: cls,
        action,
        count,
        ts: now().toISOString(),
      });
    } catch (err) {
      throw new DsrCascadePartialError([...results], err);
    }
  }

  return results;
}

function store(opts: RunDsrCascadeOptions, cls: DsrDataClass): DsrCascadeStore {
  return opts.stores[cls];
}

async function applyCascadeAction(
  type: DsrType,
  store: DsrCascadeStore,
  userId: string,
  hash: string,
  cls: DsrDataClass,
  context: DsrPseudonymiseContext,
): Promise<{ action: DsrCascadeAction; count: number }> {
  if (type === 'export') {
    if (!store.exportByUser) {
      return { action: 'skipped', count: 0 };
    }
    const { count } = await store.exportByUser(userId);
    return { action: 'exported', count };
  }

  // type === 'delete'
  const intendedAction = DELETE_ACTION_BY_CLASS[cls];
  if (intendedAction === 'deleted') {
    if (!store.deleteRawByUser) return { action: 'skipped', count: 0 };
    const count = await store.deleteRawByUser(userId);
    return { action: 'deleted', count };
  }
  if (intendedAction === 'pseudonymised') {
    if (!store.pseudonymiseByUser) return { action: 'skipped', count: 0 };
    const count = await store.pseudonymiseByUser(userId, hash, context);
    return { action: 'pseudonymised', count };
  }
  return { action: 'skipped', count: 0 };
}

// ---------------------------------------------------------------------------
// In-memory reference implementations (tests + Phase 0 scaffold)
// ---------------------------------------------------------------------------

interface UserOwnedRecord {
  readonly id: string;
  readonly userId: string;
  readonly [key: string]: unknown;
}

/**
 * Generic in-memory store that supports delete + export over a user-keyed
 * collection. Used as the reference implementation for the four
 * delete-on-DSR classes (HydraTranscript, Match, ProbeOutcome,
 * CommunitySubmission).
 */
export class InMemoryDeleteStore implements DsrCascadeStore {
  readonly dataClass: DsrDataClass;
  private rows: UserOwnedRecord[] = [];

  constructor(dataClass: DsrDataClass) {
    this.dataClass = dataClass;
  }

  seed(row: UserOwnedRecord): void {
    this.rows = [...this.rows, { ...row }];
  }

  rowCount(): number {
    return this.rows.length;
  }

  async deleteRawByUser(userId: string): Promise<number> {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.userId !== userId);
    return before - this.rows.length;
  }

  async exportByUser(userId: string): Promise<{ count: number; payload: unknown }> {
    const mine = this.rows.filter((r) => r.userId === userId).map((r) => ({ ...r }));
    return { count: mine.length, payload: mine };
  }
}

/**
 * In-memory store that pseudonymises in place — used for the retain-7y
 * classes (BudgetLedger, OnigaeshiAuditRecord).
 */
export class InMemoryPseudonymiseStore implements DsrCascadeStore {
  readonly dataClass: DsrDataClass;
  private rows: UserOwnedRecord[] = [];

  constructor(dataClass: DsrDataClass) {
    this.dataClass = dataClass;
  }

  seed(row: UserOwnedRecord): void {
    this.rows = [...this.rows, { ...row }];
  }

  read(): readonly UserOwnedRecord[] {
    return this.rows.map((r) => ({ ...r }));
  }

  async pseudonymiseByUser(userId: string, userHashValue: string): Promise<number> {
    let count = 0;
    this.rows = this.rows.map((r) => {
      if (r.userId !== userId) return r;
      count += 1;
      return { ...r, userId: userHashValue };
    });
    return count;
  }

  async exportByUser(userId: string): Promise<{ count: number; payload: unknown }> {
    const mine = this.rows.filter((r) => r.userId === userId).map((r) => ({ ...r }));
    return { count: mine.length, payload: mine };
  }
}

/**
 * In-memory audit log — collects entries for assertions.
 *
 * Externally-visible `entries` is a `readonly DsrAuditEntry[]` so consumers
 * cannot mutate the internal array via `push`/`pop`/`splice`. The class
 * still appends internally through a private mutable backing field.
 */
export class InMemoryDsrAuditLog implements DsrAuditLog {
  private readonly _entries: DsrAuditEntry[] = [];
  get entries(): readonly DsrAuditEntry[] {
    return this._entries;
  }
  async record(entry: DsrAuditEntry): Promise<void> {
    this._entries.push({ ...entry });
  }
}

/**
 * Build a full in-memory `DsrCascadeStores` bundle. Convenient for tests
 * and the Phase 0 scaffold service.
 */
export function createInMemoryStores(): {
  readonly stores: DsrCascadeStores;
  readonly handles: {
    readonly HydraTranscript: InMemoryDeleteStore;
    readonly Match: InMemoryDeleteStore;
    readonly ProbeOutcome: InMemoryDeleteStore;
    readonly CommunitySubmission: InMemoryDeleteStore;
    readonly BudgetLedger: InMemoryPseudonymiseStore;
    readonly OnigaeshiAuditRecord: InMemoryPseudonymiseStore;
  };
} {
  const handles = {
    HydraTranscript: new InMemoryDeleteStore('HydraTranscript'),
    Match: new InMemoryDeleteStore('Match'),
    ProbeOutcome: new InMemoryDeleteStore('ProbeOutcome'),
    CommunitySubmission: new InMemoryDeleteStore('CommunitySubmission'),
    BudgetLedger: new InMemoryPseudonymiseStore('BudgetLedger'),
    OnigaeshiAuditRecord: new InMemoryPseudonymiseStore('OnigaeshiAuditRecord'),
  };
  return { stores: handles, handles };
}
