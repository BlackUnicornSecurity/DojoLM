/**
 * File: providers/anthropic.ts
 * Purpose: Anthropic Claude provider adapter
 * Index:
 * - AnthropicProvider class (line 31)
 * - Request building (line 120)
 * - Response parsing (line 180)
 * - Stream handling (line 250)
 * - Cost estimation (line 325)
 */

import type { LLMModelConfig } from '../llm-types';
import type {
  LLMProviderAdapter,
  ProviderRequestOptions,
  ProviderResponse,
  StreamChunk,
  StreamCallback,
} from '../llm-providers';

import {
  validateApiKey,
  estimateCost as estimateCostFromConstants,
  DEFAULT_REQUEST_TIMEOUT_MS,
} from '../llm-constants';

import {
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NetworkError,
  TimeoutError,
  ContentFilterError,
  parseApiError,
} from './errors';

// ===========================================================================
// Anthropic Claude Provider
// ===========================================================================

/**
 * Anthropic Claude model context windows
 */
const CLAUDE_CONTEXT_WINDOWS: Record<string, number> = {
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-haiku-20241022': 200000,
  'claude-3-opus-20240229': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku-20240307': 200000,
};

/**
 * Anthropic Claude provider adapter
 *
 * Supports Claude 3.5 Sonnet, Claude 3.5 Haiku, and other Claude models.
 */
export class AnthropicProvider implements LLMProviderAdapter {
  readonly providerType = 'anthropic';
  readonly supportsStreaming = true;

  private readonly baseUrl = 'https://api.anthropic.com';

