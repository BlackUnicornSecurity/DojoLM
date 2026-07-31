// SPDX-License-Identifier: Apache-2.0
"use client";

/**
 * RequestInviteForm — Epic 4B.7 S4B.7.4 client component.
 *
 * Unauthenticated form posting to `/api/members/request-invite`. The
 * server's double-submit CSRF check (`csrfValid` in the route) expects
 * a `tpi_csrf` cookie whose value matches the `x-csrf-token` header.
 *
 * E6.S10 (2026-05-09) — F-2-214: error UI was banner-only ("That email
 * or reason is invalid. Please check and try again.") which forced the
 * user to guess WHICH field is wrong. Refactored so:
 *   - field-level invalid-body errors render INLINE next to the
 *     offending input via `aria-describedby` wiring (anchored).
 *   - global errors (rate-limited, csrf, network, 5xx) keep the
 *     existing top banner (the field-anchored surface only fits
 *     errors that map to a specific input).
 *
 * Cookie-mint location: Next 15+ Server Components cannot set cookies;
 * this client component mints the nonce on mount via `document.cookie =
 * ...; SameSite=Strict`. The SameSite=Strict attribute keeps the
 * cookie same-origin only — a cross-site attacker's `fetch` or
 * `<form action>` will not carry the cookie, so the server's
 * double-submit check fails with 403 even though the attacker can
 * read the nonce value from a cross-origin response they control
 * (they can't — SameSite=Strict blocks that too). A client-initiated
 * mint is compliant with the cookie-bound double-submit intent (§11)
 * because the defensive property is the SameSite=Strict attribute,
 * not the write-side (server vs. client).
 *
 * Idempotent: if the browser already carries a tpi_csrf cookie (e.g.
 * from a prior auth flow), we do NOT overwrite it — rotation stays
 * the responsibility of the existing auth flows.
 *
 * Client-side validation mirrors the server schema byte-for-byte so a
 * server-only reject is always an inbound-payload drift bug, not a
 * client skew. The error-banner copy is fixed per response code — no
 * caller-input reflection (rule §15).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
} from "react";
import { Spinner, SystemBanner } from "@/design";
import { ERROR_BANNERS as CANONICAL_ERROR_BANNERS } from "@/lib/error-copy";

type FieldKey = "email" | "why";

type SubmitStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success" }
  | {
      readonly kind: "error";
      readonly code: ErrorCode;
      /** Set when the error anchors to a specific field (E6.S10 / F-2-214). */
      readonly field?: FieldKey;
    };

type ErrorCode =
  | "invalid-body"
  | "rate-limited"
  | "duplicate-pending-request"
  | "service-not-configured"
  | "csrf-validation-failed"
  | "internal-error"
  | "network-error";

/**
 * E6.S12 — banner copy is now sourced from the canonical
 * `ERROR_BANNERS` table in `src/lib/error-copy.ts`. The local table
 * here is a thin adapter that maps the form-specific `ErrorCode`
 * vocabulary (kept for back-compat with the server's response codes)
 * onto the consolidated banner copy.
 *
 * The two form-specific entries that do not have a ServerCode peer:
 *   - `'duplicate-pending-request'` — "We already have your request
 *     on file." This is a success-adjacent state (the operator has
 *     already done the right thing) not an error, so it borrows the
 *     guidance voice of the validation tone without claiming a
 *     blocking failure.
 *
 * Every other code reads from `CANONICAL_ERROR_BANNERS` so a refresh
 * of the canonical map automatically refreshes this form.
 */
function bannerCopyFor(code: ErrorCode): string {
  switch (code) {
    case "invalid-body":
      return CANONICAL_ERROR_BANNERS["invalid-input"].body;
    case "rate-limited":
      return CANONICAL_ERROR_BANNERS["rate-limited"].body;
    case "duplicate-pending-request":
      // Not a true error — the operator already submitted. Use the
      // canonical "conflict" body which already reads as guidance
      // ("Refresh to see the latest values.").
      return "We already have your request on file. We will email you when an admin reviews it.";
    case "service-not-configured":
      return CANONICAL_ERROR_BANNERS["service-unavailable"].body;
    case "csrf-validation-failed":
      return CANONICAL_ERROR_BANNERS["csrf-failed"].body;
    case "internal-error":
      return CANONICAL_ERROR_BANNERS.server.body;
    case "network-error":
      return CANONICAL_ERROR_BANNERS.network.body;
  }
}

/**
 * Field-anchored copy for the invalid-body case (E6.S10 / F-2-214).
 * The server's `invalid-body` code is union-typed across email and
 * why; the client knows which one failed because it ran the same
 * validators byte-for-byte before the network round-trip. Once the
 * server returns invalid-body without a client-side trigger we fall
 * back to the banner copy (drift case — both fields are flagged so
 * the user is not stuck guessing).
 */
const FIELD_ERRORS: Readonly<Record<FieldKey, string>> = Object.freeze({
  email: "Enter a valid email address (e.g. you@example.com).",
  why: "Use plain text only — no URLs, brackets, or backticks.",
});

