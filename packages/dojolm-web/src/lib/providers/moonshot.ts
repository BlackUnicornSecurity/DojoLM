/**
 * File: providers/moonshot.ts
 * Purpose: Moonshot AI (Kimi) provider adapter
 * Index:
 * - MoonshotProvider class (line 29)
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
// Moonshot AI Provider
// ===========================================================================

/**
 * Moonshot AI (Kimi) model context windows
 */
const MOONSHOT_CONTEXT_WINDOWS: Record<string, number> = {
  'moonshot-v1-8k': 8192,
  'moonshot-v1-32k': 32768,
  'moonshot-v1-128k': 128000,
  'kimi-latest': 128000,
};

/**
 * Moonshot AI provider adapter
 *
 * Moonshot provides OpenAI-compatible API endpoints for Kimi models.
 */
export class MoonshotProvider implements LLMProviderAdapter {
  readonly providerType = 'moonshot';
  readonly supportsStreaming = true;

  // Use OpenAI provider internally since Moonshot is OpenAI-compatible
  private openaiProvider = new OpenAIProvider();

  async execute(
    config: LLMModelConfig,
    options: ProviderRequestOptions
  ): Promise<ProviderResponse> {
    this.validateConfig(config);

    // Override base URL for Moonshot
    const moonshotConfig: LLMModelConfig = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.moonshot.cn/v1',
    };

    return this.openaiProvider.execute(moonshotConfig, options);
  }

  async streamExecute(
    config: LLMModelConfig,
    options: ProviderRequestOptions,
    onChunk: StreamCallback
  ): Promise<ProviderResponse> {
    this.validateConfig(config);

    const moonshotConfig: LLMModelConfig = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.moonshot.cn/v1',
    };

    return this.openaiProvider.streamExecute(moonshotConfig, options, onChunk);
  }

  validateConfig(config: LLMModelConfig): boolean {
    if (!config.apiKey) {
      throw new AuthenticationError(
        this.providerType,
        'API key is required for Moonshot provider',
        'apiKey'
      );
    }

    if (!config.model) {
      throw new ValidationError(
        this.providerType,
        'Model name is required (e.g., moonshot-v1-8k, kimi-latest)',
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
    return MOONSHOT_CONTEXT_WINDOWS[modelName] || 32768;
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
export const moonshotProvider = new MoonshotProvider();
