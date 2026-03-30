/**
 * Provider Model Discovery (P8-S84)
 * GET /api/llm/providers/:id/discover — Discover models from pre-registered local provider
 *
 * Only works for pre-registered providers. No arbitrary URL parameter.
 * Discovery restricted to localhost/127.0.0.1 only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage/storage-interface';
import { checkApiAuth } from '@/lib/api-auth';

type RouteParams = { params: Promise<{ id: string }> };

const LOCAL_PROVIDERS = new Set(['ollama', 'lmstudio', 'llamacpp']);

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authError = checkApiAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const storage = await getStorage();
    const config = await storage.getModelConfig(id);

    if (!config) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    if (!LOCAL_PROVIDERS.has(config.provider)) {
      return NextResponse.json(
        { error: 'Model discovery is only available for local providers (ollama, lmstudio, llamacpp)' },
        { status: 400 }
      );
    }

    const baseUrl = config.baseUrl || getDefaultUrl(config.provider);
    const { validateProviderUrl } = await import('bu-tpi/llm');
    if (!validateProviderUrl(baseUrl, true)) {
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
}

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

    const response = await fetch(url, {
      signal: AbortSignal.timeout(requestTimeout),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (provider === 'ollama' && data.models) {
      return data.models.map((m: any) => ({
        id: m.name,
        name: m.name,
        size: m.size ? formatSize(m.size) : undefined,
      }));
    }

    if (data.data) {
      return data.data.map((m: any) => ({
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