// Client-side schemas — mirror the server zod schemas byte-for-byte.
const EMAIL_PATTERN = /^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{1,63}$/;
const WHY_ALLOWED_RE = /^[\x20-\x7E\t\r\n]+$/;
const WHY_DENY_CHARS: readonly string[] = Object.freeze([
  "<",
  ">",
  "[",
  "]",
  "{",
  "}",
  "`",
]);
const WHY_DENY_URL: readonly string[] = Object.freeze(["http://", "https://"]);
const WHY_MAX = 280;
const EMAIL_MAX = 254;

function readCsrfFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)tpi_csrf=([^;]+)/);
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

/**
 * Client-side hex-token generator — 32 hex chars (16 random bytes
 * from the Web Crypto API). Matches the shape of the server-set
 * `tpi_csrf` cookie (`buildCsrfCookie` + `createSetupCsrfToken`).
 */
function generateCsrfToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/**
 * Mint the CSRF cookie client-side if it is not already present.
 * `SameSite=Strict` is the security-critical attribute — it prevents
 * any cross-site context (hostile `<iframe>`, third-party form
 * submission, scripts on other origins) from either reading or
 * sending this cookie, which is the whole point of a double-submit
 * nonce. `Secure` is set whenever the page is served over HTTPS.
 * TTL: 15 min — long enough to read + submit, short enough to
 * minimise stolen-cookie utility.
 */
function ensureCsrfCookie(): string {
  const existing = readCsrfFromCookie();
  if (existing.length >= 16) return existing;
  if (typeof document === "undefined") return "";
  const token = generateCsrfToken();
  const secureAttr =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `tpi_csrf=${token}; SameSite=Strict; Path=/; Max-Age=${15 * 60}${secureAttr}`;
  return token;
}

function validateEmailClient(email: string): boolean {
  if (email.length < 3 || email.length > EMAIL_MAX) return false;
  return EMAIL_PATTERN.test(email);
}

