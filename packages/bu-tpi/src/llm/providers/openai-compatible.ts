/**
 * OpenAI-Compatible Provider Base (P8-S80)
 *
 * Extracted and refactored from dojolm-web/src/lib/providers/openai.ts.
 * Single class that handles all OpenAI-compatible providers via data-driven config.
 *
 * Index:
 * - OpenAICompatibleProvider class (line ~25)
 * - execute / streamExecute (line ~80)
 * - validateConfig / testConnection (line ~170)
 */

import type {
  LLMProvider,
  LLMModelConfig,
  LLMProviderAdapter,
  ProviderRequestOptions,
  ProviderResponse,
  StreamCallback,
  LLMProviderStatus,
  ProviderPreset,
} from '../types.js';
import {
  AuthenticationError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ContentFilterError,
  parseApiError,
} from '../errors.js';
import { fetchWithTimeout, sanitizeUrl, measureDuration } from '../fetch-utils.js';
import { validateProviderUrl, sanitizeCredentials } from '../security.js';

const DEFAULT_TIMEOUT_MS = 30_000;

/** Context window sizes for known models */
const CONTEXT_WINDOWS: Record<string, number> = {
  // OpenAI
  'gpt-4o': 128_000, 'gpt-4o-mini': 128_000, 'gpt-4-turbo': 128_000,
  'o1': 200_000, 'o1-mini': 128_000, 'gpt-3.5-turbo': 16_385,
  // Meta Llama
  'llama-3.3-70b-versatile': 128_000, 'llama-3.1-70b-versatile': 131_072,
  'llama3.2': 128_000, 'llama3.1': 131_072,
  // Mistral
  'mistral-large-latest': 128_000, 'mixtral-8x7b-32768': 32_768,
  'mistral-small-latest': 128_000,
  // DeepSeek
  'deepseek-chat': 128_000, 'deepseek-coder': 128_000, 'deepseek-reasoner': 128_000,
  // Others
  'gemma2-9b-it': 8_192, 'qwen-turbo': 128_000,
};

const DEFAULT_CONTEXT = 32_768;

export class OpenAICompatibleProvider implements LLMProviderAdapter {
  readonly providerType: LLMProvider;
  // Streaming handled by dojolm-web's existing providers (S80 spec: "No streaming in this story")
  readonly supportsStreaming = false;

  private readonly preset?: ProviderPreset;
  private readonly defaultBaseUrl: string;

  constructor(providerType: LLMProvider, preset?: ProviderPreset) {
    this.providerType = providerType;
    this.preset = preset;
    this.defaultBaseUrl = preset?.baseUrl ?? 'https://api.openai.com/v1';
  }

  async execute(config: LLMModelConfig, options: ProviderRequestOptions): Promise<ProviderResponse> {
    this.validateConfigOrThrow(config);
    const startTime = performance.now();

    const baseUrl = config.baseUrl || this.defaultBaseUrl;
    const url = `${baseUrl}/chat/completions`;
    const timeout = options.timeout || DEFAULT_TIMEOUT_MS;
    const isLocal = this.isLocalUrl(baseUrl);

    const headers = this.buildHeaders(config);
    const body = this.buildRequestBody(config, options);

    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        timeoutMs: timeout,
        validateUrl: validateProviderUrl,
        isLocal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw parseApiError(this.providerType, response.status, text, response.headers);
      }

