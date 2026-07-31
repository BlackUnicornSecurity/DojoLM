// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — Persona registry.
 *
 * Frozen registry + pure selectors (mirrors the `SENSEI_TOOLS` pattern). v1
 * ships the red-teamer only; additional personas (blue-teamer, compliance
 * auditor) are one entry each — no refactor.
 */

import type { SenseiPersona } from './types';
import { RED_TEAMER_PERSONA, SENSEI_ABUSE_DEFLECTION } from './red-teamer';

export type { SenseiPersona } from './types';
export { SENSEI_ABUSE_DEFLECTION } from './red-teamer';

/** The default persona id used when none is configured. */
export const DEFAULT_PERSONA_ID = 'red-teamer';

/** All shipped personas, in display order. */
export const PERSONAS: readonly SenseiPersona[] = [RED_TEAMER_PERSONA] as const;

const PERSONA_BY_ID: ReadonlyMap<string, SenseiPersona> = new Map(
  PERSONAS.map((p) => [p.id, p]),
);

/** Resolve a persona by id; `undefined` if unknown. */
export function getPersona(id: string): SenseiPersona | undefined {
  return PERSONA_BY_ID.get(id);
}

/** Resolve a persona by id, falling back to the default persona. */
export function getPersonaOrDefault(id: string | null | undefined): SenseiPersona {
  const found = id ? PERSONA_BY_ID.get(id) : undefined;
  return found ?? RED_TEAMER_PERSONA;
}

/** List all persona ids. */
export function listPersonaIds(): readonly string[] {
  return PERSONAS.map((p) => p.id);
}
