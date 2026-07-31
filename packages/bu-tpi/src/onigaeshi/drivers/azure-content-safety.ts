// SPDX-License-Identifier: Apache-2.0
/**
 * File: onigaeshi/drivers/azure-content-safety.ts
 * Purpose: Gap 6 v1-deferred — Azure Content Safety driver as a
 *          `SafetyClassifier` for the onigaeshi adapter. Wraps a thin
 *          injected HTTP client; no direct @azure SDK dependency.
 * Story: Industry-tools parity plan §Gap 6 safety-classifier choice.
 *
 *  Production instantiation is gated by:
 *    - `ONIGAESHI_ENABLED` flag (harmPath)
 *    - `AZURE_CONTENT_SAFETY_ENABLED` flag (harmPath)
 *    - env-supplied API key
 *  If any is missing, `buildAzureContentSafetyClassifier()` returns
 *  null and the caller falls back to the no-classifier path (which the
 *  adapter treats as "no safety vendor wired" → optional classifier
 *  skipped, other gates still block).
 *
 *  Tests inject a mock `AzureContentSafetyClient` with deterministic
 *  responses. No live HTTP calls are made anywhere in this codebase.
 */

import type { FlagReader } from '../../flags/flags.js';
import type { SafetyClassifier } from '../adapter.js';

/**
 * Minimal HTTP-client-agnostic interface. A production adapter wraps
 * the Azure Content Safety REST endpoint:
 *
 *   POST {endpoint}/contentsafety/text:analyze?api-version=2023-10-01
 *
 * but this module never imports an Azure SDK — the consumer injects an
 * implementation (fetch-backed in prod, in-memory in tests).
 */
export interface AzureContentSafetyClient {
  analyzeText(input: {
    readonly text: string;
    readonly phase: 'input' | 'output';
  }): Promise<{
    readonly categoryScores: Readonly<Record<string, number>>;
  }>;
}

export interface AzureContentSafetyOptions {
  readonly client: AzureContentSafetyClient;
  /**
   * Max severity (0..7 Azure scale) allowed per category. Above this, the
   * classifier returns `{ allowed: false }`. Defaults to 2 across the four
   * core Azure categories (Hate, Violence, SelfHarm, Sexual).
   */
  readonly maxSeverity?: number;
}

const DEFAULT_MAX_SEVERITY = 2;

/**
 * Build a SafetyClassifier backed by an injected Azure Content Safety
 * client. The classifier calls `analyzeText` on both input and output
 * phases; any category exceeding `maxSeverity` flips the verdict to
 * blocked with `reason` tagged as `azure:<category>`.
 */
export function createAzureContentSafetyClassifier(
  opts: AzureContentSafetyOptions,
): SafetyClassifier {
  const max = opts.maxSeverity ?? DEFAULT_MAX_SEVERITY;
  return {
    async classify(input) {
      const result = await opts.client.analyzeText({
        text: input.payload,
        phase: input.phase,
      });
      for (const [cat, score] of Object.entries(result.categoryScores)) {
        if (typeof score === 'number' && score > max) {
          return {
            allowed: false,
            reason: `azure:${cat.toLowerCase()}`,
          };
        }
      }
      return { allowed: true };
    },
  };
}

/**
 * Environment + flag-gated factory. Returns null when any precondition
 * is unmet — caller MUST treat null as "no vendor classifier wired" and
 * continue with the other gates (sanitizer + engagement gate + etc).
 */
export function buildAzureContentSafetyClassifier(deps: {
  readonly flagReader: FlagReader;
  readonly env?: NodeJS.ProcessEnv;
  readonly client: AzureContentSafetyClient;
  readonly maxSeverity?: number;
}): SafetyClassifier | null {
  const env = deps.env ?? process.env;
  if (!deps.flagReader.isEnabled('ONIGAESHI_ENABLED')) return null;
  if (!deps.flagReader.isEnabled('AZURE_CONTENT_SAFETY_ENABLED')) return null;
  const key = env.AZURE_CONTENT_SAFETY_KEY;
  if (!key || key.length === 0) return null;
  return createAzureContentSafetyClassifier({
    client: deps.client,
    maxSeverity: deps.maxSeverity,
  });
}
