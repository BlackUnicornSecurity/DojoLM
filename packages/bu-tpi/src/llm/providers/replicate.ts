/**
 * Replicate Provider — Prediction-based API (P8-S80)
 */

import type {
  LLMModelConfig, LLMProviderAdapter, ProviderRequestOptions,
  ProviderResponse, StreamCallback, LLMProviderStatus,
} from '../types.js';
import { AuthenticationError, parseApiError } from '../errors.js';
import { fetchWithTimeout, measureDuration } from '../fetch-utils.js';
import { validateProviderUrl } from '../security.js';

const BASE_URL = 'https://api.replicate.com/v1';

export class ReplicateProvider implements LLMProviderAdapter {
  readonly providerType = 'replicate' as const;
  readonly supportsStreaming = false;

  async execute(config: LLMModelConfig, options: ProviderRequestOptions): Promise<ProviderResponse> {
    if (!this.validateConfig(config)) throw new AuthenticationError('replicate', 'API key required', 'apiKey');
    const startTime = performance.now();

    // Create prediction
    const createResp = await fetchWithTimeout(`${config.baseUrl || BASE_URL}/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}`, ...config.customHeaders },
      body: JSON.stringify({
        model: config.model,
        input: {
          prompt: options.prompt,
          max_tokens: options.maxTokens || config.maxTokens || 1024,
          temperature: options.temperature ?? config.temperature ?? 0.7,
          ...(options.systemMessage && { system_prompt: options.systemMessage }),
        },
      }),
      timeoutMs: options.timeout || 60_000,
      validateUrl: validateProviderUrl,
    });

    if (!createResp.ok) throw parseApiError('replicate', createResp.status, await createResp.text());
    const prediction = await createResp.json() as { id: string; status: string; output?: string[]; urls?: { get?: string } };

    // Poll for completion (max 60s)
    let result = prediction;
    // Never trust server-returned poll URLs — always construct locally from validated baseUrl
    const pollUrl = `${config.baseUrl || BASE_URL}/predictions/${prediction.id}`;
    const deadline = Date.now() + 60_000;

    while (result.status !== 'succeeded' && result.status !== 'failed' && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 1000));
      const pollResp = await fetchWithTimeout(pollUrl, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` },
        timeoutMs: 10_000,
        validateUrl: validateProviderUrl,
      });
      if (!pollResp.ok) break;
      result = await pollResp.json() as typeof prediction;
    }

    const text = Array.isArray(result.output) ? result.output.join('') : (result.output as unknown as string ?? '');

    return {
      text,
      promptTokens: 0, completionTokens: 0, totalTokens: 0,
      model: config.model, durationMs: measureDuration(startTime),
    };
  }

  async streamExecute(config: LLMModelConfig, options: ProviderRequestOptions, onChunk: StreamCallback): Promise<ProviderResponse> {
    const response = await this.execute(config, options);
    onChunk({ delta: response.text, done: false });
    onChunk({ delta: '', done: true });
    return response;
  }

  validateConfig(config: LLMModelConfig): boolean { return !!config.model && !!config.apiKey; }
  async testConnection(config: LLMModelConfig): Promise<boolean> {
    try {
      const r = await fetchWithTimeout(`${config.baseUrl || BASE_URL}/models`, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` },
        timeoutMs: 10_000, validateUrl: validateProviderUrl,
      });
      return r.ok;
    } catch { return false; }
  }
  getMaxContext(): number { return 128_000; }
  estimateCost(): number { return 0; } // Pay-per-second pricing
  async checkStatus(config: LLMModelConfig): Promise<LLMProviderStatus> {
    return (await this.testConnection(config)) ? 'available' : 'unavailable';
  }
}

export const replicateProvider = new ReplicateProvider();
