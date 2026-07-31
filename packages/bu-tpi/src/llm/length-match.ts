// SPDX-License-Identifier: Apache-2.0
/**
 * E-PR3 — requested-vs-served length / token-budget parity classifier.
 *
 * Pure and dependency-free. Given the completion-token cap the caller requested
 * (`ProviderRequestOptions.maxTokens ?? LLMModelConfig.maxTokens`) and what the
 * provider actually served (`ProviderResponse.completionTokens`, refined by
 * `ProviderResponse.doneReason` when present), classify whether the response
 * respected the budget so callers can detect silently-truncated answers — a
 * truncated refusal/jailbreak otherwise gets scored as if it were complete.
 *
 * Verdicts (see {@link LengthMatchKind}):
 *   - `complete`  → served fewer completion tokens than the cap, no length-stop.
 *   - `truncated` → hit the cap (provider reported a `length` finish, or the
 *                   completion landed exactly on the cap).
 *   - `over`      → served MORE completion tokens than requested — cap ignored.
 *   - `unknown`   → no usable cap or completion-token count to compare.
 *
 * Coverage note: `doneReason` is populated by only the openai-compatible
 * provider family, so the primary signal is the universally-present
 * `completionTokens` vs cap arithmetic; `doneReason === 'length'` is an
 * additional corroborating signal when a provider supplies it.
 */

import type { LengthMatchKind, ProviderDoneReason } from './types.js';

/** A finite, strictly-positive token count/cap is required to compare. */
function isUsablePositive(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

/** A finite, non-negative served count is comparable (0 = empty completion). */
function isUsableCount(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}

/**
 * Classify served length against the requested completion-token cap.
 *
 * @param requestedMaxTokens The cap the caller asked for
 *   (`options.maxTokens ?? config.maxTokens`).
 * @param completionTokens   The completion tokens the provider reported serving.
 * @param doneReason         The provider finish reason, when available.
 */
export function classifyLengthMatch(
  requestedMaxTokens: number | undefined,
  completionTokens: number | undefined,
  doneReason?: ProviderDoneReason,
): LengthMatchKind {
  // No usable cap, or no usable served count → nothing meaningful to compare.
  if (!isUsablePositive(requestedMaxTokens) || !isUsableCount(completionTokens)) {
    return 'unknown';
  }

  // Provider returned more than the requested ceiling → the cap was ignored.
  if (completionTokens > requestedMaxTokens) {
    return 'over';
  }
  // Provider explicitly reports a length stop → truncated regardless of count
  // (some providers report `length` with a count just under the cap).
  if (doneReason === 'length') {
    return 'truncated';
  }
  // Output landed exactly on the ceiling → almost certainly capped.
  if (completionTokens === requestedMaxTokens) {
    return 'truncated';
  }
  // Finished under the ceiling with no length signal → complete. A non-length
  // failure (`doneReason` of `error`/`load`) is a different dimension and is not
  // flagged here.
  return 'complete';
}
