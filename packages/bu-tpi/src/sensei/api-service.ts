/**
 * IKIGAI Phase 1.4: Sensei API Service
 * Orchestrates Sensei capabilities with provider routing.
 *
 * Users can route to:
 * 1. Built-in Sensei model (local/remote)
 * 2. Their own Ollama instance
 * 3. Any OpenAI-compatible endpoint
 */

import type { LLMProviderAdapter, LLMModelConfig } from '../llm/types.js';
import type {
  SenseiGenerateRequest,
  SenseiMutateRequest,
  SenseiJudgeRequest,
  SenseiPlanRequest,
  SenseiApiResponse,
  ProviderRouting,
  ValidationError,
} from './api-types.js';
import { API_LIMITS, ROUTING_MODES } from './api-types.js';
import type { GenerationResult } from './attack-generator.js';
import type { MutationAdvisoryResult } from './mutation-advisor.js';
import type { JudgeResult } from './judge.js';
import type { PlanGenerationResult } from './plan-generator.js';
import { generateAttacks, createDefaultRequest } from './attack-generator.js';
import { adviseMutations } from './mutation-advisor.js';
import { judgeAttack } from './judge.js';
import { generatePlan, isValidAttackType } from './plan-generator.js';
import { TEMPORAL_ATTACK_TYPES } from '../timechamber/types.js';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Validate a routing configuration */
export function validateRouting(routing: ProviderRouting): readonly ValidationError[] {
  const errors: ValidationError[] = [];

  if (!ROUTING_MODES.includes(routing.mode as typeof ROUTING_MODES[number])) {
    errors.push({ field: 'routing.mode', message: `Invalid mode. Must be one of: ${ROUTING_MODES.join(', ')}` });
  }

  if (routing.mode === 'ollama' || routing.mode === 'custom') {
    if (!routing.baseUrl) {
      errors.push({ field: 'routing.baseUrl', message: 'Base URL is required for ollama/custom routing' });
    }
    if (!routing.modelName) {
      errors.push({ field: 'routing.modelName', message: 'Model name is required for ollama/custom routing' });
    }
  }

  if (routing.baseUrl) {
    try {
      const url = new URL(routing.baseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push({ field: 'routing.baseUrl', message: 'Base URL must use http or https protocol' });
      }
    } catch {
      errors.push({ field: 'routing.baseUrl', message: 'Invalid base URL format' });
    }
  }

  return errors;
}

/** Validate a generate request */
export function validateGenerateRequest(req: SenseiGenerateRequest): readonly ValidationError[] {
  const errors: ValidationError[] = [];

  if (!req.category?.trim() || req.category.length > API_LIMITS.maxCategoryLength) {
    errors.push({ field: 'category', message: `Category is required and must be under ${API_LIMITS.maxCategoryLength} chars` });
  }
  if (req.count < 1 || req.count > API_LIMITS.maxCount) {
    errors.push({ field: 'count', message: `Count must be between 1 and ${API_LIMITS.maxCount}` });
  }
  if (req.temperature < API_LIMITS.minTemperature || req.temperature > API_LIMITS.maxTemperature) {
    errors.push({ field: 'temperature', message: `Temperature must be between ${API_LIMITS.minTemperature} and ${API_LIMITS.maxTemperature}` });
  }
  if (req.maxTokens < 1 || req.maxTokens > API_LIMITS.maxTokens) {
    errors.push({ field: 'maxTokens', message: `Max tokens must be between 1 and ${API_LIMITS.maxTokens}` });
  }
  if (req.context && req.context.length > API_LIMITS.maxContextLength) {
    errors.push({ field: 'context', message: `Context must be under ${API_LIMITS.maxContextLength} chars` });
  }

  errors.push(...validateRouting(req.routing));
  return errors;
}

/** Validate a mutate request */
export function validateMutateRequest(req: SenseiMutateRequest): readonly ValidationError[] {
  const errors: ValidationError[] = [];

  if (!req.content?.trim() || req.content.length > API_LIMITS.maxContentLength) {
    errors.push({ field: 'content', message: `Content is required and must be under ${API_LIMITS.maxContentLength} chars` });
  }
  if (!req.category?.trim() || req.category.length > API_LIMITS.maxCategoryLength) {
    errors.push({ field: 'category', message: `Category is required and must be under ${API_LIMITS.maxCategoryLength} chars` });
  }

  errors.push(...validateRouting(req.routing));
  return errors;
}

/** Validate a judge request */
export function validateJudgeRequest(req: SenseiJudgeRequest): readonly ValidationError[] {
  const errors: ValidationError[] = [];

  if (!req.attackPayload?.trim() || req.attackPayload.length > API_LIMITS.maxPayloadLength) {
    errors.push({ field: 'attackPayload', message: `Attack payload is required and must be under ${API_LIMITS.maxPayloadLength} chars` });
  }
  if (!req.modelResponse?.trim() || req.modelResponse.length > API_LIMITS.maxResponseLength) {
    errors.push({ field: 'modelResponse', message: `Model response is required and must be under ${API_LIMITS.maxResponseLength} chars` });
  }
  if (!req.category?.trim() || req.category.length > API_LIMITS.maxCategoryLength) {
    errors.push({ field: 'category', message: `Category is required and must be under ${API_LIMITS.maxCategoryLength} chars` });
  }

  errors.push(...validateRouting(req.routing));
  return errors;
}

