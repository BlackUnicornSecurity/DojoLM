// SPDX-License-Identifier: Apache-2.0
/**
 * Anthropic content-safety adapter scaffold (DEC-4).
 * Phase 0: config validation + noop classify; Phase E wires real client.
 */

import {
  ClassifierNotConfiguredError,
  warnVendorScaffoldNoop,
  type ClassifierInput,
  type ClassifierResult,
  type VendorClassifier,
} from '../classifier-stack.js';

export interface AnthropicClassifierConfig {
  readonly apiKey: string;
  readonly model?: string;
}

export class AnthropicSafetyClassifier implements VendorClassifier {
  readonly id = 'anthropic' as const;

  constructor(private readonly config: AnthropicClassifierConfig) {
    if (!config.apiKey) throw new ClassifierNotConfiguredError(this.id);
  }

  async classify(input: ClassifierInput): Promise<ClassifierResult> {
    warnVendorScaffoldNoop(this.id);
    return {
      verdict: 'pass',
      text: input.text,
      layer: 'vendor',
      reason: 'anthropic-scaffold-noop',
    };
  }
}

export function loadAnthropicConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AnthropicClassifierConfig {
  return {
    apiKey: env.ANTHROPIC_API_KEY ?? '',
    model: env.ANTHROPIC_SAFETY_MODEL,
  };
}
