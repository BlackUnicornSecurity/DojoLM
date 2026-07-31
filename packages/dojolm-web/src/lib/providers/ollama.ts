// SPDX-License-Identifier: Apache-2.0
/**
 * File: providers/ollama.ts
 * Purpose: Ollama provider adapter for local models
 * Index:
 * - OllamaProvider class (line 29)
 * - Custom headers for Ollama (line 82)
 * - Request handling (line 108)
 * - Model listing (line 175)
 */

import type { LLMModelConfig, ProviderDoneReason } from '../llm-types';
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
  ProviderUnavailableError,
  parseApiError,
} from './errors';

import { detectRefusal } from './refusal-detector';
import { readJsonCapped } from './read-capped';
import { hardenedProviderFetch } from './hardened-fetch';

import {
  toOpenAITools,
  toOpenAIToolChoice,
  toOpenAIMessages,
  parseOpenAIToolCalls,
} from './tool-wire';

// ===========================================================================
// E4.S4 — finish_reason / done_reason normalization
// ===========================================================================

/**
 * Normalize OpenAI `finish_reason` and Ollama `done_reason` onto the
 * canonical `ProviderDoneReason` union so the SSE pipeline (and ultimately
 * the chat UI) can branch on a stable 4-value enum.
 *
 * Maps:
 *   "stop"          → "stop"
 *   "length"        → "length"   (max-tokens cap → empty/overflow distinction)
 *   "load"          → "load"     (Ollama failed to load model)
 *   "error" / other → "error"
 *
 * Returns `undefined` when the provider returned no finish reason at all
 * (older Ollama builds, mocked test fixtures); callers should treat
 * `undefined` as "unknown" and fall back to the legacy code path.
 */
function normalizeDoneReason(raw: unknown): ProviderDoneReason | undefined {
  if (typeof raw !== 'string' || raw.length === 0) return undefined;
  switch (raw) {
    case 'stop':
    case 'length':
    case 'load':
    case 'error':
      return raw;
    // OpenAI emits 'content_filter' → handled by `filtered`, not doneReason.
    case 'content_filter':
      return undefined;
    // Model paused to emit native tool calls — treat as unknown so the
    // empty-completion banner doesn't misfire on a tool-call turn.
    case 'tool_calls':
      return undefined;
    default:
      return 'error';
  }
}

// ===========================================================================
// Ollama Provider
// ===========================================================================

/**
 * Default context windows for common Ollama models
 */
const OLLAMA_CONTEXT_WINDOWS: Record<string, number> = {
  'llama3.2': 128000,
  'llama3.1': 128000,
  'llama3': 8192,
  'llama2': 4096,
  'mistral': 32000,
  'mixtral': 32000,
  'qwen2.5': 32768,
  'qwen2': 32768,
  'phi3': 128000,
  'gemma2': 8192,
  'deepseek-coder': 16384,
  'codellama': 16384,
};

/**
 * Ollama provider adapter
 *
 * Supports locally-hosted models via Ollama.
 * Ollama provides an OpenAI-compatible API endpoint.
 */
export class OllamaProvider implements LLMProviderAdapter {
  readonly providerType = 'ollama';
  readonly supportsStreaming = true;
  // Ollama's OpenAI-compatible endpoint supports `tools` for models that can
  // tool-call. Per-model gating of small/weak models is decided upstream by
  // `resolveToolCallingMode`, not here.
  readonly supportsNativeTools = true;

