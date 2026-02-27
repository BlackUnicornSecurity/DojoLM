/**
 * File: api/llm/models/route.ts
 * Purpose: Model configuration CRUD API
 * Methods:
 * - GET: List all model configurations
 * - POST: Create a new model configuration
 * - DELETE: Delete a model configuration
 * - PATCH: Enable/disable a model
 */

import { NextRequest, NextResponse } from 'next/server';

import type { LLMModelConfig } from '@/lib/llm-types';
import { fileStorage } from '@/lib/storage/file-storage';
import { validateModelConfig } from '@/lib/llm-providers';

// ===========================================================================
// GET /api/llm/models - List all models
// ===========================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Filter by provider if specified
    const provider = searchParams.get('provider');
    const enabled = searchParams.get('enabled');

    let models = await fileStorage.getModelConfigs();

    // Apply filters
    if (provider) {
      models = models.filter(m => m.provider === provider);
    }

    if (enabled !== null) {
      const isEnabled = enabled === 'true';
      models = models.filter(m => m.enabled === isEnabled);
    }

    return NextResponse.json(models);
  } catch (error) {
    console.error('Error listing models:', error);
    return NextResponse.json(
      { error: 'Failed to list models', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ===========================================================================
// POST /api/llm/models - Create a new model
// ===========================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { name, provider, model, apiKey, baseUrl } = body;

    if (!name || !provider || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: name, provider, model are required' },
        { status: 400 }
      );
    }

    // Create model config
    const now = new Date().toISOString();
    const id = `model-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const newModel: LLMModelConfig = {
      id,
      name,
      provider,
      model,
      apiKey,
      baseUrl,
      enabled: body.enabled ?? true,
      maxTokens: body.maxTokens,
      organizationId: body.organizationId,
      projectId: body.projectId,
      customHeaders: body.customHeaders,
      temperature: body.temperature,
      topP: body.topP,
      createdAt: now,
      updatedAt: now,
    };

    // Validate config
    const validation = await validateModelConfig(newModel);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid model configuration', errors: validation.errors },
        { status: 400 }
      );
    }

    // Save model
    const saved = await fileStorage.saveModelConfig(newModel);

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error('Error creating model:', error);
    return NextResponse.json(
      { error: 'Failed to create model', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ===========================================================================
// DELETE /api/llm/models - Delete a model
// ===========================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    const success = await fileStorage.deleteModelConfig(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting model:', error);
    return NextResponse.json(
      { error: 'Failed to delete model', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ===========================================================================
// PATCH /api/llm/models - Update a model
// ===========================================================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    // Get existing model
    const existing = await fileStorage.getModelConfig(id);

    if (!existing) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Apply updates
    const updated: LLMModelConfig = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      createdAt: existing.createdAt, // Preserve creation time
      updatedAt: new Date().toISOString(),
    };

    // Validate updated config
    const validation = await validateModelConfig(updated);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid model configuration', errors: validation.errors },
        { status: 400 }
      );
    }

    // Save updated model
    const saved = await fileStorage.saveModelConfig(updated);

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json(
      { error: 'Failed to update model', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
