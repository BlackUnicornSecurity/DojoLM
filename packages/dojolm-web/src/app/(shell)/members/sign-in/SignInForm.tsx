// SPDX-License-Identifier: Apache-2.0
"use client";

/**
 * Members sign-in form — pairs an admin-issued invite code with the
 * invitee's email, POSTs to `/api/auth/members/magic-link`, and on
 * 202 displays the raw magic-link token. The invitee clicks the link
 * (a GET to the same route) and the backend redeems + mints a session
 * + 302s to `/members`.
 *
 * Client-only. Does NOT import `bu-tpi/flags` (§13 of the E4B.1 spec)
 * — the server page gates flag visibility. The `publicBetaEnabled`
 * prop is the E4B.7 replacement for that pattern: the page reads
 * `MEMBERS_PUBLIC_BETA_ENABLED` and passes a boolean down, so the
 * client renders the CTA conditionally without reading flags itself.
 *
 * Error surfaces (R-T2/R-T3): every non-202 response renders a fixed
 * banner from a lookup table. Caller-supplied strings are never
 * reflected.
 *
 * E6.S12 (retires F-6-024 P2): banner copy is now sourced from the
 * canonical {@link ERROR_BANNERS} table in `src/lib/error-copy.ts`.
 * The pre-E6.S12 form carried a private `ERROR_BANNERS` constant
 * that diverged in voice from the rest of the app (e.g. "Too many
 * attempts" vs the canonical "You are sending requests too fast.");
 * the consolidation gives every form a single source of truth for
 * severity tone + copy + a11y posture.
 */

import Link from "next/link";
import { useState, useCallback } from "react";
import { ERROR_BANNERS, type ServerCode } from "@/lib/error-copy";

type SubmitStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  // Dev-sink path: server returned the rawToken in the 202 body
  // (MEMBER_EMAIL_BACKEND=log) — show the clickable link inline.
  | { kind: "sent-dev"; rawToken: string }
  // Production path: server omitted rawToken (MEMBER_EMAIL_BACKEND=smtp)
  // — show "check your email" and NO in-page token display.
  | { kind: "sent-email" }
  | { kind: "error"; code: ServerCode };

function statusToServerCode(status: number, code?: string): ServerCode {
  // 503 covers BOTH the members-UI flag being off AND the email
  // backend being mis-configured. We conflate them into the same
  // user-facing copy via `members-disabled` so the UI does NOT
  // disclose which branch fired (R-T3).
  if (
    status === 503 ||
    code === "MEMBERS_UI_DISABLED" ||
    code === "email-backend-unavailable"
  ) {
    return "members-disabled";
  }
  if (status === 410) return "invite-dead";
  if (status === 404) return "not-found";
  if (status === 429) return "rate-limited";
  if (status >= 500 && status <= 599) return "server";
  return "unknown";
}

export interface SignInFormProps {
  /**
   * E4B.7 S4B.7.4 — when true, the "Request one" CTA renders below
   * the sign-in form. When false, the CTA element is omitted entirely
   * from the DOM (not hidden via CSS) so the closed-cohort flag-off
   * state has no dangling markup.
   */
  readonly publicBetaEnabled?: boolean;
}

