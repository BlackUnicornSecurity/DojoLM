// SPDX-License-Identifier: Apache-2.0
/**
 * Data Subject Request (DSR) types and service interface (R-X4 / GDPR).
 *
 * Cascade spec (from plan R-X4):
 * - HydraTranscript, Match, ProbeOutcome, CommunitySubmission  → delete raw; keep hash for approved leaderboard entries
 * - BudgetLedger          → retain 7y (audit); replace user PII with user-hash
 * - OnigaeshiAuditRecord  → retain 7y (legal defensibility); replace PII with user-hash
 *
 * Phase 0 residual (#134): cascade orchestrator + per-class action
 * taxonomy + in-memory reference stores ship in `dsr-cascade.ts`. Real
 * Postgres-backed stores and API-route wiring remain Phase E.
 */

import { randomUUID } from 'node:crypto';
import {
  DsrCascadePartialError,
  runDsrCascade,
  type DsrAuditLog,
  type DsrCascadeStores,
} from './dsr-cascade.js';

/** Type of DSR request. */
export type DsrType = 'export' | 'delete';

/** Data classes that a DSR cascade touches. */
export type DsrDataClass =
  | 'HydraTranscript'
  | 'Match'
  | 'ProbeOutcome'
  | 'CommunitySubmission'
  | 'BudgetLedger'
  | 'OnigaeshiAuditRecord';

/** Status of a per-class cascade operation. */
export interface DsrClassResult {
  readonly dataClass: DsrDataClass;
  /** How many records were affected. */
  readonly count: number;
  /** 'deleted' | 'pseudonymised' | 'exported' | 'retained-legal-hold' */
  readonly action: string;
}

/** A submitted DSR ticket. */
export interface DsrTicket {
  readonly ticketId: string;
  readonly userId: string;
  readonly type: DsrType;
  readonly submittedAt: string;
  /** ISO-8601: 30 days from submission (GDPR SLA). */
  readonly slaDeadline: string;
  readonly status: 'pending' | 'processing' | 'complete' | 'failed';
  /** Populated when status = 'complete'. */
  readonly results?: readonly DsrClassResult[];
}

/** DSR service contract. */
export interface DsrService {
  /** Submit a new DSR. Returns the created ticket. */
  submit(userId: string, type: DsrType): Promise<DsrTicket>;
  /** Get ticket status. Returns null if not found. */
  getTicket(ticketId: string): Promise<DsrTicket | null>;
  /**
   * Get a ticket only when it belongs to `userId`. Returns null when the
   * ticket id is unknown OR the ticket belongs to a different user — the
   * route-level IDOR gate uses this single-call form so the predicate is
   * enforced at the DB layer (not just by post-fetch comparison).
   */
  getTicketForUser(userId: string, ticketId: string): Promise<DsrTicket | null>;
  /**
   * Count tickets submitted by `userId` at-or-after `sinceISO`. Used by
   * the route-level rate-limit gate (Phase E PR-E2 / #392).
   */
  countSubmissionsSince(userId: string, sinceISO: string): Promise<number>;
}

/**
 * Storage adapter for DSR tickets. Phase E PR-E2 (#392) extracts this from
 * the in-memory `Map` previously embedded in `InMemoryDsrService` so the
 * Postgres ticket store can be swapped in without rewriting the cascade
 * orchestration body.
 */
