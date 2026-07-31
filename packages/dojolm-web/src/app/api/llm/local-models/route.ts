// SPDX-License-Identifier: Apache-2.0
/**
 * File: api/llm/local-models/route.ts
 * Purpose: Fetch available models from local LLM providers
 * Methods:
 * - GET: List models from Ollama, LM Studio, or llama.cpp
 */

import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-error';
import { withAuth } from '@/lib/auth/route-guard';
import { isDemoMode } from '@/lib/demo';
import { LOCAL_PROVIDER_TYPES } from '@/lib/llm-constants';
import { hardenedProviderFetch } from '@/lib/providers/hardened-fetch';
import { readJsonCapped } from '@/lib/providers/read-capped';

/**
 * Standardized model info returned by this endpoint
 */
interface LocalModelInfo {
  /** Model identifier (used as model field in config) */
  id: string;
  /** Display name */
  name: string;
  /** Size in parameters (if available) */
  size?: number;
  /** Size in human-readable format */
  sizeFormatted?: string;
  /** Quantization (if available) */
  quantization?: string;
  /** Modified date (for Ollama) */
  modifiedAt?: string;
  /** Digest hash (for Ollama) */
  digest?: string;
}

/**
 * GET /api/llm/local-models
 *
 * Query parameters:
 * - provider: 'ollama' | 'lmstudio' | 'llamacpp'
 * - baseUrl: Custom base URL (optional, uses default if not provided)
 *
 * Returns list of available models from the specified local provider
 */
export const GET = withAuth(
  async (request: NextRequest) => {
  // Demo mode: return mock local models for setup wizard
  if (isDemoMode()) {
    return NextResponse.json({
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      models: [
        { id: 'sampleEcho:13b', name: 'sampleEcho:13b', size: 7365960704, sizeFormatted: '6.9 GB', quantization: 'Q4_0', modifiedAt: new Date().toISOString() },
        { id: 'sampleAlpha:7b', name: 'sampleAlpha:7b', size: 3825819648, sizeFormatted: '3.6 GB', quantization: 'Q4_0', modifiedAt: new Date().toISOString() },
        { id: 'sampleCharlie:70b', name: 'sampleCharlie:70b', size: 39144407040, sizeFormatted: '36.5 GB', quantization: 'Q4_K_M', modifiedAt: new Date().toISOString() },
      ],
      count: 3,
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'ollama';
    const baseUrl = searchParams.get('baseUrl');

    // SSRF protection: use validateProviderUrl with isLocal=true
    // This blocks hex-encoded IPs (0x7f000001), integer IPs, octal IPs,
    // and only allows localhost/127.0.0.1 on allowed ports
    if (baseUrl) {
      try {
        // resolveAndValidateUrl resolves the hostname and checks the RESOLVED
        // IP (DNS-rebinding defense), not just the hostname string.
        const { resolveAndValidateUrl } = await import('bu-tpi/llm');
        if ((await resolveAndValidateUrl(baseUrl, true)) === null) {
          return NextResponse.json(
            { error: 'Only localhost or TPI_TRUSTED_INTERNAL_IPS allowlisted URLs on approved ports are permitted for local model discovery', models: [] },
            { status: 400 }
          );
        }
      } catch {
        // Fail CLOSED: the SSRF validator (bu-tpi/llm) is the security control.
        // If it can't be loaded we reject rather than degrade to a weaker,
        // more-permissive hostname allowlist — a security check must never fail
        // open. (Reachable only via a build/packaging fault, not attacker input.)
        return NextResponse.json(
          { error: 'URL validation is temporarily unavailable; cannot verify baseUrl safety', models: [] },
          { status: 503 }
        );
      }
    }

    if (!LOCAL_PROVIDER_TYPES.has(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider', models: [] },
        { status: 400 }
      );
    }

    let models: LocalModelInfo[] = [];

    switch (provider) {
      case 'ollama':
        models = await fetchOllamaModels(baseUrl);
        break;
      case 'lmstudio':
        models = await fetchOpenAICompatibleModels(
          baseUrl || 'http://localhost:1234'
        );
        break;
      case 'llamacpp':
        models = await fetchOpenAICompatibleModels(
          baseUrl || 'http://localhost:8080'
        );
        break;
      case 'sensei':
        // Deliberate no-op: the Sensei brain is not a local-discovery target
        // (it carries an explicit `/v1` baseUrl and is driven via
        // /api/sensei/chat). It is a LOCAL_PROVIDER_TYPES member only for
        // baseUrl locality gating, so it returns an empty model list here.
        break;
    }

    return NextResponse.json({
      provider,
      baseUrl: baseUrl || getDefaultBaseUrl(provider),
      models,
      count: models.length,
    });
  } catch (error) {
    // A local provider that simply isn't running (ECONNREFUSED / DNS / timeout)
    // is an expected, user-recoverable condition — not a server fault. Report it
    // as an empty result with a diagnostic so the discovery UI shows "none found"
    // instead of a 500 error toast. Genuine bugs still surface as 500.
    if (isProviderUnreachable(error)) {
      const { searchParams } = new URL(request.url);
      const provider = searchParams.get('provider') || 'ollama';
      const baseUrl = searchParams.get('baseUrl') || getDefaultBaseUrl(provider);
      return NextResponse.json({
        provider,
        baseUrl,
        models: [],
        count: 0,
        reachable: false,
        message: `No local ${provider} reachable at ${baseUrl}. Start it, or pass a custom baseUrl.`,
      });
    }
    return apiError('Failed to fetch local models', 500, error);
  }
  },
  { role: 'admin' },
);

/**
 * True when an error is a provider-not-reachable condition (connection refused,
 * DNS failure, host unreachable, reset, or a fetch timeout) rather than a code
 * fault. Node's global fetch throws `TypeError: fetch failed` with the underlying
 * cause on `.cause.code`; `AbortSignal.timeout` throws a TimeoutError/AbortError.
 */
function isProviderUnreachable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; message?: string; cause?: { code?: string } };
  const code = e.cause?.code;
  if (code && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH', 'EAI_AGAIN'].includes(code)) {
    return true;
  }
  if (e.name === 'TimeoutError' || e.name === 'AbortError') return true;
  const msg = (e.message || '').toLowerCase();
  return msg.includes('fetch failed') || msg.includes('failed to fetch');
}

