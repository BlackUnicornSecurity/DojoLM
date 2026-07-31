// SPDX-License-Identifier: Apache-2.0
// @public-api -- DSR ticket polling endpoint — session-user-only
/**
 * GET /api/dsr/[ticketId] — Poll the status of a previously submitted DSR.
 *
 * Phase E PR-E2 (#392). Required so users can check whether their `delete`
 * cascade has completed without having to retain the original 202
 * response — durable across process restart now that PR-E2 backs the
 * ticket store with Postgres.
 *
 * Auth: same `withAuth` gate as POST /api/dsr. The session-user must own
 * the ticket — IDOR protection is enforced by returning 404 (not 403)
 * when the ticket id is unknown OR belongs to a different user. We
 * deliberately conflate the two cases so an attacker cannot enumerate
 * ticket ids across users.
 *
 * `API_KEY_USER_ID` (synthetic shared id assigned to every X-API-Key
 * caller) is rejected explicitly — DSR is a session-user-only flow
 * (T8.1/T8.2 footgun lesson, restated for the new path).
 *
 * Response:
 *   200 OK — ticket payload (no `userId` — caller already knows who they are).
 *   401 Unauthorised — no session user.
 *   403 Forbidden — caller authenticated via API key (synthetic shared id).
 *   404 Not Found — ticket id unknown OR belongs to a different user.
 *   503 Service Unavailable — backend not configured (mirrors POST behaviour).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { API_KEY_USER_ID } from '@/lib/api-session';
import { getOrCreateDsrService } from '@/lib/dsr/factory';
import { DSR_BACKEND_RETRY_AFTER_SECONDS } from '@/lib/dsr/rate-limit';
import type { DsrTicket } from 'bu-tpi/compliance';

// Shared service singleton — same global cache as /api/dsr POST handler (PR-E2).
// Resolved per-request inside the handler so integration tests can simulate
// a process restart by clearing the cache.

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

/** UUID v1-v5 regex — used for cheap input validation before any DB query. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  readonly user?: { readonly id?: string };
  readonly params?: Record<string, string>;
}

export const GET = withAuth(async (_request: NextRequest, ctx: RouteContext) => {
  const dsrService = getOrCreateDsrService();
  if (dsrService === null) {
    return NextResponse.json(
      {
        error: 'DSR processing is temporarily unavailable',
        code: 'DSR.BACKEND_NOT_CONFIGURED',
      },
      {
        status: 503,
        headers: {
          ...RESPONSE_HEADERS,
          'Retry-After': String(DSR_BACKEND_RETRY_AFTER_SECONDS),
        },
      },
    );
  }

  const rawUserId = ctx.user?.id;
  if (!rawUserId) {
    return NextResponse.json(
      { error: 'Unable to identify authenticated user' },
      { status: 401, headers: RESPONSE_HEADERS },
    );
  }
  // Rev 2 architect concern 9 — explicit TEXT coercion mirrors POST handler.
  const userId: string = String(rawUserId);

  if (userId === API_KEY_USER_ID) {
    return NextResponse.json(
      {
        error: 'DSR ticket polling is not available for API-key callers',
        code: 'DSR.API_KEY_USER_FORBIDDEN',
      },
      { status: 403, headers: RESPONSE_HEADERS },
    );
  }

  const ticketId = ctx.params?.ticketId ?? '';
  if (!UUID_RE.test(ticketId)) {
    // Reject malformed ids before touching the DB. 404 (not 400) mirrors
    // the IDOR-conflation rule below — we do not want the response to
    // distinguish "syntactically wrong" from "belongs to someone else".
    return NextResponse.json(
      { error: 'Ticket not found', code: 'DSR.TICKET_NOT_FOUND' },
      { status: 404, headers: RESPONSE_HEADERS },
    );
  }

  // IDOR enforcement (defence in depth):
  // - SQL: WHERE ticket_id = $1 AND user_id = $2 (DsrService.getTicketForUser)
  // - Application layer: defensive userId equality check below
  // The two-column SQL predicate is the load-bearing gate; the post-fetch
  // check survives any future refactor that reverts to a single-column SELECT.
  const ticket: DsrTicket | null = await dsrService.getTicketForUser(userId, ticketId);
  if (!ticket || ticket.userId !== userId) {
    // 404 (not 403) — same response shape as the not-found case so the
    // API does not leak which ticket ids are valid across the user
    // namespace.
    return NextResponse.json(
      { error: 'Ticket not found', code: 'DSR.TICKET_NOT_FOUND' },
      { status: 404, headers: RESPONSE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      ticketId: ticket.ticketId,
      type: ticket.type,
      status: ticket.status,
      submittedAt: ticket.submittedAt,
      slaDeadline: ticket.slaDeadline,
      results: ticket.results,
    },
    { status: 200, headers: RESPONSE_HEADERS },
  );
});

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
