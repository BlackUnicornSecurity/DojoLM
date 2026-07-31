// SPDX-License-Identifier: Apache-2.0
/**
 * MatchCreationWizard.steps.review — TICKET-T-507.
 *
 * Step 4 — review summary before submit. Closed-record-driven labels.
 * Read-only display of every prior selection so the operator confirms
 * before the controller POSTs to /api/arena.
 */

'use client';

import type { ReactElement, CSSProperties } from 'react';
import {
  GAME_MODE_LABEL,
  ATTACK_MODE_LABEL,
} from './MatchCreationWizard.constants';
import type { WizardState } from './MatchCreationWizard.types';

const ROW_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

const KV_ROW_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 12px',
  background: 'var(--bg-2)',
  border: '1px solid var(--b-1)',
  borderRadius: 6,
  fontSize: 13,
});

const KV_KEY_STYLE: CSSProperties = Object.freeze({
  color: 'var(--fg-mute)',
  fontWeight: 500,
});

const KV_VAL_STYLE: CSSProperties = Object.freeze({
  color: 'var(--fg)',
  fontWeight: 600,
  fontFamily: 'var(--mono, monospace)',
  fontSize: 12,
  textAlign: 'right' as const,
});

export interface ReviewStepProps {
  readonly state: WizardState;
}

const FALLBACK = '—';

export function ReviewStep({ state }: ReviewStepProps): ReactElement {
  const fighterAId = state.fighters[0]?.modelId ?? FALLBACK;
  const fighterBId = state.fighters[1]?.modelId ?? FALLBACK;
  const modeLabel = state.gameMode ? GAME_MODE_LABEL[state.gameMode] : FALLBACK;
  const attackLabel = state.attackMode
    ? ATTACK_MODE_LABEL[state.attackMode]
    : FALLBACK;

  return (
    <div style={ROW_STYLE} data-testid="wizard-step-review">
      <div style={KV_ROW_STYLE} data-testid="wizard-review-mode">
        <span style={KV_KEY_STYLE}>Game mode</span>
        <span style={KV_VAL_STYLE}>{modeLabel}</span>
      </div>
      <div style={KV_ROW_STYLE} data-testid="wizard-review-attack">
        <span style={KV_KEY_STYLE}>Attack mode</span>
        <span style={KV_VAL_STYLE}>{attackLabel}</span>
      </div>
      <div style={KV_ROW_STYLE} data-testid="wizard-review-rounds">
        <span style={KV_KEY_STYLE}>Max rounds</span>
        <span style={KV_VAL_STYLE}>{state.maxRounds}</span>
      </div>
      <div style={KV_ROW_STYLE} data-testid="wizard-review-victory">
        <span style={KV_KEY_STYLE}>Victory points</span>
        <span style={KV_VAL_STYLE}>{state.victoryPoints}</span>
      </div>
      <div style={KV_ROW_STYLE} data-testid="wizard-review-fighter-a">
        <span style={KV_KEY_STYLE}>Fighter A</span>
        <span style={KV_VAL_STYLE}>{fighterAId}</span>
      </div>
      <div style={KV_ROW_STYLE} data-testid="wizard-review-fighter-b">
        <span style={KV_KEY_STYLE}>Fighter B</span>
        <span style={KV_VAL_STYLE}>{fighterBId}</span>
      </div>
    </div>
  );
}
