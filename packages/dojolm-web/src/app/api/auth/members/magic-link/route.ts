// SPDX-License-Identifier: Apache-2.0
/**
 * /api/auth/members/magic-link — E4B.1 S4B.1.2.
 *
 * POST: accepts `{ inviteCode, email }`, validates against a pending
 *       invite, generates a 32-byte raw token, persists the SHA-256
 *       hash with a 10-minute absolute TTL, writes a dev-log sink
 *       line carrying only the 6-char token prefix, and returns 202.
 *       CSRF-exempt (no session yet — the POST is the entrypoint for
 *       an anonymous, invite-bearing caller).
 *
 * GET:  accepts `?token=…`, redeems the token exactly once, mints a
 *       `tpi_session` + `tpi_csrf` cookie pair, and 302s to `/members`.
 *       Reuse / expiry / revoke / unknown all collapse to a single
 *       fixed 410 body (R-T2/R-T3 — do NOT disclose WHY the token is
 *       dead).
 *
 * Flag-gate ordering (§15/§16): MEMBERS_UI_ENABLED → 503 before auth
 * or body validation, so anonymous scanners cannot learn the endpoint
 * exists when the flag is off.
 *
 * Email adapter TODO: the POST path logs the raw token ONLY to stdout
 * with a 6-char prefix redaction. The full raw token is returned in
 * the response body to the requester (same browser that initiated the
 * POST). A production deploy MUST wire an email-sender adapter that
 * sends the full token to the invite's email address via a trusted
 * transport (SMTP, SES, Mailgun). Backlog: the member-email-adapter item.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { defaultFlagReader } from 'bu-tpi/flags';
import { checkRateLimit } from '@/lib/api-handler';
import { auditLog } from '@/lib/audit-logger';
import {
  buildSessionCookie,
  buildCsrfCookie,
} from '@/lib/auth/route-guard';
import { generateCsrfToken } from '@/lib/auth/auth';
import { createSession } from '@/lib/auth/session';
import {
  findAnyByCodeHash,
  findPendingByCodeHash,
  getInviteById,
  markInviteConsumed,
} from '@/lib/members/invite-store';
import {
  createMagicLink,
  hasAnyLinkForInvite,
  lookupAndConsume,
  MAGIC_LINK_TTL_MS,
} from '@/lib/members/magic-link-store';
import { resolveMemberEmailSender } from '@/lib/members/email-sender';
import type { MemberEmailSender } from '@/lib/members/email-sender';
import { getConfiguredAppOrigin } from '@/lib/request-origin';
import { userRepo } from '@/lib/db/repositories/user.repository';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

const SESSION_TTL_SECONDS = 24 * 60 * 60;

const MAGIC_LINK_ERROR_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  'members-ui-disabled': 'members surface is not enabled',
  'invalid-body': 'invalid magic-link request body',
  // R-T3: the POST 404 surface is indistinguishable for "no invite",
  // "wrong email", and "bad code". The operator-facing string is the
  // same no matter which branch fires.
  'invite-not-found': 'invite not found or already redeemed',
  // Strict code-rotation rule: a second POST with the same invite
  // code (after a first succeeded) returns 410. Do not tell the
  // caller whether the first magic link was consumed, expired, or
  // still pending — just that this invite code is dead.
  'invite-code-rotated': 'invite code already used',
  // R-T2 / GET 410 — single fixed string, no operator-input echo.
  'token-dead': 'token expired or already used',
  'rate-limited': 'too many requests',
  // MEMBER-EMAIL — backend mis-configuration (missing SMTP_*). The
  // route 503s rather than silently falling back to the log sink.
  'email-backend-unavailable': 'email delivery is not configured',
  // MEMBER-EMAIL — transport failure during send. POST returns 500
  // and the invite is NOT consumed so the operator can retry with
  // the same code.
  'email-send-failed': 'failed to deliver magic link',
  'internal-error': 'internal error',
});

const postBodySchema = z.object({
  inviteCode: z
    .string()
    .min(32)
    .max(256)
    // The raw invite code is a 64-char hex string (32 bytes hex-encoded).
    .regex(/^[a-f0-9]+$/i, 'invite code must be hex'),
  email: z
    .string()
    .min(3)
    .max(254)
    .email('email must be a valid address'),
});

function hashSha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// Email max length from RFC 5321 + zod's .email() schema cap. The
// constant-time compare ALWAYS pads both sides to this length so the
// work done is identical regardless of whether an invite was found
// OR whether the caller-supplied email is long or short. A shorter
// pad-target leaks length correlation between the "no invite" and
// "wrong email" branches (security audit — BLOCKER-1).
const EMAIL_COMPARE_WIDTH = 254;

/**
 * Constant-time string compare with uniform-length padding. Both sides
 * are padded to `width` bytes before the fixed-width compare so the
 * runtime is independent of the actual string lengths. Returns true
 * ONLY when `a === b`; unequal inputs always return false but take
 * the same amount of work as a matching pair.
 *
 * The trailing `a.length === b.length` short-circuit that shipped in
 * the first pass reintroduced a length-observable branch — the
 * audit BLOCKER-1 followup. The padded-buffer compare alone is
 * sufficient because `Buffer.alloc(width)` zero-fills: "abc" and
 * "abcx" pad to "abc\0..." and "abcx\0..." respectively, which
 * differ at byte 3 under `timingSafeEqual`. Length mismatches are
 * therefore already captured inside the constant-time compare.
 */
