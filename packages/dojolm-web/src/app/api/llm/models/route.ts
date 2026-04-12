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
import { isDemoMode } from '@/lib/demo';
import { demoModelsGet, demoModelsPost } from '@/lib/demo/mock-api-handlers';

import type { LLMModelConfig } from '@/lib/llm-types';
import { getStorage } from '@/lib/storage/storage-interface';
import { validateModelConfig } from '@/lib/llm-providers';
import { apiError } from '@/lib/api-error';
import { checkApiAuth } from '@/lib/api-auth';

/** Detect HTML/script tags in user input (SEC-002). */
const HTML_TAG_PATTERN = /<[^>]*>/;

/** Detect inline JS event handlers without angle brackets (INPUT-02 fix).
 *  Matches patterns like: onmouseover=, onclick=, onerror= */
const EVENT_HANDLER_PATTERN = /\bon[a-z]{2,}\s*=/i;

/**
 * Strip HTML tags, event handlers, and control characters from user-supplied strings.
 * Defense-in-depth against stored XSS (BUG-033, INPUT-02).
 */
function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')       // strip HTML tags
    .replace(/\bon[a-z]{2,}\s*=[^\s]*/gi, '') // strip event handler attributes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars (preserve \t \n \r)
    .trim();
}

/**
 * Reject if raw input contains HTML tags or JS event handlers (SEC-002, INPUT-02).
 * Returns an error string if dangerous content is detected, null otherwise.
 */
function rejectHtmlTags(fields: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string') {
      if (HTML_TAG_PATTERN.test(value)) {
        return `Field "${key}" must not contain HTML tags`;
      }
      if (EVENT_HANDLER_PATTERN.test(value)) {
        return `Field "${key}" must not contain JavaScript event handlers`;
      }
    }
  }
  return null;
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toSafeModelResponse(model: LLMModelConfig) {
  const { apiKey: _apiKey, customHeaders: _customHeaders, ...safeModel } = model;
  return safeModel;
}

// ===========================================================================
// OPTIONS /api/llm/models - CORS preflight
// ===========================================================================

export function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, POST, PATCH, DELETE, OPTIONS' },
  })
}

// ===========================================================================
// GET /api/llm/models - List all models
// ===========================================================================

export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoModelsGet();
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const storage = await getStorage();

    // Filter by provider if specified
    const provider = searchParams.get('provider');
    const enabled = searchParams.get('enabled');

    let models = await storage.getModelConfigs();

    // Apply filters
    if (provider) {
      models = models.filter(m => m.provider === provider);
    }

    if (enabled !== null) {
      const isEnabled = enabled === 'true';
      models = models.filter(m => m.enabled === isEnabled);
    }

    // S-01: Redact API keys before returning (CRITICAL — keys were exposed to LAN)
    const safeModels = models.map(toSafeModelResponse);

    return NextResponse.json(safeModels);
  } catch (error) {
    return apiError('Failed to list models', 500, error);
  }
}

// ===========================================================================
// POST /api/llm/models - Create a new model
// ===========================================================================

