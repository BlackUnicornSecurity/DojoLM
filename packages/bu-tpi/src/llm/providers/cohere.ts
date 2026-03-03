/**
 * Cohere Provider — Native Chat API (P8-S80)
 */

import type {
  LLMModelConfig,
  LLMProviderAdapter,
  ProviderRequestOptions,
  ProviderResponse,
  StreamCallback,
  LLMProviderStatus,
} from '../types.js';
import { AuthenticationError, parseApiError } from '../errors.js';
import { fetchWithTimeout, measureDuration } from '../fetch-utils.js';
import { validateProviderUrl } from '../security.js';

const BASE_URL = 'https://api.cohere.com/v1';

export class CohereProvider implements LLMProviderAdapter {
  readonly providerType = 'cohere' as const;
  readonly supportsStreaming = true;

  async execute(config: LLMModelConfig, options: ProviderRequestOptions): Promise<ProviderResponse> {
    if (!this.validateConfig(config)) {
      throw new AuthenticationError('cohere', 'API key is required', 'apiKey');
    }
    const startTime = performance.now();
    const url = `${config.baseUrl || BASE_URL}/chat`;

    const body: Record<string, unknown> = {
      model: config.model,
      message: options.prompt,
      max_tokens: options.maxTokens || config.maxTokens || 1024,
      temperature: options.temperature ?? config.temperature ?? 0.7,
      ...(options.topP != null && { p: options.topP }),
      ...(options.stopSequences?.length && { stop_sequences: options.stopSequences }),
      ...(options.systemMessage && { preamble: options.systemMessage }),
    };

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        ...config.customHeaders,
      },
      body: JSON.stringify(body),
      timeoutMs: options.timeout || 30_000,
      validateUrl: validateProviderUrl,
    });

    if (!response.ok) {
      throw parseApiError('cohere', response.status, await response.text());
    }

    const data = await response.json() as Record<string, unknown>;
    const text = (data.text as string) ?? '';
    const tokenCount = data.token_count as { prompt_tokens?: number; response_tokens?: number; total_tokens?: number } | undefined;

    return {
      text,
      promptTokens: tokenCount?.prompt_tokens ?? 0,
      completionTokens: tokenCount?.response_tokens ?? 0,
      totalTokens: tokenCount?.total_tokens ?? 0,
      model: config.model,
      durationMs: measureDuration(startTime),
    };
  }

  async streamExecute(config: LLMModelConfig, options: ProviderRequestOptions, onChunk: StreamCallback): Promise<ProviderResponse> {
    const response = await this.execute(config, options);
    onChunk({ delta: response.text, done: false });
    onChunk({ delta: '', done: true, completionTokens: response.completionTokens });
    return response;
  }

  validateConfig(config: LLMModelConfig): boolean {
    return !!config.model && config.model.length > 0 && !!config.apiKey;
  }

  async testConnection(config: LLMModelConfig): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(`${config.baseUrl || BASE_URL}/models`, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` },
        timeoutMs: 10_000,
        validateUrl: validateProviderUrl,
      });
      return response.ok;
    } catch { return false; }
  }

  getMaxContext(_modelName: string): number { return 128_000; }

  estimateCost(_modelName: string, promptTokens: number, completionTokens: number): number {
    return (promptTokens * 0.15 + completionTokens * 0.60) / 1_000_000;
  }

  async checkStatus(config: LLMModelConfig): Promise<LLMProviderStatus> {
    return (await this.testConnection(config)) ? 'available' : 'unavailable';
  }
}

export const cohereProvider = new CohereProvider();
