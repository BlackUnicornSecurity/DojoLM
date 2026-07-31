// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/members/request-invite — Epic 4B.7 S4B.7.3 (UNAUTHENTICATED).
 *
 * Flag-design choice (E4B.7):
 *   - A SECOND env var `MEMBERS_PUBLIC_BETA_ENABLED` gates this
 *     surface rather than tiering `MEMBERS_UI_ENABLED`. The public-beta
 *     flag is strictly ADDITIVE: `MEMBERS_PUBLIC_BETA_ENABLED=true`
 *     requires `MEMBERS_UI_ENABLED=true` as a precondition; flipping
 *     public-beta off returns the surface to the E4B.6 closed-cohort
 *     state with zero other behavior changes.
 *   - A tiered `MEMBERS_UI_ENABLED=private|public` semantic would force
 *     every existing flag-reader call site (routes + pages + tests)
 *     to parse a string rather than read a boolean — a breaking change
 *     with no offsetting win.
 *   - A future E4B.8 (NOT planned) could cleanly layer a third
 *     dimension without re-litigating the tiered-string contract.
 *
 * Flag-gate ordering (§10 of the E4B.7 prompt):
 *   1. MEMBERS_UI_ENABLED read at request time → 503 if off.
 *   2. MEMBERS_PUBLIC_BETA_ENABLED read at request time → 503 if off.
 *      Both flag checks happen BEFORE any auth, rate-limit, or CSRF
 *      work. An anonymous probe on a public-beta-off deployment sees the
 *      same 503 regardless of what else they try.
 *   3. (No `withAuth`.) This endpoint is intentionally unauthenticated
 *      — the caller has no invite yet, so there is no session to key
 *      off. R-T1 (raw-token safety) is N/A here: the route issues NO
 *      tokens; it queues a request for admin review. The admin's
 *      downstream click on `/admin/members/invites` is what mints the
 *      actual invite via the existing E4B.1 POST (which already
 *      satisfies R-T1 byte-for-byte).
 *   4. CSRF double-submit (rule §11). Even though there is no session,
 *     the route REQUIRES the `tpi_csrf` cookie + `x-csrf-token` header
 *     pair to match. Cookie-mint location (deferred from the server
 *     component to the client) — Next 15+ Server Components cannot
 *     set cookies, so the `/members/request-invite` client form mints
 *     the nonce on mount via `document.cookie = ...; SameSite=Strict`.
 *     The `SameSite=Strict` attribute is the security-critical
 *     property: a cross-site origin can neither read nor send this
 *     cookie, so a drive-by `<form action>` or `fetch` from a
 *     hostile origin fails the double-submit check with 403. The
 *     defense does not depend on whether server or client writes the
 *     cookie — it depends on the browser's SameSite enforcement.
 *   5. Rate-limit tier `'execute'` (5 req / min / IP). The strictest
 *      tier. The member POST is unauthenticated and visits via a
 *      public surface, so the per-IP cap stays tight.
 *   6. Body validation (zod) — see schemas below.
 *   7. Persist via `getMemberInviteRequestStore().createRequest(...)`.
 *     The store enforces the duplicate-pending guard and throws a
 *     fixed-code error that the route maps to 409.
 *
 * Response body shapes (fixed, caller-input NEVER reflected):
 *   - 202  {id, status, createdAt}  — NO email, NO why echo
 *   - 400  {error, code: 'invalid-body'}
 *   - 403  {error, code: 'csrf-validation-failed'}
 *   - 409  {error, code: 'duplicate-pending-request'}
 *   - 429  {error, code: 'rate-limited'}
 *   - 500  {error, code: 'internal-error'}
 *   - 503  {error, code: 'service-not-configured'}
 *
 * The member-side POST is NOT audited (rule §18 — requests are
 * high-volume-ish and the queue itself is the audit record). The
 * admin's downstream dismiss / issue actions ARE audited and fire
 * their own events.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { defaultFlagReader } from 'bu-tpi/flags';
import { checkRateLimit } from '@/lib/api-handler';
import {
  getMemberInviteRequestStore,
  InviteRequestStoreError,
} from '@/lib/members/invite-request-store';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/auth/route-guard';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

const REQUEST_INVITE_ERROR_MESSAGES: Readonly<Record<string, string>> =
  Object.freeze({
    'service-not-configured': 'public-beta request surface is not enabled',
    'csrf-validation-failed': 'CSRF validation failed',
    'invalid-body': 'invalid invite request body',
    'duplicate-pending-request': 'we already have a pending request',
    'rate-limited': 'too many requests',
    'internal-error': 'internal error',
  });

// --------------------------------------------------------------------------
// Body-validation schemas — byte-for-byte mirrored on the client form
// (RequestInviteForm.tsx). Server is the source of truth; a client drift
// surfaces as a 400 here.
// --------------------------------------------------------------------------

// RFC-5321 simple-format — must have exactly one `@`, each side
// non-empty, length ≤254. Zod's `.email()` covers the shape; we add a
// control-char rejection and an explicit length cap.
const emailSchema = z
  .string()
  .min(3)
  .max(254)
  .email('email must be a valid address');

/**
 * `why` deny-list: reject anything that looks like markdown, HTML, or
 * a URL. Operators submit short plain-language reasons; any payload
 * trying to smuggle active content is rejected.
 *
 * Order matters: we first normalise + trim, then check length, then
 * check the printable-ASCII + tab + newline char class, then the
 * deny-list of specific sequences.
 */
