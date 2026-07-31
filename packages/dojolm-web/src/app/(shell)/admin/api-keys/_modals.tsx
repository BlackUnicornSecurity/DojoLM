// SPDX-License-Identifier: Apache-2.0
/**
 * api-keys/_modals — HAGANE E5.S3 verbatim extraction. The four key-
 * lifecycle modals (ShowSecretOnce / Create / Revoke / Rotate), MOVED
 * UNCHANGED from page.tsx.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmPhraseModal, RequiredAsterisk, Spinner } from "@/design";
import { readCsrfToken } from "@/lib/csrf-cookie";
import {
  ERROR_BANNERS,
  serverCodeFromStatus,
  type ServerCode,
} from "@/lib/error-copy";
import {
  ALLOWED_SCOPES,
  CLIPBOARD_AUTO_CLEAR_MS,
  type ApiKeyRow,
  type ApprovalResponse,
  type CreateKeyResponse,
  type Scope,
} from "./_lib";

export function ShowSecretOnceModal({
  secret,
  onClose,
}: {
  secret: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const clipboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount: if a clipboard zero-out timer is in flight when
  // the modal unmounts AFTER the operator has clicked away, cancel it.
  // The 30-s timer always runs to completion on close-via-confirm, but
  // an early unmount (route change) should not zero out a clipboard
  // the operator may have since written something else into.
  useEffect(() => {
    return () => {
      if (clipboardTimerRef.current !== null) {
        clearTimeout(clipboardTimerRef.current);
        clipboardTimerRef.current = null;
      }
    };
  }, []);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      // LOW-2 (security pass-3): zero out the clipboard 30 s after copy
      // so the secret does not linger in the OS clipboard. The timer
      // is module-local; we keep a ref so an early modal close can
      // cancel it (the operator may have copied something else by
      // then).
      if (clipboardTimerRef.current !== null) {
        clearTimeout(clipboardTimerRef.current);
      }
      clipboardTimerRef.current = setTimeout(() => {
        void navigator.clipboard.writeText("").catch(() => {
          // best-effort — clipboard permissions may have been revoked
          // since the initial copy. Nothing to do.
        });
        clipboardTimerRef.current = null;
      }, CLIPBOARD_AUTO_CLEAR_MS);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="show-secret-heading"
      data-testid="show-secret-once-modal"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "var(--bg-1)",
          padding: "var(--space-5)",
          borderRadius: 8,
          minWidth: 420,
          border: "1px solid var(--b-1)",
        }}
      >
        <h2 id="show-secret-heading" style={{ marginTop: 0, fontSize: 16 }}>
          API key created — shown once
        </h2>
        <p style={{ fontSize: 12, color: "var(--fg-dim)" }}>
          Copy this key now. It is shown ONCE and never again. The clipboard
          auto-clears 30 seconds after copy.
        </p>
        <code
          data-testid="show-secret-once-value"
          className="mono"
          style={{
            display: "block",
            padding: "10px 12px",
            marginTop: 6,
            background: "rgba(var(--black-rgb), 0.4)",
            border: "1px solid var(--b-1)",
            borderRadius: 6,
            fontSize: 13,
            wordBreak: "break-all",
          }}
        >
          {secret}
        </code>
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginTop: "var(--space-3)",
          }}
        >
          <button
            type="button"
            className="btn"
            data-testid="show-secret-once-copy"
            onClick={copy}
          >
            {copied ? "Copied (auto-clears in 30s)" : "Copy"}
          </button>
          <label
            style={{
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <input
              type="checkbox"
              data-testid="show-secret-once-confirm"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I have copied the key
          </label>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "var(--space-4)",
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            data-testid="show-secret-once-close"
            disabled={!confirmed}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreateKeyModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (
    label: string,
    scopes: readonly Scope[],
    expiresAt?: string,
  ) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<Set<Scope>>(new Set(["read"]));
  const [expiry, setExpiry] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().slice(0, 10);
  });
  const [busy, setBusy] = useState(false);
  // E4.S10 (F-7-027 P2 retire) — on-blur validation for the Label
  // field. The submit-time validation still fires (disabled when
  // label is empty); blur surfaces the same rule earlier so the
  // operator doesn't fill in scopes + expiry only to learn the
  // label is wrong. See the internal forms guide "Async on-blur
  // validation pattern" section.
  const [labelBlurError, setLabelBlurError] = useState<string | null>(null);

  function validateLabelOnBlur(value: string): void {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setLabelBlurError("Label is required.");
      return;
    }
    // Label is bounded 1..100 by the maxLength attribute on the input.
    // We catch the empty-after-trim case here so the operator sees
    // the validator before the disabled submit re-explains it.
    setLabelBlurError(null);
  }

  function toggleScope(s: Scope): void {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-key-heading"
      data-testid="create-key-modal"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-1)",
          padding: "var(--space-5)",
          borderRadius: 8,
          minWidth: 380,
          border: "1px solid var(--b-1)",
        }}
      >
        <h2 id="create-key-heading" style={{ marginTop: 0, fontSize: 16 }}>
          Create API key
        </h2>
        <label
          htmlFor="create-key-label-input"
          className="mono"
          style={{
            display: "block",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--fg-mute)",
            marginBottom: 6,
          }}
        >
          Label
          <RequiredAsterisk />
        </label>
        <input
          id="create-key-label-input"
          type="text"
          data-testid="create-key-label"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value.slice(0, 100));
            // E4.S10 — clear blur error as soon as the operator types
            // again; the next blur re-evaluates.
            if (labelBlurError !== null) setLabelBlurError(null);
          }}
          onBlur={(e) => validateLabelOnBlur(e.target.value)}
          maxLength={100}
          required
          aria-required="true"
          aria-invalid={labelBlurError !== null || undefined}
          aria-describedby={
            labelBlurError !== null ? "create-key-label-blur-error" : undefined
          }
          autoComplete="off"
          style={{
            width: "100%",
            padding: "8px 10px",
            fontSize: 12.5,
            background: "rgba(var(--black-rgb), 0.3)",
            color: "var(--fg)",
            border: "1px solid var(--b-1)",
            borderRadius: 6,
          }}
        />
        {labelBlurError !== null && (
          <span
            id="create-key-label-blur-error"
            role="alert"
            data-testid="create-key-label-blur-error"
            style={{
              display: "block",
              marginTop: "var(--space-1)",
              fontSize: 11,
              color: "var(--torii-hi)",
            }}
          >
            {labelBlurError}
          </span>
        )}
        {/* E9.S7 round-2 (V5 Wave 3w QA): the Scopes label is a GROUP
            label, not a single-input label. Using `<RequiredAsterisk />`
            here would produce a dangling AT announcement. The visible
            marker and submit validation carry the required state while
            the group itself is named through `aria-labelledby`. Submit-disabled UX
            (when scopes.size === 0) is preserved. */}
        <div
          id="create-key-scopes-label"
          className="mono"
          style={{
            display: "block",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--fg-mute)",
            margin: "12px 0 6px",
          }}
        >
          Scopes
          <RequiredAsterisk />
        </div>
        <div
          role="group"
          aria-labelledby="create-key-scopes-label"
          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
        >
          {ALLOWED_SCOPES.map((s) => (
            <label
              key={s}
              style={{
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: "var(--space-1)",
              }}
            >
              <input
                type="checkbox"
                data-testid={`create-key-scope-${s}`}
                checked={scopes.has(s)}
                onChange={() => toggleScope(s)}
              />
              {s}
            </label>
          ))}
        </div>
        <label
          className="mono"
          style={{
            display: "block",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--fg-mute)",
            margin: "12px 0 6px",
          }}
        >
          Expires (UTC)
        </label>
        <input
          type="date"
          data-testid="create-key-expiry"
          value={expiry}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setExpiry(e.target.value)}
          style={{
            padding: "8px 10px",
            fontSize: 12.5,
            background: "rgba(var(--black-rgb), 0.3)",
            color: "var(--fg)",
            border: "1px solid var(--b-1)",
            borderRadius: 6,
            fontFamily: "var(--mono)",
          }}
        />
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginTop: "var(--space-4)",
            justifyContent: "flex-end",
          }}
        >
          {/* Wave 3hh — F-6-016 (P2) retire. Specific verb ("Discard
              new key") replaces the generic "Cancel" so the dismiss
              affordance names what is being abandoned (the in-progress
              create-key form). Nielsen #4 — consistency through
              specificity. */}
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={busy}
          >
            Discard new key
          </button>
          <button
            type="button"
            className="btn btn-primary"
            data-testid="create-key-submit"
            disabled={
              busy ||
              label.trim().length === 0 ||
              scopes.size === 0 ||
              labelBlurError !== null
            }
            aria-busy={busy || undefined}
            onClick={async () => {
              setBusy(true);
              try {
                const expiresAt = expiry
                  ? new Date(`${expiry}T00:00:00Z`).toISOString()
                  : undefined;
                await onCreate(label.trim(), Array.from(scopes), expiresAt);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Spinner testId="create-key-submit-spinner" />}
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Wave 3gg (F-2-218 P2) — RevokeKeyModal migrated from inline JSX +
 * raw `style={{}}` blocks (a hand-rolled phrase-confirm clone of
 * `<ConfirmPhraseModal>`) to a 2-stage flow that delegates the
 * destructive phrase-typing portion to the canonical
 * `<ConfirmPhraseModal>`. The reason field still needs an
 * operator-supplied free-text input (audit trail per YR.13.1) which
 * `<ConfirmPhraseModal>` does not host — we capture it in a thin
 * lead-in dialog (`revoke-key-reason-modal`) styled via design-system
 * primitives (`wb-input`, `.btn`, `sys-modal*` classes via reuse of
 * the canonical modal chassis). The phrase-typing duplication
 * flagged by F-2-218 is eliminated: the phrase normalisation, mismatch
 * hint, focus management, Enter/Esc handling, and `<dialog>` semantics
 * now live in the single canonical primitive at
 * `src/design/system/ConfirmPhraseModal.tsx` instead of being
 * re-implemented inline here.
 */
export function RevokeKeyModal({
  keyRecord,
  onClose,
  onSubmit,
}: {
  keyRecord: ApiKeyRow;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  type Stage = "reason" | "confirm-phrase";
  const [reason, setReason] = useState("");
  const [stage, setStage] = useState<Stage>("reason");
  const [busy, setBusy] = useState(false);
  // E4.S10 (F-7-027 P2 retire) — on-blur validation for Reason.
  const [reasonBlurError, setReasonBlurError] = useState<string | null>(null);
  function validateReasonOnBlur(value: string): void {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setReasonBlurError("Reason is required.");
      return;
    }
    setReasonBlurError(null);
  }
  const expectedPhrase = `REVOKE ${keyRecord.label}`;
  const reasonReady = reason.trim().length > 0 && reasonBlurError === null;

  async function onConfirmPhrase(): Promise<void> {
    if (busy || !reasonReady) return;
    setBusy(true);
    try {
      await onSubmit(reason.trim());
    } finally {
      setBusy(false);
    }
  }

  // Stage 2 — delegate the phrase-typing UI to the canonical
  // `<ConfirmPhraseModal>`. F-2-218 closure: the hand-rolled phrase
  // input + normalisation + mismatch hint are no longer duplicated
  // here.
  if (stage === "confirm-phrase") {
    return (
      <ConfirmPhraseModal
        isOpen
        title={`Revoke ${keyRecord.label}?`}
        description="Submitting this opens a two-person approval. A second admin must enter the returned code via the review queue before the key is revoked."
        phrase={expectedPhrase}
        confirmLabel={busy ? "Submitting…" : "Submit approval"}
        cancelLabel="Back"
        onConfirm={() => {
          void onConfirmPhrase();
        }}
        onClose={() => {
          if (busy) return;
          setStage("reason");
        }}
      />
    );
  }

  // Stage 1 — capture the reason. Kept as a thin dialog using the same
  // `sys-modal*` class vocabulary as `<ConfirmPhraseModal>` so there is
  // no inline `style={{}}` block, and so a future polish pass can fold
  // both stages into a single primitive without re-styling the chassis.
  return (
    <dialog
      open
      role="dialog"
      aria-modal="true"
      aria-labelledby="revoke-key-reason-heading"
      data-testid="revoke-key-modal"
      className="sys-modal-scrim dojo-confirm-phrase-modal"
    >
      <div className="sys-modal">
        <h2 id="revoke-key-reason-heading" className="sys-modal-title">
          Revoke {keyRecord.label}?
        </h2>
        <p className="sys-modal-desc">
          Submitting this opens a two-person approval. A second admin must enter
          the returned code via the review queue before the key is revoked.
        </p>
        <label
          htmlFor="revoke-key-reason-input"
          className="sys-modal-phrase-label"
        >
          Reason
          <RequiredAsterisk />
        </label>
        <input
          id="revoke-key-reason-input"
          type="text"
          data-testid="revoke-key-reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value.slice(0, 500));
            if (reasonBlurError !== null) setReasonBlurError(null);
          }}
          onBlur={(e) => validateReasonOnBlur(e.target.value)}
          maxLength={500}
          required
          aria-required="true"
          aria-invalid={reasonBlurError !== null || undefined}
          aria-describedby={
            reasonBlurError !== null
              ? "revoke-key-reason-blur-error"
              : undefined
          }
          autoComplete="off"
          placeholder="e.g. suspected compromise; key holder offboarding; quarterly rotation"
          className="sys-modal-input"
        />
        {reasonBlurError !== null && (
          <p
            id="revoke-key-reason-blur-error"
            role="alert"
            data-testid="revoke-key-reason-blur-error"
            className="sys-modal-hint"
          >
            {reasonBlurError}
          </p>
        )}
        <div className="sys-modal-actions">
          {/* Wave 3hh — F-6-016 (P2) retire. "Keep API key" names the
              non-destructive escape from the revoke flow ("keep the
              thing the action would have destroyed") — the canonical
              Heuristic Evaluation pattern for destructive-action
              dismiss buttons. */}
          <button type="button" className="btn" onClick={onClose}>
            Keep API key
          </button>
          <button
            type="button"
            className="btn btn-danger"
            data-testid="revoke-key-submit"
            disabled={!reasonReady}
            onClick={() => {
              // Re-validate just before stage transition so a never-
              // blurred empty input gets the field-level error.
              validateReasonOnBlur(reason);
              if (reason.trim().length === 0) return;
              setStage("confirm-phrase");
            }}
          >
            Continue to phrase confirm
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function RotateKeyModal({
  keyRecord,
  onClose,
  onSubmit,
}: {
  keyRecord: ApiKeyRow;
  onClose: () => void;
  onSubmit: (
    label: string,
    scopes: readonly Scope[],
    reason: string,
  ) => Promise<void>;
}) {
  const [label, setLabel] = useState(keyRecord.label);
  const knownScopes = new Set(
    keyRecord.scopes.filter((s): s is Scope =>
      (ALLOWED_SCOPES as readonly string[]).includes(s),
    ),
  );
  const [scopes, setScopes] = useState<Set<Scope>>(knownScopes);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  // E4.S10 (F-7-027 P2 retire) — on-blur validation for both Label
  // and Reason. Same pattern as CreateKeyModal / RevokeKeyModal so
  // the rotate flow surfaces field-level rules at blur-time rather
  // than waiting for the disabled submit to do all the work.
  const [labelBlurError, setLabelBlurError] = useState<string | null>(null);
  const [reasonBlurError, setReasonBlurError] = useState<string | null>(null);
  function validateLabelOnBlur(value: string): void {
    if (value.trim().length === 0) {
      setLabelBlurError("Label is required.");
      return;
    }
    setLabelBlurError(null);
  }
  function validateReasonOnBlur(value: string): void {
    if (value.trim().length === 0) {
      setReasonBlurError("Reason is required.");
      return;
    }
    setReasonBlurError(null);
  }

  function toggleScope(s: Scope): void {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rotate-key-heading"
      data-testid="rotate-key-modal"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-1)",
          padding: "var(--space-5)",
          borderRadius: 8,
          minWidth: 380,
          border: "1px solid var(--b-1)",
        }}
      >
        <h2 id="rotate-key-heading" style={{ marginTop: 0, fontSize: 16 }}>
          Rotate {keyRecord.label}
        </h2>
        <p style={{ fontSize: 12, color: "var(--fg-dim)" }}>
          A second admin must approve. After approval, the previous key is
          revoked and a new one is issued. The new secret is shown ONCE in the
          approval-confirm response.
        </p>
        <label
          htmlFor="rotate-key-label-input"
          className="mono"
          style={{
            display: "block",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--fg-mute)",
            marginBottom: 6,
          }}
        >
          New label
          <RequiredAsterisk />
        </label>
        <input
          id="rotate-key-label-input"
          type="text"
          data-testid="rotate-key-label"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value.slice(0, 100));
            if (labelBlurError !== null) setLabelBlurError(null);
          }}
          onBlur={(e) => validateLabelOnBlur(e.target.value)}
          maxLength={100}
          required
          aria-required="true"
          aria-invalid={labelBlurError !== null || undefined}
          aria-describedby={
            labelBlurError !== null ? "rotate-key-label-blur-error" : undefined
          }
          autoComplete="off"
          style={{
            width: "100%",
            padding: "8px 10px",
            fontSize: 12.5,
            background: "rgba(var(--black-rgb), 0.3)",
            color: "var(--fg)",
            border: "1px solid var(--b-1)",
            borderRadius: 6,
          }}
        />
        {labelBlurError !== null && (
          <span
            id="rotate-key-label-blur-error"
            role="alert"
            data-testid="rotate-key-label-blur-error"
            style={{
              display: "block",
              marginTop: "var(--space-1)",
              fontSize: 11,
              color: "var(--torii-hi)",
            }}
          >
            {labelBlurError}
          </span>
        )}
        {/* E9.S7 round-2: same pattern as CreateKeyModal Scopes group. */}
        <div
          id="rotate-key-scopes-label"
          className="mono"
          style={{
            display: "block",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--fg-mute)",
            margin: "12px 0 6px",
          }}
        >
          Scopes
          <RequiredAsterisk />
        </div>
        <div
          role="group"
          aria-labelledby="rotate-key-scopes-label"
          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
        >
          {ALLOWED_SCOPES.map((s) => (
            <label
              key={s}
              style={{
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: "var(--space-1)",
              }}
            >
              <input
                type="checkbox"
                data-testid={`rotate-key-scope-${s}`}
                checked={scopes.has(s)}
                onChange={() => toggleScope(s)}
              />
              {s}
            </label>
          ))}
        </div>
        <label
          htmlFor="rotate-key-reason-input"
          className="mono"
          style={{
            display: "block",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--fg-mute)",
            margin: "12px 0 6px",
          }}
        >
          Reason
          <RequiredAsterisk />
        </label>
        <input
          id="rotate-key-reason-input"
          type="text"
          data-testid="rotate-key-reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value.slice(0, 500));
            if (reasonBlurError !== null) setReasonBlurError(null);
          }}
          onBlur={(e) => validateReasonOnBlur(e.target.value)}
          maxLength={500}
          required
          aria-required="true"
          aria-invalid={reasonBlurError !== null || undefined}
          aria-describedby={
            reasonBlurError !== null
              ? "rotate-key-reason-blur-error"
              : undefined
          }
          autoComplete="off"
          placeholder="e.g. quarterly rotation; suspected compromise; key holder rotation"
          style={{
            width: "100%",
            padding: "8px 10px",
            fontSize: 12.5,
            background: "rgba(var(--black-rgb), 0.3)",
            color: "var(--fg)",
            border: "1px solid var(--b-1)",
            borderRadius: 6,
          }}
        />
        {reasonBlurError !== null && (
          <span
            id="rotate-key-reason-blur-error"
            role="alert"
            data-testid="rotate-key-reason-blur-error"
            style={{
              display: "block",
              marginTop: "var(--space-1)",
              fontSize: 11,
              color: "var(--torii-hi)",
            }}
          >
            {reasonBlurError}
          </span>
        )}
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginTop: "var(--space-4)",
            justifyContent: "flex-end",
          }}
        >
          {/* Wave 3hh — F-6-016 (P2) retire. "Cancel rotation" names
              the abandoned operation. The two-person rotate flow is
              expensive (two admins coordinating) so an explicit
              "cancel rotation" reads more honestly than a generic
              dismiss. */}
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={busy}
          >
            Cancel rotation
          </button>
          <button
            type="button"
            className="btn btn-primary"
            data-testid="rotate-key-submit"
            disabled={
              busy ||
              label.trim().length === 0 ||
              scopes.size === 0 ||
              reason.trim().length === 0 ||
              labelBlurError !== null ||
              reasonBlurError !== null
            }
            aria-busy={busy || undefined}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit(label.trim(), Array.from(scopes), reason.trim());
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Spinner testId="rotate-key-submit-spinner" />}
            {busy ? "Submitting…" : "Submit approval"}
          </button>
        </div>
      </div>
    </div>
  );
}
