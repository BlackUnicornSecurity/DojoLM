/**
 * H22: Hattori Guard Forge Defense
 * Barrel export for defense modules.
 */

// ===========================================================================
// Types
// ===========================================================================

export type {
  DefenseTemplate,
  DefenseRecommendation,
  PromptWeakness,
  HardenedPrompt,
} from './types.js';

// ===========================================================================
// Templates
// ===========================================================================

export { DEFENSE_TEMPLATES } from './templates/index.js';

// ===========================================================================
// Recommender
// ===========================================================================

export { recommendDefenses } from './recommender.js';