export function SignInForm({
  publicBetaEnabled = false,
}: SignInFormProps = {}) {
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmitStatus>({ kind: "idle" });

  const onSubmit = useCallback(
    async (ev: React.FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      setStatus({ kind: "submitting" });
      try {
        // Plain `fetch` — the magic-link POST is deliberately
        // CSRF-exempt (anonymous entry point with no session), so
        // `fetchWithAuth` (which attaches the CSRF cookie) is the
        // wrong helper here. Using plain fetch also makes the
        // intent explicit for future maintainers: this path MUST
        // NOT acquire a CSRF token from storage — the route enforces
        // the single-use invariant via the invite code itself.
        const res = await fetch("/api/auth/members/magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inviteCode: inviteCode.trim(),
            email: email.trim(),
          }),
          credentials: "same-origin",
        });
        if (res.status === 202) {
          const body = (await res.json()) as { rawToken?: string };
          // MEMBER-EMAIL: when the backend is SMTP, the 202 body is
          // `{ ok: true }` — rawToken is absent and the user is told
          // to check their email. When the backend is the dev log
          // sender, rawToken echoes back and we show the clickable
          // link inline so local dev still works without SMTP.
          if (body.rawToken) {
            setStatus({ kind: "sent-dev", rawToken: body.rawToken });
            return;
          }
          setStatus({ kind: "sent-email" });
          return;
        }
        let bodyCode: string | undefined;
        try {
          const body = (await res.json()) as { code?: string };
          bodyCode = body.code;
        } catch {
          /* ignore body-parse failures */
        }
        setStatus({
          kind: "error",
          code: statusToServerCode(res.status, bodyCode),
        });
      } catch {
        // A thrown fetch is `'network'` by definition.
        setStatus({ kind: "error", code: "network" });
      }
    },
    [inviteCode, email],
  );

  // E6.S12 — banner copy now sourced from the canonical ERROR_BANNERS
  // table. `members-disabled` copy is intentionally preserved as
  // "Member access is not enabled yet. Check back at private-beta
  // launch." which doubles as the safe-mode/disabled context for
  // this surface; tests pin that exact substring.
  function bannerFor(s: SubmitStatus): string | null {
    if (s.kind !== "error") return null;
    // The legacy 'not-found' copy mentioned BOTH the invite code AND
    // the email; the canonical 'not-found' is generic. We special-case
    // the invite-code-not-found copy here so the consumer still gets
    // the actionable hint ("double-check the values or ask the admin
    // who issued the invite").
    if (s.code === "not-found") {
      return ERROR_BANNERS["not-found"].body;
    }
    return ERROR_BANNERS[s.code].body;
  }
  const banner = bannerFor(status);

  // YR.0.4 (2026-04-26) — outer `.panel` div migrated to design-system
  // <Panel>. testids and form structure preserved byte-for-byte.
  //
  // E8.S8 (2026-05-11) — retires F-9-008 (P2). The Panel title prop
  // is intentionally omitted: it would render as <h3> (see
  // src/design/shell/Panel.tsx), which would create an H1 → H3 jump on
  // the sign-in page. The host page now carries an explicit <h1>
  // ("Sign in") so the form panel acts as a body container only.
  return (
    <div className="member-gate-form">
      {/* E7.S12 (retires F-4-021 P3) — refactor wrapping-<label> to
          explicit htmlFor/id pairing. Matches the admin pattern used
          across /admin/* surfaces (and the sister members surface
          /members/request-invite which already ships htmlFor). The
          wrapping-label pattern is technically valid for screen
          readers (the input is the only labelable descendant) but it
          forces speech-recognition users (Dragon NaturallySpeaking
          "click invite code") to land on the wrapper rather than the
          input itself; the explicit-id pattern keeps the relationship
          unambiguous and lets every assistive-tech tool target the
          input directly. WCAG SC 1.3.1 Info and Relationships +
          SC 4.1.2 Name, Role, Value. */}
      <form onSubmit={onSubmit} data-testid="members-sign-in-form">
        <div className="gfield">
          <label htmlFor="members-sign-in-invite-code">Invite code</label>
          <input
            id="members-sign-in-invite-code"
            type="text"
            name="inviteCode"
            data-testid="members-sign-in-invite-code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            autoComplete="off"
            required
            minLength={32}
            maxLength={256}
            className="wb-input input"
          />
        </div>
        <div className="gfield">
          <label htmlFor="members-sign-in-email">Email</label>
          <input
            id="members-sign-in-email"
            type="email"
            name="email"
            data-testid="members-sign-in-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            maxLength={254}
            className="wb-input input"
          />
        </div>
        <button
          type="submit"
          data-testid="members-sign-in-submit"
          className="btn btn-primary member-gate-submit"
          disabled={status.kind === "submitting"}
        >
          {status.kind === "submitting" ? "Sending…" : "Send magic link"}
        </button>
      </form>
      {banner && (
        <div
          role="alert"
          className="wb-banner danger"
          data-testid="members-sign-in-error"
        >
          {banner}
        </div>
      )}
      {status.kind === "sent-dev" && (
        <div className="gate-info" data-testid="members-sign-in-sent">
          <p>
            Magic link issued. In production this would arrive by email; in dev
            we show it below:
          </p>
          <a
            data-testid="members-sign-in-link"
            className="v2-touch-link"
            href={`/api/auth/members/magic-link?token=${encodeURIComponent(status.rawToken)}`}
          >
            Click to complete sign-in
          </a>
        </div>
      )}
      {status.kind === "sent-email" && (
        <div
          className="gate-info"
          data-testid="members-sign-in-check-email"
          role="status"
        >
          <p>
            Check your email. We sent a one-time sign-in link to the address on
            your invite. It will expire in 10 minutes.
          </p>
        </div>
      )}
      {publicBetaEnabled && (
        <p className="gate-links">
          <Link
            href="/members/request-invite"
            data-testid="members-sign-in-request-invite-cta"
          >
            No invite yet? Request one →
          </Link>
        </p>
      )}
    </div>
  );
}
