// SPDX-License-Identifier: Apache-2.0
// @webhook -- data-subject request endpoint — admin-or-external
/**
 * POST /api/dsr — Data Subject Request endpoint (R-X4, GDPR Art. 17/20).
 *
 * Accepted request types:
 *   export — export all personal data; returns ticket + 30d SLA deadline.
 *   delete — cascade-delete all personal data across 6 data classes
 *            per the R-X4 cascade spec (some records retained under
 *            legal hold with PII replaced by user-hash).
 *
 * Auth: authenticated users only; user can only request for themselves.
 *       Admin impersonation is a Phase A feature.
 *
 * Backend gating (Phase-0 audit H1 remediation):
 *   The in-memory DsrService loses tickets on restart. Until the Phase E
 *   SQL cascade lands, this route returns 503 when no persistent backend
 *   is configured. Opt into the in-memory backend ONLY for development
 *   by setting DSR_BACKEND=memory; opt into Postgres after PR-E4 ships
 *   by setting DSR_BACKEND=postgres + DATABASE_URL/DSR_DATABASE_URL.
 *
 *   When DSR_BACKEND=memory, the in-memory service is constructed with
 *   reference stores + an in-memory audit log so the cascade actually
 *   runs synchronously and the response carries per-class `results`.
 *   Audit entries are collected in-process only and lost on restart;
 *   Phase E PR-E4 replaces the in-memory audit log with the WORM +
 *   erasure-overlay sink that writes to OnigaeshiAuditRecord.
 *
 * Per-user rate limit (Phase E PR-E2 / #392):
 *   5 submissions per rolling 24h window per session-user. The 6th
 *   submission returns 429 + a `Retry-After` header set to the time
 *   remaining until the oldest counted submission rolls out of the
 *   window. The counter is backed by `dsr_tickets` for postgres + by
 *   the in-memory ticket Map for memory; both survive their respective
 *   process lifecycles.
 *
 * Response:
 *   202 Accepted — DsrTicket shape; includes `results` when the cascade
 *                  ran synchronously (memory + postgres).
 *   429 Too Many Requests — when per-user 5/24h limit is exceeded.
 *   503 Service Unavailable — with Retry-After: 604800 (7 days) when no
 *       persistent backend is configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/route-guard';
import { API_KEY_USER_ID } from '@/lib/api-session';
import { getOrCreateDsrService } from '@/lib/dsr/factory';
import {
  DSR_BACKEND_RETRY_AFTER_SECONDS,
  DSR_RATE_LIMIT_MAX,
  evaluateRateLimit,
} from '@/lib/dsr/rate-limit';
import type { DsrTicket } from 'bu-tpi/compliance';

const dsrRequestSchema = z.object({
  type: z.enum(['export', 'delete']),
});

type DsrRequestBody = z.infer<typeof dsrRequestSchema>;

// Service is resolved per-request via `getOrCreateDsrService()`, which hits
// the `globalThis` singleton on every call after the first. Resolving inside
// the handler (rather than at module scope) keeps integration tests able to
// simulate a process restart by clearing the singleton without resetting the
// module registry.
//
// PR-E3 (#134): factory resolves DSR_BACKEND + DSR_PSEUDONYM_HMAC_KEY from env.
// Returns null when no backend is configured (route returns 503 below).
// Throws DsrPseudonymKeyMissingError when DSR_BACKEND=postgres but key is
// absent — fail-closed semantics preserved at first request (Rev 2 H-2).

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

export const POST = withAuth(async (request: NextRequest, ctx: { user?: { id?: string } }) => {
  const dsrService = getOrCreateDsrService();
  // Backend check FIRST — do not accept a request we cannot durably persist
  if (dsrService === null) {
    return NextResponse.json(
      {
        error: 'DSR processing is temporarily unavailable',
        code: 'DSR.BACKEND_NOT_CONFIGURED',
        message: 'Persistent DSR backend is not configured on this deployment. '
          + 'Your request has NOT been accepted. Please retry after the Retry-After header '
          + 'or contact the operator at the privacy email documented in the privacy policy.',
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

  // Parse + validate body
  let body: DsrRequestBody;
  try {
    const raw = await request.json() as unknown;
    body = dsrRequestSchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body. Required: { type: "export" | "delete" }' },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const rawUserId = ctx.user?.id;
  if (!rawUserId) {
    return NextResponse.json(
      { error: 'Unable to identify authenticated user' },
      { status: 401, headers: RESPONSE_HEADERS },
    );
  }
  // Rev 2 architect concern 9 — explicit TEXT coercion: SQLite users.id
  // historically allowed numeric ids in some bootstrap paths; the Postgres
  // dsr_tickets.user_id column is TEXT NOT NULL so we coerce at the route
  // boundary. The PostgresDsrTicketStore SQL also uses ::text casts as
  // defence in depth. Empty-string coerced ids fall through the !rawUserId
  // gate above so we cannot pass '' to the cascade.
  const userId: string = String(rawUserId);

  // T8.1 footgun, mirrored to T8.2: `API_KEY_USER_ID` is the synthetic
  // shared id assigned to every X-API-Key caller. It is not a real
  // data subject, so a DSR submitted under it would either run a
  // cascade against an empty (or worse, cross-caller) namespace or
  // create a false audit record claiming a DSR was processed for the
  // synthetic id. Reject explicitly — DSR is a session-user-only flow.
  if (userId === API_KEY_USER_ID) {
    return NextResponse.json(
      {
        error: 'DSR requests cannot be submitted via API key authentication',
        code: 'DSR.API_KEY_USER_FORBIDDEN',
      },
      { status: 403, headers: RESPONSE_HEADERS },
    );
  }

  // Per-user rate limit (PR-E2 / #392)
  const retryAfter = await evaluateRateLimit(dsrService, userId, new Date());
  if (retryAfter !== null) {
    return NextResponse.json(
      {
        error: 'Too many DSR submissions in the last 24 hours',
        code: 'DSR.RATE_LIMITED',
        message: `Up to ${DSR_RATE_LIMIT_MAX} DSR submissions are accepted per user per rolling 24h window.`,
      },
      {
        status: 429,
        headers: {
          ...RESPONSE_HEADERS,
          'Retry-After': String(retryAfter),
        },
      },
    );
  }

  const ticket: DsrTicket = await dsrService.submit(userId, body.type);

  return NextResponse.json(
    {
      ticketId: ticket.ticketId,
      type: ticket.type,
      status: ticket.status,
      submittedAt: ticket.submittedAt,
      slaDeadline: ticket.slaDeadline,
      results: ticket.results,
      message: `DSR ${body.type} request received. You will be notified by the SLA deadline.`,
    },
    { status: 202, headers: RESPONSE_HEADERS },
  );
});

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'POST, OPTIONS',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}
