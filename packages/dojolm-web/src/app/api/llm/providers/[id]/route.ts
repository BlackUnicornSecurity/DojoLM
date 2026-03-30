/**
 * Provider Detail Endpoints (P8-S84)
 *
 * GET /api/llm/providers/:id — Get provider info (no auth)
 * DELETE /api/llm/providers/:id — Remove provider
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage/storage-interface';
import { checkApiAuth } from '@/lib/api-auth';

type RouteParams = { params: Promise<{ id: string }> };

export function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, DELETE, OPTIONS' },
  });
}

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

    // Strip auth details
    return NextResponse.json({
      id: config.id,
      name: config.name,
      provider: config.provider,
      model: config.model,
      enabled: config.enabled,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authError = checkApiAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const storage = await getStorage();

    const existing = await storage.getModelConfig(id);
    if (!existing) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    await storage.deleteModelConfig(id);

    return NextResponse.json({ success: true, message: `Provider ${id} removed` });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
