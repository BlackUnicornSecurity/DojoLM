// SPDX-License-Identifier: Apache-2.0
/**
 * File: CreateAdminStep.tsx
 * Purpose: Step 1 — Create the initial admin account.
 *
 * Yamabushi audit pass (2026-04-25): ported from shadcn `Card`/`Input`/
 * `Button`/`Label` to design-system primitives (`.wb-field`, `.wb-input`,
 * `.wb-label`, `.btn .btn-primary`, `.wb-banner.danger`) so the wizard
 * inherits Ritual-archetype typography, spacing, and tokens — no more
 * dual primitive systems on the same page.
 *
 * E9.S1 (2026-05-10): the non-secret form fields (username / email /
 * displayName) are now lifted into the parent SetupWizard's
 * sessionStorage-backed draft so an accidental refresh during the
 * admin step preserves the typed values. `password` and
 * `confirmPassword` remain LOCAL — they are never propagated to the
 * parent and never persisted. See `../useSetupWizardDraft.ts` for
 * the persistence layer + security rationale.
 */

"use client";

import { useState, type FormEvent } from "react";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { RequiredAsterisk } from "@/design";

interface CreateAdminStepProps {
  onComplete: (username: string) => void;
  /**
   * Hydrated values from the parent's sessionStorage draft. Defaults
   * to empty strings when there is no draft. Re-supplying these as
   * the source of truth (controlled inputs) means a refresh +
   * rehydrate path puts the typed text back into the form.
   */
  username?: string;
  email?: string;
  displayName?: string;
  /**
   * Field-change callback. Fires on every keystroke. The parent uses
   * this to update the sessionStorage-backed draft. Secrets
   * (password / confirmPassword) NEVER pass through this channel.
   */
  onFieldChange?: (
    field: "username" | "email" | "displayName",
    value: string,
  ) => void;
}

interface PasswordCheck {
  label: string;
  valid: boolean;
}

