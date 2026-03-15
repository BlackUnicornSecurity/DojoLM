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
