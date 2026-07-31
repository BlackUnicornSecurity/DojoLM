// SPDX-License-Identifier: Apache-2.0
/**
 * Typed event schemas for the DojoLM telemetry stream (Gap 8).
 *
 * Zod schemas serve as the validation gate: any event that carries raw
 * payload strings (attackerPayload, targetResponse, seedPayload) must be
 * redacted before it reaches this layer — the schemas enforce that by
 * only accepting RedactedPayload shapes for those fields (R-T1).
 *
 * Phase 0 ships admin/control events + key operational events for the
 * modules introduced in PRs 1–4.  Industry-tool and arena events are
 * stubs; full schemas land when those modules ship.
 */

import { z } from 'zod';
import { llmCallMetadataShape } from './llm-call-metadata.js';
import type { BaseEvent, RedactedPayload } from './types.js';

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

const redactedPayloadSchema = z.object({
  hash: z.string().min(1),
  len: z.number().int().nonnegative(),
}) satisfies z.ZodType<RedactedPayload>;

/**
 * BaseEvent Zod schema — carries the commercial primitives added in
 * Gap 8+ Amendment §3.1 (schemaV, installId, installToken, buildChannel,
 * sdkVersion) plus the optional `tenantId`.
 *
 * Cross-field rule (tenantId required on non-community builds) is
 * enforced at the `dojoEventSchema` union level via `.superRefine`.
 */
const baseSchema = z.object({
  id: z.string().uuid(),
  ts: z.string().datetime(),
  source: z.enum([
    'sensei', 'atemi', 'amaterasu', 'kumite', 'onigaeshi',
    'kotoba', 'kokugikan', 'bushido', 'admin', 'rbac',
    'scanner', 'industry_tools', 'arena',
  ]),
  schemaV: z.literal(1),
  installId: z.string().min(1),
  installToken: z.string().min(1),
  tenantId: z.string().min(1).optional(),
  buildChannel: z.enum(['community', 'team', 'enterprise', 'sovereign']),
  sdkVersion: z.string().min(1),
}) satisfies z.ZodType<Omit<BaseEvent, 'type'>>;

// ---------------------------------------------------------------------------
// Admin / control events
// ---------------------------------------------------------------------------

export const flagToggledSchema = baseSchema.extend({
  type: z.literal('flag.toggled'),
  source: z.literal('admin'),
  flagName: z.string().min(1),
  previous: z.boolean(),
  next: z.boolean(),
  actor: z.string(),
});
export type FlagToggledEvent = z.infer<typeof flagToggledSchema>;

export const killswitchTriggeredSchema = baseSchema.extend({
  type: z.literal('killswitch.triggered'),
  source: z.literal('admin'),
  signal: z.string().min(1),
  reason: z.string(),
  actor: z.string(),
});
export type KillswitchTriggeredEvent = z.infer<typeof killswitchTriggeredSchema>;

export const rbacDeniedSchema = baseSchema.extend({
  type: z.literal('rbac.denied'),
  source: z.literal('rbac'),
  userId: z.string(),
  requiredRole: z.string(),
  actualRoles: z.array(z.string()),
  resource: z.string(),
});
export type RbacDeniedEvent = z.infer<typeof rbacDeniedSchema>;

// ---------------------------------------------------------------------------
// Sensei events
// ---------------------------------------------------------------------------

export const senseiBudgetDecisionSchema = baseSchema.extend({
  type: z.literal('sensei.budget.decision'),
  source: z.literal('sensei'),
  engagementId: z.string(),
  approved: z.boolean(),
  requestedCredits: z.number(),
  remainingCredits: z.number(),
});
export type SenseiBudgetDecisionEvent = z.infer<typeof senseiBudgetDecisionSchema>;

/**
 * Emitted on every Sensei Hydra turn. Carries LLMCallMetadata per
 * Amendment §3.2 — target vendor/model, token counts, cost, tier.
 *
 * @monetizes DRI, DriftAlerts
 * @tier 1
 * @since schema_v 1
 */
export const senseiHydraTurnSchema = baseSchema.extend({
  ...llmCallMetadataShape,
  type: z.literal('sensei.hydra.turn'),
  source: z.literal('sensei'),
  engagementId: z.string(),
  turnIndex: z.number().int().nonnegative(),
  /** R-T1: raw payload must be redacted before emitting. */
  attackerPayload: redactedPayloadSchema,
  targetResponse: redactedPayloadSchema,
  refusalClass: z.string().optional(),
  mutationStrategy: z.string().optional(),
});
export type SenseiHydraTurnEvent = z.infer<typeof senseiHydraTurnSchema>;