      const data = await response.json() as Record<string, unknown>;
      return this.parseResponse(data, config.model, startTime);
    } catch (error) {
      if (error instanceof Error && !(error instanceof AuthenticationError) &&
          !(error instanceof RateLimitError) && !(error instanceof NetworkError) &&
          !(error instanceof TimeoutError)) {
        throw new NetworkError(this.providerType, `Request failed: ${(error as Error).message}`, {
          originalError: error,
        });
      }
      throw error;
    }
  }

  async streamExecute(
    _config: LLMModelConfig,
    _options: ProviderRequestOptions,
    _onChunk: StreamCallback,
  ): Promise<ProviderResponse> {
    // Streaming is handled by dojolm-web's existing provider implementations.
    // This bu-tpi provider does not implement streaming (S80 spec).
    throw new Error(
      `Streaming not supported in bu-tpi ${this.providerType} provider. ` +
      `Use dojolm-web's existing streaming provider instead.`
    );
  }

  validateConfig(config: LLMModelConfig): boolean {
    if (!config.model || config.model.length < 1) return false;

    // Cloud providers require API key
    const isLocal = this.isLocalProvider();
    if (!isLocal && !config.apiKey) return false;

    // Validate base URL if provided
    if (config.baseUrl) {
      if (!validateProviderUrl(config.baseUrl, isLocal)) return false;
    }

    return true;
  }

  async testConnection(config: LLMModelConfig): Promise<boolean> {
    try {
      const baseUrl = config.baseUrl || this.defaultBaseUrl;
      const isLocal = this.isLocalUrl(baseUrl);
      const url = `${baseUrl}/models`;

      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: this.buildHeaders(config),
        timeoutMs: 10_000,
        validateUrl: validateProviderUrl,
        isLocal,
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  getMaxContext(modelName: string): number {
    // Check exact match first
    if (CONTEXT_WINDOWS[modelName]) return CONTEXT_WINDOWS[modelName];
    // Then prefix match only (not .includes() — avoids false matches on substring)
    for (const [key, value] of Object.entries(CONTEXT_WINDOWS)) {
      if (modelName.startsWith(key)) return value;
    }
    return DEFAULT_CONTEXT;
  }

  estimateCost(modelName: string, promptTokens: number, completionTokens: number): number {
    // Local providers are free
    if (this.isLocalProvider()) return 0;

    // Default cost estimation (per 1M tokens)
    const inputRate = 2.50 / 1_000_000;
    const outputRate = 10.00 / 1_000_000;
    return promptTokens * inputRate + completionTokens * outputRate;
  }

  async checkStatus(config: LLMModelConfig): Promise<LLMProviderStatus> {
    try {
      const connected = await this.testConnection(config);
      return connected ? 'available' : 'unavailable';
    } catch {
      return 'error';
    }
  }

  // ===========================================================================
  // Private helpers
  // ===========================================================================

  private validateConfigOrThrow(config: LLMModelConfig): void {
    if (!this.validateConfig(config)) {
      throw new Error(`Invalid config for ${this.providerType}: model and apiKey required`);
    }
  }

  private buildHeaders(config: LLMModelConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.apiKey) {
      const authHeader = this.preset?.authHeaderName ?? 'Authorization';
      if (this.preset?.authType === 'api-key-header') {
        headers[authHeader] = config.apiKey;
      } else {
        headers[authHeader] = `Bearer ${config.apiKey}`;
      }
    }

    // OpenAI-specific headers
    if (config.organizationId) {
      headers['OpenAI-Organization'] = config.organizationId;
    }
    if (config.projectId) {
      headers['OpenAI-Project'] = config.projectId;
    }

    // Preset custom headers
    if (this.preset?.customHeaders) {
      Object.assign(headers, this.preset.customHeaders);
    }

    // Config custom headers
    if (config.customHeaders) {
      Object.assign(headers, config.customHeaders);
    }

    return headers;
  }

  private buildRequestBody(
    config: LLMModelConfig,
    options: ProviderRequestOptions,
  ): Record<string, unknown> {
    const messages: Array<{ role: string; content: string }> = [];

    if (options.systemMessage) {
      messages.push({ role: 'system', content: options.systemMessage });
    }
    messages.push({ role: 'user', content: options.prompt });

    return {
      model: config.model,
      messages,
      max_tokens: options.maxTokens || config.maxTokens || 1024,
      temperature: options.temperature ?? config.temperature ?? 0.7,
      ...(options.topP != null && { top_p: options.topP }),
      ...(options.stopSequences?.length && { stop: options.stopSequences }),
      ...(options.stream && { stream: true }),
    };
  }

  private parseResponse(
    data: Record<string, unknown>,
    model: string,
    startTime: number,
  ): ProviderResponse {
    const choices = data.choices as Array<{
      message?: { content?: string };
      finish_reason?: string;
    }> | undefined;

    const text = choices?.[0]?.message?.content ?? '';
    const finishReason = choices?.[0]?.finish_reason;
    const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;

    const filtered = finishReason === 'content_filter';

    return {
      text,
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
      model: (data.model as string) || model,
      filtered,
      filterReason: filtered ? 'Content filtered by provider' : undefined,
      durationMs: measureDuration(startTime),
    };
  }

  private isLocalProvider(): boolean {
    const localTypes = new Set(['ollama', 'lmstudio', 'llamacpp']);
    return localTypes.has(this.providerType);
  }

  private isLocalUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }
}