/**
 * Get default base URL for a provider
 */
function getDefaultBaseUrl(provider: string): string {
  const defaults: Record<string, string> = {
    ollama: 'http://localhost:11434',
    lmstudio: 'http://localhost:1234',
    llamacpp: 'http://localhost:8080',
  };
  return defaults[provider] || 'http://localhost:11434';
}

/**
 * Fetch models from Ollama instance
 *
 * Ollama uses /api/tags endpoint which returns:
 * {
 *   "models": [
 *     { "name": "llama3.2", "modified_at": "2024-01-01T00:00:00Z", "size": 2147483648, "digest": "sha256:..." }
 *   ]
 * }
 */
async function fetchOllamaModels(
  customBaseUrl?: string | null
): Promise<LocalModelInfo[]> {
  const baseUrl = customBaseUrl || 'http://localhost:11434';

  // SSRF: hardenedProviderFetch(isLocal=true) fails closed on a 3xx to an
  // internal host AND attaches bu-tpi's connect-time pinned dispatcher (closes
  // the DNS-rebinding TOCTOU the sync resolveAndValidateUrl gate leaves open).
  // The JSON read is byte-capped (readJsonCapped) so a hostile provider can't
  // exhaust memory with an oversized /api/tags. Also timeout-bounded (10s) +
  // admin-gated.
  const response = await hardenedProviderFetch(`${baseUrl}/api/tags`, {
    signal: AbortSignal.timeout(10000),
  }, true);

  if (!response.ok) {
    throw new Error(`Ollama API returned ${response.status}: ${response.statusText}`);
  }

  const data = await readJsonCapped<{
    models?: Array<{ name: string; modified_at?: string; size?: number; digest?: string }>;
  }>(response);

  if (!data.models || !Array.isArray(data.models)) {
    return [];
  }

  return data.models.map((model: { name: string; modified_at?: string; size?: number; digest?: string }) => ({
    id: model.name,
    name: formatModelName(model.name),
    size: model.size,
    sizeFormatted: model.size ? formatSize(model.size) : undefined,
    modifiedAt: model.modified_at,
    digest: model.digest,
  }));
}

/**
 * Fetch models from OpenAI-compatible API (LM Studio, llama.cpp)
 *
 * Uses /v1/models endpoint which returns:
 * {
 *   "object": "list",
 *   "data": [
 *     { "id": "model-name", "created": 1234567890 }
 *   ]
 * }
 */
async function fetchOpenAICompatibleModels(
  baseUrl: string
): Promise<LocalModelInfo[]> {
  // isLocal=true: redirect:'error' + connect-time pinned dispatcher (see
  // fetchOllamaModels).
  const response = await hardenedProviderFetch(`${baseUrl}/v1/models`, {
    signal: AbortSignal.timeout(10000),
  }, true);

  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }

  const data = await readJsonCapped<{ data?: Array<{ id: string; created?: number }> }>(response);

  if (!data.data || !Array.isArray(data.data)) {
    return [];
  }

  return data.data.map((model: { id: string; created?: number }) => ({
    id: model.id,
    name: formatModelName(model.id),
  }));
}

/**
 * Format model name for display
 * Converts common model naming patterns to readable format
 */
function formatModelName(name: string): string {
  // Convert common patterns
  const formatted = name
    .replace(/_/g, ' ')           // snake_case to space
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase to space
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize each word

  return formatted;
}

/**
 * Format byte size to human-readable format
 */
function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
}
