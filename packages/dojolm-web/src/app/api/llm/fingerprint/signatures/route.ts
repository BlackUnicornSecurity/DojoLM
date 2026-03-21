/**
 * K4.3 — Kagami Signatures Endpoint
 * GET /api/llm/fingerprint/signatures
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { loadKagamiSignatures } from 'bu-tpi/fingerprint';

export async function GET(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const family = searchParams.get('family');

    let signatures = loadKagamiSignatures();

    if (provider) {
      signatures = signatures.filter((s) => s.provider.toLowerCase() === provider.toLowerCase());
    }
    if (family) {
      signatures = signatures.filter((s) => s.modelFamily.toLowerCase() === family.toLowerCase());
    }

    return NextResponse.json({
      total: signatures.length,
      signatures: signatures.map((s) => ({
        modelId: s.modelId,
        modelFamily: s.modelFamily,
        provider: s.provider,
        knowledgeCutoff: s.knowledgeCutoff,
        lastVerified: s.lastVerified,
        featureCount: Object.keys(s.features).length,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load signatures' }, { status: 500 });
  }
}
