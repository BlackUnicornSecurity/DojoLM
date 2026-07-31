// SPDX-License-Identifier: Apache-2.0
/**
 * MatchCreationWizard.types — TICKET-T-507 / G-025 reactivation.
 *
 * Pure type module for the stand-off wizard. Mirrors the V1
 * `WizardFormData` interface but uses readonly fields to enforce R-T1
 * immutability. The live controller persists each step's state through
 * `Object.freeze` before pushing a new value, so consumers see frozen
 * shapes only.
 */

import type { GameMode, AttackMode, MatchFighter } from '@/lib/arena-types';

export interface WizardState {
  readonly gameMode: GameMode | null;
  readonly attackMode: AttackMode | null;
  readonly maxRounds: number;
  readonly victoryPoints: number;
  readonly fighters: readonly MatchFighter[];
}

export interface SubmitResult {
  readonly ok: boolean;
  /** Real API match id when the controller routed to /api/arena. */
  readonly matchId?: string;
  /**
   * `true` when the controller could not reach a real arena create
   * endpoint and stored the payload locally (mirror T-508 PlaybookRunner
   * stub-submit pattern). Live controller in this ticket does NOT use
   * the stub path — `/api/arena POST` exists — but the primitive
   * accepts the flag so future surfaces can reuse it.
   */
  readonly stub?: true;
  readonly error?: string;
}
