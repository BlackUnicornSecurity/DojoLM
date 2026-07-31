// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei Rework (Pillar B) — target-list brain exclusion.
 *
 * The Sensei brain (the model that DRIVES the tool-calling persona) must
 * not appear in red-team TARGET lists or the leaderboard — you attack
 * other models WITH the brain, you don't attack the brain itself. This is
 * the single source of truth for that exclusion so every target/leaderboard
 * enumeration site filters identically (no per-site drift).
 *
 * The brain identity is derived from the `sensei_model.config_id` admin
 * setting — NOT a per-row flag — so it always tracks the live pointer:
 * un-pin the brain and the model immediately becomes a valid target again.
 *
 * Management surfaces (e.g. the Jutsu model grid) and the Sensei-model
 * picker must NOT use these helpers — they pass `?includeBrain=true` /
 * `?senseiOnly=true` so the operator can still see and manage the brain.
 */
import type { LLMModelConfig } from '../llm-types';
import { adminSettingsRepo } from '../db/repositories/admin-settings.repository';

/**
 * The pinned Sensei brain model id, or `null` when none is set.
 *
 * Fail-open: if the admin-settings read throws (DB unavailable, partial
 * boot), return `null` rather than propagate — a target list must never
 * break because the brain pointer could not be read. The cost of failing
 * open is at worst transiently showing the brain as a target; failing
 * closed would 500 the whole list.
 */
export function getSenseiBrainId(): string | null {
  try {
    return adminSettingsRepo.getSenseiModelId();
  } catch {
    return null;
  }
}

/**
 * Remove the Sensei brain from a target/leaderboard model list. Returns a
 * NEW array (never mutates the input). When no brain is pinned, returns a
 * shallow copy unchanged.
 *
 * @param models   the candidate models (anything with an `id`)
 * @param brainId  the brain id to exclude; defaults to the live pointer
 */
export function excludeSenseiBrain<T extends Pick<LLMModelConfig, 'id'>>(
  models: readonly T[],
  brainId: string | null = getSenseiBrainId(),
): T[] {
  if (!brainId) return [...models];
  return models.filter((m) => m.id !== brainId);
}

/**
 * Resolve a single red-team TARGET model by id, EXCLUDING the Sensei brain.
 *
 * Probe/scoring endpoints (OBL modules, Kagami fingerprint) look a model up
 * by id and then run a benchmark AGAINST it as a target. The Sensei brain is
 * never a valid target (Pillar B), so it must not resolve here: a request
 * naming the brain id returns `null` — indistinguishable from naming a model
 * that does not exist — so the caller's existing not-found (404) path fires
 * unchanged. Pure; never mutates input.
 *
 * @param models   the candidate models (anything with an `id`)
 * @param id       the requested target model id
 * @param brainId  the brain id to exclude; defaults to the live pointer
 * @returns the matching non-brain model, or `null` if `id` is unknown OR is
 *          the pinned brain.
 */
export function resolveTargetModel<T extends Pick<LLMModelConfig, 'id'>>(
  models: readonly T[],
  id: string,
  brainId: string | null = getSenseiBrainId(),
): T | null {
  if (brainId !== null && id === brainId) return null;
  return models.find((m) => m.id === id) ?? null;
}
