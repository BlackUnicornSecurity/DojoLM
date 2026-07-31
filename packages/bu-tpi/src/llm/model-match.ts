// SPDX-License-Identifier: Apache-2.0
/**
 * E-PR2 — served-vs-requested model parity classifier.
 *
 * Pure and dependency-free. Given the model the caller requested
 * (`LLMModelConfig.model`) and the model the provider reported serving
 * (`ProviderResponse.model`), classify how closely they match so callers can
 * surface silent substitutions, downgrades, or snapshot drift.
 *
 * Verdicts (see {@link ModelMatchKind}):
 *   - `exact`    → identical model id (after trimming).
 *   - `family`   → same lineage: one id is a token-boundary prefix of the other
 *                  (e.g. `model-a` vs `model-a-20260101`), or the two share a
 *                  leading family-token run of length >= 2 (e.g. `model-a-v1`
 *                  vs `model-a-v2`).
 *   - `mismatch` → a different model was served (e.g. `model-a` vs `model-b`,
 *                  which share only the broad leading token).
 *   - `unknown`  → either id is empty/blank — nothing meaningful to compare.
 */

import type { ModelMatchKind } from './types.js';

/** Model ids are conventionally dash-delimited (`family-variant-snapshot`). */
const TOKEN_SEPARATOR = '-';

/**
 * Minimum number of shared leading tokens for two divergent ids to count as the
 * same family. `1` would treat `model-a` vs `model-b` as related (they share
 * only `model`); requiring `2` keeps that pair a `mismatch` while still pairing
 * snapshot siblings such as `model-a-v1` / `model-a-v2`.
 */
const MIN_SHARED_FAMILY_TOKENS = 2;

/**
 * Classify a served model id against the requested one. Order-independent.
 *
 * @param requested The model the caller asked for (`LLMModelConfig.model`).
 * @param served    The model the provider reported (`ProviderResponse.model`).
 */
export function classifyModelMatch(
  requested: string | undefined,
  served: string | undefined,
): ModelMatchKind {
  const req = (requested ?? '').trim();
  const srv = (served ?? '').trim();

  if (req === '' || srv === '') {
    return 'unknown';
  }
  if (req === srv) {
    return 'exact';
  }

  const reqTokens = req.split(TOKEN_SEPARATOR);
  const srvTokens = srv.split(TOKEN_SEPARATOR);
  const limit = Math.min(reqTokens.length, srvTokens.length);

  let shared = 0;
  while (shared < limit && reqTokens[shared] === srvTokens[shared]) {
    shared += 1;
  }

  // One id is a whole-token prefix of the other → same model with an added
  // snapshot/version suffix.
  if (shared === limit) {
    return 'family';
  }
  // The ids diverge, but share a multi-token family root → snapshot siblings.
  if (shared >= MIN_SHARED_FAMILY_TOKENS) {
    return 'family';
  }
  return 'mismatch';
}
