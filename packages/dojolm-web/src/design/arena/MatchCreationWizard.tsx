// SPDX-License-Identifier: Apache-2.0
/**
 * MatchCreationWizard — TICKET-T-507 / G-025 reactivation (Phase C).
 *
 * Pure presentational stand-off creation wizard. Re-implements the V1
 * `archive/.../strategic/arena/MatchCreationWizard.tsx` 4-step flow
 * (mode → fighters → rules → review) as a controlled primitive: state
 * + step lives outside, navigation/dispatch is pushed in via props.
 *
 * Closed-enum (R-T1 §10.16): `WIZARD_STEP_IDS` = ['mode','fighters',
 * 'rules','review']. Every step label, button label, ARIA label routes
 * through frozen `Record<Closed, string>` maps in the constants module.
 * No inline literal strings at the render site.
 *
 * E2.S4 (REMEDIATION-PLAN lines 361-370): migrated from a hand-rolled
 * `<div>`-backdrop / `<div role="dialog">`-panel shell to the native
 * HTML `<dialog>` element. The browser now owns:
 *   - the focus trap (Tab cycle stays inside; replaces `handleTrapKey`)
 *   - Esc-to-close (UA fires `cancel` event we forward, gated by
 *     dirty-state confirm — replaces the prior double-Esc binding from
 *     the window-listener AND panel `onKeyDown` handler)
 *   - focus restored to the previously-focused control on close
 *   - the modal stacking context (`top-layer` semantics)
 *
 * Dirty-state guard (E2.S4 spec, line 363): if the operator has begun
 * filling out any step (`gameMode !== null` OR `attackMode !== null`
 * OR `fighters.length > 0`) the Esc + backdrop-click paths now prompt
 * `window.confirm("Discard wizard?")` before destroying the form.
 * Pristine wizards close immediately. The Step Back/Next buttons MUST
 * NOT trigger this path — they call wizard dispatch (`onAdvance`,
 * `onBack`) and never `onClose`.
 *
 * Per-step autoFocus (E2.S4 spec, line 365): when the controlled
 * `step` prop changes, the primitive moves focus to the first
 * focusable inside the dialog so the operator can type immediately
 * without reaching for the mouse. This replaces the previous
 * `(open, step)` effect — same behavioural contract, but now scoped
 * to the dialog element which already provides UA-managed focus
 * containment.
 *
 * Pattern stylesheet: `dialog.dojo-match-creation-wizard::backdrop`
 * uses `rgba(var(--black-rgb), 0.6)` per E1.S2 lint rule + GUARDRAILS
 * G10 (no hardcoded colors in design CSS) — mirrors the E2.S2/E2.S3
 * backdrop declarations in src/design/styles/system.css.
 *
 * Polyfill decision (E2.S4): NO Safari < 15.4 polyfill (mirrors
 * E2.S2/E2.S3). Project stack is Next.js 16 + React 19; native
 * `<dialog>` is Baseline 2022. The jsdom polyfill in
 * `src/test/setup.ts` (installed by E2.S2) is reused without
 * modification.
 *
 * Retires (E2.S4, plan v4):
 *   - F-4-007 (P1) — multi-step wizard not using native <dialog>
 *   - F-4-011 (P1) — backdrop click destroys multi-step state without
 *     a confirm-discard prompt
 *
 * WCAG citations (E2.S4):
 *   - SC 2.1.2 No Keyboard Trap (Level A) — native <dialog> manages
 *     a containment-style trap; Esc always escapes (after the
 *     dirty-state confirm prompt resolves).
 *   - SC 2.4.3 Focus Order (Level A) — focus restored to invoking
 *     CTA on close (UA-owned) AND first focusable of each step
 *     receives focus on step change (primitive-owned).
 *   - SC 4.1.3 Status Messages (Level AA) — `role="alert"` on the
 *     submit error + `aria-live="polite"` on the step announcement
 *     drive a11y feedback without taking focus.
 *
 * Zero new deps. Color tokens via var(--*) only.
 */

