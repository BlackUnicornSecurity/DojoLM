/**
 * SUIJUTSU: RAG Pipeline Simulator — Public API
 */

export type {
  RagStage,
  RagAttackVector,
  RagDocument,
  RagChunk,
  RagPipelineConfig,
  RagStageResult,
  RagPipelineTestResult,
} from './types.js';

export {
  RAG_STAGES,
  RAG_ATTACK_VECTORS,
  DEFAULT_PIPELINE_CONFIG,
  MAX_DOCUMENTS,
  MAX_CHUNKS_PER_DOCUMENT,
  MAX_CHUNK_SIZE,
} from './types.js';

export {
  chunkDocument,
  simulateEmbedding,
  cosineSimilarity,
  simulateRetrieval,
  assembleContext,
  simulateRagPipeline,
} from './pipeline-simulator.js';

// Live Pipeline (SHURIKENJUTSU 8.4)
export type {
  GenerationResult,
  PoisoningTestResult,
  LiveRagConfig,
} from './live-pipeline.js';

export {
  buildRagPrompt,
  runGenerationStage,
  detectPoisonInfluence,
  runPoisoningTest,
  formatPoisoningReport,
  DEFAULT_LIVE_RAG_CONFIG,
} from './live-pipeline.js';

// Embedding Attacker (Sensei Platform)
export type {
  PerturbationStrategy,
  PerturbationResult,
  SimilarityGamingPayload,
} from './embedding-attacker.js';

export {
  perturbEmbedding,
  generateSimilarityGamingPayload,
} from './embedding-attacker.js';

// Retrieval Poisoner (Sensei Platform)
export type {
  InjectionPosition,
  PoisonedDocument,
  RankManipulationPayload,
} from './retrieval-poisoner.js';

export {
  createPoisonedDocument,
  generateRankManipulationPayload,
} from './retrieval-poisoner.js';

// Context Assembler (Sensei Platform)
export type {
  ContextBoundaryInjection,
  ContextOverflow,
  ConflictingContext,
} from './context-assembler.js';

export {
  injectAtContextBoundary,
  overflowContext,
  createConflictingContext,
} from './context-assembler.js';

// Knowledge Conflict (Sensei Platform)
export type {
  ConflictingFact,
  TemporalOverride,
  AuthorityImpersonation,
} from './knowledge-conflict.js';

export {
  createConflictingFact,
  createTemporalOverride,
  createAuthorityImpersonation,
} from './knowledge-conflict.js';
