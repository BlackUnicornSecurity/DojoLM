// SPDX-License-Identifier: Apache-2.0
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
import type { AivssScore } from 'bu-tpi/aivss';
import { getStorage } from '@/lib/storage/storage-interface';
import { validateModelConfig } from '@/lib/llm-providers';
import { apiError } from '@/lib/api-error';
import { withAuth } from '@/lib/auth/route-guard';
import { auditLog } from '@/lib/audit-logger';
import { computeForModel } from '@/lib/aivss/computeForModel';
import { excludeSenseiBrain } from '@/lib/llm/target-models';

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

/**
 * TICKET-G3-API-JUTSU — augment each safe model response with the
 * server-computed AIVSS score so the host client can render the
 * `<AivssPill>` chip directly from the wire shape instead of falling
 * back to the band='none' placeholder. `null` is the EXPLICIT "no
 * signal" slot when the model has no `safetyRisk` (e.g. freshly-
 * created entries before QA classification).
 */
function withAivss(model: LLMModelConfig): ReturnType<typeof toSafeModelResponse> & {
  aivss: AivssScore | null;
} {
  return { ...toSafeModelResponse(model), aivss: computeForModel(model) };
}

/**
 * Operating parameter-size cap for selectable models, in billions.
 * Retires F-7-026 (P2) / F-7-005 (P1, banned 122B model exposed).
 * Models whose parsed size exceeds this cap are excluded from /api/llm/models.
 */
const MAX_PARAMETER_SIZE_B = 40;

/**
 * Parse a model identifier into an approximate parameter count, in billions.
 *
 * Recognized shapes (case-insensitive):
 *   "qwen3-coder:30b"       → 30
 *   "sample-charlie:70B"           → 70
 *   "qwen3.5:122b"          → 122
 *   "phi3:0.5b"             → 0.5
 *   "phi3:500m"             → 0.5
 *   "mixtral:8x7b"          → 56  (experts × per-expert)
 *   "llama-3.1-70b-instruct"→ 70  (anywhere in the string)
 *
 * Returns `undefined` when no size token is present (e.g. "gpt-4o",
 * "claude-3-5-sonnet-20241022"). Hosted-frontier model names without an
 * explicit size suffix fail-open: we do not block what we cannot identify.
 */
function parseSize(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const lower = value.toLowerCase();

  // MoE / sharded form first: e.g. 8x7b → 56B
  const moe = lower.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*b\b/);
  if (moe) {
    const experts = Number(moe[1]);
    const perExpert = Number(moe[2]);
    if (Number.isFinite(experts) && Number.isFinite(perExpert)) {
      return experts * perExpert;
    }
  }

  // Plain "<num>b" suffix: must follow a delimiter (":", "-", "_", "/", whitespace, or start).
  // Pick the LARGEST match — admin-supplied names like "Llama 3.1 70B" must
  // resolve to 70, not 3.1.
  let largest: number | undefined;
  const billionsRe = /(?:^|[:_\-/\s])(\d+(?:\.\d+)?)\s*b\b/g;
  for (const m of lower.matchAll(billionsRe)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && (largest === undefined || n > largest)) {
      largest = n;
    }
  }
  if (largest !== undefined) return largest;

  // "<num>m" suffix → convert to billions. Same delimiter rules.
  const millionsRe = /(?:^|[:_\-/\s])(\d+(?:\.\d+)?)\s*m\b/g;
  for (const m of lower.matchAll(millionsRe)) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) {
      const inB = n / 1000;
      if (largest === undefined || inB > largest) largest = inB;
    }
  }

  return largest;
}

/**
 * Returns true if the model is selectable under the operating cap.
 * Models without a parseable size pass through (fail-open: we cannot
 * misclassify hosted models like "gpt-4o" or "claude-3-5-sonnet").
 */
