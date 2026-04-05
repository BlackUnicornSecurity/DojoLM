/**
 * Provider Management Endpoints (P8-S84)
 *
 * POST /api/llm/providers — Register new provider
 * GET /api/llm/providers — List configured providers (no auth details)
 * DELETE /api/llm/providers/:id — Remove provider (via [id] route)
 */
import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoProvidersGet, demoProvidersPost } from '@/lib/demo/mock-api-handlers';
import { getStorage } from '@/lib/storage/storage-interface';
import { checkApiAuth } from '@/lib/api-auth';

const MAX_REGISTRATIONS_PER_MINUTE = 10;
const registrationTimestamps: number[] = [];

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function checkRateLimit(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  // Remove old entries
  while (registrationTimestamps.length > 0 && registrationTimestamps[0] < oneMinuteAgo) {
    registrationTimestamps.shift();
  }
  return registrationTimestamps.length < MAX_REGISTRATIONS_PER_MINUTE;
}

export function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, POST, OPTIONS' },
  })
}

/**
 * POST /api/llm/providers — Register new provider
 */
export async function POST(request: NextRequest) {
  if (isDemoMode()) return demoProvidersPost();
  const authError = checkApiAuth(request);
  if (authError) return authError;

  try {
    if (!checkRateLimit()) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 registrations per minute.' },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { provider, model, name, baseUrl, enabled, maxTokens, temperature, topP, requestTimeout, customHeaders } = body as Record<string, unknown>;

    // Validate required fields
    if (!provider || typeof provider !== 'string') {
      return NextResponse.json({ error: 'Missing required field: provider' }, { status: 400 });
    }
    if (!model || typeof model !== 'string') {
      return NextResponse.json({ error: 'Missing required field: model' }, { status: 400 });
    }

    // F-07: SSRF protection — validate baseUrl before saving
    const safeBaseUrl = (baseUrl as string) || undefined;
    if (safeBaseUrl) {
      const { validateProviderUrl } = await import('bu-tpi/llm');
      const isLocalProvider = ['ollama', 'lmstudio', 'llamacpp'].includes(provider);
      if (!validateProviderUrl(safeBaseUrl, isLocalProvider)) {
        return NextResponse.json(
          { error: 'Invalid or unsafe baseUrl: external providers must use public HTTPS endpoints, and local providers must use localhost or an IP allowlisted in TPI_TRUSTED_INTERNAL_IPS on approved ports' },
          { status: 400 }
        );
      }
    }

    // Server-generated UUID (never user-supplied)
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const config = {
      id,
      name: (name as string) || `${provider}/${model}`,
      provider: provider as import('@/lib/llm-types').LLMProvider,
      model: model as string,
      baseUrl: safeBaseUrl,
      enabled: (enabled as boolean) ?? true,
      maxTokens: toOptionalNumber(maxTokens),
      temperature: toOptionalNumber(temperature),
      topP: toOptionalNumber(topP),
      requestTimeout: toOptionalNumber(requestTimeout),
      customHeaders: (customHeaders as Record<string, string>) || undefined,
      createdAt: now,
      updatedAt: now,
      // API key is handled separately — NOT included in response
    };

    // CR-4: Count attempt before storage call (rate-limit on attempt, not success)
    registrationTimestamps.push(Date.now());

    const storage = await getStorage();
    const saved = await storage.saveModelConfig(config);

    // Strip ALL auth details from response
    return NextResponse.json({
      id: saved.id,
      name: saved.name,
      provider: saved.provider,
      model: saved.model,
      enabled: saved.enabled,
      status: 'registered',
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering provider:', error);
    return NextResponse.json(
      { error: 'Failed to register provider' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/llm/providers — List configured providers (no auth details)
 */
export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoProvidersGet();
  const authError = checkApiAuth(request);
  if (authError) return authError;

  try {
    const storage = await getStorage();
    const configs = await storage.getModelConfigs();

    // Strip ALL auth details — return only safe fields
    const safeList = configs.map(c => ({
      id: c.id,
      name: c.name,
      provider: c.provider,
      model: c.model,
      enabled: c.enabled,
      status: 'registered',
    }));

    return NextResponse.json(safeList);
  } catch (error) {
    console.error('Error listing providers:', error);
    return NextResponse.json(
      { error: 'Failed to list providers' },
      { status: 500 }
    );
  }
}
