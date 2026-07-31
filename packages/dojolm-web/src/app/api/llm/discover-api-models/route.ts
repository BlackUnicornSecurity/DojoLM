// SPDX-License-Identifier: Apache-2.0
/**
 * File: api/llm/discover-api-models/route.ts
 * Purpose: Discover models served by a frontier API provider, given the
 *          operator's API key. Used by the `/admin/jutsu` AddProviderDrawer
 *          "Cloud API" mode so the operator can pick from the live model
 *          list (e.g. Anthropic Opus 4.7 / 4.7-1M / Sonnet 4.6 / Haiku 4.5)
 *          rather than typing the model id by hand.
 *
 * Method:
 *   POST { provider, apiKey, baseUrl? } → 200 { provider, models: [{id,name}], source: 'live'|'fallback' }
 *
 * Notes:
 *   - The operator's apiKey is used in-memory for one upstream call and
 *     never persisted by this route. Persistence happens on the separate
 *     `POST /api/llm/models` save step.
 *   - If the upstream `/v1/models` endpoint fails (bad key, rate limit,
 *     no list endpoint for that provider), the route returns the curated
 *     `DEFAULT_MODELS[provider]` list with `source: 'fallback'` so the UI
 *     stays useful — the operator can still pick something to save.
 *   - Admin-only (`withAuth { role: 'admin' }`). CSRF is enforced upstream
 *     by the route guard.
 */

import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/lib/auth/route-guard';
import { isDemoMode } from '@/lib/demo';
import {
  DEFAULT_MODELS,
  PROVIDER_BASE_URLS,
} from '@/lib/llm-constants';
import type { LLMProvider } from '@/lib/llm-types';
import { hardenedProviderFetch } from '@/lib/providers/hardened-fetch';

interface DiscoveredModel {
  readonly id: string;
  readonly name: string;
}

interface DiscoverBody {
  readonly provider?: string;
  readonly apiKey?: string;
  readonly baseUrl?: string;
}

const SUPPORTED: readonly LLMProvider[] = [
  'openai',
  'anthropic',
  'google',
  'mistral',
  'deepseek',
  'groq',
  'together',
  'fireworks',
  'cohere',
  'zai',
  'moonshot',
  'blackunicorn',
  'custom',
] as const;

const FETCH_TIMEOUT_MS = 10_000;

export const POST = withAuth(
  async (request: NextRequest) => {
    // Demo mode — return curated DEFAULT_MODELS without an upstream call.
    if (isDemoMode()) {
      const body = await safeJson(request);
      const provider = (body.provider ?? 'anthropic') as LLMProvider;
      return NextResponse.json({
        provider,
        models: fallbackModels(provider),
        source: 'fallback',
      });
    }

    const body = await safeJson(request);
    const provider = (body.provider ?? '') as LLMProvider;
    const apiKey = (body.apiKey ?? '').trim();
    const baseUrlOverride = (body.baseUrl ?? '').trim();

    if (!provider || !SUPPORTED.includes(provider)) {
      return NextResponse.json(
        { error: 'Unsupported provider', models: [] },
        { status: 400 },
      );
    }

    if (baseUrlOverride) {
      // SSRF + key-exfil defense: this route forwards the operator's frontier
      // API key in the upstream Authorization/x-api-key header, so an unvetted
      // baseUrl override could pivot into the internal network or leak the key
      // to an attacker box. Validate the same way providers/route.ts and
      // local-models/route.ts do. isLocal=false → HTTPS-forced and rejects a
      // public hostname that resolves to a private/metadata IP (DNS rebinding).
      // All SUPPORTED providers here are cloud/frontier (no ollama/lmstudio/
      // llamacpp), so isLocal is always false.
      try {
        const { resolveAndValidateUrl } = await import('bu-tpi/llm');
        if ((await resolveAndValidateUrl(baseUrlOverride, false)) === null) {
          return NextResponse.json(
            { error: 'Invalid or unsafe baseUrl: must be a public HTTPS endpoint (no internal/private hosts)', models: [] },
            { status: 400 },
          );
        }
      } catch {
        // Fail CLOSED: the SSRF validator is the security control. If it can't
        // load we reject rather than degrade to a weaker scheme-only check.
        return NextResponse.json(
          { error: 'URL validation is temporarily unavailable; cannot verify baseUrl safety', models: [] },
          { status: 503 },
        );
      }
    }

    const baseUrl = baseUrlOverride || PROVIDER_BASE_URLS[provider] || '';

    try {
      if (!apiKey || !baseUrl) {
        return NextResponse.json({
          provider,
          models: fallbackModels(provider),
          source: 'fallback',
        });
      }

      const live = await discoverLive(provider, apiKey, baseUrl);
      if (live.length > 0) {
        return NextResponse.json({
          provider,
          models: live,
          source: 'live',
        });
      }

      return NextResponse.json({
        provider,
        models: fallbackModels(provider),
        source: 'fallback',
      });
    } catch (error) {
      // Fall back to curated list rather than failing the request — the
      // drawer still needs *something* to render. The error is logged.
      await logDiscoveryError(provider, error);
      return NextResponse.json({
        provider,
        models: fallbackModels(provider),
        source: 'fallback',
      });
    }
  },
  { role: 'admin' },
);

