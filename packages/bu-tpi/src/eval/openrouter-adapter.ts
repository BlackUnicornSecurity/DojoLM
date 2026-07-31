// SPDX-License-Identifier: Apache-2.0
/**
 * File: openrouter-adapter.ts
 * Purpose: Gap 13.A OpenRouter driver — race-runner-compatible RaceModelAdapter
 *          backed by an injected HTTP client interface.
 * Story: Industry-tools parity plan §Gap 13.1 (OpenRouter adapter) — v1-deferred
 *        portion: driver + HTTP client interface, no live-network dependency.
 *
 * Design rules:
 * - NO dependency on any vendor SDK (openrouter / openai / anthropic).
 *   The adapter takes an `OpenRouterHttpClient` interface; tests inject a
 *   deterministic mock; production injects a thin fetch wrapper.
 * - Implements `RaceModelAdapter` so it plugs into race-runner without
 *   any new surface.
 * - R-T1: the adapter never emits prompt/response content via telemetry.
 *   Callers (race-runner) already hash + length-tag response text.
 * - Gated at call-site by OPENROUTER_ENABLED (harmPath flag) — this
 *   module is pure library, flag check is the caller's responsibility
 *   (matches Gap 6 driver pattern from #192).
 * - Model slug safety: validated via the same filename-safe pattern
 *   used elsewhere (#176/#178). OpenRouter slugs include `/` (e.g.
 *   `anthropic/claude-3-opus`) — we accept `/` as one extra character
 *   (validated by a dedicated pattern so it still rejects `..`, bidi
 *   overrides, and prototype-collision ids).
 *
 * Audit lessons applied:
 * - #176 filename-safe ids (adapted for OpenRouter slug shape).
 * - #178 root containment (reject `..` / separator escapes).
 * - #181 Object.hasOwn for any header/config lookup.
 * - #182/#184 bidi strip on every user-supplied id before use.
 * - Post-#188 RESERVED_PROTO_IDS denylist.
 */

import type { RaceModelAdapter } from '../arena/race-types.js';
import {
  CancellationToken,
  KillSwitchAbort,
} from '../flags/kill-switch.js';
import { stripBidiOverrides } from '../bushido/safety.js';

// OpenRouter slug pattern: `<provider>/<model>` with the same filename-safe
// alphabet plus a single `/` separator (never leading, never trailing,
// never doubled). Total length 1..128.
const OPENROUTER_SLUG_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9_.-]*(\/[A-Za-z0-9][A-Za-z0-9_.-]*)?$/;
const MAX_SLUG_LEN = 128;
const RESERVED_PROTO_IDS = new Set(['constructor', 'prototype', '__proto__']);

function ensureOpenRouterModelId(raw: string): string {
  if (typeof raw !== 'string') {
    throw new TypeError('OpenRouter modelId must be a string');
  }
  const stripped = stripBidiOverrides(raw);
  if (stripped.length === 0 || stripped.length > MAX_SLUG_LEN) {
    throw new RangeError(`OpenRouter modelId length must be 1..${MAX_SLUG_LEN}`);
  }
  if (!OPENROUTER_SLUG_PATTERN.test(stripped)) {
    throw new Error(`OpenRouter modelId "${stripped}" is not slug-safe`);
  }
  if (stripped.includes('..')) {
    throw new Error(`OpenRouter modelId "${stripped}" contains traversal`);
  }
  // Check each segment against prototype-name denylist.
  for (const segment of stripped.split('/')) {
    if (RESERVED_PROTO_IDS.has(segment)) {
      throw new Error(
        `OpenRouter modelId segment "${segment}" is a reserved prototype name`,
      );
    }
  }
  return stripped;
}

/**
 * Minimal HTTP request shape the adapter issues. Intentionally
 * decoupled from `fetch` so tests can inject a plain object.
 */
export interface OpenRouterHttpRequest {
  readonly url: string;
  readonly method: 'POST';
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
}

/** Minimal HTTP response shape the adapter consumes. */
export interface OpenRouterHttpResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  /** Parsed JSON body. Adapter owns shape validation. */
  readonly json: unknown;
}

/**
 * Injected HTTP client interface. Implementations:
 *   - Production: thin `fetch`-based wrapper with timeout + signal
 *     forwarding (NOT provided here to keep this module SDK-free).
 *   - Tests: deterministic mock returning canned responses.
 */
export interface OpenRouterHttpClient {
  post(req: OpenRouterHttpRequest): Promise<OpenRouterHttpResponse>;
}

