// SPDX-License-Identifier: Apache-2.0
/**
 * ConfirmPhraseModal — requires the operator to type an exact phrase
 * before confirming a destructive or high-risk action.
 *
 * Promoted from src/components/security/ in Epic 7 S7.4 and made the
 * single source of truth — the legacy component + its tests were
 * removed in the same commit. The promoted primitive composes tokens
 * via `.sys-modal*` classes declared in src/design/styles/system.css.
 *
 * Design: phrase match is trimmed and case-folded (Postel's Law — be
 * liberal in what you accept). Whitespace and case differences are
 * tolerated so an operator who pastes from a runbook or types under
 * pressure does not get silently rejected. Submit button is disabled
 * until the normalised typed value matches the normalised phrase. On
 * mismatch with non-empty input we render a `sys-modal-hint`
 * diagnostic per WCAG 2.2 SC 3.3.3 Error Suggestion (Level AA).
 *
 * E2.S2 (REMEDIATION-PLAN lines 333-347): migrated from a hand-rolled
 * `<div role="dialog" aria-modal="true">` shell to the native HTML
 * `<dialog>` element. The browser now owns:
 *   - the focus trap (Tab cycle stays inside; verified Playwright Tab×20)
 *   - Esc-to-close (UA default; we only forward `onClose`)
 *   - focus restore to the previously-focused element on close
 *   - the modal stacking context (`top-layer` semantics)
 *
 * Backdrop: native `<dialog>` does NOT close on backdrop click by
 * default — we wire that explicitly via a click handler that gates on
 * `event.target === dialogRef.current` (the `<dialog>` element catches
 * the bubbled click only when the operator clicks the backdrop pseudo
 * area outside the inner content).
 *
 * Pattern stylesheet: `dojo-confirm-phrase-modal::backdrop` uses
 * `rgba(var(--black-rgb), 0.6)` per E1.S2 lint rule + GUARDRAILS G10
 * (no hardcoded colors in design CSS).
 *
 * Polyfill decision (E2.S2): NO Safari < 15.4 polyfill. Project
 * stack is Next.js 16 + React 19 (no browserslist config); native
 * `<dialog>` is Baseline 2022. Adding a polyfill would violate the
 * "no speculative dependencies" rule (kickoff doc §5.6).
 *
 * Invariants enforced by the test suite at
 *   src/design/system/__tests__/ConfirmPhraseModal.test.tsx
 *   - interface name (ConfirmPhraseModalProps) + prop shape stable
 *   - typed-state resets on close
 *   - Escape + Enter keyboard handlers
 *   - autoFocus + aria-modal + aria-labelledby + aria-describedby
 *   - data-testid values: confirm-phrase-modal, phrase-input,
 *     cancel-button, confirm-button, phrase-hint
 *   - autoComplete="off" + spellCheck={false} on the phrase input so
 *     browsers cannot autofill or squiggle-underline the destructive
 *     phrase during a live demo.
 *   - E2.S2: focus restored to invoking element on close (native).
 *
 * Retires (E0.S5, plan v4):
 *   - F-6-012 (P1) — strict equality + whitespace-strict
 *   - F-7-009 (P0->P1 recalibrated, dedup of F-6-012)
 *   - F-6-019 (P1) — bundled into E0.S5 per plan v4
 *
 * Retires (E2.S2, plan v4):
 *   - F-2-217 (P0) — modal not using native <dialog>
 *   - F-217-equivalents in F-A04-028, F-629
 *
 * WCAG citations (E2.S2):
 *   - SC 2.1.2 No Keyboard Trap (Level A) — native <dialog> manages
 *     a containment-style trap; Esc always escapes.
 *   - SC 2.4.3 Focus Order (Level A) — focus restored to invoking
 *     control on close; sequence preserved across opens.
 *   - SC 4.1.3 Status Messages (Level AA) — `role="alert"` on the
 *     mismatch hint announces the diagnostic without taking focus.
 */

'use client';

import { useState, useEffect, useId, useRef, type MouseEvent } from 'react';

export interface ConfirmPhraseModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  /** The exact phrase the user must type to enable the confirm button. */
  phrase: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  /**
   * Wave 3hh — F-6-013 (P2). Previously the input's `placeholder` was
   * set to the literal phrase, which (a) defeated the confirm-phrase
   * mechanic (the answer was visible as a placeholder) and (b) doubled
   * as the only available disambiguator when two modals rendered
   * simultaneously (eval/run hosts CANCEL RACE + ENABLE MUTATOR at the
   * same time). The neutral placeholder ("Type the phrase above")
   * closes the UX defect; this `testIdPrefix` prop replaces the
   * test-time disambiguation knob without re-introducing the
   * answer-leak. When provided, all six `data-testid` values are
   * prefixed (e.g. `cancel-race-confirm-phrase-modal`).
   */
  testIdPrefix?: string;
}