const DENY_SUBSTRINGS: readonly string[] = Object.freeze([
  '<',
  '>',
  '[',
  ']',
  '{',
  '}',
  '`',
  'http://',
  'https://',
]);

const WHY_ALLOWED_RE = /^[\x20-\x7E\t\r\n]+$/;

function whyRefinement(value: string, ctx: z.RefinementCtx): void {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'why must not be empty' });
    return;
  }
  if (trimmed.length > 280) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'why exceeds 280 chars' });
    return;
  }
  if (!WHY_ALLOWED_RE.test(trimmed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'why contains disallowed control characters',
    });
    return;
  }
  // Case-insensitive deny-list match for the url-ish substrings;
  // case-sensitive for the bracket/backtick chars (those are
  // character-literal matches).
  const lower = trimmed.toLowerCase();
  for (const bad of DENY_SUBSTRINGS) {
    if (bad === 'http://' || bad === 'https://') {
      if (lower.includes(bad)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'why must not contain URLs',
        });
        return;
      }
      continue;
    }
    if (trimmed.includes(bad)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'why must not contain disallowed chars',
      });
      return;
    }
  }
}

const whySchema = z.string().superRefine(whyRefinement);

const requestInviteBodySchema = z.object({
  email: emailSchema,
  why: whySchema,
});

// --------------------------------------------------------------------------
// Response helpers
// --------------------------------------------------------------------------

function flagOffResponse(): NextResponse {
  return NextResponse.json(
    {
      error: REQUEST_INVITE_ERROR_MESSAGES['service-not-configured'],
      code: 'service-not-configured',
    },
    { status: 503, headers: RESPONSE_HEADERS },
  );
}

function csrfFailedResponse(): NextResponse {
  return NextResponse.json(
    {
      error: REQUEST_INVITE_ERROR_MESSAGES['csrf-validation-failed'],
      code: 'csrf-validation-failed',
    },
    { status: 403, headers: RESPONSE_HEADERS },
  );
}

function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error: REQUEST_INVITE_ERROR_MESSAGES['rate-limited'],
      code: 'rate-limited',
    },
    { status: 429, headers: RESPONSE_HEADERS },
  );
}

function invalidBodyResponse(): NextResponse {
  return NextResponse.json(
    {
      error: REQUEST_INVITE_ERROR_MESSAGES['invalid-body'],
      code: 'invalid-body',
    },
    { status: 400, headers: RESPONSE_HEADERS },
  );
}

function duplicatePendingResponse(): NextResponse {
  return NextResponse.json(
    {
      error: REQUEST_INVITE_ERROR_MESSAGES['duplicate-pending-request'],
      code: 'duplicate-pending-request',
    },
    { status: 409, headers: RESPONSE_HEADERS },
  );
}

function internalErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      error: REQUEST_INVITE_ERROR_MESSAGES['internal-error'],
      code: 'internal-error',
    },
    { status: 500, headers: RESPONSE_HEADERS },
  );
}

// --------------------------------------------------------------------------
// CSRF helper — timing-safe compare of cookie vs header. Mirrors the
// withAuth CSRF path byte-for-byte (same cookie + header names, same
// timing-safe primitive) so the defense is identical in posture;
// only the session requirement differs.
// --------------------------------------------------------------------------

function csrfValid(req: NextRequest): boolean {
  const cookie = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const header = req.headers.get(CSRF_HEADER_NAME);
  if (!cookie || !header) return false;
  if (cookie.length !== header.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------------
// Entry point
// --------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1 + 2. Flag gate BOTH flags (§10 — precedes auth, rate-limit, CSRF,
  // body validation). An anonymous attacker can never learn the flag
  // state from differential error codes.
  const flags = defaultFlagReader();
  if (!flags.isEnabled('MEMBERS_UI_ENABLED')) return flagOffResponse();
  if (!flags.isEnabled('MEMBERS_PUBLIC_BETA_ENABLED')) return flagOffResponse();

  // 3. No session auth — by design.
  // 4. Rate-limit — tier 'execute' (5 req / min / IP). Brief §10 spec: rate
  // limit precedes CSRF so unauthenticated probes burn their budget before
  // hitting any other work. IP-keyed; in-memory store; O(1) compare.
  const rate = await checkRateLimit(request, 'execute');
  if (!rate.allowed) return rateLimitResponse();

  // 5. CSRF double-submit — §11 mandates this even on unauthenticated.
  if (!csrfValid(request)) return csrfFailedResponse();

  // 6. Body validation.
  let parsed: z.infer<typeof requestInviteBodySchema>;
  try {
    const raw = (await request.json()) as unknown;
    parsed = requestInviteBodySchema.parse(raw);
  } catch {
    return invalidBodyResponse();
  }

  // 7. Persist.
  try {
    const store = getMemberInviteRequestStore();
    const record = store.createRequest({
      email: parsed.email,
      why: parsed.why.trim(),
    });
    return NextResponse.json(
      {
        id: record.id,
        status: record.status,
        createdAt: record.createdAt,
      },
      { status: 202, headers: RESPONSE_HEADERS },
    );
  } catch (err) {
    if (
      err instanceof InviteRequestStoreError &&
      err.code === 'duplicate-pending-request'
    ) {
      return duplicatePendingResponse();
    }
    // Sanitized logging (rule §16) — no raw error, no request body,
    // no file path.
    // eslint-disable-next-line no-console
    console.error('[members/request-invite] post error', {
      name: err instanceof Error ? err.name : undefined,
      message: err instanceof Error ? err.message : String(err),
    });
    return internalErrorResponse();
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST, OPTIONS' },
  });
}
