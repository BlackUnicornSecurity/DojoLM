/**
 * X-Ray Explainability Engine — Barrel Export (H27)
 * Re-exports the explainer and knowledge base.
 */

export {
  explainFinding,
  explainFindings,
  getAttackPatterns,
  getAttackPatternById,
  getAttackPatternsByCategory,
} from './explainer.js';
export type { Explanation } from './explainer.js';

export {
  attackPatterns,
  getCategories,
  getCategoryCounts,
  getTotalPatternCount,
} from './knowledge/index.js';
export type { AttackPattern, AttackCategory } from './knowledge/index.js';
