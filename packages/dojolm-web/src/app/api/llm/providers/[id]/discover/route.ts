// SPDX-License-Identifier: Apache-2.0
/**
 * Provider Model Discovery (P8-S84)
 * GET /api/llm/providers/:id/discover — Discover models from pre-registered local provider
 *
 * Only works for pre-registered providers. No arbitrary URL parameter.
 * Discovery restricted to localhost/127.0.0.1 only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage/storage-interface';
import { withAuth } from '@/lib/auth/route-guard';
import { LOCAL_PROVIDER_TYPES } from '@/lib/llm-constants';
import { hardenedProviderFetch } from '@/lib/providers/hardened-fetch';
import { readJsonCapped } from '@/lib/providers/read-capped';

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withAuth(
  async (_request: NextRequest, { params }) => {
  try {
    const id = params?.id ?? '';
    const storage = await getStorage();
    const config = await storage.getModelConfig(id);

    if (!config) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    if (!LOCAL_PROVIDER_TYPES.has(config.provider)) {
      return NextResponse.json(
        { error: 'Model discovery is only available for local providers (ollama, lmstudio, llamacpp)' },
        { status: 400 }
      );
    }

    // `sensei` is a LOCAL_PROVIDER_TYPES member for baseUrl locality gating, but
    // it is deliberately NOT a model-discovery target: the Sensei brain is
    // configured with an explicit baseUrl (which, unlike ollama/lmstudio/llamacpp,
    // already carries the `/v1` suffix) and is driven through /api/sensei/chat.
    // Reject clearly instead of silently returning an empty list.
    if (config.provider === 'sensei') {
      return NextResponse.json(
        { error: 'Model discovery is not available for the sensei brain; set its model + baseUrl explicitly.' },
        { status: 400 }
      );
    }

    const baseUrl = config.baseUrl || getDefaultUrl(config.provider);
    const { resolveAndValidateUrl } = await import('bu-tpi/llm');
    if ((await resolveAndValidateUrl(baseUrl, true)) === null) {
      return NextResponse.json(
        { error: 'Discovery restricted to localhost or IPs allowlisted in TPI_TRUSTED_INTERNAL_IPS on approved ports' },
        { status: 403 }
      );
    }

    const models = await discoverModels(
      config.provider,
      baseUrl,
      config.requestTimeout ?? 10_000
    );

    return NextResponse.json({
      providerId: id,
      provider: config.provider,
      models,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  },
  { role: 'admin' },
);

function getDefaultUrl(provider: string): string {
  switch (provider) {
    case 'ollama': return 'http://localhost:11434';
    case 'lmstudio': return 'http://localhost:1234';
    case 'llamacpp': return 'http://localhost:8080';
    default: return '';
  }
}

async function discoverModels(
  provider: string,
  baseUrl: string,
  requestTimeout: number
): Promise<Array<{ id: string; name: string; size?: string }>> {
  try {
    let url: string;
    if (provider === 'ollama') {
      url = `${baseUrl}/api/tags`;
    } else {
      url = `${baseUrl}/v1/models`;
    }

    // isLocal=true: hardenedProviderFetch adds redirect:'error' + bu-tpi's
    // connect-time pinned dispatcher (loopback / TPI_TRUSTED_INTERNAL_IPS
    // allowlist), closing the DNS-rebinding TOCTOU that the sync
    // resolveAndValidateUrl check above leaves open.
    const response = await hardenedProviderFetch(url, {
      signal: AbortSignal.timeout(requestTimeout),
    }, true);

    if (!response.ok) {
      return [];
    }

    const data = await readJsonCapped<{
      models?: Array<{ name: string; size?: number }>;
      data?: Array<{ id: string }>;
    }>(response);

    if (provider === 'ollama' && data.models) {
      return data.models.map((m) => ({
        id: m.name,
        name: m.name,
        size: m.size ? formatSize(m.size) : undefined,
      }));
    }

    if (data.data) {
      return data.data.map((m) => ({
        id: m.id,
        name: m.id,
      }));
    }

    return [];
  } catch {
    return [];
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}
