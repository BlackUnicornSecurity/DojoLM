/**
 * H19.2: Kotoba Hardening Rules — Barrel Export
 * 24 rules across 5 categories.
 */

import type { HardeningRule, ScoreCategory } from '../types.js';
import { BOUNDARY_RULES } from './boundary-rules.js';
import { PRIORITY_RULES } from './priority-rules.js';
import { ROLE_RULES } from './role-rules.js';
import { OUTPUT_RULES } from './output-rules.js';
import { DEFENSE_RULES } from './defense-rules.js';

export { BOUNDARY_RULES } from './boundary-rules.js';
export { PRIORITY_RULES } from './priority-rules.js';
export { ROLE_RULES } from './role-rules.js';
export { OUTPUT_RULES } from './output-rules.js';
export { DEFENSE_RULES } from './defense-rules.js';

const ALL_RULES: HardeningRule[] = [
  ...BOUNDARY_RULES,
  ...PRIORITY_RULES,
  ...ROLE_RULES,
  ...OUTPUT_RULES,
  ...DEFENSE_RULES,
];

const RULES_BY_CATEGORY: Record<ScoreCategory, HardeningRule[]> = {
  boundary_clarity: BOUNDARY_RULES,
  instruction_priority: PRIORITY_RULES,
  role_definition: ROLE_RULES,
  output_constraints: OUTPUT_RULES,
  injection_resistance: DEFENSE_RULES,
};

/** Return all hardening rules. */
export function getAllRules(): HardeningRule[] {
  return ALL_RULES;
}

/** Return rules for a specific category. */
export function getRulesByCategory(category: ScoreCategory): HardeningRule[] {
  return RULES_BY_CATEGORY[category] ?? [];
}

/** Return total rule count. */
export function getRuleCount(): number {
  return ALL_RULES.length;
}
