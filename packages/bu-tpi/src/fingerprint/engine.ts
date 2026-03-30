/**
 * K3.4 — KagamiEngine: Orchestrates the full fingerprinting pipeline.
 *
 * Dual-mode: identify (offensive) + verify (defensive).
 * Follows BenchmarkRunner patterns for progress reporting and timeout.
 */

import type { LLMProviderAdapter, LLMModelConfig } from '../llm/types.js';
import type {
  BehavioralSignature,
  KagamiOptions,
  KagamiProgress,
  KagamiResult,
  VerificationResult,
  ProbePresetName,
} from './types.js';
import { ProbeRunner } from './probe-runner.js';
import { extractFeatureVector } from './response-analyzer.js';
import {
  matchSignatures,
  verifySignature,
  setSignatureCache,
} from './signature-matcher.js';
import { getProbesForPreset, getProbesForCategories } from './probes/index.js';

const DEFAULT_PRESET: ProbePresetName = 'standard';
const TIMEOUT_MAP: Readonly<Record<ProbePresetName, number>> = {
  quick: 900_000,
  standard: 1_200_000,
  full: 1_800_000,
  verify: 600_000,
  stealth: 600_000,
};

export class KagamiEngine {
  private readonly adapter: LLMProviderAdapter;
  private readonly signatureDb: readonly BehavioralSignature[];

  constructor(
    adapter: LLMProviderAdapter,
    signatureDb?: readonly BehavioralSignature[],
  ) {
    if (!adapter) {
      throw new Error('KagamiEngine requires an LLMProviderAdapter');
    }
    this.adapter = adapter;
    this.signatureDb = signatureDb ?? [];

    if (this.signatureDb.length > 0) {
      setSignatureCache(this.signatureDb);
    }
  }

  async identify(
    config: LLMModelConfig,
    options?: Partial<KagamiOptions>,
    onProgress?: (p: KagamiProgress) => void,
  ): Promise<KagamiResult> {
    const startTime = Date.now();
    const preset = options?.preset ?? DEFAULT_PRESET;
    const timeout = options?.timeout ?? TIMEOUT_MAP[preset] ?? 300_000;

    const probes = options?.probeCategories
      ? getProbesForCategories(options.probeCategories)
      : getProbesForPreset(preset);

    const maxProbes = options?.maxProbes ?? probes.length;
    const selectedProbes = probes.slice(0, maxProbes);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Kagami operation timed out')), timeout)
    );

    try {
      // Phase 1: Probing (60%)
      const runner = new ProbeRunner(this.adapter);
      const probeResults = await Promise.race([
        runner.runProbes(
          config,
          selectedProbes,
          (p) => {
            onProgress?.({
              ...p,
              current: Math.round((p.current / p.total) * 60),
              total: 100,
            });
          },
          { parallelism: String(options?.parallelism ?? 1) },
        ),
        timeoutPromise,
      ]);

      // Phase 2: Analyzing (20%)
      onProgress?.({ current: 60, total: 100, phase: 'analyzing' });
      const featureVector = extractFeatureVector(probeResults);
      onProgress?.({ current: 80, total: 100, phase: 'analyzing' });

      // Phase 3: Matching (20%)
      onProgress?.({ current: 80, total: 100, phase: 'matching' });
      const candidates = matchSignatures(featureVector, this.signatureDb);
      onProgress?.({ current: 100, total: 100, phase: 'matching' });

      const elapsed = Date.now() - startTime;

      return {
        targetConfig: { id: config.id, name: config.name ?? config.id },
        candidates,
        totalProbes: selectedProbes.length,
        executedAt: new Date().toISOString(),
        elapsed,
        probeResults,
      };
    } finally {
      // timeoutPromise self-cleans via GC when the outer promise settles
    }
  }

  async verify(
    config: LLMModelConfig,
    expectedModelId: string,
    options?: Partial<KagamiOptions>,
    onProgress?: (p: KagamiProgress) => void,
  ): Promise<VerificationResult> {
    const expectedSig = this.signatureDb.find(
      (s) => s.modelId === expectedModelId,
    );

    if (!expectedSig) {
      throw new Error(
        `No signature found for model '${expectedModelId}'. ` +
          `${this.signatureDb.length} signatures loaded.`,
      );
    }

    const preset = options?.preset ?? 'verify';
    const timeout = options?.timeout ?? TIMEOUT_MAP[preset] ?? 180_000;

    const probes = options?.probeCategories
      ? getProbesForCategories(options.probeCategories)
      : getProbesForPreset(preset);

    const maxProbes = options?.maxProbes ?? probes.length;
    const selectedProbes = probes.slice(0, maxProbes);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Kagami verification timed out')), timeout)
    );

    try {
      // Phase 1: Probing
      const runner = new ProbeRunner(this.adapter);
      const probeResults = await Promise.race([
        runner.runProbes(
          config,
          selectedProbes,
          (p) => {
            onProgress?.({
              ...p,
              current: Math.round((p.current / p.total) * 60),
              total: 100,
            });
          },
          { parallelism: String(options?.parallelism ?? 1) },
        ),
        timeoutPromise,
      ]);

      // Phase 2: Analyzing
      onProgress?.({ current: 60, total: 100, phase: 'analyzing' });
      const featureVector = extractFeatureVector(probeResults);
      onProgress?.({ current: 80, total: 100, phase: 'analyzing' });

      // Phase 3: Matching
      onProgress?.({ current: 80, total: 100, phase: 'matching' });
      const result = verifySignature(featureVector, expectedSig);
      onProgress?.({ current: 100, total: 100, phase: 'matching' });

      return {
        ...result,
        targetConfig: { id: config.id, name: config.name ?? config.id },
      };
    } finally {
      // timeoutPromise self-cleans via GC when the outer promise settles
    }
  }
}

/**
 * Serialize a KagamiResult to JSON-safe format.
 */
export function serializeResult(
  result: KagamiResult | VerificationResult,
): string {
  return JSON.stringify(result, null, 2);
}