export const senseiHydraBreakthroughSchema = baseSchema.extend({
  type: z.literal('sensei.hydra.breakthrough'),
  source: z.literal('sensei'),
  engagementId: z.string(),
  turnsRequired: z.number().int().positive(),
  attackerPayload: redactedPayloadSchema,
});
export type SenseiHydraBreakthroughEvent = z.infer<typeof senseiHydraBreakthroughSchema>;

/**
 * Emitted when `selectAttackerModel` resolves a Sensei tier. Carries
 * both the requested and resolved tiers so drift (auto-degrade under
 * budget pressure) is observable. (Gap 1 / Issue #139.)
 *
 * @monetizes DriftAlerts
 * @tier 1
 * @since schema_v 1
 */
export const senseiTierCallSchema = baseSchema.extend({
  type: z.literal('sensei.tier.call'),
  source: z.literal('sensei'),
  userId: z.string().min(1),
  requestedTier: z.enum(['frontier', 'silver', 'bronze']),
  resolvedTier: z.enum(['frontier', 'silver', 'bronze']).nullable(),
  degraded: z.boolean(),
  approved: z.boolean(),
  degradationReason: z.literal('budget_exhausted').optional(),
  creditsCharged: z.number().nonnegative(),
});
export type SenseiTierCallEvent = z.infer<typeof senseiTierCallSchema>;

export const senseiHydraBudgetAbortSchema = baseSchema.extend({
  type: z.literal('sensei.hydra.budget_abort'),
  source: z.literal('sensei'),
  engagementId: z.string(),
  turnsRun: z.number().int().nonnegative(),
  creditsConsumed: z.number(),
});
export type SenseiHydraBudgetAbortEvent = z.infer<typeof senseiHydraBudgetAbortSchema>;

/**
 * Emitted when the refusal-aware runner halts on convergence
 * (Gap 4, PR-140d). Carries the observed window size and minimum
 * pairwise similarity so downstream drift alerts can reason about
 * how tightly the target is refusing.
 *
 * @monetizes DRI, DriftAlerts
 * @tier 1
 * @since schema_v 1
 */
export const senseiHydraConvergedSchema = baseSchema.extend({
  type: z.literal('sensei.hydra.converged'),
  source: z.literal('sensei'),
  engagementId: z.string(),
  turnsRun: z.number().int().nonnegative(),
  creditsConsumed: z.number().nonnegative(),
  windowSize: z.number().int().min(2),
  minPairwiseSimilarity: z.number().min(0).max(1),
  similarityThreshold: z.number().min(0).max(1),
});
export type SenseiHydraConvergedEvent = z.infer<typeof senseiHydraConvergedSchema>;

// ---------------------------------------------------------------------------
// Kumite events
// ---------------------------------------------------------------------------

/**
 * Per-turn event emitted during a Gap 5 long-form match.
 *
 * Tier-1 ride-along (G-1b) per ROADMAP-v1 §4 Phase C + Gap 8+ Amendment §3.5.
 * Carries LLMCallMetadata for the target call on this turn.
 *
 * @monetizes DRI, DriftAlerts, IntelFeed
 * @tier 1
 * @since schema_v 1
 */
export const kumiteMatchTurnSchema = baseSchema.extend({
  ...llmCallMetadataShape,
  type: z.literal('kumite.match.turn'),
  source: z.literal('kumite'),
  matchId: z.string(),
  turnIndex: z.number().int().nonnegative(),
  /** R-T1: raw payload must be redacted before emitting. */
  attackerPayload: redactedPayloadSchema,
  targetResponse: redactedPayloadSchema,
  refusalDetected: z.boolean(),
  mutationStrategy: z.string().optional(),
  mode: z.enum(['static', 'refusal-driven']),
});
export type KumiteMatchTurnEvent = z.infer<typeof kumiteMatchTurnSchema>;

// ---------------------------------------------------------------------------
// Atemi events
// ---------------------------------------------------------------------------

export const atemiKillswitchHonoredSchema = baseSchema.extend({
  type: z.literal('atemi.killswitch.honored'),
  source: z.literal('atemi'),
  probeId: z.string(),
  signal: z.string(),
});
export type AtemiKillswitchHonoredEvent = z.infer<typeof atemiKillswitchHonoredSchema>;

// ---------------------------------------------------------------------------
// Kotoba events
// ---------------------------------------------------------------------------

