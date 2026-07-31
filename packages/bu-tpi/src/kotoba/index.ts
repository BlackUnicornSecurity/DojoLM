// SPDX-License-Identifier: Apache-2.0
/**
 * H19: Kotoba — Prompt Optimizer
 * Barrel export for all Kotoba modules.
 */

// ===========================================================================
// Types
// ===========================================================================

export type {
  ScoreCategory,
  LetterGrade,
  PromptAnalysis,
  PromptIssue,
  HardeningRule,
  HardeningLevel,
  PromptVariant,
} from './types.js';

export {
  SCORE_CATEGORIES,
  MAX_INPUT_LENGTH,
  MIN_SCORE_A,
  MIN_SCORE_B,
  MIN_SCORE_C,
  MIN_SCORE_D,
} from './types.js';

// ===========================================================================
// Scorer
// ===========================================================================

export { scorePrompt, getLetterGrade } from './scorer.js';

// ===========================================================================
// Rules
// ===========================================================================

export {
  getAllRules,
  getRulesByCategory,
  getRuleCount,
  BOUNDARY_RULES,
  PRIORITY_RULES,
  ROLE_RULES,
  OUTPUT_RULES,
  DEFENSE_RULES,
} from './rules/index.js';

// ===========================================================================
// Generator
// ===========================================================================

export { generateVariants } from './generator.js';

// ===========================================================================
// Gap 7 — Encoded-payload dialect library (separate surface from H19 optimizer)
// ===========================================================================

export type {
  KotobaDialect,
  DialectIntensity,
  DialectGenerator,
  DialectJudge,
  DialectRanking,
  DialectAppliedTelemetry,
  DialectRankedTelemetry,
  DialectSt3ggBackfillTelemetry,
  TargetSignature,
} from './dialect-types.js';

export {
  KOTOBA_DIALECTS,
  MAX_DIALECT_INPUT_LENGTH,
  clampIntensity,
} from './dialect-types.js';

export {
  applyDialect,
  rankDialects,
  listDialects,
  DIALECT_REGISTRY,
} from './dialect-api.js';

export type { ApplyDialectOptions, RankDialectsOptions } from './dialect-api.js';

export {
  deterministicJudge,
  scoreDialectDeterministic,
} from './dialect-scorer.js';

export { getDialect, isKotobaDialect } from './dialects/index.js';

export {
  backfillSt3ggCategories,
  pickDialectForCategory,
  safeFilename,
  assertInsideRoot,
} from './dialect-fixtures.js';
export type { BackfillOptions, BackfillResult } from './dialect-fixtures.js';