'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent,
  type ReactElement,
  type SyntheticEvent,
} from 'react';
import {
  WIZARD_STEP_IDS,
  STEP_LABEL,
  STEP_INDEX,
  ARIA_LABEL,
  CONFIRM_COPY,
  type WizardStepId,
} from './MatchCreationWizard.constants';
import {
  PANEL_STYLE,
  BODY_STYLE,
  LIVE_REGION_STYLE,
  ERROR_STYLE,
} from './MatchCreationWizard.styles';
import {
  WizardHeader,
  WizardStepPills,
  WizardFooter,
} from './MatchCreationWizard.chrome';
import type { WizardState } from './MatchCreationWizard.types';
import { ModeStep } from './MatchCreationWizard.steps.mode';
import { FightersStep } from './MatchCreationWizard.steps.fighters';
import { RulesStep } from './MatchCreationWizard.steps.rules';
import { ReviewStep } from './MatchCreationWizard.steps.review';

const TITLE_ID = 'match-creation-wizard-title';
const SUB_ID = 'match-creation-wizard-sub';
const SAFE_MODEL_ID = /^[\w.-]{1,128}$/;

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface MatchCreationWizardProps {
  readonly open: boolean;
  readonly step: WizardStepId;
  readonly state: WizardState;
  readonly busy?: boolean;
  readonly errorMessage?: string | null;
  readonly onPatch: (patch: Partial<WizardState>) => void;
  readonly onAdvance: () => void;
  readonly onBack: () => void;
  readonly onSubmit: () => void;
  readonly onClose: () => void;
  /**
   * Discard-confirm prompt injection — defaults to `window.confirm`.
   * Tests pass a stub so they don't hit the UA dialog. Returning `true`
   * means "yes, discard"; `false` means "stay open".
   */
  readonly confirmDiscard?: (message: string) => boolean;
}

function canAdvance(step: WizardStepId, state: WizardState): boolean {
  if (step === 'mode') return state.gameMode !== null;
  if (step === 'fighters') {
    if (state.fighters.length < 2) return false;
    const a = state.fighters[0]?.modelId ?? '';
    const b = state.fighters[1]?.modelId ?? '';
    if (a === b) return false;
    return SAFE_MODEL_ID.test(a) && SAFE_MODEL_ID.test(b);
  }
  if (step === 'rules') return state.attackMode !== null;
  if (state.fighters.length < 2) return false;
  const a = state.fighters[0]?.modelId ?? '';
  const b = state.fighters[1]?.modelId ?? '';
  return (
    state.gameMode !== null &&
    state.attackMode !== null &&
    a !== b &&
    SAFE_MODEL_ID.test(a) &&
    SAFE_MODEL_ID.test(b)
  );
}

/**
 * Dirty-state detection. The wizard's INITIAL_STATE has `gameMode` /
 * `attackMode` null and `fighters: []`. Any deviation means the operator
 * has begun typing/clicking and the close path must prompt before
 * destroying the form.
 */
function isWizardDirty(state: WizardState): boolean {
  if (state.gameMode !== null) return true;
  if (state.attackMode !== null) return true;
  if (state.fighters.length > 0) return true;
  return false;
}

function defaultConfirmDiscard(message: string): boolean {
  if (typeof window === 'undefined') return true;
  return window.confirm(message);
}