function isWithinSizeCap(model: LLMModelConfig): boolean {
  const fromModel = parseSize(model.model);
  const fromName = parseSize(model.name);
  // Largest evidence wins — a config with both "qwen3.5:122b" and a sanitized
  // name "Qwen 122B" should be rejected on the 122 reading.
  const candidates = [fromModel, fromName].filter(
    (v): v is number => typeof v === 'number'
  );
  if (candidates.length === 0) return true;
  const size = Math.max(...candidates);
  return size <= MAX_PARAMETER_SIZE_B;
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

export const GET = withAuth(
  async (request: NextRequest) => {
  if (isDemoMode()) return demoModelsGet();

  try {
    const { searchParams } = new URL(request.url);
    const storage = await getStorage();

    // Filter by provider if specified
    const provider = searchParams.get('provider');
    const enabled = searchParams.get('enabled');

    // Sensei Rework (Pillar B) — two list modes share this endpoint:
    //   - default (target mode): ≤40B cap applies, Sensei brain hidden.
    //   - `?senseiOnly=true` (Sensei-model picker): cap LIFTED (the brain
    //     may be a large model) AND brain shown (so the operator sees what
    //     is pinned). `?includeBrain=true` keeps the brain visible for
    //     management surfaces (the Jutsu grid) without lifting the cap.
    const senseiOnly = searchParams.get('senseiOnly') === 'true';
    const includeBrain = senseiOnly || searchParams.get('includeBrain') === 'true';

    let models = await storage.getModelConfigs();

    // Apply filters
    if (provider) {
      models = models.filter(m => m.provider === provider);
    }

    if (enabled !== null) {
      const isEnabled = enabled === 'true';
      models = models.filter(m => m.enabled === isEnabled);
    }

    // E4.S6 (F-7-026 P2 / F-7-005 P1): server-side cap at 40B parameters.
    // Excludes oversize models (e.g. qwen3.5:122b) that violate the operating
    // policy and cannot be safely run on the local appliance. The Sensei
    // brain is EXEMPT from this cap — `?senseiOnly=true` skips the filter.
    if (!senseiOnly) {
      models = models.filter(isWithinSizeCap);
    }

    // Sensei Rework (Pillar B) — hide the Sensei brain from target lists
    // unless the caller explicitly opted in (Sensei picker / management).
    if (!includeBrain) {
      models = excludeSenseiBrain(models);
    }

    // S-01: Redact API keys before returning (CRITICAL — keys were exposed to LAN).
    // TICKET-G3-API-JUTSU: attach server-computed AIVSS score per row
    // alongside the safe-shape redaction so the host can render real
    // `<AivssPill>` chips instead of band='none' placeholders.
    const safeModels = models.map(withAivss);

    return NextResponse.json(safeModels);
  } catch (error) {
    return apiError('Failed to list models', 500, error);
  }
  },
  { role: 'admin' },
);

// ===========================================================================
// POST /api/llm/models - Create a new model
// ===========================================================================

export const POST = withAuth(
  async (request: NextRequest) => {
  if (isDemoMode()) return demoModelsPost(request);

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

    void auditLog.modelConfigChange({
      endpoint: '/api/llm/models',
      user: 'admin',
      modelId: saved.id,
      operation: 'create',
    });

    // Redact API key from response — wrap in { model } to match frontend expectations (BUG-002).
    // Architect MED-1 fix — apply `withAivss` on POST too so the response
    // shape stays uniform with GET (extra `aivss` field).
    return NextResponse.json({ model: withAivss(saved) }, { status: 201 });
  } catch (error) {
    return apiError('Failed to create model', 500, error);
  }
  },
  { role: 'admin' },
);

// ===========================================================================
// DELETE /api/llm/models - Delete a model
// ===========================================================================

export const DELETE = withAuth(
  async (request: NextRequest) => {
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

    void auditLog.modelConfigChange({
      endpoint: '/api/llm/models',
      user: 'admin',
      modelId: id,
      operation: 'delete',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError('Failed to delete model', 500, error);
  }
  },
  { role: 'admin' },
);

// ===========================================================================
// PATCH /api/llm/models - Update a model
// ===========================================================================

export const PATCH = withAuth(
  async (request: NextRequest) => {
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

    void auditLog.modelConfigChange({
      endpoint: '/api/llm/models',
      user: 'admin',
      modelId: saved.id,
      operation: 'enabled' in patch ? 'toggle' : 'update',
    });

    // Redact API key from response — wrap in { model } to match frontend expectations (BUG-002).
    // Architect MED-1 fix — apply `withAivss` on PATCH too so the response
    // shape stays uniform with GET (extra `aivss` field).
    return NextResponse.json({ model: withAivss(saved) });
  } catch (error) {
    return apiError('Failed to update model', 500, error);
  }
  },
  { role: 'admin' },
);
