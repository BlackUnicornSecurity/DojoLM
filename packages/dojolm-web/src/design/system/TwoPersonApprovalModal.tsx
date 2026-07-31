// SPDX-License-Identifier: Apache-2.0
/**
 * TwoPersonApprovalModal — second-operator confirmation modal for the
 * YR.13.3 (G-057) two-person-approval state machine.
 *
 * Renders inside an admin page when operator B picks a pending approval
 * to review. Operator B types the code shared out-of-band by operator A;
 * the modal POSTs to `/api/admin/two-person-approval/[id]/confirm` (via
 * the `onConfirm` callback) or to `…/[id]/reject` (via `onReject`).
 *
 * Design parity with `ConfirmPhraseModal`: same `.sys-modal*` chrome,
 * same Escape/Enter key handlers, same data-testid scheme so e2e and
 * vitest snapshots stay deterministic.
 *
 * The modal is intentionally generic — it does NOT know about
 * kill-switch or any specific action shape. The consumer page passes a
 * pre-rendered `summary` string so the modal can describe what's about
 * to happen without reaching into action handlers.
 *
 * E2.S3 (REMEDIATION-PLAN lines 349-359): migrated from a hand-rolled
 * `<div role="dialog" aria-modal="true">` shell to the native HTML
 * `<dialog>` element — mirrors the E2.S2 ConfirmPhraseModal migration
 * verbatim. The browser now owns:
 *   - the focus trap (Tab cycle stays inside; verified Playwright Tab×12)
 *   - Esc-to-close (UA fires `cancel` event we forward to onClose)
 *   - focus restored to the previously-focused control on close
 *   - the modal stacking context (`top-layer` semantics)
 *
 * Two-person sequencing UX preservation: dual-actor state (the pending-
 * action row, the primary-operator id, the action title + summary) lives
 * in the consumer's controller state (PendingApprovalsPanel.items[],
 * .activeId). Closing the modal flips activeId to null but does NOT
 * destroy the items[] cache — the parent form state survives a close +
 * reopen cycle. The modal's own state (typed code, busy, error) resets
 * on close per the existing UX contract; that reset is intentional and
 * separate from the dual-actor data-flow guarantee.
 *
 * Backdrop: native `<dialog>` does NOT close on backdrop click by
 * default — we wire that explicitly via a click handler that gates on
 * `event.target === dialogRef.current` (the `<dialog>` element catches
 * the bubbled click only when the operator clicks the backdrop pseudo
 * area outside the inner content). Confirmed appropriate for two-person
 * approvals: this matches HIG dismissal patterns and the parent form
 * state (which approval is active) is preserved by the consumer-level
 * activeId state, so a backdrop-close is recoverable by re-clicking
 * Review on the same row.
 *
 * Polyfill decision (E2.S3): NO Safari < 15.4 polyfill (mirrors E2.S2).
 * Project stack is Next.js 16 + React 19; native `<dialog>` is Baseline
 * 2022. The jsdom polyfill in `src/test/setup.ts` (installed by E2.S2)
 * is reused without modification.
 *
 * Pattern stylesheet: `dialog.dojo-twoperson-approval-modal::backdrop`
 * uses `rgba(var(--black-rgb), 0.6)` per E1.S2 lint rule + GUARDRAILS
 * G10 (no hardcoded colors in design CSS) — mirrors the E2.S2 backdrop
 * declaration in src/design/styles/system.css.
 *
 * Retires (E2.S3, plan v4):
 *   - F-2-218 (P2) — destructive-action modal not using native <dialog>
 *
 * WCAG citations (E2.S3):
 *   - SC 2.1.2 No Keyboard Trap (Level A) — native <dialog> manages
 *     a containment-style trap; Esc always escapes.
 *   - SC 2.4.3 Focus Order (Level A) — focus restored to invoking
 *     control on close; sequence preserved across opens.
 *   - SC 4.1.3 Status Messages (Level AA) — `role="alert"` on the
 *     approval-error announces backend rejections without taking focus.
 */

'use client';

import { useState, useEffect, useId, useRef, type MouseEvent } from 'react';

export interface TwoPersonApprovalModalProps {
  readonly isOpen: boolean;
  /** Pending-approval id returned from operator A's submit. */
  readonly pendingActionId: string;
  /** Action title shown in the modal heading (e.g. "Kill-switch fire"). */
  readonly actionTitle: string;
  /** Free-text summary of what the wrapped action will do. Cap at ~200 chars. */
  readonly summary: string;
  /** Async confirm — caller posts to /confirm with the typed code. */
  readonly onConfirm: (code: string) => Promise<void>;
  /** Async reject — caller posts to /reject (rejectionReason: 'manual'). */
  readonly onReject: () => Promise<void>;
  readonly onClose: () => void;
  readonly confirmLabel?: string;
  readonly rejectLabel?: string;
  readonly cancelLabel?: string;
}