export function ConfirmPhraseModal({
  isOpen,
  title,
  description,
  phrase,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  testIdPrefix,
}: ConfirmPhraseModalProps) {
  const prefix = testIdPrefix ? `${testIdPrefix}-` : '';
  const [typed, setTyped] = useState('');
  const inputId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Reset typed value when modal closes. Must run BEFORE the open
  // effect so a re-open starts clean even if React batches the two
  // state transitions in a single commit.
  useEffect(() => {
    if (!isOpen) setTyped('');
  }, [isOpen]);

  // Drive native open/close. `showModal()` opens the dialog in the
  // top layer with browser-managed focus trap + restore-focus. `close()`
  // both removes the open attribute AND fires a `close` event — no
  // separate cleanup needed. We guard `showModal` with `!open` because
  // calling it on an already-open dialog throws InvalidStateError.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      // showModal can be missing when the test runner is jsdom and
      // the polyfill hasn't been installed; the test setup wires a
      // safe fallback. In production this is a synchronous call.
      dialog.showModal?.();
    } else if (!isOpen && dialog.open) {
      dialog.close?.();
    }
  }, [isOpen]);

  // Postel's Law: be liberal in what you accept. Trim + case-fold both
  // sides so a paste from a runbook (extra whitespace) or a user who
  // typed in lowercase under pressure is not silently rejected.
  const normalisedTyped = typed.trim().toLowerCase();
  const normalisedPhrase = phrase.trim().toLowerCase();
  const confirmed = normalisedTyped === normalisedPhrase;
  const showMismatchHint = typed.length > 0 && !confirmed;
  const hintId = `${inputId}-hint`;

  function handleConfirm() {
    if (!confirmed) return;
    onConfirm();
    setTyped('');
  }

  // Founder eye-test 2026-05-20: when parent controllers gate their
  // onClose handler on a busy/deleting/saving flag and that flag gets
  // stuck (API hang / demo-mode rejection without a finally
  // setBusy(false)), the modal became inescapable — Cancel, Esc,
  // backdrop click all bounced off because onClose() was a no-op.
  // forceDismiss() ALWAYS calls dialog.close() on the native element,
  // forcing the modal closed from the browser side regardless of
  // whether the React controller's onClose() actually flips the
  // isOpen prop. Wired to the × close button + Cancel button + Esc/
  // backdrop handlers below.
  function forceDismiss() {
    onClose();
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      try {
        dialog.close();
      } catch {
        // close() throws only if dialog is not open; already-closed
        // is the goal anyway.
      }
    }
  }

  // Native <dialog> handles Esc itself. forceDismiss is called via
  // the cancel-event chain.
  function handleCancel(e: React.SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault();
    forceDismiss();
  }

  // Backdrop click — native <dialog> does NOT close on backdrop click
  // by default. Gate on `e.target === dialogRef.current` so clicks on
  // inner content (input, buttons, label) don't dismiss the modal.
  function handleBackdropClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      forceDismiss();
    }
  }

  // Enter inside the input commits when the phrase matches. Esc on the
  // input bubbles to the dialog's native cancel handler — we must NOT
  // double-handle it here or onClose fires twice.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && confirmed) {
      e.preventDefault();
      handleConfirm();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={`${inputId}-title`}
      data-testid={`${prefix}confirm-phrase-modal`}
      className="sys-modal-scrim dojo-confirm-phrase-modal"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="sys-modal" style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={forceDismiss}
          aria-label="Close dialog"
          data-testid={`${prefix}close-button`}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            border: 'none',
            background: 'transparent',
            color: 'var(--fg-mute)',
            fontSize: 20,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
          }}
        >
          ×
        </button>
        <h2 id={`${inputId}-title`} className="sys-modal-title">
          {title}
        </h2>
        <p className="sys-modal-desc">{description}</p>
        <p className="sys-modal-phrase-label">
          Type <code>{phrase}</code> to confirm:
        </p>
        <input
          id={inputId}
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          // Wave 3hh — F-6-013 (P2) retire. The placeholder was set to
          // `{phrase}` which pre-filled the answer visually: the
          // operator saw the exact destructive phrase greyed-out in the
          // input as soon as the modal opened. That defeats the
          // confirm-phrase mechanic (the whole point is that the
          // operator must transcribe the phrase deliberately). Neutral
          // hint copy keeps the affordance — type the phrase from the
          // label above — without echoing the answer into the field.
          placeholder="Type the phrase above"
          autoFocus
          aria-label="Confirmation phrase"
          aria-describedby={showMismatchHint ? hintId : undefined}
          aria-invalid={showMismatchHint || undefined}
          data-testid={`${prefix}phrase-input`}
          autoComplete="off"
          spellCheck={false}
          className="sys-modal-input"
        />
        {showMismatchHint && (
          <p
            id={hintId}
            data-testid={`${prefix}phrase-hint`}
            role="alert"
            className="sys-modal-hint"
          >
            Phrase doesn't match — type exactly: <code>{phrase}</code>
          </p>
        )}
        <div className="sys-modal-actions">
          <button
            type="button"
            onClick={forceDismiss}
            data-testid={`${prefix}cancel-button`}
            className="btn"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!confirmed}
            data-testid={`${prefix}confirm-button`}
            className="btn btn-primary"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
