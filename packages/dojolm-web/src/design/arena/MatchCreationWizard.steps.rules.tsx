// SPDX-License-Identifier: Apache-2.0
/**
 * MatchCreationWizard.steps.rules — TICKET-T-507.
 *
 * Step 3 — attack rules / strategy selection. Closed-record-driven
 * (4 attack modes). Pure presentational.
 */

'use client';

import type { ReactElement, CSSProperties } from 'react';
import type { AttackMode } from '@/lib/arena-types';
import {
  ATTACK_MODE_LABEL,
  ATTACK_MODE_DESCRIPTION,
} from './MatchCreationWizard.constants';
import type { WizardState } from './MatchCreationWizard.types';

const ATTACK_MODES: readonly AttackMode[] = [
  'kunai',
  'shuriken',
  'naginata',
  'musashi',
];

const ROW_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

const CARD_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '12px 14px',
  background: 'transparent',
  border: '1px solid var(--b-1)',
  borderRadius: 8,
  cursor: 'pointer',
  textAlign: 'left' as const,
  color: 'var(--fg)',
});

const CARD_ACTIVE_STYLE: CSSProperties = Object.freeze({
  ...CARD_STYLE,
  border: '1px solid var(--torii, #cc3a2f)',
  background: 'var(--es-wash)',
});

const CARD_TITLE_STYLE: CSSProperties = Object.freeze({
  fontWeight: 600,
  fontSize: 13,
});

const CARD_SUB_STYLE: CSSProperties = Object.freeze({
  fontSize: 11,
  color: 'var(--fg-mute)',
});

export interface RulesStepProps {
  readonly state: WizardState;
  readonly onPatch: (patch: Partial<WizardState>) => void;
}

export function RulesStep({ state, onPatch }: RulesStepProps): ReactElement {
  return (
    <div
      role="radiogroup"
      aria-label="Select attack rules"
      style={ROW_STYLE}
      data-testid="wizard-step-rules"
    >
      {ATTACK_MODES.map((mode) => {
        const active = state.attackMode === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`wizard-attack-${mode}`}
            data-active={active ? 'true' : 'false'}
            onClick={() => onPatch({ attackMode: mode })}
            style={active ? CARD_ACTIVE_STYLE : CARD_STYLE}
          >
            <span style={CARD_TITLE_STYLE}>{ATTACK_MODE_LABEL[mode]}</span>
            <span style={CARD_SUB_STYLE}>{ATTACK_MODE_DESCRIPTION[mode]}</span>
          </button>
        );
      })}
    </div>
  );
}
