/**
 * Anthropic Provider — Messages API (P8-S80)
 *
 * Handles the Anthropic-specific API format with x-api-key header
 * and content block response structure.
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

const BASE_URL = 'https://api.anthropic.com';
const API_VERSION = '2023-06-01';
const CONTEXT = 200_000;

export class AnthropicProvider implements LLMProviderAdapter {
  readonly providerType = 'anthropic' as const;
  readonly supportsStreaming = true;

  async execute(config: LLMModelConfig, options: ProviderRequestOptions): Promise<ProviderResponse> {
    if (!this.validateConfig(config)) {
      throw new AuthenticationError('anthropic', 'API key is required', 'apiKey');
    }

    const startTime = performance.now();
    const url = `${config.baseUrl || BASE_URL}/v1/messages`;

    const messages: Array<{ role: string; content: string }> = [];
    messages.push({ role: 'user', content: options.prompt });

    const body: Record<string, unknown> = {
      model: config.model,
      max_tokens: options.maxTokens || config.maxTokens || 1024,
      messages,
      ...(options.temperature != null && { temperature: options.temperature }),
      ...(options.topP != null && { top_p: options.topP }),
      ...(options.stopSequences?.length && { stop_sequences: options.stopSequences }),
      ...(options.systemMessage && { system: options.systemMessage }),
    };

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey!,
        'anthropic-version': API_VERSION,
        ...config.customHeaders,
      },
      body: JSON.stringify(body),
      timeoutMs: options.timeout || 30_000,
      validateUrl: validateProviderUrl,
    });

    if (!response.ok) {
      throw parseApiError('anthropic', response.status, await response.text());
    }

    const data = await response.json() as Record<string, unknown>;
    const content = data.content as Array<{ type: string; text?: string }> | undefined;
    const text = content?.filter(c => c.type === 'text').map(c => c.text).join('') ?? '';
    const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined;
    const stopReason = data.stop_reason as string | undefined;

    return {
      text,
      promptTokens: usage?.input_tokens ?? 0,
      completionTokens: usage?.output_tokens ?? 0,
      totalTokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
      model: (data.model as string) || config.model,
      filtered: stopReason === 'content_filtered',
      filterReason: stopReason === 'content_filtered' ? 'Content filtered by Anthropic' : undefined,
      durationMs: measureDuration(startTime),
    };
  }

  async streamExecute(
    config: LLMModelConfig,
    options: ProviderRequestOptions,
    onChunk: StreamCallback,
  ): Promise<ProviderResponse> {
    const response = await this.execute(config, { ...options, stream: false });
    const words = response.text.split(' ');
    for (const word of words) {
      onChunk({ delta: word + ' ', done: false });
    }
    onChunk({ delta: '', done: true, completionTokens: response.completionTokens });
    return response;
  }

  validateConfig(config: LLMModelConfig): boolean {
    if (!config.model || config.model.length < 1) return false;
    if (!config.apiKey) return false;
    return true;
  }

  async testConnection(config: LLMModelConfig): Promise<boolean> {
    try {
      // Anthropic doesn't have a /models endpoint; use a minimal request
      const response = await fetchWithTimeout(`${config.baseUrl || BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey!,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
        timeoutMs: 10_000,
        validateUrl: validateProviderUrl,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getMaxContext(_modelName: string): number {
    return CONTEXT;
  }

  estimateCost(_modelName: string, promptTokens: number, completionTokens: number): number {
    return (promptTokens * 3.00 + completionTokens * 15.00) / 1_000_000;
  }

  async checkStatus(config: LLMModelConfig): Promise<LLMProviderStatus> {
    try {
      return (await this.testConnection(config)) ? 'available' : 'unavailable';
    } catch {
      return 'error';
    }
  }
}

export const anthropicProvider = new AnthropicProvider();