  async execute(
    config: LLMModelConfig,
    options: ProviderRequestOptions
  ): Promise<ProviderResponse> {
    this.validateConfig(config);

    const startTime = Date.now();
    const timeout = options.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    try {
      const requestBody = this.buildRequestBody(config, options);

      const response = await hardenedProviderFetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeout),
      }, true);

      if (!response.ok) {
        // Wave 3ff (F-7-013 P1 retire) — Distinguish transient timeout
        // (408 / 504), permanent server error (5xx), service unavailable
        // (503), and client error (4xx) using parseApiError so callers
        // can render outcome-appropriate copy. The legacy implementation
        // wrapped every non-OK status as NetworkError which forced a
        // generic "request failed" toast.
        const errorText = await response.text();
        throw parseApiError(this.providerType, response.status, errorText);
      }

      const data = await response.json();
      return this.parseResponse(data, Date.now() - startTime, config.model);
    } catch (error) {
      // Wave 3ff (F-7-013 P1 retire) — AbortError takes precedence over
      // any wrapped status code: AbortSignal.timeout() fires synchronously
      // and we must surface "try again" not "try later".
      if ((error as Error).name === 'AbortError' || (error as Error).name === 'TimeoutError') {
        throw new TimeoutError(this.providerType, 'Request timed out', timeout);
      }

      // Already-classified errors from parseApiError propagate unchanged.
      if (
        error instanceof NetworkError ||
        error instanceof TimeoutError ||
        error instanceof ProviderUnavailableError ||
        error instanceof ValidationError
      ) {
        throw error;
      }

      // Unrecognised — fall back to NetworkError (retryable). TypeError
      // from native fetch (DNS / offline) lands here.
      throw new NetworkError(
        this.providerType,
        error instanceof Error ? error.message : 'Ollama request failed'
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
    const baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    const requestBody = {
      ...this.buildRequestBody(config, options),
      stream: true,
    };

    try {
      const response = await hardenedProviderFetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeout),
      }, true);

      if (!response.ok) {
        // Wave 3ff (F-7-013 P1 retire) — Same outcome classification as
        // the non-streaming path so consumers can branch on transient
        // timeout vs. permanent 5xx vs. service-unavailable vs. 4xx.
        const errorText = await response.text().catch(() => '');
        throw parseApiError(this.providerType, response.status, errorText);
      }

      return await this.handleStream(response, onChunk, startTime);
    } catch (error) {
      if ((error as Error).name === 'AbortError' || (error as Error).name === 'TimeoutError') {
        throw new TimeoutError(this.providerType, 'Stream timed out', timeout);
      }

      if (
        error instanceof NetworkError ||
        error instanceof TimeoutError ||
        error instanceof ProviderUnavailableError ||
        error instanceof ValidationError
      ) {
        throw error;
      }

      throw new NetworkError(
        this.providerType,
        error instanceof Error ? error.message : 'Ollama stream failed'
      );
    }
  }

  validateConfig(config: LLMModelConfig): boolean {
    if (!config.model) {
      throw new ValidationError(
        this.providerType,
        'Model name is required (e.g., llama3.2, mistral)',
        { field: 'model' }
      );
    }

    // Ollama doesn't require API key for local use
    // Base URL is optional (defaults to localhost:11434)

    return true;
  }

  async testConnection(config: LLMModelConfig): Promise<boolean> {
    try {
      const baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

      // Verify the daemon is up AND the target model is actually installed on
      // the host. A bare /api/tags liveness check returns ok even for a model
      // that was never pulled, so Test would flash green for a non-existent
      // tag — check membership so a green Test means "this model is loadable
      // here", not merely "some Ollama server answered".
      const response = await hardenedProviderFetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(config.requestTimeout ?? 5000),
      }, true);

      if (!response.ok) return false;

      const data = await readJsonCapped<{
        models?: Array<{ name?: string; model?: string }>;
      }>(response).catch(() => null);
      const tags = data?.models ?? [];
      // Ollama treats a colon-less ref as ":latest".
      const target = config.model;
      const targetLatest = target.includes(':') ? target : `${target}:latest`;
      return tags.some((m) => {
        const nm = m.name ?? m.model ?? '';
        return nm === target || nm === targetLatest;
      });
    } catch {
      return false;
    }
  }

  getMaxContext(modelName: string): number {
    return OLLAMA_CONTEXT_WINDOWS[modelName] || 8192;
  }

  estimateCost(_modelName: string, _promptTokens: number, _completionTokens: number): number {
    // Ollama is free (local)
    return 0;
  }

  // -----------------------------------------------------------------------
  // Private Methods
  // -----------------------------------------------------------------------

  private buildRequestBody(
    config: LLMModelConfig,
    options: ProviderRequestOptions
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: config.model,
      messages: this.buildMessages(options),
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

    // Native tool-calling — forward tool specs + choice when supplied.
    if (options.tools?.length) {
      body.tools = toOpenAITools(options.tools);
      body.tool_choice = toOpenAIToolChoice(options.toolChoice);
    }

    return body;
  }

  /**
   * Build the OpenAI-compatible `messages` array. Prefers a structured
   * `options.messages` conversation (native tool-calling path) and falls back
   * to the flattened `prompt` (+ optional system) for the legacy path.
   */
  private buildMessages(options: ProviderRequestOptions): unknown[] {
    if (options.messages?.length) {
      const translated = toOpenAIMessages(options.messages);
      const hasSystem = translated[0]?.role === 'system';
      if (options.systemMessage && !hasSystem) {
        return [{ role: 'system', content: options.systemMessage }, ...translated];
      }
      return translated;
    }

    const base = [{ role: 'user', content: options.prompt }];
    return options.systemMessage
      ? [{ role: 'system', content: options.systemMessage }, ...base]
      : base;
  }

  private parseResponse(data: Record<string, unknown>, durationMs: number, modelName: string): ProviderResponse {
    const choices = data.choices as unknown[] | undefined;
    const choice = choices?.[0] as Record<string, unknown> | undefined;
    const message = choice?.message as Record<string, unknown> | undefined;
    const usage = data.usage as Record<string, unknown> | undefined;

    // E4.S4 — capture finish_reason (OpenAI-compatible /v1 endpoint) or
    // done_reason (Ollama native) so the UI can distinguish empty vs.
    // context-overflow completions.
    const doneReason =
      normalizeDoneReason(choice?.finish_reason)
      ?? normalizeDoneReason(data.done_reason);

    // Native tool-calling — surface any `tool_calls` the model emitted.
    const toolCalls = parseOpenAIToolCalls(message);

    // E4.S2 / F-7-002 — 3-tier refusal detection. Replaces the legacy
    // hardcoded `filtered: false`. When the detector flags the response,
    // downstream `lib/llm-execution.ts` line 103 gates corpus
    // accumulation on `response.filtered === true` and the call shows
    // up in the LLM audit log with `outcome: 'filtered'`. A tool-call turn
    // is never a refusal, so skip detection when tool calls are present.
    const text = (message?.content as string) || '';
    const verdict = toolCalls.length
      ? { filtered: false as const, reason: undefined }
      : detectRefusal(text, doneReason);

    return {
      text,
      promptTokens: (usage?.prompt_tokens as number) || 0,
      completionTokens: (usage?.completion_tokens as number) || 0,
      totalTokens: (usage?.total_tokens as number) || 0,
      model: (data.model as string) || modelName,
      filtered: verdict.filtered,
      ...(verdict.filtered && verdict.reason ? { filterReason: verdict.reason } : {}),
      ...(doneReason ? { doneReason } : {}),
      ...(toolCalls.length ? { toolCalls } : {}),
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
    // E4.S4 — capture the last non-null finish_reason / done_reason from
    // the stream so we can propagate it on the synthesized ProviderResponse.
    let doneReason: ProviderDoneReason | undefined;

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

              // E4.S4 — record finish_reason once it appears. Streaming
              // chunks emit it on the final delta; older Ollama builds
              // emit `done_reason` at the top level of the SSE payload.
              const chunkReason =
                normalizeDoneReason(parsed.choices?.[0]?.finish_reason)
                ?? normalizeDoneReason(parsed.done_reason);
              if (chunkReason) {
                doneReason = chunkReason;
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

    // E4.S2 / F-7-002 — 3-tier refusal detection on aggregated stream text.
    const streamVerdict = detectRefusal(fullText, doneReason);

    return {
      text: fullText,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model: 'ollama-streamed',
      filtered: streamVerdict.filtered,
      ...(streamVerdict.filtered && streamVerdict.reason
        ? { filterReason: streamVerdict.reason }
        : {}),
      ...(doneReason ? { doneReason } : {}),
      durationMs: Date.now() - startTime,
    };
  }
}

// Export singleton instance
export const ollamaProvider = new OllamaProvider();
