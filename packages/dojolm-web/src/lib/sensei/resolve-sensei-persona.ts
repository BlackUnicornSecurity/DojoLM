// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei Rework (Pillar C) — persona resolution.
 *
 * The active persona is the Layer-0 identity that opens every Sensei system
 * prompt and gates which skills the model may load. Like the Sensei brain
 * model (`resolve-sensei-model.ts`), the selection is persisted server-side
 * — at `admin_settings.sensei_persona.id` — so BOTH governance planes (the
 * in-app chat route and the in-app `McpToolSource`) resolve the SAME persona,
 * rather than each hardcoding the default. This is the closure of the plan's
 * Pillar C "persona + skill selection persisted server-side" data-model item.
 *
 * Priority chain:
 *
 *   1. `explicit` — an explicit persona id passed by the caller (reserved;
 *      no UI surfaces this yet — v1 ships the red-teamer only)
 *   2. `sensei_persona.id` — the admin-pinned persona pointer
 *   3. the default persona (`getPersonaOrDefault(null)` → red-teamer)
 *
 * An unknown/stale pinned id (e.g. a persona that was removed from the
 * registry) collapses to the default rather than throwing — a missing
 * persona must never break a chat turn. The write path (`setSenseiPersonaId`)
 * already rejects unknown ids, so a stale pin can only arise from manual SQL.
 *
 * Dependency-injected for testability: production callers use
 * `resolveSenseiPersona()` (default-deps overload); tests pass the deps bag.
 */
import type { SenseiPersona } from './personas';
import { getPersona, getPersonaOrDefault } from './personas';

export interface ResolveSenseiPersonaInput {
  /** Explicit persona id (highest priority). Reserved for a future picker. */
  readonly explicit?: string | null | undefined;
}

export interface ResolveSenseiPersonaDeps {
  /** Reads `admin_settings.sensei_persona.id` (or null when unset). */
  readonly getSenseiPersonaId: () => string | null;
}

/**
 * Pure resolver — accepts an injected deps bag. Used directly by unit tests;
 * production callers use the default-deps overload below.
 */
export function resolveSenseiPersonaWithDeps(
  input: ResolveSenseiPersonaInput,
  deps: ResolveSenseiPersonaDeps,
): SenseiPersona {
  const explicit = input.explicit ? getPersona(input.explicit) : undefined;
  if (explicit) return explicit;

  const pinned = deps.getSenseiPersonaId();
  const fromPin = pinned ? getPersona(pinned) : undefined;
  if (fromPin) return fromPin;

  return getPersonaOrDefault(null);
}

/**
 * Default-deps resolver. Wires `getSenseiPersonaId` to the admin-settings
 * repo via a dynamic import so the persona registry stays free of a static
 * edge into the DB layer.
 */
export async function resolveSenseiPersona(
  input: ResolveSenseiPersonaInput = {},
): Promise<SenseiPersona> {
  const { adminSettingsRepo } = await import(
    '../db/repositories/admin-settings.repository'
  );
  return resolveSenseiPersonaWithDeps(input, {
    getSenseiPersonaId: () => adminSettingsRepo.getSenseiPersonaId(),
  });
}