  async execute(
    config: LLMModelConfig,
    options: ProviderRequestOptions
  ): Promise<ProviderResponse> {
    this.validateConfig(config);

    const startTime = Date.now();
    const timeout = options.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS;

    try {
      const requestBody = this.buildRequestBody(config, options);

      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: this.buildHeaders(config),
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw parseApiError(this.providerType, response.status, errorText);
      }

      const data = await response.json();
      return this.parseResponse(data, Date.now() - startTime);
    } catch (error) {
      if (error instanceof AuthenticationError ||
          error instanceof RateLimitError ||
          error instanceof ContentFilterError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new TimeoutError(this.providerType, 'Request timed out', timeout);
      }

      throw new NetworkError(
        this.providerType,
        error instanceof Error ? error.message : 'Request failed'
      );
    }
  }

  async streamExecute(
    config: LLMModelConfig,
    options: ProviderRequestOptions,
    onChunk: StreamCallback
  ): Promise<ProviderResponse> {
    this.validateConfig(config);

    const startTime = Date.now();
    const timeout = options.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS;

    const requestBody = {
      ...this.buildRequestBody(config, options),
      stream: true,
    };

    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: this.buildHeaders(config),
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw parseApiError(this.providerType, response.status, errorText);
      }

      return await this.handleStream(response, onChunk, startTime);
    } catch (error) {
      if (error instanceof AuthenticationError ||
          error instanceof RateLimitError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new TimeoutError(this.providerType, 'Stream request timed out', timeout);
      }

      throw new NetworkError(
        this.providerType,
        error instanceof Error ? error.message : 'Stream failed'
      );
    }
  }

  validateConfig(config: LLMModelConfig): boolean {
    if (!config.apiKey) {
      throw new AuthenticationError(
        this.providerType,
        'API key is required for Anthropic provider',
        'apiKey'
      );
    }

    if (config.apiKey && !validateApiKey(this.providerType, config.apiKey)) {
      throw new ValidationError(
        this.providerType,
        'Invalid API key format for Anthropic (should start with sk-ant-)'
      );
    }

    if (!config.model) {
      throw new ValidationError(
        this.providerType,
        'Model name is required (e.g., claude-3-5-sonnet-20241022)',
        { field: 'model' }
      );
    }

    return true;
  }

  async testConnection(config: LLMModelConfig): Promise<boolean> {
    try {
      const response = await this.execute(config, {
        prompt: 'Hi',
        maxTokens: 1,
        timeout: config.requestTimeout,
      });
      return response.text !== undefined || response.filtered === true;
    } catch {
      return false;
    }
  }

  getMaxContext(modelName: string): number {
    return CLAUDE_CONTEXT_WINDOWS[modelName as keyof typeof CLAUDE_CONTEXT_WINDOWS] || 200000;
  }

  estimateCost(
    modelName: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    return estimateCostFromConstants(this.providerType, promptTokens, completionTokens);
  }

  // -----------------------------------------------------------------------
  // Private Methods
  // -----------------------------------------------------------------------

  private buildHeaders(config: LLMModelConfig): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
      ...(config.customHeaders || {}),
    };
  }

  private buildRequestBody(
    config: LLMModelConfig,
    options: ProviderRequestOptions
  ): Record<string, unknown> {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: options.prompt },
    ];

    const body: Record<string, unknown> = {
      model: config.model,
      max_tokens: options.maxTokens || 4096,
      messages,
    };

    // Add temperature if provided
    if (config.temperature !== undefined || options.temperature !== undefined) {
      body.temperature = config.temperature ?? options.temperature;
    }

    // Add top-p if provided
    if (config.topP !== undefined || options.topP !== undefined) {
      body.top_p = config.topP ?? options.topP;
    }

    // Add stop sequences if provided
    if (options.stopSequences?.length) {
      body.stop_sequences = options.stopSequences;
    }

    // Add system message if provided (Anthropic supports this)
    if (options.systemMessage) {
      body.system = options.systemMessage;
    }

    return body;
  }

  private parseResponse(data: Record<string, unknown>, durationMs: number): ProviderResponse {
    const usage = data.usage as Record<string, unknown> | undefined;

    // Check for content filtering
    if (data.stop_reason === 'content_filtered') {
      return {
        text: '',
        promptTokens: (usage?.input_tokens as number) || 0,
        completionTokens: (usage?.output_tokens as number) || 0,
        totalTokens: 0,
        model: data.model as string,
        filtered: true,
        filterReason: 'Content was filtered by Anthropic',
        durationMs,
      };
    }

    // Extract text from response
    let text = '';
    const content = data.content as Array<{ type: string; text: string }> | undefined;
    if (content && content.length > 0) {
      text = content.map(c => c.text).join('');
    }

    return {
      text,
      promptTokens: (usage?.input_tokens as number) || 0,
      completionTokens: (usage?.output_tokens as number) || 0,
      totalTokens: ((usage?.input_tokens as number) || 0) + ((usage?.output_tokens as number) || 0),
      model: data.model as string,
      filtered: false,
      durationMs,
      raw: data,
    };
  }

  private async handleStream(
    response: Response,
    onChunk: StreamCallback,
    startTime: number
  ): Promise<ProviderResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new NetworkError(this.providerType, 'No response body');
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            try {
              const parsed = JSON.parse(data);

              // Handle content filtering
              if (parsed.type === 'content_filter_stop') {
                onChunk({
                  delta: '',
                  done: true,
                });

                return {
                  text: '',
                  promptTokens: 0,
                  completionTokens: 0,
                  totalTokens: 0,
                  model: 'claude-streamed',
                  filtered: true,
                  filterReason: 'Content was filtered during streaming',
                  durationMs: Date.now() - startTime,
                };
              }

              // Handle text delta
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                const content = parsed.delta.text as string;
                fullText += content;

                onChunk({
                  delta: content,
                  done: false,
                });
              }

              // Handle message completion
              if (parsed.type === 'message_stop') {
                onChunk({
                  delta: '',
                  done: true,
                  promptTokens,
                  completionTokens,
                });
              }

              // Track token usage
              if (parsed.type === 'message_start' && parsed.message?.usage) {
                promptTokens = parsed.message.usage.input_tokens || 0;
              }
              if (parsed.type === 'message_delta' && parsed.usage?.output_tokens) {
                completionTokens = parsed.usage.output_tokens || 0;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      text: fullText,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model: 'claude-streamed',
      filtered: false,
      durationMs: Date.now() - startTime,
    };
  }
}

// Export singleton instance
export const anthropicProvider = new AnthropicProvider();
