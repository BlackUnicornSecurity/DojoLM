// SPDX-License-Identifier: Apache-2.0
/**
 * Postgres-backed `DsrTicketStore` (Phase E PR-E2 / #392).
 *
 * Replaces the in-memory `Map` previously embedded in
 * `bu-tpi/compliance/InMemoryDsrService` so DSR tickets survive process
 * restart on dojolm-web — required by issue #134's Phase-0 audit H1
 * (in-memory tickets lost on restart).
 *
 * Schema: `packages/bu-tpi/src/sensei/migrations/0004_dsr_tickets.sql`
 * (mirrored inline by `migrate.ts` for Next.js bundling).
 *
 * All mutations run inside a transaction via `PgPoolExecutor` so a
 * failed write leaves no partial state. The orchestrator
 * (`InMemoryDsrService.submit`) treats ticket-store failures as ordinary
 * cascade failures and marks the ticket `failed`.
 */

import type {
  DsrClassResult,
  DsrTicket,
  DsrTicketStore,
  DsrType,
} from 'bu-tpi/compliance';
import { PgPoolExecutor, type PgPoolLike } from '../budget/pg-pool-executor.js';

export interface PostgresDsrTicketStoreOptions {
  readonly pool: PgPoolLike;
}

interface DsrTicketRow {
  readonly ticket_id: string;
  readonly user_id: string;
  readonly type: DsrType;
  readonly status: 'pending' | 'complete' | 'failed';
  readonly submitted_at: Date | string;
  readonly sla_deadline: Date | string;
  readonly results: readonly DsrClassResult[] | null;
  readonly completed_at: Date | string | null;
  readonly [key: string]: unknown;
}

function asISO(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function rowToTicket(row: DsrTicketRow): DsrTicket {
  const results: readonly DsrClassResult[] | undefined = Array.isArray(row.results)
    ? (row.results as readonly DsrClassResult[])
    : undefined;
  const base: DsrTicket = {
    ticketId: row.ticket_id,
    userId: row.user_id,
    type: row.type,
    status: row.status,
    submittedAt: asISO(row.submitted_at),
    slaDeadline: asISO(row.sla_deadline),
  };
  return results ? { ...base, results } : base;
}

const SELECT_COLS =
  'ticket_id, user_id, type, status, submitted_at, sla_deadline, results, completed_at';

export class PostgresDsrTicketStore implements DsrTicketStore {
  private readonly executor: PgPoolExecutor;

  constructor(options: PostgresDsrTicketStoreOptions) {
    this.executor = new PgPoolExecutor(options.pool);
  }

  async submit(ticket: DsrTicket): Promise<void> {
    const sql =
      'INSERT INTO dsr_tickets ' +
      '(ticket_id, user_id, type, status, submitted_at, sla_deadline) ' +
      'VALUES ($1::uuid, $2::text, $3, $4, $5::timestamptz, $6::timestamptz)';
    await this.executor.withTransaction(async (tx) => {
      await tx.query(sql, [
        ticket.ticketId,
        ticket.userId,
        ticket.type,
        ticket.status,
        ticket.submittedAt,
        ticket.slaDeadline,
      ]);
    });
  }

  async getByTicketId(ticketId: string): Promise<DsrTicket | null> {
    const sql = `SELECT ${SELECT_COLS} FROM dsr_tickets WHERE ticket_id = $1::uuid`;
    return this.executor.withTransaction(async (tx) => {
      const rows = await tx.query<DsrTicketRow>(sql, [ticketId]);
      if (rows.length === 0) return null;
      return rowToTicket(rows[0]!);
    });
  }

  async markComplete(
    ticketId: string,
    results: readonly DsrClassResult[],
  ): Promise<DsrTicket> {
    const sql =
      `UPDATE dsr_tickets ` +
      `SET status = 'complete', results = $2::jsonb, completed_at = NOW() ` +
      `WHERE ticket_id = $1::uuid ` +
      `RETURNING ${SELECT_COLS}`;
    return this.executor.withTransaction(async (tx) => {
      const rows = await tx.query<DsrTicketRow>(sql, [
        ticketId,
        JSON.stringify(results),
      ]);
      if (rows.length === 0) {
        throw new Error(`DSR ticket ${ticketId} not found (markComplete: missing row)`);
      }
      return rowToTicket(rows[0]!);
    });
  }

  async markFailed(
    ticketId: string,
    partialResults?: readonly DsrClassResult[],
  ): Promise<DsrTicket> {
    const hasPartials =
      partialResults !== undefined && partialResults.length > 0;
    const sql = hasPartials
      ? `UPDATE dsr_tickets ` +
        `SET status = 'failed', results = $2::jsonb, completed_at = NOW() ` +
        `WHERE ticket_id = $1::uuid ` +
        `RETURNING ${SELECT_COLS}`
      : `UPDATE dsr_tickets ` +
        `SET status = 'failed', completed_at = NOW() ` +
        `WHERE ticket_id = $1::uuid ` +
        `RETURNING ${SELECT_COLS}`;
    return this.executor.withTransaction(async (tx) => {
      const params: readonly unknown[] = hasPartials
        ? [ticketId, JSON.stringify(partialResults)]
        : [ticketId];
      const rows = await tx.query<DsrTicketRow>(sql, params);
      if (rows.length === 0) {
        throw new Error(`DSR ticket ${ticketId} not found (markFailed: missing row)`);
      }
      return rowToTicket(rows[0]!);
    });
  }

  /**
   * Two-column WHERE so the IDOR predicate is enforced in SQL. Returns
   * null when the ticket id is unknown OR belongs to another user — the
   * polling-route caller cannot distinguish the two cases (404 conflated
   * to prevent enumeration across the user namespace).
   */
  async getByUserAndTicketId(
    userId: string,
    ticketId: string,
  ): Promise<DsrTicket | null> {
    const sql =
      `SELECT ${SELECT_COLS} FROM dsr_tickets ` +
      `WHERE ticket_id = $1::uuid AND user_id = $2::text`;
    return this.executor.withTransaction(async (tx) => {
      const rows = await tx.query<DsrTicketRow>(sql, [ticketId, userId]);
      if (rows.length === 0) return null;
      return rowToTicket(rows[0]!);
    });
  }

  /**
   * Per-user submission count within a rolling window. Used by the route
   * rate-limit (5 / 24h). The check + INSERT path on `submit` is not
   * atomic; under heavy concurrency a 6th request could squeak through
   * before the 5th's COMMIT lands. Acceptable for an MVP DSR throttle —
   * the 24h window is permissive and the cost of a one-off race is one
   * extra ticket, not a security violation.
   */
  async countSubmissionsSince(userId: string, sinceISO: string): Promise<number> {
    const sql =
      `SELECT COUNT(*)::int AS n FROM dsr_tickets ` +
      `WHERE user_id = $1::text AND submitted_at >= $2::timestamptz`;
    return this.executor.withTransaction(async (tx) => {
      const rows = await tx.query<{ n: number; [key: string]: unknown }>(
        sql,
        [userId, sinceISO],
      );
      return (rows[0]?.n as number | undefined) ?? 0;
    });
  }
}
