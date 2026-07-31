// SPDX-License-Identifier: Apache-2.0
/**
 * Provider Status Check (P8-S84)
 * GET /api/llm/providers/:id/status — Check provider health
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage/storage-interface';
import { testModelConfig } from '@/lib/llm-providers';
import { withAuth } from '@/lib/auth/route-guard';

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
  },
  { role: 'admin' },
);