function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    {
      label: "12-72 characters",
      valid: password.length >= 12 && password.length <= 72,
    },
    { label: "Uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "Lowercase letter", valid: /[a-z]/.test(password) },
    { label: "Number", valid: /[0-9]/.test(password) },
    { label: "Special character", valid: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function CreateAdminStep({
  onComplete,
  username: usernameProp,
  email: emailProp,
  displayName: displayNameProp,
  onFieldChange,
}: CreateAdminStepProps) {
  // E9.S1 — Non-secret fields run in either "controlled-by-parent"
  // mode (when `onFieldChange` is wired) or "uncontrolled-local" mode
  // (legacy fallback when the parent did not opt-in to the draft
  // persistence). Selecting between the two paths via the presence
  // of `onFieldChange` keeps the standalone test cases (which mount
  // CreateAdminStep without a SetupWizard wrapper) working unchanged.
  const isControlled = typeof onFieldChange === "function";

  const [usernameLocal, setUsernameLocal] = useState(usernameProp ?? "");
  const [emailLocal, setEmailLocal] = useState(emailProp ?? "");
  const [displayNameLocal, setDisplayNameLocal] = useState(
    displayNameProp ?? "",
  );

  const username = isControlled ? (usernameProp ?? "") : usernameLocal;
  const email = isControlled ? (emailProp ?? "") : emailLocal;
  const displayName = isControlled ? (displayNameProp ?? "") : displayNameLocal;

  // Secrets — local-only, never lifted to the parent draft.
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // E9.S7 (retires F-6-009 P1): the previous render path surfaced
  // password-mismatch + complexity errors on every keystroke as the
  // operator typed. That fails Nielsen #1 (System Status) and #5
  // (Error Prevention) — the user is mid-input, not in error. Defer
  // field-level error display until the field has been BLURRED at
  // least once (or the form has been submit-attempted). The blur
  // flags are component-local; no state is reflected back to the
  // server, no prop contract changes.
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [confirmPasswordBlurred, setConfirmPasswordBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  function handleUsernameChange(value: string) {
    if (isControlled) onFieldChange?.("username", value);
    else setUsernameLocal(value);
  }
  function handleEmailChange(value: string) {
    if (isControlled) onFieldChange?.("email", value);
    else setEmailLocal(value);
  }
  function handleDisplayNameChange(value: string) {
    if (isControlled) onFieldChange?.("displayName", value);
    else setDisplayNameLocal(value);
  }

  const passwordChecks = getPasswordChecks(password);
  const allPasswordChecksPass = passwordChecks.every((c) => c.valid);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  // E9.S7 — derived display gate for the password-checks list and the
  // mismatch hint. We continue to RECOMPUTE the booleans on every
  // keystroke (so the submit button enables/disables in real time —
  // this is desirable progressive feedback, not an error verdict),
  // but the *visible error/strip* only renders after blur or after a
  // submit attempt.
  const showPasswordChecks =
    password.length > 0 && (passwordBlurred || submitAttempted);
  const showMismatchHint =
    confirmPassword.length > 0 &&
    !passwordsMatch &&
    (confirmPasswordBlurred || submitAttempted);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    // E9.S7 — once the operator hits Submit, the per-field error
    // hints become unconditionally visible regardless of focus state
    // so they can guide the next keystroke. The blur flags continue
    // to gate display until that point.
    setSubmitAttempted(true);

    if (!allPasswordChecksPass) {
      setError("Password does not meet complexity requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/setup/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim() || undefined,
          password,
          displayName: displayName.trim() || undefined,
        }),
      });

      if (res.ok) {
        onComplete(username.trim());
      } else {
        const data = await res
          .json()
          .catch(() => ({ error: "Failed to create account" }));
        setError(data.error || "Failed to create account");
        setSubmitting(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="setup-create-admin-title"
      style={{ marginTop: 18 }}
    >
      <header style={{ textAlign: "center", marginBottom: 18 }}>
        <div className="setup-pane-kick">Step 1 of 6</div>
        <div
          className="setup-step-icon"
          aria-hidden="true"
          style={{
            margin: "0 auto 10px",
            width: 48,
            height: 48,
            display: "grid",
            placeItems: "center",
            borderRadius: 999,
            background: "rgba(var(--torii-rgb), 0.12)",
            border: "1px solid rgba(var(--torii-rgb), 0.4)",
          }}
        >
          <Shield
            className="h-6 w-6"
            style={{ color: "var(--torii-deep)" }}
            aria-hidden="true"
          />
        </div>
        <h2
          id="setup-create-admin-title"
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "var(--paper-ink)",
            letterSpacing: "-0.005em",
          }}
        >
          Admin account
        </h2>
        <p
          style={{
            margin: "4px 0 0",
            color: "var(--paper-mute)",
            fontSize: 12.5,
          }}
        >
          Create the first administrator for this deployment.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        {error && (
          <div
            role="alert"
            className="wb-banner danger"
            data-testid="setup-create-admin-error"
          >
            <AlertCircle
              className="h-4 w-4"
              aria-hidden="true"
              style={{ marginRight: 8, verticalAlign: "middle" }}
            />
            {error}
          </div>
        )}

        <div className="wb-field">
          <label className="wb-label" htmlFor="setup-username">
            Username
            <RequiredAsterisk variant="word" />
          </label>
          <input
            id="setup-username"
            className="wb-input"
            type="text"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder="admin"
            autoComplete="username"
            required
            aria-required="true"
            disabled={submitting}
            minLength={3}
            maxLength={64}
            autoFocus
          />
        </div>

        <div className="wb-field">
          <label className="wb-label" htmlFor="setup-email">
            Email
          </label>
          <input
            id="setup-email"
            className="wb-input"
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="admin@example.com"
            autoComplete="email"
            disabled={submitting}
            maxLength={254}
          />
        </div>

        <div className="wb-field">
          <label className="wb-label" htmlFor="setup-display-name">
            Display name
          </label>
          <input
            id="setup-display-name"
            className="wb-input"
            type="text"
            value={displayName}
            onChange={(e) => handleDisplayNameChange(e.target.value)}
            placeholder="Platform Admin"
            autoComplete="name"
            disabled={submitting}
            maxLength={128}
          />
        </div>

        <div className="wb-field">
          <label className="wb-label" htmlFor="setup-password">
            Password
            <RequiredAsterisk variant="word" />
          </label>
          <input
            id="setup-password"
            className="wb-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setPasswordBlurred(true)}
            placeholder="Strong password"
            autoComplete="new-password"
            required
            aria-required="true"
            disabled={submitting}
          />
          {/* Wave-C `.phint` — inline password requirement guidance. */}
          <p className="wb-hint">12 characters or more.</p>
          {showPasswordChecks && (
            <div
              role="list"
              data-testid="setup-password-checks"
              style={{
                marginTop: 6,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 4,
                fontSize: 11,
                fontFamily: "var(--mono)",
              }}
            >
              {passwordChecks.map((check) => (
                <div
                  key={check.label}
                  role="listitem"
                  style={{
                    color: check.valid ? "var(--jade-lg)" : "var(--paper-mute)",
                  }}
                >
                  {check.valid ? "\u2713" : "\u2022"} {check.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="wb-field">
          <label className="wb-label" htmlFor="setup-confirm-password">
            Confirm password
            <RequiredAsterisk variant="word" />
          </label>
          <input
            id="setup-confirm-password"
            className="wb-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() => setConfirmPasswordBlurred(true)}
            placeholder="Repeat password"
            autoComplete="new-password"
            required
            aria-required="true"
            disabled={submitting}
          />
          {/* E9.S7 \u2014 error class differs from helper class (.wb-error
              vs .wb-hint) so screen readers paired with magnifiers
              still distinguish helper from error even at 200% zoom
              where colour alone is insufficient (WCAG 1.4.1). */}
          {showMismatchHint && (
            <p
              className="wb-error"
              role="alert"
              data-testid="setup-confirm-mismatch"
            >
              Passwords do not match
            </p>
          )}
        </div>

        {/* Wave-C hairline separating the form from its action. */}
        <div className="setup-cta-divider" aria-hidden="true" />

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
          disabled={
            submitting ||
            !allPasswordChecksPass ||
            !passwordsMatch ||
            username.trim().length < 3
          }
        >
          {submitting ? (
            <>
              <Loader2
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
                style={{ marginRight: 8 }}
              />
              Creating account...
            </>
          ) : (
            "Create account and continue"
          )}
        </button>
      </form>
    </section>
  );
}
