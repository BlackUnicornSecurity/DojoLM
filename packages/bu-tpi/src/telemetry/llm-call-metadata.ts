// SPDX-License-Identifier: Apache-2.0
/**
 * LLMCallMetadata — envelope carried by every event that represents an
 * LLM call (Gap 8+ Amendment §3.2).
 *
 * Tokens + cost + vendor/model/tier are the minimum fields required to
 * power downstream commercial products (DRI, Intel Feed, Drift Alerts).
 *
 * @monetizes DRI, DriftAlerts, IntelFeed
 * @since schema_v 1
 */

import { z } from 'zod';

/** Known LLM vendors; 'other' catches unaffiliated / bespoke models. */
export type LLMVendor =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'meta'
  | 'mistral'
  | 'cohere'
  | 'openrouter'
  | 'local'
  | 'other';

/** Capability tier for DRI grouping. */
export type LLMTier = 'bronze' | 'silver' | 'frontier';

/** Minimum metadata captured on every LLM-call event. */
export interface LLMCallMetadata {
  readonly targetVendor: LLMVendor;
  readonly targetModel: string;
  readonly targetVersionHash?: string;
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly costCents: number;
  readonly tier: LLMTier;
}

/**
 * Zod schema for LLMCallMetadata.
 * Non-negative integer tokens + non-negative cost are hard invariants.
 */
export const llmCallMetadataSchema = z.object({
  targetVendor: z.enum([
    'anthropic',
    'openai',
    'google',
    'meta',
    'mistral',
    'cohere',
    'openrouter',
    'local',
    'other',
  ]),
  targetModel: z.string().min(1),
  targetVersionHash: z.string().min(1).optional(),
  tokensIn: z.number().int().nonnegative(),
  tokensOut: z.number().int().nonnegative(),
  costCents: z.number().nonnegative(),
  tier: z.enum(['bronze', 'silver', 'frontier']),
}) satisfies z.ZodType<LLMCallMetadata>;

/**
 * Spreadable shape for composition into event schemas via `.extend()`.
 * Usage: `baseSchema.extend({ ...llmCallMetadataShape, type: z.literal(...) })`
 */
export const llmCallMetadataShape = llmCallMetadataSchema.shape;