export const kotobaDialectRankedSchema = baseSchema.extend({
  type: z.literal('kotoba.dialect.ranked'),
  source: z.literal('kotoba'),
  dialectId: z.string(),
  targetModel: z.string(),
  score: z.number().min(0).max(1),
  /** R-T1: raw dialect payload must be redacted. */
  payload: redactedPayloadSchema,
});
export type KotobaDialectRankedEvent = z.infer<typeof kotobaDialectRankedSchema>;

/**
 * Gap 7 — emitted every time `applyDialect` produces an encoded payload.
 * Carries only size + dialect metadata (no payload content, per R-T1).
 */
export const kotobaDialectAppliedSchema = baseSchema.extend({
  type: z.literal('kotoba.dialect.applied'),
  source: z.literal('kotoba'),
  dialectId: z.string().min(1),
  intensity: z.number().min(0).max(1),
  inputLength: z.number().int().nonnegative(),
  outputLength: z.number().int().nonnegative(),
});
export type KotobaDialectAppliedEvent = z.infer<typeof kotobaDialectAppliedSchema>;

// ---------------------------------------------------------------------------
// Industry-tools events (Phase 0 stubs — full schemas in Phase E)
// ---------------------------------------------------------------------------

export const l1b3rt4sRoutedSchema = baseSchema.extend({
  type: z.literal('industry_tools.l1b3rt4s.routed'),
  source: z.literal('industry_tools'),
  targetModel: z.string(),
  bucket: z.string(),
  jailbreakHash: z.string(),
});
export type L1b3rt4sRoutedEvent = z.infer<typeof l1b3rt4sRoutedSchema>;

/**
 * Emitted when `routeByModel` could not classify an L1B3RT4S entry and
 * it fell through to the `unknown/` bucket. Ops use this to grow the
 * heuristic table in `model-router.ts`.
 */
export const l1b3rt4sUnknownModelSchema = baseSchema.extend({
  type: z.literal('industry_tools.l1b3rt4s.unknown_model'),
  source: z.literal('industry_tools'),
  jailbreakHash: z.string(),
  sourceId: z.string(),
  sampleLabel: z.string().optional(),
});
export type L1b3rt4sUnknownModelEvent = z.infer<typeof l1b3rt4sUnknownModelSchema>;

export const cl4r1t4sIngestedSchema = baseSchema.extend({
  type: z.literal('industry_tools.cl4r1t4s.ingested'),
  source: z.literal('industry_tools'),
  promptHash: z.string(),
  targetModel: z.string(),
  source_url: z.string().url().optional(),
});
export type Cl4r1t4sIngestedEvent = z.infer<typeof cl4r1t4sIngestedSchema>;

/**
 * Gap 11.3 — emitted on every `auditSt3ggCoverage` run. Carries aggregate
 * category counts only; per-category details live in the persisted
 * coverage-report.json (not in the bus).
 */
export const st3ggCoverageAuditSchema = baseSchema.extend({
  type: z.literal('industry_tools.st3gg.coverage_audit'),
  source: z.literal('industry_tools'),
  categoryCount: z.number().int().nonnegative(),
  mismatchCount: z.number().int().nonnegative(),
  missingCount: z.number().int().nonnegative(),
  partialCount: z.number().int().nonnegative(),
});
export type St3ggCoverageAuditEvent = z.infer<typeof st3ggCoverageAuditSchema>;

/**
 * Gap 11.3 — emitted when a Gap 7 dialect generator is auto-invoked to
 * backfill a `missing`/`partial` ST3GG category. The payload is always
 * a category id, never raw generated content (R-T1 — redaction is the
 * dialect generator's responsibility, not this telemetry layer's).
 */
export const kotobaDialectSt3ggBackfillSchema = baseSchema.extend({
  type: z.literal('kotoba.dialect.st3gg_backfill'),
  source: z.literal('kotoba'),
  categoryId: z.string().min(1),
  dialectId: z.string().min(1),
  fixturesGenerated: z.number().int().nonnegative(),
});
export type KotobaDialectSt3ggBackfillEvent = z.infer<typeof kotobaDialectSt3ggBackfillSchema>;

// ---------------------------------------------------------------------------
// Amaterasu community-feed events (Gap 2 — plan §Gap 2 lines 339–341)
// ---------------------------------------------------------------------------

/**
 * Emitted at the end of a `syncLiberatorFeed` run. Carries per-source
 * counters so ops dashboards can flag anomalies (size spikes, refusal
 * climbs, quarantine rate).
 *
 * @monetizes IntelFeed
 * @tier 1
 * @since schema_v 1
 */