/**
 * Log an upstream discovery failure with credentials scrubbed. The google branch
 * puts the apiKey in the request URL, so a thrown fetch/URL error can carry the
 * key on `.input`/`.message`; sanitizeCredentials strips known key shapes before
 * it hits the logs. If the sanitizer can't load, log WITHOUT the error object
 * rather than risk leaking a key embedded in it.
 */
async function logDiscoveryError(provider: LLMProvider, error: unknown): Promise<void> {
  try {
    const { sanitizeCredentials } = await import('bu-tpi/llm');
    // Native Error message/stack are non-enumerable, so sanitizeCredentials(error)
    // would scrub to `{}` and drop all diagnostics — pass name+message explicitly.
    // Both still run through the credential/URL scrubber, so no key can leak.
    const detail = error instanceof Error
      ? sanitizeCredentials({ name: error.name, message: error.message })
      : sanitizeCredentials(String(error));
    console.error('[discover-api-models]', provider, detail);
  } catch {
    console.error('[discover-api-models]', provider, '[error withheld: sanitizer unavailable]');
  }
}

async function safeJson(request: NextRequest): Promise<DiscoverBody> {
  try {
    return (await request.json()) as DiscoverBody;
  } catch {
    return {};
  }
}

function fallbackModels(provider: LLMProvider): DiscoveredModel[] {
  const ids = DEFAULT_MODELS[provider] ?? [];
  return ids.map((id) => ({ id, name: id }));
}

async function discoverLive(
  provider: LLMProvider,
  apiKey: string,
  baseUrl: string,
): Promise<DiscoveredModel[]> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

  // Every upstream call goes through hardenedProviderFetch(isLocal=false): it
  // forces redirect:'error' AND attaches bu-tpi's connect-time pinned dispatcher.
  // The pin re-validates the DNS-resolved IP at connect, closing the rebinding
  // TOCTOU that the sync resolveAndValidateUrl gate above leaves open (a low-TTL
  // host could rebind to loopback/RFC1918 between that check and this fetch — and
  // this fetch carries the operator's frontier API key).
  switch (provider) {
    // Anthropic + Anthropic-compatible providers (zai uses Anthropic schema
    // at `/api/anthropic/v1/models`; the curated `PROVIDER_BASE_URLS[zai]`
    // is `https://api.z.ai/api/anthropic`, so the URL composition lands on
    // the right endpoint).
    case 'anthropic':
    case 'zai': {
      const res = await hardenedProviderFetch(`${baseUrl}/v1/models`, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal,
      }, false);
      if (!res.ok) return [];
      const data = (await res.json()) as { data?: Array<{ id?: string; display_name?: string }> };
      return (data.data ?? [])
        .filter((m) => typeof m.id === 'string' && m.id)
        .map((m) => ({ id: m.id as string, name: m.display_name || (m.id as string) }));
    }

    case 'google': {
      const url = `${baseUrl}/models?key=${encodeURIComponent(apiKey)}`;
      const res = await hardenedProviderFetch(url, { signal }, false);
      if (!res.ok) return [];
      const data = (await res.json()) as { models?: Array<{ name?: string; displayName?: string }> };
      return (data.models ?? [])
        .filter((m) => typeof m.name === 'string' && m.name)
        .map((m) => {
          const id = (m.name as string).replace(/^models\//, '');
          return { id, name: m.displayName || id };
        });
    }

    case 'cohere': {
      const res = await hardenedProviderFetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal,
      }, false);
      if (!res.ok) return [];
      const data = (await res.json()) as { models?: Array<{ name?: string }> };
      return (data.models ?? [])
        .filter((m) => typeof m.name === 'string' && m.name)
        .map((m) => ({ id: m.name as string, name: m.name as string }));
    }

    // OpenAI-compatible /v1/models with bearer auth.
    //
    // Most providers return `{ data: [{ id }, …] }` (the OpenAI shape), but
    // Together AI returns the bare array `[{ id }, …]` at the root. Accept
    // either — fall back to `[]` if neither matches so the route falls
    // through to the curated list rather than crashing.
    case 'openai':
    case 'mistral':
    case 'deepseek':
    case 'groq':
    case 'together':
    case 'fireworks':
    case 'moonshot':
    case 'blackunicorn':
    case 'custom':
    default: {
      const res = await hardenedProviderFetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal,
      }, false);
      if (!res.ok) return [];
      const json = (await res.json()) as unknown;
      const arr: Array<{ id?: string }> = Array.isArray(json)
        ? (json as Array<{ id?: string }>)
        : ((json as { data?: Array<{ id?: string }> })?.data ?? []);
      return arr
        .filter((m) => typeof m?.id === 'string' && m.id)
        .map((m) => ({ id: m.id as string, name: m.id as string }));
    }
  }
}
