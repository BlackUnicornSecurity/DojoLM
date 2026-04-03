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
