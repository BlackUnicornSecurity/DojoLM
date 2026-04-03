/**
 * IKIGAI Phase 1.4: Sensei-as-a-Service API Types
 * Request/response schemas for the Sensei API layer.
 *
 * Users can route requests to:
 * 1. Built-in Sensei model (local or remote)
 * 2. Their own Ollama instance (any model)
 * 3. Any OpenAI-compatible endpoint (custom)
 */

import type { LLMProvider } from '../llm/types.js';
import type { TemporalAttackType } from '../timechamber/types.js';

// ---------------------------------------------------------------------------
// Provider Routing
// ---------------------------------------------------------------------------

/** How the user wants to route the Sensei API call */
export const ROUTING_MODES = ['sensei', 'ollama', 'custom'] as const;
export type RoutingMode = (typeof ROUTING_MODES)[number];

/** Configuration for routing to user's own LLM */
export interface ProviderRouting {
  readonly mode: RoutingMode;
  /** Base URL for the LLM API (required for ollama/custom) */
  readonly baseUrl?: string;
  /** Model name to use (required for ollama/custom) */
  readonly modelName?: string;
  /** API key (optional, required for some custom providers) */
  readonly apiKey?: string;
  /** Provider type for custom routing */
  readonly provider?: LLMProvider;
}

export const DEFAULT_ROUTING: Readonly<ProviderRouting> = Object.freeze({
  mode: 'sensei',
});

// ---------------------------------------------------------------------------
// API Request Types
// ---------------------------------------------------------------------------

/** Generate attack payloads */
export interface SenseiGenerateRequest {
  readonly category: string;
  readonly count: number;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL' | null;
  readonly context: string | null;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly routing: ProviderRouting;
}

/** Mutate an existing attack */
export interface SenseiMutateRequest {
  readonly content: string;
  readonly category: string;
  readonly routing: ProviderRouting;
}

/** Judge an attack response */
export interface SenseiJudgeRequest {
  readonly attackPayload: string;
  readonly modelResponse: string;
  readonly category: string;
  readonly expectedBehavior: string | null;
  readonly routing: ProviderRouting;
}

/** Generate a conversation plan */
export interface SenseiPlanRequest {
  readonly attackType: TemporalAttackType;
  readonly targetDescription: string;
  readonly maxTurns: number;
  readonly context: string | null;
  readonly routing: ProviderRouting;
}

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------

/** Wrapper for all API responses */
export interface SenseiApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly meta: {
    readonly elapsed: number;
    readonly tokensUsed: number;
    readonly routingMode: RoutingMode;
    readonly model: string;
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Validation error */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
}

/** Max values for API requests */
export const API_LIMITS = {
  maxCount: 50,
  maxTokens: 8192,
  maxTurns: 50,
  maxContentLength: 10_000,
  maxCategoryLength: 100,
  maxContextLength: 5_000,
  maxPayloadLength: 10_000,
  maxResponseLength: 10_000,
  maxTargetDescLength: 1_000,
  minTemperature: 0,
  maxTemperature: 2,
} as const;
