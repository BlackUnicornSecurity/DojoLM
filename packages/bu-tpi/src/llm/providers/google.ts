/**
 * Google Gemini Provider (P8-S80)
 *
 * Handles Google's GenerateContent API with query param auth.
 * Uses sanitizeUrl() to strip API key from error/log output.
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
import { fetchWithTimeout, sanitizeUrl, measureDuration } from '../fetch-utils.js';
import { validateProviderUrl } from '../security.js';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const CONTEXT_WINDOWS: Record<string, number> = {
  'gemini-2.0-flash': 1_048_576,
  'gemini-2.0-pro': 2_097_152,
  'gemini-1.5-flash': 1_048_576,
  'gemini-1.5-pro': 2_097_152,
};

export class GoogleProvider implements LLMProviderAdapter {
  readonly providerType = 'google' as const;
  readonly supportsStreaming = true;

  async execute(config: LLMModelConfig, options: ProviderRequestOptions): Promise<ProviderResponse> {
    if (!this.validateConfig(config)) {
      throw new AuthenticationError('google', 'API key is required', 'apiKey');
    }

    const startTime = performance.now();
    const baseUrl = config.baseUrl || BASE_URL;
    // Google uses query param auth — sanitize model name to prevent path injection
    const safeModel = encodeURIComponent(config.model);
    const url = `${baseUrl}/models/${safeModel}:generateContent?key=${config.apiKey}`;

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (options.systemMessage) {
      contents.push({ role: 'user', parts: [{ text: options.systemMessage }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: options.prompt }] });

    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens || config.maxTokens || 1024,
        temperature: options.temperature ?? config.temperature ?? 0.7,
        ...(options.topP != null && { topP: options.topP }),
        ...(options.stopSequences?.length && { stopSequences: options.stopSequences }),
      },
    };

    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.customHeaders,
        },
        body: JSON.stringify(body),
        timeoutMs: options.timeout || 30_000,
        validateUrl: validateProviderUrl,
      });

      if (!response.ok) {
        const text = await response.text();
        // Strip API key from error messages using sanitizeUrl
        throw parseApiError('google', response.status, text);
      }

      const data = await response.json() as Record<string, unknown>;
      return this.parseResponse(data, config.model, startTime);
    } catch (error) {
      // Ensure no API key leaks in error messages
      if (error instanceof Error && error.message.includes(config.apiKey!)) {
        error.message = error.message.replace(config.apiKey!, '[REDACTED]');
      }
      throw error;
    }
  }

  async streamExecute(
    config: LLMModelConfig,
    options: ProviderRequestOptions,
    onChunk: StreamCallback,
  ): Promise<ProviderResponse> {
    const response = await this.execute(config, options);
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
      const url = `${config.baseUrl || BASE_URL}/models?key=${config.apiKey}`;
      const response = await fetchWithTimeout(url, {
        timeoutMs: config.requestTimeout ?? 10_000,
        validateUrl: validateProviderUrl,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getMaxContext(modelName: string): number {
    return CONTEXT_WINDOWS[modelName] ?? 32_768;
  }

  estimateCost(_modelName: string, promptTokens: number, completionTokens: number): number {
    return (promptTokens * 0.075 + completionTokens * 0.30) / 1_000_000;
  }

  async checkStatus(config: LLMModelConfig): Promise<LLMProviderStatus> {
    try {
      return (await this.testConnection(config)) ? 'available' : 'unavailable';
    } catch {
      return 'error';
    }
  }

  private parseResponse(
    data: Record<string, unknown>,
    model: string,
    startTime: number,
  ): ProviderResponse {
    const candidates = data.candidates as Array<{
      content?: { parts?: Array<{ text?: string }>; role?: string };
      finishReason?: string;
    }> | undefined;

    const text = candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? '';
    const finishReason = candidates?.[0]?.finishReason;

    const usageMetadata = data.usageMetadata as {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    } | undefined;

    return {
      text,
      promptTokens: usageMetadata?.promptTokenCount ?? 0,
      completionTokens: usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: usageMetadata?.totalTokenCount ?? 0,
      model,
      filtered: finishReason === 'SAFETY',
      filterReason: finishReason === 'SAFETY' ? 'Content filtered by Google Safety' : undefined,
      durationMs: measureDuration(startTime),
    };
  }
}

export const googleProvider = new GoogleProvider();
