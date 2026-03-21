/**
 * K3.1 — ProbeRunner: Executes probes against an LLM provider.
 *
 * Handles timeout, error recovery, rate limiting, and progress reporting.
 * Pure TypeScript, no external dependencies.
 */

import type { LLMProviderAdapter, LLMModelConfig } from '../llm/types.js';
import type {
  ProbeQuery,
  ResponseFeature,
  KagamiProgress,
} from './types.js';

const DEFAULT_PROBE_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const MAX_PARALLELISM = 3;

export class ProbeRunner {
  private readonly adapter: LLMProviderAdapter;

  constructor(adapter: LLMProviderAdapter) {
    if (!adapter) {
      throw new Error('ProbeRunner requires an LLMProviderAdapter');
    }
    this.adapter = adapter;
  }

  async runProbes(
    modelConfig: LLMModelConfig,
    probes: readonly ProbeQuery[],
    onProgress?: (p: KagamiProgress) => void,
    options?: Readonly<Record<string, string>>,
  ): Promise<readonly ResponseFeature[]> {
    const results: ResponseFeature[] = [];
    const parallelism = Math.min(
      Number(options?.parallelism) || 1,
      MAX_PARALLELISM,
    );
    const probeTimeout =
      Number(options?.probeTimeout) || DEFAULT_PROBE_TIMEOUT_MS;

    if (parallelism <= 1) {
      for (let i = 0; i < probes.length; i++) {
        const probe = probes[i];
        onProgress?.({
          current: i,
          total: probes.length,
          phase: 'probing',
          currentProbe: probe.id,
        });
        const result = await this.executeProbe(modelConfig, probe, probeTimeout);
        results.push(result);
      }
    } else {
      for (let i = 0; i < probes.length; i += parallelism) {
        const batch = probes.slice(i, i + parallelism);
        onProgress?.({
          current: i,
          total: probes.length,
          phase: 'probing',
          currentProbe: batch[0].id,
        });
        const batchResults = await Promise.all(
          batch.map((probe) => this.executeProbe(modelConfig, probe, probeTimeout)),
        );
        results.push(...batchResults);
      }
    }

    onProgress?.({
      current: probes.length,
      total: probes.length,
      phase: 'probing',
    });

    return results;
  }

  private async executeProbe(
    modelConfig: LLMModelConfig,
    probe: ProbeQuery,
    timeoutMs: number,
  ): Promise<ResponseFeature> {
    const start = Date.now();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await Promise.race([
          this.adapter.execute(modelConfig, {
            prompt: probe.prompt,
            systemMessage: probe.systemMessage,
            temperature: probe.temperature,
            topP: probe.topP,
            timeout: timeoutMs,
          }),
          this.createTimeout(timeoutMs),
        ]);

        const durationMs = Date.now() - start;
        const rawText = response?.text ?? '';

        return {
          probeId: probe.id,
          category: probe.category,
          rawText,
          extractedValue: rawText.length > 0 ? rawText : false,
          confidence: rawText.length > 0 ? 1 : 0,
          durationMs,
        };
      } catch (error: unknown) {
        const isRateLimit = this.isRateLimitError(error);

        if (isRateLimit && attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          await this.sleep(backoffMs);
          continue;
        }

        const durationMs = Date.now() - start;
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          probeId: probe.id,
          category: probe.category,
          rawText: '',
          extractedValue: false,
          confidence: 0,
          durationMs,
          error: errorMsg,
        };
      }
    }

    // Unreachable but satisfies TypeScript
    return {
      probeId: probe.id,
      category: probe.category,
      rawText: '',
      extractedValue: false,
      confidence: 0,
      durationMs: Date.now() - start,
    };
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Probe timed out after ${ms}ms`)),
        ms,
      );
    });
  }

  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      return msg.includes('429') || msg.includes('rate limit');
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
