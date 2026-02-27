/**
 * File: providers/openai.ts
 * Purpose: OpenAI-compatible provider adapter
 * Index:
 * - OpenAIProvider class (line 31)
 * - Request building (line 112)
 * - Response parsing (line 165)
 * - Stream handling (line 225)
 * - Cost estimation (line 287)
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
  isOpenAICompatible,
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
// OpenAI-compatible Provider
// ===========================================================================

/**
 * OpenAI-compatible provider adapter
 *
 * Supports:
 * - OpenAI (native)
 * - Ollama (OpenAI-compatible mode)
 * - z.ai (GLM models)
 * - Moonshot AI
 * - Any OpenAI-compatible custom endpoint
 */
export class OpenAIProvider implements LLMProviderAdapter {
  readonly providerType = 'openai';
  readonly supportsStreaming = true;

  private readonly defaultModels = {
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4-turbo': 128000,
    'gpt-3.5-turbo': 16385,
    // Ollama models vary, using safe defaults
    'llama3.2': 128000,
    'llama3.1': 128000,
    'mistral': 32000,
    'qwen2.5': 32768,
    // z.ai models
    'glm-4.7': 128000,
    'glm-4-flash': 128000,
    // Moonshot models
    'moonshot-v1-8k': 8192,
    'moonshot-v1-32k': 32768,
    'moonshot-v1-128k': 128000,
  };

  async execute(
    config: LLMModelConfig,
    options: ProviderRequestOptions
  ): Promise<ProviderResponse> {
    this.validateConfig(config);

    const startTime = Date.now();
    const timeout = options.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS;

    try {
      const requestBody = this.buildRequestBody(config, options);
      const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

      const response = await fetch(`${baseUrl}/chat/completions`, {
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

      if ((error as Error).name === 'AbortError' ||
          (error as Error).message.includes('timeout')) {
        throw new TimeoutError(this.providerType, 'Request timed out', timeout);
      }

      throw new NetworkError(
        this.providerType,
        error instanceof Error ? error.message : 'Unknown network error'
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

    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
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
        'API key is required for OpenAI provider',
        'apiKey'
      );
    }

    if (config.apiKey && !validateApiKey(this.providerType, config.apiKey)) {
      throw new ValidationError(
        this.providerType,
        'Invalid API key format for OpenAI'
      );
    }

    if (!config.model) {
      throw new ValidationError(
        this.providerType,
        'Model name is required',
        { field: 'model' }
      );
    }

    return true;
  }

  async testConnection(config: LLMModelConfig): Promise<boolean> {
    try {
      // Send a minimal request
      const response = await this.execute(config, {
        prompt: 'test',
        maxTokens: 1,
      });
      return response.text !== undefined || response.filtered === true;
    } catch {
      return false;
    }
  }

  getMaxContext(modelName: string): number {
    return this.defaultModels[modelName as keyof typeof this.defaultModels] || 8192;
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };

    // Add organization ID if present
    if (config.organizationId) {
      headers['OpenAI-Organization'] = config.organizationId;
    }

    // Add project ID if present
    if (config.projectId) {
      headers['OpenAI-Project'] = config.projectId;
    }

    // Add custom headers if present
    if (config.customHeaders) {
      Object.assign(headers, config.customHeaders);
    }

    return headers;
  }

  private buildRequestBody(
    config: LLMModelConfig,
    options: ProviderRequestOptions
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: config.model,
      messages: [
        {
          role: 'user',
          content: options.prompt,
        },
      ],
      max_tokens: options.maxTokens || 4096,
      temperature: config.temperature ?? options.temperature ?? 0.7,
    };

    if (options.topP !== undefined) {
      body.top_p = options.topP;
    }

    if (options.stopSequences?.length) {
      body.stop = options.stopSequences;
    }

    // Add system message if provided
    if (options.systemMessage) {
      body.messages = [
        { role: 'system', content: options.systemMessage },
        ...body.messages as Array<{ role: string; content: string }>,
      ];
    }

    return body;
  }

  private parseResponse(data: Record<string, unknown>, durationMs: number): ProviderResponse {
    const choices = data.choices as unknown[] | undefined;
    const choice = choices?.[0] as Record<string, unknown> | undefined;
    const message = choice?.message as Record<string, unknown> | undefined;
    const usage = data.usage as Record<string, unknown> | undefined;

    // Check for content filtering
    const finishReason = choice?.finish_reason as string | undefined;
    if (finishReason === 'content_filter') {
      return {
        text: '',
        promptTokens: (usage?.prompt_tokens as number) || 0,
        completionTokens: (usage?.completion_tokens as number) || 0,
        totalTokens: (usage?.total_tokens as number) || 0,
        model: data.model as string,
        filtered: true,
        filterReason: 'Content was filtered by the provider',
        durationMs,
      };
    }

    const text = message?.content as string || '';

    return {
      text,
      promptTokens: (usage?.prompt_tokens as number) || 0,
      completionTokens: (usage?.completion_tokens as number) || 0,
      totalTokens: (usage?.total_tokens as number) || 0,
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

            // Stream end marker
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

              // Check for finish reason
              const finishReason = parsed.choices?.[0]?.finish_reason;
              if (finishReason === 'content_filter') {
                return {
                  text: '',
                  promptTokens: 0,
                  completionTokens: 0,
                  totalTokens: 0,
                  model: parsed.model || 'unknown',
                  filtered: true,
                  filterReason: 'Content was filtered during streaming',
                  durationMs: Date.now() - startTime,
                };
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
      model: 'streamed',
      filtered: false,
      durationMs: Date.now() - startTime,
    };
  }
}

// Export singleton instance
export const openaiProvider = new OpenAIProvider();
