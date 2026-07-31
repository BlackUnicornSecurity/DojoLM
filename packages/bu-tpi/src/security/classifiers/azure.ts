// SPDX-License-Identifier: Apache-2.0
/**
 * Azure Content Safety adapter scaffold (DEC-4 default).
 *
 * Phase 0 ships the interface + a config check that throws when the
 * required env vars are missing. Real client wiring lands in Phase E
 * (Gap 6) where we add the `@azure/ai-content-safety` SDK and pipe
 * through deployment bootstrap.
 */

import {
  ClassifierNotConfiguredError,
  warnVendorScaffoldNoop,
  type ClassifierInput,
  type ClassifierResult,
  type VendorClassifier,
} from '../classifier-stack.js';

export interface AzureClassifierConfig {
  readonly endpoint: string;
  readonly apiKey: string;
  readonly redactedToken?: string;
}

export class AzureSafetyClassifier implements VendorClassifier {
  readonly id = 'azure' as const;

  constructor(private readonly config: AzureClassifierConfig) {
    if (!config.endpoint || !config.apiKey) {
      throw new ClassifierNotConfiguredError(this.id);
    }
  }

  async classify(_input: ClassifierInput): Promise<ClassifierResult> {
    // Phase E will replace this with a real Azure Content Safety call.
    // Until then, the scaffold returns "pass" so the regex+embedding layers
    // remain the only effective filters.
    warnVendorScaffoldNoop(this.id);
    return {
      verdict: 'pass',
      text: _input.text,
      layer: 'vendor',
      reason: 'azure-scaffold-noop',
    };
  }
}

export function loadAzureConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AzureClassifierConfig {
  const endpoint = env.AZURE_CONTENT_SAFETY_ENDPOINT ?? '';
  const apiKey = env.AZURE_CONTENT_SAFETY_KEY ?? '';
  return { endpoint, apiKey };
}
