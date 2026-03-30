/**
 * Chat Endpoint (P8-S84)
 * POST /api/llm/chat — Send chat request to configured provider
 *
 * Input validation: max 100 messages, max 100KB total, valid roles only.
 * Server-side proxy — browser never contacts providers directly.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage/storage-interface';
import { getProviderAdapter } from '@/lib/llm-providers';
import { withAuth } from '@/lib/auth/route-guard';

const MAX_MESSAGES = 100;
const MAX_PAYLOAD_BYTES = 256 * 1024; // 256KB
const MAX_RESPONSE_SIZE = 64 * 1024; // 64KB
const VALID_ROLES = new Set(['system', 'user', 'assistant']);

// Strip HTML tags, ANSI escape sequences, control characters
function sanitizeOutput(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Strip HTML
    .replace(/\x1b\[[0-9;]*m/g, '') // Strip ANSI
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '') // Strip control chars (keep \n, \t)
    .slice(0, MAX_RESPONSE_SIZE);
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const rawBody = await request.text();

    // Payload size check
    if (rawBody.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: `Payload too large. Max ${MAX_PAYLOAD_BYTES} bytes.` },
        { status: 413 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { modelId, messages, maxTokens, temperature, systemMessage } = body as Record<string, unknown>;

    if (!modelId) {
      return NextResponse.json({ error: 'Missing required field: modelId' }, { status: 400 });
    }

    // Validate messages
    if (messages && Array.isArray(messages)) {
      if (messages.length > MAX_MESSAGES) {
        return NextResponse.json(
          { error: `Too many messages. Max ${MAX_MESSAGES}.` },
          { status: 400 }
        );
      }
      for (const msg of messages) {
        if (!VALID_ROLES.has(msg.role)) {
          const safeRole = String(msg.role ?? '').slice(0, 50);
          return NextResponse.json(
            { error: `Invalid role: ${safeRole}. Valid roles: system, user, assistant.` },
            { status: 400 }
          );
        }
      }
    }

    const storage = await getStorage();
    const config = await storage.getModelConfig(modelId as string);
    if (!config) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const adapter = await getProviderAdapter(config.provider);
    if (!adapter) {
      return NextResponse.json({ error: `No adapter for provider: ${config.provider}` }, { status: 400 });
    }

    const prompt = messages
      ? (messages as Array<{ role: string; content: string }>).filter((m) => m.role === 'user').map((m) => m.content).join('\n')
      : (body.prompt as string) || '';

    const startTime = performance.now();
    const response = await adapter.execute(config, {
      prompt,
      maxTokens: (maxTokens as number) || config.maxTokens || 1024,
      temperature: (temperature as number) ?? config.temperature ?? 0.7,
      systemMessage: systemMessage as string | undefined,
      ...(config.requestTimeout ? { timeout: config.requestTimeout } : {}),
    });

    const duration = Math.round(performance.now() - startTime);

    return NextResponse.json({
      text: sanitizeOutput(response.text),
      model: response.model,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      totalTokens: response.totalTokens,
      durationMs: duration,
      filtered: response.filtered || false,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat request:', error);
    return NextResponse.json(
      { error: 'Chat request failed' },
      { status: 500 }
    );
  }
}, { resource: 'chat', action: 'execute' });
