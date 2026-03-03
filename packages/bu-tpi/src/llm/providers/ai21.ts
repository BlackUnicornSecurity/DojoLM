/**
 * AI21 Labs Provider — Jamba/Jurassic API (P8-S80)
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

const BASE_URL = 'https://api.ai21.com/studio/v1';

export class AI21Provider implements LLMProviderAdapter {
  readonly providerType = 'ai21' as const;
  readonly supportsStreaming = false;

  async execute(config: LLMModelConfig, options: ProviderRequestOptions): Promise<ProviderResponse> {
    if (!this.validateConfig(config)) {
      throw new AuthenticationError('ai21', 'API key is required', 'apiKey');
    }
    const startTime = performance.now();
    const url = `${config.baseUrl || BASE_URL}/chat/completions`;

    const body = {
      model: config.model,
      messages: [
        ...(options.systemMessage ? [{ role: 'system', content: options.systemMessage }] : []),
        { role: 'user', content: options.prompt },
      ],
      max_tokens: options.maxTokens || config.maxTokens || 1024,
      temperature: options.temperature ?? config.temperature ?? 0.7,
      ...(options.topP != null && { top_p: options.topP }),
      ...(options.stopSequences?.length && { stop: options.stopSequences }),
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
      throw parseApiError('ai21', response.status, await response.text());
    }

    const data = await response.json() as Record<string, unknown>;
    const choices = data.choices as Array<{ message?: { content?: string }; finish_reason?: string }> | undefined;
    const text = choices?.[0]?.message?.content ?? '';
    const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;

    return {
      text,
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
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
      const response = await fetchWithTimeout(`${config.baseUrl || BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 }),
        timeoutMs: 10_000,
        validateUrl: validateProviderUrl,
      });
      return response.ok;
    } catch { return false; }
  }

  getMaxContext(_modelName: string): number { return 256_000; }

  estimateCost(_modelName: string, promptTokens: number, completionTokens: number): number {
    return (promptTokens * 2.00 + completionTokens * 8.00) / 1_000_000;
  }

  async checkStatus(config: LLMModelConfig): Promise<LLMProviderStatus> {
    return (await this.testConnection(config)) ? 'available' : 'unavailable';
  }
}

export const ai21Provider = new AI21Provider();
