/**
 * File: api/llm/local-models/route.ts
 * Purpose: Fetch available models from local LLM providers
 * Methods:
 * - GET: List models from Ollama, LM Studio, or llama.cpp
 */

import { NextRequest, NextResponse } from 'next/server';

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
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'ollama';
    const baseUrl = searchParams.get('baseUrl');

    // SSRF protection: use validateProviderUrl with isLocal=true
    // This blocks hex-encoded IPs (0x7f000001), integer IPs, octal IPs,
    // and only allows localhost/127.0.0.1 on allowed ports
    if (baseUrl) {
      try {
        const { validateProviderUrl } = await import('bu-tpi/llm');
        if (!validateProviderUrl(baseUrl, true)) {
          return NextResponse.json(
            { error: 'Only localhost URLs on allowed ports are permitted for local model discovery', models: [] },
            { status: 400 }
          );
        }
      } catch {
        // Fallback: strict hostname check if bu-tpi import fails
        try {
          const parsed = new URL(baseUrl);
          if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
            return NextResponse.json(
              { error: 'Only localhost URLs are allowed for local model discovery', models: [] },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: 'Invalid baseUrl', models: [] },
            { status: 400 }
          );
        }
      }
    }

    if (
!['ollama', 'lmstudio', 'llamacpp'].includes(provider)
) {
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
    }

    return NextResponse.json({
      provider,
      baseUrl: baseUrl || getDefaultBaseUrl(provider),
      models,
      count: models.length,
    });
  } catch (error) {
    console.error('Error fetching local models:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch models',
        provider: (new URL(request.url).searchParams.get('provider') || 'ollama'),
        models: [],
        count: 0,
      },
      { status: 500 }
    );
  }
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

  const response = await fetch(`${baseUrl}/api/tags`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Ollama API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

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
  const response = await fetch(`${baseUrl}/v1/models`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

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