export interface DsrTicketStore {
  /** Persist a freshly-created pending ticket. */
  submit(ticket: DsrTicket): Promise<void>;
  /** Read a ticket by id. Returns null when unknown. */
  getByTicketId(ticketId: string): Promise<DsrTicket | null>;
  /**
   * Read a ticket only when it belongs to `userId`. Returns null on
   * either miss. The Postgres impl uses a 2-column WHERE clause so the
   * IDOR predicate is enforced in SQL — defence in depth on top of the
   * route-level userId comparison.
   */
  getByUserAndTicketId(userId: string, ticketId: string): Promise<DsrTicket | null>;
  /** Transition a ticket to status='complete' + persist results. */
  markComplete(ticketId: string, results: readonly DsrClassResult[]): Promise<DsrTicket>;
  /**
   * Transition a ticket to status='failed'. Optional `partialResults`
   * preserves the per-class outcomes that DID complete before the
   * cascade aborted — needed for the legal-defensibility audit trail
   * (Phase E PR-E2 #392 + security MED-2). Implementations persist the
   * partials when supplied; null/empty leaves `results` cleared.
   */
  markFailed(
    ticketId: string,
    partialResults?: readonly DsrClassResult[],
  ): Promise<DsrTicket>;
  /**
   * Count tickets submitted by `userId` at-or-after `sinceISO`. Used by
   * the per-user rate limit on POST /api/dsr (5 per rolling 24h window).
   */
  countSubmissionsSince(userId: string, sinceISO: string): Promise<number>;
}

/** Reference in-memory `DsrTicketStore` — backs the default service constructor. */
export class InMemoryDsrTicketStore implements DsrTicketStore {
  private readonly tickets = new Map<string, DsrTicket>();

  async submit(ticket: DsrTicket): Promise<void> {
    this.tickets.set(ticket.ticketId, { ...ticket });
  }

  async getByTicketId(ticketId: string): Promise<DsrTicket | null> {
    const t = this.tickets.get(ticketId);
    return t ? { ...t } : null;
  }

  async getByUserAndTicketId(
    userId: string,
    ticketId: string,
  ): Promise<DsrTicket | null> {
    const t = this.tickets.get(ticketId);
    if (!t || t.userId !== userId) return null;
    return { ...t };
  }

  async markComplete(
    ticketId: string,
    results: readonly DsrClassResult[],
  ): Promise<DsrTicket> {
    const existing = this.tickets.get(ticketId);
    if (!existing) {
      throw new Error(`DSR ticket ${ticketId} not found`);
    }
    const completed: DsrTicket = { ...existing, status: 'complete', results };
    this.tickets.set(ticketId, completed);
    return { ...completed };
  }

  async markFailed(
    ticketId: string,
    partialResults?: readonly DsrClassResult[],
  ): Promise<DsrTicket> {
    const existing = this.tickets.get(ticketId);
    if (!existing) {
      throw new Error(`DSR ticket ${ticketId} not found`);
    }
    const failed: DsrTicket =
      partialResults && partialResults.length > 0
        ? { ...existing, status: 'failed', results: partialResults }
        : { ...existing, status: 'failed' };
    this.tickets.set(ticketId, failed);
    return { ...failed };
  }

  async countSubmissionsSince(userId: string, sinceISO: string): Promise<number> {
    let n = 0;
    for (const t of this.tickets.values()) {
      if (t.userId === userId && t.submittedAt >= sinceISO) n += 1;
    }
    return n;
  }

  /** Test helper. */
  reset(): void {
    this.tickets.clear();
  }
}