function timingSafeStrEqPadded(a: string, b: string, width: number): boolean {
  const aBuf = Buffer.alloc(width);
  const bBuf = Buffer.alloc(width);
  Buffer.from(a).copy(aBuf);
  Buffer.from(b).copy(bBuf);
  try {
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

function tokenPrefix6(rawToken: string): string {
  return rawToken.slice(0, 6);
}

function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: MAGIC_LINK_ERROR_MESSAGES['rate-limited'], code: 'rate-limited' },
    { status: 429, headers: RESPONSE_HEADERS },
  );
}

function flagOffResponse(): NextResponse {
  return NextResponse.json(
    {
      error: MAGIC_LINK_ERROR_MESSAGES['members-ui-disabled'],
      code: 'MEMBERS_UI_DISABLED',
    },
    { status: 503, headers: RESPONSE_HEADERS },
  );
}

// ---------------------------------------------------------------------------
// POST — issue a magic link for a pending invite
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Flag gate (first — anonymous probes see 503, not 401).
  const flags = defaultFlagReader();
  if (!flags.isEnabled('MEMBERS_UI_ENABLED')) return flagOffResponse();

  // 2. Rate limit — tier 'write'. No auth on this route (see module
  //    docstring); the rate limit is the only DoS knob available.
  const rate = await checkRateLimit(request, 'write');
  if (!rate.allowed) return rateLimitResponse();

  // 3. Parse + validate body.
  let body: z.infer<typeof postBodySchema>;
  try {
    const raw = (await request.json()) as unknown;
    body = postBodySchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: MAGIC_LINK_ERROR_MESSAGES['invalid-body'], code: 'invalid-body' },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  // 4. R-T3 — ANY invite matching the code hash (pending / consumed /
  //    revoked) forces us to return 410 on a second POST. If the
  //    matching row exists AND is pending, fall through to the
  //    pending-only email check; otherwise the code is dead and we
  //    surface 410 before doing any further work.
  const codeHash = hashSha256(body.inviteCode);
  const anyMatch = findAnyByCodeHash(codeHash);
  if (anyMatch && anyMatch.status !== 'pending') {
    return NextResponse.json(
      {
        error: MAGIC_LINK_ERROR_MESSAGES['invite-code-rotated'],
        code: 'invite-code-rotated',
      },
      { status: 410, headers: RESPONSE_HEADERS },
    );
  }

  // Same 404 body for "no match" AND "wrong email" so the response
  // does not disclose whether the invite exists (R-T3). The timing-
  // safe compare runs on uniformly-padded buffers whether or not an
  // invite was found, so response time cannot distinguish the two
  // branches (security audit — BLOCKER-1).
  const invite = anyMatch && anyMatch.status === 'pending' ? anyMatch : null;
  const expectedEmail = invite?.email ?? '';
  const emailMatches = timingSafeStrEqPadded(
    expectedEmail,
    body.email,
    EMAIL_COMPARE_WIDTH,
  );
  if (!invite || !emailMatches) {
    return NextResponse.json(
      {
        error: MAGIC_LINK_ERROR_MESSAGES['invite-not-found'],
        code: 'invite-not-found',
      },
      { status: 404, headers: RESPONSE_HEADERS },
    );
  }

  // 5. Strict rotation: one magic link per invite (defense-in-depth —
  //    the status check above already captures "code rotated" for the
  //    consumed / revoked cases; this branch catches the case where a
  //    magic link was issued but the invite hasn't flipped yet).
  if (hasAnyLinkForInvite(invite.id)) {
    return NextResponse.json(
      {
        error: MAGIC_LINK_ERROR_MESSAGES['invite-code-rotated'],
        code: 'invite-code-rotated',
      },
      { status: 410, headers: RESPONSE_HEADERS },
    );
  }

  // 6. Resolve the email sender BEFORE minting the token so a
  //    mis-configured SMTP backend short-circuits to 503 without
  //    having created any magic-link state. `resolveMemberEmailSender`
  //    throws when MEMBER_EMAIL_BACKEND=smtp but one of the SMTP_*
  //    vars is missing — ticket explicitly forbids silently falling
  //    back to the log sender in production.
  let sender: MemberEmailSender;
  try {
    sender = await resolveMemberEmailSender();
  } catch (err) {
    // The error may contain env-var names — safe to surface in
    // stderr but never in the HTTP body. Operators see the reason
    // in logs; anonymous callers see a fixed 503 string.
    console.error('[magic-link] email sender unavailable', err);
    return NextResponse.json(
      {
        error: MAGIC_LINK_ERROR_MESSAGES['email-backend-unavailable'],
        code: 'email-backend-unavailable',
      },
      { status: 503, headers: RESPONSE_HEADERS },
    );
  }

  // 7. Mint raw token (32-byte hex = 64 chars). NEVER log the full
  //    value. The raw token travels: (a) optionally in the 202 body
  //    when sender.mode === 'dev' (local-dev convenience), (b) in
  //    the eventual GET `?token=…` redeem URL. Only the 6-char
  //    prefix lands in dev logs.
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashSha256(rawToken);

  // 8. Send BEFORE persist: transport failures bubble up as 500 and
  //    the invite stays pending (nothing was ever written to the
  //    magic-link store). A successful send is followed by an
  //    immediate persist — the Node.js event loop makes this
  //    effectively atomic at the request-handler level.
  const baseUrl = magicLinkBaseUrl(request);
  try {
    await sender.sendMagicLink({
      email: invite.email,
      rawToken,
      inviteHandle: invite.handle,
      baseUrl,
      ttlMinutes: Math.round(MAGIC_LINK_TTL_MS / 60_000),
    });
  } catch (err) {
    // Transport-level failure. The log sink logs the error object
    // (which MUST NOT include the raw token — senders format the
    // token into the email body but never into thrown errors).
    console.error('[magic-link] sender.sendMagicLink failed', err);
    return NextResponse.json(
      {
        error: MAGIC_LINK_ERROR_MESSAGES['email-send-failed'],
        code: 'email-send-failed',
      },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }

  // 9. Persist the hash now that delivery has succeeded.
  createMagicLink({
    tokenHash,
    inviteId: invite.id,
    email: invite.email,
  });

  // 10. Audit — send-mode tells operators which transport delivered
  //     the token. No raw token, no hash (R-T1), just the mode and
  //     the invite id.
  void auditLog.memberMagicLinkSent({
    inviteId: invite.id,
    sendMode: sender.mode,
    tokenPrefix6: tokenPrefix6(rawToken),
  });

  // R-T4 / audit HIGH-2 — the raw token is ONLY echoed back to the
  // POST requester when the active backend is the dev log sender.
  // Any non-log backend (smtp) makes the email the authoritative
  // delivery channel and the 202 body carries `{ ok: true }` only.
  const responseBody: { readonly ok: true; readonly rawToken?: string } =
    sender.mode === 'dev' ? { ok: true, rawToken } : { ok: true };
  return NextResponse.json(responseBody, {
    status: 202,
    headers: RESPONSE_HEADERS,
  });
}

