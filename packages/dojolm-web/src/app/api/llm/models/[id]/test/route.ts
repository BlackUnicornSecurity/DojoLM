/**
 * File: api/llm/models/[id]/test/route.ts
 * Purpose: Test model connection
 * Method: POST
 */

import { NextRequest, NextResponse } from 'next/server';

import { fileStorage } from '@/lib/storage/file-storage';
import { testModelConfig } from '@/lib/llm-providers';

// ===========================================================================
// POST /api/llm/models/[id]/test - Test model connection
// ===========================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const model = await fileStorage.getModelConfig(id);

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
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
