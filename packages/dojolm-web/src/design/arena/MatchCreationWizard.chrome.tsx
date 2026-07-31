// SPDX-License-Identifier: Apache-2.0
/**
 * MatchCreationWizard.chrome — TICKET-T-507.
 *
 * Header + step-pill nav + footer subcomponents extracted from the
 * primitive so `MatchCreationWizard.tsx` stays under the ≤200-line
 * ceiling. All three remain pure presentational; closed-record-driven
 * label maps (`STEP_LABEL`, `STEP_DESCRIPTION`, `BUTTON_LABEL`,
 * `ARIA_LABEL`) come from the constants module.
 */

'use client';

import type { ReactElement } from 'react';
import {
  WIZARD_STEP_IDS,
  STEP_LABEL,
  STEP_DESCRIPTION,
  STEP_INDEX,
  BUTTON_LABEL,
  ARIA_LABEL,
  type WizardStepId,
} from './MatchCreationWizard.constants';
import {
  HEADER_STYLE,
  STEP_ROW_STYLE,
  STEP_PILL_STYLE,
  STEP_PILL_ACTIVE_STYLE,
  FOOTER_STYLE,
  BUTTON_PRIMARY_STYLE,
  BUTTON_GHOST_STYLE,
  TITLE_STYLE,
  SUB_STYLE,
} from './MatchCreationWizard.styles';

export interface WizardHeaderProps {
  readonly step: WizardStepId;
  readonly titleId: string;
  readonly subId: string;
  readonly onClose: () => void;
}

export function WizardHeader({ step, titleId, subId, onClose }: WizardHeaderProps): ReactElement {
  return (
    <header style={HEADER_STYLE}>
      <div>
        <h2 id={titleId} style={TITLE_STYLE}>{STEP_LABEL[step]}</h2>
        <p id={subId} style={SUB_STYLE}>{STEP_DESCRIPTION[step]}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={ARIA_LABEL.closeButton}
        data-testid="match-creation-wizard-close"
        style={BUTTON_GHOST_STYLE}
      >
        {BUTTON_LABEL.closeGlyph}
      </button>
    </header>
  );
}

export interface WizardStepPillsProps {
  readonly step: WizardStepId;
}

export function WizardStepPills({ step }: WizardStepPillsProps): ReactElement {
  return (
    <nav
      aria-label={ARIA_LABEL.stepProgress}
      style={STEP_ROW_STYLE}
      data-testid="match-creation-wizard-steps"
    >
      {WIZARD_STEP_IDS.map((id) => {
        const active = id === step;
        return (
          <span
            key={id}
            style={active ? STEP_PILL_ACTIVE_STYLE : STEP_PILL_STYLE}
            data-testid={`match-creation-wizard-step-pill-${id}`}
            data-active={active ? 'true' : 'false'}
            aria-current={active ? 'step' : undefined}
          >
            {STEP_INDEX[id] + 1}. {STEP_LABEL[id]}
          </span>
        );
      })}
    </nav>
  );
}

export interface WizardFooterProps {
  readonly step: WizardStepId;
  readonly busy: boolean;
  readonly advanceEnabled: boolean;
  readonly onAdvance: () => void;
  readonly onBack: () => void;
  readonly onSubmit: () => void;
}

export function WizardFooter(props: WizardFooterProps): ReactElement {
  const { step, busy, advanceEnabled, onAdvance, onBack, onSubmit } = props;
  const isReview = step === 'review';
  return (
    <footer style={FOOTER_STYLE}>
      <button
        type="button"
        onClick={onBack}
        disabled={step === 'mode' || busy}
        data-testid="match-creation-wizard-back"
        style={BUTTON_GHOST_STYLE}
      >
        {BUTTON_LABEL.back}
      </button>
      {isReview ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!advanceEnabled || busy}
          data-testid="match-creation-wizard-submit"
          style={BUTTON_PRIMARY_STYLE}
        >
          {busy ? BUTTON_LABEL.submitBusy : BUTTON_LABEL.submit}
        </button>
      ) : (
        <button
          type="button"
          onClick={onAdvance}
          disabled={!advanceEnabled || busy}
          data-testid="match-creation-wizard-next"
          style={BUTTON_PRIMARY_STYLE}
        >
          {BUTTON_LABEL.next}
        </button>
      )}
    </footer>
  );
}
