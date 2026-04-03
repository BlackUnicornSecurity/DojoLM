/**
 * TESSENJUTSU: Orchestrators — Public API
 */

// Types
export type {
  OrchestratorType,
  OrchestratorConfig,
  OrchestratorTurn,
  BranchState,
  OrchestratorState,
  OrchestratorResult,
  LLMCallFn,
  JudgeCallFn,
  Orchestrator,
} from './types.js';

export {
  ORCHESTRATOR_TYPES,
  DEFAULT_ORCHESTRATOR_CONFIG,
  MAX_ORCHESTRATOR_TURNS,
  MAX_BRANCHES,
} from './types.js';

// Orchestrators
export { PAIROrchestrator } from './pair.js';
export { CrescendoOrchestrator, ESCALATION_STAGES, getStageForTurn } from './crescendo.js';
export type { EscalationStage } from './crescendo.js';
export { TAPOrchestrator } from './tap.js';
export { SenseiAdaptiveOrchestrator, ATTACK_STRATEGIES, selectStrategy } from './sensei-adaptive.js';
export type { AttackStrategy } from './sensei-adaptive.js';
export { MADMAXOrchestrator, ATTACK_CLUSTERS } from './mad-max.js';
export type { AttackCluster, ClusterDiversityMetrics } from './mad-max.js';

// Factory
import type { Orchestrator, OrchestratorType } from './types.js';
import { PAIROrchestrator } from './pair.js';
import { CrescendoOrchestrator } from './crescendo.js';
import { TAPOrchestrator } from './tap.js';
import { SenseiAdaptiveOrchestrator } from './sensei-adaptive.js';
import { MADMAXOrchestrator } from './mad-max.js';

/** Create an orchestrator instance by type */
export function createOrchestrator(type: OrchestratorType): Orchestrator {
  switch (type) {
    case 'pair': return new PAIROrchestrator();
    case 'crescendo': return new CrescendoOrchestrator();
    case 'tap': return new TAPOrchestrator();
    case 'sensei-adaptive': return new SenseiAdaptiveOrchestrator();
    case 'mad-max': return new MADMAXOrchestrator();
  }
}
