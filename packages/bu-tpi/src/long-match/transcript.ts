// SPDX-License-Identifier: Apache-2.0
/**
 * Transcript state management — append-only full log plus rolling
 * window + summary. Pure functions (no mutation).
 */

import type { TranscriptState, Turn } from './types.js';

export const DEFAULT_CONTEXT_WINDOW = 5;
export const DEFAULT_SUMMARISE_EVERY_K = 5;

export function emptyTranscript(): TranscriptState {
  return {
    fullLog: [],
    rollingSummary: '',
    recentWindow: [],
  };
}

export function appendTurn(
  state: TranscriptState,
  turn: Turn,
  contextWindow: number = DEFAULT_CONTEXT_WINDOW,
): TranscriptState {
  const fullLog = [...state.fullLog, turn];
  const recentWindow = fullLog.slice(-contextWindow);
  return {
    fullLog,
    rollingSummary: state.rollingSummary,
    recentWindow,
  };
}

export function withSummary(
  state: TranscriptState,
  summary: string,
): TranscriptState {
  return {
    fullLog: state.fullLog,
    rollingSummary: summary,
    recentWindow: state.recentWindow,
  };
}

/** Decide whether the summariser should run at the end of this turn. */
export function shouldSummarise(
  turnsRun: number,
  summariseEveryK: number = DEFAULT_SUMMARISE_EVERY_K,
  contextWindow: number = DEFAULT_CONTEXT_WINDOW,
): boolean {
  if (turnsRun <= contextWindow) return false;
  return turnsRun % summariseEveryK === 0;
}

/** Render the carried context for the attacker model prompt. */
export function renderAttackerContext(state: TranscriptState): string {
  const parts: string[] = [];
  if (state.rollingSummary) {
    parts.push(`[Prior-turn summary]\n${state.rollingSummary}`);
  }
  for (const turn of state.recentWindow) {
    parts.push(
      `[Turn ${turn.index}] attacker: ${turn.attackerPayload}\n` +
        `[Turn ${turn.index}] target: ${turn.targetResponse}`,
    );
  }
  return parts.join('\n\n');
}