export const amaterasuFeedSyncSchema = baseSchema.extend({
  type: z.literal('amaterasu.feed.sync'),
  source: z.literal('amaterasu'),
  sourceId: z.string().min(1),
  batchId: z.string().min(1),
  upstreamCommit: z.string().nullable(),
  fetched: z.number().int().nonnegative(),
  accepted: z.number().int().nonnegative(),
  deduped: z.number().int().nonnegative(),
  quarantined: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
});
export type AmaterasuFeedSyncEvent = z.infer<typeof amaterasuFeedSyncSchema>;

/**
 * Emitted whenever the per-batch anomaly detector (size ≥ 3× baseline OR
 * unknown-category ratio > 10 %) auto-quarantines a pending batch.
 */
export const amaterasuBatchQuarantinedSchema = baseSchema.extend({
  type: z.literal('amaterasu.batch.quarantined'),
  source: z.literal('amaterasu'),
  sourceId: z.string().min(1),
  batchId: z.string().min(1),
  reason: z.enum(['size-spike', 'unknown-category-ratio', 'sanitizer-findings', 'manual']),
  metric: z.number().nonnegative(),
  threshold: z.number().nonnegative(),
});
export type AmaterasuBatchQuarantinedEvent = z.infer<typeof amaterasuBatchQuarantinedSchema>;

/**
 * Emitted on admin-triggered rollback of a previously accepted batch.
 * Idempotent — repeat calls still emit but carry `removed: 0`.
 */
export const amaterasuRollbackExecutedSchema = baseSchema.extend({
  type: z.literal('amaterasu.rollback.executed'),
  source: z.literal('amaterasu'),
  batchId: z.string().min(1),
  removed: z.number().int().nonnegative(),
  actor: z.string().min(1),
});
export type AmaterasuRollbackExecutedEvent = z.infer<typeof amaterasuRollbackExecutedSchema>;

// ---------------------------------------------------------------------------
// DojoEvent discriminated union
// ---------------------------------------------------------------------------

/**
 * Cross-field invariant: `tenantId` is required on non-community builds.
 * Community uploads flow anonymously; paid tiers carry a tenant.
 * Applied as a union-level refinement so it fires after discrimination.
 */
const tenantIdRequiredOnPaidChannels = <T extends { buildChannel: string; tenantId?: string }>(
  data: T,
  ctx: z.RefinementCtx,
): void => {
  if (data.buildChannel !== 'community' && !data.tenantId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tenantId'],
      message: `tenantId is required for buildChannel="${data.buildChannel}"`,
    });
  }
};

export const dojoEventSchema = z
  .discriminatedUnion('type', [
    flagToggledSchema,
    killswitchTriggeredSchema,
    rbacDeniedSchema,
    senseiBudgetDecisionSchema,
    senseiTierCallSchema,
    senseiHydraTurnSchema,
    senseiHydraBreakthroughSchema,
    senseiHydraBudgetAbortSchema,
    senseiHydraConvergedSchema,
    kumiteMatchTurnSchema,
    atemiKillswitchHonoredSchema,
    kotobaDialectRankedSchema,
    kotobaDialectAppliedSchema,
    l1b3rt4sRoutedSchema,
    l1b3rt4sUnknownModelSchema,
    cl4r1t4sIngestedSchema,
    st3ggCoverageAuditSchema,
    kotobaDialectSt3ggBackfillSchema,
    amaterasuFeedSyncSchema,
    amaterasuBatchQuarantinedSchema,
    amaterasuRollbackExecutedSchema,
  ])
  .superRefine(tenantIdRequiredOnPaidChannels);

export type DojoEvent =
  | FlagToggledEvent
  | KillswitchTriggeredEvent
  | RbacDeniedEvent
  | SenseiBudgetDecisionEvent
  | SenseiTierCallEvent
  | SenseiHydraTurnEvent
  | SenseiHydraBreakthroughEvent
  | SenseiHydraBudgetAbortEvent
  | SenseiHydraConvergedEvent
  | KumiteMatchTurnEvent
  | AtemiKillswitchHonoredEvent
  | KotobaDialectRankedEvent
  | KotobaDialectAppliedEvent
  | L1b3rt4sRoutedEvent
  | L1b3rt4sUnknownModelEvent
  | Cl4r1t4sIngestedEvent
  | St3ggCoverageAuditEvent
  | KotobaDialectSt3ggBackfillEvent
  | AmaterasuFeedSyncEvent
  | AmaterasuBatchQuarantinedEvent
  | AmaterasuRollbackExecutedEvent;