export async function POST(request: NextRequest) {
  if (isDemoMode()) return demoModelsPost(request);
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // BUG-035: Guard against null/non-object body (null is valid JSON)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    // Validate required fields
    const { name, provider, model, apiKey, baseUrl } = body;

    if (!name || !provider || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: name, provider, model are required' },
        { status: 400 }
      );
    }

    // SEC-002: Reject HTML tags in string fields (block, don't just strip)
    const htmlError = rejectHtmlTags({ name, provider, model, ...(baseUrl ? { baseUrl } : {}) });
    if (htmlError) {
      return NextResponse.json({ error: htmlError }, { status: 400 });
    }

    // Sanitize string inputs (BUG-033: defense-in-depth, strip remnants)
    const safeName = sanitizeString(name);
    const safeProvider = sanitizeString(provider);
    const safeModel = sanitizeString(model);
    const safeBaseUrl = baseUrl ? sanitizeString(baseUrl) : undefined;

    // BUG-036: Enforce field length limits
    const FIELD_LIMITS = { name: 200, provider: 100, model: 200, baseUrl: 500 } as const;
    if (safeName.length > FIELD_LIMITS.name || safeProvider.length > FIELD_LIMITS.provider ||
        safeModel.length > FIELD_LIMITS.model || (safeBaseUrl && safeBaseUrl.length > FIELD_LIMITS.baseUrl)) {
      return NextResponse.json(
        { error: `Field length exceeded: name max ${FIELD_LIMITS.name}, provider max ${FIELD_LIMITS.provider}, model max ${FIELD_LIMITS.model}, baseUrl max ${FIELD_LIMITS.baseUrl}` },
        { status: 400 }
      );
    }

    if (!safeName || !safeProvider || !safeModel) {
      return NextResponse.json(
        { error: 'Invalid input: name, provider, and model must contain non-tag text' },
        { status: 400 }
      );
    }

    // Create model config
    const now = new Date().toISOString();
    const id = `model-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const newModel: LLMModelConfig = {
      id,
      name: safeName,
      provider: safeProvider as LLMModelConfig['provider'],
      model: safeModel,
      apiKey: apiKey as string | undefined,
      baseUrl: safeBaseUrl,
      enabled: (body.enabled as boolean) ?? true,
      maxTokens: toOptionalNumber(body.maxTokens),
      organizationId: body.organizationId as string | undefined,
      projectId: body.projectId as string | undefined,
      customHeaders: body.customHeaders as Record<string, string> | undefined,
      temperature: toOptionalNumber(body.temperature),
      topP: toOptionalNumber(body.topP),
      requestTimeout: toOptionalNumber(body.requestTimeout),
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
    const storage = await getStorage();
    const saved = await storage.saveModelConfig(newModel);

    // Redact API key from response — wrap in { model } to match frontend expectations (BUG-002)
    return NextResponse.json({ model: toSafeModelResponse(saved) }, { status: 201 });
  } catch (error) {
    return apiError('Failed to create model', 500, error);
  }
}

// ===========================================================================
// DELETE /api/llm/models - Delete a model
// ===========================================================================

export async function DELETE(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    const storage = await getStorage();
    const success = await storage.deleteModelConfig(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError('Failed to delete model', 500, error);
  }
}

// ===========================================================================
// PATCH /api/llm/models - Update a model
// ===========================================================================

export async function PATCH(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    // BUG-035: Guard against null/non-object body (null is valid JSON)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    // Get existing model
    const storage = await getStorage();
    const existing = await storage.getModelConfig(id as string);

    if (!existing) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // H-01: Apply PATCHABLE whitelist to prevent mass assignment (match [id]/route.ts pattern)
    const PATCHABLE = ['name', 'description', 'enabled', 'maxTokens', 'temperature', 'topP', 'customHeaders', 'baseUrl', 'model', 'requestTimeout', 'safetyRisk', 'requiresGuard'] as const;
    const STRING_FIELDS = new Set(['name', 'description', 'baseUrl', 'model']);

    // SEC-002: Reject HTML tags in string fields
    const stringPatch: Record<string, unknown> = {};
    for (const key of PATCHABLE) {
      if (key in body && STRING_FIELDS.has(key)) {
        stringPatch[key] = body[key];
      }
    }
    const htmlError = rejectHtmlTags(stringPatch);
    if (htmlError) {
      return NextResponse.json({ error: htmlError }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    for (const key of PATCHABLE) {
      if (key in body) {
        // BUG-033: Sanitize string fields (defense-in-depth)
        patch[key] = STRING_FIELDS.has(key) ? sanitizeString(body[key]) : body[key];
      }
    }

    const updated: LLMModelConfig = {
      ...existing,
      ...patch,
      id: id as string, // Ensure ID doesn't change
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
    const saved = await storage.saveModelConfig(updated);

    // Redact API key from response — wrap in { model } to match frontend expectations (BUG-002)
    return NextResponse.json({ model: toSafeModelResponse(saved) });
  } catch (error) {
    return apiError('Failed to update model', 500, error);
  }
}
