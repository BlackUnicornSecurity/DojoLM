/**
 * Custom Provider — Configurable auth and JSON path mapping (P8-S83)
 *
 * Supports arbitrary API formats via safe JSON path validation.
 * Hand-written dot-notation path resolver only — NO eval-capable libraries.
 */

import type {
  LLMModelConfig, LLMProviderAdapter, ProviderRequestOptions,
  ProviderResponse, StreamCallback, LLMProviderStatus,
  CustomProviderTemplate,
} from '../types.js';
import { parseApiError, NetworkError } from '../errors.js';
import { fetchWithTimeout, measureDuration } from '../fetch-utils.js';
import { validateProviderUrl, validateJsonPath, resolveJsonPath } from '../security.js';

export class CustomProvider implements LLMProviderAdapter {
  readonly providerType = 'custom' as const;
  readonly supportsStreaming = false;

  private readonly template: CustomProviderTemplate;

  constructor(template: CustomProviderTemplate) {
    // Validate all paths at construction time
    if (template.responseMapping) {
      if (!validateJsonPath(template.responseMapping.text)) {
        throw new Error(`Invalid response text path: ${template.responseMapping.text}`);
      }
      if (template.responseMapping.promptTokens && !validateJsonPath(template.responseMapping.promptTokens)) {
        throw new Error(`Invalid promptTokens path: ${template.responseMapping.promptTokens}`);
      }
      if (template.responseMapping.completionTokens && !validateJsonPath(template.responseMapping.completionTokens)) {
        throw new Error(`Invalid completionTokens path: ${template.responseMapping.completionTokens}`);
      }
    }
    this.template = template;
  }

  async execute(config: LLMModelConfig, options: ProviderRequestOptions): Promise<ProviderResponse> {
    const startTime = performance.now();
    const baseUrl = config.baseUrl || this.template.baseUrl;
    const isLocal = this.template.isLocal || false;

    if (!validateProviderUrl(baseUrl, isLocal)) {
      throw new Error(`Custom provider URL validation failed: ${baseUrl}`);
    }

    let url = `${baseUrl}/chat/completions`;
    // Handle query-param auth
    if (this.template.authType === 'query-param' && config.apiKey) {
      const urlObj = new URL(url);
      urlObj.searchParams.set('key', config.apiKey);
      url = urlObj.toString();
    }
    const headers = this.buildHeaders(config);
    const body = this.buildRequestBody(config, options);

    let response: Response;
    try {
      response = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        timeoutMs: options.timeout || 30_000,
        skipUrlValidation: true, // Already validated above
      });
    } catch (error) {
      throw new NetworkError('custom', `Request failed: ${(error as Error).message}`, { originalError: error });
    }

    if (!response.ok) {
      throw parseApiError('custom', response.status, await response.text());
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error('Custom provider returned non-JSON response');
    }

    return this.parseCustomResponse(data, config.model, startTime);
  }

  async streamExecute(config: LLMModelConfig, options: ProviderRequestOptions, onChunk: StreamCallback): Promise<ProviderResponse> {
    const response = await this.execute(config, options);
    onChunk({ delta: response.text, done: false });
    onChunk({ delta: '', done: true, completionTokens: response.completionTokens });
    return response;
  }

  validateConfig(config: LLMModelConfig): boolean {
    if (!config.model || config.model.length < 1) return false;
    const baseUrl = config.baseUrl || this.template.baseUrl;
    if (!baseUrl) return false;
    // Validate URL (allow local if template says so)
    return validateProviderUrl(baseUrl, this.template.isLocal || false);
  }

  async testConnection(config: LLMModelConfig): Promise<boolean> {
    try {
      const baseUrl = config.baseUrl || this.template.baseUrl;
      const isLocal = this.template.isLocal || false;
      const url = `${baseUrl}/models`;
      const response = await fetchWithTimeout(url, {
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

  getMaxContext(): number { return 32_768; }
  estimateCost(): number { return 0; }

  async checkStatus(config: LLMModelConfig): Promise<LLMProviderStatus> {
    return (await this.testConnection(config)) ? 'available' : 'unavailable';
  }

  private buildHeaders(config: LLMModelConfig): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (config.apiKey) {
      switch (this.template.authType) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${config.apiKey}`;
          break;
        case 'api-key-header':
          headers[this.template.authHeaderName || 'x-api-key'] = config.apiKey;
          break;
        case 'query-param':
          // Query param auth handled at URL construction time, not in headers
          break;
        case 'aws-sigv4':
          throw new Error(
            'aws-sigv4 auth not supported in CustomProvider. Use @dojolm/provider-bedrock instead (per AD-P8-05).'
          );
        case 'none':
          break;
      }
    }

    if (this.template.customHeaders) Object.assign(headers, this.template.customHeaders);
    if (config.customHeaders) Object.assign(headers, config.customHeaders);

    return headers;
  }

  private buildRequestBody(config: LLMModelConfig, options: ProviderRequestOptions): Record<string, unknown> {
    // Default to OpenAI-compatible format
    return {
      model: config.model,
      messages: [
        ...(options.systemMessage ? [{ role: 'system', content: options.systemMessage }] : []),
        { role: 'user', content: options.prompt },
      ],
      max_tokens: options.maxTokens || config.maxTokens || 1024,
      temperature: options.temperature ?? config.temperature ?? 0.7,
    };
  }

  private parseCustomResponse(data: unknown, model: string, startTime: number): ProviderResponse {
    const mapping = this.template.responseMapping;

    if (mapping) {
      // Use custom response mapping with safe JSON path resolution
      const text = String(resolveJsonPath(data, mapping.text) ?? '');
      const promptTokens = mapping.promptTokens
        ? Number(resolveJsonPath(data, mapping.promptTokens) ?? 0)
        : 0;
      const completionTokens = mapping.completionTokens
        ? Number(resolveJsonPath(data, mapping.completionTokens) ?? 0)
        : 0;

      return {
        text,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        model,
        durationMs: measureDuration(startTime),
      };
    }

    // Fallback: try OpenAI-compatible format
    const obj = data as Record<string, unknown>;
    const choices = obj.choices as Array<{ message?: { content?: string } }> | undefined;
    const text = choices?.[0]?.message?.content ?? String(obj.text ?? obj.response ?? obj.content ?? '');
    const usage = obj.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;

    return {
      text,
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
      model,
      durationMs: measureDuration(startTime),
    };
  }
}
