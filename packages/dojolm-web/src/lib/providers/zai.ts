/**
 * File: providers/zai.ts
 * Purpose: z.ai (Zhipu AI) provider adapter
 * Index:
 * - ZaiProvider class (line 29)
 * - Request handling (line 88)
 * - Response parsing (line 156)
 */

import type { LLMModelConfig } from '../llm-types';
import type {
  LLMProviderAdapter,
  ProviderRequestOptions,
  ProviderResponse,
  StreamCallback,
  StreamChunk,
} from '../llm-providers';

import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  estimateCost as estimateCostFromConstants,
} from '../llm-constants';

import {
  AuthenticationError,
  ValidationError,
  NetworkError,
  TimeoutError,
  parseApiError,
} from './errors';

// Re-use OpenAI-compatible implementation
import { OpenAIProvider } from './openai';

// ===========================================================================
// z.ai (Zhipu AI) Provider
// ===========================================================================

/**
 * z.ai (Zhipu AI) model context windows
 */
const ZAI_CONTEXT_WINDOWS: Record<string, number> = {
  'glm-4.7': 128000,
  'glm-4-flash': 128000,
  'glm-4-plus': 128000,
  'glm-4-air': 128000,
  'glm-3-turbo': 128000,
};

/**
 * z.ai (Zhipu AI) provider adapter
 *
 * z.ai provides OpenAI-compatible API endpoints for GLM series models.
 */
export class ZaiProvider implements LLMProviderAdapter {
  readonly providerType = 'zai';
  readonly supportsStreaming = true;

  // Use OpenAI provider internally since z.ai is OpenAI-compatible
  private openaiProvider = new OpenAIProvider();

  async execute(
    config: LLMModelConfig,
    options: ProviderRequestOptions
  ): Promise<ProviderResponse> {
    this.validateConfig(config);

    // Override base URL for z.ai
    const zaiConfig: LLMModelConfig = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.z.ai/api/anthropic',
    };

    return this.openaiProvider.execute(zaiConfig, options);
  }

  async streamExecute(
    config: LLMModelConfig,
    options: ProviderRequestOptions,
    onChunk: StreamCallback
  ): Promise<ProviderResponse> {
    this.validateConfig(config);

    const zaiConfig: LLMModelConfig = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.z.ai/api/anthropic',
    };

    return this.openaiProvider.streamExecute(zaiConfig, options, onChunk);
  }

  validateConfig(config: LLMModelConfig): boolean {
    if (!config.apiKey) {
      throw new AuthenticationError(
        this.providerType,
        'API key is required for z.ai provider',
        'apiKey'
      );
    }

    if (!config.model) {
      throw new ValidationError(
        this.providerType,
        'Model name is required (e.g., glm-4.7, glm-4-flash)',
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
      });
      return response.text !== undefined || response.filtered === true;
    } catch {
      return false;
    }
  }

  getMaxContext(modelName: string): number {
    return ZAI_CONTEXT_WINDOWS[modelName] || 128000;
  }

  estimateCost(
    modelName: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    return estimateCostFromConstants(this.providerType, promptTokens, completionTokens);
  }
}

// Export singleton instance
export const zaiProvider = new ZaiProvider();