export interface OpenRouterAdapterConfig {
  readonly modelId: string;
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly http: OpenRouterHttpClient;
  readonly timeoutMs?: number;
  readonly httpReferer?: string;
  readonly xTitle?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly cancellationToken?: CancellationToken;
}

const DEFAULT_BASE_URL = 'https://openrouter.ai';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 1024;
const MAX_RESPONSE_LEN = 256 * 1024; // Defensive cap on parsed text.

/**
 * Shape of the OpenRouter chat completion response we rely on.
 * Intentionally minimal — any vendor extension is ignored.
 */
interface OpenRouterChoice {
  readonly message?: {
    readonly content?: string;
  };
  readonly finish_reason?: string;
}
interface OpenRouterResponseBody {
  readonly choices?: readonly OpenRouterChoice[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
  };
}

/**
 * Construct a RaceModelAdapter for a given OpenRouter model.
 * The returned adapter is a pure function object — its only side-effect
 * is calling the injected HTTP client.
 */
export function createOpenRouterAdapter(
  config: OpenRouterAdapterConfig,
): RaceModelAdapter {
  if (typeof config.apiKey !== 'string' || config.apiKey.length === 0) {
    throw new Error('OpenRouter apiKey required');
  }
  if (config.http === null || typeof config.http?.post !== 'function') {
    throw new TypeError('OpenRouter http client must implement post()');
  }
  const modelId = ensureOpenRouterModelId(config.modelId);
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;

  return Object.freeze<RaceModelAdapter>({
    modelId,
    async run({ prompt, seed, creditCeiling }) {
      // Kill-switch short-circuit: cancelled → throw; race-runner translates
      // into a 'cancelled' card.
      if (config.cancellationToken?.cancelled) {
        throw new KillSwitchAbort(config.cancellationToken.cancelEvent!);
      }

      const startedAt = Date.now();
      const body = JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        ...(typeof config.temperature === 'number'
          ? { temperature: config.temperature }
          : {}),
        // Seed sent via OpenRouter extension; providers that don't
        // support it ignore harmlessly.
        seed,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      };
      if (config.httpReferer) headers['HTTP-Referer'] = config.httpReferer;
      if (config.xTitle) headers['X-Title'] = config.xTitle;

      let response: OpenRouterHttpResponse;
      const abortController =
        typeof AbortController === 'function' ? new AbortController() : undefined;
      const unsub = config.cancellationToken?.onCancel(() => {
        abortController?.abort();
      });
      try {
        response = await config.http.post({
          url: `${baseUrl}/api/v1/chat/completions`,
          method: 'POST',
          headers: Object.freeze(headers),
          body,
          timeoutMs,
          signal: abortController?.signal,
        });
      } finally {
        unsub?.();
      }

      if (config.cancellationToken?.cancelled) {
        throw new KillSwitchAbort(config.cancellationToken.cancelEvent!);
      }

      if (!response.ok) {
        // Race-runner converts thrown errors into status='error' cards;
        // we throw a redaction-safe, stable error code.
        throw new Error(
          `OPENROUTER_HTTP_${response.status}:${String(response.statusText).slice(0, 64)}`,
        );
      }

      const parsed = response.json as OpenRouterResponseBody | null;
      const text = extractResponseText(parsed);
      const latencyMs = Math.max(0, Date.now() - startedAt);
      const creditsConsumed = estimateCreditsFromUsage(parsed, creditCeiling);

      return {
        responseText: text.slice(0, MAX_RESPONSE_LEN),
        latencyMs,
        creditsConsumed,
      };
    },
  });
}

function extractResponseText(body: OpenRouterResponseBody | null): string {
  if (!body || !Array.isArray(body.choices) || body.choices.length === 0) {
    return '';
  }
  const first = body.choices[0];
  const content = first?.message?.content;
  return typeof content === 'string' ? content : '';
}

/**
 * Translate token usage into race-runner credit units. We charge 1
 * credit per 100 prompt+completion tokens, clamped at the per-model
 * ceiling. Deterministic; no pricing table here — the cost-estimator
 * module owns the actual micro-USD math.
 */
function estimateCreditsFromUsage(
  body: OpenRouterResponseBody | null,
  creditCeiling: number,
): number {
  const prompt = Math.max(0, Number(body?.usage?.prompt_tokens ?? 0));
  const completion = Math.max(0, Number(body?.usage?.completion_tokens ?? 0));
  const credits = Math.ceil((prompt + completion) / 100);
  if (!Number.isFinite(credits) || credits < 0) return 0;
  if (credits > creditCeiling) return creditCeiling;
  return credits;
}

export const __testing = Object.freeze({
  ensureOpenRouterModelId,
  extractResponseText,
  estimateCreditsFromUsage,
});
