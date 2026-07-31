// SPDX-License-Identifier: Apache-2.0
/**
 * MatchCreationWizardLive — TICKET-T-507 / G-025 reactivation.
 *
 * Live consumer that wires the pure `<MatchCreationWizard>` primitive
 * into:
 *   - the Arena page top-right CTA (`+ New Stand-Off` button)
 *   - existing POST /api/arena create endpoint (no widening)
 *   - focus return to the CTA on close (X-601 `wasOpenRef` precedent)
 *
 * Closed-record dispatch maps live in `./MatchCreationWizardLive.constants`
 * so navigation, error copy, and initial-state values stay literal-free
 * at the render site (R-T1 §10.16).
 *
 * Zero new deps. ≤200 lines. R-T1 / no-mutation discipline:
 * `Object.freeze` on the new state slot before `setState`.
 */

'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { MatchCreationWizard } from '@/design/arena/MatchCreationWizard';
import {
  WIZARD_STEP_IDS,
  BUTTON_LABEL,
  type WizardStepId,
} from '@/design/arena/MatchCreationWizard.constants';
import type { WizardState } from '@/design/arena/MatchCreationWizard.types';
import {
  STEP_NEXT,
  STEP_PREV,
  INITIAL_STATE,
  SUBMIT_ERROR_COPY,
  CTA_STYLE,
  TOAST_STYLE,
  type SubmitErrorCode,
} from './MatchCreationWizardLive.constants';

export interface MatchCreationWizardLiveProps {
  /** Called after a stand-off is successfully queued, so the Arena page can
   *  refetch its leaderboard/KPIs instead of waiting for a manual reload. */
  readonly onSubmitted?: () => void;
}

export function MatchCreationWizardLive({
  onSubmitted,
}: MatchCreationWizardLiveProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStepId>(WIZARD_STEP_IDS[0]);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SubmitErrorCode | null>(null);
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);

  const ctaRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      ctaRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!createdMatchId) return;
    const t = setTimeout(() => setCreatedMatchId(null), 5000);
    return () => clearTimeout(t);
  }, [createdMatchId]);

  const handleOpen = useCallback(() => {
    setStep(WIZARD_STEP_IDS[0]);
    setState(INITIAL_STATE);
    setError(null);
    setCreatedMatchId(null);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    if (busy) return;
    setOpen(false);
  }, [busy]);

  const handlePatch = useCallback((patch: Partial<WizardState>) => {
    setState((prev) => Object.freeze({ ...prev, ...patch }));
  }, []);

  const handleAdvance = useCallback(() => {
    setStep((current) => STEP_NEXT[current] ?? current);
  }, []);

  const handleBack = useCallback(() => {
    setStep((current) => STEP_PREV[current] ?? current);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (busy) return;
    if (state.gameMode === null || state.attackMode === null) {
      setError('invalid-input');
      return;
    }
    if (state.fighters.length < 2) {
      setError('invalid-input');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/arena', {
        method: 'POST',
        body: JSON.stringify({
          gameMode: state.gameMode,
          attackMode: state.attackMode,
          maxRounds: state.maxRounds,
          victoryPoints: state.victoryPoints,
          fighters: state.fighters.map((f) => ({ modelId: f.modelId })),
        }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) setError('forbidden');
        else if (res.status === 400) setError('invalid-input');
        else setError('server');
        return;
      }
      const body = (await res.json().catch(() => null)) as { matchId?: unknown } | null;
      if (body && typeof body.matchId === 'string') {
        setCreatedMatchId(body.matchId);
      }
      setOpen(false);
      onSubmitted?.();
    } catch {
      setError('network');
    } finally {
      setBusy(false);
    }
  }, [busy, state, onSubmitted]);

  return (
    <>
      <button
        ref={ctaRef}
        type="button"
        data-testid="arena-new-stand-off"
        aria-label="Open new stand-off wizard"
        onClick={handleOpen}
        style={CTA_STYLE}
      >
        {BUTTON_LABEL.cta}
      </button>
      {createdMatchId && (
        <div role="status" data-testid="arena-stand-off-toast" style={TOAST_STYLE}>
          Stand-off queued · id <code>{createdMatchId}</code>
        </div>
      )}
      <MatchCreationWizard
        open={open}
        step={step}
        state={state}
        busy={busy}
        errorMessage={error ? SUBMIT_ERROR_COPY[error] : null}
        onPatch={handlePatch}
        onAdvance={handleAdvance}
        onBack={handleBack}
        onSubmit={handleSubmit}
        onClose={handleClose}
      />
    </>
  );
}
