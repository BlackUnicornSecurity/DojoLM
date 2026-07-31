// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei Rework (Pillar B) — Sensei brain model resolution.
 *
 * The Sensei brain is the model that drives the tool-calling persona. It
 * is resolved SEPARATELY from red-team targets: the target switcher tiers
 * (request `modelId`, the `noda-active-model` cookie, and the admin
 * `active_model.default_id` org default) must NOT steer the brain — those
 * pick what gets ATTACKED, not what does the attacking.
 *
 * Priority chain (locked decision — plan §"/api/sensei/chat refactor"):
 *
 *   1. `explicit` — an explicit brain model id passed by the caller
 *   2. `sensei_model.config_id` — the admin-pinned Sensei brain pointer
 *   3. first enabled model in storage (last-resort fallback)
 *   4. throw `ResolveSenseiModelError` (caller maps to a clear error)
 *
 * Each tier validates the candidate model EXISTS and is `enabled === true`;
 * an invalid candidate falls through to the next tier (does NOT
 * short-circuit). This guards against a stale pointer at a deleted/disabled
 * model. The ≤40B target size cap is deliberately NOT applied here — the
 * brain may be a large model (that cap is a target-selection policy
 * enforced only at the model-list route).
 *
 * The function is dependency-injected for testability — production callers
 * use `resolveSenseiModelId(input)` (the default-deps overload); tests pass
 * an explicit deps bag.
 */
import type { LLMModelConfig } from '../llm-types';

export interface ResolveSenseiModelInput {
  /** Explicit brain model id (highest priority). */
  readonly explicit?: string | null | undefined;
}

export interface ResolveSenseiModelDeps {
  readonly listEnabledModels: () => Promise<readonly LLMModelConfig[]>;
  /** Reads `admin_settings.sensei_model.config_id` (or null when unset). */
  readonly getSenseiModelId: () => Promise<string | null>;
}

export class ResolveSenseiModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResolveSenseiModelError';
  }
}

/**
 * Pure resolver — accepts an injected deps bag. Used directly by unit
 * tests; production callers use the default-deps overload below.
 */
export async function resolveSenseiModelIdWithDeps(
  input: ResolveSenseiModelInput,
  deps: ResolveSenseiModelDeps,
): Promise<string> {
  const enabled = await deps.listEnabledModels();
  const isValid = (id: string | null | undefined): id is string => {
    if (typeof id !== 'string' || id.length === 0) return false;
    return enabled.some((m) => m.id === id && m.enabled === true);
  };

  if (isValid(input.explicit)) return input.explicit;

  const pinned = await deps.getSenseiModelId();
  if (isValid(pinned)) return pinned;

  const firstEnabled = enabled.find((m) => m.enabled === true);
  if (firstEnabled) return firstEnabled.id;

  throw new ResolveSenseiModelError(
    'No Sensei brain model available; pin one at /admin/jutsu',
  );
}

/**
 * Default-deps resolver. Wires `listEnabledModels` to the storage backend
 * and `getSenseiModelId` to the admin-settings repo. The inner imports are
 * dynamic so test files that mock `getStorage` don't have to also mock the
 * repo (and vice versa).
 */
export async function resolveSenseiModelId(
  input: ResolveSenseiModelInput,
): Promise<string> {
  const { getStorage } = await import('../storage/storage-interface');
  const { adminSettingsRepo } = await import(
    '../db/repositories/admin-settings.repository'
  );
  const deps: ResolveSenseiModelDeps = {
    listEnabledModels: async () => {
      const storage = await getStorage();
      const all = await storage.getModelConfigs();
      return all.filter((m) => m.enabled === true);
    },
    getSenseiModelId: async () => adminSettingsRepo.getSenseiModelId(),
  };
  return resolveSenseiModelIdWithDeps(input, deps);
}

/** Connection secrets of the pinned Sensei brain, for the batch routes. */
export interface SenseiBrainConnection {
  readonly baseUrl?: string;
  readonly apiKey?: string;
  /** Per-request timeout (ms) from the pinned config — lets a slow local brain
   *  exceed the batch routes' 60s provider default. */
  readonly requestTimeout?: number;
}

export interface ResolveSenseiBrainDeps {
  readonly resolveId: () => Promise<string>;
  readonly getModelConfig: (id: string) => Promise<LLMModelConfig | null>;
}

/**
 * Providers whose stored (baseUrl, apiKey) may be lent to the OpenAI-compat
 * `SenseiProvider` transport the batch routes always drive — i.e. servers that
 * speak `${baseUrl}/chat/completions` with a Bearer key. Deliberately EXCLUDES
 * cloud providers (anthropic/openai/google/…): forwarding a high-value cloud
 * key through the Sensei-brain path is neither correct (wrong protocol/host)
 * nor desirable, so a non-sensei-brain pin lends nothing.
 */
const SENSEI_BRAIN_PROVIDERS: ReadonlySet<string> = new Set([
  'sensei', 'ollama', 'custom', 'lmstudio', 'llamacpp',
]);

/**
 * Pure resolver — accepts an injected deps bag (mirrors
 * `resolveSenseiModelIdWithDeps`). Returns `{}` when no brain resolves or the
 * config is missing, and swallows a resolver throw (no brain pinned) into `{}`
 * so callers degrade to their prior request-routing behavior.
 */
export async function resolveSenseiBrainConnectionWithDeps(
  deps: ResolveSenseiBrainDeps,
): Promise<SenseiBrainConnection> {
  let id: string;
  try {
    id = await deps.resolveId();
  } catch (err) {
    // "No brain pinned" is an expected, benign state — degrade to {}. Any
    // other (infra/storage) failure propagates so it surfaces as a 5xx rather
    // than silently relapsing into the 401 this resolver closes.
    if (err instanceof ResolveSenseiModelError) return {};
    throw err;
  }
  const config = await deps.getModelConfig(id);
  // Only an OpenAI-compat brain may lend its credentials to the SenseiProvider
  // transport the batch routes use (see SENSEI_BRAIN_PROVIDERS). A cloud config
  // resolved via the last-resort fallback tier lends nothing.
  if (!config || !SENSEI_BRAIN_PROVIDERS.has(config.provider)) return {};
  return { baseUrl: config.baseUrl, apiKey: config.apiKey, requestTimeout: config.requestTimeout };
}

/**
 * Resolve the pinned Sensei brain's connection (baseUrl + apiKey) for the
 * batch routes (generate/mutate/judge/plan). Those routes rebuild a fresh
 * `routing` from the request and — unlike the chat route, which loads the
 * pinned config directly — never carried the brain's apiKey, so a served
 * brain behind Bearer auth 401'd them.
 *
 * The apiKey is a SERVER-SIDE secret: it is read from the pinned config here
 * and MUST NOT be accepted from the request body.
 */
export async function resolveSenseiBrainConnection(): Promise<SenseiBrainConnection> {
  const { getStorage } = await import('../storage/storage-interface');
  return resolveSenseiBrainConnectionWithDeps({
    resolveId: () => resolveSenseiModelId({}),
    getModelConfig: async (id) => {
      const storage = await getStorage();
      return storage.getModelConfig(id);
    },
  });
}
