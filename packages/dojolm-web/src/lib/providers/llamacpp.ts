/**
 * File: providers/llamacpp.ts
 * Purpose: llama.cpp provider adapter for local GGUF models
 * Index:
 * * - LlamacppProvider class (line 29)
 * * - Request handling (line 80)
 * * - Model listing (line 140)
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
  DEFAULT_REQUEST_TIMEOUT_MS,
} from '../llm-constants';

import {
  ValidationError,
  NetworkError,
  TimeoutError,
} from './errors';

// ===========================================================================
// llama.cpp Provider
// ===========================================================================

/**
 * Default context windows for common GGUF models
 */
const LLAMACPP_CONTEXT_WINDOWS: Record<string, number> = {
  'llama-3.2': 128000,
  'llama-3.1': 128000,
  'llama-3': 8192,
  'mistral': 32000,
  'mixtral': 32000,
  'qwen2.5': 32768,
  'phi-3': 128000,
  'gemma-2': 8192,
  'deepseek-coder': 16384,
  'yi': 4096,
};

/**
 * llama.cpp provider adapter
 *
 * llama.cpp provides an OpenAI-compatible API for running GGUF models locally.
 * Default port: 8080
 */
export class LlamacppProvider implements LLMProviderAdapter {
  readonly providerType = 'llamacpp';
  readonly supportsStreaming = true;
  readonly defaultBaseUrl = 'http://localhost:8080';

  async execute(
    config: LLMModelConfig,
    options: ProviderRequestOptions
  ): Promise<ProviderResponse> {
    this.validateConfig(config);

    const startTime = Date.now();
    const timeout = options.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const baseUrl = config.baseUrl || this.defaultBaseUrl;

    try {
      const requestBody = this.buildRequestBody(config, options);

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new NetworkError(
          this.providerType,
          `llama.cpp request failed: ${response.status} ${errorText}`
        );
      }

      const data = await response.json();
      return this.parseResponse(data, Date.now() - startTime, config.model);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new TimeoutError(this.providerType, 'Request timed out', timeout);
      }

      if (error instanceof NetworkError || error instanceof TimeoutError) {
        throw error;
      }

      throw new NetworkError(
        this.providerType,
        error instanceof Error ? error.message : 'llama.cpp request failed'
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
    const baseUrl = config.baseUrl || this.defaultBaseUrl;

    const requestBody = {
      ...this.buildRequestBody(config, options),
      stream: true,
    };

    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        throw new NetworkError(
          this.providerType,
          `llama.cpp stream failed: ${response.status}`
        );
      }

      return await this.handleStream(response, onChunk, startTime);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new TimeoutError(this.providerType, 'Stream timed out', timeout);
      }

      throw new NetworkError(
        this.providerType,
        error instanceof Error ? error.message : 'llama.cpp stream failed'
      );
    }
  }

  validateConfig(config: LLMModelConfig): boolean {
    if (!config.model) {
      throw new ValidationError(
        this.providerType,
        'Model name is required (e.g., llama-3.2, mistral)',
        { field: 'model' }
      );
    }

    // llama.cpp doesn't require API key for local use
    // Base URL is optional (defaults to localhost:8080)

    return true;
  }

  async testConnection(config: LLMModelConfig): Promise<boolean> {
    try {
      const baseUrl = config.baseUrl || this.defaultBaseUrl;

      // Check if llama.cpp server is running via /v1/models endpoint
      const response = await fetch(`${baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(config.requestTimeout ?? 5000),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  getMaxContext(modelName: string): number {
    return LLAMACPP_CONTEXT_WINDOWS[modelName] || 8192;
  }

  estimateCost(_modelName: string, _promptTokens: number, _completionTokens: number): number {
    // llama.cpp is free (local)
    return 0;
  }

  // -----------------------------------------------------------------------
  // Private Methods
  // -----------------------------------------------------------------------

  private buildRequestBody(
    config: LLMModelConfig,
    options: ProviderRequestOptions
  ): Record<string, unknown> {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: options.prompt },
    ];

    const body: Record<string, unknown> = {
      model: config.model,
      messages,
      stream: false,
    };

    // Add max_tokens
    if (options.maxTokens) {
      body.max_tokens = options.maxTokens;
    }

    // Add temperature
    if (config.temperature !== undefined || options.temperature !== undefined) {
      body.temperature = config.temperature ?? options.temperature;
    }

    // Add top-p
    if (config.topP !== undefined || options.topP !== undefined) {
      body.top_p = config.topP ?? options.topP;
    }

    // Add stop sequences
    if (options.stopSequences?.length) {
      body.stop = options.stopSequences;
    }

    // Add system message
    if (options.systemMessage) {
      messages.unshift({ role: 'system', content: options.systemMessage });
      body.messages = messages;
    }

    return body;
  }

  private parseResponse(data: Record<string, unknown>, durationMs: number, modelName: string): ProviderResponse {
    const choices = data.choices as unknown[] | undefined;
    const choice = choices?.[0] as Record<string, unknown> | undefined;
    const message = choice?.message as Record<string, unknown> | undefined;
    const usage = data.usage as Record<string, unknown> | undefined;

    return {
      text: (message?.content as string) || '',
      promptTokens: (usage?.prompt_tokens as number) || 0,
      completionTokens: (usage?.completion_tokens as number) || 0,
      totalTokens: (usage?.total_tokens as number) || 0,
      model: (data.model as string) || modelName,
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

            if (data === '[DONE]') {
              onChunk({
                delta: '',
                done: true,
                promptTokens,
                completionTokens,
              });
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              if (delta?.content) {
                const content = delta.content as string;
                fullText += content;

                onChunk({
                  delta: content,
                  done: false,
                });
              }

              // Update token counts if available
              if (parsed.usage) {
                promptTokens = parsed.usage.prompt_tokens || 0;
                completionTokens = parsed.usage.completion_tokens || 0;
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
      model: 'llamacpp-streamed',
      filtered: false,
      durationMs: Date.now() - startTime,
    };
  }
}

// Export singleton instance
export const llamacppProvider = new LlamacppProvider();
