// SPDX-License-Identifier: Apache-2.0
/**
 * Active Model Switcher — Story A.
 *
 * Centralised model-id resolution. Every inference route should call
 * `resolveModelId()` instead of bouncing back a 400 when `body.modelId`
 * is missing. Priority chain (locked decision):
 *
 *   1. `explicit` — caller passed a `modelId` in the request body
 *   2. `userPref` — server-side cookie `noda-active-model`
 *   3. admin org default — `admin_settings.active_model.default_id`
 *   4. first enabled model in storage
 *   5. throw `ResolveModelError` (caller maps to 400)
 *
 * Each fallback validates that the candidate model exists AND is
 * `enabled === true`; an invalid candidate falls through to the next
 * tier (does NOT short-circuit). This guards against:
 *
 *   - a stale cookie pointing at a deleted model
 *   - an admin disabling the org-default model without clearing the
 *     setting first
 *   - a partial-state DB where the seed default never wrote
 *
 * The function is dependency-injected for testability — production
 * callers use `resolveModelId(input)` (the default-deps overload),
 * tests pass an explicit deps bag.
 */
import type { LLMModelConfig } from '../llm-types';

export interface ResolveModelInput {
  readonly explicit?: string | null | undefined;
  readonly userPref?: string | null | undefined;
}

export interface ResolveModelDeps {
  readonly listEnabledModels: () => Promise<readonly LLMModelConfig[]>;
  readonly getAdminDefault: () => Promise<string | null>;
}

export class ResolveModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResolveModelError';
  }
}

/**
 * Pure resolver — accepts an injected deps bag. Used directly by
 * unit tests; production callers use the default-deps overload below.
 */
export async function resolveModelIdWithDeps(
  input: ResolveModelInput,
  deps: ResolveModelDeps,
): Promise<string> {
  const enabled = await deps.listEnabledModels();
  const isValid = (id: string | null | undefined): id is string => {
    if (typeof id !== 'string' || id.length === 0) return false;
    return enabled.some((m) => m.id === id && m.enabled === true);
  };

  if (isValid(input.explicit)) return input.explicit;
  if (isValid(input.userPref)) return input.userPref;

  const adminDefault = await deps.getAdminDefault();
  if (isValid(adminDefault)) return adminDefault;

  const firstEnabled = enabled.find((m) => m.enabled === true);
  if (firstEnabled) return firstEnabled.id;

  throw new ResolveModelError(
    'No model available; configure one at /admin/jutsu',
  );
}

/**
 * Default-deps resolver. Wires `listEnabledModels` to the storage
 * backend and `getAdminDefault` to the admin-settings repo. The
 * inner imports are dynamic so test files that mock `getStorage`
 * don't have to also mock the repo (and vice versa).
 */
export async function resolveModelId(
  input: ResolveModelInput,
): Promise<string> {
  const { getStorage } = await import('../storage/storage-interface');
  const { adminSettingsRepo } = await import(
    '../db/repositories/admin-settings.repository'
  );
  const deps: ResolveModelDeps = {
    listEnabledModels: async () => {
      const storage = await getStorage();
      const all = await storage.getModelConfigs();
      return all.filter((m) => m.enabled === true);
    },
    getAdminDefault: async () => adminSettingsRepo.getDefaultModelId(),
  };
  return resolveModelIdWithDeps(input, deps);
}
