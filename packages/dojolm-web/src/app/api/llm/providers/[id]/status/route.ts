/**
 * Provider Status Check (P8-S84)
 * GET /api/llm/providers/:id/status — Check provider health
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage/storage-interface';
import { testModelConfig } from '@/lib/llm-providers';
import { checkApiAuth } from '@/lib/api-auth';

type RouteParams = { params: Promise<{ id: string }> };

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

    const result = await testModelConfig(config);

    return NextResponse.json({
      id: config.id,
      provider: config.provider,
      status: result.success ? 'available' : 'unavailable',
      durationMs: result.durationMs,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