const MIN_CODE_LENGTH = 4;
const MAX_CODE_LENGTH = 16;

export function TwoPersonApprovalModal({
  isOpen,
  pendingActionId,
  actionTitle,
  summary,
  onConfirm,
  onReject,
  onClose,
  confirmLabel = 'Approve & Execute',
  rejectLabel = 'Reject',
  cancelLabel = 'Cancel',
}: TwoPersonApprovalModalProps) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Reset modal-internal state when the modal closes. Matches the
  // pre-E2.S3 contract — typed code, busy flag, and error banner all
  // clear on close so a re-open starts clean. Note: this clears only
  // the operator-B input. Operator-A's submitted approval row (the
  // dual-actor data) lives in the parent's items[] cache, untouched.
  useEffect(() => {
    if (!isOpen) {
      setCode('');
      setError(null);
      setBusy(false);
    }
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

  const trimmedCode = code.trim();
  const codeValid = trimmedCode.length >= MIN_CODE_LENGTH && trimmedCode.length <= MAX_CODE_LENGTH;

  async function handleConfirm() {
    if (!codeValid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(trimmedCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onReject();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setBusy(false);
    }
  }

  // Native <dialog> handles Esc itself (firing the `cancel` event +
  // setting `open=false`). We listen to `cancel` here so the parent
  // controller can sync its `isOpen` state. Without this the next
  // open call sees `dialog.open === false` but the React state still
  // says `isOpen === true` and showModal won't re-fire.
  function handleCancel(e: React.SyntheticEvent<HTMLDialogElement>) {
    // preventDefault so the UA doesn't auto-close before our state
    // machine catches up; we then explicitly call onClose which sets
    // the controller's isOpen=false → triggers the close-effect →
    // calls dialog.close().
    e.preventDefault();
    // Idempotency guard: rapid Esc presses can fire `cancel` while the
    // close transition is in flight (isOpen already false but UA still
    // reports dialog.open=true). Skip the second onClose to prevent
    // double-call on parent state setters. ALSO guard on `busy` — the
    // pre-E2.S3 onKeyDown ignored Esc while busy; preserve that so an
    // in-flight POST does not get its onClose call interleaved with
    // the resolved/rejected setState.
    if (!isOpen) return;
    if (busy) return;
    onClose();
  }

  // Backdrop click — native <dialog> does NOT close on backdrop click
  // by default. The dialog element's click event fires when the user
  // clicks anywhere inside the dialog's box (including the ::backdrop
  // pseudo, which forms part of the dialog's hit area). We gate on
  // `e.target === dialogRef.current` so clicks on inner content
  // (input, buttons, label) don't dismiss the modal. Also guard on
  // `busy` so a backdrop click during an in-flight POST does not
  // cancel the request mid-flight (UX discipline: visible spinner +
  // disabled buttons are the source of truth, not "did the operator
  // click outside").
  function handleBackdropClick(e: MouseEvent<HTMLDialogElement>) {
    if (busy) return;
    if (e.target === dialogRef.current) {
      onClose();
    }
  }

  // Enter inside the dialog commits when the code is valid. Esc on
  // any descendant bubbles to the dialog's native cancel handler — we
  // must NOT double-handle it here or onClose fires twice.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && codeValid && !busy) {
      void handleConfirm();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={`${headingId}-title`}
      data-testid="two-person-approval-modal"
      data-pending-action-id={pendingActionId}
      className="sys-modal-scrim dojo-twoperson-approval-modal"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="sys-modal">
        <h2 id={`${headingId}-title`} className="sys-modal-title">
          Two-Person Approval — {actionTitle}
        </h2>
        <p className="sys-modal-desc">{summary}</p>
        <p className="sys-modal-phrase-label">
          Enter the code provided by the primary operator:
        </p>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC23XYZ"
          autoFocus
          aria-label="Approval code"
          data-testid="approval-code-input"
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_CODE_LENGTH}
          className="sys-modal-input"
          style={{ fontFamily: 'var(--mono)', letterSpacing: '0.18em', textTransform: 'uppercase' }}
        />
        {error !== null && (
          <p
            role="alert"
            data-testid="approval-error"
            className="sys-modal-desc"
            style={{ color: 'var(--torii-md, #d33)' }}
          >
            {error}
          </p>
        )}
        <div className="sys-modal-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            data-testid="approval-cancel-button"
            className="btn"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={busy}
            data-testid="approval-reject-button"
            className="btn btn-danger"
          >
            {rejectLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!codeValid || busy}
            data-testid="approval-confirm-button"
            className="btn btn-primary"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
