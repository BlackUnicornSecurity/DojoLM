/**
 * H18.3: Temporal Attack Plan Library — Barrel Export
 * 20 curated multi-turn attack plans across 5 categories.
 */

import type { ConversationPlan, TemporalAttackType } from '../types.js';
import { ACCUMULATION_PLANS } from './accumulation.js';
import { DELAYED_ACTIVATION_PLANS } from './delayed-activation.js';
import { SESSION_PERSISTENCE_PLANS } from './session-persistence.js';
import { CONTEXT_OVERFLOW_PLANS } from './context-overflow.js';
import { PERSONA_DRIFT_PLANS } from './persona-drift.js';

export { ACCUMULATION_PLANS } from './accumulation.js';
export { DELAYED_ACTIVATION_PLANS } from './delayed-activation.js';
export { SESSION_PERSISTENCE_PLANS } from './session-persistence.js';
export { CONTEXT_OVERFLOW_PLANS } from './context-overflow.js';
export { PERSONA_DRIFT_PLANS } from './persona-drift.js';

const ALL_PLANS: ConversationPlan[] = [
  ...ACCUMULATION_PLANS,
  ...DELAYED_ACTIVATION_PLANS,
  ...SESSION_PERSISTENCE_PLANS,
  ...CONTEXT_OVERFLOW_PLANS,
  ...PERSONA_DRIFT_PLANS,
];

const PLANS_BY_TYPE: Record<TemporalAttackType, ConversationPlan[]> = {
  accumulation: ACCUMULATION_PLANS,
  delayed_activation: DELAYED_ACTIVATION_PLANS,
  session_persistence: SESSION_PERSISTENCE_PLANS,
  context_overflow: CONTEXT_OVERFLOW_PLANS,
  persona_drift: PERSONA_DRIFT_PLANS,
};

/** Return all 20 curated attack plans. */
export function getAllPlans(): ConversationPlan[] {
  return ALL_PLANS;
}

/** Return plans filtered by temporal attack type. */
export function getPlansByType(type: TemporalAttackType): ConversationPlan[] {
  return PLANS_BY_TYPE[type] ?? [];
}

/** Return total plan count. */
export function getPlanCount(): number {
  return ALL_PLANS.length;
}
