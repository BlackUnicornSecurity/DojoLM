/**
 * Provider Management Endpoints (P8-S84)
 *
 * POST /api/llm/providers — Register new provider
 * GET /api/llm/providers — List configured providers (no auth details)
 * DELETE /api/llm/providers/:id — Remove provider (via [id] route)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage/storage-interface';

const MAX_REGISTRATIONS_PER_MINUTE = 10;
const registrationTimestamps: number[] = [];

function checkRateLimit(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  // Remove old entries
  while (registrationTimestamps.length > 0 && registrationTimestamps[0] < oneMinuteAgo) {
    registrationTimestamps.shift();
  }
  return registrationTimestamps.length < MAX_REGISTRATIONS_PER_MINUTE;
}

/**
 * POST /api/llm/providers — Register new provider
 */
export async function POST(request: NextRequest) {
  try {
    if (!checkRateLimit()) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 registrations per minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { provider, model, name, baseUrl, enabled, maxTokens, temperature, topP, customHeaders } = body;

    // Validate required fields
    if (!provider || typeof provider !== 'string') {
      return NextResponse.json({ error: 'Missing required field: provider' }, { status: 400 });
    }
    if (!model || typeof model !== 'string') {
      return NextResponse.json({ error: 'Missing required field: model' }, { status: 400 });
    }

    // Server-generated UUID (never user-supplied)
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const config = {
      id,
      name: name || `${provider}/${model}`,
      provider: provider as import('@/lib/llm-types').LLMProvider,
      model: model as string,
      baseUrl: baseUrl || undefined,
      enabled: enabled ?? true,
      maxTokens: maxTokens || undefined,
      temperature: temperature || undefined,
      topP: topP || undefined,
      customHeaders: customHeaders || undefined,
      createdAt: now,
      updatedAt: now,
      // API key is handled separately — NOT included in response
    };

    const storage = await getStorage();
    const saved = await storage.saveModelConfig(config);

    registrationTimestamps.push(Date.now());

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
    return NextResponse.json(
      { error: `Failed to register provider: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/llm/providers — List configured providers (no auth details)
 */
export async function GET() {
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
    return NextResponse.json(
      { error: `Failed to list providers: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