export function MatchCreationWizard(
  props: MatchCreationWizardProps,
): ReactElement {
  const {
    open,
    step,
    state,
    busy = false,
    errorMessage,
    onPatch,
    onAdvance,
    onBack,
    onSubmit,
    onClose,
    confirmDiscard = defaultConfirmDiscard,
  } = props;

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const stepBodyRef = useRef<HTMLElement | null>(null);
  const dirty = useMemo(() => isWizardDirty(state), [state]);

  // Drive native open/close. `showModal()` opens the dialog in the
  // top layer with browser-managed focus trap + restore-focus. `close()`
  // both removes the open attribute AND fires a `close` event — no
  // separate cleanup needed. We guard `showModal` with `!open` because
  // calling it on an already-open dialog throws InvalidStateError.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // showModal can be missing when the test runner is jsdom and the
      // polyfill hasn't been installed; the test setup wires a safe
      // fallback. In production this is a synchronous call.
      dialog.showModal?.();
    } else if (!open && dialog.open) {
      dialog.close?.();
    }
  }, [open]);

  // Per-step autoFocus (E2.S4 spec line 365). When the step changes,
  // move focus to the first focusable inside the STEP BODY (not the
  // chrome close button — that would defeat the purpose of "first
  // input of each step"). The review step has no inputs, so we fall
  // through to the Submit button via the dialog-level focusable
  // search. The native <dialog> already restores focus to the invoking
  // control on close; this effect ONLY drives intra-wizard step
  // transitions.
  useEffect(() => {
    if (!open) return;
    const stepBody = stepBodyRef.current;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const stepFocusables = stepBody
      ? stepBody.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      : null;
    const stepFirst = stepFocusables?.[0];
    if (stepFirst) {
      stepFirst.focus();
      return;
    }
    // Review step has no inputs — fall back to the first dialog-level
    // focusable AFTER the chrome close button (we want the Submit
    // button on review, not the × that aborts the wizard).
    const dialogFocusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    const submit = dialogFocusables.find(
      (el) => el.dataset.testid === 'match-creation-wizard-submit',
    );
    if (submit) submit.focus();
  }, [open, step]);

  /**
   * Shared close-with-confirm path. All three close vectors (Esc /
   * backdrop click / close-glyph button) funnel through here so the
   * dirty-state guard, busy guard, and idempotency guard apply
   * uniformly. Returns true if the close was committed (parent should
   * see onClose fire), false if blocked.
   *
   * Idempotency guard: rapid close attempts can fire `cancel` while
   * the close transition is in flight (open already false but UA still
   * reports dialog.open=true). Skip the second onClose.
   *
   * Busy guard: an in-flight POST locks the wizard — preserve the
   * pre-E2.S4 "ignore Esc while busy" behavior so onClose isn't
   * interleaved with the resolved/rejected setState path.
   */
  const attemptClose = useCallback((): boolean => {
    if (!open) return false;
    if (busy) return false;
    if (dirty) {
      const confirmed = confirmDiscard(CONFIRM_COPY.discard);
      if (!confirmed) return false;
    }
    onClose();
    return true;
  }, [open, busy, dirty, confirmDiscard, onClose]);

  /**
   * Native <dialog> handles Esc itself (firing the `cancel` event).
   * We always preventDefault so the UA's auto-close doesn't race the
   * React state machine — the close-effect (driven by `open` prop)
   * calls dialog.close() once the controller flips state.
   */
  const handleCancel = useCallback(
    (e: SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
      attemptClose();
    },
    [attemptClose],
  );

  /**
   * Backdrop click — native <dialog> does NOT close on backdrop click
   * by default. The element catches bubbled clicks; we gate on
   * `e.target === dialogRef.current` so clicks on inner content
   * (input, buttons, label) don't dismiss. Same dirty-state + busy
   * + idempotency guards as Esc via `attemptClose`.
   */
  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDialogElement>) => {
      if (e.target !== dialogRef.current) return;
      attemptClose();
    },
    [attemptClose],
  );

  /**
   * Close-glyph (×) button inside the header. Routes through the
   * same dirty-state guard so the operator can't accidentally destroy
   * a half-filled wizard via the chrome button either.
   */
  const handleCloseButton = useCallback(() => {
    attemptClose();
  }, [attemptClose]);

  const advanceEnabled = useMemo(() => canAdvance(step, state), [step, state]);
  const liveMessage = useMemo(
    () => `Step ${STEP_INDEX[step] + 1} of ${WIZARD_STEP_IDS.length}: ${STEP_LABEL[step]}`,
    [step],
  );

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      aria-describedby={SUB_ID}
      aria-label={ARIA_LABEL.dialog}
      data-testid="match-creation-wizard"
      data-dirty={dirty ? 'true' : 'false'}
      className="dojo-match-creation-wizard"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div style={PANEL_STYLE} data-testid="match-creation-wizard-panel">
        <WizardHeader step={step} titleId={TITLE_ID} subId={SUB_ID} onClose={handleCloseButton} />
        <WizardStepPills step={step} />
        <div aria-live="polite" aria-atomic="true" style={LIVE_REGION_STYLE} data-testid="match-creation-wizard-live">
          {liveMessage}
        </div>
        <main ref={stepBodyRef} style={BODY_STYLE} data-testid="match-creation-wizard-body">
          {step === 'mode' && <ModeStep state={state} onPatch={onPatch} />}
          {step === 'fighters' && <FightersStep state={state} onPatch={onPatch} />}
          {step === 'rules' && <RulesStep state={state} onPatch={onPatch} />}
          {step === 'review' && <ReviewStep state={state} />}
          {errorMessage && (
            <p role="alert" data-testid="match-creation-wizard-error" style={ERROR_STYLE}>
              {errorMessage}
            </p>
          )}
        </main>
        <WizardFooter
          step={step}
          busy={busy}
          advanceEnabled={advanceEnabled}
          onAdvance={onAdvance}
          onBack={onBack}
          onSubmit={onSubmit}
        />
      </div>
    </dialog>
  );
}
