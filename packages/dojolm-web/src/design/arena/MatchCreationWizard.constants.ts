// SPDX-License-Identifier: Apache-2.0
/**
 * MatchCreationWizard.constants — TICKET-T-507 / G-025 reactivation.
 *
 * Closed-enum (R-T1 §10.16) wizard step ids + closed `Record` maps for
 * step labels, sub-titles, button copy, ARIA labels. The primitive
 * `<MatchCreationWizard>` and per-step views import from this module —
 * no inline literals at render sites.
 *
 * Step taxonomy mirrors the V1 4-step flow:
 *   mode → fighters → rules → review
 *
 * V1→V2 mapping (V1 had numeric step ids 0..3):
 *   V1 step 0 (Battle Mode)     → V2 'mode'
 *   V1 step 1 (Model Selection) → V2 'fighters'
 *   V1 step 2 (Attack Mode)     → V2 'rules'   (renamed for clarity)
 *   V1 step 3 (Launch)          → V2 'review'  (renamed for clarity)
 *
 * Frozen style objects live in `./MatchCreationWizard.styles` so this
 * module stays under the ≤200-line ceiling.
 */

import type { GameMode, AttackMode } from '@/lib/arena-types';

export const WIZARD_STEP_IDS = [
  'mode',
  'fighters',
  'rules',
  'review',
] as const satisfies readonly string[];

export type WizardStepId = (typeof WIZARD_STEP_IDS)[number];

export const STEP_LABEL: Readonly<Record<WizardStepId, string>> = Object.freeze({
  mode: 'Battle Mode',
  fighters: 'Fighters',
  rules: 'Attack Rules',
  review: 'Review',
});

export const STEP_DESCRIPTION: Readonly<Record<WizardStepId, string>> = Object.freeze({
  mode: 'Choose game mode and rules',
  fighters: 'Select competing models',
  rules: 'Choose attack strategy',
  review: 'Review and submit',
});

export const STEP_INDEX: Readonly<Record<WizardStepId, number>> = Object.freeze({
  mode: 0,
  fighters: 1,
  rules: 2,
  review: 3,
});

export const BUTTON_LABEL = Object.freeze({
  next: 'Next',
  back: 'Back',
  submit: 'Enter the Arena',
  submitBusy: 'Submitting…',
  cancel: 'Cancel',
  close: 'Close wizard',
  closeGlyph: '×',
  cta: '+ New Stand-Off',
});

export const ARIA_LABEL = Object.freeze({
  dialog: 'Create new arena stand-off match',
  closeButton: 'Close stand-off wizard',
  stepProgress: 'Stand-off wizard progress',
  liveRegion: 'Stand-off wizard step announcement',
});

/**
 * E2.S4 dirty-state confirm copy. Surfaced via `window.confirm` (or a
 * test-injected stub) when the operator tries to close a wizard that
 * already has step state. Preserved as a closed record so the literal
 * never leaks into the render site (R-T1 §10.16).
 */
export const CONFIRM_COPY = Object.freeze({
  discard:
    'Discard this stand-off? You will lose any selections you have made.',
});

export const GAME_MODE_LABEL: Readonly<Record<GameMode, string>> = Object.freeze({
  CTF: 'Capture the Flag',
  KOTH: 'King of the Hill',
  RvB: 'Red vs Blue',
});

export const GAME_MODE_DESCRIPTION: Readonly<Record<GameMode, string>> = Object.freeze({
  CTF: 'Attacker extracts flags; defender blocks. First to victory points wins.',
  KOTH: 'Attacker claims hill; defender holds. Most points after rounds wins.',
  RvB: 'Both fighters attack & defend in turns. Highest combined score wins.',
});

export const ATTACK_MODE_LABEL: Readonly<Record<AttackMode, string>> = Object.freeze({
  kunai: 'Kunai (templates)',
  shuriken: 'Shuriken (SAGE)',
  naginata: 'Naginata (broad)',
  musashi: 'Musashi (mixed)',
});

export const ATTACK_MODE_DESCRIPTION: Readonly<Record<AttackMode, string>> = Object.freeze({
  kunai: 'Direct attacks using pre-built injection templates.',
  shuriken: 'SAGE-evolved attacks that mutate between rounds.',
  naginata: 'Combined templates and Armory fixtures for breadth.',
  musashi: 'Weighted mix of all attack sources for unpredictability.',
});

export const STEP_COMPLETE_LABEL: Readonly<Record<WizardStepId, string>> = Object.freeze({
  mode: 'Mode selected',
  fighters: 'Fighters chosen',
  rules: 'Attack mode set',
  review: 'Ready to submit',
});

export const ID_MAX = 128;