/** Validate a plan request */
export function validatePlanRequest(req: SenseiPlanRequest): readonly ValidationError[] {
  const errors: ValidationError[] = [];

  if (!req.attackType || !isValidAttackType(req.attackType)) {
    errors.push({ field: 'attackType', message: `Invalid attack type. Must be one of: ${TEMPORAL_ATTACK_TYPES.join(', ')}` });
  }
  if (!req.targetDescription?.trim() || req.targetDescription.length > API_LIMITS.maxTargetDescLength) {
    errors.push({ field: 'targetDescription', message: `Target description is required and must be under ${API_LIMITS.maxTargetDescLength} chars` });
  }
  if (req.maxTurns < 1 || req.maxTurns > API_LIMITS.maxTurns) {
    errors.push({ field: 'maxTurns', message: `Max turns must be between 1 and ${API_LIMITS.maxTurns}` });
  }

  errors.push(...validateRouting(req.routing));
  return errors;
}

// ---------------------------------------------------------------------------
// Model Config Builder
// ---------------------------------------------------------------------------

/** Build an LLMModelConfig from routing configuration */
export function buildModelConfig(routing: ProviderRouting): LLMModelConfig {
  const now = new Date().toISOString();

  if (routing.mode === 'ollama') {
    return {
      id: 'sensei-ollama',
      name: `Ollama: ${routing.modelName ?? 'default'}`,
      provider: 'ollama',
      model: routing.modelName ?? 'llama3.1',
      baseUrl: routing.baseUrl ?? 'http://localhost:11434/v1',
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  if (routing.mode === 'custom') {
    return {
      id: 'sensei-custom',
      name: `Custom: ${routing.modelName ?? 'default'}`,
      provider: routing.provider ?? 'custom',
      model: routing.modelName ?? 'default',
      baseUrl: routing.baseUrl,
      apiKey: routing.apiKey,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  // Default: built-in Sensei
  return {
    id: 'sensei-builtin',
    name: 'Sensei Built-in',
    provider: 'sensei',
    model: 'sensei-v1',
    baseUrl: routing.baseUrl ?? 'http://localhost:11434/v1',
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build error meta without constructing a model config */
function errorMeta(startTime: number, routing: ProviderRouting) {
  return {
    elapsed: performance.now() - startTime,
    tokensUsed: 0,
    routingMode: routing.mode,
    model: routing.modelName ?? 'unknown',
  } as const;
}

// ---------------------------------------------------------------------------
// Service Functions — validate FIRST, then build config
// ---------------------------------------------------------------------------

/** Execute a generate request through the full pipeline */
export async function executeGenerate(
  adapter: LLMProviderAdapter,
  request: SenseiGenerateRequest,
): Promise<SenseiApiResponse<GenerationResult>> {
  const startTime = performance.now();

  const validationErrors = validateGenerateRequest(request);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: validationErrors.map((e) => `${e.field}: ${e.message}`).join('; '),
      meta: errorMeta(startTime, request.routing),
    };
  }

  const config = buildModelConfig(request.routing);

  try {
    const result = await generateAttacks(adapter, config, createDefaultRequest(request.category, {
      count: request.count,
      severity: request.severity,
      context: request.context,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    }));

    return {
      success: true,
      data: result,
      meta: { elapsed: result.elapsed, tokensUsed: result.tokensUsed, routingMode: request.routing.mode, model: config.model },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: message,
      meta: errorMeta(startTime, request.routing),
    };
  }
}

/** Execute a mutate request */
export async function executeMutate(
  adapter: LLMProviderAdapter,
  request: SenseiMutateRequest,
): Promise<SenseiApiResponse<MutationAdvisoryResult>> {
  const startTime = performance.now();

  const validationErrors = validateMutateRequest(request);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: validationErrors.map((e) => `${e.field}: ${e.message}`).join('; '),
      meta: errorMeta(startTime, request.routing),
    };
  }

  const config = buildModelConfig(request.routing);

  try {
    const result = await adviseMutations(adapter, config, request.content, request.category);
    return {
      success: true,
      data: result,
      meta: { elapsed: result.elapsed, tokensUsed: result.tokensUsed, routingMode: request.routing.mode, model: config.model },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: message,
      meta: errorMeta(startTime, request.routing),
    };
  }
}

/** Execute a judge request */
export async function executeJudge(
  adapter: LLMProviderAdapter,
  request: SenseiJudgeRequest,
): Promise<SenseiApiResponse<JudgeResult>> {
  const startTime = performance.now();

  const validationErrors = validateJudgeRequest(request);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: validationErrors.map((e) => `${e.field}: ${e.message}`).join('; '),
      meta: errorMeta(startTime, request.routing),
    };
  }

  const config = buildModelConfig(request.routing);

  try {
    const result = await judgeAttack(adapter, config, {
      attackPayload: request.attackPayload,
      modelResponse: request.modelResponse,
      category: request.category,
      expectedBehavior: request.expectedBehavior,
    });
    return {
      success: true,
      data: result,
      meta: { elapsed: result.elapsed, tokensUsed: result.tokensUsed, routingMode: request.routing.mode, model: config.model },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: message,
      meta: errorMeta(startTime, request.routing),
    };
  }
}

/** Execute a plan generation request */
export async function executePlan(
  adapter: LLMProviderAdapter,
  request: SenseiPlanRequest,
): Promise<SenseiApiResponse<PlanGenerationResult>> {
  const startTime = performance.now();

  const validationErrors = validatePlanRequest(request);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: validationErrors.map((e) => `${e.field}: ${e.message}`).join('; '),
      meta: errorMeta(startTime, request.routing),
    };
  }

  const config = buildModelConfig(request.routing);

  try {
    const result = await generatePlan(adapter, config, {
      attackType: request.attackType,
      targetDescription: request.targetDescription,
      maxTurns: request.maxTurns,
      context: request.context,
    });
    return {
      success: true,
      data: result,
      meta: { elapsed: result.elapsed, tokensUsed: result.tokensUsed, routingMode: request.routing.mode, model: config.model },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: message,
      meta: errorMeta(startTime, request.routing),
    };
  }
}
