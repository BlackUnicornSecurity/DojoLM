/**
 * H18: Time Chamber — Temporal Attacks
 * Barrel export for all Time Chamber modules.
 */

// ===========================================================================
// Types
// ===========================================================================

export type {
  TemporalAttackType,
  ConversationPlan,
  Turn,
  TimeChamberResult,
  ExecutedTurn,
  SimulatorConfig,
} from './types.js';

export {
  TEMPORAL_ATTACK_TYPES,
  MAX_TURNS,
  DEFAULT_TURNS,
  DEFAULT_RATE_LIMIT,
  MAX_CONTENT_LENGTH,
  SPENDING_CAP_DEFAULT,
} from './types.js';

// ===========================================================================
// Simulator
// ===========================================================================

export { TimeChamberSimulator, sanitizeConversationContent } from './simulator.js';

// ===========================================================================
// Attack Plans
// ===========================================================================

export {
  getAllPlans,
  getPlansByType,
  getPlanCount,
  ACCUMULATION_PLANS,
  DELAYED_ACTIVATION_PLANS,
  SESSION_PERSISTENCE_PLANS,
  CONTEXT_OVERFLOW_PLANS,
  PERSONA_DRIFT_PLANS,
} from './attacks/index.js';