/** 30 days in milliseconds (GDPR SLA). */
const DSR_SLA_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * In-memory DSR service (now actually a storage-agnostic orchestrator).
 *
 * Historical name kept for compatibility — PR-E2 (#392) extracted ticket
 * storage behind `DsrTicketStore`, so the same orchestrator now drives the
 * Postgres-backed ticket table when the dojolm-web factory injects a
 * `PostgresDsrTicketStore`. The orchestration body is unchanged: create
 * pending → run cascade → mark complete / failed.
 *
 * When constructed with cascade stores + audit sink + pseudonymKey,
 * `submit` runs the full cascade synchronously and marks the ticket
 * `complete`. When constructed without them (legacy Phase-0 scaffold
 * mode), `submit` records intent only and leaves the ticket `pending` —
 * preserving the prior behaviour for any callers that have not yet
 * wired stores.
 *
 * `pseudonymKey` is required when `stores` + `audit` are supplied (PR-E3 /
 * #134). It is forwarded to `runDsrCascade` which uses it to keyed-HMAC
 * the user id for the pseudonymise step. Empty key → cascade throws
 * `DsrPseudonymKeyMissingError`.
 */
export interface InMemoryDsrServiceOptions {
  readonly stores?: DsrCascadeStores;
  readonly audit?: DsrAuditLog;
  readonly pseudonymKey?: string;
  /**
   * Optional ticket-store override. Defaults to a fresh
   * `InMemoryDsrTicketStore` per service instance. PR-E2 injects the
   * Postgres-backed store here when `DSR_BACKEND=postgres`.
   */
  readonly ticketStore?: DsrTicketStore;
}

export class InMemoryDsrService implements DsrService {
  private readonly ticketStore: DsrTicketStore;

  constructor(private readonly opts: InMemoryDsrServiceOptions = {}) {
    this.ticketStore = opts.ticketStore ?? new InMemoryDsrTicketStore();
  }

  async submit(userId: string, type: DsrType): Promise<DsrTicket> {
    const now = new Date();
    const ticketId = randomUUID();
    const ticketPending: DsrTicket = {
      ticketId,
      userId,
      type,
      submittedAt: now.toISOString(),
      slaDeadline: new Date(now.getTime() + DSR_SLA_MS).toISOString(),
      status: 'pending',
    };
    await this.ticketStore.submit(ticketPending);

    if (!this.opts.stores || !this.opts.audit || !this.opts.pseudonymKey) {
      return ticketPending;
    }

    try {
      const results = await runDsrCascade(userId, type, {
        ticketId,
        stores: this.opts.stores,
        audit: this.opts.audit,
        pseudonymKey: this.opts.pseudonymKey,
      });
      try {
        return await this.ticketStore.markComplete(ticketId, results);
      } catch {
        return this.failTicket(ticketPending, []);
      }
    } catch (err) {
      const partials =
        err instanceof DsrCascadePartialError ? err.partialResults : [];
      return this.failTicket(ticketPending, partials);
    }
  }

  /**
   * Best-effort transition to status='failed'. If the ticket store also
   * fails (degraded persistence layer), synthesise a failed ticket from
   * the original pending record so the caller still receives a coherent
   * `DsrTicket` rather than a raw exception. The persistent store retry
   * path is operator-side, not request-time.
   *
   * `partialResults` carries the per-class outcomes that DID complete
   * before the cascade aborted (security MED-2 / PR-E2 #392) — required
   * for legal defensibility when the placeholder OnigaeshiAuditRecord
   * store throws on cascade class 6 of 6 and the prior 5 stores have
   * already committed.
   */
  private async failTicket(
    ticketPending: DsrTicket,
    partialResults: readonly DsrClassResult[],
  ): Promise<DsrTicket> {
    try {
      return await this.ticketStore.markFailed(
        ticketPending.ticketId,
        partialResults,
      );
    } catch {
      return partialResults.length > 0
        ? { ...ticketPending, status: 'failed', results: partialResults }
        : { ...ticketPending, status: 'failed' };
    }
  }

  async getTicket(ticketId: string): Promise<DsrTicket | null> {
    return this.ticketStore.getByTicketId(ticketId);
  }

  async getTicketForUser(
    userId: string,
    ticketId: string,
  ): Promise<DsrTicket | null> {
    return this.ticketStore.getByUserAndTicketId(userId, ticketId);
  }

  async countSubmissionsSince(userId: string, sinceISO: string): Promise<number> {
    return this.ticketStore.countSubmissionsSince(userId, sinceISO);
  }

  /**
   * Test helper. Resets only the default in-memory ticket store; a
   * caller-supplied ticket store retains its own reset semantics.
   */
  reset(): void {
    if (this.ticketStore instanceof InMemoryDsrTicketStore) {
      this.ticketStore.reset();
    }
  }
}
