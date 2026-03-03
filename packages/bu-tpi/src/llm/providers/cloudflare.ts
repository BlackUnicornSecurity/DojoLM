/**
 * Cloudflare Workers AI Provider — Account-specific URL pattern (P8-S80)
 */

import type {
  LLMModelConfig, LLMProviderAdapter, ProviderRequestOptions,
  ProviderResponse, StreamCallback, LLMProviderStatus,
} from '../types.js';
import { AuthenticationError, parseApiError } from '../errors.js';
import { fetchWithTimeout, measureDuration } from '../fetch-utils.js';
import { validateProviderUrl } from '../security.js';

export class CloudflareProvider implements LLMProviderAdapter {
  readonly providerType = 'cloudflare' as const;
  readonly supportsStreaming = false;

  async execute(config: LLMModelConfig, options: ProviderRequestOptions): Promise<ProviderResponse> {
    if (!this.validateConfig(config)) throw new AuthenticationError('cloudflare', 'API key and base URL required', 'apiKey');
    const startTime = performance.now();

    // Cloudflare URL: https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}
    const safeModel = encodeURIComponent(config.model);
    const url = `${config.baseUrl}/ai/run/${safeModel}`;

    const body = {
      messages: [
        ...(options.systemMessage ? [{ role: 'system', content: options.systemMessage }] : []),
        { role: 'user', content: options.prompt },
      ],
      max_tokens: options.maxTokens || config.maxTokens || 1024,
      temperature: options.temperature ?? config.temperature ?? 0.7,
    };

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}`, ...config.customHeaders },
      body: JSON.stringify(body),
      timeoutMs: options.timeout || 30_000,
      validateUrl: validateProviderUrl,
    });

    if (!response.ok) throw parseApiError('cloudflare', response.status, await response.text());

    const data = await response.json() as { result?: { response?: string }; success?: boolean };
    const text = data.result?.response ?? '';

    return {
      text, promptTokens: 0, completionTokens: 0, totalTokens: 0,
      model: config.model, durationMs: measureDuration(startTime),
    };
  }

  async streamExecute(config: LLMModelConfig, options: ProviderRequestOptions, onChunk: StreamCallback): Promise<ProviderResponse> {
    const response = await this.execute(config, options);
    onChunk({ delta: response.text, done: false });
    onChunk({ delta: '', done: true });
    return response;
  }

  validateConfig(config: LLMModelConfig): boolean {
    return !!config.model && !!config.apiKey && !!config.baseUrl;
  }

  async testConnection(config: LLMModelConfig): Promise<boolean> {
    try {
      const r = await fetchWithTimeout(`${config.baseUrl}/ai/models`, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` },
        timeoutMs: 10_000, validateUrl: validateProviderUrl,
      });
      return r.ok;
    } catch { return false; }
  }

  getMaxContext(): number { return 32_768; }
  estimateCost(): number { return 0; } // Included in Workers plan
  async checkStatus(config: LLMModelConfig): Promise<LLMProviderStatus> {
    return (await this.testConnection(config)) ? 'available' : 'unavailable';
  }
}

export const cloudflareProvider = new CloudflareProvider();