function validateWhyClient(why: string): boolean {
  const trimmed = why.trim();
  if (trimmed.length === 0 || trimmed.length > WHY_MAX) return false;
  if (!WHY_ALLOWED_RE.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  for (const bad of WHY_DENY_URL) {
    if (lower.includes(bad)) return false;
  }
  for (const bad of WHY_DENY_CHARS) {
    if (trimmed.includes(bad)) return false;
  }
  return true;
}

function isValidErrorCode(value: unknown): value is ErrorCode {
  return (
    value === "invalid-body" ||
    value === "rate-limited" ||
    value === "duplicate-pending-request" ||
    value === "service-not-configured" ||
    value === "csrf-validation-failed" ||
    value === "internal-error"
  );
}

export function RequestInviteForm(): ReactElement {
  const [email, setEmail] = useState<string>("");
  const [why, setWhy] = useState<string>("");
  const [status, setStatus] = useState<SubmitStatus>({ kind: "idle" });
  const [csrfReady, setCsrfReady] = useState<boolean>(false);
  const csrfMintedRef = useRef<boolean>(false);

  // Mint the CSRF cookie on mount. `useEffect` runs only after the
  // component hydrates in the browser, so SSR never touches
  // `document`. The `useRef` guard prevents duplicate mints during
  // React Strict Mode's double-invoke of effects in development.
  // `csrfReady` gates the submit button so the user cannot fire a
  // submit before the cookie exists (defensive belt-and-braces — the
  // submit handler also re-mints on the fly via `ensureCsrfCookie()`).
  useEffect(() => {
    if (csrfMintedRef.current) return;
    csrfMintedRef.current = true;
    ensureCsrfCookie();
    setCsrfReady(true);
  }, []);

  const onEmailChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
      if (status.kind === "error") setStatus({ kind: "idle" });
    },
    [status.kind],
  );

  const onWhyChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setWhy(e.target.value);
      if (status.kind === "error") setStatus({ kind: "idle" });
    },
    [status.kind],
  );

  const onSubmit = useCallback(
    async (ev: FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      if (status.kind === "submitting") return;

      // Client-side schema mirrors the server byte-for-byte. F-2-214:
      // anchor the error to the offending field so the user does not
      // have to inspect the banner copy and guess WHICH input failed.
      if (!validateEmailClient(email.trim())) {
        setStatus({ kind: "error", code: "invalid-body", field: "email" });
        return;
      }
      if (!validateWhyClient(why)) {
        setStatus({ kind: "error", code: "invalid-body", field: "why" });
        return;
      }

      // Defensive re-mint — if the cookie expired or was cleared
      // between page load and submit, ensureCsrfCookie() writes a
      // fresh one. A same-origin write means the server's
      // double-submit header check still passes.
      let csrf = readCsrfFromCookie();
      if (csrf.length === 0) {
        csrf = ensureCsrfCookie();
      }
      if (csrf.length === 0) {
        setStatus({ kind: "error", code: "csrf-validation-failed" });
        return;
      }

      setStatus({ kind: "submitting" });
      try {
        const res = await fetch("/api/members/request-invite", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrf,
          },
          body: JSON.stringify({ email: email.trim(), why: why.trim() }),
        });
        if (res.status === 202) {
          setStatus({ kind: "success" });
          setEmail("");
          setWhy("");
          return;
        }
        let code: ErrorCode = "internal-error";
        try {
          const body = (await res.json()) as { code?: unknown };
          if (isValidErrorCode(body.code)) code = body.code;
        } catch {
          /* ignore body-parse failures */
        }
        setStatus({ kind: "error", code });
      } catch {
        setStatus({ kind: "error", code: "network-error" });
      }
    },
    [email, why, status.kind],
  );

  // F-2-214: an `invalid-body` error with a known `field` is rendered
  // INLINE next to the input. All other errors (rate-limited, csrf,
  // network, internal) keep the top-level banner because they are
  // form-global (no specific input to anchor to).
  const fieldError: FieldKey | null =
    status.kind === "error" && status.code === "invalid-body" && status.field
      ? status.field
      : null;
  const banner =
    status.kind === "error" && fieldError === null
      ? bannerCopyFor(status.code)
      : null;
  const emailDescId = "members-request-invite-email-error";
  const whyDescId = "members-request-invite-why-error";

  return (
    <div className="member-gate-form">
      <form
        data-testid="members-request-invite-form"
        onSubmit={onSubmit}
        className="request-invite-form"
      >
        <div className="request-invite-field">
          <label htmlFor="members-request-invite-email">Email</label>
          <input
            id="members-request-invite-email"
            data-testid="members-request-invite-email-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={onEmailChange}
            required
            maxLength={EMAIL_MAX}
            className="wb-input"
            aria-invalid={fieldError === "email" ? true : undefined}
            aria-describedby={fieldError === "email" ? emailDescId : undefined}
          />
          {fieldError === "email" && (
            <span
              id={emailDescId}
              data-testid="members-request-invite-email-error"
              role="alert"
              className="request-invite-field-error"
            >
              {FIELD_ERRORS.email}
            </span>
          )}
        </div>
        <div className="request-invite-field">
          <label htmlFor="members-request-invite-why">
            Why do you want an invite? (&le;280 chars)
          </label>
          {/* E7.S12 / E9.S10 (retires F-4-032 P3) — request-invite reason
              gets lang="en" + spellcheck="true" defaults. WCAG SC 1.3.5
              + 1.4.12. Why-text is operator-authored natural-language
              prose ("here is why I'd like an invite"); spellcheck on
              that surface is conventional. */}
          <textarea
            id="members-request-invite-why"
            data-testid="members-request-invite-why-input"
            value={why}
            onChange={onWhyChange}
            required
            maxLength={WHY_MAX}
            rows={4}
            className="wb-textarea"
            aria-invalid={fieldError === "why" ? true : undefined}
            aria-describedby={fieldError === "why" ? whyDescId : undefined}
            lang="en"
            spellCheck="true"
          />
          {fieldError === "why" && (
            <span
              id={whyDescId}
              data-testid="members-request-invite-why-error"
              role="alert"
              className="request-invite-field-error"
            >
              {FIELD_ERRORS.why}
            </span>
          )}
        </div>
        {/* E4.S10 (retires F-2-212 P2 + F-2-224 P2 part) — async-trigger
            spinner glyph sits to the LEFT of the label while submitting.
            Label remains visible so the operator never wonders if the
            click registered. aria-busy lets AT announce the in-flight
            state without losing the button's label. */}
        <button
          type="submit"
          data-testid="members-request-invite-submit"
          className="btn btn-primary request-invite-submit"
          disabled={status.kind === "submitting" || !csrfReady}
          aria-busy={status.kind === "submitting" || undefined}
        >
          {status.kind === "submitting" && (
            <Spinner testId="request-invite-submit-spinner" />
          )}
          {status.kind === "submitting"
            ? "Sending invite request…"
            : "Send invite request"}
        </button>
      </form>
      <SystemBanner
        active={banner !== null}
        tone="danger"
        testId="members-request-invite-error-banner"
      >
        {banner ?? ""}
      </SystemBanner>
      {status.kind === "success" && (
        <div
          data-testid="members-request-invite-success-panel"
          role="status"
          className="request-invite-success"
        >
          {/* Wave 3hh — F-6-023 (P1) retire. The previous copy promised
              an outcome the system can't guarantee ("you WILL receive
              the magic link") — admin review is gated on capacity +
              fit; not every request results in an invite. Soften from
              absolute promise to conditional ("we'll review and follow
              up if approved") so the operator doesn't bank on a
              guaranteed magic-link email. */}
          <p>
            Request received. We&apos;ll review your request and follow up by
            email if an admin approves and issues an invite.
          </p>
        </div>
      )}
    </div>
  );
}