/**
 * Build the absolute magic-link redeem URL for the email body. Prefers
 * the configured app origin (TPI_APP_URL / NEXT_PUBLIC_APP_URL); falls
 * back to the inbound request origin so dev environments without env
 * config still produce a clickable URL.
 */
function magicLinkBaseUrl(request: NextRequest): string {
  const configured = getConfiguredAppOrigin();
  const origin = configured ?? new URL(request.url).origin;
  return `${origin}/api/auth/members/magic-link`;
}

// ---------------------------------------------------------------------------
// GET — redeem a magic link and mint a tpi_session
// ---------------------------------------------------------------------------

function redirect410(request: NextRequest): NextResponse {
  // 410 body — no redirect. The sign-in page surfaces this to the
  // user as "token expired or already used" and invites them to ask
  // the admin for a fresh link.
  return NextResponse.json(
    { error: MAGIC_LINK_ERROR_MESSAGES['token-dead'], code: 'token-dead' },
    { status: 410, headers: RESPONSE_HEADERS },
  );
}

function getSessionIpAddress(req: NextRequest): string | null {
  if (!process.env.TRUSTED_PROXY) return null;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') ?? null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Flag gate.
  const flags = defaultFlagReader();
  if (!flags.isEnabled('MEMBERS_UI_ENABLED')) return flagOffResponse();

  // 2. Rate limit — tier 'read' (prevents token-enumeration fishing).
  const rate = await checkRateLimit(request, 'read');
  if (!rate.allowed) return rateLimitResponse();

  // 3. Extract token.
  const url = new URL(request.url);
  const rawToken = url.searchParams.get('token') ?? '';
  if (!rawToken || !/^[a-f0-9]{32,256}$/i.test(rawToken)) {
    return redirect410(request);
  }
  const tokenHash = hashSha256(rawToken);

  // 4. Look up + atomic consume. The combined `lookupAndConsume`
  //    helper runs as a single synchronous critical section so two
  //    concurrent GETs cannot both observe `pending` (audit MEDIUM-1
  //    — MagicLink race). `consumed` / `expired` / `revoked` /
  //    `not-found` all collapse to the fixed 410 body; R-T2/R-T3
  //    forbid disclosing which reason applied.
  const verdict = lookupAndConsume(tokenHash);
  if (verdict.kind !== 'ok') return redirect410(request);
  const consumedLink = verdict.link;

  // 5. Load parent invite + reconfirm it is pending. A consumed /
  //    revoked parent should never have an active magic link; if it
  //    does we treat it as drift and 410.
  const invite = getInviteById(consumedLink.inviteId);
  if (!invite || invite.status !== 'pending') return redirect410(request);

  // 6. Create the member user row. The password field is set to a
  //    fresh 48-byte random hex value — the member never learns it,
  //    so no password-login path can use it. Magic-link is the ONLY
  //    successful auth path for these users (decision #3).
  let memberUser;
  try {
    memberUser = await userRepo.createUser(
      invite.handle,
      invite.email,
      randomBytes(48).toString('hex'),
      'member',
      invite.handle,
    );
  } catch (err) {
    console.error('[magic-link] createUser failed', err);
    // Partial-commit — magic link is already consumed. Return 410 so
    // the caller sees the dead-token surface and asks admin for a
    // fresh invite; the orphan invite stays pending and an operator
    // can revoke it manually.
    return redirect410(request);
  }

  // 7. Mark invite consumed (best-effort — drift logged).
  try {
    markInviteConsumed(invite.id);
  } catch (err) {
    console.error('[magic-link] markInviteConsumed drift', err);
  }

  // 8. Mint session.
  const clientIp = getSessionIpAddress(request);
  const userAgent = request.headers.get('user-agent') ?? null;
  const sessionToken = createSession(memberUser.id, clientIp, userAgent);
  const csrfToken = generateCsrfToken();

  void auditLog.memberInviteConsumed({
    inviteId: invite.id,
    tokenPrefix6: tokenPrefix6(rawToken),
    memberUserId: memberUser.id,
  });

  const redirectUrl = new URL('/members', request.url);
  const response = NextResponse.redirect(redirectUrl, 302);
  // memberUser is created by `createUser(..., 'member', ...)` above, so role
  // is always 'member' — narrow the string type to UserRole at this boundary.
  response.headers.append(
    'Set-Cookie',
    await buildSessionCookie(sessionToken, 'member', SESSION_TTL_SECONDS, request),
  );
  response.headers.append(
    'Set-Cookie',
    buildCsrfCookie(csrfToken, SESSION_TTL_SECONDS, request),
  );
  return response;
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, POST, OPTIONS' },
  });
}
