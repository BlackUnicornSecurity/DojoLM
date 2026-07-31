// SPDX-License-Identifier: Apache-2.0
/**
 * MatchCreationWizard.steps.mode — TICKET-T-507.
 *
 * Step 1 — game-mode selection. Closed-record-driven; no inline string
 * literals at the render site.
 *
 * Pure presentational. State flows in via `state`, mutations via
 * `onPatch`. No fetches.
 */

'use client';

import type { ReactElement, CSSProperties } from 'react';
import type { GameMode } from '@/lib/arena-types';
import { GAME_MODE_CONFIGS } from '@/lib/arena-types';
import {
  GAME_MODE_LABEL,
  GAME_MODE_DESCRIPTION,
} from './MatchCreationWizard.constants';
import type { WizardState } from './MatchCreationWizard.types';

const GAME_MODES: readonly GameMode[] = ['CTF', 'KOTH', 'RvB'];

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

export interface ModeStepProps {
  readonly state: WizardState;
  readonly onPatch: (patch: Partial<WizardState>) => void;
}

export function ModeStep({ state, onPatch }: ModeStepProps): ReactElement {
  return (
    <div
      role="radiogroup"
      aria-label="Select battle mode"
      style={ROW_STYLE}
      data-testid="wizard-step-mode"
    >
      {GAME_MODES.map((mode) => {
        const active = state.gameMode === mode;
        const cfg = GAME_MODE_CONFIGS[mode];
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`wizard-mode-${mode}`}
            data-active={active ? 'true' : 'false'}
            onClick={() =>
              onPatch({
                gameMode: mode,
                maxRounds: cfg.defaultRounds,
                victoryPoints: cfg.defaultVictoryPoints,
              })
            }
            style={active ? CARD_ACTIVE_STYLE : CARD_STYLE}
          >
            <span style={CARD_TITLE_STYLE}>{GAME_MODE_LABEL[mode]}</span>
            <span style={CARD_SUB_STYLE}>{GAME_MODE_DESCRIPTION[mode]}</span>
          </button>
        );
      })}
    </div>
  );
}
