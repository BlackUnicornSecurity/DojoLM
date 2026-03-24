/**
 * File: api/llm/models/[id]/test/route.ts
 * Purpose: Test model connection
 * Method: POST
 */

import { NextRequest, NextResponse } from 'next/server';

import { getStorage } from '@/lib/storage/storage-interface';
import { testModelConfig } from '@/lib/llm-providers';
import { checkApiAuth } from '@/lib/api-auth';

// ===========================================================================
// POST /api/llm/models/[id]/test - Test model connection
// ===========================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const { id } = await params;
    const storage = await getStorage();

    const model = await storage.getModelConfig(id);

    if (!model) {
      return NextResponse.json(
        { success: false, error: 'Model not found' },
        { status: 404 }
      );
    }

    // Test connection
    const result = await testModelConfig(model);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing model:', error);
    return NextResponse.json(
      { success: false, error: 'Model connection test failed' },
      { status: 500 }
    );
  }
}
